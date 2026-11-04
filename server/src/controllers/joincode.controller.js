'use strict';

const crypto = require('crypto');
const {
  ClassSection,
  ClassMembership,
  CourseOffering,
  Course,
  Semester,
  InstructorAssignment,
  User
} = require('../models');
const { AppError } = require('../middleware/error.middleware');
const { recordAudit } = require('../utils/auditLogger');
const { createNotification } = require('../utils/notifyUser');

/* ── Access check — allows admin OR instructor assigned to class
   OR instructor who teaches ANY class of the same course ────── */
async function checkInstructorAccess(user, classId) {
  if (!classId) throw new AppError('Invalid class ID.', 400);

  const isAdmin = user.roles?.includes('super_admin') || user.roles?.includes('academic_admin');
  if (isAdmin) return true;

  const classSection = await ClassSection.findByPk(classId, {
    include: [{ model: CourseOffering, as: 'courseOffering' }]
  });
  if (!classSection) throw new AppError('Class section not found.', 404);

  // Check direct assignment
  const directAssign = await InstructorAssignment.findOne({
    where: { classId, instructorId: user.id }
  });
  if (directAssign) return true;

  // Check if instructor teaches any other class of the same course
  const courseId = classSection.courseOffering?.courseId;
  if (courseId) {
    const offerings = await CourseOffering.findAll({ where: { courseId } });
    const offeringIds = offerings.map(o => o.id);
    if (offeringIds.length > 0) {
      const { Op } = require('sequelize');
      const relatedClasses = await ClassSection.findAll({
        where: { courseOfferingId: { [Op.in]: offeringIds } }
      });
      const relatedClassIds = relatedClasses.map(c => c.id);
      const anyAssign = await InstructorAssignment.findOne({
        where: { classId: { [Op.in]: relatedClassIds }, instructorId: user.id }
      });
      if (anyAssign) return true;
    }
  }

  // Also allow if course was created by this instructor
  const course = await Course.findByPk(courseId);
  if (course && course.createdBy === user.id) return true;

  throw new AppError('Forbidden: You do not have access to this class section.', 403);
}

/* ── Generate / toggle join code ────────────────────────── */
async function generateJoinCode(req, res, next) {
  try {
    const classId = Number(req.params.classId);
    await checkInstructorAccess(req.user, classId);

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

    let joinCode = classSection.joinCode;
    if (!joinCode || req.body.regenerate) {
      joinCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    }

    await classSection.update({ joinCode, joinCodeEnabled: true });

    await recordAudit({
      req, action: 'JOIN_CODE_GENERATED', category: 'academic',
      entityType: 'ClassSection', entityId: classId,
      metadata: { joinCode }
    });

    return res.status(200).json({
      success: true,
      message: 'Join code generated.',
      data: { joinCode, joinCodeEnabled: true, classId }
    });
  } catch (err) { return next(err); }
}

/* ── Student requests to join — creates PENDING membership ─ */
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
          model: CourseOffering, as: 'courseOffering',
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

    // Check capacity (only count enrolled/completed — pending don't consume a seat yet)
    const currentCount = await ClassMembership.count({
      where: { classId: classSection.id, status: ['enrolled', 'completed'] }
    });
    if (currentCount >= classSection.capacity) {
      throw new AppError('This class is full (' + classSection.capacity + ' students maximum).', 400, 'CLASS_FULL');
    }

    // Check already enrolled or pending
    const existing = await ClassMembership.findOne({
      where: { classId: classSection.id, studentId: req.user.id }
    });
    if (existing) {
      if (existing.status === 'pending') {
        throw new AppError('Your enrollment request is already pending instructor approval.', 409, 'ALREADY_PENDING');
      }
      throw new AppError('You are already enrolled in this class.', 409, 'ALREADY_ENROLLED');
    }

    // Create PENDING membership — waits for instructor approval
    const membership = await ClassMembership.create({
      classId: classSection.id,
      studentId: req.user.id,
      status: 'pending',
      enrolledAt: new Date()
    });

    // Notify the instructor
    const instructorAssignment = await InstructorAssignment.findOne({
      where: { classId: classSection.id, isPrimary: true },
      include: [{ model: User, as: 'instructor', attributes: ['id', 'firstName', 'lastName'] }]
    });

    if (instructorAssignment?.instructor) {
      await createNotification({
        userId: instructorAssignment.instructor.id,
        type: 'enrollment',
        title: 'New Enrollment Request — ' + classSection.sectionCode,
        message: req.user.fullName + ' wants to join your class. Please approve or reject.',
        destinationUrl: '/instructor/courses'
      });
    }

    await recordAudit({
      req, action: 'STUDENT_ENROLLMENT_REQUESTED', category: 'academic',
      entityType: 'ClassSection', entityId: classSection.id,
      metadata: { studentId: req.user.id, joinCode }
    });

    return res.status(201).json({
      success: true,
      message: 'Enrollment request submitted! Waiting for instructor approval.',
      data: {
        membership,
        status: 'pending',
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
  } catch (err) { return next(err); }
}

/* ── Get pending enrollments for a class (instructor) ────── */
async function getPendingEnrollments(req, res, next) {
  try {
    const classId = Number(req.params.classId);
    await checkInstructorAccess(req.user, classId);

    const pending = await ClassMembership.findAll({
      where: { classId, status: 'pending' },
      include: [
        { model: User, as: 'student', attributes: ['id', 'firstName', 'lastName', 'email', 'studentNumber'] }
      ],
      order: [['createdAt', 'ASC']]
    });

    return res.status(200).json({ success: true, data: { pending } });
  } catch (err) { return next(err); }
}

/* ── Approve a pending enrollment ─────────────────────────── */
async function approveEnrollment(req, res, next) {
  try {
    const membershipId = Number(req.params.membershipId);
    const membership = await ClassMembership.findByPk(membershipId, {
      include: [{ model: User, as: 'student', attributes: ['id', 'firstName', 'lastName', 'email'] }]
    });
    if (!membership) throw new AppError('Membership record not found.', 404);

    await checkInstructorAccess(req.user, membership.classId);

    if (membership.status !== 'pending') {
      throw new AppError('This enrollment is not pending approval.', 400);
    }

    await membership.update({ status: 'enrolled', enrolledAt: new Date() });

    // Notify student
    const cls = await ClassSection.findByPk(membership.classId, {
      include: [{ model: CourseOffering, as: 'courseOffering', include: [{ model: Course, as: 'course' }] }]
    });

    await createNotification({
      userId: membership.studentId,
      type: 'enrollment',
      title: 'Enrollment Approved!',
      message: 'You have been approved to join ' + (cls?.sectionCode || 'the class') + '. Welcome!',
      destinationUrl: '/student/dashboard'
    });

    await recordAudit({
      req, action: 'ENROLLMENT_APPROVED', category: 'academic',
      entityType: 'ClassMembership', entityId: membershipId,
      metadata: { studentId: membership.studentId, classId: membership.classId }
    });

    return res.status(200).json({
      success: true,
      message: membership.student?.firstName + ' ' + membership.student?.lastName + ' has been approved.',
      data: { membership }
    });
  } catch (err) { return next(err); }
}

/* ── Reject a pending enrollment ─────────────────────────── */
async function rejectEnrollment(req, res, next) {
  try {
    const membershipId = Number(req.params.membershipId);
    const { reason } = req.body;

    const membership = await ClassMembership.findByPk(membershipId, {
      include: [{ model: User, as: 'student', attributes: ['id', 'firstName', 'lastName'] }]
    });
    if (!membership) throw new AppError('Membership record not found.', 404);

    await checkInstructorAccess(req.user, membership.classId);

    await membership.destroy();

    // Notify student
    await createNotification({
      userId: membership.studentId,
      type: 'enrollment',
      title: 'Enrollment Request Declined',
      message: reason || 'Your enrollment request was not approved. Please contact your instructor.',
      destinationUrl: '/student/dashboard'
    });

    await recordAudit({
      req, action: 'ENROLLMENT_REJECTED', category: 'academic',
      entityType: 'ClassMembership', entityId: membershipId,
      metadata: { studentId: membership.studentId, classId: membership.classId, reason }
    });

    return res.status(200).json({
      success: true,
      message: membership.student?.firstName + ' ' + membership.student?.lastName + '\'s request has been rejected.'
    });
  } catch (err) { return next(err); }
}

/* ── Get join code info (for instructor) ─────────────────── */
async function getJoinCodeInfo(req, res, next) {
  try {
    const classId = Number(req.params.classId);
    await checkInstructorAccess(req.user, classId);

    const classSection = await ClassSection.findByPk(classId, {
      attributes: ['id', 'sectionCode', 'joinCode', 'joinCodeEnabled', 'capacity'],
      include: [{ model: ClassMembership, as: 'memberships', attributes: ['id', 'status'] }]
    });
    if (!classSection) throw new AppError('Class not found.', 404);

    const memberships = classSection.memberships || [];

    return res.status(200).json({
      success: true,
      data: {
        joinCode: classSection.joinCode,
        joinCodeEnabled: classSection.joinCodeEnabled,
        enrolledCount: memberships.filter(m => ['enrolled', 'completed'].includes(m.status)).length,
        pendingCount: memberships.filter(m => m.status === 'pending').length,
        capacity: classSection.capacity
      }
    });
  } catch (err) { return next(err); }
}

module.exports = {
  generateJoinCode,
  joinClassByCode,
  getJoinCodeInfo,
  getPendingEnrollments,
  approveEnrollment,
  rejectEnrollment
};
