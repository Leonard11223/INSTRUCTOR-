const argon2 = require('argon2');
const {
  sequelize,
  Institution,
  Department,
  Program,
  AcademicYear,
  Semester,
  Course,
  CourseOffering,
  ClassSection,
  StudentPlacement,
  InstructorAssignment,
  TeachingAssistantAssignment,
  ClassMembership,
  GradeCategory,
  Module,
  Lesson,
  LearningResource,
  CourseProgress,
  User,
  Role,
  UserRole
} = require('../models');
const { AppError } = require('../middleware/error.middleware');
const { recordAudit } = require('../utils/auditLogger');
const { createNotification } = require('../utils/notifyUser');
const { recalculateStudentCourseProgress } = require('../services/progress.service');
const {
  departmentSchema,
  programSchema,
  updateDepartmentSchema,
  updateProgramSchema,
  updateAcademicYearSchema,
  updateSemesterSchema,
  academicYearSchema,
  semesterSchema,
  courseSchema,
  courseOfferingSchema,
  updateCourseSchema,
  updateCourseOfferingSchema,
  classSectionSchema,
  updateClassSectionSchema,
  studentPlacementSchema,
  classEligibilitySchema
} = require('../validators/schemas');

function isPlacementEligibleForSection(placement, classSection) {
  if (!placement) return false;
  return (!classSection.eligibleProgramId || classSection.eligibleProgramId === placement.programId) &&
    (!classSection.eligibleYearLevel || classSection.eligibleYearLevel === placement.yearLevel) &&
    (!classSection.eligibleCohortSection ||
      classSection.eligibleCohortSection.toLowerCase() === placement.cohortSection.toLowerCase());
}

// Institutions
async function getInstitution(req, res, next) {
  try {
    const institution = await Institution.findOne();
    return res.status(200).json({ success: true, data: { institution } });
  } catch (err) {
    return next(err);
  }
}

async function updateInstitution(req, res, next) {
  try {
    const institution = await Institution.findOne();
    if (!institution) throw new AppError('Institution record not found.', 404);
    await institution.update(req.body);
    await recordAudit({
      req,
      action: 'INSTITUTION_UPDATED',
      category: 'academic',
      entityType: 'Institution',
      entityId: institution.id
    });
    return res.status(200).json({ success: true, message: 'Institution settings updated.', data: { institution } });
  } catch (err) {
    return next(err);
  }
}

// Departments
async function listDepartments(req, res, next) {
  try {
    const departments = await Department.findAll({
      include: [
        { model: Program, as: 'programs' },
        { model: Course, as: 'courses', attributes: ['id', 'code', 'title'] }
      ],
      order: [['code', 'ASC']]
    });
    return res.status(200).json({ success: true, data: { departments } });
  } catch (err) {
    return next(err);
  }
}

async function createDepartment(req, res, next) {
  try {
    const payload = departmentSchema.parse(req.body);
    const inst = await Institution.findOne();
    const department = await Department.create({
      institutionId: inst?.id || 1,
      ...payload
    });
    await recordAudit({
      req,
      action: 'DEPARTMENT_CREATED',
      category: 'academic',
      entityType: 'Department',
      entityId: department.id,
      metadata: payload
    });
    return res.status(201).json({ success: true, message: 'Department created.', data: { department } });
  } catch (err) {
    return next(err);
  }
}

async function updateDepartment(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) throw new AppError('Invalid department ID.', 400);

    const department = await Department.findByPk(id);
    if (!department) throw new AppError('Department not found.', 404, 'DEPARTMENT_NOT_FOUND');

    const payload = updateDepartmentSchema.parse(req.body);
    await department.update(payload);

    await recordAudit({
      req,
      action:     'DEPARTMENT_UPDATED',
      category:   'academic',
      entityType: 'Department',
      entityId:   department.id,
      metadata:   { updatedFields: Object.keys(payload) }
    });

    return res.status(200).json({ success: true, message: 'Department updated.', data: { department } });
  } catch (err) {
    return next(err);
  }
}

async function deleteDepartment(req, res, next) {
  try {
    const department = await Department.findByPk(req.params.id);
    if (!department) throw new AppError('Department not found.', 404, 'DEPARTMENT_NOT_FOUND');

    const [coursesCount, programsCount] = await Promise.all([
      Course.count({ where: { departmentId: department.id } }),
      Program.count({ where: { departmentId: department.id } })
    ]);

    if (coursesCount > 0 || programsCount > 0) {
      throw new AppError(
        `Cannot delete department "${department.code}" because it is referenced by ${coursesCount} course(s) and ${programsCount} program(s). Archive or deactivate it instead.`,
        409,
        'REFERENCED_RECORD_PROTECTED'
      );
    }

    await department.destroy();
    await recordAudit({
      req,
      action: 'DEPARTMENT_DELETED',
      category: 'academic',
      entityType: 'Department',
      entityId: department.id
    });

    return res.status(200).json({
      success: true,
      message: 'Department deleted successfully.'
    });
  } catch (err) {
    return next(err);
  }
}

async function getPublicCatalog(req, res, next) {
  try {
    const courses = await Course.findAll({
      where: { publicationStatus: 'published' },
      include: [
        { model: Department, as: 'department', attributes: ['id', 'code', 'name'] },
        { model: Program, as: 'program', attributes: ['id', 'code', 'name'] }
      ],
      order: [['code', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      data: { courses }
    });
  } catch (err) {
    return next(err);
  }
}

// Programs
async function listPrograms(req, res, next) {
  try {
    const programs = await Program.findAll({
      include: [{ model: Department, as: 'department' }],
      order: [['code', 'ASC']]
    });
    return res.status(200).json({ success: true, data: { programs } });
  } catch (err) {
    return next(err);
  }
}

async function createProgram(req, res, next) {
  try {
    const payload = programSchema.parse(req.body);
    const program = await Program.create(payload);
    await recordAudit({
      req,
      action: 'PROGRAM_CREATED',
      category: 'academic',
      entityType: 'Program',
      entityId: program.id,
      metadata: payload
    });
    return res.status(201).json({ success: true, message: 'Academic program created.', data: { program } });
  } catch (err) {
    return next(err);
  }
}

async function updateProgram(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) throw new AppError('Invalid program ID.', 400);

    const program = await Program.findByPk(id);
    if (!program) throw new AppError('Program not found.', 404, 'PROGRAM_NOT_FOUND');

    const payload = updateProgramSchema.parse(req.body);

    // If changing department, verify it exists
    if (payload.departmentId) {
      const dept = await Department.findByPk(payload.departmentId);
      if (!dept) throw new AppError('Department not found.', 404, 'DEPARTMENT_NOT_FOUND');
    }

    await program.update(payload);

    await recordAudit({
      req,
      action:     'PROGRAM_UPDATED',
      category:   'academic',
      entityType: 'Program',
      entityId:   program.id,
      metadata:   { updatedFields: Object.keys(payload) }
    });

    return res.status(200).json({ success: true, message: 'Program updated.', data: { program } });
  } catch (err) {
    return next(err);
  }
}

async function deleteProgram(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) throw new AppError('Invalid program ID.', 400);

    const program = await Program.findByPk(id);
    if (!program) throw new AppError('Program not found.', 404, 'PROGRAM_NOT_FOUND');

    // Guard: cannot delete if courses are linked to this program
    const coursesCount = await Course.count({ where: { programId: id } });
    if (coursesCount > 0) {
      throw new AppError(
        `Cannot delete program "${program.code}" because it has ${coursesCount} course(s) linked to it. Archive it or reassign its courses first.`,
        409,
        'REFERENCED_RECORD_PROTECTED'
      );
    }

    await recordAudit({
      req,
      action:     'PROGRAM_DELETED',
      category:   'academic',
      entityType: 'Program',
      entityId:   program.id,
      metadata:   { code: program.code, name: program.name }
    });

    await program.destroy();

    return res.status(200).json({ success: true, message: 'Program deleted successfully.' });
  } catch (err) {
    return next(err);
  }
}

// Academic Years & Semesters
async function listAcademicYears(req, res, next) {
  try {
    const { status } = req.query;
    const where = {};
    if (status) where.status = status;

    const academicYears = await AcademicYear.findAll({
      where,
      include: [{ model: Semester, as: 'semesters' }],
      order: [['startDate', 'DESC']]
    });
    return res.status(200).json({ success: true, data: { academicYears } });
  } catch (err) {
    return next(err);
  }
}

async function getAcademicYearById(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) throw new AppError('Invalid academic year ID.', 400);

    const academicYear = await AcademicYear.findByPk(id, {
      include: [{ model: Semester, as: 'semesters' }]
    });
    if (!academicYear) throw new AppError('Academic year not found.', 404, 'ACADEMIC_YEAR_NOT_FOUND');

    return res.status(200).json({ success: true, data: { academicYear } });
  } catch (err) {
    return next(err);
  }
}

async function createAcademicYear(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const payload = academicYearSchema.parse(req.body);
    const inst = await Institution.findOne({ transaction: t });

    // If marking as current, clear all others first — inside the same transaction
    if (payload.isCurrent) {
      await AcademicYear.update({ isCurrent: false }, { where: {}, transaction: t });
    }

    const academicYear = await AcademicYear.create({
      institutionId: inst?.id || 1,
      ...payload
    }, { transaction: t });

    await t.commit();

    await recordAudit({
      req,
      action:     'ACADEMIC_YEAR_CREATED',
      category:   'academic',
      entityType: 'AcademicYear',
      entityId:   academicYear.id,
      metadata:   { name: academicYear.name, status: academicYear.status, isCurrent: academicYear.isCurrent }
    });

    return res.status(201).json({ success: true, message: 'Academic year created.', data: { academicYear } });
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

async function updateAcademicYear(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) throw new AppError('Invalid academic year ID.', 400);

    const academicYear = await AcademicYear.findByPk(id, { transaction: t });
    if (!academicYear) throw new AppError('Academic year not found.', 404, 'ACADEMIC_YEAR_NOT_FOUND');

    const payload = updateAcademicYearSchema.parse(req.body);

    // If setting this as current, clear all others first
    if (payload.isCurrent === true) {
      await AcademicYear.update({ isCurrent: false }, { where: {}, transaction: t });
    }

    await academicYear.update(payload, { transaction: t });
    await t.commit();

    await recordAudit({
      req,
      action:     'ACADEMIC_YEAR_UPDATED',
      category:   'academic',
      entityType: 'AcademicYear',
      entityId:   academicYear.id,
      metadata:   { updatedFields: Object.keys(payload) }
    });

    // Re-fetch with semesters for the response
    const updated = await AcademicYear.findByPk(id, {
      include: [{ model: Semester, as: 'semesters' }]
    });

    return res.status(200).json({ success: true, message: 'Academic year updated.', data: { academicYear: updated } });
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

async function deleteAcademicYear(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) throw new AppError('Invalid academic year ID.', 400);

    const academicYear = await AcademicYear.findByPk(id, {
      include: [{ model: Semester, as: 'semesters' }]
    });
    if (!academicYear) throw new AppError('Academic year not found.', 404, 'ACADEMIC_YEAR_NOT_FOUND');

    // Guard: cannot delete if it has semesters
    if (academicYear.semesters && academicYear.semesters.length > 0) {
      throw new AppError(
        `Cannot delete academic year "${academicYear.name}" because it has ${academicYear.semesters.length} semester(s) linked to it. Archive it or remove its semesters first.`,
        409,
        'REFERENCED_RECORD_PROTECTED'
      );
    }

    await recordAudit({
      req,
      action:     'ACADEMIC_YEAR_DELETED',
      category:   'academic',
      entityType: 'AcademicYear',
      entityId:   academicYear.id,
      metadata:   { name: academicYear.name }
    });

    await academicYear.destroy();

    return res.status(200).json({ success: true, message: 'Academic year deleted.' });
  } catch (err) {
    return next(err);
  }
}

async function listSemesters(req, res, next) {
  try {
    const { academicYearId, status, isCurrent } = req.query;
    const where = {};
    if (academicYearId) where.academicYearId = Number(academicYearId);
    if (status)         where.status         = status;
    if (isCurrent !== undefined) where.isCurrent = isCurrent === 'true';

    const semesters = await Semester.findAll({
      where,
      include: [{ model: AcademicYear, as: 'academicYear' }],
      order: [['startDate', 'DESC']]
    });
    return res.status(200).json({ success: true, data: { semesters } });
  } catch (err) {
    return next(err);
  }
}

async function getSemesterById(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) throw new AppError('Invalid semester ID.', 400);

    const semester = await Semester.findByPk(id, {
      include: [{ model: AcademicYear, as: 'academicYear' }]
    });
    if (!semester) throw new AppError('Semester not found.', 404, 'SEMESTER_NOT_FOUND');

    return res.status(200).json({ success: true, data: { semester } });
  } catch (err) {
    return next(err);
  }
}

async function createSemester(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const payload = semesterSchema.parse(req.body);

    // Verify parent academic year exists
    const academicYear = await AcademicYear.findByPk(payload.academicYearId, { transaction: t });
    if (!academicYear) throw new AppError('Academic year not found.', 404, 'ACADEMIC_YEAR_NOT_FOUND');

    // If marking as current, clear all others first
    if (payload.isCurrent) {
      await Semester.update({ isCurrent: false }, { where: {}, transaction: t });
    }

    const semester = await Semester.create(payload, { transaction: t });
    await t.commit();

    await recordAudit({
      req,
      action:     'SEMESTER_CREATED',
      category:   'academic',
      entityType: 'Semester',
      entityId:   semester.id,
      metadata:   { name: semester.name, code: semester.code, academicYearId: semester.academicYearId }
    });

    const full = await Semester.findByPk(semester.id, {
      include: [{ model: AcademicYear, as: 'academicYear' }]
    });

    return res.status(201).json({ success: true, message: 'Semester created.', data: { semester: full } });
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

async function updateSemester(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) throw new AppError('Invalid semester ID.', 400);

    const semester = await Semester.findByPk(id, { transaction: t });
    if (!semester) throw new AppError('Semester not found.', 404, 'SEMESTER_NOT_FOUND');

    const payload = updateSemesterSchema.parse(req.body);

    // If changing parent, verify new academic year exists
    if (payload.academicYearId) {
      const ay = await AcademicYear.findByPk(payload.academicYearId, { transaction: t });
      if (!ay) throw new AppError('Academic year not found.', 404, 'ACADEMIC_YEAR_NOT_FOUND');
    }

    // If setting as current, clear all others first
    if (payload.isCurrent === true) {
      await Semester.update({ isCurrent: false }, { where: {}, transaction: t });
    }

    await semester.update(payload, { transaction: t });
    await t.commit();

    await recordAudit({
      req,
      action:     'SEMESTER_UPDATED',
      category:   'academic',
      entityType: 'Semester',
      entityId:   semester.id,
      metadata:   { updatedFields: Object.keys(payload) }
    });

    const updated = await Semester.findByPk(id, {
      include: [{ model: AcademicYear, as: 'academicYear' }]
    });

    return res.status(200).json({ success: true, message: 'Semester updated.', data: { semester: updated } });
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

async function deleteSemester(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) throw new AppError('Invalid semester ID.', 400);

    const semester = await Semester.findByPk(id);
    if (!semester) throw new AppError('Semester not found.', 404, 'SEMESTER_NOT_FOUND');

    // Guard: cannot delete if course offerings are linked to this semester
    const offeringsCount = await CourseOffering.count({ where: { semesterId: id } });
    if (offeringsCount > 0) {
      throw new AppError(
        `Cannot delete semester "${semester.name}" because it has ${offeringsCount} course offering(s) linked to it. Archive it or remove its offerings first.`,
        409,
        'REFERENCED_RECORD_PROTECTED'
      );
    }

    await recordAudit({
      req,
      action:     'SEMESTER_DELETED',
      category:   'academic',
      entityType: 'Semester',
      entityId:   semester.id,
      metadata:   { name: semester.name, code: semester.code }
    });

    await semester.destroy();

    return res.status(200).json({ success: true, message: 'Semester deleted.' });
  } catch (err) {
    return next(err);
  }
}

// Courses (Reusable Academic Subject)
async function listCourses(req, res, next) {
  try {
    const { departmentId, category, publicationStatus } = req.query;
    const where = {};
    if (departmentId) where.departmentId = Number(departmentId);
    if (category) where.category = category;
    if (publicationStatus) {
      where.publicationStatus = publicationStatus;
    } else if (req.user.primaryRole === 'student') {
      where.publicationStatus = 'published';
    }

    const courses = await Course.findAll({
      where,
      include: [
        { model: Department, as: 'department', attributes: ['id', 'code', 'name'] },
        { model: Program, as: 'program', attributes: ['id', 'code', 'name'] },
        {
          model: Module,
          as: 'modules',
          include: [{ model: Lesson, as: 'lessons', attributes: ['id', 'title', 'lessonType', 'orderIndex', 'publicationStatus', 'estimatedMinutes'] }]
        },
        {
          model: CourseOffering,
          as: 'offerings',
          include: [
            { model: Semester, as: 'semester' },
            {
              model: ClassSection,
              as: 'classes',
              include: [
                {
                  model: InstructorAssignment,
                  as: 'instructorAssignments',
                  include: [{ model: User, as: 'instructor', attributes: ['id', 'firstName', 'lastName', 'email'] }]
                },
                { model: ClassMembership, as: 'memberships', attributes: ['id', 'studentId', 'status'] }
              ]
            }
          ]
        }
      ],
      order: [['code', 'ASC']]
    });

    return res.status(200).json({ success: true, data: { courses } });
  } catch (err) {
    return next(err);
  }
}

async function getCourseById(req, res, next) {
  try {
    const course = await Course.findByPk(req.params.id, {
      include: [
        { model: Department, as: 'department' },
        { model: Program, as: 'program' },
        {
          model: Module,
          as: 'modules',
          include: [
            {
              model: Lesson,
              as: 'lessons',
              include: [{ model: LearningResource, as: 'resources' }]
            },
            { model: LearningResource, as: 'resources' }
          ]
        },
        { model: LearningResource, as: 'resources' },
        {
          model: CourseOffering,
          as: 'offerings',
          include: [
            { model: Semester, as: 'semester' },
            { model: ClassSection, as: 'classes' }
          ]
        }
      ],
      order: [
        [{ model: Module, as: 'modules' }, 'orderIndex', 'ASC'],
        [{ model: Module, as: 'modules' }, { model: Lesson, as: 'lessons' }, 'orderIndex', 'ASC']
      ]
    });

    if (!course) throw new AppError('Course not found.', 404, 'COURSE_NOT_FOUND');

    return res.status(200).json({ success: true, data: { course } });
  } catch (err) {
    return next(err);
  }
}

async function createCourse(req, res, next) {
  try {
    const payload = courseSchema.parse(req.body);
    const course = await Course.create({
      ...payload,
      createdBy: req.user.id
    });

    await recordAudit({
      req,
      action: 'COURSE_CREATED',
      category: 'course',
      entityType: 'Course',
      entityId: course.id,
      metadata: { code: course.code, title: course.title }
    });

    return res.status(201).json({ success: true, message: 'Course created successfully.', data: { course } });
  } catch (err) {
    return next(err);
  }
}

async function updateCourse(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) throw new AppError('Invalid course ID.', 400);

    const course = await Course.findByPk(id);
    if (!course) throw new AppError('Course not found.', 404, 'COURSE_NOT_FOUND');

    const payload = updateCourseSchema.parse(req.body);
    await course.update(payload);

    await recordAudit({
      req,
      action:     'COURSE_UPDATED',
      category:   'course',
      entityType: 'Course',
      entityId:   course.id,
      metadata:   { updatedFields: Object.keys(payload) }
    });
    return res.status(200).json({ success: true, message: 'Course updated.', data: { course } });
  } catch (err) {
    return next(err);
  }
}

async function deleteCourse(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) throw new AppError('Invalid course ID.', 400);

    const course = await Course.findByPk(id);
    if (!course) throw new AppError('Course not found.', 404, 'COURSE_NOT_FOUND');

    // Guard: cannot delete if course has offerings
    const offeringsCount = await CourseOffering.count({ where: { courseId: id } });
    if (offeringsCount > 0) {
      throw new AppError(
        `Cannot delete course "${course.code}" because it has ${offeringsCount} course offering(s) linked to it. Archive it or remove its offerings first.`,
        409,
        'REFERENCED_RECORD_PROTECTED'
      );
    }

    await recordAudit({
      req,
      action:     'COURSE_DELETED',
      category:   'course',
      entityType: 'Course',
      entityId:   course.id,
      metadata:   { code: course.code, title: course.title }
    });

    await course.destroy();
    return res.status(200).json({ success: true, message: 'Course deleted successfully.' });
  } catch (err) {
    return next(err);
  }
}

// Course Offerings
async function listCourseOfferings(req, res, next) {
  try {
    const offerings = await CourseOffering.findAll({
      include: [
        { model: Course, as: 'course' },
        { model: AcademicYear, as: 'academicYear' },
        { model: Semester, as: 'semester' },
        {
          model: ClassSection,
          as: 'classes',
          include: [
            {
              model: InstructorAssignment,
              as: 'instructorAssignments',
              include: [{ model: User, as: 'instructor', attributes: ['id', 'firstName', 'lastName', 'email'] }]
            },
            { model: ClassMembership, as: 'memberships', attributes: ['id', 'studentId', 'status'] }
          ]
        }
      ],
      order: [['id', 'DESC']]
    });
    return res.status(200).json({ success: true, data: { offerings } });
  } catch (err) {
    return next(err);
  }
}

async function createCourseOffering(req, res, next) {
  try {
    const payload = courseOfferingSchema.parse(req.body);
    const offering = await CourseOffering.create(payload);
    await recordAudit({
      req,
      action: 'COURSE_OFFERING_CREATED',
      category: 'academic',
      entityType: 'CourseOffering',
      entityId: offering.id,
      metadata: payload
    });
    return res.status(201).json({ success: true, message: 'Course offering created.', data: { offering } });
  } catch (err) {
    return next(err);
  }
}

async function updateCourseOffering(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) throw new AppError('Invalid offering ID.', 400);

    const offering = await CourseOffering.findByPk(id);
    if (!offering) throw new AppError('Course offering not found.', 404, 'OFFERING_NOT_FOUND');

    const payload = updateCourseOfferingSchema.parse(req.body);
    await offering.update(payload);

    await recordAudit({
      req,
      action:     'COURSE_OFFERING_UPDATED',
      category:   'academic',
      entityType: 'CourseOffering',
      entityId:   offering.id,
      metadata:   { updatedFields: Object.keys(payload) }
    });
    return res.status(200).json({ success: true, message: 'Course offering updated.', data: { offering } });
  } catch (err) {
    return next(err);
  }
}

async function deleteCourseOffering(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) throw new AppError('Invalid offering ID.', 400);

    const offering = await CourseOffering.findByPk(id);
    if (!offering) throw new AppError('Course offering not found.', 404, 'OFFERING_NOT_FOUND');

    // Guard: cannot delete if class sections are linked to this offering
    const classCount = await ClassSection.count({ where: { courseOfferingId: id } });
    if (classCount > 0) {
      throw new AppError(
        `Cannot delete offering "${offering.offeringCode}" because it has ${classCount} class section(s) linked to it. Archive it or remove its sections first.`,
        409,
        'REFERENCED_RECORD_PROTECTED'
      );
    }

    await recordAudit({
      req,
      action:     'COURSE_OFFERING_DELETED',
      category:   'academic',
      entityType: 'CourseOffering',
      entityId:   offering.id,
      metadata:   { offeringCode: offering.offeringCode }
    });

    await offering.destroy();
    return res.status(200).json({ success: true, message: 'Course offering deleted successfully.' });
  } catch (err) {
    return next(err);
  }
}

// Classes / Sections
async function listClasses(req, res, next) {
  try {
    const role = req.user.primaryRole;
    const where = {};

    if (role === 'instructor') {
      const assigned = await InstructorAssignment.findAll({ where: { instructorId: req.user.id } });
      where.id = assigned.map((a) => a.classId);
    } else if (role === 'teaching_assistant') {
      const assigned = await TeachingAssistantAssignment.findAll({ where: { taUserId: req.user.id } });
      where.id = assigned.map((a) => a.classId);
    }

    const membershipsInclude = {
      model: ClassMembership,
      as: 'memberships',
      include: [{ model: User, as: 'student', attributes: ['id', 'firstName', 'lastName', 'email', 'studentNumber'] }]
    };
    if (role === 'teaching_assistant') {
      const rosterAssignments = await TeachingAssistantAssignment.findAll({
        where: { taUserId: req.user.id, canViewRoster: true },
        attributes: ['classId']
      });
      membershipsInclude.where = { classId: rosterAssignments.map((assignment) => assignment.classId) };
      membershipsInclude.required = false;
    }

    const classes = await ClassSection.findAll({
      where,
      include: [
        {
          model: CourseOffering,
          as: 'courseOffering',
          include: [
            { model: Course, as: 'course' },
            { model: Semester, as: 'semester' },
            { model: AcademicYear, as: 'academicYear' }
          ]
        },
        {
          model: InstructorAssignment,
          as: 'instructorAssignments',
          include: [{ model: User, as: 'instructor', attributes: ['id', 'firstName', 'lastName', 'email'] }]
        },
        {
          model: TeachingAssistantAssignment,
          as: 'taAssignments',
          include: [{ model: User, as: 'teachingAssistant', attributes: ['id', 'firstName', 'lastName', 'email'] }]
        },
        membershipsInclude
      ],
      order: [['id', 'ASC']]
    });

    return res.status(200).json({ success: true, data: { classes } });
  } catch (err) {
    return next(err);
  }
}

async function getClassById(req, res, next) {
  try {
    const classSection = await ClassSection.findByPk(req.params.id, {
      include: [
        {
          model: CourseOffering,
          as: 'courseOffering',
          include: [
            {
              model: Course,
              as: 'course',
              include: [
                {
                  model: Module,
                  as: 'modules',
                  include: [{ model: Lesson, as: 'lessons' }]
                },
                { model: LearningResource, as: 'resources' }
              ]
            },
            { model: Semester, as: 'semester' }
          ]
        },
        {
          model: InstructorAssignment,
          as: 'instructorAssignments',
          include: [{ model: User, as: 'instructor', attributes: ['id', 'firstName', 'lastName', 'email'] }]
        },
        {
          model: TeachingAssistantAssignment,
          as: 'taAssignments',
          include: [{ model: User, as: 'teachingAssistant', attributes: ['id', 'firstName', 'lastName', 'email'] }]
        },
        {
          model: ClassMembership,
          as: 'memberships',
          include: [{ model: User, as: 'student', attributes: ['id', 'firstName', 'lastName', 'email', 'studentNumber'] }]
        },
        { model: GradeCategory, as: 'gradeCategories' }
      ]
    });

    if (!classSection) throw new AppError('Class section not found.', 404);

    // Verify the caller has access to this specific section.
    // TAs must be explicitly assigned AND have canViewRoster enabled.
    const { verifyClassAccess } = require('../middleware/auth.middleware');
    await verifyClassAccess(req.user, classSection.id, {
      allowAdmin: true,
      allowInstructor: true,
      allowTA: true,
      requiredTaFlag: 'canViewRoster',
      allowStudent: true
    });

    return res.status(200).json({ success: true, data: { classSection } });
  } catch (err) {
    return next(err);
  }
}

async function createClassSection(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const payload = classSectionSchema.parse(req.body);
    const classSection = await ClassSection.create({
      courseOfferingId: payload.courseOfferingId,
      sectionCode: payload.sectionCode,
      name: payload.name,
      room: payload.room || null,
      schedule: payload.schedule || null,
      capacity: payload.capacity || 40,
      allowLateSubmissions: payload.allowLateSubmissions ?? true,
      latePenaltyPercent: payload.latePenaltyPercent ?? 10
    }, { transaction: t });

    // Seed default weighted grade categories (20 / 25 / 25 / 30)
    await GradeCategory.bulkCreate([
      { classId: classSection.id, name: 'Quizzes', categoryType: 'quiz', weightPercent: 20, orderIndex: 1 },
      { classId: classSection.id, name: 'Assignments', categoryType: 'assignment', weightPercent: 25, orderIndex: 2 },
      { classId: classSection.id, name: 'Laboratory Activities', categoryType: 'laboratory', weightPercent: 25, orderIndex: 3 },
      { classId: classSection.id, name: 'Major Examination', categoryType: 'major_exam', weightPercent: 30, orderIndex: 4 }
    ], { transaction: t });

    if (payload.instructorId) {
      await InstructorAssignment.create({
        classId: classSection.id,
        instructorId: payload.instructorId,
        isPrimary: true,
        assignedBy: req.user.id
      }, { transaction: t });
    }

    await t.commit();

    await recordAudit({
      req,
      action: 'CLASS_SECTION_CREATED',
      category: 'academic',
      entityType: 'ClassSection',
      entityId: classSection.id,
      metadata: payload
    });

    return res.status(201).json({
      success: true,
      message: 'Class section created with default grading categories.',
      data: { classSection }
    });
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

async function assignInstructorToClass(req, res, next) {
  try {
    const classId = Number(req.params.id);
    const { instructorId, isPrimary = true } = req.body;

    const [assignment] = await InstructorAssignment.findOrCreate({
      where: { classId, instructorId: Number(instructorId) },
      defaults: { classId, instructorId: Number(instructorId), isPrimary, assignedBy: req.user.id }
    });

    await recordAudit({
      req,
      action: 'INSTRUCTOR_ASSIGNED_TO_CLASS',
      category: 'academic',
      entityType: 'ClassSection',
      entityId: classId,
      metadata: { instructorId }
    });

    return res.status(200).json({
      success: true,
      message: 'Instructor assigned to class section.',
      data: { assignment }
    });
  } catch (err) {
    return next(err);
  }
}

async function assignTaToClass(req, res, next) {
  try {
    const classId = Number(req.params.id);
    const {
      taUserId,
      canViewRoster = true,
      canReviewSubmissions = true,
      canApplyRubrics = true,
      canManageDiscussions = true,
      canUploadResources = false
    } = req.body;

    const [taAssignment, created] = await TeachingAssistantAssignment.findOrCreate({
      where: { classId, taUserId: Number(taUserId) },
      defaults: {
        classId,
        taUserId: Number(taUserId),
        canViewRoster,
        canReviewSubmissions,
        canApplyRubrics,
        canManageDiscussions,
        canUploadResources,
        assignedBy: req.user.id
      }
    });

    if (!created) {
      await taAssignment.update({
        canViewRoster,
        canReviewSubmissions,
        canApplyRubrics,
        canManageDiscussions,
        canUploadResources
      });
    }

    await recordAudit({
      req,
      action: 'TA_ASSIGNED_OR_UPDATED',
      category: 'academic',
      entityType: 'ClassSection',
      entityId: classId,
      metadata: { taUserId, canReviewSubmissions, canApplyRubrics, canUploadResources }
    });

    return res.status(200).json({
      success: true,
      message: 'Teaching assistant assignment and class permissions saved.',
      data: { taAssignment }
    });
  } catch (err) {
    return next(err);
  }
}

async function updateClassSection(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) throw new AppError('Invalid class section ID.', 400);

    const classSection = await ClassSection.findByPk(id);
    if (!classSection) throw new AppError('Class section not found.', 404, 'CLASS_NOT_FOUND');

    const payload = updateClassSectionSchema.parse(req.body);
    await classSection.update(payload);

    await recordAudit({
      req,
      action:     'CLASS_SECTION_UPDATED',
      category:   'academic',
      entityType: 'ClassSection',
      entityId:   classSection.id,
      metadata:   { updatedFields: Object.keys(payload) }
    });

    // Re-fetch with full associations for the response
    const updated = await ClassSection.findByPk(id, {
      include: [
        {
          model: CourseOffering,
          as: 'courseOffering',
          include: [
            { model: Course,   as: 'course',   attributes: ['id', 'code', 'title'] },
            { model: Semester, as: 'semester',  attributes: ['id', 'name', 'code'] }
          ]
        },
        {
          model: InstructorAssignment,
          as: 'instructorAssignments',
          include: [{ model: User, as: 'instructor', attributes: ['id', 'firstName', 'lastName', 'email'] }]
        },
        {
          model: TeachingAssistantAssignment,
          as: 'taAssignments',
          include: [{ model: User, as: 'teachingAssistant', attributes: ['id', 'firstName', 'lastName', 'email'] }]
        },
        { model: ClassMembership, as: 'memberships', attributes: ['id', 'status'] }
      ]
    });

    return res.status(200).json({
      success: true,
      message: 'Class section updated.',
      data: { classSection: updated }
    });
  } catch (err) {
    return next(err);
  }
}

async function deleteClassSection(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) throw new AppError('Invalid class section ID.', 400);

    const classSection = await ClassSection.findByPk(id);
    if (!classSection) throw new AppError('Class section not found.', 404, 'CLASS_NOT_FOUND');

    // Guard: cannot delete if students are actively enrolled
    const enrolledCount = await ClassMembership.count({
      where: { classId: id, status: ['enrolled', 'pending'] }
    });
    if (enrolledCount > 0) {
      throw new AppError(
        `Cannot delete class section "${classSection.sectionCode}" because it has ${enrolledCount} enrolled student(s). Drop or transfer them first, or archive the section instead.`,
        409,
        'REFERENCED_RECORD_PROTECTED'
      );
    }

    await recordAudit({
      req,
      action:     'CLASS_SECTION_DELETED',
      category:   'academic',
      entityType: 'ClassSection',
      entityId:   classSection.id,
      metadata:   { sectionCode: classSection.sectionCode, name: classSection.name }
    });

    await classSection.destroy();
    return res.status(200).json({ success: true, message: 'Class section deleted.' });
  } catch (err) {
    return next(err);
  }
}

async function updateClassEligibility(req, res, next) {
  try {
    const payload = classEligibilitySchema.parse(req.body);
    const classSection = await ClassSection.findByPk(req.params.id);
    if (!classSection) throw new AppError('Class section not found.', 404, 'CLASS_NOT_FOUND');
    if (payload.eligibleProgramId) {
      const program = await Program.findByPk(payload.eligibleProgramId);
      if (!program || program.status !== 'active') {
        throw new AppError('Eligible program not found or inactive.', 400, 'INVALID_ELIGIBLE_PROGRAM');
      }
    }

    await classSection.update(payload);
    await recordAudit({
      req,
      action: 'CLASS_ELIGIBILITY_UPDATED',
      category: 'academic',
      entityType: 'ClassSection',
      entityId: classSection.id,
      metadata: payload
    });

    return res.status(200).json({
      success: true,
      message: 'Class eligibility rules updated.',
      data: { classSection }
    });
  } catch (err) {
    return next(err);
  }
}

// Enrollments & CSV Import
async function listEnrollments(req, res, next) {
  try {
    const { classId, studentId } = req.query;
    const where = {};
    if (classId) where.classId = Number(classId);
    if (studentId) where.studentId = Number(studentId);
    if (req.user.primaryRole === 'student') {
      where.studentId = req.user.id;
    }

    // Teaching Assistants may only query enrollments for sections they are
    // explicitly assigned to, and only when canViewRoster is enabled.
    // This prevents URL-manipulation access to unassigned sections.
    if (req.user.primaryRole === 'teaching_assistant') {
      if (!classId) {
        // No classId supplied — scope to all assigned sections (safe: DB-enforced)
        const assignments = await TeachingAssistantAssignment.findAll({
          where: { taUserId: req.user.id, canViewRoster: true }
        });
        if (assignments.length === 0) {
          return res.status(200).json({ success: true, data: { enrollments: [] } });
        }
        where.classId = assignments.map((a) => a.classId);
      } else {
        // Explicit classId — verify assignment + flag before proceeding
        const { verifyClassAccess } = require('../middleware/auth.middleware');
        await verifyClassAccess(req.user, classId, {
          allowAdmin: false,
          allowInstructor: false,
          allowTA: true,
          requiredTaFlag: 'canViewRoster',
          allowStudent: false
        });
      }
    }

    const enrollments = await ClassMembership.findAll({
      where,
      include: [
        { model: User, as: 'student', attributes: ['id', 'firstName', 'lastName', 'email', 'studentNumber'] },
        {
          model: ClassSection,
          as: 'classSection',
          include: [
            {
              model: CourseOffering,
              as: 'courseOffering',
              include: [{ model: Course, as: 'course' }, { model: Semester, as: 'semester' }]
            }
          ]
        }
      ],
      order: [['id', 'DESC']]
    });

    return res.status(200).json({ success: true, data: { enrollments } });
  } catch (err) {
    return next(err);
  }
}

async function enrollStudent(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const classId = Number(req.body.classId);
    const studentId = req.user.primaryRole === 'student'
      ? req.user.id
      : Number(req.body.studentId);

    if (!classId || !studentId) {
      throw new AppError('classId and studentId are required.', 400);
    }

    const classSection = await ClassSection.findByPk(classId, {
      include: [
        { model: CourseOffering, as: 'courseOffering', include: [{ model: Course, as: 'course' }, { model: Semester, as: 'semester' }] },
        { model: ClassMembership, as: 'memberships' }
      ],
      transaction: t
    });

    if (!classSection) throw new AppError('Class section not found.', 404);

    const offering = classSection.courseOffering;
    if (req.user.primaryRole === 'student') {
      if (classSection.status !== 'active' || offering?.status !== 'published') {
        throw new AppError('This class is not currently open for enrollment.', 400, 'ENROLLMENT_CLOSED');
      }
      if (offering?.enrollmentPolicy === 'admin_only') {
        throw new AppError('This class section requires administrator enrollment.', 403, 'ENROLLMENT_RESTRICTED');
      }

      const semester = offering?.semester;
      const currentDate = new Date().toISOString().slice(0, 10);
      if (
        (semester?.enrollmentStartDate && currentDate < semester.enrollmentStartDate) ||
        (semester?.enrollmentEndDate && currentDate > semester.enrollmentEndDate)
      ) {
        throw new AppError('Enrollment for this term is not currently open.', 400, 'ENROLLMENT_WINDOW_CLOSED');
      }
    }

    const placement = await StudentPlacement.findOne({
      where: { studentId, academicYearId: offering?.academicYearId },
      transaction: t
    });
    if (!placement) {
      throw new AppError('Student academic placement is not set for this year. Contact the registrar.', 403, 'PLACEMENT_REQUIRED');
    }
    if (!isPlacementEligibleForSection(placement, classSection)) {
      throw new AppError('Student is not eligible for this class section based on their academic placement.', 403, 'SECTION_NOT_ELIGIBLE');
    }

    const existing = await ClassMembership.findOne({
      where: { classId, studentId },
      transaction: t
    });

    if (existing && existing.status === 'enrolled') {
      throw new AppError('Student is already enrolled in this class section.', 409, 'DUPLICATE_ENROLLMENT');
    }

    // Capacity check — count active enrollments and compare against section capacity
    if (!existing || existing.status !== 'enrolled') {
      const activeCount = await ClassMembership.count({
        where: { classId, status: ['enrolled', 'pending'] },
        transaction: t
      });
      if (activeCount >= classSection.capacity) {
        throw new AppError(
          `Class section "${classSection.sectionCode}" is at full capacity (${classSection.capacity} students).`,
          409,
          'CLASS_AT_CAPACITY'
        );
      }
    }

    const status = (req.user.primaryRole === 'student' && classSection.courseOffering?.enrollmentPolicy === 'instructor_approval')
      ? 'pending'
      : 'enrolled';

    let membership;
    if (existing) {
      membership = await existing.update({ status, enrolledAt: new Date(), enrolledBy: req.user.id }, { transaction: t });
    } else {
      membership = await ClassMembership.create({
        classId,
        studentId,
        status,
        enrolledBy: req.user.id
      }, { transaction: t });
    }

    await t.commit();

    await recalculateStudentCourseProgress(classId, studentId);

    await createNotification({
      userId: studentId,
      type: 'enrollment',
      title: `Enrolled in ${classSection.name}`,
      message: `You have been enrolled in ${classSection.name} (${classSection.courseOffering?.course?.code || ''}).`,
      destinationUrl: '/student/courses'
    });

    // Notify TAs assigned to this section that the class roster has changed.
    // Only the section code and class name are shared — no student identity.
    const taAssignments = await TeachingAssistantAssignment.findAll({
      where: { classId, canViewRoster: true }
    });
    for (const ta of taAssignments) {
      await createNotification({
        userId: ta.taUserId,
        type: 'enrollment',
        title: `New Student Enrolled: ${classSection.sectionCode}`,
        message: `A new student has been enrolled in ${classSection.name}. Your class roster has been updated.`,
        destinationUrl: '/ta/classes'
      });
    }

    await recordAudit({
      req,
      action: 'STUDENT_ENROLLED',
      category: 'academic',
      entityType: 'ClassMembership',
      entityId: membership.id,
      metadata: { classId, studentId, status }
    });

    return res.status(201).json({
      success: true,
      message: 'Student enrolled successfully.',
      data: { membership }
    });
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

async function transferStudentSection(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const { fromClassId, toClassId, studentId } = req.body;
    const current = await ClassMembership.findOne({
      where: { classId: Number(fromClassId), studentId: Number(studentId) },
      transaction: t
    });

    if (!current) throw new AppError('Source enrollment record not found.', 404);

    const targetClass = await ClassSection.findByPk(toClassId, {
      include: [{ model: CourseOffering, as: 'courseOffering' }],
      transaction: t
    });
    if (!targetClass) throw new AppError('Target class section not found.', 404);

    const placement = await StudentPlacement.findOne({
      where: { studentId: Number(studentId), academicYearId: targetClass.courseOffering?.academicYearId },
      transaction: t
    });
    if (!placement) throw new AppError('Student academic placement is not set for this year.', 403, 'PLACEMENT_REQUIRED');
    if (!isPlacementEligibleForSection(placement, targetClass)) {
      throw new AppError('Student is not eligible for the target class section.', 403, 'SECTION_NOT_ELIGIBLE');
    }

    await current.update({ status: 'transferred', remarks: `Transferred to class #${toClassId}` }, { transaction: t });

    const [targetMembership] = await ClassMembership.findOrCreate({
      where: { classId: Number(toClassId), studentId: Number(studentId) },
      defaults: {
        classId: Number(toClassId),
        studentId: Number(studentId),
        status: 'enrolled',
        enrolledBy: req.user.id
      },
      transaction: t
    });

    if (targetMembership.status !== 'enrolled') {
      await targetMembership.update({ status: 'enrolled' }, { transaction: t });
    }

    await t.commit();

    await recordAudit({
      req,
      action: 'STUDENT_SECTION_TRANSFERRED',
      category: 'academic',
      entityType: 'ClassMembership',
      entityId: targetMembership.id,
      metadata: { fromClassId, toClassId, studentId }
    });

    return res.status(200).json({
      success: true,
      message: 'Student transferred to new section.',
      data: { membership: targetMembership }
    });
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

async function importRecordsCsv(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const { csvText, classId, defaultRole = 'student' } = req.body;
    if (!csvText || typeof csvText !== 'string') {
      throw new AppError('csvText is required (format: firstName,lastName,email,studentNumber).', 400);
    }

    const lines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.toLowerCase().startsWith('firstname'));

    const role = await Role.findOne({ where: { slug: defaultRole }, transaction: t });
    const defaultPasswordHash = await argon2.hash('Stud@12345', { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });

    const imported = [];
    for (const line of lines) {
      const [firstName, lastName, email, identifier] = line.split(',').map((s) => s?.trim());
      if (!firstName || !lastName || !email) continue;

      const normalizedEmail = email.toLowerCase();
      let user = await User.findOne({ where: { email: normalizedEmail }, transaction: t });

      if (!user) {
        user = await User.create({
          firstName,
          lastName,
          email: normalizedEmail,
          passwordHash: defaultPasswordHash,
          studentNumber: defaultRole === 'student' ? (identifier || null) : null,
          employeeNumber: defaultRole !== 'student' ? (identifier || null) : null,
          status: 'active'
        }, { transaction: t });

        if (role) {
          await UserRole.create({ userId: user.id, roleId: role.id, assignedBy: req.user.id }, { transaction: t });
        }
      }

      if (classId && defaultRole === 'student') {
        await ClassMembership.findOrCreate({
          where: { classId: Number(classId), studentId: user.id },
          defaults: { classId: Number(classId), studentId: user.id, status: 'enrolled', enrolledBy: req.user.id },
          transaction: t
        });
      }

      imported.push({ id: user.id, email: user.email, name: `${user.firstName} ${user.lastName}` });
    }

    await t.commit();

    await recordAudit({
      req,
      action: 'CSV_RECORDS_IMPORTED',
      category: 'academic',
      metadata: { count: imported.length, classId, defaultRole }
    });

    return res.status(201).json({
      success: true,
      message: `Successfully imported ${imported.length} record(s).`,
      data: { importedCount: imported.length, records: imported }
    });
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

async function dropStudent(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) throw new AppError('Invalid enrollment ID.', 400);

    const membership = await ClassMembership.findByPk(id, {
      include: [
        { model: ClassSection, as: 'classSection', attributes: ['id', 'sectionCode', 'name'] },
        { model: User, as: 'student', attributes: ['id', 'firstName', 'lastName', 'email'] }
      ]
    });
    if (!membership) throw new AppError('Enrollment record not found.', 404, 'ENROLLMENT_NOT_FOUND');

    if (['dropped', 'transferred', 'completed'].includes(membership.status)) {
      throw new AppError(
        `Cannot drop this enrollment — current status is "${membership.status}".`,
        409,
        'INVALID_STATUS_TRANSITION'
      );
    }

    const remarks = req.body.remarks || `Dropped by ${req.user.fullName || req.user.email}`;
    await membership.update({ status: 'dropped', remarks });

    await recordAudit({
      req,
      action:     'STUDENT_DROPPED',
      category:   'academic',
      entityType: 'ClassMembership',
      entityId:   membership.id,
      metadata: {
        classId:     membership.classId,
        studentId:   membership.studentId,
        sectionCode: membership.classSection?.sectionCode,
        studentName: membership.student ? `${membership.student.firstName} ${membership.student.lastName}` : null
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Student dropped from class section.',
      data: { membership }
    });
  } catch (err) {
    return next(err);
  }
}

async function updateEnrollmentStatus(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) throw new AppError('Invalid enrollment ID.', 400);

    const { status, remarks } = req.body;

    const ALLOWED_STATUSES = ['pending', 'enrolled', 'dropped', 'completed'];
    if (!status || !ALLOWED_STATUSES.includes(status)) {
      throw new AppError(`Status must be one of: ${ALLOWED_STATUSES.join(', ')}.`, 400, 'INVALID_STATUS');
    }

    const membership = await ClassMembership.findByPk(id, {
      include: [
        { model: ClassSection, as: 'classSection', attributes: ['id', 'sectionCode', 'capacity'] },
        { model: User, as: 'student', attributes: ['id', 'firstName', 'lastName', 'email'] }
      ]
    });
    if (!membership) throw new AppError('Enrollment record not found.', 404, 'ENROLLMENT_NOT_FOUND');

    // Capacity check when approving a pending enrollment
    if (status === 'enrolled' && membership.status === 'pending') {
      const activeCount = await ClassMembership.count({
        where: { classId: membership.classId, status: ['enrolled'] }
      });
      if (activeCount >= (membership.classSection?.capacity || 40)) {
        throw new AppError(
          `Class section "${membership.classSection?.sectionCode}" is at full capacity.`,
          409,
          'CLASS_AT_CAPACITY'
        );
      }
    }

    const updates = { status };
    if (remarks !== undefined) updates.remarks = remarks;
    if (status === 'completed') updates.completedAt = new Date();

    await membership.update(updates);

    await recordAudit({
      req,
      action:     'ENROLLMENT_STATUS_UPDATED',
      category:   'academic',
      entityType: 'ClassMembership',
      entityId:   membership.id,
      metadata:   { classId: membership.classId, studentId: membership.studentId, oldStatus: membership.status, newStatus: status }
    });

    // Notify student when their pending enrollment is approved
    if (status === 'enrolled' && membership.status === 'pending') {
      await createNotification({
        userId: membership.studentId,
        type: 'enrollment',
        title: `Enrollment Approved: ${membership.classSection?.sectionCode}`,
        message: `Your enrollment request for ${membership.classSection?.sectionCode} has been approved.`,
        destinationUrl: '/student/courses'
      });

      // Also notify TAs — roster has grown
      const taAssignments = await TeachingAssistantAssignment.findAll({
        where: { classId: membership.classId, canViewRoster: true }
      });
      for (const ta of taAssignments) {
        await createNotification({
          userId: ta.taUserId,
          type: 'enrollment',
          title: `New Student Enrolled: ${membership.classSection?.sectionCode}`,
          message: `A student's enrollment request for ${membership.classSection?.sectionCode} has been approved. Your class roster has been updated.`,
          destinationUrl: '/ta/classes'
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Enrollment status updated to "${status}".`,
      data: { membership }
    });
  } catch (err) {
    return next(err);
  }
}

async function listStudentPlacements(req, res, next) {
  try {
    const where = {};
    if (req.query.academicYearId) where.academicYearId = Number(req.query.academicYearId);
    if (req.query.studentId) where.studentId = Number(req.query.studentId);
    if (req.user.primaryRole === 'student') where.studentId = req.user.id;

    const placements = await StudentPlacement.findAll({
      where,
      include: [
        { model: User, as: 'student', attributes: ['id', 'firstName', 'lastName', 'email', 'studentNumber'] },
        { model: AcademicYear, as: 'academicYear', attributes: ['id', 'name', 'isCurrent'] },
        { model: Program, as: 'program', attributes: ['id', 'code', 'name'] }
      ],
      order: [['academicYearId', 'DESC'], ['studentId', 'ASC']]
    });

    return res.status(200).json({ success: true, data: { placements } });
  } catch (err) {
    return next(err);
  }
}

async function setStudentPlacement(req, res, next) {
  const transaction = await sequelize.transaction();
  try {
    const payload = studentPlacementSchema.parse(req.body);
    const [student, academicYear, program] = await Promise.all([
      User.findByPk(payload.studentId, {
        include: [{ model: Role, as: 'roles', where: { slug: 'student' }, required: true }]
      }),
      AcademicYear.findByPk(payload.academicYearId),
      Program.findByPk(payload.programId)
    ]);
    if (!student) throw new AppError('Student not found or user is not a student.', 404, 'STUDENT_NOT_FOUND');
    if (!academicYear) throw new AppError('Academic year not found.', 404, 'ACADEMIC_YEAR_NOT_FOUND');
    if (!program || program.status !== 'active') throw new AppError('Program not found or inactive.', 404, 'PROGRAM_NOT_FOUND');

    const [placement, created] = await StudentPlacement.findOrCreate({
      where: { studentId: payload.studentId, academicYearId: payload.academicYearId },
      defaults: { ...payload, updatedBy: req.user.id },
      transaction
    });
    if (!created) {
      await placement.update({ ...payload, updatedBy: req.user.id }, { transaction });
    }
    await transaction.commit();

    await recordAudit({
      req,
      action: 'STUDENT_PLACEMENT_CREATED',
      category: 'academic',
      entityType: 'StudentPlacement',
      entityId: placement.id,
      metadata: payload
    });

    return res.status(201).json({
      success: true,
      message: 'Student placement set successfully.',
      data: { placement }
    });
  } catch (err) {
    if (!transaction.finished) await transaction.rollback();
    return next(err);
  }
}

async function enrollEligibleStudents(req, res, next) {
  const transaction = await sequelize.transaction();
  try {
    const classId = Number(req.params.id);
    const classSection = await ClassSection.findByPk(classId, {
      include: [{ model: CourseOffering, as: 'courseOffering' }],
      transaction
    });
    if (!classSection) throw new AppError('Class section not found.', 404, 'CLASS_NOT_FOUND');
    if (!classSection.eligibleProgramId || !classSection.eligibleYearLevel) {
      throw new AppError('Set an eligible program and year level before enrolling a cohort.', 400, 'COHORT_RULES_REQUIRED');
    }

    const placementWhere = {
      academicYearId: classSection.courseOffering.academicYearId,
      programId: classSection.eligibleProgramId,
      yearLevel: classSection.eligibleYearLevel
    };
    if (classSection.eligibleCohortSection) placementWhere.cohortSection = classSection.eligibleCohortSection;
    const placements = await StudentPlacement.findAll({ where: placementWhere, transaction });
    const students = placements.length
      ? await User.findAll({
        where: { id: placements.map((placement) => placement.studentId), status: 'active' },
        include: [{ model: Role, as: 'roles', where: { slug: 'student' }, required: true }],
        order: [['id', 'ASC']],
        transaction
      })
      : [];
    const existingMemberships = await ClassMembership.findAll({
      where: { classId },
      transaction
    });
    const membershipsByStudent = new Map(existingMemberships.map((membership) => [membership.studentId, membership]));
    const candidates = students.filter((student) => {
      const membership = membershipsByStudent.get(student.id);
      return !membership || ['dropped', 'transferred'].includes(membership.status);
    });
    const activeMembershipCount = existingMemberships.filter(
      (membership) => ['enrolled', 'pending'].includes(membership.status)
    ).length;
    const capacityAvailable = Math.max(0, classSection.capacity - activeMembershipCount);
    const studentsToEnroll = candidates.slice(0, capacityAvailable);
    const now = new Date();

    for (const student of studentsToEnroll) {
      const [membership, created] = await ClassMembership.findOrCreate({
        where: { classId, studentId: student.id },
        defaults: { classId, studentId: student.id, status: 'enrolled', enrolledBy: req.user.id },
        transaction
      });
      if (!created && membership.status !== 'enrolled') {
        await membership.update({ status: 'enrolled', enrolledAt: now, enrolledBy: req.user.id }, { transaction });
      }
    }

    await transaction.commit();

    for (const student of studentsToEnroll) {
      await recalculateStudentCourseProgress(classId, student.id);
      await createNotification({
        userId: student.id,
        type: 'enrollment',
        title: `Enrolled in ${classSection.name}`,
        message: `You have been enrolled in ${classSection.name}.`,
        destinationUrl: '/student/courses'
      });
    }

    await recordAudit({
      req,
      action: 'STUDENT_COHORT_ENROLLED',
      category: 'academic',
      entityType: 'ClassSection',
      entityId: classId,
      metadata: { enrolledCount: studentsToEnroll.length }
    });

    return res.status(200).json({
      success: true,
      message: `Enrolled ${studentsToEnroll.length} eligible student(s) into ${classSection.name}.`,
      data: { enrolledCount: studentsToEnroll.length }
    });
  } catch (err) {
    if (!transaction.finished) await transaction.rollback();
    return next(err);
  }
}

module.exports = {
  getInstitution,
  updateInstitution,
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getPublicCatalog,
  listPrograms,
  createProgram,
  updateProgram,
  deleteProgram,
  listAcademicYears,
  getAcademicYearById,
  createAcademicYear,
  updateAcademicYear,
  deleteAcademicYear,
  listSemesters,
  getSemesterById,
  createSemester,
  updateSemester,
  deleteSemester,
  listCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  listCourseOfferings,
  createCourseOffering,
  updateCourseOffering,
  deleteCourseOffering,
  listClasses,
  getClassById,
  createClassSection,
  updateClassSection,
  deleteClassSection,
  updateClassEligibility,
  assignInstructorToClass,
  assignTaToClass,
  listEnrollments,
  listStudentPlacements,
  setStudentPlacement,
  enrollEligibleStudents,
  enrollStudent,
  dropStudent,
  updateEnrollmentStatus,
  transferStudentSection,
  importRecordsCsv
};
