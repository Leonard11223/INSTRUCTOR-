const crypto = require('crypto');
const { Op } = require('sequelize');
const {
  sequelize,
  GradeCategory,
  Grade,
  GradeHistory,
  ClassSection,
  ClassMembership,
  CourseOffering,
  Course,
  Department,
  Program,
  AcademicYear,
  Semester,
  Certificate,
  Submission,
  Assignment,
  InstructorAssignment,
  User
} = require('../models');
const { AppError } = require('../middleware/error.middleware');
const { verifyClassAccess } = require('../middleware/auth.middleware');
const { calculateClassGradebook, upsertGradeWithHistory } = require('../services/gradebook.service');
const { recordAudit } = require('../utils/auditLogger');
const { createNotification } = require('../utils/notifyUser');
const { gradeCategoriesBulkSchema } = require('../validators/schemas');

async function getClassGradebookView(req, res, next) {
  try {
    const classId = Number(req.params.classId || req.query.classId);
    if (!classId) throw new AppError('classId is required.', 400);

    const access = await verifyClassAccess(req.user, classId, {
      allowAdmin: true,
      allowInstructor: true,
      allowTA: true,
      allowStudent: true
    });

    // Students can NEVER view another student's grades
    const studentIdFilter = access.accessRole === 'student' ? req.user.id : null;
    const publishedOnly = access.accessRole === 'student';

    const gradebook = await calculateClassGradebook(classId, {
      studentIdFilter,
      publishedOnly
    });

    const historyWhere = { classId };
    if (studentIdFilter) historyWhere.studentId = studentIdFilter;

    const history = await GradeHistory.findAll({
      where: historyWhere,
      include: [{ model: User, as: 'editor', attributes: ['id', 'firstName', 'lastName', 'email'] }],
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    return res.status(200).json({
      success: true,
      data: {
        ...gradebook,
        history
      }
    });
  } catch (err) {
    return next(err);
  }
}

async function getStudentPersonalGrades(req, res, next) {
  try {
    const studentId = req.user.primaryRole === 'student'
      ? req.user.id
      : Number(req.query.studentId || req.user.id);

    if (req.user.primaryRole === 'student' && studentId !== req.user.id) {
      throw new AppError('Forbidden: Students cannot view another student’s gradebook.', 403, 'FORBIDDEN_STUDENT_GRADES');
    }

    const memberships = await ClassMembership.findAll({
      where: { studentId, status: ['enrolled', 'completed'] },
      include: [
        {
          model: ClassSection,
          as: 'classSection',
          include: [
            {
              model: CourseOffering,
              as: 'courseOffering',
              include: [{ model: Course, as: 'course' }]
            }
          ]
        }
      ]
    });

    const classSummaries = [];
    for (const m of memberships) {
      const gb = await calculateClassGradebook(m.classId, {
        studentIdFilter: studentId,
        publishedOnly: req.user.primaryRole === 'student'
      });
      const row = gb.students[0];
      classSummaries.push({
        classId: m.classId,
        sectionCode: m.classSection?.sectionCode,
        courseCode: m.classSection?.courseOffering?.course?.code,
        courseTitle: m.classSection?.courseOffering?.course?.title,
        finalGradesStatus: gb.finalGradesStatus,
        standingPercentage: row?.standingPercentage ?? null,
        institutionalGrade: row?.institutionalGrade ?? null,
        letterGrade: row?.letterGrade ?? 'N/A',
        remarks: row?.remarks ?? 'In Progress',
        categoryBreakdown: row?.categoryBreakdown ?? {},
        grades: row?.grades ?? []
      });
    }

    return res.status(200).json({
      success: true,
      data: { classes: classSummaries }
    });
  } catch (err) {
    return next(err);
  }
}

async function updateClassGradeCategories(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const classId = Number(req.params.classId);
    await verifyClassAccess(req.user, classId, { allowAdmin: true, allowInstructor: true });

    const { categories } = gradeCategoriesBulkSchema.parse(req.body);
    const totalWeight = categories.reduce((acc, c) => acc + Number(c.weightPercent || 0), 0);

    if (Math.abs(totalWeight - 100) > 0.01) {
      throw new AppError(`Category weights must sum to exactly 100% (currently ${totalWeight.toFixed(2)}%).`, 400, 'INVALID_WEIGHT_SUM');
    }

    const updatedCategories = [];
    for (let i = 0; i < categories.length; i += 1) {
      const cat = categories[i];
      if (cat.id) {
        const existing = await GradeCategory.findOne({ where: { id: cat.id, classId }, transaction: t });
        if (existing) {
          await existing.update({
            name: cat.name,
            categoryType: cat.categoryType,
            weightPercent: cat.weightPercent,
            orderIndex: i + 1
          }, { transaction: t });
          updatedCategories.push(existing);
          continue;
        }
      }
      const created = await GradeCategory.create({
        classId,
        name: cat.name,
        categoryType: cat.categoryType,
        weightPercent: cat.weightPercent,
        orderIndex: i + 1
      }, { transaction: t });
      updatedCategories.push(created);
    }

    await t.commit();

    await recordAudit({
      req,
      action: 'GRADE_CATEGORIES_CONFIGURED',
      category: 'grade',
      entityType: 'ClassSection',
      entityId: classId,
      metadata: { categories }
    });

    return res.status(200).json({
      success: true,
      message: 'Grade categories and weights updated (Total = 100%).',
      data: { categories: updatedCategories }
    });
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

async function recordOrUpdateManualGrade(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const classId = Number(req.params.classId);
    await verifyClassAccess(req.user, classId, { allowAdmin: false, allowInstructor: true });

    const {
      gradeId,
      gradeCategoryId,
      studentId,
      itemTitle,
      score,
      maxScore = 100,
      isExempt = false,
      isMissing = false,
      extraCreditPoints = 0,
      feedback,
      status = 'published',
      reason
    } = req.body;

    if (gradeId) {
      const existing = await Grade.findByPk(Number(gradeId), { transaction: t });
      if (existing && existing.status === 'published' && (!reason || String(reason).trim().length < 3)) {
        throw new AppError('Modifying an already published grade requires a documented revision reason for the audit history.', 400, 'REVISION_REASON_REQUIRED');
      }
    }

    const grade = await upsertGradeWithHistory({
      classId,
      gradeCategoryId: Number(gradeCategoryId),
      studentId: Number(studentId),
      sourceType: 'manual',
      sourceId: gradeId ? Number(gradeId) : null,
      itemTitle: itemTitle || 'Manual Assessment Item',
      score: score !== null && score !== undefined && score !== '' ? Number(score) : null,
      maxScore: Number(maxScore),
      isExempt: Boolean(isExempt),
      isMissing: Boolean(isMissing),
      extraCreditPoints: Number(extraCreditPoints || 0),
      feedback: feedback || null,
      status,
      actorId: req.user.id,
      reason: reason || 'Manual gradebook entry',
      transaction: t
    });

    await t.commit();

    await recordAudit({
      req,
      action: 'GRADE_RECORDED_OR_REVISED',
      category: 'grade',
      entityType: 'Grade',
      entityId: grade.id,
      metadata: { classId, studentId, score, reason }
    });

    return res.status(200).json({
      success: true,
      message: 'Grade saved and logged in revision history.',
      data: { grade }
    });
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

async function submitFinalGradesForApproval(req, res, next) {
  try {
    const classId = Number(req.params.classId);
    const { classSection } = await verifyClassAccess(req.user, classId, { allowAdmin: false, allowInstructor: true });

    await classSection.update({
      finalGradesStatus: 'submitted_for_approval',
      finalGradesSubmittedAt: new Date()
    });

    await recordAudit({
      req,
      action: 'FINAL_GRADES_SUBMITTED_FOR_APPROVAL',
      category: 'grade',
      entityType: 'ClassSection',
      entityId: classId
    });

    return res.status(200).json({
      success: true,
      message: 'Final class grades submitted to Academic Administration for approval.',
      data: { classSection }
    });
  } catch (err) {
    return next(err);
  }
}

async function approveOrReturnFinalGrades(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const classId = Number(req.params.classId);
    const { decision = 'approved', remarks } = req.body;

    const classSection = await ClassSection.findByPk(classId, {
      include: [
        {
          model: CourseOffering,
          as: 'courseOffering',
          include: [{ model: Course, as: 'course', attributes: ['id', 'code', 'title'] }]
        }
      ],
      transaction: t
    });
    if (!classSection) throw new AppError('Class section not found.', 404);

    if (!['approved', 'published', 'returned'].includes(decision)) {
      throw new AppError('Decision must be approved, published, or returned.', 400);
    }

    // Guard: can only approve/return classes that are submitted_for_approval
    // (allow re-approval of already approved, but not draft/in_progress/active)
    if (decision !== 'returned' && !['submitted_for_approval', 'returned'].includes(classSection.finalGradesStatus)) {
      throw new AppError(
        `Cannot approve grades for "${classSection.sectionCode}" — current status is "${classSection.finalGradesStatus}". Grades must be submitted for approval first.`,
        409,
        'INVALID_GRADES_STATUS'
      );
    }

    await classSection.update({
      finalGradesStatus: decision,
      finalGradesApprovedBy: req.user.id,
      finalGradesApprovedAt: new Date()
    }, { transaction: t });

    if (decision === 'approved' || decision === 'published') {
      const gb = await calculateClassGradebook(classId);

      for (const s of gb.students) {
        // Write final grades back to class membership
        await ClassMembership.update({
          finalNumericGrade: s.standingPercentage,
          finalLetterGrade:  s.institutionalGrade,
          remarks:           remarks || s.remarks
        }, {
          where: { classId, studentId: s.studentId },
          transaction: t
        });

        // Promote individual Grade rows to approved_final
        await Grade.update(
          { status: 'approved_final' },
          { where: { classId, studentId: s.studentId, status: ['published', 'submitted_final'] }, transaction: t }
        );
      }
    }

    await t.commit();

    await recordAudit({
      req,
      action:     `FINAL_GRADES_${decision.toUpperCase()}`,
      category:   'grade',
      severity:   'info',
      entityType: 'ClassSection',
      entityId:   classId,
      metadata:   { decision, remarks }
    });

    // Notify all assigned instructors of the outcome
    const assignments = await InstructorAssignment.findAll({ where: { classId } });
    const courseCode = classSection.courseOffering?.course?.code || classSection.sectionCode;

    for (const ia of assignments) {
      const notifTitle = decision === 'returned'
        ? `Grades Returned for Revision: ${classSection.sectionCode}`
        : `Grades Approved: ${classSection.sectionCode}`;
      const notifMsg = decision === 'returned'
        ? `Final grades for ${courseCode} — ${classSection.sectionCode} have been returned. Reason: ${remarks || 'No remarks provided.'}`
        : `Final grades for ${courseCode} — ${classSection.sectionCode} have been approved and recorded.`;

      await createNotification({
        userId: ia.instructorId,
        type: 'grade',
        title: notifTitle,
        message: notifMsg,
        destinationUrl: '/instructor/grades'
      });
    }

    return res.status(200).json({
      success: true,
      message: `Class final grades marked as ${decision}.`,
      data: { classSection }
    });
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

// ============================================================================
// CERTIFICATES & VERIFICATION
// ============================================================================

async function listCertificates(req, res, next) {
  try {
    const where = {};
    if (req.user.primaryRole === 'student') {
      where.studentId = req.user.id;
    } else if (req.query.studentId) {
      where.studentId = Number(req.query.studentId);
    }

    const certificates = await Certificate.findAll({
      where,
      include: [
        { model: Course, as: 'course', attributes: ['id', 'code', 'title', 'category', 'level', 'creditUnits'] },
        { model: ClassSection, as: 'classSection', attributes: ['id', 'sectionCode'] },
        { model: User, as: 'student', attributes: ['id', 'firstName', 'lastName', 'email', 'studentNumber'] }
      ],
      order: [['issuedAt', 'DESC']]
    });

    return res.status(200).json({ success: true, data: { certificates } });
  } catch (err) {
    return next(err);
  }
}

async function verifyCertificate(req, res, next) {
  try {
    const { code } = req.params;
    const cert = await Certificate.findOne({
      where: { certificateCode: code.trim() },
      include: [
        { model: Course, as: 'course', attributes: ['code', 'title', 'creditUnits'] }
      ]
    });

    if (!cert) {
      return res.status(404).json({
        success: false,
        verified: false,
        message: 'No valid certificate found matching that verification code.'
      });
    }

    return res.status(200).json({
      success: true,
      verified: cert.status === 'active',
      data: { certificate: cert }
    });
  } catch (err) {
    return next(err);
  }
}

async function issueCertificateManually(req, res, next) {
  try {
    const { classId, studentId } = req.body;
    await verifyClassAccess(req.user, classId, { allowAdmin: true, allowInstructor: true });

    const classSection = await ClassSection.findByPk(Number(classId), {
      include: [{ model: CourseOffering, as: 'courseOffering', include: [{ model: Course, as: 'course' }] }]
    });
    const student = await User.findByPk(Number(studentId));
    if (!classSection || !student) throw new AppError('Class or student not found.', 404);

    const gb = await calculateClassGradebook(Number(classId), { studentIdFilter: student.id });
    const standing = gb.students[0]?.standingPercentage ?? 85;
    const passing = Number(classSection.courseOffering?.passingScore || 75);

    if (standing < passing) {
      throw new AppError(`Student standing (${standing}%) is below the required passing score (${passing}%).`, 400, 'BELOW_PASSING_SCORE');
    }

    const course = classSection.courseOffering.course;
    const certCode = `AIT-CERT-${new Date().getFullYear()}-${classId}${student.id}${Math.floor(100 + Math.random() * 900)}`;
    const verifyHash = crypto.createHash('sha256').update(`${certCode}:${student.email}:${course.id}`).digest('hex');

    const [cert] = await Certificate.findOrCreate({
      where: { classId: Number(classId), studentId: student.id },
      defaults: {
        certificateCode: certCode,
        verificationHash: verifyHash,
        studentId: student.id,
        courseId: course.id,
        classId: Number(classId),
        recipientName: `${student.firstName} ${student.lastName}`,
        courseTitle: course.title,
        courseCode: course.code,
        finalScore: standing,
        issuedBy: req.user.id,
        status: 'active'
      }
    });

    await createNotification({
      userId: student.id,
      type: 'certificate',
      title: `Certificate Issued: ${course.title}`,
      message: `Your completion certificate (${cert.certificateCode}) is ready for download.`,
      destinationUrl: '/student/certificates'
    });

    return res.status(201).json({
      success: true,
      message: 'Certificate issued successfully.',
      data: { certificate: cert }
    });
  } catch (err) {
    return next(err);
  }
}

// ============================================================================
// AUTHORIZED REPORTS & EXPORTS (CSV, EXCEL-COMPATIBLE, JSON)
// ============================================================================

function toCsvString(headers, rows) {
  const escapeCell = (val) => {
    const str = val === null || val === undefined ? '' : String(val);
    return `"${str.replace(/"/g, '""')}"`;
  };
  const headerLine = headers.map((h) => escapeCell(h.label)).join(',');
  const dataLines = rows.map((r) => headers.map((h) => escapeCell(r[h.key])).join(','));
  return [headerLine, ...dataLines].join('\n');
}

async function generateReport(req, res, next) {
  try {
    const {
      type       = 'enrollments',
      format     = 'json',
      classId,
      semesterId,
      limit      = 1000,
      offset     = 0
    } = req.query;

    const rowLimit  = Math.min(Number(limit)  || 1000, 5000); // safety cap at 5000
    const rowOffset = Number(offset) || 0;

    let reportTitle = 'Institutional Academic Report';
    let headers     = [];
    let rows        = [];
    let summary     = null; // optional summary stats for JSON responses

    // ── Users ─────────────────────────────────────────────────────────────
    if (type === 'users') {
      if (!req.user.roles.includes('super_admin') && !req.user.roles.includes('academic_admin')) {
        throw new AppError('Forbidden: Insufficient permissions for user report.', 403);
      }
      reportTitle = 'Platform Users & Role Directory';
      headers = [
        { key: 'id',         label: 'ID' },
        { key: 'fullName',   label: 'Full Name' },
        { key: 'email',      label: 'Email' },
        { key: 'identifier', label: 'ID Number' },
        { key: 'status',     label: 'Status' }
      ];
      const users = await User.findAll({
        order: [['id', 'ASC']],
        limit: rowLimit,
        offset: rowOffset
      });
      rows = users.map((u) => ({
        id:         u.id,
        fullName:   `${u.firstName} ${u.lastName}`,
        email:      u.email,
        identifier: u.studentNumber || u.employeeNumber || 'N/A',
        status:     u.status
      }));

    // ── Gradebook (requires classId) ──────────────────────────────────────
    } else if (type === 'gradebook' && classId) {
      const cs = await ClassSection.findByPk(Number(classId), {
        include: [{ model: CourseOffering, as: 'courseOffering', include: [
          { model: Course,   as: 'course',   attributes: ['id', 'code', 'title'] },
          { model: Semester, as: 'semester', attributes: ['id', 'name', 'code'] }
        ]}]
      });
      await verifyClassAccess(req.user, classId, { allowAdmin: true, allowInstructor: true });
      const semName  = cs?.courseOffering?.semester?.name  || '';
      const courseCode = cs?.courseOffering?.course?.code  || classId;
      reportTitle = `Gradebook — ${cs?.sectionCode || `Class #${classId}`}${semName ? ` · ${semName}` : ''}`;
      const gb = await calculateClassGradebook(Number(classId));
      headers = [
        { key: 'studentNumber',      label: 'Student Number' },
        { key: 'studentName',        label: 'Student Name' },
        { key: 'studentEmail',       label: 'Email' },
        { key: 'enrollmentStatus',   label: 'Enrollment Status' },
        { key: 'standingPercentage', label: 'Standing (%)' },
        { key: 'institutionalGrade', label: 'Equiv. Grade' },
        { key: 'letterGrade',        label: 'Letter' },
        { key: 'isPassing',          label: 'Passing?' },
        { key: 'remarks',            label: 'Remarks' }
      ];
      rows = gb.students.map((s) => ({
        ...s,
        isPassing: s.isPassing ? 'Yes' : (s.standingPercentage === null ? 'N/A' : 'No')
      }));
      const graded   = rows.filter((s) => s.standingPercentage !== null && s.standingPercentage !== undefined);
      const passing  = graded.filter((s) => s.isPassing === 'Yes').length;
      const avgScore = graded.length
        ? Number((graded.reduce((a, s) => a + Number(s.standingPercentage || 0), 0) / graded.length).toFixed(2))
        : null;
      summary = {
        totalStudents: rows.length,
        gradedStudents: graded.length,
        passingStudents: passing,
        failingStudents: graded.length - passing,
        averageStanding: avgScore,
        passingRate: graded.length > 0 ? Number(((passing / graded.length) * 100).toFixed(1)) : null,
        passingScore: gb.passingScore
      };

    // ── Submissions ────────────────────────────────────────────────────────
    } else if (type === 'submissions') {
      reportTitle = 'Assignment Submissions Report';
      const where = {};
      if (classId) where.classId = Number(classId);
      const subs = await Submission.findAll({
        where,
        include: [
          { model: User,       as: 'student',    attributes: ['firstName', 'lastName', 'email', 'studentNumber'] },
          { model: Assignment, as: 'assignment', attributes: ['title', 'maxScore', 'dueDate'] }
        ],
        order: [['submittedAt', 'DESC']],
        limit: rowLimit,
        offset: rowOffset
      });
      headers = [
        { key: 'studentNumber',   label: 'Student No.' },
        { key: 'studentName',     label: 'Student' },
        { key: 'assignmentTitle', label: 'Assignment' },
        { key: 'status',          label: 'Status' },
        { key: 'score',           label: 'Score' },
        { key: 'maxScore',        label: 'Max Score' },
        { key: 'submittedAt',     label: 'Submitted At' }
      ];
      rows = subs.map((s) => ({
        studentNumber:   s.student?.studentNumber || `STU-${s.studentId}`,
        studentName:     s.student ? `${s.student.firstName} ${s.student.lastName}` : `Student #${s.studentId}`,
        assignmentTitle: s.assignment?.title || '',
        status:          s.status,
        score:           s.score ?? 'Pending',
        maxScore:        s.assignment?.maxScore ?? 100,
        submittedAt:     s.submittedAt ? new Date(s.submittedAt).toLocaleDateString() : 'N/A'
      }));

    // ── Departments ────────────────────────────────────────────────────────
    } else if (type === 'departments') {
      reportTitle = 'Department & Course Summary Report';
      const depts = await Department.findAll({
        include: [
          { model: Course,  as: 'courses',  attributes: ['id'] },
          { model: Program, as: 'programs', attributes: ['id', 'code', 'name'] }
        ],
        order: [['code', 'ASC']]
      });
      headers = [
        { key: 'code',         label: 'Dept Code' },
        { key: 'name',         label: 'Department Name' },
        { key: 'headName',     label: 'Dept Head' },
        { key: 'programCount', label: 'Programs' },
        { key: 'courseCount',  label: 'Courses' },
        { key: 'status',       label: 'Status' }
      ];
      rows = depts.map((d) => ({
        code:         d.code,
        name:         d.name,
        headName:     d.headName || 'TBA',
        programCount: (d.programs || []).length,
        courseCount:  (d.courses  || []).length,
        status:       d.status
      }));

    // ── Certificates ───────────────────────────────────────────────────────
    } else if (type === 'certificates') {
      reportTitle = 'Course Completion Certificates Report';
      const certWhere = {};
      if (classId) certWhere.classId = Number(classId);
      const certs = await Certificate.findAll({
        where: certWhere,
        include: [
          { model: User,         as: 'student',      attributes: ['firstName', 'lastName', 'email', 'studentNumber'] },
          { model: ClassSection, as: 'classSection', attributes: ['id', 'sectionCode'] }
        ],
        order: [['issuedAt', 'DESC']],
        limit: rowLimit,
        offset: rowOffset
      });
      headers = [
        { key: 'certificateCode', label: 'Certificate Code' },
        { key: 'studentNumber',   label: 'Student No.' },
        { key: 'recipientName',   label: 'Recipient Name' },
        { key: 'email',           label: 'Email' },
        { key: 'courseCode',      label: 'Course Code' },
        { key: 'courseTitle',     label: 'Course Title' },
        { key: 'finalScore',      label: 'Final Score' },
        { key: 'sectionCode',     label: 'Section' },
        { key: 'issuedAt',        label: 'Issued At' },
        { key: 'status',          label: 'Status' }
      ];
      rows = certs.map((c) => ({
        certificateCode: c.certificateCode,
        studentNumber:   c.student?.studentNumber || `STU-${c.studentId}`,
        recipientName:   c.recipientName,
        email:           c.student?.email || '',
        courseCode:      c.courseCode,
        courseTitle:     c.courseTitle,
        finalScore:      c.finalScore,
        sectionCode:     c.classSection?.sectionCode || '',
        issuedAt:        new Date(c.issuedAt).toLocaleDateString(),
        status:          c.status
      }));

    // ── Class Summary (all classes, optionally filtered by semester) ────────
    } else if (type === 'classSummary') {
      reportTitle = 'Class Section Summary Report';
      const classWhere = {};
      let semesterName = '';

      if (semesterId) {
        // Find all course offerings for this semester, then get their class IDs
        const offerings = await CourseOffering.findAll({
          where: { semesterId: Number(semesterId) },
          attributes: ['id']
        });
        const offeringIds = offerings.map((o) => o.id);
        if (offeringIds.length > 0) {
          classWhere.courseOfferingId = offeringIds;
        }
        const sem = await Semester.findByPk(Number(semesterId), { attributes: ['name'] });
        if (sem) semesterName = sem.name;
      }

      const classes = await ClassSection.findAll({
        where: classWhere,
        include: [
          {
            model: CourseOffering,
            as: 'courseOffering',
            include: [
              { model: Course,   as: 'course',   attributes: ['id', 'code', 'title'] },
              { model: Semester, as: 'semester', attributes: ['id', 'name'] }
            ]
          },
          { model: InstructorAssignment, as: 'instructorAssignments',
            include: [{ model: User, as: 'instructor', attributes: ['id', 'firstName', 'lastName'] }]
          },
          { model: ClassMembership, as: 'memberships', attributes: ['id', 'status'] }
        ],
        order: [['id', 'ASC']],
        limit: rowLimit,
        offset: rowOffset
      });

      if (semesterName) reportTitle = `Class Summary — ${semesterName}`;

      headers = [
        { key: 'sectionCode',     label: 'Section Code' },
        { key: 'name',            label: 'Section Name' },
        { key: 'courseCode',      label: 'Course Code' },
        { key: 'courseTitle',     label: 'Course Title' },
        { key: 'semesterName',    label: 'Semester' },
        { key: 'instructor',      label: 'Instructor' },
        { key: 'enrolledCount',   label: 'Enrolled' },
        { key: 'capacity',        label: 'Capacity' },
        { key: 'finalGradesStatus', label: 'Grades Status' },
        { key: 'status',          label: 'Section Status' }
      ];
      rows = classes.map((cls) => {
        const primaryInstructor = cls.instructorAssignments?.find((ia) => ia.isPrimary)
          || cls.instructorAssignments?.[0];
        const enrolled = (cls.memberships || []).filter((m) => m.status === 'enrolled').length;
        return {
          sectionCode:      cls.sectionCode,
          name:             cls.name,
          courseCode:       cls.courseOffering?.course?.code      || '',
          courseTitle:      cls.courseOffering?.course?.title     || '',
          semesterName:     cls.courseOffering?.semester?.name    || '',
          instructor:       primaryInstructor?.instructor
            ? `${primaryInstructor.instructor.firstName} ${primaryInstructor.instructor.lastName}`
            : 'Unassigned',
          enrolledCount:    enrolled,
          capacity:         cls.capacity,
          finalGradesStatus: cls.finalGradesStatus,
          status:           cls.status
        };
      });

    // ── Default: Enrollments ───────────────────────────────────────────────
    } else {
      reportTitle = 'Student Enrollment & Roster Report';
      const where = {};
      if (classId)    where.classId = Number(classId);

      // Optional semester filter — join through ClassSection → CourseOffering
      let semesterClause = {};
      if (semesterId && !classId) {
        const offerings = await CourseOffering.findAll({
          where: { semesterId: Number(semesterId) },
          attributes: ['id']
        });
        const offeringIds = offerings.map((o) => o.id);
        if (offeringIds.length) {
          const classSections = await ClassSection.findAll({
            where: { courseOfferingId: offeringIds },
            attributes: ['id']
          });
          const classIds = classSections.map((c) => c.id);
          if (classIds.length) where.classId = classIds;
        }
      }

      const enrollments = await ClassMembership.findAll({
        where,
        include: [
          { model: User, as: 'student', attributes: ['firstName', 'lastName', 'email', 'studentNumber'] },
          {
            model: ClassSection,
            as: 'classSection',
            include: [{
              model: CourseOffering,
              as: 'courseOffering',
              include: [
                { model: Course,   as: 'course',   attributes: ['id', 'code', 'title'] },
                { model: Semester, as: 'semester', attributes: ['id', 'name'] }
              ]
            }]
          }
        ],
        order: [['id', 'DESC']],
        limit: rowLimit,
        offset: rowOffset
      });

      headers = [
        { key: 'studentNumber', label: 'Student Number' },
        { key: 'studentName',   label: 'Student Name' },
        { key: 'email',         label: 'Email' },
        { key: 'sectionCode',   label: 'Class Section' },
        { key: 'courseCode',    label: 'Course Code' },
        { key: 'courseTitle',   label: 'Course Title' },
        { key: 'semesterName',  label: 'Semester' },
        { key: 'status',        label: 'Enrollment Status' }
      ];
      rows = enrollments.map((e) => ({
        studentNumber: e.student?.studentNumber || `STU-${e.studentId}`,
        studentName:   e.student ? `${e.student.firstName} ${e.student.lastName}` : '',
        email:         e.student?.email || '',
        sectionCode:   e.classSection?.sectionCode || '',
        courseCode:    e.classSection?.courseOffering?.course?.code  || '',
        courseTitle:   e.classSection?.courseOffering?.course?.title || '',
        semesterName:  e.classSection?.courseOffering?.semester?.name || '',
        status:        e.status
      }));
    }

    await recordAudit({
      req,
      action:   'REPORT_EXPORTED',
      category: 'academic',
      metadata: { type, format, classId, semesterId, rowCount: rows.length }
    });

    // ── CSV / Excel download ───────────────────────────────────────────────
    if (format === 'csv' || format === 'excel') {
      const csv  = toCsvString(headers, rows);
      const ext  = format === 'excel' ? 'xls' : 'csv';
      const mime = format === 'excel' ? 'application/vnd.ms-excel' : 'text/csv';
      res.setHeader('Content-Type', `${mime}; charset=utf-8`);
      res.setHeader('Content-Disposition', `attachment; filename="lms-report-${type}-${Date.now()}.${ext}"`);
      return res.status(200).send(csv);
    }

    return res.status(200).json({
      success: true,
      data: {
        reportTitle,
        generatedAt: new Date().toISOString(),
        totalRows: rows.length,
        summary,
        headers,
        rows
      }
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getClassGradebookView,
  getStudentPersonalGrades,
  updateClassGradeCategories,
  recordOrUpdateManualGrade,
  submitFinalGradesForApproval,
  approveOrReturnFinalGrades,
  listCertificates,
  verifyCertificate,
  issueCertificateManually,
  generateReport
};

