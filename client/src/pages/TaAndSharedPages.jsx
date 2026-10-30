import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users, ClipboardCheck, Flag, MessageSquare, Megaphone, Send,
  FileSpreadsheet, Download, Plus, CheckCircle2, AlertTriangle,
  Search, Filter, Pin, Bell, TrendingUp, BarChart3, RefreshCw,
  ChevronDown, ChevronUp, ArrowUpRight, Calendar, FileDown, Eye
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { lmsApi, extractErrorMessage } from '../services/api';
import {
  PageHeader, StatCard, StatusBadge, LoadingState, ErrorState, ModalDialog, useToast
} from '../components/ui/SharedComponents';

/* ─── shared helpers ──────────────────────────────────────── */
function Tab({ label, count, active, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
      {label}
      {count !== undefined && (
        <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${active ? 'bg-blue-500' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
      )}
    </button>
  );
}

function PageBadge({ label, color = 'blue', icon: Icon }) {
  const map = {
    blue:   'text-blue-700 bg-blue-50 border-blue-200',
    emerald:'text-emerald-700 bg-emerald-50 border-emerald-200',
    amber:  'text-amber-700 bg-amber-50 border-amber-200',
    violet: 'text-violet-700 bg-violet-50 border-violet-200',
    rose:   'text-rose-700 bg-rose-50 border-rose-200',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider border px-2.5 py-0.5 rounded-md mb-2 ${map[color]}`}>
      {Icon && <Icon className="w-3.5 h-3.5" />}{label}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════════
   TA DASHBOARD (unchanged)
══════════════════════════════════════════════════════════════ */
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
        <StatCard title="Assigned Classes" value={m.assignedClassesCount ?? 0} subtitle={`${m.totalRosterStudents ?? 0} total roster students`} icon={Users} accent="blue" />
        <StatCard title="Submissions to Monitor" value={m.submissionsToMonitor ?? 0} subtitle="Awaiting TA or instructor review" icon={ClipboardCheck} accent="indigo" />
        <StatCard title="Flagged for Instructor" value={m.flaggedSubmissionsCount ?? 0} subtitle="Escalated submissions" icon={Flag} accent="amber" />
        <StatCard title="Open Student Questions" value={m.openDiscussionsCount ?? 0} subtitle="Active class discussion threads" icon={MessageSquare} accent="emerald" />
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <h2 className="text-base font-bold text-slate-900">Assigned Class Sections & Authorized TA Capabilities</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(d.taAssignments || []).map((ta) => (
            <div key={ta.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded">{ta.classSection?.sectionCode}</span>
                <span className="font-semibold text-slate-600">Roster: {ta.classSection?.memberships?.length || 0} Learners</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">{ta.classSection?.name}</h3>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {ta.canViewRoster && <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">✓ View Roster</span>}
                {ta.canReviewSubmissions && <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">✓ Review Submissions</span>}
                {ta.canApplyRubrics
                  ? <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">✓ Apply Rubrics</span>
                  : <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-600 font-semibold">✕ Rubric Restricted</span>}
                {ta.canUploadResources && <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">✓ Upload Resources</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   TA SUBMISSIONS REVIEW (unchanged)
══════════════════════════════════════════════════════════════ */
export function TaSubmissionsReviewPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [selectedSub, setSelectedSub] = useState(null);
  const [preliminaryFeedback, setPreliminaryFeedback] = useState('');
  const [flagged, setFlagged] = useState(false);
  const [flagReason, setFlagReason] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['submissions', 'ta'], queryFn: () => lmsApi.listSubmissions() });

  const handleSaveTaReview = async (e) => {
    e.preventDefault();
    if (!selectedSub) return;
    try {
      const res = await lmsApi.reviewSubmission(selectedSub.id, { preliminaryFeedback, flaggedForInstructorReview: flagged, flagReason });
      addToast(res.message); setSelectedSub(null);
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err) { addToast(extractErrorMessage(err), 'error'); }
  };

  if (isLoading) return <LoadingState />;
  const submissions = data?.data?.submissions || [];

  return (
    <div className="space-y-6">
      <PageHeader badge="Teaching Assistant Review" title="Authorized Submission Monitoring, Preliminary Feedback & Escalation" subtitle="Provide preliminary rubric feedback and flag submissions requiring instructor attention." />
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
              <tr>
                {['Student','Assignment','Status','Preliminary Feedback','Instructor Flag','Action'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {submissions.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-slate-900">{s.student?.firstName} {s.student?.lastName}</td>
                  <td className="px-4 py-3">{s.assignment?.title}</td>
                  <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                  <td className="px-4 py-3 text-slate-600">{s.preliminaryFeedback || '—'}</td>
                  <td className="px-4 py-3">
                    {s.flaggedForInstructorReview
                      ? <span className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded font-semibold">⚑ {s.flagReason || 'Flagged'}</span>
                      : <span className="text-slate-400">No</span>}
                  </td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => { setSelectedSub(s); setPreliminaryFeedback(s.preliminaryFeedback || ''); setFlagged(Boolean(s.flaggedForInstructorReview)); setFlagReason(s.flagReason || ''); }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold">
                      Preliminary Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <ModalDialog isOpen={Boolean(selectedSub)} onClose={() => setSelectedSub(null)} title="TA Preliminary Review & Escalation">
        {selectedSub && (
          <form onSubmit={handleSaveTaReview} className="space-y-3 text-xs">
            {selectedSub.codeSubmission && <pre className="p-3 rounded-lg bg-slate-900 text-emerald-400 font-mono overflow-x-auto max-h-40">{selectedSub.codeSubmission}</pre>}
            <div><label className="block font-semibold mb-1">Preliminary Feedback</label>
              <textarea rows={3} value={preliminaryFeedback} onChange={(e) => setPreliminaryFeedback(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300" /></div>
            <label className="flex items-center gap-2 font-semibold text-amber-900 cursor-pointer">
              <input type="checkbox" checked={flagged} onChange={(e) => setFlagged(e.target.checked)} className="rounded" />
              <span>Flag for Instructor Review</span>
            </label>
            {flagged && <div><label className="block font-semibold mb-1">Escalation Reason</label><input value={flagReason} onChange={(e) => setFlagReason(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300" /></div>}
            <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg">Save TA Review</button>
          </form>
        )}
      </ModalDialog>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ANNOUNCEMENTS (enhanced)
══════════════════════════════════════════════════════════════ */
export function SharedAnnouncementsPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ scope: 'class', classId: 1, title: '', content: '', priority: 'important', isPinned: false });

  const { data, isLoading } = useQuery({ queryKey: ['announcements'], queryFn: () => lmsApi.listAnnouncements() });

  const handleCreate = async (e) => {
    e.preventDefault();
    try { await lmsApi.createAnnouncement(form); addToast('Announcement published.'); setCreateOpen(false); queryClient.invalidateQueries({ queryKey: ['announcements'] }); }
    catch (err) { addToast(extractErrorMessage(err), 'error'); }
  };

  const all = data?.data?.announcements || [];
  const counts = {
    all: all.length,
    urgent: all.filter((a) => a.priority === 'urgent').length,
    important: all.filter((a) => a.priority === 'important').length,
    normal: all.filter((a) => a.priority === 'normal').length,
    pinned: all.filter((a) => a.isPinned).length,
  };

  const filtered = all.filter((a) => {
    const mf = filter === 'all' ? true : filter === 'pinned' ? a.isPinned : a.priority === filter;
    const ms = !search || `${a.title} ${a.content}`.toLowerCase().includes(search.toLowerCase());
    return mf && ms;
  });

  const priorityStyle = {
    urgent:    { card: 'border-rose-300 bg-rose-50/30',    badge: 'bg-rose-100 text-rose-800 border-rose-200',    dot: 'bg-rose-500',    label: '🚨 Urgent' },
    important: { card: 'border-amber-200 bg-amber-50/20',  badge: 'bg-amber-100 text-amber-800 border-amber-200',  dot: 'bg-amber-400',   label: '⚠️ Important' },
    normal:    { card: 'border-slate-200 bg-white',        badge: 'bg-slate-100 text-slate-700 border-slate-200',  dot: 'bg-slate-400',   label: 'ℹ️ Normal' },
  };

  const scopeStyle = {
    institution: 'bg-purple-50 text-purple-700 border-purple-200',
    department:  'bg-blue-50 text-blue-700 border-blue-200',
    course:      'bg-emerald-50 text-emerald-700 border-emerald-200',
    class:       'bg-sky-50 text-sky-700 border-sky-200',
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <PageBadge label="Institutional & Course Bulletins" color="violet" icon={Megaphone} />
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Announcements</h1>
          <p className="text-sm text-slate-500 mt-1">Institution-wide, department, course, and class-specific bulletins.</p>
        </div>
        {hasPermission('announcements:manage') && (
          <button type="button" onClick={() => setCreateOpen(true)}
            className="self-start inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg">
            <Plus className="w-4 h-4" /> Publish Announcement
          </button>
        )}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', v: counts.all, cl: 'bg-slate-50 border-slate-200 text-slate-700' },
          { label: 'Urgent', v: counts.urgent, cl: 'bg-rose-50 border-rose-200 text-rose-700' },
          { label: 'Important', v: counts.important, cl: 'bg-amber-50 border-amber-200 text-amber-700' },
          { label: 'Pinned', v: counts.pinned, cl: 'bg-blue-50 border-blue-200 text-blue-700' },
        ].map((k) => (
          <div key={k.label} className={`p-4 rounded-xl border ${k.cl}`}>
            <p className="text-2xl font-bold">{k.v}</p>
            <p className="text-xs font-medium mt-0.5 text-slate-600">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex flex-wrap gap-2">
          <Tab label="All" count={counts.all} active={filter === 'all'} onClick={() => setFilter('all')} />
          <Tab label="Urgent" count={counts.urgent} active={filter === 'urgent'} onClick={() => setFilter('urgent')} />
          <Tab label="Important" count={counts.important} active={filter === 'important'} onClick={() => setFilter('important')} />
          <Tab label="Normal" count={counts.normal} active={filter === 'normal'} onClick={() => setFilter('normal')} />
          <Tab label="Pinned" count={counts.pinned} active={filter === 'pinned'} onClick={() => setFilter('pinned')} />
        </div>
        <div className="relative ml-auto w-full sm:w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search announcements…"
            className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
      </div>

      {isLoading ? <LoadingState /> : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-500">No announcements found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => {
            const ps = priorityStyle[a.priority] || priorityStyle.normal;
            const ss = scopeStyle[a.scope] || 'bg-slate-100 text-slate-600 border-slate-200';
            return (
              <div key={a.id} className={`rounded-xl border p-5 shadow-sm hover:shadow transition-shadow ${ps.card}`}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Priority indicator */}
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${ps.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${ps.dot}`} />
                      {a.priority?.charAt(0).toUpperCase() + a.priority?.slice(1)}
                    </span>
                    {/* Scope */}
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${ss}`}>{a.scope}</span>
                    {/* Pinned */}
                    {a.isPinned && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                        📌 Pinned
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">
                    {a.author?.firstName} {a.author?.lastName} · {new Date(a.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">{a.title}</h3>
                <p className="text-xs text-slate-700 leading-relaxed">{a.content}</p>
              </div>
            );
          })}
        </div>
      )}

      <ModalDialog isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Publish Announcement">
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block font-semibold mb-1.5 text-slate-700">Scope</label>
              <select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
                <option value="class">Class Section</option><option value="course">Course-Wide</option>
                <option value="department">Department</option><option value="institution">Institution-Wide</option>
              </select></div>
            <div><label className="block font-semibold mb-1.5 text-slate-700">Priority</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
                <option value="normal">Normal</option><option value="important">Important</option><option value="urgent">Urgent</option>
              </select></div>
          </div>
          <div><label className="block font-semibold mb-1.5 text-slate-700">Title</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          <div><label className="block font-semibold mb-1.5 text-slate-700">Content</label>
            <textarea required rows={4} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300" /></div>
          <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
            <input type="checkbox" checked={form.isPinned} onChange={(e) => setForm({ ...form, isPinned: e.target.checked })} className="rounded" />
            <span>📌 Pin this announcement to top</span>
          </label>
          <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors">Publish Bulletin</button>
        </form>
      </ModalDialog>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   DISCUSSIONS (enhanced)
══════════════════════════════════════════════════════════════ */
export function SharedDiscussionsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [newOpen, setNewOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [expandedThread, setExpandedThread] = useState(null);
  const [threadForm, setThreadForm] = useState({ classId: 1, title: '', body: '', category: 'laboratory_help' });
  const [replyText, setReplyText] = useState({});

  const { data, isLoading } = useQuery({ queryKey: ['discussions'], queryFn: () => lmsApi.listDiscussions() });

  const handleCreate = async (e) => {
    e.preventDefault();
    try { await lmsApi.createDiscussion(threadForm); addToast('Discussion posted.'); setNewOpen(false); queryClient.invalidateQueries({ queryKey: ['discussions'] }); }
    catch (err) { addToast(extractErrorMessage(err), 'error'); }
  };

  const handleReply = async (threadId) => {
    const body = replyText[threadId];
    if (!body?.trim()) return;
    try {
      await lmsApi.replyDiscussion(threadId, { body });
      setReplyText((p) => ({ ...p, [threadId]: '' }));
      addToast('Reply posted.');
      queryClient.invalidateQueries({ queryKey: ['discussions'] });
    } catch (err) { addToast(extractErrorMessage(err), 'error'); }
  };

  const handleEscalate = async (t) => {
    try {
      await lmsApi.updateDiscussionStatus(t.id, { isEscalated: !t.isEscalated, escalationNote: 'Escalated by TA for Instructor review' });
      addToast('Escalation status updated.');
      queryClient.invalidateQueries({ queryKey: ['discussions'] });
    } catch (err) { addToast(extractErrorMessage(err), 'error'); }
  };

  const all = data?.data?.threads || [];
  const counts = {
    all: all.length,
    open: all.filter((t) => !t.isResolved).length,
    resolved: all.filter((t) => t.isResolved).length,
    escalated: all.filter((t) => t.isEscalated).length,
  };

  const filtered = all.filter((t) => {
    const mf = filter === 'all' ? true
      : filter === 'open' ? !t.isResolved
      : filter === 'resolved' ? t.isResolved
      : filter === 'escalated' ? t.isEscalated
      : true;
    const ms = !search || `${t.title} ${t.body}`.toLowerCase().includes(search.toLowerCase());
    return mf && ms;
  });

  const catStyle = {
    laboratory_help:    'bg-violet-50 text-violet-700 border-violet-200',
    technical_question: 'bg-blue-50 text-blue-700 border-blue-200',
    general_discussion: 'bg-slate-100 text-slate-700 border-slate-200',
    assignment_help:    'bg-amber-50 text-amber-700 border-amber-200',
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <PageBadge label="Collaborative Q&A" color="blue" icon={MessageSquare} />
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Discussions & Support</h1>
          <p className="text-sm text-slate-500 mt-1">Class questions, troubleshooting insights, and instructor-endorsed answers.</p>
        </div>
        <button type="button" onClick={() => setNewOpen(true)}
          className="self-start inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg">
          <Plus className="w-4 h-4" /> Ask a Question
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Threads', v: counts.all,      cl: 'bg-slate-50 border-slate-200 text-slate-700' },
          { label: 'Open',          v: counts.open,     cl: 'bg-amber-50 border-amber-200 text-amber-700' },
          { label: 'Resolved',      v: counts.resolved, cl: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
          { label: 'Escalated',     v: counts.escalated,cl: 'bg-rose-50 border-rose-200 text-rose-700' },
        ].map((k) => (
          <div key={k.label} className={`p-4 rounded-xl border ${k.cl}`}>
            <p className="text-2xl font-bold">{k.v}</p>
            <p className="text-xs font-medium mt-0.5 text-slate-600">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex flex-wrap gap-2">
          <Tab label="All" count={counts.all} active={filter === 'all'} onClick={() => setFilter('all')} />
          <Tab label="Open" count={counts.open} active={filter === 'open'} onClick={() => setFilter('open')} />
          <Tab label="Resolved" count={counts.resolved} active={filter === 'resolved'} onClick={() => setFilter('resolved')} />
          <Tab label="Escalated" count={counts.escalated} active={filter === 'escalated'} onClick={() => setFilter('escalated')} />
        </div>
        <div className="relative ml-auto w-full sm:w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search threads…"
            className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
      </div>

      {isLoading ? <LoadingState /> : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-500">No discussions found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => {
            const cs = catStyle[t.category] || 'bg-slate-100 text-slate-700 border-slate-200';
            const isExpanded = expandedThread === t.id;
            const replyCount = (t.posts || []).length;
            return (
              <div key={t.id} className={`bg-white rounded-xl border shadow-sm hover:shadow transition-shadow ${t.isEscalated ? 'border-amber-300' : t.isResolved ? 'border-emerald-200' : 'border-slate-200'}`}>
                {/* Thread header — clickable to expand */}
                <button type="button" onClick={() => setExpandedThread(isExpanded ? null : t.id)}
                  className="w-full p-5 text-left hover:bg-slate-50 transition-colors rounded-xl">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cs}`}>
                        {t.category?.replace(/_/g, ' ')}
                      </span>
                      {t.isResolved && <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200"><CheckCircle2 className="w-3 h-3" /> Resolved</span>}
                      {t.isEscalated && <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">⚑ Escalated</span>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span>{replyCount} {replyCount === 1 ? 'reply' : 'replies'}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 text-left">{t.title}</h3>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">{t.body}</p>
                  <p className="text-[11px] text-slate-400 mt-2">
                    {t.author?.firstName} {t.author?.lastName} · {t.classSection?.sectionCode} · {new Date(t.createdAt).toLocaleDateString()}
                  </p>
                </button>

                {/* Expanded replies + controls */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-slate-100 space-y-4 pt-4">
                    {/* TA/Instructor escalation toggle */}
                    {['instructor', 'teaching_assistant'].includes(user?.primaryRole) && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Instructor escalation</span>
                        <button type="button" onClick={() => handleEscalate(t)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${t.isEscalated ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                          {t.isEscalated ? 'Clear Escalation' : '⚑ Escalate to Instructor'}
                        </button>
                      </div>
                    )}

                    {/* Replies */}
                    {(t.posts || []).length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No replies yet — be the first to respond.</p>
                    ) : (
                      <div className="space-y-2 pl-4 border-l-2 border-slate-200">
                        {(t.posts || []).map((post) => (
                          <div key={post.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-slate-900">{post.author?.firstName} {post.author?.lastName}</span>
                              {post.isInstructorEndorsed && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3" /> Faculty Endorsed
                                </span>
                              )}
                            </div>
                            <p className="text-slate-700 leading-relaxed">{post.body}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply input */}
                    <div className="flex gap-2 mt-2">
                      <input type="text" value={replyText[t.id] || ''}
                        onChange={(e) => setReplyText((p) => ({ ...p, [t.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && handleReply(t.id)}
                        placeholder="Write a helpful reply… (Enter to send)"
                        className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none" />
                      <button type="button" onClick={() => handleReply(t.id)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shrink-0">
                        <Send className="w-3.5 h-3.5" /> Reply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ModalDialog isOpen={newOpen} onClose={() => setNewOpen(false)} title="Start Discussion Thread">
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          <div><label className="block font-semibold mb-1.5 text-slate-700">Category</label>
            <select value={threadForm.category} onChange={(e) => setThreadForm({ ...threadForm, category: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
              <option value="laboratory_help">🔬 Laboratory Help</option>
              <option value="technical_question">💻 Technical Question</option>
              <option value="assignment_help">📝 Assignment Help</option>
              <option value="general_discussion">💬 General Discussion</option>
            </select></div>
          <div><label className="block font-semibold mb-1.5 text-slate-700">Question Title</label>
            <input required value={threadForm.title} onChange={(e) => setThreadForm({ ...threadForm, title: e.target.value })} placeholder="e.g., OSPF neighbor not forming — R1 to R2" className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          <div><label className="block font-semibold mb-1.5 text-slate-700">Details / Troubleshooting Context</label>
            <textarea required rows={4} value={threadForm.body} onChange={(e) => setThreadForm({ ...threadForm, body: e.target.value })} placeholder="Describe what you've tried, error messages, configuration details…" className="w-full px-3 py-2 rounded-lg border border-slate-300" /></div>
          <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg">Post Discussion Thread</button>
        </form>
      </ModalDialog>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MESSAGES (unchanged)
══════════════════════════════════════════════════════════════ */
export function SharedMessagesPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [recipientId, setRecipientId] = useState(3);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['messages'], queryFn: lmsApi.listMessages });

  const handleSend = async (e) => {
    e.preventDefault();
    try { await lmsApi.sendMessage({ recipientId: Number(recipientId), subject, body }); setSubject(''); setBody(''); addToast('Message sent.'); queryClient.invalidateQueries({ queryKey: ['messages'] }); }
    catch (err) { addToast(extractErrorMessage(err), 'error'); }
  };

  const conversations = data?.data?.conversations || [];

  return (
    <div className="space-y-6">
      <PageHeader badge="Private Communications" title="Direct Academic Messaging" subtitle="Authorized private conversations between students, instructors, and teaching assistants." />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {isLoading ? <LoadingState /> : conversations.length === 0 ? (
            <p className="text-xs text-slate-500">No conversations yet.</p>
          ) : conversations.map((conv) => (
            <div key={conv.id} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-sm font-bold text-slate-900">{conv.subject}</h3>
                <span className="text-xs text-slate-500">{conv.members?.map((m) => `${m.user?.firstName} ${m.user?.lastName}`).join(' · ')}</span>
              </div>
              <div className="space-y-2">
                {(conv.messages || []).map((msg) => (
                  <div key={msg.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                    <p className="font-bold text-slate-900">{msg.sender?.firstName} {msg.sender?.lastName}</p>
                    <p className="text-slate-700 mt-0.5">{msg.body}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={handleSend} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 text-xs h-fit">
          <h2 className="text-base font-bold text-slate-900">New Direct Message</h2>
          <div><label className="block font-semibold mb-1">Recipient</label>
            <select value={recipientId} onChange={(e) => setRecipientId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
              <option value={3}>Prof. Elena Vance (Instructor)</option>
              <option value={5}>Liam Reyes (Teaching Assistant)</option>
              <option value={2}>Clarissa Thorne (Academic Admin)</option>
              <option value={6}>Maya Lin (Student)</option>
            </select></div>
          <div><label className="block font-semibold mb-1">Subject</label><input required value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300" /></div>
          <div><label className="block font-semibold mb-1">Message</label><textarea required rows={4} value={body} onChange={(e) => setBody(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300" /></div>
          <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2"><Send className="w-3.5 h-3.5" /> Send</button>
        </form>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   REPORTS (enhanced)
══════════════════════════════════════════════════════════════ */
export function SharedReportsPage() {
  const [reportType, setReportType] = useState('enrollments');
  const [classId, setClassId] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['reports', reportType, classId],
    queryFn: () => lmsApi.getReport({ type: reportType, classId, format: 'json' })
  });

  const report = data?.data || {};

  const reportOptions = [
    { value: 'enrollments', label: '👥 Enrollment & Class Roster', desc: 'Student enrollment status and class assignment' },
    { value: 'gradebook',   label: '📊 Weighted Gradebook',        desc: 'Class grades, weighted standings, and remarks' },
    { value: 'submissions', label: '📋 Assignment Submissions',     desc: 'Submission status, scores, and feedback' },
    { value: 'departments', label: '🏛️ Department & Course Summary', desc: 'Departments, programs, and course listings' },
    { value: 'users',       label: '🔑 Platform User Directory',    desc: 'All registered users and role assignments' },
  ];

  const selected = reportOptions.find((r) => r.value === reportType);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <PageBadge label="Analytics & Data Exports" color="emerald" icon={BarChart3} />
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Class Reports</h1>
          <p className="text-sm text-slate-500 mt-1">Generate tabular reports and export in CSV or Excel format.</p>
        </div>
        <div className="flex gap-2">
          <a href={`/api/reports?type=${reportType}&classId=${classId}&format=csv`} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg">
            <FileDown className="w-4 h-4" /> CSV
          </a>
          <a href={`/api/reports?type=${reportType}&classId=${classId}&format=excel`} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </a>
        </div>
      </div>

      {/* Report type selector — card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {reportOptions.map((r) => (
          <button key={r.value} type="button" onClick={() => setReportType(r.value)}
            className={`text-left p-4 rounded-xl border-2 transition-all ${reportType === r.value ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
            <p className="text-sm font-bold text-slate-900">{r.label}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{r.desc}</p>
          </button>
        ))}
      </div>

      {/* Active report info */}
      {selected && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs">
          <div className="flex-1">
            <p className="font-bold text-blue-900">{selected.label}</p>
            <p className="text-blue-700 mt-0.5">{selected.desc}</p>
          </div>
          {isLoading && <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />}
          {!isLoading && <span className="text-blue-700 font-semibold">{(report.rows || []).length} records</span>}
        </div>
      )}

      {/* Results table */}
      {isLoading ? <LoadingState /> : (report.rows || []).length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-500">No data available for this report.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">{report.reportTitle}</h2>
              <p className="text-xs text-slate-500 mt-0.5">Generated {new Date().toLocaleString()}</p>
            </div>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
              {(report.rows || []).length} records
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] tracking-wide border-b border-slate-200">
                <tr>
                  {(report.headers || []).map((h) => <th key={h.key} className="px-4 py-3">{h.label}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(report.rows || []).map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    {(report.headers || []).map((h) => (
                      <td key={h.key} className="px-4 py-3 text-slate-700">
                        {row[h.key] != null ? String(row[h.key]) : <span className="text-slate-300">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
