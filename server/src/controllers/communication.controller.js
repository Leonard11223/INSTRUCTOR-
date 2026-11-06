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
  InstructorAssignment,
  TeachingAssistantAssignment,
  AuditLog,
  User
} = require('../models');
const { AppError } = require('../middleware/error.middleware');
const { verifyClassAccess } = require('../middleware/auth.middleware');
const { sanitizePlainText } = require('../utils/sanitizer');
const { createNotification } = require('../utils/notifyUser');
const { recordAudit } = require('../utils/auditLogger');

// Announcements
async function listAnnouncements(req, res, next) {
  try {
    const { scope, classId, courseId, showScheduled } = req.query;
    const where = {};
    if (scope) where.scope = scope;
    if (classId) where.classId = Number(classId);
    if (courseId) where.courseId = Number(courseId);

    // Non-admin roles only see published announcements (publishAt <= now)
    const isAdmin = req.user.roles?.includes('super_admin') || req.user.roles?.includes('academic_admin');
    const isInstructor = req.user.roles?.includes('instructor');
    if (!isAdmin && !(isInstructor && showScheduled === 'true')) {
      where.publishAt = { [require('sequelize').Op.lte]: new Date() };
    }

    // Filter out expired announcements for non-staff
    if (!isAdmin && !isInstructor) {
      where[require('sequelize').Op.or] = [
        { expiresAt: null },
        { expiresAt: { [require('sequelize').Op.gt]: new Date() } }
      ];
    }

    const announcements = await Announcement.findAll({
      where,
      include: [
        { model: User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: ClassSection, as: 'classSection', attributes: ['id', 'sectionCode', 'name'] }
      ],
      order: [
        ['isPinned', 'DESC'],
        ['publishAt', 'DESC'],
        ['createdAt', 'DESC']
      ]
    });

    return res.status(200).json({ success: true, data: { announcements } });
  } catch (err) {
    return next(err);
  }
}

async function createAnnouncement(req, res, next) {
  try {
    const {
      scope = 'class',
      departmentId,
      courseId,
      classId,
      title,
      content,
      priority = 'normal',
      isPinned = false,
      expiresAt,
      publishAt
    } = req.body;

    if (!title || !content) {
      throw new AppError('Announcement title and content are required.', 400);
    }

    if (classId) {
      await verifyClassAccess(req.user, classId, { allowAdmin: true, allowInstructor: true });
    }

    const announcement = await Announcement.create({
      scope,
      departmentId: departmentId ? Number(departmentId) : null,
      courseId: courseId ? Number(courseId) : null,
      classId: classId ? Number(classId) : null,
      title: sanitizePlainText(title),
      content: sanitizePlainText(content),
      priority,
      isPinned: Boolean(isPinned),
      expiresAt: expiresAt || null,
      publishAt: publishAt ? new Date(publishAt) : new Date(),
      authorId: req.user.id
    });

    if (classId) {
      const members = await ClassMembership.findAll({ where: { classId: Number(classId), status: 'enrolled' } });
      for (const m of members) {
        await createNotification({
          userId: m.studentId,
          type: 'announcement',
          title: `New Announcement: ${announcement.title}`,
          message: announcement.content.slice(0, 140),
          destinationUrl: '/student/announcements'
        });
      }

      // Notify TAs assigned to this section — they should see class announcements
      // to stay informed and be able to answer student questions about them.
      const taAssignments = await TeachingAssistantAssignment.findAll({
        where: { classId: Number(classId) }
      });
      for (const ta of taAssignments) {
        await createNotification({
          userId: ta.taUserId,
          type: 'announcement',
          title: `New Announcement: ${announcement.title}`,
          message: announcement.content.slice(0, 140),
          destinationUrl: '/ta/announcements'
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Announcement published.',
      data: { announcement }
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

    // TAs may only see discussions from their explicitly assigned sections.
    // This prevents them from reading unassigned class discussions by omitting classId.
    if (req.user.primaryRole === 'teaching_assistant') {
      const taAssignments = await TeachingAssistantAssignment.findAll({
        where: { taUserId: req.user.id },
        attributes: ['classId']
      });
      const allowedClassIds = taAssignments.map((a) => a.classId);

      if (classId) {
        // Explicit classId requested — verify it's in their assigned list
        if (!allowedClassIds.includes(Number(classId))) {
          throw new AppError(
            'Forbidden: You do not have access to discussions in this class section.',
            403,
            'CLASS_ACCESS_DENIED'
          );
        }
      } else {
        // No classId — scope to all their assigned sections
        if (allowedClassIds.length === 0) {
          return res.status(200).json({ success: true, data: { threads: [] } });
        }
        where.classId = allowedClassIds;
      }
    }

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
    const { isResolved, isEscalated, escalationNote, moderationNote } = req.body;

    const thread = await DiscussionThread.findByPk(threadId, {
      include: [{ model: ClassSection, as: 'classSection', attributes: ['id', 'sectionCode', 'name'] }]
    });
    if (!thread) throw new AppError('Discussion thread not found.', 404);

    const access = await verifyClassAccess(req.user, thread.classId, {
      allowAdmin: true,
      allowInstructor: true,
      allowTA: true
    });

    const willEscalate = isEscalated !== undefined ? Boolean(isEscalated) : thread.isEscalated;
    const wasEscalated = thread.isEscalated;
    const willResolve  = isResolved  !== undefined ? Boolean(isResolved)  : thread.isResolved;

    // Require a moderation note when escalating to the instructor
    if (willEscalate && !wasEscalated) {
      const effectiveNote = escalationNote || moderationNote;
      if (!effectiveNote || String(effectiveNote).trim().length < 5) {
        throw new AppError(
          'A moderation note (at least 5 characters) is required when escalating a discussion to the instructor.',
          400,
          'MODERATION_NOTE_REQUIRED'
        );
      }
    }

    await thread.update({
      isResolved: willResolve,
      isEscalated: willEscalate,
      escalationNote: (escalationNote !== undefined ? escalationNote
                     : moderationNote  !== undefined ? moderationNote
                     : thread.escalationNote)
    });

    // Audit the moderation action
    const action = willEscalate && !wasEscalated ? 'DISCUSSION_ESCALATED_BY_TA'
                 : !willEscalate && wasEscalated  ? 'DISCUSSION_ESCALATION_CLEARED'
                 : willResolve && !thread.isResolved ? 'DISCUSSION_RESOLVED'
                 : !willResolve && thread.isResolved ? 'DISCUSSION_REOPENED'
                 : 'DISCUSSION_STATUS_UPDATED';

    await recordAudit({
      req,
      action,
      category: 'academic',
      entityType: 'DiscussionThread',
      entityId: thread.id,
      metadata: {
        classId: thread.classId,
        sectionCode: thread.classSection?.sectionCode,
        threadTitle: thread.title,
        isResolved: willResolve,
        isEscalated: willEscalate,
        moderationNote: escalationNote || moderationNote || null,
        moderatedBy: req.user.id,
        moderatedByName: req.user.fullName,
        moderatedByRole: req.user.primaryRole,
      }
    });

    // Notify the section's instructor(s) when a discussion is newly escalated
    if (willEscalate && !wasEscalated) {
      const note = escalationNote || moderationNote || '';
      const instructors = await InstructorAssignment.findAll({
        where: { classId: thread.classId }
      });
      for (const ia of instructors) {
        await createNotification({
          userId: ia.instructorId,
          type: 'announcement',
          title: `Discussion Escalated in ${thread.classSection?.sectionCode || 'a class section'}`,
          message: `${req.user.fullName} escalated the discussion "${thread.title}" for your review${note ? `: ${note}` : '.'}`,
          destinationUrl: '/instructor/discussions'
        });
      }
    }

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

// ============================================================================
// UPDATE & DELETE — ANNOUNCEMENTS
// ============================================================================

async function updateAnnouncement(req, res, next) {
  try {
    const announcement = await Announcement.findByPk(Number(req.params.id));
    if (!announcement) throw new AppError('Announcement not found.', 404);

    // Only the author or an admin can edit
    if (announcement.authorId !== req.user.id &&
        !req.user.roles.includes('super_admin') &&
        !req.user.roles.includes('academic_admin')) {
      throw new AppError('Forbidden: You can only edit your own announcements.', 403);
    }

    if (announcement.classId) {
      await verifyClassAccess(req.user, announcement.classId, { allowAdmin: true, allowInstructor: true });
    }

    const allowed = ['title', 'content', 'priority', 'isPinned', 'expiresAt', 'scope'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = key === 'title' || key === 'content'
          ? sanitizePlainText(req.body[key])
          : req.body[key];
      }
    }

    await announcement.update(updates);
    return res.status(200).json({ success: true, message: 'Announcement updated.', data: { announcement } });
  } catch (err) {
    return next(err);
  }
}

async function deleteAnnouncement(req, res, next) {
  try {
    const announcement = await Announcement.findByPk(Number(req.params.id));
    if (!announcement) throw new AppError('Announcement not found.', 404);

    if (announcement.authorId !== req.user.id &&
        !req.user.roles.includes('super_admin') &&
        !req.user.roles.includes('academic_admin')) {
      throw new AppError('Forbidden: You can only delete your own announcements.', 403);
    }

    await announcement.destroy();
    return res.status(200).json({ success: true, message: 'Announcement deleted.' });
  } catch (err) {
    return next(err);
  }
}

// ============================================================================
// DELETE — DISCUSSION THREADS
// ============================================================================

async function deleteDiscussionThread(req, res, next) {
  try {
    const thread = await DiscussionThread.findByPk(Number(req.params.threadId), {
      include: [{ model: ClassSection, as: 'classSection', attributes: ['id', 'sectionCode'] }]
    });
    if (!thread) throw new AppError('Discussion thread not found.', 404);

    const isAuthor = thread.authorId === req.user.id;
    const isTA     = req.user.roles?.includes('teaching_assistant');

    if (isAuthor) {
      // Authors can always delete their own thread, but TAs must be in the section
      if (isTA) {
        await verifyClassAccess(req.user, thread.classId, {
          allowAdmin: false,
          allowInstructor: false,
          allowTA: true
        });
      }
    } else {
      // Non-authors: only admins and instructors of the section may delete
      await verifyClassAccess(req.user, thread.classId, {
        allowAdmin: true,
        allowInstructor: true,
        allowTA: false
      });
    }

    const threadSnapshot = { id: thread.id, title: thread.title, classId: thread.classId, sectionCode: thread.classSection?.sectionCode };
    await thread.destroy();

    await recordAudit({
      req,
      action: 'DISCUSSION_THREAD_DELETED',
      category: 'academic',
      entityType: 'DiscussionThread',
      entityId: threadSnapshot.id,
      metadata: {
        classId: threadSnapshot.classId,
        sectionCode: threadSnapshot.sectionCode,
        threadTitle: threadSnapshot.title,
        deletedBy: req.user.id,
        deletedByName: req.user.fullName,
        deletedByRole: req.user.primaryRole,
        wasAuthor: isAuthor,
      }
    });

    return res.status(200).json({ success: true, message: 'Discussion thread deleted.' });
  } catch (err) {
    return next(err);
  }
}

// ============================================================================
// ENDORSE A REPLY (mark as official answer)
// ============================================================================
async function endorseDiscussionPost(req, res, next) {
  try {
    const postId = Number(req.params.postId);
    const post = await DiscussionPost.findByPk(postId, {
      include: [{ model: DiscussionThread, as: 'thread' }]
    });
    if (!post) throw new AppError('Post not found.', 404);

    await verifyClassAccess(req.user, post.thread.classId, {
      allowAdmin: true, allowInstructor: true, allowTA: true
    });

    await post.update({ isInstructorEndorsed: !post.isInstructorEndorsed });

    return res.status(200).json({
      success: true,
      message: post.isInstructorEndorsed ? 'Reply endorsed as official answer.' : 'Endorsement removed.',
      data: { post }
    });
  } catch (err) { return next(err); }
}

/* ═══════════════════════════════════════════════════════════════════════════
   GET /discussions/:threadId/moderation-history
   Returns the full audit trail for a specific discussion thread.
   Accessible by TAs (verified against their assigned sections), instructors,
   and admins. Gives TAs visibility into who moderated a thread and when.
═══════════════════════════════════════════════════════════════════════════ */
async function getDiscussionModerationHistory(req, res, next) {
  try {
    const threadId = Number(req.params.threadId);
    if (!threadId || Number.isNaN(threadId)) {
      throw new AppError('Invalid thread identifier.', 400, 'INVALID_THREAD_ID');
    }

    const thread = await DiscussionThread.findByPk(threadId, {
      attributes: ['id', 'classId', 'title', 'isResolved', 'isEscalated', 'escalationNote'],
      include: [{ model: ClassSection, as: 'classSection', attributes: ['id', 'sectionCode', 'name'] }]
    });
    if (!thread) throw new AppError('Discussion thread not found.', 404);

    // Verify the caller has access to this thread's class section
    await verifyClassAccess(req.user, thread.classId, {
      allowAdmin: true,
      allowInstructor: true,
      allowTA: true,
    });

    const MODERATION_ACTIONS = [
      'DISCUSSION_ESCALATED_BY_TA',
      'DISCUSSION_ESCALATION_CLEARED',
      'DISCUSSION_RESOLVED',
      'DISCUSSION_REOPENED',
      'DISCUSSION_STATUS_UPDATED',
      'DISCUSSION_THREAD_DELETED',
    ];

    const logs = await AuditLog.findAll({
      where: {
        entityType: 'DiscussionThread',
        entityId: String(threadId),
        action: MODERATION_ACTIONS,
      },
      include: [{
        model: User,
        as: 'actor',
        attributes: ['id', 'firstName', 'lastName', 'email'],
        required: false,
      }],
      order: [['createdAt', 'DESC']],
      limit: 100,
    });

    const ACTION_LABELS = {
      DISCUSSION_ESCALATED_BY_TA:    'Escalated to Instructor',
      DISCUSSION_ESCALATION_CLEARED: 'Escalation Cleared',
      DISCUSSION_RESOLVED:           'Marked Resolved',
      DISCUSSION_REOPENED:           'Reopened',
      DISCUSSION_STATUS_UPDATED:     'Status Updated',
      DISCUSSION_THREAD_DELETED:     'Thread Deleted',
    };

    const history = logs.map((log) => {
      const meta = log.metadata || {};
      return {
        id: log.id,
        action: log.action,
        actionLabel: ACTION_LABELS[log.action] || log.action,
        actorName: log.actor
          ? `${log.actor.firstName} ${log.actor.lastName}`
          : (meta.moderatedByName || meta.deletedByName || 'Unknown'),
        actorRole: meta.moderatedByRole || meta.deletedByRole || log.actorRole || null,
        moderationNote: meta.moderationNote || null,
        isResolved: meta.isResolved ?? null,
        isEscalated: meta.isEscalated ?? null,
        timestamp: log.createdAt,
        severity: log.severity,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        threadId,
        classId: thread.classId,
        sectionCode: thread.classSection?.sectionCode,
        threadTitle: thread.title,
        currentState: {
          isResolved: thread.isResolved,
          isEscalated: thread.isEscalated,
          escalationNote: thread.escalationNote,
        },
        history,
      },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  listDiscussions,
  createDiscussionThread,
  replyToDiscussionThread,
  escalateOrResolveDiscussion,
  deleteDiscussionThread,
  endorseDiscussionPost,
  getDiscussionModerationHistory,
  listConversations,
  startOrSendMessage,
  listNotifications,
  markNotificationRead
};

