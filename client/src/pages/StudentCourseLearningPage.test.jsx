import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '../components/ui/SharedComponents';
import { lmsApi } from '../services/api';
import { StudentClassesSubPage, StudentCourseLearningPage } from './StudentPages';

vi.mock('../services/api', () => ({
  lmsApi: {
    listEnrollments: vi.fn(),
    getCourseById: vi.fn(),
    getProgressAnalytics: vi.fn(),
    listAssessments: vi.fn(),
    listCertificates: vi.fn(),
    getResourcePreview: vi.fn(),
    startAttempt: vi.fn(),
    saveAttemptAnswers: vi.fn(),
    submitAttempt: vi.fn(),
    updateLessonProgress: vi.fn()
  },
  extractErrorMessage: (error) => error?.message || 'Request failed'
}));

function renderCoursePage(classId) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={[classId ? `/student/courses/${classId}` : '/student/courses']}>
          <Routes>
            <Route path="/student/courses/:classId?" element={<StudentCourseLearningPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}

function renderStudentClassesPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter>
          <StudentClassesSubPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}

describe('StudentCourseLearningPage quiz flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lmsApi.listEnrollments.mockResolvedValue({
      data: {
        enrollments: [{
          id: 4,
          classId: 7,
          status: 'enrolled',
          classSection: {
            sectionCode: 'NET-1A',
            courseOffering: {
              course: { id: 3, code: 'NET-101', title: 'Networking Fundamentals' },
              semester: { name: 'Fall Term' }
            }
          }
        }]
      }
    });
    lmsApi.getCourseById.mockResolvedValue({
      data: {
        course: {
          id: 3,
          code: 'NET-101',
          title: 'Networking Fundamentals',
          modules: [{
            id: 5,
            title: 'Module 1',
            lessons: [{ id: 11, title: 'Network Basics', contentHtml: '<p>Lesson</p>' }]
          }]
        }
      }
    });
    lmsApi.getProgressAnalytics.mockResolvedValue({
      data: { lessonProgress: [], courseProgress: [{ progressPercentage: 0, isCompleted: false }] }
    });
    lmsApi.updateLessonProgress.mockResolvedValue({ data: { success: true } });
    lmsApi.listAssessments.mockResolvedValue({
      data: {
        assessments: [{
          id: 13,
          title: 'Module Quiz',
          assessmentType: 'quiz',
          moduleId: 5,
          passingScore: 75,
          maxScore: 10,
          maxAttempts: 1,
          attempts: [],
          assessmentQuestions: [{ questionId: 21 }]
        }]
      }
    });
    lmsApi.listCertificates.mockResolvedValue({ data: { certificates: [] } });
    lmsApi.getResourcePreview.mockResolvedValue('<p>Rendered Word document content</p>');
    lmsApi.startAttempt.mockResolvedValue({
      data: {
        attempt: { id: 44, attemptNumber: 1, savedAnswers: [] },
        questions: [{
          questionId: 21,
          questionType: 'multiple_choice',
          prompt: 'What does LAN stand for?',
          points: 10,
          options: [{ id: 9, optionText: 'Local Area Network' }]
        }]
      }
    });
    lmsApi.saveAttemptAnswers.mockResolvedValue({ data: { success: true } });
    lmsApi.submitAttempt.mockResolvedValue({
      data: {
        attempt: { totalScore: 8, submittedAt: '2026-11-03T12:00:00.000Z' },
        maxScore: 10,
        percentage: 80
      }
    });
  });

  it('presents enrolled class information in a readable, scannable hierarchy', async () => {
    lmsApi.listEnrollments.mockResolvedValueOnce({
      data: {
        enrollments: [{
          id: 8,
          classId: 8,
          status: 'enrolled',
          classSection: {
            sectionCode: 'NET-2B',
            schedule: 'Tuesday / Thursday, 1:00 PM – 3:30 PM',
            room: 'NetAcad Lab 302',
            courseOffering: {
              course: {
                code: 'NET-201',
                title: 'Enterprise Networking',
                description: 'Learn networking, security, and automation.',
                creditUnits: 3
              }
            }
          }
        }]
      }
    });

    renderStudentClassesPage();

    expect(await screen.findByRole('heading', { name: 'My Enrolled Classes' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Enterprise Networking' })).toBeInTheDocument();
    expect(screen.getByText(/NET-201/)).toBeInTheDocument();
    expect(screen.getByText(/NET-2B/)).toBeInTheDocument();
    expect(screen.getByText('3 units')).toBeInTheDocument();
    expect(screen.getByText('Tuesday / Thursday, 1:00 PM – 3:30 PM')).toBeInTheDocument();
    expect(screen.getByText('NetAcad Lab 302')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Course' })).toHaveAttribute('href', '/student/courses/8');
  });

  it('opens the requested enrolled class directly in its course learning space', async () => {
    renderCoursePage(7);

    expect(await screen.findByRole('heading', { name: 'Networking Fundamentals' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Switch enrolled class' })).toHaveValue('7');
    expect(screen.getByRole('link', { name: 'My Classes' })).toHaveAttribute('href', '/student/classes/semester');
  });

  it('shows lesson Word attachments inline without a download link', async () => {
    lmsApi.getCourseById.mockResolvedValueOnce({
      data: {
        course: {
          id: 3,
          code: 'NET-101',
          title: 'Networking Fundamentals',
          modules: [{
            id: 5,
            title: 'Module 1',
            lessons: [{
              id: 11,
              title: 'Network Basics',
              contentHtml: '<p>Lesson</p>',
              resources: [{
                id: 42,
                title: 'Network Basics.pdf',
                originalFilename: 'Network Basics.docx',
                storedFilename: 'resource-42.docx',
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                resourceType: 'document'
              }]
            }]
          }]
        }
      }
    });

    renderCoursePage(7);

    expect(await screen.findByText('Rendered Word document content')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Download Network Basics\.docx/ })).not.toBeInTheDocument();
    expect(lmsApi.getResourcePreview).toHaveBeenCalledWith(42, { classId: 7 });
  });

  it('embeds lesson PDF attachments in an inline viewer', async () => {
    lmsApi.getCourseById.mockResolvedValueOnce({
      data: {
        course: {
          id: 3,
          code: 'NET-101',
          title: 'Networking Fundamentals',
          modules: [{
            id: 5,
            title: 'Module 1',
            lessons: [{
              id: 11,
              title: 'Network Basics',
              contentHtml: '<p>Lesson</p>',
              resources: [{
                id: 43,
                title: 'Network Basics.pdf',
                originalFilename: 'Network Basics.pdf',
                storedFilename: 'resource-43.pdf',
                mimeType: 'application/pdf',
                resourceType: 'pdf'
              }]
            }]
          }]
        }
      }
    });

    renderCoursePage(7);

    expect(await screen.findByTitle('Network Basics.pdf preview')).toHaveAttribute(
      'src',
      '/api/resources/43/preview?classId=7#toolbar=0&navpanes=0'
    );
    expect(screen.queryByRole('link', { name: /Download Network Basics\.pdf/ })).not.toBeInTheDocument();
  });

  it('places a module-linked quiz after the module lessons in the roadmap', async () => {
    lmsApi.getProgressAnalytics.mockResolvedValueOnce({
      data: {
        lessonProgress: [{ lessonId: 11, status: 'completed' }],
        courseProgress: [{ progressPercentage: 50, isCompleted: false }]
      }
    });
    renderCoursePage(7);

    const lesson = await screen.findByRole('button', { name: /Network Basics/ });
    const moduleQuiz = screen.getByRole('button', { name: /Module Quiz.*Start Quiz/ });
    expect(lesson.compareDocumentPosition(moduleQuiz) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.click(moduleQuiz);
    expect(await screen.findByText('What does LAN stand for?')).toBeInTheDocument();
  });

  it('keeps a module-end quiz locked until its lessons are completed', async () => {
    renderCoursePage(7);

    expect(await screen.findByRole('button', { name: /Complete lessons to unlock/ })).toBeDisabled();
  });

  it('keeps lesson completion disabled until the reader scrolls to the lesson end', async () => {
    renderCoursePage(7);

    const completionButton = await screen.findByRole('button', { name: 'Complete & Take Module Quiz' });
    const lessonScrollContainer = screen.getByTestId('lesson-scroll-container');
    Object.defineProperty(lessonScrollContainer, 'scrollHeight', { configurable: true, value: 900 });
    Object.defineProperty(lessonScrollContainer, 'clientHeight', { configurable: true, value: 700 });

    expect(completionButton).toBeDisabled();
    fireEvent.scroll(window);
    expect(completionButton).toBeDisabled();

    lessonScrollContainer.scrollTop = 200;
    fireEvent.scroll(lessonScrollContainer);
    await waitFor(() => expect(completionButton).toBeEnabled());
  });

  it('completes the final lesson before opening its module quiz', async () => {
    renderCoursePage(7);

    const completionButton = await screen.findByRole('button', { name: 'Complete & Take Module Quiz' });
    const lessonScrollContainer = screen.getByTestId('lesson-scroll-container');
    Object.defineProperty(lessonScrollContainer, 'scrollHeight', { configurable: true, value: 900 });
    Object.defineProperty(lessonScrollContainer, 'clientHeight', { configurable: true, value: 700 });
    lessonScrollContainer.scrollTop = 200;
    fireEvent.scroll(lessonScrollContainer);
    await waitFor(() => expect(completionButton).toBeEnabled());
    fireEvent.click(completionButton);

    expect(await screen.findByText('What does LAN stand for?')).toBeInTheDocument();
    expect(lmsApi.updateLessonProgress).toHaveBeenCalledWith({
      classId: 7,
      lessonId: 11,
      status: 'completed'
    });
  });

  it('shows a data-backed next lesson recommendation', async () => {
    renderCoursePage();

    expect(await screen.findByRole('heading', { name: "You're on track!" })).toBeInTheDocument();
    expect(screen.getByText('Continue: Network Basics')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue lesson' })).toBeInTheDocument();
  });

  it('recommends the quiz after all lessons are complete and opens it', async () => {
    lmsApi.getProgressAnalytics.mockResolvedValueOnce({
      data: {
        lessonProgress: [{ lessonId: 11, status: 'completed' }],
        courseProgress: [{ progressPercentage: 50, isCompleted: false }]
      }
    });
    renderCoursePage();

    expect(await screen.findAllByText(/Take Module Quiz/)).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: /Module Quiz.*Start Quiz/ }));
    expect(await screen.findByText('What does LAN stand for?')).toBeInTheDocument();
  });

  it('warns about unanswered questions and lets the student return to the quiz', async () => {
    lmsApi.getProgressAnalytics.mockResolvedValueOnce({
      data: {
        lessonProgress: [{ lessonId: 11, status: 'completed' }],
        courseProgress: [{ progressPercentage: 50, isCompleted: false }]
      }
    });
    renderCoursePage();

    fireEvent.click(await screen.findByRole('button', { name: /Module Quiz.*Start Quiz/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Submit Quiz' }));

    expect(await screen.findByText(/1 unanswered question/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Return to quiz' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(lmsApi.submitAttempt).not.toHaveBeenCalled();
  });

  it('submits a confirmed attempt and shows the returned score', async () => {
    lmsApi.getProgressAnalytics.mockResolvedValueOnce({
      data: {
        lessonProgress: [{ lessonId: 11, status: 'completed' }],
        courseProgress: [{ progressPercentage: 50, isCompleted: false }]
      }
    });
    renderCoursePage();

    fireEvent.click(await screen.findByRole('button', { name: /Module Quiz.*Start Quiz/ }));
    fireEvent.click(await screen.findByLabelText('Local Area Network'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit Quiz' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Submit answers' }));

    expect(await screen.findByText(/NetAcad Checkpoint Quiz Passed/)).toBeInTheDocument();
    expect(screen.getAllByText('80%', { exact: true }).length).toBeGreaterThan(0);
    expect(lmsApi.submitAttempt).toHaveBeenCalledWith(44, [{
      questionId: 21,
      selectedOptionIds: [9],
      textAnswer: '',
      matchingResponse: {}
    }]);
  });
});
