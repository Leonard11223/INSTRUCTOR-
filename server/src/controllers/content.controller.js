const path = require('path');
const fs = require('fs');
const {
  Module,
  Lesson,
  LearningResource,
  LessonProgress,
  CourseProgress,
  ClassMembership,
  ClassSection,
  CourseOffering,
  TeachingAssistantAssignment,
  User
} = require('../models');
const env = require('../config/env');
const { AppError } = require('../middleware/error.middleware');
const { verifyClassAccess } = require('../middleware/auth.middleware');
const { verifyUploadedFileSafety } = require('../middleware/upload.middleware');
const { sanitizeRichHtml, sanitizePlainText } = require('../utils/sanitizer');
const { recordAudit } = require('../utils/auditLogger');
const { recalculateStudentCourseProgress } = require('../services/progress.service');
const { moduleSchema, lessonSchema } = require('../validators/schemas');

// Modules
async function listModules(req, res, next) {
  try {
    const { courseId } = req.query;
    const where = {};
    if (courseId) where.courseId = Number(courseId);
    if (req.user.primaryRole === 'student') {
      where.publicationStatus = 'published';
    }

    const modules = await Module.findAll({
      where,
      include: [
        {
          model: Lesson,
          as: 'lessons',
          include: [{ model: LearningResource, as: 'resources' }]
        },
        { model: LearningResource, as: 'resources' }
      ],
      order: [
        ['orderIndex', 'ASC'],
        [{ model: Lesson, as: 'lessons' }, 'orderIndex', 'ASC']
      ]
    });

    return res.status(200).json({ success: true, data: { modules } });
  } catch (err) {
    return next(err);
  }
}

async function createModule(req, res, next) {
  try {
    const payload = moduleSchema.parse(req.body);
    const mod = await Module.create(payload);

    await recordAudit({
      req,
      action: 'MODULE_CREATED',
      category: 'course',
      entityType: 'Module',
      entityId: mod.id,
      metadata: { courseId: mod.courseId, title: mod.title }
    });

    return res.status(201).json({ success: true, message: 'Module created.', data: { module: mod } });
  } catch (err) {
    return next(err);
  }
}

async function updateModule(req, res, next) {
  try {
    const mod = await Module.findByPk(req.params.id);
    if (!mod) throw new AppError('Module not found.', 404);
    await mod.update(req.body);
    return res.status(200).json({ success: true, message: 'Module updated.', data: { module: mod } });
  } catch (err) {
    return next(err);
  }
}

async function reorderModules(req, res, next) {
  try {
    // Accept both { orderedIds: [id1,id2,...] } and { modules: [{id, orderIndex},...] }
    const { orderedIds, modules: modulesPayload } = req.body;

    if (modulesPayload && Array.isArray(modulesPayload)) {
      // Client sends [{id, orderIndex}] — use provided orderIndex values
      for (const item of modulesPayload) {
        await Module.update({ orderIndex: item.orderIndex }, { where: { id: Number(item.id) } });
      }
      return res.status(200).json({ success: true, message: 'Modules reordered.' });
    }

    if (!Array.isArray(orderedIds)) throw new AppError('orderedIds array required.', 400);

    for (let i = 0; i < orderedIds.length; i += 1) {
      await Module.update({ orderIndex: i + 1 }, { where: { id: Number(orderedIds[i]) } });
    }

    return res.status(200).json({ success: true, message: 'Modules reordered.' });
  } catch (err) {
    return next(err);
  }
}

// Lessons
async function getLessonById(req, res, next) {
  try {
    const lesson = await Lesson.findByPk(req.params.id, {
      include: [
        { model: Module, as: 'module' },
        { model: LearningResource, as: 'resources' }
      ]
    });

    if (!lesson) throw new AppError('Lesson not found.', 404);
    if (req.user.primaryRole === 'student' && lesson.publicationStatus !== 'published') {
      throw new AppError('This lesson is not yet published.', 403, 'LESSON_UNPUBLISHED');
    }

    return res.status(200).json({ success: true, data: { lesson } });
  } catch (err) {
    return next(err);
  }
}

async function createLesson(req, res, next) {
  try {
    const payload = lessonSchema.parse(req.body);
    const sanitizedHtml = sanitizeRichHtml(payload.contentHtml);
    const slug = payload.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const lesson = await Lesson.create({
      ...payload,
      slug,
      contentHtml: sanitizedHtml
    });

    // If a file was uploaded alongside the lesson, attach it as a LearningResource
    if (req.file) {
      const { verifyUploadedFileSafety } = require('../middleware/upload.middleware');
      const fullPath = path.join(require('../config/env').UPLOAD_DIR, req.file.filename);
      if (verifyUploadedFileSafety && !verifyUploadedFileSafety(fullPath)) {
        fs.unlinkSync(fullPath);
      } else {
        await LearningResource.create({
          courseId: lesson.courseId,
          moduleId: lesson.moduleId,
          lessonId: lesson.id,
          title: req.file.originalname,
          description: 'Attached lesson file',
          resourceType: 'file',
          storedFilename: req.file.filename,
          originalFilename: req.file.originalname,
          mimeType: req.file.mimetype,
          fileSizeBytes: req.file.size,
          uploadedBy: req.user.id
        });
      }
    }

    await recordAudit({
      req,
      action: 'LESSON_CREATED',
      category: 'course',
      entityType: 'Lesson',
      entityId: lesson.id,
      metadata: { courseId: lesson.courseId, moduleId: lesson.moduleId, title: lesson.title }
    });

    // Return lesson with attached resources
    const fullLesson = await Lesson.findByPk(lesson.id, {
      include: [{ model: LearningResource, as: 'resources' }]
    });

    return res.status(201).json({ success: true, message: 'Lesson created.', data: { lesson: fullLesson } });
  } catch (err) {
    return next(err);
  }
}

async function updateLesson(req, res, next) {
  try {
    const lesson = await Lesson.findByPk(req.params.id);
    if (!lesson) throw new AppError('Lesson not found.', 404);

    const updates = { ...req.body };
    if (updates.contentHtml) {
      updates.contentHtml = sanitizeRichHtml(updates.contentHtml);
    }

    await lesson.update(updates);
    return res.status(200).json({ success: true, message: 'Lesson updated.', data: { lesson } });
  } catch (err) {
    return next(err);
  }
}

// Learning Resources & Protected Uploads
async function listResources(req, res, next) {
  try {
    const { courseId, moduleId, lessonId } = req.query;
    const where = {};
    if (courseId) where.courseId = Number(courseId);
    if (moduleId) where.moduleId = Number(moduleId);
    if (lessonId) where.lessonId = Number(lessonId);

    // TAs may only list resources for courses in their assigned sections.
    // This prevents enumeration of resources for unassigned courses.
    if (req.user.primaryRole === 'teaching_assistant') {
      const taAssignments = await TeachingAssistantAssignment.findAll({
        where: { taUserId: req.user.id },
        attributes: ['classId']
      });
      if (taAssignments.length === 0) {
        return res.status(200).json({ success: true, data: { resources: [] } });
      }
      // Resolve courseIds from assigned classIds
      const classSections = await ClassSection.findAll({
        where: { id: taAssignments.map((a) => a.classId) },
        include: [{ model: CourseOffering, as: 'courseOffering', attributes: ['courseId'] }]
      });
      const allowedCourseIds = [...new Set(
        classSections.map((c) => c.courseOffering?.courseId).filter(Boolean)
      )];
      if (allowedCourseIds.length === 0) {
        return res.status(200).json({ success: true, data: { resources: [] } });
      }
      // If an explicit courseId was requested, verify it's in the allowed set
      if (courseId && !allowedCourseIds.includes(Number(courseId))) {
        throw new AppError('Forbidden: You do not have access to resources for this course.', 403, 'CLASS_ACCESS_DENIED');
      }
      // Scope to only their courses if no explicit courseId was given
      if (!courseId) {
        where.courseId = allowedCourseIds;
      }
    }

    const resources = await LearningResource.findAll({
      where,
      order: [['id', 'DESC']]
    });

    return res.status(200).json({ success: true, data: { resources } });
  } catch (err) {
    return next(err);
  }
}

async function createResource(req, res, next) {
  try {
    const {
      courseId,
      moduleId,
      lessonId,
      title,
      description,
      resourceType = 'pdf',
      externalUrl,
      isDownloadable = true
    } = req.body;

    if (!courseId || !title) {
      throw new AppError('courseId and title are required.', 400);
    }

    // For TAs, verify they are assigned to a class that offers this course
    // and that their assignment has canUploadResources enabled.
    if (req.user.primaryRole === 'teaching_assistant') {
      const classSection = await ClassSection.findOne({
        include: [{
          model: CourseOffering,
          as: 'courseOffering',
          where: { courseId: Number(courseId) },
          required: true
        }]
      });
      if (!classSection) {
        throw new AppError('No class section found for this course.', 404, 'CLASS_NOT_FOUND');
      }
      // verifyClassAccess enforces canUploadResources per-class flag
      await verifyClassAccess(req.user, classSection.id, {
        allowAdmin: false,
        allowInstructor: false,
        allowTA: true,
        requiredTaFlag: 'canUploadResources'
      });
    }

    let fileData = {};
    if (req.file) {
      const fullPath = path.join(env.UPLOAD_DIR, req.file.filename);
      const isSafe = verifyUploadedFileSafety(fullPath);
      if (!isSafe) {
        fs.unlinkSync(fullPath);
        throw new AppError('Uploaded file failed binary safety inspection.', 400, 'UNSAFE_FILE_CONTENT');
      }
      fileData = {
        storedFilename: req.file.filename,
        originalFilename: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSizeBytes: req.file.size,
        fileUrl: `/api/resources/download/${req.file.filename}`
      };
    }

    const resource = await LearningResource.create({
      courseId: Number(courseId),
      moduleId: moduleId ? Number(moduleId) : null,
      lessonId: lessonId ? Number(lessonId) : null,
      title: sanitizePlainText(title),
      description: description ? sanitizePlainText(description) : null,
      resourceType,
      externalUrl: externalUrl || null,
      isDownloadable: isDownloadable !== 'false' && isDownloadable !== false,
      uploadedBy: req.user.id,
      ...fileData
    });

    await recordAudit({
      req,
      action: 'RESOURCE_UPLOADED',
      category: 'course',
      entityType: 'LearningResource',
      entityId: resource.id,
      metadata: { courseId: resource.courseId, title: resource.title, uploadedBy: req.user.id, role: req.user.primaryRole }
    });

    return res.status(201).json({
      success: true,
      message: 'Learning resource saved.',
      data: { resource }
    });
  } catch (err) {
    return next(err);
  }
}

async function downloadResourceFile(req, res, next) {
  try {
    const resource = await LearningResource.findByPk(req.params.id);
    if (!resource || !resource.storedFilename) {
      throw new AppError('Resource file not found.', 404);
    }

    // Verify the caller has access to at least one class section that offers this course.
    // Students, TAs, and instructors must be enrolled/assigned to access course files.
    // Admins always pass.
    if (!req.user.roles.includes('super_admin') && !req.user.roles.includes('academic_admin')) {
      const classSection = await ClassSection.findOne({
        include: [{
          model: CourseOffering,
          as: 'courseOffering',
          where: { courseId: resource.courseId },
          required: true
        }]
      });

      if (classSection) {
        // This will throw if the caller has no relationship to this class
        await verifyClassAccess(req.user, classSection.id, {
          allowAdmin: true,
          allowInstructor: true,
          allowTA: true,
          allowStudent: true
        });
      }
      // If no class section exists for this course, allow access (course-level public resource)
    }

    const safeName = path.basename(resource.storedFilename);
    const filePath = path.join(env.UPLOAD_DIR, safeName);
    if (!fs.existsSync(filePath)) {
      throw new AppError('Physical file is missing on server.', 404);
    }

    return res.download(filePath, resource.originalFilename || safeName);
  } catch (err) {
    return next(err);
  }
}

// Progress Tracking & Analytics
async function updateLessonProgress(req, res, next) {
  try {
    const { classId, lessonId, status = 'completed', timeSpentSeconds = 120 } = req.body;
    await verifyClassAccess(req.user, classId, { allowStudent: true, allowInstructor: true, allowAdmin: true });

    const lesson = await Lesson.findByPk(Number(lessonId));
    if (!lesson) throw new AppError('Lesson not found.', 404);

    const [progress, created] = await LessonProgress.findOrCreate({
      where: {
        classId: Number(classId),
        lessonId: lesson.id,
        studentId: req.user.id
      },
      defaults: {
        classId: Number(classId),
        courseId: lesson.courseId,
        lessonId: lesson.id,
        studentId: req.user.id,
        status,
        timeSpentSeconds: Number(timeSpentSeconds) || 0,
        lastAccessedAt: new Date(),
        completedAt: status === 'completed' ? new Date() : null
      }
    });

    if (!created) {
      await progress.update({
        status,
        timeSpentSeconds: (progress.timeSpentSeconds || 0) + (Number(timeSpentSeconds) || 0),
        lastAccessedAt: new Date(),
        completedAt: status === 'completed' ? (progress.completedAt || new Date()) : progress.completedAt
      });
    }

    const courseProgress = await recalculateStudentCourseProgress(Number(classId), req.user.id, lesson.id);

    return res.status(200).json({
      success: true,
      message: status === 'completed' ? 'Lesson marked as completed!' : 'Lesson progress saved.',
      data: { lessonProgress: progress, courseProgress }
    });
  } catch (err) {
    return next(err);
  }
}

async function getProgressAnalytics(req, res, next) {
  try {
    const { classId } = req.query;
    if (classId) {
      await verifyClassAccess(req.user, classId, { allowAdmin: true, allowInstructor: true, allowTA: true, allowStudent: true });
    }

    const where = {};
    if (classId) where.classId = Number(classId);
    if (req.user.primaryRole === 'student') {
      where.studentId = req.user.id;
    }

    // TAs do not need student email addresses — omit to minimise exposure
    // of personally identifiable information.
    const isTA = req.user.primaryRole === 'teaching_assistant';
    const studentAttrs = isTA
      ? ['id', 'firstName', 'lastName', 'studentNumber']
      : ['id', 'firstName', 'lastName', 'email', 'studentNumber'];

    const [courseProgress, lessonProgress] = await Promise.all([
      CourseProgress.findAll({
        where,
        include: [
          { model: User, as: 'student', attributes: studentAttrs }
        ]
      }),
      LessonProgress.findAll({
        where,
        include: [{ model: Lesson, as: 'lesson', attributes: ['id', 'title', 'moduleId'] }]
      })
    ]);

    return res.status(200).json({
      success: true,
      data: { courseProgress, lessonProgress }
    });
  } catch (err) {
    return next(err);
  }
}

// ============================================================================
// ATTACH FILE TO EXISTING LESSON
// ============================================================================
async function attachFileToLesson(req, res, next) {
  try {
    const lessonId = Number(req.params.id);
    const lesson = await Lesson.findByPk(lessonId);
    if (!lesson) throw new AppError('Lesson not found.', 404);

    if (!req.file) throw new AppError('File is required.', 400);

    const resource = await LearningResource.create({
      courseId: lesson.courseId,
      moduleId: lesson.moduleId,
      lessonId: lesson.id,
      title: req.body.title || req.file.originalname,
      description: req.body.description || 'Lesson attachment',
      resourceType: 'file',
      storedFilename: req.file.filename,
      originalFilename: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSizeBytes: req.file.size,
      uploadedBy: req.user.id
    });

    return res.status(201).json({
      success: true,
      message: 'File attached to lesson.',
      data: { resource }
    });
  } catch (err) { return next(err); }
}

async function deleteModule(req, res, next) {
  try {
    const mod = await Module.findByPk(Number(req.params.id));
    if (!mod) throw new AppError('Module not found.', 404);
    // Soft-delete by archiving
    await mod.update({ publicationStatus: 'archived' });
    return res.status(200).json({ success: true, message: 'Module archived.' });
  } catch (err) {
    return next(err);
  }
}

async function deleteLesson(req, res, next) {
  try {
    const lesson = await Lesson.findByPk(Number(req.params.id));
    if (!lesson) throw new AppError('Lesson not found.', 404);
    await lesson.update({ publicationStatus: 'archived' });
    return res.status(200).json({ success: true, message: 'Lesson archived.' });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listModules,
  createModule,
  updateModule,
  reorderModules,
  deleteModule,
  getLessonById,
  createLesson,
  updateLesson,
  deleteLesson,
  attachFileToLesson,
  listResources,
  createResource,
  downloadResourceFile,
  updateLessonProgress,
  getProgressAnalytics
};

