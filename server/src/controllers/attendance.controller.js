'use strict';

const {
  AttendanceSession,
  AttendanceRecord,
  ClassMembership,
  ClassSection,
  User,
  InstructorAssignment
} = require('../models');
const { AppError } = require('../middleware/error.middleware');
const { verifyClassAccess } = require('../middleware/auth.middleware');
const { recordAudit } = require('../utils/auditLogger');

/* ── List sessions for a class ───────────────────────────── */
async function listSessions(req, res, next) {
  try {
    const classId = Number(req.query.classId);
    if (!classId) throw new AppError('classId is required.', 400);
    await verifyClassAccess(req.user, classId, { allowAdmin: true, allowInstructor: true, allowTA: true });

    const sessions = await AttendanceSession.findAll({
      where: { classId },
      include: [
        { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName'] },
        {
          model: AttendanceRecord, as: 'records',
          include: [{ model: User, as: 'student', attributes: ['id', 'firstName', 'lastName', 'studentNumber'] }]
        }
      ],
      order: [['sessionDate', 'DESC']]
    });

    return res.status(200).json({ success: true, data: { sessions } });
  } catch (err) { return next(err); }
}

/* ── Create session + bulk-stamp all enrolled students absent ─ */
async function createSession(req, res, next) {
  try {
    const { classId, sessionDate, topic } = req.body;
    if (!classId || !sessionDate) throw new AppError('classId and sessionDate are required.', 400);

    // TAs may create attendance sessions when canManageDiscussions is enabled on their
    // assignment — this flag represents general in-class management authority.
    // Without this fix the route allowed TAs but the controller always rejected them.
    await verifyClassAccess(req.user, classId, {
      allowAdmin: true,
      allowInstructor: true,
      allowTA: true,
      requiredTaFlag: 'canManageDiscussions'
    });

    // Validate sessionDate is a plausible date and sanitize topic
    if (!sessionDate || Number.isNaN(Date.parse(sessionDate))) {
      throw new AppError('sessionDate must be a valid date.', 400, 'INVALID_SESSION_DATE');
    }

    const session = await AttendanceSession.create({
      classId: Number(classId),
      sessionDate,
      topic: topic ? String(topic).slice(0, 255) : null,
      createdBy: req.user.id
    });

    // Pre-populate all enrolled students as 'absent'
    const members = await ClassMembership.findAll({
      where: { classId: Number(classId), status: ['enrolled'] }
    });
    if (members.length > 0) {
      await AttendanceRecord.bulkCreate(
        members.map(m => ({
          sessionId: session.id,
          classId: Number(classId),
          studentId: m.studentId,
          status: 'absent'
        })),
        { ignoreDuplicates: true }
      );
    }

    await recordAudit({ req, action: 'ATTENDANCE_SESSION_CREATED', category: 'academic',
      entityType: 'AttendanceSession', entityId: session.id,
      metadata: { classId, sessionDate } });

    const full = await AttendanceSession.findByPk(session.id, {
      include: [{
        model: AttendanceRecord, as: 'records',
        include: [{ model: User, as: 'student', attributes: ['id', 'firstName', 'lastName', 'studentNumber'] }]
      }]
    });

    return res.status(201).json({ success: true, message: 'Attendance session created.', data: { session: full } });
  } catch (err) { return next(err); }
}

/* ── Update a single record (present/absent/late/excused) ─── */
async function updateRecord(req, res, next) {
  try {
    const recordId = Number(req.params.recordId);
    const { status, remarks } = req.body;

    const record = await AttendanceRecord.findByPk(recordId);
    if (!record) throw new AppError('Attendance record not found.', 404);
    await verifyClassAccess(req.user, record.classId, { allowAdmin: true, allowInstructor: true, allowTA: true });

    await record.update({ status, remarks: remarks || null });
    return res.status(200).json({ success: true, message: 'Attendance updated.', data: { record } });
  } catch (err) { return next(err); }
}

/* ── Bulk-save full session (array of { studentId, status }) ─ */
async function saveSessionRecords(req, res, next) {
  try {
    const sessionId = Number(req.params.sessionId);
    const { records } = req.body; // [{ studentId, status, remarks }]

    const session = await AttendanceSession.findByPk(sessionId);
    if (!session) throw new AppError('Session not found.', 404);
    await verifyClassAccess(req.user, session.classId, { allowAdmin: true, allowInstructor: true, allowTA: true });

    for (const r of records) {
      await AttendanceRecord.upsert({
        sessionId,
        classId: session.classId,
        studentId: Number(r.studentId),
        status: r.status || 'present',
        remarks: r.remarks || null
      });
    }

    await recordAudit({ req, action: 'ATTENDANCE_SAVED', category: 'academic',
      entityType: 'AttendanceSession', entityId: sessionId });

    return res.status(200).json({ success: true, message: 'Attendance saved.' });
  } catch (err) { return next(err); }
}

/* ── Get attendance summary for a class (per-student totals) ─ */
async function getClassAttendanceSummary(req, res, next) {
  try {
    const classId = Number(req.query.classId);
    if (!classId) throw new AppError('classId is required.', 400);
    await verifyClassAccess(req.user, classId, { allowAdmin: true, allowInstructor: true, allowTA: true, allowStudent: true });

    const sessions = await AttendanceSession.findAll({ where: { classId } });
    const records  = await AttendanceRecord.findAll({
      where: { classId },
      include: [{ model: User, as: 'student', attributes: ['id', 'firstName', 'lastName', 'studentNumber'] }]
    });

    const totalSessions = sessions.length;
    const byStudent = {};
    for (const r of records) {
      if (!byStudent[r.studentId]) {
        byStudent[r.studentId] = {
          studentId: r.studentId,
          studentName: r.student ? `${r.student.firstName} ${r.student.lastName}` : `#${r.studentId}`,
          studentNumber: r.student?.studentNumber,
          present: 0, absent: 0, late: 0, excused: 0
        };
      }
      byStudent[r.studentId][r.status]++;
    }

    const summary = Object.values(byStudent).map(s => ({
      ...s,
      totalSessions,
      attendanceRate: totalSessions > 0
        ? Number(((s.present + s.late + s.excused) / totalSessions * 100).toFixed(1))
        : 0
    }));

    return res.status(200).json({ success: true, data: { sessions, summary, totalSessions } });
  } catch (err) { return next(err); }
}

module.exports = {
  listSessions,
  createSession,
  updateRecord,
  saveSessionRecords,
  getClassAttendanceSummary
};
