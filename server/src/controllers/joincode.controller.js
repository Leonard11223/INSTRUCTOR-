'use strict';

const crypto = require('crypto');
const {
  ClassSection,
  ClassMembership,
  CourseOffering,
  Course,
  Semester,
  InstructorAssignment,
  TeachingAssistantAssignment,
  User,
  GradeCategory
} = require('../models');
const { AppError } = require('../middleware/error.middleware');
const { verifyClassAccess } = require('../middleware/auth.middleware');
const { recordAudit } = require('../utils/auditLogger');
const { createNotification } = require('../utils/notifyUser');

/* ── Generate / toggle join code ────────────────────────── */
async function generateJoinCode(req, res, next) {
  try {
    const classId = Number(req.params.classId);
    await verifyClassAccess(req.user, classId, { allowAdmin: true, allowInstructor: true });

    const classSection = await ClassSection.findByPk(classId);
    if (!classSection) throw new AppError('Class section not found.', 404);

    const { enable = true } = req.body;

    if (!enable) {
      await classSection.update({ joinCodeEnabled: false });
      return res.status(200).json({
        success: true,
        message: 'Join code disabled.',
        data: { joinCode: classSection.joinCode, joinCodeEnabled: false }
      });
    }

    // Generate a new 8-character alphanumeric code
    let joinCode = classSection.joinCode;
    if (!joinCode || req.body.regenerate) {
      joinCode = crypto.randomBytes(4).toString('hex').toUpperCase(); // e.g. "3F9A2C1B"
    }

    await classSection.update({ joinCode, joinCodeEnabled: true });

    await recordAudit({
      req,
      action: 'JOIN_CODE_GENERATED',
      category: 'academic',
      entityType: 'ClassSection',
      entityId: classId,
      metadata: { joinCode }
    });

    return res.status(200).json({
      success: true,
      message: 'Join code generated.',
      data: { joinCode, joinCodeEnabled: true, classId }
    });
  } catch (err) {
    return next(err);
  }
}

/* ── Student joins a class using code ───────────────────── */
async function joinClassByCode(req, res, next) {
  try {
    const { joinCode } = req.body;
    if (!joinCode || !String(joinCode).trim()) {
      throw new AppError('Join code is required.', 400);
    }

    const classSection = await ClassSection.findOne({
      where: { joinCode: String(joinCode).trim().toUpperCase(), joinCodeEnabled: true },
      include: [
        {
          model: CourseOffering,
          as: 'courseOffering',
          include: [
            { model: Course, as: 'course' },
            { model: Semester, as: 'semester' }
          ]
        }
      ]
    });

    if (!classSection) {
      throw new AppError('Invalid or expired join code. Please check the code and try again.', 404, 'INVALID_JOIN_CODE');
    }

    if (classSection.status !== 'active') {
      throw new AppError('This class is no longer accepting new students.', 400);
    }

    // Check capacity
    const currentCount = await ClassMembership.count({ where: { classId: classSection.id, status: ['enrolled', 'completed'] } });
    if (currentCount >= classSection.capacity) {
      throw new AppError(`This class is full (${classSection.capacity} students maximum).`, 400, 'CLASS_FULL');
    }

    // Check already enrolled
    const existing = await ClassMembership.findOne({
      where: { classId: classSection.id, studentId: req.user.id }
    });
    if (existing) {
      throw new AppError('You are already enrolled in this class.', 409, 'ALREADY_ENROLLED');
    }

    // Enroll the student
    const membership = await ClassMembership.create({
      classId: classSection.id,
      studentId: req.user.id,
      status: 'enrolled',
      enrolledAt: new Date()
    });

    // Notify instructor
    const instructorAssignment = await InstructorAssignment.findOne({
      where: { classId: classSection.id, isPrimary: true },
      include: [{ model: User, as: 'instructor', attributes: ['id', 'firstName', 'lastName'] }]
    });

    if (instructorAssignment?.instructor) {
      await createNotification({
        userId: instructorAssignment.instructor.id,
        type: 'enrollment',
        title: `New Student Joined: ${classSection.sectionCode}`,
        message: `${req.user.fullName} joined your class using the join code.`,
        destinationUrl: '/instructor/classes'
      });
    }

    // Notify TAs: roster has a new student — no student identity exposed
    const taAssignments = await TeachingAssistantAssignment.findAll({
      where: { classId: classSection.id, canViewRoster: true }
    });
    for (const ta of taAssignments) {
      await createNotification({
        userId: ta.taUserId,
        type: 'enrollment',
        title: `New Student Joined: ${classSection.sectionCode}`,
        message: `A student has joined ${classSection.sectionCode} using the class join code. Your roster has been updated.`,
        destinationUrl: '/ta/classes'
      });
    }

    await recordAudit({
      req,
      action: 'STUDENT_JOINED_BY_CODE',
      category: 'academic',
      entityType: 'ClassSection',
      entityId: classSection.id,
      metadata: { studentId: req.user.id, joinCode }
    });

    return res.status(201).json({
      success: true,
      message: `Successfully joined ${classSection.courseOffering?.course?.title || classSection.sectionCode}!`,
      data: {
        membership,
        classSection: {
          id: classSection.id,
          sectionCode: classSection.sectionCode,
          name: classSection.name,
          schedule: classSection.schedule,
          room: classSection.room,
          courseTitle: classSection.courseOffering?.course?.title,
          courseCode: classSection.courseOffering?.course?.code,
          semester: classSection.courseOffering?.semester?.name
        }
      }
    });
  } catch (err) {
    return next(err);
  }
}

/* ── Get join code info (for instructor) ─────────────────── */
async function getJoinCodeInfo(req, res, next) {
  try {
    const classId = Number(req.params.classId);
    await verifyClassAccess(req.user, classId, { allowAdmin: true, allowInstructor: true });

    const classSection = await ClassSection.findByPk(classId, {
      attributes: ['id', 'sectionCode', 'joinCode', 'joinCodeEnabled', 'capacity'],
      include: [
        { model: ClassMembership, as: 'memberships', attributes: ['id', 'status'] }
      ]
    });
    if (!classSection) throw new AppError('Class not found.', 404);

    return res.status(200).json({
      success: true,
      data: {
        joinCode: classSection.joinCode,
        joinCodeEnabled: classSection.joinCodeEnabled,
        enrolledCount: (classSection.memberships || []).filter(m => ['enrolled','completed'].includes(m.status)).length,
        capacity: classSection.capacity
      }
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { generateJoinCode, joinClassByCode, getJoinCodeInfo };
