const { Op } = require('sequelize');
const {
  sequelize,
  Announcement,
  DiscussionThread,
  DiscussionPost,
  Conversation,
  ConversationMember,
  Message,
  Notification,
  ClassMembership,
  ClassSection,
  CourseOffering,
  Course,
  Department,
  User
} = require('../models');
const { AppError } = require('../middleware/error.middleware');
const { verifyClassAccess } = require('../middleware/auth.middleware');
const { sanitizePlainText } = require('../utils/sanitizer');
const { createNotification } = require('../utils/notifyUser');
const { recordAudit } = require('../utils/auditLogger');
const { createAnnouncementSchema, updateAnnouncementSchema } = require('../validators/schemas');

// ─── Announcement Helpers ────────────────────────────────────────────────────

/** Standard eager-load config reused across list and get. */
const ANNOUNCEMENT_INCLUDE = [
  { model: User,         as: 'author',       attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl'] },
  { model: ClassSection, as: 'classSection', attributes: ['id', 'sectionCode', 'name'] },
  { model: Course,       as: 'course',       attributes: ['id', 'code', 'title'] },
  { model: Department,   as: 'department',   attributes: ['id', 'code', 'name'] }
];

/**
 * Fan-out notifications to every user relevant to an announcement's scope.
 * - institution → all active enrolled students
 * - department  → enrolled students whose class belongs to a course in that dept
 * - course      → enrolled students in any class of that course
 * - class       → enrolled students in that specific class
 */
async function fanOutNotifications(announcement) {
  const { scope, classId, courseId, departmentId, title, content } = announcement;
  const notifTitle   = `New Announcement: ${title}`;
  const notifMessage = content.slice(0, 140);
  const destUrl      = '/announcements';

  let memberships = [];

  if (scope === 'institution') {
    memberships = await ClassMembership.findAll({ where: { status: 'enrolled' } });
  } else if (scope === 'department' && departmentId) {
    // Find all class sections whose course offering → course → department matches
    const classes = await ClassSection.findAll({
      include: [{
        model: CourseOffering,
        as: 'courseOffering',
        include: [{ model: Course, as: 'course', where: { departmentId }, attributes: ['id'] }],
        attributes: ['id']
      }]
    });
    const classIds = classes.map((c) => c.id);
    if (classIds.length) {
      memberships = await ClassMembership.findAll({ where: { classId: classIds, status: 'enrolled' } });
    }
  } else if (scope === 'course' && courseId) {
    const offerings = await CourseOffering.findAll({ where: { courseId }, attributes: ['id'] });
    const offeringIds = offerings.map((o) => o.id);
    if (offeringIds.length) {
      const classes = await ClassSection.findAll({ where: { courseOfferingId: offeringIds }, attributes: ['id'] });
      const classIds = classes.map((c) => c.id);
      if (classIds.length) {
        memberships = await ClassMembership.findAll({ where: { classId: classIds, status: 'enrolled' } });
      }
    }
  } else if (scope === 'class' && classId) {
    memberships = await ClassMembership.findAll({ where: { classId, status: 'enrolled' } });
  }

  // De-duplicate by studentId before firing notifications
  const seen = new Set();
  for (const m of memberships) {
    if (seen.has(m.studentId)) continue;
    seen.add(m.studentId);
    await createNotification({
      userId: m.studentId,
      type: 'announcement',
      title: notifTitle,
      message: notifMessage,
      destinationUrl: destUrl
    });
  }
}

// ─── Announcements ────────────────────────────────────────────────────────────

async function listAnnouncements(req, res, next) {
  try {
    const { scope, classId, courseId, departmentId, priority, isPinned, search } = req.query;
    const where = {};

    if (scope)        where.scope        = scope;
    if (classId)      where.classId      = Number(classId);
    if (courseId)     where.courseId     = Number(courseId);
    if (departmentId) where.departmentId = Number(departmentId);
    if (priority)     where.priority     = priority;
    if (isPinned !== undefined) where.isPinned = isPinned === 'true';

    // Only surface non-expired announcements unless caller has manage permission
    const canManage = req.user.permissions.includes('announcements:manage');
    if (!canManage) {
      where[Op.or] = [{ expiresAt: null }, { expiresAt: { [Op.gt]: new Date() } }];
    }

    // Keyword search across title and content
    if (search && String(search).trim()) {
      const term = `%${String(search).trim()}%`;
      where[Op.and] = [
        ...(where[Op.and] || []),
        { [Op.or]: [
          { title:   { [Op.like]: term } },
          { content: { [Op.like]: term } }
        ]}
      ];
    }

    const announcements = await Announcement.findAll({
      where,
      include: ANNOUNCEMENT_INCLUDE,
      order: [
        ['isPinned',  'DESC'],
        ['createdAt', 'DESC']
      ]
    });

    return res.status(200).json({ success: true, data: { announcements } });
  } catch (err) {
    return next(err);
  }
}

async function getAnnouncementById(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) throw new AppError('Invalid announcement ID.', 400);

    const announcement = await Announcement.findByPk(id, { include: ANNOUNCEMENT_INCLUDE });
    if (!announcement) throw new AppError('Announcement not found.', 404, 'ANNOUNCEMENT_NOT_FOUND');

    return res.status(200).json({ success: true, data: { announcement } });
  } catch (err) {
    return next(err);
  }
}

async function createAnnouncement(req, res, next) {
  try {
    const payload = createAnnouncementSchema.parse(req.body);

    const {
      scope, departmentId, courseId, classId,
      title, content, priority, isPinned, publishAt, expiresAt
    } = payload;

    // For class-scoped announcements, verify the caller has access to that class
    if (classId) {
      await verifyClassAccess(req.user, classId, { allowAdmin: true, allowInstructor: true });
    }

    const announcement = await Announcement.create({
      scope,
      departmentId: departmentId ?? null,
      courseId:     courseId     ?? null,
      classId:      classId      ?? null,
      title:        sanitizePlainText(title),
      content:      sanitizePlainText(content),
      priority,
      isPinned:     Boolean(isPinned),
      publishAt:    publishAt  || new Date(),
      expiresAt:    expiresAt  || null,
      authorId:     req.user.id
    });

    await recordAudit({
      req,
      action:     'ANNOUNCEMENT_CREATED',
      category:   'system',
      entityType: 'Announcement',
      entityId:   announcement.id,
      metadata:   { scope, title: announcement.title, priority }
    });

    // Fan-out notifications to relevant users
    await fanOutNotifications(announcement);

    // Re-fetch with associations for the response
    const full = await Announcement.findByPk(announcement.id, { include: ANNOUNCEMENT_INCLUDE });

    return res.status(201).json({
      success: true,
      message: 'Announcement published.',
      data: { announcement: full }
    });
  } catch (err) {
    return next(err);
  }
}

async function updateAnnouncement(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) throw new AppError('Invalid announcement ID.', 400);

    const announcement = await Announcement.findByPk(id);
    if (!announcement) throw new AppError('Announcement not found.', 404, 'ANNOUNCEMENT_NOT_FOUND');

    const payload = updateAnnouncementSchema.parse(req.body);

    // If changing to class scope or the announcement already had a classId, verify access
    const targetClassId = payload.classId ?? announcement.classId;
    if (targetClassId) {
      await verifyClassAccess(req.user, targetClassId, { allowAdmin: true, allowInstructor: true });
    }

    const updates = {};
    if (payload.title       !== undefined) updates.title       = sanitizePlainText(payload.title);
    if (payload.content     !== undefined) updates.content     = sanitizePlainText(payload.content);
    if (payload.priority    !== undefined) updates.priority    = payload.priority;
    if (payload.isPinned    !== undefined) updates.isPinned    = Boolean(payload.isPinned);
    if (payload.publishAt   !== undefined) updates.publishAt   = payload.publishAt   || null;
    if (payload.expiresAt   !== undefined) updates.expiresAt   = payload.expiresAt   || null;
    if (payload.scope       !== undefined) updates.scope       = payload.scope;
    if (payload.departmentId !== undefined) updates.departmentId = payload.departmentId ?? null;
    if (payload.courseId    !== undefined) updates.courseId    = payload.courseId    ?? null;
    if (payload.classId     !== undefined) updates.classId     = payload.classId     ?? null;

    await announcement.update(updates);

    await recordAudit({
      req,
      action:     'ANNOUNCEMENT_UPDATED',
      category:   'system',
      entityType: 'Announcement',
      entityId:   announcement.id,
      metadata:   { updatedFields: Object.keys(updates) }
    });

    const full = await Announcement.findByPk(announcement.id, { include: ANNOUNCEMENT_INCLUDE });

    return res.status(200).json({
      success: true,
      message: 'Announcement updated.',
      data: { announcement: full }
    });
  } catch (err) {
    return next(err);
  }
}

async function deleteAnnouncement(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) throw new AppError('Invalid announcement ID.', 400);

    const announcement = await Announcement.findByPk(id);
    if (!announcement) throw new AppError('Announcement not found.', 404, 'ANNOUNCEMENT_NOT_FOUND');

    await recordAudit({
      req,
      action:     'ANNOUNCEMENT_DELETED',
      category:   'system',
      entityType: 'Announcement',
      entityId:   announcement.id,
      metadata:   { title: announcement.title, scope: announcement.scope }
    });

    await announcement.destroy();

    return res.status(200).json({
      success: true,
      message: 'Announcement deleted.'
    });
  } catch (err) {
    return next(err);
  }
}

async function toggleAnnouncementPin(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) throw new AppError('Invalid announcement ID.', 400);

    const announcement = await Announcement.findByPk(id);
    if (!announcement) throw new AppError('Announcement not found.', 404, 'ANNOUNCEMENT_NOT_FOUND');

    const newPinState = !announcement.isPinned;
    await announcement.update({ isPinned: newPinState });

    await recordAudit({
      req,
      action:     newPinState ? 'ANNOUNCEMENT_PINNED' : 'ANNOUNCEMENT_UNPINNED',
      category:   'system',
      entityType: 'Announcement',
      entityId:   announcement.id,
      metadata:   { title: announcement.title }
    });

    return res.status(200).json({
      success: true,
      message: `Announcement ${newPinState ? 'pinned' : 'unpinned'}.`,
      data: { isPinned: newPinState }
    });
  } catch (err) {
    return next(err);
  }
}

// Discussions
async function listDiscussions(req, res, next) {
  try {
    const { classId, courseId } = req.query;
    const where = {};
    if (classId) where.classId = Number(classId);
    if (courseId) where.courseId = Number(courseId);

    const threads = await DiscussionThread.findAll({
      where,
      include: [
        { model: User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: ClassSection, as: 'classSection', attributes: ['id', 'sectionCode', 'name'] },
        {
          model: DiscussionPost,
          as: 'posts',
          include: [{ model: User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'email'] }]
        }
      ],
      order: [
        ['isPinned', 'DESC'],
        ['createdAt', 'DESC']
      ]
    });

    return res.status(200).json({ success: true, data: { threads } });
  } catch (err) {
    return next(err);
  }
}

async function createDiscussionThread(req, res, next) {
  try {
    const { classId, courseId, lessonId, title, body, category = 'lecture_question' } = req.body;
    if (!classId || !title || !body) {
      throw new AppError('classId, title, and body are required.', 400);
    }

    const { classSection } = await verifyClassAccess(req.user, classId, {
      allowAdmin: true,
      allowInstructor: true,
      allowTA: true,
      allowStudent: true
    });

    const resolvedCourseId = courseId ? Number(courseId) : (classSection.courseOffering?.courseId || 1);

    const thread = await DiscussionThread.create({
      classId: Number(classId),
      courseId: resolvedCourseId,
      lessonId: lessonId ? Number(lessonId) : null,
      authorId: req.user.id,
      title: sanitizePlainText(title),
      body: sanitizePlainText(body),
      category
    });

    return res.status(201).json({
      success: true,
      message: 'Discussion thread created.',
      data: { thread }
    });
  } catch (err) {
    return next(err);
  }
}

async function replyToDiscussionThread(req, res, next) {
  try {
    const threadId = Number(req.params.threadId);
    const { body } = req.body;
    if (!body || !String(body).trim()) {
      throw new AppError('Reply body is required.', 400);
    }

    const thread = await DiscussionThread.findByPk(threadId);
    if (!thread) throw new AppError('Discussion thread not found.', 404);

    await verifyClassAccess(req.user, thread.classId, {
      allowAdmin: true,
      allowInstructor: true,
      allowTA: true,
      allowStudent: true
    });

    const isInstructorOrTa = ['instructor', 'teaching_assistant'].includes(req.user.primaryRole);

    const post = await DiscussionPost.create({
      threadId: thread.id,
      authorId: req.user.id,
      body: sanitizePlainText(body),
      isInstructorEndorsed: isInstructorOrTa
    });

    return res.status(201).json({
      success: true,
      message: 'Reply posted.',
      data: { post }
    });
  } catch (err) {
    return next(err);
  }
}

async function escalateOrResolveDiscussion(req, res, next) {
  try {
    const threadId = Number(req.params.threadId);
    const { isResolved, isEscalated, escalationNote } = req.body;

    const thread = await DiscussionThread.findByPk(threadId);
    if (!thread) throw new AppError('Discussion thread not found.', 404);

    await verifyClassAccess(req.user, thread.classId, {
      allowAdmin: true,
      allowInstructor: true,
      allowTA: true
    });

    await thread.update({
      isResolved: isResolved !== undefined ? Boolean(isResolved) : thread.isResolved,
      isEscalated: isEscalated !== undefined ? Boolean(isEscalated) : thread.isEscalated,
      escalationNote: escalationNote !== undefined ? escalationNote : thread.escalationNote
    });

    return res.status(200).json({
      success: true,
      message: 'Discussion status updated.',
      data: { thread }
    });
  } catch (err) {
    return next(err);
  }
}

// Private Messaging (Strict Conversation Membership Enforcement)
async function listConversations(req, res, next) {
  try {
    const memberLinks = await ConversationMember.findAll({
      where: { userId: req.user.id }
    });
    const convIds = memberLinks.map((m) => m.conversationId);

    const conversations = convIds.length
      ? await Conversation.findAll({
          where: { id: convIds },
          include: [
            {
              model: ConversationMember,
              as: 'members',
              include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] }]
            },
            {
              model: Message,
              as: 'messages',
              include: [{ model: User, as: 'sender', attributes: ['id', 'firstName', 'lastName'] }]
            }
          ],
          order: [['lastMessageAt', 'DESC']]
        })
      : [];

    return res.status(200).json({ success: true, data: { conversations } });
  } catch (err) {
    return next(err);
  }
}

async function startOrSendMessage(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const { conversationId, recipientId, subject, body, classId } = req.body;
    if (!body || !String(body).trim()) {
      throw new AppError('Message body is required.', 400);
    }

    let conv;
    if (conversationId) {
      conv = await Conversation.findByPk(Number(conversationId), { transaction: t });
      if (!conv) throw new AppError('Conversation not found.', 404);

      const isMember = await ConversationMember.findOne({
        where: { conversationId: conv.id, userId: req.user.id },
        transaction: t
      });
      if (!isMember) {
        throw new AppError('Forbidden: You are not a member of this private conversation.', 403, 'PRIVATE_CONVERSATION_DENIED');
      }
      await conv.update({ lastMessageAt: new Date() }, { transaction: t });
    } else {
      if (!recipientId || !subject) {
        throw new AppError('recipientId and subject are required to start a new conversation.', 400);
      }
      conv = await Conversation.create({
        subject: sanitizePlainText(subject),
        classId: classId ? Number(classId) : null,
        createdBy: req.user.id,
        lastMessageAt: new Date()
      }, { transaction: t });

      await ConversationMember.bulkCreate([
        { conversationId: conv.id, userId: req.user.id, lastReadAt: new Date() },
        { conversationId: conv.id, userId: Number(recipientId), lastReadAt: null }
      ], { transaction: t });
    }

    const message = await Message.create({
      conversationId: conv.id,
      senderId: req.user.id,
      body: sanitizePlainText(body)
    }, { transaction: t });

    await t.commit();

    if (recipientId) {
      await createNotification({
        userId: Number(recipientId),
        type: 'message',
        title: `New Message from ${req.user.fullName}`,
        message: body.slice(0, 100),
        destinationUrl: '/messages'
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Message sent.',
      data: { conversationId: conv.id, message }
    });
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

// Notifications
async function listNotifications(req, res, next) {
  try {
    const notifications = await Notification.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return res.status(200).json({
      success: true,
      data: { notifications, unreadCount }
    });
  } catch (err) {
    return next(err);
  }
}

async function markNotificationRead(req, res, next) {
  try {
    const { id } = req.params;
    if (id === 'all') {
      await Notification.update(
        { isRead: true, readAt: new Date() },
        { where: { userId: req.user.id, isRead: false } }
      );
      return res.status(200).json({ success: true, message: 'All notifications marked as read.' });
    }

    const notif = await Notification.findOne({
      where: { id: Number(id), userId: req.user.id }
    });
    if (!notif) throw new AppError('Notification not found.', 404);

    await notif.update({ isRead: true, readAt: new Date() });
    return res.status(200).json({ success: true, data: { notification: notif } });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  toggleAnnouncementPin,
  listDiscussions,
  createDiscussionThread,
  replyToDiscussionThread,
  escalateOrResolveDiscussion,
  listConversations,
  startOrSendMessage,
  listNotifications,
  markNotificationRead
};

