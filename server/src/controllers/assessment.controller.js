const path = require('path');
const fs = require('fs');
const {
  sequelize,
  Assignment,
  AssignmentAttachment,
  GradingRubric,
  RubricCriterion,
  Submission,
  SubmissionVersion,
  QuestionBank,
  Question,
  QuestionOption,
  QuestionSet,
  QuestionSetQuestion,
  Module,
  Assessment,
  AssessmentQuestion,
  AssessmentAttempt,
  AssessmentAnswer,
  ClassMembership,
  InstructorAssignment,
  TeachingAssistantAssignment,
  User,
  AuditLog
} = require('../models');
const env = require('../config/env');
const { AppError } = require('../middleware/error.middleware');
const { verifyClassAccess } = require('../middleware/auth.middleware');
const { verifyUploadedFileSafety } = require('../middleware/upload.middleware');
const { sanitizePlainText } = require('../utils/sanitizer');
const { upsertGradeWithHistory } = require('../services/gradebook.service');
const { recalculateStudentCourseProgress } = require('../services/progress.service');
const { createNotification } = require('../utils/notifyUser');
const { recordAudit } = require('../utils/auditLogger');
const { assignmentSchema, questionSchema, questionSetSchema, assessmentSchema } = require('../validators/schemas');

// ============================================================================
// ASSIGNMENTS & SUBMISSIONS
// ============================================================================

async function listAssignments(req, res, next) {
  try {
    const { classId, courseId } = req.query;
    const where = {};
    if (classId) where.classId = Number(classId);
    if (courseId) where.courseId = Number(courseId);

    if (req.user.primaryRole === 'student') {
      where.publicationStatus = 'published';
      if (!classId) {
        const memberships = await ClassMembership.findAll({
          where: { studentId: req.user.id, status: ['enrolled', 'completed'] }
        });
        where.classId = memberships.map((m) => m.classId);
      }
    } else if (req.user.primaryRole === 'instructor' && !classId) {
      const assigned = await InstructorAssignment.findAll({ where: { instructorId: req.user.id } });
      where.classId = assigned.map((a) => a.classId);
    } else if (req.user.primaryRole === 'teaching_assistant') {
      const assigned = await TeachingAssistantAssignment.findAll({ where: { taUserId: req.user.id } });
      const allowedClassIds = assigned.map((a) => a.classId);
      if (classId) {
        // Explicit classId: verify it's in the TA's assignment list (IDOR guard)
        if (!allowedClassIds.includes(Number(classId))) {
          throw new AppError('Forbidden: You do not have access to assignments in this class section.', 403, 'CLASS_ACCESS_DENIED');
        }
      } else {
        // No classId: scope to all assigned sections
        if (allowedClassIds.length === 0) {
          return res.status(200).json({ success: true, data: { assignments: [] } });
        }
        where.classId = allowedClassIds;
      }
    }

    const assignments = await Assignment.findAll({
      where,
      include: [
        {
          model: GradingRubric,
          as: 'rubric',
          include: [{ model: RubricCriterion, as: 'criteria' }]
        },
        { model: AssignmentAttachment, as: 'attachments' },
        {
          model: Submission,
          as: 'submissions',
          ...(req.user.primaryRole === 'student' ? { where: { studentId: req.user.id }, required: false } : {})
        }
      ],
      order: [['dueDate', 'ASC']]
    });

    return res.status(200).json({ success: true, data: { assignments } });
  } catch (err) {
    return next(err);
  }
}

async function getAssignmentById(req, res, next) {
  try {
    const assignment = await Assignment.findByPk(req.params.id, {
      include: [
        {
          model: GradingRubric,
          as: 'rubric',
          include: [{ model: RubricCriterion, as: 'criteria' }]
        },
        { model: AssignmentAttachment, as: 'attachments' }
      ]
    });

    if (!assignment) throw new AppError('Assignment not found.', 404);
    await verifyClassAccess(req.user, assignment.classId, {
      allowAdmin: true,
      allowInstructor: true,
      allowTA: true,
      allowStudent: true
    });

    const submissionWhere = { assignmentId: assignment.id };
    if (req.user.primaryRole === 'student') {
      submissionWhere.studentId = req.user.id;
    }

    const submissions = await Submission.findAll({
      where: submissionWhere,
      include: [
        { model: User, as: 'student', attributes: ['id', 'firstName', 'lastName', 'email', 'studentNumber'] },
        { model: SubmissionVersion, as: 'versions' }
      ],
      order: [['submittedAt', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      data: { assignment, submissions }
    });
  } catch (err) {
    return next(err);
  }
}

async function createAssignment(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const payload = assignmentSchema.parse(req.body);
    await verifyClassAccess(req.user, payload.classId, { allowAdmin: true, allowInstructor: true });

    const assignment = await Assignment.create({
      ...payload,
      createdBy: req.user.id
    }, { transaction: t });

    if (Array.isArray(payload.rubricCriteria) && payload.rubricCriteria.length > 0) {
      const totalPts = payload.rubricCriteria.reduce((acc, c) => acc + Number(c.maxPoints || 0), 0);
      const rubric = await GradingRubric.create({
        assignmentId: assignment.id,
        title: `${assignment.title} Rubric`,
        totalPoints: totalPts
      }, { transaction: t });

      for (let i = 0; i < payload.rubricCriteria.length; i += 1) {
        const c = payload.rubricCriteria[i];
        await RubricCriterion.create({
          rubricId: rubric.id,
          criterionName: c.criterionName,
          description: c.description || null,
          maxPoints: c.maxPoints,
          orderIndex: i + 1
        }, { transaction: t });
      }
    }

    await t.commit();

    // Notify enrolled students
    const members = await ClassMembership.findAll({ where: { classId: assignment.classId, status: 'enrolled' } });
    for (const m of members) {
      await createNotification({
        userId: m.studentId,
        type: 'assignment',
        title: `New Assignment: ${assignment.title}`,
        message: `Due on ${new Date(assignment.dueDate).toLocaleDateString()}.`,
        destinationUrl: '/student/assignments'
      });
    }

    await recordAudit({
      req,
      action: 'ASSIGNMENT_CREATED',
      category: 'assessment',
      entityType: 'Assignment',
      entityId: assignment.id,
      metadata: { classId: assignment.classId, title: assignment.title }
    });

    return res.status(201).json({
      success: true,
      message: 'Assignment created successfully.',
      data: { assignment }
    });
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

async function listSubmissions(req, res, next) {
  try {
    const { classId, assignmentId, status } = req.query;
    const where = {};
    if (classId) where.classId = Number(classId);
    if (assignmentId) where.assignmentId = Number(assignmentId);
    if (status) where.status = status;

    if (req.user.primaryRole === 'student') {
      where.studentId = req.user.id;
    } else if (req.user.primaryRole === 'instructor' && !classId) {
      const assigned = await InstructorAssignment.findAll({ where: { instructorId: req.user.id } });
      where.classId = assigned.map((a) => a.classId);
    } else if (req.user.primaryRole === 'teaching_assistant') {
      // Fetch all TA assignments — used for both explicit and implicit classId cases
      const assigned = await TeachingAssistantAssignment.findAll({ where: { taUserId: req.user.id } });

      if (classId) {
        // Explicit classId: verify the TA is assigned to this section (IDOR guard)
        const match = assigned.find((a) => a.classId === Number(classId));
        if (!match) {
          throw new AppError('Forbidden: You do not have access to submissions in this class section.', 403, 'CLASS_ACCESS_DENIED');
        }
        // Also verify the per-class canReviewSubmissions flag
        if (!match.canReviewSubmissions) {
          throw new AppError('Your TA assignment does not permit reviewing submissions in this class section.', 403, 'TA_PERMISSION_DENIED');
        }
      } else {
        // No classId: scope only to sections where canReviewSubmissions is enabled
        const allowedClassIds = assigned
          .filter((a) => a.canReviewSubmissions)
          .map((a) => a.classId);
        if (allowedClassIds.length === 0) {
          return res.status(200).json({ success: true, data: { submissions: [] } });
        }
        where.classId = allowedClassIds;
      }
    }

    // TA responses exclude SubmissionVersion history (version history is not
    // needed for TA preliminary review and reduces response payload size).
    const isTA = req.user.primaryRole === 'teaching_assistant';

    const submissions = await Submission.findAll({
      where,
      include: [
        { model: Assignment, as: 'assignment', include: [
          { model: GradingRubric, as: 'rubric', include: [{ model: RubricCriterion, as: 'criteria' }] }
        ]},
        { model: User, as: 'student', attributes: ['id', 'firstName', 'lastName', 'email', 'studentNumber'] },
        ...(isTA ? [] : [{ model: SubmissionVersion, as: 'versions' }])
      ],
      order: [['updatedAt', 'DESC']]
    });

    return res.status(200).json({ success: true, data: { submissions } });
  } catch (err) {
    return next(err);
  }
}

async function submitAssignmentWork(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const assignmentId = Number(req.params.assignmentId || req.body.assignmentId);
    const {
      textResponse,
      codeSubmission,
      repositoryUrl,
      isDraft = false
    } = req.body;

    const assignment = await Assignment.findByPk(assignmentId, { transaction: t });
    if (!assignment) throw new AppError('Assignment not found.', 404);

    await verifyClassAccess(req.user, assignment.classId, { allowStudent: true });

    const now = new Date();
    const isPastDue = now > new Date(assignment.dueDate);
    if (!isDraft && isPastDue && !assignment.allowLateSubmissions) {
      throw new AppError('The submission deadline has passed and late submissions are not permitted for this assignment.', 400, 'DEADLINE_PASSED');
    }

    if (assignment.cutoffDate && now > new Date(assignment.cutoffDate)) {
      throw new AppError('The final cutoff window for this assignment has closed.', 400, 'CUTOFF_PASSED');
    }

    let fileFields = {};
    if (req.file) {
      const fullPath = path.join(env.UPLOAD_DIR, req.file.filename);
      if (!verifyUploadedFileSafety(fullPath)) {
        fs.unlinkSync(fullPath);
        throw new AppError('Uploaded file failed binary safety check.', 400, 'UNSAFE_FILE');
      }
      fileFields = {
        storedFilename: req.file.filename,
        originalFilename: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSizeBytes: req.file.size
      };
    }

    let submission = await Submission.findOne({
      where: { assignmentId: assignment.id, studentId: req.user.id },
      transaction: t
    });

    const targetStatus = isDraft === true || isDraft === 'true'
      ? 'draft'
      : (isPastDue ? 'late' : 'submitted');

    if (submission) {
      if (!isDraft && submission.status === 'graded' && !assignment.allowResubmission) {
        throw new AppError('Resubmissions are not allowed after grading for this assignment.', 400, 'RESUBMISSION_NOT_ALLOWED');
      }
      const nextAttempt = isDraft ? submission.attemptNumber : (submission.attemptNumber || 0) + (submission.status === 'draft' ? 0 : 1);
      if (!isDraft && nextAttempt > assignment.maxAttempts) {
        throw new AppError(`Maximum attempt limit (${assignment.maxAttempts}) reached.`, 400, 'MAX_ATTEMPTS_REACHED');
      }

      await submission.update({
        status: targetStatus,
        attemptNumber: nextAttempt,
        textResponse: textResponse !== undefined ? textResponse : submission.textResponse,
        codeSubmission: codeSubmission !== undefined ? codeSubmission : submission.codeSubmission,
        repositoryUrl: repositoryUrl !== undefined ? repositoryUrl : submission.repositoryUrl,
        submittedAt: isDraft ? submission.submittedAt : now,
        isLate: !isDraft && isPastDue,
        ...fileFields
      }, { transaction: t });
    } else {
      submission = await Submission.create({
        assignmentId: assignment.id,
        classId: assignment.classId,
        studentId: req.user.id,
        status: targetStatus,
        attemptNumber: 1,
        textResponse: textResponse || null,
        codeSubmission: codeSubmission || null,
        repositoryUrl: repositoryUrl || null,
        submittedAt: isDraft ? null : now,
        isLate: !isDraft && isPastDue,
        ...fileFields
      }, { transaction: t });
    }

    if (!isDraft) {
      const versionCount = await SubmissionVersion.count({ where: { submissionId: submission.id }, transaction: t });
      await SubmissionVersion.create({
        submissionId: submission.id,
        versionNumber: versionCount + 1,
        textResponse: submission.textResponse,
        codeSubmission: submission.codeSubmission,
        storedFilename: submission.storedFilename,
        originalFilename: submission.originalFilename,
        submittedAt: now
      }, { transaction: t });
    }

    await t.commit();

    if (!isDraft) {
      await recalculateStudentCourseProgress(assignment.classId, req.user.id);

      // Notify TAs assigned to this section that a new submission needs review.
      // Only notifies when canReviewSubmissions is true for the TA's assignment.
      // Does not include the submission content — just the assignment title and student
      // count needed to prioritise their review queue.
      const taAssignments = await TeachingAssistantAssignment.findAll({
        where: { classId: assignment.classId, canReviewSubmissions: true }
      });
      for (const ta of taAssignments) {
        await createNotification({
          userId: ta.taUserId,
          type: 'assignment',
          title: `New Submission: ${assignment.title}`,
          message: `A student has submitted work for "${assignment.title}". Open your review queue to provide preliminary feedback.`,
          destinationUrl: '/ta/submissions'
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: isDraft ? 'Draft saved.' : 'Assignment submitted successfully.',
      data: { submission }
    });
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

async function reviewOrGradeSubmission(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const submissionId = Number(req.params.id);
    const {
      score,
      feedback,
      preliminaryFeedback,
      rubricEvaluation,
      flaggedForInstructorReview,
      flagReason,
      flagCategory,
      returnForRevision = false,
      reason = 'Instructor submission grading'
    } = req.body;

    const submission = await Submission.findByPk(submissionId, {
      include: [{ model: Assignment, as: 'assignment' }],
      transaction: t
    });

    if (!submission) throw new AppError('Submission not found.', 404);

    // Check role access
    const access = await verifyClassAccess(req.user, submission.classId, {
      allowAdmin: true,
      allowInstructor: true,
      allowTA: true,
      requiredTaFlag: 'canReviewSubmissions'
    });

    // Teaching Assistants can provide preliminary feedback, apply rubrics if permitted, or flag for instructor,
    // but CANNOT publish final official grades!
    if (access.accessRole === 'teaching_assistant') {
      if (rubricEvaluation && !access.taAssignment.canApplyRubrics) {
        throw new AppError('You do not have permission to apply grading rubrics in this class.', 403, 'TA_RUBRIC_FORBIDDEN');
      }
      if (score !== undefined && score !== null && req.body.publishOfficialGrade) {
        throw new AppError('Teaching Assistants are not permitted to publish final official grades.', 403, 'TA_PUBLISH_GRADE_FORBIDDEN');
      }

      // ── Validate escalation: structured flag category + description ──────────
      const ALLOWED_FLAG_CATEGORIES = [
        'plagiarism',
        'incomplete_submission',
        'technical_issue',
        'unusual_content',
        'instructor_review_needed',
      ];

      const willFlag = flaggedForInstructorReview !== undefined
        ? Boolean(flaggedForInstructorReview)
        : submission.flaggedForInstructorReview;

      // Build structured escalation data to store in flagReason
      let escalationData = null;
      if (willFlag) {
        // Determine effective category
        let effectiveCategory = flagCategory;
        if (!effectiveCategory && submission.flagReason) {
          // Try to parse existing structured flagReason for the category
          try {
            const parsed = JSON.parse(submission.flagReason);
            if (parsed.category) effectiveCategory = parsed.category;
          } catch (_) { /* old-format plain text */ }
        }
        if (!effectiveCategory || !ALLOWED_FLAG_CATEGORIES.includes(effectiveCategory)) {
          throw new AppError(
            `A valid flag category is required. Allowed: ${ALLOWED_FLAG_CATEGORIES.join(', ')}.`,
            400,
            'FLAG_CATEGORY_REQUIRED'
          );
        }

        // Determine effective description
        let effectiveDescription = flagReason;
        if (flagReason === undefined && submission.flagReason) {
          try {
            const parsed = JSON.parse(submission.flagReason);
            effectiveDescription = parsed.description || '';
          } catch (_) {
            effectiveDescription = submission.flagReason; // old-format plain text
          }
        }
        if (!effectiveDescription || String(effectiveDescription).trim().length < 3) {
          throw new AppError(
            'A description (at least 3 characters) is required when escalating to the instructor.',
            400,
            'FLAG_REASON_REQUIRED'
          );
        }

        // Build structured JSON for storage in flagReason field
        escalationData = {
          category: effectiveCategory,
          description: sanitizePlainText(String(effectiveDescription).trim()),
          flaggedBy: req.user.id,
          flaggedByName: req.user.fullName,
          flaggedAt: new Date().toISOString(),
          status: 'pending_instructor_review',
        };
      }

      const wasPreviouslyFlagged = submission.flaggedForInstructorReview;

      // Validate rubric scores against the assignment's actual rubric criteria
      // and stamp the evaluation with the TA reviewer's identity for the audit trail.
      let validatedRubricEvaluation = rubricEvaluation;
      if (rubricEvaluation && rubricEvaluation.criteria && Array.isArray(rubricEvaluation.criteria)) {
        const rubric = await GradingRubric.findOne({
          where: { assignmentId: submission.assignmentId },
          include: [{ model: RubricCriterion, as: 'criteria' }]
        });
        if (rubric && rubric.criteria && rubric.criteria.length > 0) {
          const criterionMap = new Map(rubric.criteria.map((c) => [c.id, c]));
          let rubricTotal = 0;
          let rubricMaxTotal = 0;
          for (const entry of rubricEvaluation.criteria) {
            const criterion = criterionMap.get(entry.criterionId);
            if (!criterion) {
              throw new AppError(
                `Rubric criterion #${entry.criterionId} does not belong to this assignment.`,
                400,
                'INVALID_RUBRIC_CRITERION'
              );
            }
            const scoreVal = Number(entry.score);
            if (Number.isNaN(scoreVal) || scoreVal < 0 || scoreVal > Number(criterion.maxPoints)) {
              throw new AppError(
                `Score for "${criterion.criterionName}" must be between 0 and ${criterion.maxPoints}.`,
                400,
                'RUBRIC_SCORE_OUT_OF_RANGE'
              );
            }
            rubricTotal += scoreVal;
            rubricMaxTotal += Number(criterion.maxPoints);
          }
          // Stamp with reviewer identity for the audit trail
          validatedRubricEvaluation = {
            ...rubricEvaluation,
            criteria: rubricEvaluation.criteria.map((entry) => ({
              ...entry,
              comment: entry.comment ? sanitizePlainText(String(entry.comment)) : '',
            })),
            reviewedBy: req.user.id,
            reviewedByName: req.user.fullName,
            reviewedAt: new Date().toISOString(),
            rubricTotal: Number(rubricTotal.toFixed(2)),
            rubricMaxTotal: Number(rubricMaxTotal.toFixed(2)),
            rubricPercentage: rubricMaxTotal > 0
              ? Number(((rubricTotal / rubricMaxTotal) * 100).toFixed(1))
              : 0,
          };
        }
      }

      await submission.update({
        status: 'under_review',
        preliminaryFeedback: preliminaryFeedback !== undefined
          ? sanitizePlainText(String(preliminaryFeedback))
          : submission.preliminaryFeedback,
        rubricEvaluation: validatedRubricEvaluation !== undefined ? validatedRubricEvaluation : submission.rubricEvaluation,
        flaggedForInstructorReview: flaggedForInstructorReview !== undefined ? Boolean(flaggedForInstructorReview) : submission.flaggedForInstructorReview,
        flagReason: willFlag
          ? JSON.stringify(escalationData)
          : (flaggedForInstructorReview === false ? null : submission.flagReason)
      }, { transaction: t });

      await t.commit();

      // Audit log for TA review action
      await recordAudit({
        req,
        action: willFlag ? 'SUBMISSION_FLAGGED_BY_TA' : 'SUBMISSION_TA_REVIEWED',
        category: 'assessment',
        entityType: 'Submission',
        entityId: submission.id,
        metadata: {
          studentId: submission.studentId,
          assignmentId: submission.assignmentId,
          classId: submission.classId,
          flagged: willFlag,
          flagCategory: willFlag && escalationData ? escalationData.category : null,
          flagDescription: willFlag && escalationData ? escalationData.description : null,
          flaggedBy: willFlag ? req.user.id : null,
          flaggedByName: willFlag ? req.user.fullName : null,
          hasPreliminaryFeedback: Boolean(preliminaryFeedback),
          hasRubricEvaluation: Boolean(rubricEvaluation),
          rubricTotal: validatedRubricEvaluation && validatedRubricEvaluation.rubricTotal !== undefined
            ? validatedRubricEvaluation.rubricTotal
            : null,
          rubricPercentage: validatedRubricEvaluation && validatedRubricEvaluation.rubricPercentage !== undefined
            ? validatedRubricEvaluation.rubricPercentage
            : null,
        }
      });

      // Notify the instructor(s) when a submission is newly flagged for their review
      if (willFlag && !wasPreviouslyFlagged) {
        const FLAG_CATEGORY_LABELS = {
          plagiarism: 'Possible Plagiarism / Academic Integrity',
          incomplete_submission: 'Incomplete or Unclear Submission',
          technical_issue: 'Technical Problem with Submitted Files',
          unusual_content: 'Unusual Submission Content',
          instructor_review_needed: 'Requires Instructor Review',
        };
        const categoryLabel = escalationData
          ? (FLAG_CATEGORY_LABELS[escalationData.category] || escalationData.category)
          : 'General';
        const descriptionText = escalationData
          ? escalationData.description
          : (flagReason || submission.flagReason || 'No description provided.');

        const instructors = await InstructorAssignment.findAll({
          where: { classId: submission.classId },
          include: [{ model: User, as: 'instructor', attributes: ['id', 'firstName', 'lastName'] }]
        });
        for (const ia of instructors) {
          if (ia.instructor) {
            await createNotification({
              userId: ia.instructorId,
              type: 'system',
              title: `Submission Flagged by TA: ${submission.assignment.title}`,
              message: `${req.user.fullName} flagged a submission from a student in ${access.classSection?.sectionCode || 'your class'} for your review.\n\nCategory: ${categoryLabel}\nDescription: ${descriptionText}\n\nThis is a request for instructor review — no penalty has been applied.`,
              destinationUrl: '/instructor/submissions'
            });
          }
        }
      }

      return res.status(200).json({
        success: true,
        message: willFlag
          ? 'Submission flagged for instructor review. The instructor has been notified.'
          : 'Preliminary review and feedback recorded for instructor.',
        data: { submission }
      });
    }

    // Instructor / Admin grading
    if (returnForRevision) {
      await submission.update({
        status: 'returned_for_revision',
        feedback: feedback || submission.feedback,
        gradedBy: req.user.id,
        gradedAt: new Date()
      }, { transaction: t });

      await t.commit();

      await createNotification({
        userId: submission.studentId,
        type: 'feedback',
        title: `Submission Returned for Revision: ${submission.assignment.title}`,
        message: feedback || 'Please review instructor feedback and resubmit.',
        destinationUrl: '/student/assignments'
      });

      // Notify TAs: if the submission was under_review (TA reviewed it),
      // let them know the instructor returned it for revision.
      if (submission.status === 'under_review') {
        const taAssignments = await TeachingAssistantAssignment.findAll({
          where: { classId: submission.classId, canReviewSubmissions: true }
        });
        for (const ta of taAssignments) {
          await createNotification({
            userId: ta.taUserId,
            type: 'system',
            title: `Submission Returned for Revision: ${submission.assignment.title}`,
            message: `An instructor has returned the submission you reviewed for "${submission.assignment.title}" to the student for revision.`,
            destinationUrl: '/ta/submissions'
          });
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Submission returned to student for revision.',
        data: { submission }
      });
    }

    const numericScore = Number(score);
    if (Number.isNaN(numericScore) || numericScore < 0 || numericScore > Number(submission.assignment.maxScore)) {
      throw new AppError(`Score must be between 0 and ${submission.assignment.maxScore}.`, 400);
    }

    // Capture pre-grade status before the update so we can notify TAs
    // who were involved in reviewing this submission
    const preGradeStatus = submission.status;

    await submission.update({
      status: 'graded',
      score: numericScore,
      feedback: feedback !== undefined ? feedback : submission.feedback,
      rubricEvaluation: rubricEvaluation !== undefined ? rubricEvaluation : submission.rubricEvaluation,
      flaggedForInstructorReview: false,
      gradedBy: req.user.id,
      gradedAt: new Date(),
      isGradePublished: true
    }, { transaction: t });

    await upsertGradeWithHistory({
      classId: submission.classId,
      gradeCategoryId: submission.assignment.gradeCategoryId,
      studentId: submission.studentId,
      sourceType: 'assignment',
      sourceId: submission.assignmentId,
      itemTitle: submission.assignment.title,
      score: numericScore,
      maxScore: submission.assignment.maxScore,
      feedback: feedback || null,
      status: 'published',
      actorId: req.user.id,
      reason,
      transaction: t
    });

    await t.commit();

    await recalculateStudentCourseProgress(submission.classId, submission.studentId);

    await createNotification({
      userId: submission.studentId,
      type: 'grade',
      title: `Grade Published: ${submission.assignment.title}`,
      message: `You received ${numericScore} / ${submission.assignment.maxScore}.`,
      destinationUrl: '/student/grades'
    });

    // Notify TAs assigned to this section that the submission they were
    // monitoring has been graded by the instructor — but only when the
    // submission was previously under_review (meaning a TA touched it).
    // We do not expose the student's score to the TA to avoid leaking
    // private grade information — only the assignment title and outcome.
    if (preGradeStatus === 'under_review') {
      const taAssignments = await TeachingAssistantAssignment.findAll({
        where: { classId: submission.classId, canReviewSubmissions: true }
      });
      for (const ta of taAssignments) {
        await createNotification({
          userId: ta.taUserId,
          type: 'system',
          title: `Submission Graded by Instructor: ${submission.assignment.title}`,
          message: `An instructor has officially graded the submission you reviewed for "${submission.assignment.title}". The official grade has been recorded.`,
          destinationUrl: '/ta/submissions'
        });
      }
    }

    await recordAudit({
      req,
      action: 'SUBMISSION_GRADED',
      category: 'grade',
      entityType: 'Submission',
      entityId: submission.id,
      metadata: { studentId: submission.studentId, score: numericScore }
    });

    return res.status(200).json({
      success: true,
      message: 'Submission graded and recorded in class gradebook.',
      data: { submission }
    });
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

// ============================================================================
// QUESTION BANKS & QUESTIONS
// ============================================================================

async function listQuestionBanks(req, res, next) {
  try {
    const { courseId } = req.query;
    const where = { isArchived: false };
    if (courseId) where.courseId = Number(courseId);

    const banks = await QuestionBank.findAll({
      where,
      include: [
        {
          model: Question,
          as: 'questions',
          where: { isArchived: false },
          required: false,
          include: [{ model: QuestionOption, as: 'options' }]
        }
      ],
      order: [['id', 'ASC']]
    });

    return res.status(200).json({ success: true, data: { questionBanks: banks } });
  } catch (err) {
    return next(err);
  }
}

async function listQuestionSets(req, res, next) {
  try {
    const where = {};
    if (req.query.courseId) where.courseId = Number(req.query.courseId);

    const questionSets = await QuestionSet.findAll({
      where,
      include: [{
        model: Question,
        as: 'questions',
        through: { attributes: ['orderIndex'] },
        where: { isArchived: false },
        required: false,
        include: [{ model: QuestionOption, as: 'options' }]
      }, {
        model: QuestionBank,
        as: 'questionBank',
        attributes: ['id', 'title']
      }],
      order: [['id', 'DESC']]
    });

    return res.status(200).json({ success: true, data: { questionSets } });
  } catch (err) {
    return next(err);
  }
}

async function createQuestionSet(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const payload = questionSetSchema.parse(req.body);
    const bank = await QuestionBank.findOne({
      where: {
        id: payload.questionBankId,
        courseId: payload.courseId,
        isArchived: false
      },
      transaction: t
    });
    if (!bank) throw new AppError('Select a question bank for the chosen course.', 400);

    const questionSet = await QuestionSet.create({
      courseId: payload.courseId,
      questionBankId: payload.questionBankId,
      title: payload.title,
      description: payload.description || null,
      createdBy: req.user.id
    }, { transaction: t });

    const questionIds = [];
    for (const [index, questionPayload] of payload.questions.entries()) {
      const question = await Question.create({
        ...questionPayload,
        questionBankId: bank.id,
        courseId: bank.courseId
      }, { transaction: t });
      questionIds.push(question.id);

      if (questionPayload.options?.length) {
        await QuestionOption.bulkCreate(
          questionPayload.options.map((option, optionIndex) => ({
            questionId: question.id,
            optionText: option.optionText,
            isCorrect: option.isCorrect,
            orderIndex: optionIndex + 1
          })),
          { transaction: t }
        );
      }

      await QuestionSetQuestion.create({
        questionSetId: questionSet.id,
        questionId: question.id,
        orderIndex: index + 1
      }, { transaction: t });
    }

    await t.commit();
    await recordAudit({
      req,
      action: 'QUESTION_SET_CREATED',
      category: 'assessment',
      entityType: 'QuestionSet',
      entityId: questionSet.id,
      metadata: { questionBankId: bank.id, courseId: bank.courseId, questionCount: questionIds.length }
    });

    const createdQuestionSet = await QuestionSet.findByPk(questionSet.id, {
      include: [{
        model: Question,
        as: 'questions',
        through: { attributes: ['orderIndex'] },
        include: [{ model: QuestionOption, as: 'options' }]
      }]
    });

    return res.status(201).json({
      success: true,
      message: 'Question set saved.',
      data: { questionSet: createdQuestionSet }
    });
  } catch (err) {
    if (!t.finished) await t.rollback();
    return next(err);
  }
}

async function createQuestionBank(req, res, next) {
  try {
    const { courseId, title, topic, description } = req.body;
    if (!courseId || !title || !topic) {
      throw new AppError('courseId, title, and topic are required.', 400);
    }

    const bank = await QuestionBank.create({
      courseId: Number(courseId),
      title,
      topic,
      description: description || null,
      createdBy: req.user.id
    });

    return res.status(201).json({ success: true, message: 'Question bank created.', data: { questionBank: bank } });
  } catch (err) {
    return next(err);
  }
}

async function createQuestion(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const payload = questionSchema.parse(req.body);
    const question = await Question.create({
      questionBankId: payload.questionBankId,
      courseId: payload.courseId,
      topic: payload.topic,
      questionType: payload.questionType,
      difficulty: payload.difficulty,
      prompt: payload.prompt,
      codeSnippet: payload.codeSnippet || null,
      points: payload.points,
      correctAnswerText: payload.correctAnswerText || null,
      matchingPairs: payload.matchingPairs || null,
      explanation: payload.explanation || null
    }, { transaction: t });

    if (Array.isArray(payload.options) && payload.options.length > 0) {
      for (let i = 0; i < payload.options.length; i += 1) {
        await QuestionOption.create({
          questionId: question.id,
          optionText: payload.options[i].optionText,
          isCorrect: Boolean(payload.options[i].isCorrect),
          orderIndex: i + 1
        }, { transaction: t });
      }
    }

    await t.commit();

    const fullQuestion = await Question.findByPk(question.id, {
      include: [{ model: QuestionOption, as: 'options' }]
    });

    return res.status(201).json({
      success: true,
      message: 'Question added to bank.',
      data: { question: fullQuestion }
    });
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

// ============================================================================
// ASSESSMENTS & ATTEMPTS (SERVER-TIMED & AUTO/MANUAL GRADED)
// ============================================================================

async function listAssessments(req, res, next) {
  try {
    const { classId, courseId, moduleId } = req.query;
    const where = {};
    if (classId) where.classId = Number(classId);
    if (courseId) where.courseId = Number(courseId);
    if (moduleId) where.moduleId = Number(moduleId);

    if (req.user.primaryRole === 'student') {
      where.publicationStatus = ['published', 'closed'];
      if (!classId) {
        const memberships = await ClassMembership.findAll({
          where: { studentId: req.user.id, status: ['enrolled', 'completed'] }
        });
        where.classId = memberships.map((m) => m.classId);
      }
    } else if (req.user.primaryRole === 'instructor' && !classId) {
      const assigned = await InstructorAssignment.findAll({ where: { instructorId: req.user.id } });
      where.classId = assigned.map((a) => a.classId);
    }

    const assessments = await Assessment.findAll({
      where,
      include: [
        { model: AssessmentQuestion, as: 'assessmentQuestions' },
        {
          model: AssessmentAttempt,
          as: 'attempts',
          ...(req.user.primaryRole === 'student' ? { where: { studentId: req.user.id }, required: false } : {})
        }
      ],
      order: [['closeDate', 'ASC']]
    });

    return res.status(200).json({ success: true, data: { assessments } });
  } catch (err) {
    return next(err);
  }
}

async function createAssessment(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const payload = assessmentSchema.parse(req.body);
    const { classSection } = await verifyClassAccess(req.user, payload.classId, { allowAdmin: true, allowInstructor: true });
    if (Number(classSection.courseOffering.courseId) !== payload.courseId) {
      throw new AppError('The selected class does not belong to this course.', 400);
    }
    if (payload.moduleId) {
      const module = await Module.findOne({
        where: { id: payload.moduleId, courseId: payload.courseId },
        transaction: t
      });
      if (!module) throw new AppError('The selected module does not belong to this course.', 400);
    }

    const questionIds = [...new Set(payload.questionIds)];
    if (payload.publicationStatus === 'published' && questionIds.length === 0) {
      throw new AppError('Add at least one question before publishing this assessment.', 400);
    }

    if (questionIds.length > 0) {
      const questions = await Question.findAll({
        where: { id: questionIds, courseId: payload.courseId, isArchived: false },
        attributes: ['id'],
        transaction: t
      });
      if (questions.length !== questionIds.length) {
        throw new AppError('One or more selected questions are unavailable for this course.', 400);
      }
    }

    const assessment = await Assessment.create({
      ...payload,
      createdBy: req.user.id
    }, { transaction: t });

    if (questionIds.length > 0) {
      await AssessmentQuestion.bulkCreate(
        questionIds.map((questionId, index) => ({
          assessmentId: assessment.id,
          questionId,
          orderIndex: index + 1
        })),
        { transaction: t }
      );
    }

    await t.commit();

    return res.status(201).json({
      success: true,
      message: 'Assessment created.',
      data: { assessment }
    });
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

/**
 * Starts or resumes an assessment attempt.
 * Strips protected answer keys (`isCorrect`, `correctAnswerText`, `explanation`) from student payload!
 */
async function startOrResumeAttempt(req, res, next) {
  try {
    const assessmentId = Number(req.params.id);
    const assessment = await Assessment.findByPk(assessmentId, {
      include: [
        {
          model: AssessmentQuestion,
          as: 'assessmentQuestions',
          include: [
            {
              model: Question,
              as: 'question',
              include: [{ model: QuestionOption, as: 'options' }]
            }
          ]
        }
      ]
    });

    if (!assessment) throw new AppError('Assessment not found.', 404);
    await verifyClassAccess(req.user, assessment.classId, { allowStudent: true, allowInstructor: true, allowAdmin: true });

    const now = new Date();
    if (assessment.closeDate && now > new Date(assessment.closeDate) && !assessment.allowLateAttempts) {
      throw new AppError('This assessment has closed.', 400, 'ASSESSMENT_CLOSED');
    }

    // Check for existing in-progress attempt
    let attempt = await AssessmentAttempt.findOne({
      where: {
        assessmentId: assessment.id,
        studentId: req.user.id,
        status: 'in_progress'
      },
      include: [{ model: AssessmentAnswer, as: 'answers' }]
    });

    if (!attempt) {
      const priorAttemptsCount = await AssessmentAttempt.count({
        where: { assessmentId: assessment.id, studentId: req.user.id }
      });

      if (priorAttemptsCount >= assessment.maxAttempts) {
        throw new AppError(`You have used all ${assessment.maxAttempts} permitted attempt(s) for this assessment.`, 400, 'MAX_ATTEMPTS_EXCEEDED');
      }

      const expiresAt = new Date(now.getTime() + (assessment.timeLimitMinutes || 45) * 60000);
      attempt = await AssessmentAttempt.create({
        assessmentId: assessment.id,
        classId: assessment.classId,
        studentId: req.user.id,
        attemptNumber: priorAttemptsCount + 1,
        status: 'in_progress',
        startedAt: now,
        expiresAt
      });
      attempt.answers = [];
    }

    // Sanitize questions so students NEVER see protected answer keys during an active attempt
    let orderedQuestions = [...(assessment.assessmentQuestions || [])].sort((a, b) => a.orderIndex - b.orderIndex);
    if (assessment.randomizeQuestions) {
      orderedQuestions = orderedQuestions.sort(() => Math.random() - 0.5);
    }

    const sanitizedQuestions = orderedQuestions.map((aq) => {
      const q = aq.question;
      let opts = (q.options || []).map((o) => ({
        id: o.id,
        optionText: o.optionText,
        orderIndex: o.orderIndex
      }));
      if (assessment.randomizeOptions) {
        opts = opts.sort(() => Math.random() - 0.5);
      }

      return {
        assessmentQuestionId: aq.id,
        questionId: q.id,
        questionType: q.questionType,
        prompt: q.prompt,
        codeSnippet: q.codeSnippet,
        points: Number(aq.pointsOverride || q.points || 1),
        options: opts,
        matchingPrompts: Array.isArray(q.matchingPairs) ? q.matchingPairs.map((p) => p.left) : null,
        matchingChoices: Array.isArray(q.matchingPairs) ? q.matchingPairs.map((p) => p.right) : null
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        attempt: {
          id: attempt.id,
          assessmentId: assessment.id,
          title: assessment.title,
          instructions: assessment.instructions,
          attemptNumber: attempt.attemptNumber,
          status: attempt.status,
          startedAt: attempt.startedAt,
          expiresAt: attempt.expiresAt,
          remainingSeconds: Math.max(0, Math.floor((new Date(attempt.expiresAt) - now) / 1000)),
          savedAnswers: attempt.answers || []
        },
        questions: sanitizedQuestions
      }
    });
  } catch (err) {
    return next(err);
  }
}

async function saveAttemptAnswers(req, res, next) {
  try {
    const attemptId = Number(req.params.attemptId);
    const { answers } = req.body;

    const attempt = await AssessmentAttempt.findByPk(attemptId);
    if (!attempt || attempt.studentId !== req.user.id) {
      throw new AppError('Attempt not found or unauthorized.', 404);
    }

    if (attempt.status !== 'in_progress') {
      throw new AppError('Attempt has already been submitted.', 400, 'ATTEMPT_ALREADY_SUBMITTED');
    }

    if (Array.isArray(answers)) {
      for (const ans of answers) {
        const [record, created] = await AssessmentAnswer.findOrCreate({
          where: { attemptId: attempt.id, questionId: Number(ans.questionId) },
          defaults: {
            attemptId: attempt.id,
            questionId: Number(ans.questionId),
            selectedOptionIds: ans.selectedOptionIds || null,
            textAnswer: ans.textAnswer || null,
            matchingResponse: ans.matchingResponse || null
          }
        });
        if (!created) {
          await record.update({
            selectedOptionIds: ans.selectedOptionIds !== undefined ? ans.selectedOptionIds : record.selectedOptionIds,
            textAnswer: ans.textAnswer !== undefined ? ans.textAnswer : record.textAnswer,
            matchingResponse: ans.matchingResponse !== undefined ? ans.matchingResponse : record.matchingResponse
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Answers saved automatically.'
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Evaluates and submits an assessment attempt on the server.
 * Never trusts client-submitted scores!
 */
async function submitAttempt(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const attemptId = Number(req.params.attemptId);
    const { answers } = req.body;

    const attempt = await AssessmentAttempt.findByPk(attemptId, {
      include: [
        {
          model: Assessment,
          as: 'assessment',
          include: [
            {
              model: AssessmentQuestion,
              as: 'assessmentQuestions',
              include: [
                {
                  model: Question,
                  as: 'question',
                  include: [{ model: QuestionOption, as: 'options' }]
                }
              ]
            }
          ]
        }
      ],
      transaction: t
    });

    if (!attempt || attempt.studentId !== req.user.id) {
      throw new AppError('Assessment attempt not found.', 404);
    }

    if (attempt.status !== 'in_progress') {
      throw new AppError('This attempt has already been submitted.', 400, 'ATTEMPT_ALREADY_SUBMITTED');
    }

    // Save any final answers submitted with the request
    if (Array.isArray(answers)) {
      for (const ans of answers) {
        const [record, created] = await AssessmentAnswer.findOrCreate({
          where: { attemptId: attempt.id, questionId: Number(ans.questionId) },
          defaults: {
            attemptId: attempt.id,
            questionId: Number(ans.questionId),
            selectedOptionIds: ans.selectedOptionIds || null,
            textAnswer: ans.textAnswer || null,
            matchingResponse: ans.matchingResponse || null
          },
          transaction: t
        });
        if (!created) {
          await record.update({
            selectedOptionIds: ans.selectedOptionIds !== undefined ? ans.selectedOptionIds : record.selectedOptionIds,
            textAnswer: ans.textAnswer !== undefined ? ans.textAnswer : record.textAnswer,
            matchingResponse: ans.matchingResponse !== undefined ? ans.matchingResponse : record.matchingResponse
          }, { transaction: t });
        }
      }
    }

    const storedAnswers = await AssessmentAnswer.findAll({
      where: { attemptId: attempt.id },
      transaction: t
    });

    let autoScore = 0;
    let possiblePointsSum = 0;
    let requiresManual = false;

    for (const aq of attempt.assessment.assessmentQuestions || []) {
      const q = aq.question;
      const maxPts = Number(aq.pointsOverride || q.points || 1);
      possiblePointsSum += maxPts;

      const studentAns = storedAnswers.find((a) => a.questionId === q.id);
      if (!studentAns) continue;

      let isCorrect = false;
      let awarded = 0;

      if (q.questionType === 'multiple_choice' || q.questionType === 'true_false') {
        const correctOpt = (q.options || []).find((o) => o.isCorrect);
        const selectedId = Array.isArray(studentAns.selectedOptionIds) ? Number(studentAns.selectedOptionIds[0]) : null;
        const expected = (q.correctAnswerText || '').trim().toLowerCase();
        const given = (studentAns.textAnswer || '').trim().toLowerCase();
        if (correctOpt && selectedId === correctOpt.id) {
          isCorrect = true;
          awarded = maxPts;
        } else if (expected && given === expected) {
          isCorrect = true;
          awarded = maxPts;
        }
      } else if (q.questionType === 'multiple_select') {
        const correctIds = (q.options || []).filter((o) => o.isCorrect).map((o) => o.id).sort();
        const selectedIds = (studentAns.selectedOptionIds || []).map(Number).sort();
        if (
          correctIds.length === selectedIds.length
          && correctIds.every((val, idx) => val === selectedIds[idx])
        ) {
          isCorrect = true;
          awarded = maxPts;
        }
      } else if (q.questionType === 'identification' || q.questionType === 'fill_in_the_blank') {
        const expected = (q.correctAnswerText || '').trim().toLowerCase();
        const given = (studentAns.textAnswer || '').trim().toLowerCase();
        if (expected && given === expected) {
          isCorrect = true;
          awarded = maxPts;
        }
      } else if (q.questionType === 'matching') {
        const pairs = q.matchingPairs || [];
        const resp = studentAns.matchingResponse || {};
        if (pairs.length > 0 && pairs.every((p) => resp[p.left] === p.right)) {
          isCorrect = true;
          awarded = maxPts;
        }
      } else if (q.questionType === 'essay' || q.questionType === 'short_answer') {
        requiresManual = true;
        isCorrect = null;
        awarded = 0;
      }

      autoScore += awarded;
      await studentAns.update({
        isCorrect,
        pointsAwarded: awarded
      }, { transaction: t });
    }

    // Normalize score to assessment.maxScore if question sum differs
    const assessmentMax = Number(attempt.assessment.maxScore || 100);
    const normalizedAutoScore = (!requiresManual && possiblePointsSum > 0 && possiblePointsSum !== assessmentMax)
      ? Number(((autoScore / possiblePointsSum) * assessmentMax).toFixed(2))
      : Number(autoScore.toFixed(2));

    const finalStatus = requiresManual ? 'submitted' : 'graded';
    const isPublished = !requiresManual && Boolean(attempt.assessment.autoPublishResults);

    await attempt.update({
      status: finalStatus,
      submittedAt: new Date(),
      autoScore: normalizedAutoScore,
      totalScore: normalizedAutoScore,
      RequiresManualGrading: requiresManual,
      isPublished,
      gradedAt: requiresManual ? null : new Date()
    }, { transaction: t });

    if (isPublished) {
      await upsertGradeWithHistory({
        classId: attempt.classId,
        gradeCategoryId: attempt.assessment.gradeCategoryId,
        studentId: req.user.id,
        sourceType: 'assessment',
        sourceId: attempt.assessmentId,
        itemTitle: attempt.assessment.title,
        score: normalizedAutoScore,
        maxScore: assessmentMax,
        feedback: 'Auto-graded assessment attempt',
        status: 'published',
        actorId: req.user.id,
        reason: `Auto-graded attempt #${attempt.attemptNumber}`,
        transaction: t
      });
    }

    await t.commit();

    const courseProgress = await recalculateStudentCourseProgress(attempt.classId, req.user.id);
    const percentage = assessmentMax > 0
      ? Number(((normalizedAutoScore / assessmentMax) * 100).toFixed(2))
      : 0;
    const passingScore = Number(attempt.assessment.passingScore || 75);
    const passed = percentage >= passingScore;

    return res.status(200).json({
      success: true,
      message: requiresManual
        ? 'Assessment submitted! Subjective responses are queued for instructor grading.'
        : `Assessment submitted! You scored ${percentage}% (${normalizedAutoScore}/${assessmentMax}).`,
      data: {
        attempt,
        percentage,
        maxScore: assessmentMax,
        passingScore,
        passed,
        courseProgress
      }
    });
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

async function manualGradeAttempt(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const attemptId = Number(req.params.attemptId);
    const { manualScore, instructorFeedback, publishResult = true } = req.body;

    const attempt = await AssessmentAttempt.findByPk(attemptId, {
      include: [{ model: Assessment, as: 'assessment' }],
      transaction: t
    });

    if (!attempt) throw new AppError('Attempt not found.', 404);
    await verifyClassAccess(req.user, attempt.classId, { allowAdmin: true, allowInstructor: true });

    const manualPts = Number(manualScore || 0);
    const totalScore = Math.min(
      Number(attempt.assessment.maxScore || 100),
      Number((Number(attempt.autoScore || 0) + manualPts).toFixed(2))
    );

    await attempt.update({
      manualScore: manualPts,
      totalScore,
      status: 'graded',
      RequiresManualGrading: false,
      isPublished: Boolean(publishResult),
      instructorFeedback: instructorFeedback || attempt.instructorFeedback,
      gradedBy: req.user.id,
      gradedAt: new Date()
    }, { transaction: t });

    if (publishResult) {
      await upsertGradeWithHistory({
        classId: attempt.classId,
        gradeCategoryId: attempt.assessment.gradeCategoryId,
        studentId: attempt.studentId,
        sourceType: 'assessment',
        sourceId: attempt.assessmentId,
        itemTitle: attempt.assessment.title,
        score: totalScore,
        maxScore: attempt.assessment.maxScore,
        feedback: instructorFeedback || 'Graded by instructor',
        status: 'published',
        actorId: req.user.id,
        reason: 'Instructor manual assessment grading',
        transaction: t
      });
    }

    await t.commit();

    await createNotification({
      userId: attempt.studentId,
      type: 'grade',
      title: `Assessment Graded: ${attempt.assessment.title}`,
      message: `Your final score is ${totalScore} / ${attempt.assessment.maxScore}.`,
      destinationUrl: '/student/assessments'
    });

    return res.status(200).json({
      success: true,
      message: 'Assessment attempt graded and published.',
      data: { attempt }
    });
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

// ============================================================================
// UPDATE & DELETE — ASSIGNMENTS
// ============================================================================

async function updateAssignment(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const assignment = await Assignment.findByPk(Number(req.params.id), { transaction: t });
    if (!assignment) throw new AppError('Assignment not found.', 404);
    await verifyClassAccess(req.user, assignment.classId, { allowAdmin: true, allowInstructor: true });

    const allowed = ['title', 'instructions', 'dueDate', 'cutoffDate', 'maxScore', 'assignmentType',
      'allowLateSubmissions', 'latePenaltyPercent', 'allowResubmission', 'maxAttempts',
      'starterCode', 'allowedFileTypes', 'publicationStatus'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    await assignment.update(updates, { transaction: t });
    await t.commit();

    await recordAudit({ req, action: 'ASSIGNMENT_UPDATED', category: 'assessment',
      entityType: 'Assignment', entityId: assignment.id, metadata: updates });

    return res.status(200).json({ success: true, message: 'Assignment updated.', data: { assignment } });
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

async function deleteAssignment(req, res, next) {
  try {
    const assignment = await Assignment.findByPk(Number(req.params.id));
    if (!assignment) throw new AppError('Assignment not found.', 404);
    await verifyClassAccess(req.user, assignment.classId, { allowAdmin: true, allowInstructor: true });

    await assignment.destroy();

    await recordAudit({ req, action: 'ASSIGNMENT_DELETED', category: 'assessment',
      entityType: 'Assignment', entityId: Number(req.params.id) });

    return res.status(200).json({ success: true, message: 'Assignment deleted.' });
  } catch (err) {
    return next(err);
  }
}

// ============================================================================
// UPDATE & DELETE — ASSESSMENTS
// ============================================================================

async function updateAssessment(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const assessment = await Assessment.findByPk(Number(req.params.id), { transaction: t });
    if (!assessment) throw new AppError('Assessment not found.', 404);
    await verifyClassAccess(req.user, assessment.classId, { allowAdmin: true, allowInstructor: true });

    const allowed = ['title', 'assessmentType', 'instructions', 'timeLimitMinutes', 'maxScore',
      'openDate', 'closeDate', 'maxAttempts', 'randomizeQuestions', 'randomizeOptions',
      'autoPublishResults', 'allowLateAttempts', 'publicationStatus'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (req.body.moduleId !== undefined) {
      const moduleId = req.body.moduleId === null || req.body.moduleId === ''
        ? null
        : Number(req.body.moduleId);
      if (moduleId !== null) {
        if (!Number.isInteger(moduleId) || moduleId < 1) {
          throw new AppError('moduleId must be a positive integer or null.', 400);
        }
        const module = await Module.findOne({
          where: { id: moduleId, courseId: assessment.courseId },
          transaction: t
        });
        if (!module) throw new AppError('The selected module does not belong to this course.', 400);
      }
      updates.moduleId = moduleId;
    }

    let questionIdsToAdd = [];
    if (req.body.questionIds !== undefined) {
      if (!Array.isArray(req.body.questionIds) ||
        req.body.questionIds.some((id) => !Number.isInteger(id) || id < 1)) {
        throw new AppError('questionIds must be an array of positive integers.', 400);
      }

      const requestedQuestionIds = [...new Set(req.body.questionIds)];
      const questions = await Question.findAll({
        where: {
          id: requestedQuestionIds,
          courseId: assessment.courseId,
          isArchived: false
        },
        attributes: ['id'],
        transaction: t
      });
      if (questions.length !== requestedQuestionIds.length) {
        throw new AppError('One or more selected questions are unavailable for this course.', 400);
      }

      const existingLinks = await AssessmentQuestion.findAll({
        where: { assessmentId: assessment.id },
        attributes: ['questionId', 'orderIndex'],
        transaction: t
      });
      const existingQuestionIds = new Set(existingLinks.map((link) => link.questionId));
      questionIdsToAdd = requestedQuestionIds.filter((id) => !existingQuestionIds.has(id));

      if (questionIdsToAdd.length > 0) {
        const nextOrderIndex = Math.max(0, ...existingLinks.map((link) => link.orderIndex)) + 1;
        await AssessmentQuestion.bulkCreate(
          questionIdsToAdd.map((questionId, index) => ({
            assessmentId: assessment.id,
            questionId,
            orderIndex: nextOrderIndex + index
          })),
          { transaction: t }
        );
      }
    }

    if (updates.publicationStatus === 'published' && assessment.publicationStatus !== 'published') {
      const questionCount = await AssessmentQuestion.count({
        where: { assessmentId: assessment.id },
        transaction: t
      });
      if (questionCount === 0) {
        throw new AppError('Add at least one question before publishing this assessment.', 400);
      }
    }

    await assessment.update(updates, { transaction: t });
    await recordAudit({
      req,
      action: 'ASSESSMENT_UPDATED',
      category: 'assessment',
      entityType: 'Assessment',
      entityId: assessment.id,
      metadata: { ...updates, ...(questionIdsToAdd.length ? { questionIdsAdded: questionIdsToAdd } : {}) }
    });
    await t.commit();
    return res.status(200).json({ success: true, message: 'Assessment updated.', data: { assessment } });
  } catch (err) {
    if (!t.finished) await t.rollback();
    return next(err);
  }
}

async function deleteAssessment(req, res, next) {
  try {
    const assessment = await Assessment.findByPk(Number(req.params.id));
    if (!assessment) throw new AppError('Assessment not found.', 404);
    await verifyClassAccess(req.user, assessment.classId, { allowAdmin: true, allowInstructor: true });

    await assessment.destroy();

    await recordAudit({ req, action: 'ASSESSMENT_DELETED', category: 'assessment',
      entityType: 'Assessment', entityId: Number(req.params.id) });

    return res.status(200).json({ success: true, message: 'Assessment deleted.' });
  } catch (err) {
    return next(err);
  }
}

// ============================================================================
// UPDATE & DELETE — QUESTIONS
// ============================================================================

async function updateQuestion(req, res, next) {
  try {
    const question = await Question.findByPk(Number(req.params.id));
    if (!question) throw new AppError('Question not found.', 404);

    const allowed = ['prompt', 'questionType', 'difficulty', 'points', 'codeSnippet',
      'correctAnswerText', 'explanation', 'topic'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    await question.update(updates);

    return res.status(200).json({ success: true, message: 'Question updated.', data: { question } });
  } catch (err) {
    return next(err);
  }
}

async function deleteQuestion(req, res, next) {
  try {
    const question = await Question.findByPk(Number(req.params.id));
    if (!question) throw new AppError('Question not found.', 404);
    await question.update({ isArchived: true });
    return res.status(200).json({ success: true, message: 'Question archived.' });
  } catch (err) {
    return next(err);
  }
}

// ============================================================================
// ASSIGNMENT EXTENSION (per-student due-date override)
// ============================================================================
async function extendAssignmentForStudent(req, res, next) {
  try {
    const assignmentId = Number(req.params.id);
    const { studentId, newDueDate, reason } = req.body;
    if (!studentId || !newDueDate) throw new AppError('studentId and newDueDate are required.', 400);

    const assignment = await Assignment.findByPk(assignmentId);
    if (!assignment) throw new AppError('Assignment not found.', 404);
    await verifyClassAccess(req.user, assignment.classId, { allowAdmin: true, allowInstructor: true });

    // Store extension as a special submission-level override.
    // We use a lightweight approach: find or create a draft submission and set a custom field.
    // Since the Assignment model may not have per-student overrides, we record it in a
    // dedicated JSON field on the assignment (extensions array).
    const existing = assignment.extensionOverrides ? JSON.parse(assignment.extensionOverrides) : [];
    const filtered = existing.filter(e => e.studentId !== Number(studentId));
    filtered.push({ studentId: Number(studentId), newDueDate, reason: reason || null, grantedBy: req.user.id, grantedAt: new Date() });

    await assignment.update({ extensionOverrides: JSON.stringify(filtered) });

    await recordAudit({ req, action: 'ASSIGNMENT_EXTENSION_GRANTED', category: 'assessment',
      entityType: 'Assignment', entityId: assignmentId,
      metadata: { studentId, newDueDate } });

    return res.status(200).json({
      success: true,
      message: 'Due date extension granted.',
      data: { extensions: filtered }
    });
  } catch (err) { return next(err); }
}

/* ═══════════════════════════════════════════════════════════════════════════
   Escalation History — GET /submissions/:id/escalation-history
   Returns the audit trail of flag/review actions for a submission.
   Accessible by TAs (verified against their assigned sections), instructors,
   and admins. This lets TAs view who flagged, when, and the reason category.
═══════════════════════════════════════════════════════════════════════════ */
async function getEscalationHistory(req, res, next) {
  try {
    const submissionId = Number(req.params.id);
    if (!submissionId || Number.isNaN(submissionId)) {
      throw new AppError('Invalid submission identifier.', 400, 'INVALID_SUBMISSION_ID');
    }

    const submission = await Submission.findByPk(submissionId, {
      attributes: ['id', 'classId', 'assignmentId', 'studentId', 'flaggedForInstructorReview', 'flagReason'],
    });
    if (!submission) throw new AppError('Submission not found.', 404);

    // Verify the caller has access to this submission's class section
    await verifyClassAccess(req.user, submission.classId, {
      allowAdmin: true,
      allowInstructor: true,
      allowTA: true,
    });

    // Query audit logs for this submission's flag/review/grade actions
    const logs = await AuditLog.findAll({
      where: {
        entityType: 'Submission',
        entityId: String(submissionId),
        action: [
          'SUBMISSION_FLAGGED_BY_TA',
          'SUBMISSION_TA_REVIEWED',
          'SUBMISSION_GRADED',
        ],
      },
      include: [{
        model: User,
        as: 'actor',
        attributes: ['id', 'firstName', 'lastName', 'email'],
        required: false,
      }],
      order: [['createdAt', 'DESC']],
      limit: 50,
    });

    // Parse structured flagReason from the submission if present
    let currentEscalation = null;
    if (submission.flagReason) {
      try {
        currentEscalation = JSON.parse(submission.flagReason);
      } catch (_) {
        // Old-format plain text — wrap it
        currentEscalation = {
          category: 'instructor_review_needed',
          description: submission.flagReason,
          status: 'pending_instructor_review',
        };
      }
    }

    const FLAG_CATEGORY_LABELS = {
      plagiarism: 'Possible Plagiarism / Academic Integrity',
      incomplete_submission: 'Incomplete or Unclear Submission',
      technical_issue: 'Technical Problem with Submitted Files',
      unusual_content: 'Unusual Submission Content',
      instructor_review_needed: 'Requires Instructor Review',
    };

    // Build the history entries
    const history = logs.map((log) => {
      const meta = log.metadata || {};
      let category = meta.flagCategory;
      let description = meta.flagDescription;
      // For older logs that used flagReason instead of flagCategory/flagDescription
      if (!category && meta.flagReason) {
        try {
          const parsed = JSON.parse(meta.flagReason);
          category = parsed.category;
          description = parsed.description;
        } catch (_) {
          description = meta.flagReason;
        }
      }

      return {
        id: log.id,
        action: log.action,
        actionLabel: log.action === 'SUBMISSION_FLAGGED_BY_TA' ? 'Flagged for Instructor Review'
                    : log.action === 'SUBMISSION_TA_REVIEWED' ? 'TA Preliminary Review'
                    : log.action === 'SUBMISSION_GRADED' ? 'Officially Graded by Instructor'
                    : log.action,
        actorName: log.actor
          ? `${log.actor.firstName} ${log.actor.lastName}`
          : (meta.flaggedByName || meta.actorEmail || 'Unknown'),
        actorEmail: log.actor?.email || null,
        category: category || null,
        categoryLabel: category ? (FLAG_CATEGORY_LABELS[category] || category) : null,
        description: description || null,
        flagged: meta.flagged || false,
        hasRubric: Boolean(meta.hasRubricEvaluation),
        rubricTotal: meta.rubricTotal ?? null,
        rubricPercentage: meta.rubricPercentage ?? null,
        timestamp: log.createdAt,
        severity: log.severity,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        submissionId,
        classId: submission.classId,
        assignmentId: submission.assignmentId,
        studentId: submission.studentId,
        isCurrentlyFlagged: submission.flaggedForInstructorReview,
        currentEscalation: currentEscalation ? {
          ...currentEscalation,
          categoryLabel: FLAG_CATEGORY_LABELS[currentEscalation.category] || currentEscalation.category,
        } : null,
        history,
      },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  listSubmissions,
  submitAssignmentWork,
  reviewOrGradeSubmission,
  getEscalationHistory,
  listQuestionBanks,
  listQuestionSets,
  createQuestionSet,
  createQuestionBank,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  listAssessments,
  createAssessment,
  updateAssessment,
  deleteAssessment,
  startOrResumeAttempt,
  saveAttemptAnswers,
  submitAttempt,
  manualGradeAttempt,
  extendAssignmentForStudent
};
