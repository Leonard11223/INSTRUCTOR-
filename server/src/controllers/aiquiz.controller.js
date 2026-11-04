'use strict';

const fs = require('fs');
const path = require('path');
const { AppError } = require('../middleware/error.middleware');

/* ── Text extraction helpers ──────────────────────────────── */
async function extractTextFromFile(filePath, mimeType) {
  if (mimeType === 'application/pdf' || filePath.endsWith('.pdf')) {
    const pdfParse = require('pdf-parse');
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text;
  }
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || filePath.endsWith('.docx')) {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }
  // Plain text / fallback
  return fs.readFileSync(filePath, 'utf-8');
}

/* ── Generate questions via OpenAI ───────────────────────── */
async function generateWithOpenAI(text, count = 10) {
  const OpenAI = require('openai').default || require('openai');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const prompt = `You are a quiz generator. Based on the following educational content, generate exactly ${count} multiple-choice questions.

Each question must have:
- A clear question prompt
- 4 answer options labeled A, B, C, D
- One correct answer indicated

Respond ONLY with a valid JSON array in this exact format:
[
  {
    "prompt": "Question text here?",
    "options": [
      { "optionText": "Answer A", "isCorrect": false },
      { "optionText": "Answer B", "isCorrect": true },
      { "optionText": "Answer C", "isCorrect": false },
      { "optionText": "Answer D", "isCorrect": false }
    ],
    "difficulty": "Medium",
    "explanation": "Brief explanation of the correct answer"
  }
]

Educational content:
${text.slice(0, 8000)}`;

  const response = await client.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 3000
  });

  const raw = response.choices[0].message.content.trim();
  // Extract JSON array from response
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('Invalid AI response format');
  return JSON.parse(match[0]);
}

/* ── Simple rule-based fallback (no API key needed) ─────── */
function generateFallbackQuestions(text, count = 10) {
  const sentences = text
    .replace(/\n+/g, ' ')
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 40 && s.length < 300);

  const questions = [];
  const used = new Set();

  for (let i = 0; i < sentences.length && questions.length < count; i++) {
    const sentence = sentences[i];
    // Find key words (longer words likely to be terms)
    const words = sentence.split(' ').filter(w => w.length > 5);
    if (words.length < 3 || used.has(sentence)) continue;
    used.add(sentence);

    const blankWord = words[Math.floor(words.length / 2)];
    const blankedSentence = sentence.replace(blankWord, '_____');

    questions.push({
      prompt: `Complete the statement: "${blankedSentence}"`,
      questionType: 'multiple_choice',
      difficulty: i % 3 === 0 ? 'Hard' : i % 2 === 0 ? 'Easy' : 'Medium',
      explanation: `The correct answer is "${blankWord}".`,
      options: [
        { optionText: blankWord, isCorrect: true },
        { optionText: words[0] !== blankWord ? words[0] : (words[1] || 'Option B'), isCorrect: false },
        { optionText: words[words.length - 1] !== blankWord ? words[words.length - 1] : (words[2] || 'Option C'), isCorrect: false },
        { optionText: `None of the above`, isCorrect: false }
      ]
    });
  }

  // Pad with generic if not enough sentences
  while (questions.length < count) {
    questions.push({
      prompt: `Based on the content, which of the following is most accurate? (Question ${questions.length + 1})`,
      questionType: 'multiple_choice',
      difficulty: 'Medium',
      explanation: 'Review the course material for the correct answer.',
      options: [
        { optionText: 'Option A — review material', isCorrect: true },
        { optionText: 'Option B', isCorrect: false },
        { optionText: 'Option C', isCorrect: false },
        { optionText: 'Option D', isCorrect: false }
      ]
    });
  }

  return questions.slice(0, count);
}

/* ── Main controller ─────────────────────────────────────── */
async function generateQuestionsFromFile(req, res, next) {
  try {
    if (!req.file) throw new AppError('File is required.', 400);

    const { count = 10, topic = 'General', courseId, questionBankId } = req.body;
    const filePath = req.file.path;
    const mimeType = req.file.mimetype;

    // Extract text
    let text = '';
    try {
      text = await extractTextFromFile(filePath, mimeType);
    } catch (e) {
      text = '';
    } finally {
      // Clean up uploaded file
      try { fs.unlinkSync(filePath); } catch (_) {}
    }

    if (!text || text.trim().length < 50) {
      throw new AppError('Could not extract enough text from the file. Please upload a PDF, DOCX, or TXT file with readable content.', 400);
    }

    // Generate questions — try OpenAI first, fall back to rule-based
    let questions = [];
    let method = 'ai';

    if (process.env.OPENAI_API_KEY) {
      try {
        questions = await generateWithOpenAI(text, Number(count));
      } catch (aiErr) {
        console.warn('OpenAI generation failed, using fallback:', aiErr.message);
        questions = generateFallbackQuestions(text, Number(count));
        method = 'fallback';
      }
    } else {
      questions = generateFallbackQuestions(text, Number(count));
      method = 'fallback';
    }

    // Normalize question format
    const normalized = questions.map((q, i) => ({
      questionType: 'multiple_choice',
      difficulty: q.difficulty || 'Medium',
      prompt: q.prompt || `Question ${i + 1}`,
      points: 1,
      explanation: q.explanation || null,
      topic: topic,
      courseId: courseId ? Number(courseId) : undefined,
      questionBankId: questionBankId ? Number(questionBankId) : undefined,
      options: (q.options || []).map(o => ({
        optionText: o.optionText || '',
        isCorrect: Boolean(o.isCorrect)
      }))
    }));

    return res.status(200).json({
      success: true,
      message: `Generated ${normalized.length} questions using ${method === 'ai' ? 'AI (OpenAI)' : 'rule-based fallback'}.`,
      data: {
        questions: normalized,
        method,
        sourceLength: text.length
      }
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { generateQuestionsFromFile };
