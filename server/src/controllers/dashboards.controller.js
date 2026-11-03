const { Op, fn, col, literal } = require('sequelize');
const {
  User,
  Role,
  Department,
  Program,
  AcademicYear,
  Semester,
  Course,
  CourseOffering,
  ClassSection,
  InstructorAssignment,
  TeachingAssistantAssignment,
  ClassMembership,
  Module,
  Lesson,
  LessonProgress,
  CourseProgress,
  Assignment,
  Submission,
  Assessment,
  AssessmentAttempt,
  Grade,
  Announcement,
  DiscussionThread,
  Certificate,
  AuditLog,
  SystemSetting
} = require('../models');

async function getDashboardSummary(req, res, next) {
  try {
    const role = req.user.primaryRole;

    if (role === 'super_admin') {
      const [
        totalUsers,
        activeUsers,
        suspendedUsers,
        totalCourses,
        totalOfferings,
        totalClasses,
        totalEnrollments,
        rolesWithUsers,
        recentAuditLogs,
        securityEvents,
        systemSettings
      ] = await Promise.all([
        User.count(),
        User.count({ where: { status: 'active' } }),
        User.count({ where: { status: 'suspended' } }),
        Course.count(),
        CourseOffering.count(),
        ClassSection.count(),
        ClassMembership.count({ where: { status: ['enrolled', 'completed'] } }),
        Role.findAll({
          include: [{ model: User, as: 'users', attributes: ['id'], through: { attributes: [] } }]
        }),
        AuditLog.findAll({ order: [['createdAt', 'DESC']], limit: 12 }),
        AuditLog.findAll({ where: { category: ['security', 'auth'] }, order: [['createdAt', 'DESC']], limit: 10 }),
        SystemSetting.findAll()
      ]);

      const roleDistribution = rolesWithUsers.map((r) => ({
        role: r.name,
        slug: r.slug,
        count: (r.users || []).length
      }));

      return res.status(200).json({
        success: true,
        data: {
          role: 'super_admin',
          metrics: {
            totalUsers,
            activeUsers,
            suspendedUsers,
            totalCourses,
            totalOfferings,
            totalClasses,
            totalEnrollments,
            systemHealth: 'Operational (99.98% Uptime)'
          },
          roleDistribution,
          recentAuditLogs,
          securityEvents,
          systemSettings
        }
      });
    }

    if (role === 'academic_admin') {
      // ── 1. Resolve the active semester (isCurrent=true) ──────────────────
      const [allSemesters, allAcademicYears] = await Promise.all([
        Semester.findAll({ order: [['startDate', 'DESC']] }),
        AcademicYear.findAll({ order: [['startDate', 'DESC']] })
      ]);

      const activeSemester = allSemesters.find((s) => s.isCurrent) || allSemesters[0] || null;
      const activeYear     = allAcademicYears.find((y) => y.isCurrent) || allAcademicYears[0] || null;

      // ── 2. Scope class IDs to the active semester (if one exists) ─────────
      let currentSemesterClassIds = null;
      let currentSemesterOfferings = [];
      if (activeSemester) {
        currentSemesterOfferings = await CourseOffering.findAll({
          where: { semesterId: activeSemester.id },
          attributes: ['id']
        });
        const offeringIds = currentSemesterOfferings.map((o) => o.id);
        if (offeringIds.length) {
          const currentClasses = await ClassSection.findAll({
            where: { courseOfferingId: offeringIds },
            attributes: ['id']
          });
          currentSemesterClassIds = currentClasses.map((c) => c.id);
        } else {
          currentSemesterClassIds = [];
        }
      }

      const enrollmentWhere = currentSemesterClassIds !== null
        ? { classId: currentSemesterClassIds, status: ['enrolled', 'completed'] }
        : { status: ['enrolled', 'completed'] };

      const classWhere = currentSemesterClassIds !== null
        ? { id: currentSemesterClassIds }
        : {};

      // ── 3. Run all queries in parallel ────────────────────────────────────
      const [
        departments,
        programs,
        courses,
        totalCourses,
        classes,
        totalEnrollments,
        enrollmentByProgramRaw,
        pendingGradeApprovals,
        recentAnnouncements,
        unassignedClassCount
      ] = await Promise.all([
        // Departments with program count + course count
        Department.findAll({
          include: [
            { model: Course,   as: 'courses',  attributes: ['id'] },
            { model: Program,  as: 'programs', attributes: ['id'] }
          ]
        }),

        // Programs with department info
        Program.findAll({
          include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'code'] }]
        }),

        // Full catalog courses (used for the chart labels)
        Course.findAll({ attributes: ['id', 'code', 'title', 'publicationStatus'] }),

        // Total published courses count
        Course.count({ where: { publicationStatus: 'published' } }),

        // Current-semester class sections with enrollment counts + instructor info
        ClassSection.findAll({
          where: classWhere,
          include: [
            {
              model: CourseOffering,
              as: 'courseOffering',
              include: [
                { model: Course,   as: 'course',   attributes: ['id', 'code', 'title'] },
                { model: Semester, as: 'semester',  attributes: ['id', 'name', 'code'] }
              ]
            },
            { model: ClassMembership, as: 'memberships', attributes: ['id', 'status'] },
            {
              model: InstructorAssignment,
              as: 'instructorAssignments',
              attributes: ['id', 'instructorId', 'isPrimary'],
              include: [{ model: User, as: 'instructor', attributes: ['id', 'firstName', 'lastName', 'email'] }]
            }
          ]
        }),

        // Enrollment count scoped to current semester
        ClassMembership.count({ where: enrollmentWhere }),

        // Enrollment by program via DB aggregation instead of JS filter
        ClassMembership.findAll({
          where: enrollmentWhere,
          attributes: [
            [fn('COUNT', col('ClassMembership.id')), 'enrollmentCount']
          ],
          include: [{
            model: User,
            as: 'student',
            attributes: ['programId'],
            required: true
          }],
          group: ['student.program_id'],
          raw: true
        }),

        // Classes with grades submitted for approval (all semesters — admin workflow)
        ClassSection.findAll({
          where: { finalGradesStatus: 'submitted_for_approval' },
          include: [
            {
              model: CourseOffering,
              as: 'courseOffering',
              include: [
                { model: Course, as: 'course', attributes: ['id', 'code', 'title'] },
                { model: Semester, as: 'semester', attributes: ['id', 'name'] }
              ]
            }
          ]
        }),

        // Recent institution/dept/course scoped announcements
        Announcement.findAll({
          where: { scope: ['institution', 'department', 'course'] },
          include: [{ model: User, as: 'author', attributes: ['id', 'firstName', 'lastName'] }],
          order: [['createdAt', 'DESC']],
          limit: 6
        }),

        // Classes in current semester that have no instructor assigned
        classWhere.id
          ? ClassSection.count({
              where: classWhere,
              include: [{
                model: InstructorAssignment,
                as: 'instructorAssignments',
                required: false,
                attributes: ['id']
              }],
              having: literal('COUNT(instructorAssignments.id) = 0'),
              group: ['ClassSection.id']
            }).then((rows) => (Array.isArray(rows) ? rows.length : rows))
          : Promise.resolve(0)
      ]);

      // ── 4. Build enrollmentByProgram from DB aggregation results ──────────
      const programMap = new Map(programs.map((p) => [p.id, p]));
      const enrollmentByProgram = programs.map((prog) => {
        const row = enrollmentByProgramRaw.find((r) => Number(r['student.programId'] ?? r['student.program_id']) === prog.id);
        return {
          programCode: prog.code,
          programName: prog.name,
          departmentCode: prog.department?.code,
          enrollments: row ? Number(row.enrollmentCount) : 0
        };
      }).filter((p) => p.enrollments > 0 || programs.length <= 10); // show all if few programs

      // ── 5. Department summary with program + course counts ─────────────────
      const departmentSummary = departments.map((dept) => ({
        id:           dept.id,
        code:         dept.code,
        name:         dept.name,
        headName:     dept.headName,
        status:       dept.status,
        courseCount:  (dept.courses  || []).length,
        programCount: (dept.programs || []).length
      }));

      // ── 6. Classes-at-a-glance (current semester) ─────────────────────────
      const classesAtAGlance = classes.map((cls) => ({
        id:               cls.id,
        sectionCode:      cls.sectionCode,
        name:             cls.name,
        courseCode:       cls.courseOffering?.course?.code,
        courseTitle:      cls.courseOffering?.course?.title,
        semesterName:     cls.courseOffering?.semester?.name,
        enrolledCount:    (cls.memberships || []).filter((m) => m.status === 'enrolled').length,
        capacity:         cls.capacity,
        finalGradesStatus: cls.finalGradesStatus,
        hasInstructor:    (cls.instructorAssignments || []).length > 0,
        instructorName:   cls.instructorAssignments?.[0]?.instructor
          ? `${cls.instructorAssignments[0].instructor.firstName} ${cls.instructorAssignments[0].instructor.lastName}`
          : null
      }));

      return res.status(200).json({
        success: true,
        data: {
          role: 'academic_admin',
          metrics: {
            totalDepartments:          departments.length,
            totalPrograms:             programs.length,
            totalCourses:              totalCourses,
            totalClasses:              classes.length,
            totalEnrollments,
            pendingGradeApprovalsCount: pendingGradeApprovals.length,
            unassignedClassesCount:    unassignedClassCount,
            activeSemester:            activeSemester?.name    || null,
            activeAcademicYear:        activeYear?.name        || null,
            activeSemesterId:          activeSemester?.id      || null,
            activeAcademicYearId:      activeYear?.id          || null
          },
          enrollmentByProgram,
          departmentSummary,
          pendingGradeApprovals,
          classesAtAGlance,
          recentAnnouncements,
          academicYears: allAcademicYears,
          semesters:     allSemesters
        }
      });
    }

    if (role === 'instructor') {
      const instructorAssignments = await InstructorAssignment.findAll({
        where: { instructorId: req.user.id },
        include: [
          {
            model: ClassSection,
            as: 'classSection',
            include: [
              {
                model: CourseOffering,
                as: 'courseOffering',
                include: [{ model: Course, as: 'course' }, { model: Semester, as: 'semester' }]
              },
              {
                model: ClassMembership,
                as: 'memberships',
                include: [{ model: User, as: 'student', attributes: ['id', 'firstName', 'lastName', 'email', 'studentNumber'] }]
              }
            ]
          }
        ]
      });

      const classIds = instructorAssignments.map((a) => a.classId);
      const classes = instructorAssignments.map((a) => a.classSection).filter(Boolean);
      const uniqueCourseMap = new Map();
      for (const cls of classes) {
        const c = cls.courseOffering?.course;
        if (c) uniqueCourseMap.set(c.id, c);
      }

      const [
        submissions,
        assessments,
        attempts,
        courseProgressRecords,
        discussions,
        assignments
      ] = await Promise.all([
        classIds.length ? Submission.findAll({
          where: { classId: classIds },
          include: [
            { model: User, as: 'student', attributes: ['id', 'firstName', 'lastName', 'email'] },
            { model: Assignment, as: 'assignment', attributes: ['id', 'title', 'dueDate', 'maxScore'] }
          ],
          order: [['submittedAt', 'DESC']]
        }) : [],
        classIds.length ? Assessment.findAll({
          where: { classId: classIds },
          order: [['closeDate', 'ASC']]
        }) : [],
        classIds.length ? AssessmentAttempt.findAll({
          where: { classId: classIds }
        }) : [],
        classIds.length ? CourseProgress.findAll({
          where: { classId: classIds },
          include: [{ model: User, as: 'student', attributes: ['id', 'firstName', 'lastName', 'email', 'studentNumber'] }]
        }) : [],
        classIds.length ? DiscussionThread.findAll({
          where: { classId: classIds },
          include: [{ model: User, as: 'author', attributes: ['id', 'firstName', 'lastName'] }],
          order: [['createdAt', 'DESC']],
          limit: 8
        }) : [],
        classIds.length ? Assignment.findAll({ where: { classId: classIds } }) : []
      ]);

      const pendingSubmissions = submissions.filter((s) => ['submitted', 'late', 'under_review'].includes(s.status));
      const pendingManualAttempts = attempts.filter((a) => a.RequiresManualGrading && a.status === 'submitted');
      const totalEnrolledStudents = classes.reduce((acc, c) => acc + (c.memberships?.length || 0), 0);

      const overdueAssignments = assignments.filter((a) => new Date(a.dueDate) < new Date());

      // Identify students who may need additional support (low progress or flagged/missing items)
      const studentsNeedingSupport = courseProgressRecords
        .filter((cp) => Number(cp.progressPercentage) < 50)
        .map((cp) => ({
          studentId: cp.studentId,
          studentName: cp.student ? `${cp.student.firstName} ${cp.student.lastName}` : `Student #${cp.studentId}`,
          studentEmail: cp.student?.email,
          classId: cp.classId,
          progressPercentage: Number(cp.progressPercentage),
          completedLessonsCount: cp.completedLessonsCount,
          totalLessonsCount: cp.totalLessonsCount,
          indicatorNote: 'Progress below 50% milestone — recommended for instructor check-in'
        }));

      const classCompletionStats = classes.map((cls) => {
        const clsProgress = courseProgressRecords.filter((cp) => cp.classId === cls.id);
        const avgProgress = clsProgress.length > 0
          ? Number((clsProgress.reduce((s, r) => s + Number(r.progressPercentage || 0), 0) / clsProgress.length).toFixed(1))
          : 0;
        return {
          classId: cls.id,
          sectionCode: cls.sectionCode,
          courseTitle: cls.courseOffering?.course?.title || cls.name,
          enrolledCount: cls.memberships?.length || 0,
          averageProgress: avgProgress
        };
      });

      return res.status(200).json({
        success: true,
        data: {
          role: 'instructor',
          metrics: {
            assignedCoursesCount: uniqueCourseMap.size,
            activeClassesCount: classes.length,
            enrolledStudentsCount: totalEnrolledStudents,
            pendingSubmissionsCount: pendingSubmissions.length,
            pendingGradingTasksCount: pendingSubmissions.length + pendingManualAttempts.length,
            upcomingAssessmentsCount: assessments.length,
            overdueActivitiesCount: overdueAssignments.length
          },
          assignedCourses: Array.from(uniqueCourseMap.values()),
          activeClasses: classes,
          pendingSubmissions,
          upcomingAssessments: assessments,
          recentQuestions: discussions,
          classCompletionStats,
          studentsNeedingSupport
        }
      });
    }

    if (role === 'teaching_assistant') {
      const taAssignments = await TeachingAssistantAssignment.findAll({
        where: { taUserId: req.user.id },
        include: [
          {
            model: ClassSection,
            as: 'classSection',
            include: [
              {
                model: CourseOffering,
                as: 'courseOffering',
                include: [{ model: Course, as: 'course' }]
              },
              { model: ClassMembership, as: 'memberships' }
            ]
          }
        ]
      });

      const classIds = taAssignments.map((t) => t.classId);
      const [submissions, discussions] = await Promise.all([
        classIds.length ? Submission.findAll({
          where: { classId: classIds },
          include: [
            { model: User, as: 'student', attributes: ['id', 'firstName', 'lastName', 'email'] },
            { model: Assignment, as: 'assignment', attributes: ['id', 'title', 'dueDate', 'maxScore'] }
          ],
          order: [['submittedAt', 'DESC']]
        }) : [],
        classIds.length ? DiscussionThread.findAll({
          where: { classId: classIds },
          include: [{ model: User, as: 'author', attributes: ['id', 'firstName', 'lastName'] }],
          order: [['createdAt', 'DESC']]
        }) : []
      ]);

      return res.status(200).json({
        success: true,
        data: {
          role: 'teaching_assistant',
          metrics: {
            assignedClassesCount: taAssignments.length,
            totalRosterStudents: taAssignments.reduce((acc, a) => acc + (a.classSection?.memberships?.length || 0), 0),
            submissionsToMonitor: submissions.filter((s) => ['submitted', 'late', 'under_review'].includes(s.status)).length,
            flaggedSubmissionsCount: submissions.filter((s) => s.flaggedForInstructorReview).length,
            openDiscussionsCount: discussions.filter((d) => !d.isResolved).length
          },
          taAssignments,
          submissions,
          discussions
        }
      });
    }

    // Default: Student dashboard
    const memberships = await ClassMembership.findAll({
      where: { studentId: req.user.id, status: ['enrolled', 'completed'] },
      include: [
        {
          model: ClassSection,
          as: 'classSection',
          include: [
            {
              model: CourseOffering,
              as: 'courseOffering',
              include: [
                {
                  model: Course,
                  as: 'course',
                  include: [{ model: Module, as: 'modules', include: [{ model: Lesson, as: 'lessons' }] }]
                },
                { model: Semester, as: 'semester' }
              ]
            }
          ]
        }
      ]
    });

    const classIds = memberships.map((m) => m.classId);

    const [
      courseProgressList,
      lessonProgressList,
      assignments,
      submissions,
      assessments,
      attempts,
      grades,
      announcements,
      certificates
    ] = await Promise.all([
      classIds.length ? CourseProgress.findAll({ where: { classId: classIds, studentId: req.user.id } }) : [],
      classIds.length ? LessonProgress.findAll({
        where: { classId: classIds, studentId: req.user.id },
        include: [{ model: Lesson, as: 'lesson', attributes: ['id', 'title', 'moduleId', 'courseId'] }],
        order: [['lastAccessedAt', 'DESC']],
        limit: 6
      }) : [],
      classIds.length ? Assignment.findAll({
        where: { classId: classIds, publicationStatus: 'published' },
        order: [['dueDate', 'ASC']]
      }) : [],
      classIds.length ? Submission.findAll({
        where: { classId: classIds, studentId: req.user.id }
      }) : [],
      classIds.length ? Assessment.findAll({
        where: { classId: classIds, publicationStatus: 'published' },
        order: [['closeDate', 'ASC']]
      }) : [],
      classIds.length ? AssessmentAttempt.findAll({
        where: { classId: classIds, studentId: req.user.id }
      }) : [],
      classIds.length ? Grade.findAll({
        where: { classId: classIds, studentId: req.user.id, status: ['published', 'submitted_final', 'approved_final'] },
        order: [['publishedAt', 'DESC']],
        limit: 8
      }) : [],
      Announcement.findAll({
        where: classIds.length ? { classId: [...classIds, null] } : {},
        order: [['createdAt', 'DESC']],
        limit: 6
      }),
      Certificate.findAll({ where: { studentId: req.user.id } })
    ]);

    const submittedAssignmentIds = new Set(
      submissions.filter((s) => ['submitted', 'late', 'under_review', 'graded'].includes(s.status)).map((s) => s.assignmentId)
    );
    const pendingAssignments = assignments.filter((a) => !submittedAssignmentIds.has(a.id));

    const completedAssessmentIds = new Set(
      attempts.filter((a) => ['submitted', 'graded'].includes(a.status)).map((a) => a.assessmentId)
    );
    const upcomingExams = assessments.filter((a) => !completedAssessmentIds.has(a.id));

    const enrolledCourses = memberships.map((m) => {
      const cls = m.classSection;
      const course = cls?.courseOffering?.course;
      const cp = courseProgressList.find((p) => p.classId === m.classId);
      return {
        membershipId: m.id,
        classId: m.classId,
        sectionCode: cls?.sectionCode,
        schedule: cls?.schedule,
        room: cls?.room,
        courseId: course?.id,
        courseCode: course?.code,
        courseTitle: course?.title,
        category: course?.category,
        level: course?.level,
        progressPercentage: Number(cp?.progressPercentage || 0),
        completedLessonsCount: cp?.completedLessonsCount || 0,
        totalLessonsCount: cp?.totalLessonsCount || 0,
        lastLessonId: cp?.lastLessonId || null
      };
    });

    const overallProgress = enrolledCourses.length > 0
      ? Number((enrolledCourses.reduce((acc, c) => acc + c.progressPercentage, 0) / enrolledCourses.length).toFixed(1))
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        role: 'student',
        metrics: {
          enrolledCoursesCount: enrolledCourses.length,
          overallCourseProgress: overallProgress,
          pendingAssignmentsCount: pendingAssignments.length,
          upcomingExamsCount: upcomingExams.length,
          recentGradesCount: grades.length,
          earnedCertificatesCount: certificates.length
        },
        enrolledCourses,
        pendingAssignments,
        upcomingExams,
        recentlyAccessedLessons: lessonProgressList,
        recentPublishedGrades: grades,
        unreadAnnouncements: announcements,
        earnedCertificates: certificates
      }
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getDashboardSummary };

