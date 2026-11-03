import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  ClipboardCheck,
  Flag,
  MessageSquare,
  Megaphone,
  Send,
  FileSpreadsheet,
  Download,
  Plus,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { lmsApi, extractErrorMessage } from '../services/api';
import {
  PageHeader,
  StatCard,
  StatusBadge,
  LoadingState,
  ErrorState,
  ModalDialog,
  useToast
} from '../components/ui/SharedComponents';

export function TaDashboardPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard', 'teaching_assistant'],
    queryFn: lmsApi.getDashboardSummary
  });

  if (isLoading) return <LoadingState label="Loading Teaching Assistant workspace..." />;
  if (error) return <ErrorState message={extractErrorMessage(error)} onRetry={refetch} />;

  const d = data?.data || {};
  const m = d.metrics || {};

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Teaching Assistant Workspace"
        title="Assigned Class Support, Submission Monitoring & Student Help"
        subtitle="Support instructors within your specifically assigned class sections using class-scoped permissions."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Assigned Classes"
          value={m.assignedClassesCount ?? 0}
          subtitle={`${m.totalRosterStudents ?? 0} total roster students`}
          icon={Users}
          accent="blue"
        />
        <StatCard
          title="Submissions to Monitor"
          value={m.submissionsToMonitor ?? 0}
          subtitle="Awaiting TA or instructor review"
          icon={ClipboardCheck}
          accent="indigo"
        />
        <StatCard
          title="Flagged for Instructor"
          value={m.flaggedSubmissionsCount ?? 0}
          subtitle="Escalated submissions"
          icon={Flag}
          accent="amber"
        />
        <StatCard
          title="Open Student Questions"
          value={m.openDiscussionsCount ?? 0}
          subtitle="Active class discussion threads"
          icon={MessageSquare}
          accent="emerald"
        />
      </div>

      {/* Assigned Classes & Granular TA Permission Matrix */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <h2 className="text-base font-bold text-slate-900">
          Assigned Class Sections & Authorized TA Capabilities
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(d.taAssignments || []).map((ta) => (
            <div key={ta.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded">
                  {ta.classSection?.sectionCode}
                </span>
                <span className="font-semibold text-slate-600">
                  Roster: {ta.classSection?.memberships?.length || 0} Learners
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">{ta.classSection?.name}</h3>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {ta.canViewRoster && (
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                    ✓ View Roster
                  </span>
                )}
                {ta.canReviewSubmissions && (
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                    ✓ Review Submissions
                  </span>
                )}
                {ta.canApplyRubrics ? (
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                    ✓ Apply Rubrics
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-600 font-semibold">
                    ✕ Rubric Restricted
                  </span>
                )}
                {ta.canUploadResources && (
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                    ✓ Upload Resources
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TaSubmissionsReviewPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [selectedSub, setSelectedSub] = useState(null);
  const [preliminaryFeedback, setPreliminaryFeedback] = useState('');
  const [flagged, setFlagged] = useState(false);
  const [flagReason, setFlagReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['submissions', 'ta'],
    queryFn: () => lmsApi.listSubmissions()
  });

  const handleSaveTaReview = async (e) => {
    e.preventDefault();
    if (!selectedSub) return;
    try {
      const res = await lmsApi.reviewSubmission(selectedSub.id, {
        preliminaryFeedback,
        flaggedForInstructorReview: flagged,
        flagReason
      });
      addToast(res.message);
      setSelectedSub(null);
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  if (isLoading) return <LoadingState />;

  const submissions = data?.data?.submissions || [];

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Teaching Assistant Review"
        title="Authorized Submission Monitoring, Preliminary Feedback & Escalation"
        subtitle="Provide preliminary rubric feedback and flag submissions requiring instructor attention."
      />

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Assignment</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Preliminary Feedback</th>
              <th className="px-4 py-3">Instructor Flag</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {submissions.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3 font-bold text-slate-900">
                  {s.student?.firstName} {s.student?.lastName}
                </td>
                <td className="px-4 py-3">{s.assignment?.title}</td>
                <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                <td className="px-4 py-3 text-slate-600">{s.preliminaryFeedback || '—'}</td>
                <td className="px-4 py-3">
                  {s.flaggedForInstructorReview ? (
                    <span className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded font-semibold">
                      ⚑ {s.flagReason || 'Flagged'}
                    </span>
                  ) : (
                    'No'
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSub(s);
                      setPreliminaryFeedback(s.preliminaryFeedback || '');
                      setFlagged(Boolean(s.flaggedForInstructorReview));
                      setFlagReason(s.flagReason || '');
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
                  >
                    Preliminary Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ModalDialog
        isOpen={Boolean(selectedSub)}
        onClose={() => setSelectedSub(null)}
        title="Teaching Assistant Preliminary Review & Escalation"
      >
        {selectedSub && (
          <form onSubmit={handleSaveTaReview} className="space-y-3 text-xs">
            {selectedSub.codeSubmission && (
              <pre className="p-3 rounded-lg bg-slate-900 text-emerald-400 font-mono overflow-x-auto">
                {selectedSub.codeSubmission}
              </pre>
            )}
            <div>
              <label className="block font-semibold mb-1">Preliminary Feedback for Student & Instructor</label>
              <textarea
                rows={3}
                value={preliminaryFeedback}
                onChange={(e) => setPreliminaryFeedback(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <label className="flex items-center gap-2 font-semibold text-amber-900">
              <input
                type="checkbox"
                checked={flagged}
                onChange={(e) => setFlagged(e.target.checked)}
              />
              <span>Flag this submission for Instructor Review</span>
            </label>
            {flagged && (
              <div>
                <label className="block font-semibold mb-1">Flag / Escalation Reason</label>
                <input
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value)}
                  placeholder="Describe why instructor review is needed..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
            )}
            <button type="submit" className="w-full py-2 bg-blue-600 text-white font-semibold rounded-lg">
              Save TA Review
            </button>
          </form>
        )}
      </ModalDialog>
    </div>
  );
}

export function SharedAnnouncementsPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    scope: 'class',
    classId: 1,
    title: '',
    content: '',
    priority: 'important',
    isPinned: true
  });

  const { data, isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => lmsApi.listAnnouncements()
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await lmsApi.createAnnouncement(form);
      addToast('Announcement published.');
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  const announcements = data?.data?.announcements || [];

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Institutional & Course Bulletins"
        title="Academic Announcements"
        subtitle="Stay informed with institution-wide, department, course, and class-specific bulletins."
        actions={
          hasPermission('announcements:manage') && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"
            >
              <Plus className="w-4 h-4" />
              Publish Announcement
            </button>
          )
        }
      />

      {isLoading ? (
        <LoadingState />
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-5 space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusBadge status={a.scope} />
                  <StatusBadge status={a.priority} />
                </div>
                <span className="text-xs text-slate-500">
                  By {a.author?.firstName} {a.author?.lastName} · {new Date(a.createdAt).toLocaleDateString()}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900">{a.title}</h3>
              <p className="text-xs text-slate-700 leading-relaxed">{a.content}</p>
            </div>
          ))}
        </div>
      )}

      <ModalDialog isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Publish Academic Announcement">
        <form onSubmit={handleCreate} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Scope</label>
              <select
                value={form.scope}
                onChange={(e) => setForm({ ...form, scope: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
              >
                <option value="class">Class Section</option>
                <option value="course">Course-Wide</option>
                <option value="department">Department</option>
                <option value="institution">Institution-Wide</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
              >
                <option value="normal">Normal</option>
                <option value="important">Important</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block font-semibold mb-1">Title</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Announcement Content</label>
            <textarea
              required
              rows={4}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <button type="submit" className="w-full py-2 bg-blue-600 text-white font-semibold rounded-lg">
            Publish Bulletin
          </button>
        </form>
      </ModalDialog>
    </div>
  );
}

export function SharedDiscussionsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [newThreadOpen, setNewThreadOpen] = useState(false);
  const [threadForm, setThreadForm] = useState({
    classId: 1,
    title: '',
    body: '',
    category: 'laboratory_help'
  });
  const [replyTextByThread, setReplyTextByThread] = useState({});

  const { data, isLoading } = useQuery({
    queryKey: ['discussions'],
    queryFn: () => lmsApi.listDiscussions()
  });

  const handleCreateThread = async (e) => {
    e.preventDefault();
    try {
      await lmsApi.createDiscussion(threadForm);
      addToast('Discussion question posted.');
      setNewThreadOpen(false);
      queryClient.invalidateQueries({ queryKey: ['discussions'] });
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  const handleReply = async (threadId) => {
    const body = replyTextByThread[threadId];
    if (!body) return;
    try {
      await lmsApi.replyDiscussion(threadId, { body });
      setReplyTextByThread({ ...replyTextByThread, [threadId]: '' });
      addToast('Reply posted.');
      queryClient.invalidateQueries({ queryKey: ['discussions'] });
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  const handleToggleEscalation = async (thread) => {
    try {
      await lmsApi.updateDiscussionStatus(thread.id, {
        isEscalated: !thread.isEscalated,
        escalationNote: 'Escalated by TA for Instructor review'
      });
      addToast('Updated thread escalation status.');
      queryClient.invalidateQueries({ queryKey: ['discussions'] });
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  const threads = data?.data?.threads || [];

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Collaborative Q&A"
        title="Class Discussions & Technical Laboratory Support Forum"
        subtitle="Ask questions, share troubleshooting insights, and receive instructor-endorsed answers."
        actions={
          <button
            type="button"
            onClick={() => setNewThreadOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Ask a Question
          </button>
        }
      />

      {isLoading ? (
        <LoadingState />
      ) : (
        <div className="space-y-4">
          {threads.map((t) => (
            <div key={t.id} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <StatusBadge status={t.category} />
                  {t.isResolved && <StatusBadge status="completed" />}
                  {t.isEscalated && (
                    <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded">
                      ⚑ Escalated to Instructor
                    </span>
                  )}
                </div>
                {['instructor', 'teaching_assistant'].includes(user?.primaryRole) && (
                  <button
                    type="button"
                    onClick={() => handleToggleEscalation(t)}
                    className="text-xs font-semibold text-amber-700 hover:underline"
                  >
                    {t.isEscalated ? 'Clear Escalation' : 'Escalate to Instructor'}
                  </button>
                )}
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">{t.title}</h3>
                <p className="text-xs text-slate-700 mt-1">{t.body}</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Posted by {t.author?.firstName} {t.author?.lastName} in {t.classSection?.sectionCode}
                </p>
              </div>

              {/* Replies */}
              <div className="space-y-2 pl-4 border-l-2 border-slate-200">
                {(t.posts || []).map((post) => (
                  <div key={post.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">
                        {post.author?.firstName} {post.author?.lastName}
                      </span>
                      {post.isInstructorEndorsed && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          Faculty / TA Endorsed Response
                        </span>
                      )}
                    </div>
                    <p className="text-slate-700">{post.body}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyTextByThread[t.id] || ''}
                  onChange={(e) => setReplyTextByThread({ ...replyTextByThread, [t.id]: e.target.value })}
                  placeholder="Write a helpful reply..."
                  className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300"
                />
                <button
                  type="button"
                  onClick={() => handleReply(t.id)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg"
                >
                  Reply
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ModalDialog isOpen={newThreadOpen} onClose={() => setNewThreadOpen(false)} title="Start Discussion Thread">
        <form onSubmit={handleCreateThread} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold mb-1">Question Title</label>
            <input
              required
              value={threadForm.title}
              onChange={(e) => setThreadForm({ ...threadForm, title: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Details / Troubleshooting Context</label>
            <textarea
              required
              rows={4}
              value={threadForm.body}
              onChange={(e) => setThreadForm({ ...threadForm, body: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <button type="submit" className="w-full py-2 bg-blue-600 text-white font-semibold rounded-lg">
            Post Discussion Thread
          </button>
        </form>
      </ModalDialog>
    </div>
  );
}

export function SharedMessagesPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [recipientId, setRecipientId] = useState(3);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['messages'],
    queryFn: lmsApi.listMessages
  });

  const handleSend = async (e) => {
    e.preventDefault();
    try {
      await lmsApi.sendMessage({ recipientId: Number(recipientId), subject, body });
      setSubject('');
      setBody('');
      addToast('Direct message sent.');
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  const conversations = data?.data?.conversations || [];

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Private Communications"
        title="Direct Academic Messaging"
        subtitle="Authorized private conversations between students, instructors, and teaching assistants."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {isLoading ? (
            <LoadingState />
          ) : conversations.length === 0 ? (
            <p className="text-xs text-slate-500">No conversations yet.</p>
          ) : (
            conversations.map((conv) => (
              <div key={conv.id} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-900">{conv.subject}</h3>
                  <span className="text-xs text-slate-500">
                    {conv.members?.map((m) => `${m.user?.firstName} ${m.user?.lastName}`).join(' · ')}
                  </span>
                </div>
                <div className="space-y-2">
                  {(conv.messages || []).map((msg) => (
                    <div key={msg.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                      <p className="font-bold text-slate-900">
                        {msg.sender?.firstName} {msg.sender?.lastName}
                      </p>
                      <p className="text-slate-700 mt-0.5">{msg.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSend} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 text-xs h-fit">
          <h2 className="text-base font-bold text-slate-900">New Direct Message</h2>
          <div>
            <label className="block font-semibold mb-1">Recipient</label>
            <select
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
            >
              <option value={3}>Prof. Elena Vance (Instructor)</option>
              <option value={5}>Liam Reyes (Teaching Assistant)</option>
              <option value={2}>Clarissa Thorne (Academic Admin)</option>
              <option value={6}>Maya Lin (Student)</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1">Subject</label>
            <input
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Coursework inquiry..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Message</label>
            <textarea
              required
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2"
          >
            <Send className="w-3.5 h-3.5" />
            Send Message
          </button>
        </form>
      </div>
    </div>
  );
}

export function SharedReportsPage() {
  const { addToast } = useToast();

  // ── Filters ───────────────────────────────────────────────────────────────
  const [reportType,  setReportType]  = useState('enrollments');
  const [classId,     setClassId]     = useState('');
  const [semesterId,  setSemesterId]  = useState('');
  const [searchText,  setSearchText]  = useState('');

  // Report types that need a class selector
  const NEEDS_CLASS    = ['gradebook', 'submissions', 'certificates'];
  // Report types that can optionally filter by semester
  const NEEDS_SEMESTER = ['enrollments', 'classSummary'];

  // ── Dependent data for filter selectors ───────────────────────────────────
  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: lmsApi.listClasses
  });
  const { data: semestersData } = useQuery({
    queryKey: ['semesters'],
    queryFn: lmsApi.listSemesters
  });

  const classes   = classesData?.data?.classes   || [];
  const semesters = semestersData?.data?.semesters || [];

  // Auto-select first class when type changes to one requiring a class
  React.useEffect(() => {
    if (NEEDS_CLASS.includes(reportType) && classId === '' && classes.length > 0) {
      setClassId(classes[0].id);
    }
    setSearchText('');
  }, [reportType, classes]);

  // ── Build query params ────────────────────────────────────────────────────
  const queryParams = { type: reportType, format: 'json' };
  if (classId    && NEEDS_CLASS.includes(reportType))    queryParams.classId    = classId;
  if (classId    && !NEEDS_CLASS.includes(reportType))   queryParams.classId    = classId;
  if (semesterId && NEEDS_SEMESTER.includes(reportType)) queryParams.semesterId = semesterId;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['reports', reportType, classId, semesterId],
    queryFn: () => lmsApi.getReport(queryParams),
    retry: 1
  });

  const report = data?.data || {};

  // ── Filtered rows ─────────────────────────────────────────────────────────
  const filteredRows = React.useMemo(() => {
    const rows = report.rows || [];
    if (!searchText.trim()) return rows;
    const term = searchText.toLowerCase();
    return rows.filter((row) =>
      Object.values(row).some((val) =>
        String(val ?? '').toLowerCase().includes(term)
      )
    );
  }, [report.rows, searchText]);

  // ── Build download URL (browser navigation, sends session cookie) ─────────
  const buildDownloadUrl = (fmt) => {
    const p = new URLSearchParams({ type: reportType, format: fmt });
    if (classId)    p.set('classId',    classId);
    if (semesterId) p.set('semesterId', semesterId);
    return `/api/reports?${p.toString()}`;
  };

  const summary = report.summary || null;

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Analytics & Data Exports"
        title="Authorized Academic & Institutional Reports"
        subtitle="Generate tabular reports and export in CSV or Excel-compatible formats."
        actions={
          <>
            <a href={buildDownloadUrl('csv')} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg">
              <Download className="w-4 h-4" /> Download CSV
            </a>
            <a href={buildDownloadUrl('excel')} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg">
              <FileSpreadsheet className="w-4 h-4" /> Download Excel
            </a>
          </>
        }
      />

      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3 items-end">
        {/* Report type */}
        <div className="flex flex-col gap-1 text-xs">
          <label className="font-semibold text-slate-600">Report Type</label>
          <select value={reportType} onChange={(e) => { setReportType(e.target.value); setClassId(''); setSemesterId(''); }}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-medium min-w-[220px]">
            <option value="enrollments">Student Enrollment & Roster</option>
            <option value="gradebook">Class Weighted Gradebook</option>
            <option value="submissions">Assignment Submissions</option>
            <option value="classSummary">Class Section Summary</option>
            <option value="departments">Department & Course Summary</option>
            <option value="certificates">Course Completion Certificates</option>
            <option value="users">Platform User Directory</option>
          </select>
        </div>

        {/* Class picker — shown for types that require a class */}
        {(NEEDS_CLASS.includes(reportType) || (!NEEDS_SEMESTER.includes(reportType) && !['departments','users'].includes(reportType))) && (
          <div className="flex flex-col gap-1 text-xs">
            <label className="font-semibold text-slate-600">
              Class Section {NEEDS_CLASS.includes(reportType) ? '' : <span className="text-slate-400 font-normal">(optional)</span>}
            </label>
            <select value={classId} onChange={(e) => setClassId(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-medium min-w-[200px]">
              {!NEEDS_CLASS.includes(reportType) && <option value="">— All Classes —</option>}
              {NEEDS_CLASS.includes(reportType) && classes.length === 0 && <option value="">— No classes —</option>}
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.sectionCode} — {c.courseOffering?.course?.code || c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Semester picker — shown for types that can filter by semester */}
        {NEEDS_SEMESTER.includes(reportType) && (
          <div className="flex flex-col gap-1 text-xs">
            <label className="font-semibold text-slate-600">Semester <span className="text-slate-400 font-normal">(optional)</span></label>
            <select value={semesterId} onChange={(e) => setSemesterId(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-medium min-w-[180px]">
              <option value="">— All Semesters —</option>
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Search within results */}
        <div className="flex flex-col gap-1 text-xs">
          <label className="font-semibold text-slate-600">Search in Results</label>
          <input value={searchText} onChange={(e) => setSearchText(e.target.value)}
            placeholder="Filter rows..." type="search"
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs min-w-[160px]" />
        </div>
      </div>

      {/* ── Error state ──────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-red-800">Failed to generate report</p>
            <p className="text-xs text-red-600 mt-0.5">
              {error?.response?.data?.message || error?.message || 'An unexpected error occurred.'}
            </p>
          </div>
          <button onClick={refetch} className="px-3 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg">
            Retry
          </button>
        </div>
      )}

      {/* ── Gradebook summary stats ───────────────────────────────────────── */}
      {!isLoading && !error && summary && reportType === 'gradebook' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard title="Total Students"   value={summary.totalStudents}    subtitle="In class section" icon={Users}         accent="blue"   />
          <StatCard title="Passing"          value={summary.passingStudents}  subtitle={`${summary.passingRate ?? 0}% pass rate`} icon={CheckCircle2} accent="emerald" />
          <StatCard title="Failing"          value={summary.failingStudents}  subtitle={`Below ${summary.passingScore}%`}   icon={AlertTriangle} accent="amber"   />
          <StatCard title="Avg. Standing"    value={summary.averageStanding !== null ? `${summary.averageStanding}%` : '—'} subtitle="Weighted average" icon={FileSpreadsheet} accent="indigo" />
        </div>
      )}

      {/* ── Report table ─────────────────────────────────────────────────── */}
      {isLoading ? (
        <LoadingState label="Generating report…" />
      ) : !error && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">{report.reportTitle || 'Report'}</h2>
              {report.generatedAt && (
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Generated {new Date(report.generatedAt).toLocaleString()}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {searchText && (
                <span className="text-blue-600 font-semibold">
                  {filteredRows.length} / {(report.rows || []).length} rows
                </span>
              )}
              {!searchText && (
                <span>{(report.rows || []).length} records</span>
              )}
            </div>
          </div>

          {(report.rows || []).length === 0 ? (
            <div className="px-5 py-12 text-center text-slate-400 text-sm">
              No records found for the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
                  <tr>
                    {(report.headers || []).map((h) => (
                      <th key={h.key} className="px-4 py-3 whitespace-nowrap">{h.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={(report.headers || []).length} className="px-4 py-8 text-center text-slate-400">
                        No rows match "{searchText}".
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row, idx) => (
                      <tr key={idx} className={`hover:bg-slate-50 ${
                        reportType === 'gradebook' && row.isPassing === 'No' ? 'bg-red-50/40' : ''
                      }`}>
                        {(report.headers || []).map((h) => (
                          <td key={h.key} className="px-4 py-3 text-slate-800 whitespace-nowrap">
                            {h.key === 'status' || h.key === 'finalGradesStatus'
                              ? <StatusBadge status={String(row[h.key] ?? '')} />
                              : String(row[h.key] ?? '—')}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

