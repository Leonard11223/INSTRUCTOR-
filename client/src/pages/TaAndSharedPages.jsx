import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users, ClipboardCheck, Flag, MessageSquare, Megaphone, Send,
  FileSpreadsheet, Download, Plus, CheckCircle2, AlertTriangle,
  Pencil, Trash2, Search, BookOpen, RefreshCw, ArrowUpRight,
  ChevronRight, ChevronUp, ChevronDown, GraduationCap, BarChart3,
  TrendingUp,
  X, ArrowUpDown, Info, Activity, Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { lmsApi, extractErrorMessage } from '../services/api';
import {
  PageHeader,
  StatCard,
  StatusBadge,
  LoadingState,
  ErrorState,
  EmptyState,
  ModalDialog,
  useToast
} from '../components/ui/SharedComponents';

/* ─────────────────────────────────────────────────────────────────────────────
   Local helper components — scoped to TaAndSharedPages, consistent with the
   InstructorPages pattern used elsewhere in the codebase.
───────────────────────────────────────────────────────────────────────────── */

/** Compact section header with optional "View all" link */
function SecHead({ title, sub, linkTo, linkLabel }) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
      {linkTo && (
        <Link
          to={linkTo}
          className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 shrink-0"
        >
          {linkLabel || 'View all'}
          <ArrowUpRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

/** Capability pill — green when granted, muted when restricted */
function CapPill({ granted, label }) {
  return granted ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
      <CheckCircle2 className="w-3 h-3 shrink-0" />
      {label}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-400 border border-slate-200 line-through decoration-slate-300">
      {label}
    </span>
  );
}

/** Quick-action tile matching InstructorPages QuickBtn pattern */
function QuickBtn({ to, icon: Icon, label, color }) {
  const palette = {
    blue:   'bg-blue-50   text-blue-700   border-blue-200   hover:bg-blue-100',
    amber:  'bg-amber-50  text-amber-700  border-amber-200  hover:bg-amber-100',
    emerald:'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
    rose:   'bg-rose-50   text-rose-700   border-rose-200   hover:bg-rose-100',
    violet: 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100',
  };
  return (
    <Link
      to={to}
      className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-xs font-semibold transition-colors ${palette[color] || palette.blue}`}
    >
      <Icon className="w-5 h-5" aria-hidden="true" />
      <span className="text-center leading-tight">{label}</span>
    </Link>
  );
}

/** Relative time label (e.g. "2 h ago", "Just now") */
function relTime(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/** Inline progress bar */
function ProgressBar({ value = 0, color = 'bg-blue-500' }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
      <div className={`${color} h-1.5 rounded-full`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   TaDashboardPage
───────────────────────────────────────────────────────────────────────────── */
export function TaDashboardPage() {
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard', 'teaching_assistant'],
    queryFn: lmsApi.getDashboardSummary,
    refetchInterval: 60_000,
  });

  // Announcements fetched separately — not included in TA dashboard response
  const { data: announcementsData } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => lmsApi.listAnnouncements(),
  });

  if (isLoading) return <LoadingState label="Loading your Teaching Assistant workspace…" />;
  if (error)     return <ErrorState message={extractErrorMessage(error)} onRetry={refetch} />;

  const d = data?.data || {};
  const m = d.metrics || {};

  const taAssignments  = d.taAssignments  || [];
  const allSubmissions = d.submissions    || [];
  const discussions    = d.discussions    || [];
  const announcements  = announcementsData?.data?.announcements || [];

  // Derived slices used across sections
  const pendingSubmissions = allSubmissions.filter((s) =>
    ['submitted', 'late', 'under_review'].includes(s.status)
  );
  const flaggedSubmissions = allSubmissions.filter((s) => s.flaggedForInstructorReview);
  const recentActivity     = [...allSubmissions]
    .sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0))
    .slice(0, 6);
  const openDiscussions    = discussions.filter((t) => !t.isResolved);
  const recentDiscussions  = [...discussions]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 4);
  const recentAnnouncements = announcements.slice(0, 3);

  // Stat-card contextual subtitles
  const submissionSub = flaggedSubmissions.length > 0
    ? `${flaggedSubmissions.length} flagged for instructor`
    : 'No items flagged';
  const discussionSub = openDiscussions.length > 0
    ? `${discussions.length - openDiscussions.length} resolved`
    : 'All threads resolved';

  return (
    <div className="space-y-6 pb-8">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md mb-2">
            <GraduationCap className="w-3.5 h-3.5" aria-hidden="true" />
            Teaching Assistant Workspace
          </span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Welcome back, {user?.firstName || 'Teaching Assistant'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Your support dashboard for assigned class sections and student activities.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="self-start sm:self-auto flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          aria-label="Refresh dashboard data"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          Refresh
        </button>
      </div>

      {/* ── Summary stat cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Assigned Sections"
          value={m.assignedClassesCount ?? 0}
          subtitle={`${m.totalRosterStudents ?? 0} total students`}
          icon={Users}
          accent="blue"
        />
        <StatCard
          title="Pending Review"
          value={m.submissionsToMonitor ?? 0}
          subtitle={submissionSub}
          icon={ClipboardCheck}
          accent={m.submissionsToMonitor > 0 ? 'amber' : 'emerald'}
        />
        <StatCard
          title="Flagged Items"
          value={m.flaggedSubmissionsCount ?? 0}
          subtitle="Awaiting instructor attention"
          icon={Flag}
          accent={m.flaggedSubmissionsCount > 0 ? 'rose' : 'emerald'}
        />
        <StatCard
          title="Open Discussions"
          value={m.openDiscussionsCount ?? 0}
          subtitle={discussionSub}
          icon={MessageSquare}
          accent="indigo"
        />
      </div>

      {/* ── Quick actions ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <SecHead title="Quick Actions" sub="Jump to your most-used tasks" />
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          <QuickBtn to="/ta/submissions"  icon={ClipboardCheck} label="Review Submissions"  color="blue"    />
          <QuickBtn to="/ta/discussions"  icon={MessageSquare}  label="Discussions"         color="indigo"  />
          <QuickBtn to="/ta/classes"      icon={Users}          label="Class Roster"        color="emerald" />
          <QuickBtn to="/ta/resources"    icon={BookOpen}       label="Resources"           color="violet"  />
          <QuickBtn to="/messages"        icon={Send}           label="Messages"            color="amber"   />
        </div>
      </div>

      {/* ── Main two-column layout ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left column — spans 2/3 on large screens */}
        <div className="lg:col-span-2 space-y-6">

          {/* Assigned class sections */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <SecHead
              title="Assigned Class Sections"
              sub={`${taAssignments.length} section${taAssignments.length !== 1 ? 's' : ''} — your authorized scope`}
              linkTo="/ta/classes"
              linkLabel="Full roster"
            />

            {taAssignments.length === 0 ? (
              <EmptyState
                title="No sections assigned yet"
                description="Contact your instructor or academic admin to be assigned to a class section."
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {taAssignments.map((ta) => {
                  const cls        = ta.classSection;
                  const course     = cls?.courseOffering?.course;
                  const rosterCount = cls?.memberships?.length ?? 0;
                  const enrolled   = (cls?.memberships || []).filter((mb) => mb.status === 'enrolled').length;

                  // Per-class pending submissions
                  const classPending = pendingSubmissions.filter((s) => s.classId === ta.classId).length;
                  const fillPct      = cls?.capacity ? Math.round((enrolled / cls.capacity) * 100) : 0;

                  return (
                    <div
                      key={ta.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3 hover:bg-white hover:shadow-sm transition-all"
                    >
                      {/* Section code + roster count */}
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[13px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded">
                          {cls?.sectionCode ?? '—'}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          {rosterCount} student{rosterCount !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Course title */}
                      <div>
                        <p className="text-sm font-bold text-slate-900 leading-snug truncate">
                          {course?.title ?? cls?.name ?? 'Untitled Class'}
                        </p>
                        <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                          {course?.code ?? '—'}
                        </p>
                      </div>

                      {/* Enrollment fill bar */}
                      {cls?.capacity > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>Enrollment</span>
                            <span className="font-semibold">{enrolled} / {cls.capacity}</span>
                          </div>
                          <ProgressBar
                            value={fillPct}
                            color={fillPct >= 90 ? 'bg-amber-400' : 'bg-blue-400'}
                          />
                        </div>
                      )}

                      {/* Pending submissions chip */}
                      {classPending > 0 && (
                        <Link
                          to="/ta/submissions"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-[11px] font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
                        >
                          <ClipboardCheck className="w-3 h-3" aria-hidden="true" />
                          {classPending} pending submission{classPending !== 1 ? 's' : ''}
                        </Link>
                      )}

                      {/* Capability pills */}
                      <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100">
                        <CapPill granted={ta.canViewRoster}        label="Roster"       />
                        <CapPill granted={ta.canReviewSubmissions}  label="Submissions"  />
                        <CapPill granted={ta.canApplyRubrics}       label="Rubrics"      />
                        <CapPill granted={ta.canManageDiscussions}  label="Discussions"  />
                        <CapPill granted={ta.canUploadResources}    label="Resources"    />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pending submissions overview */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <SecHead
              title="Pending Submission Review"
              sub="Submitted, late, and under-review items across your sections"
              linkTo="/ta/submissions"
              linkLabel="Open review queue"
            />

            {pendingSubmissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" aria-hidden="true" />
                <p className="text-sm font-semibold text-slate-700">All caught up</p>
                <p className="text-xs text-slate-400">No submissions are waiting for review.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {pendingSubmissions.map((sub) => {
                  const isOverdue = sub.assignment?.dueDate && new Date(sub.assignment.dueDate) < new Date();
                  return (
                    <div
                      key={sub.id}
                      className={`flex items-center justify-between gap-3 p-3 rounded-lg border text-xs transition-colors hover:bg-slate-50 ${
                        sub.flaggedForInstructorReview
                          ? 'bg-amber-50/60 border-amber-200'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {sub.flaggedForInstructorReview && (
                            <Flag className="w-3 h-3 text-amber-500 shrink-0" aria-label="Flagged" />
                          )}
                          <p className="font-semibold text-slate-900 truncate">
                            {sub.student?.firstName} {sub.student?.lastName}
                          </p>
                        </div>
                        <p className="text-slate-500 truncate">{sub.assignment?.title}</p>
                        {sub.flaggedForInstructorReview && sub.flagReason && (
                          <p className="text-amber-700 font-medium mt-0.5 text-[11px] truncate">
                            Flag: {sub.flagReason}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1.5">
                        <StatusBadge status={sub.status} />
                        {sub.assignment?.dueDate && (
                          <span className={`text-[10px] font-medium ${isOverdue ? 'text-rose-500' : 'text-slate-400'}`}>
                            {isOverdue ? 'Overdue · ' : 'Due '}
                            {new Date(sub.assignment.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent student activity */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <SecHead
              title="Recent Student Activity"
              sub="Latest submission events across all assigned sections"
              linkTo="/ta/submissions"
            />

            {recentActivity.length === 0 ? (
              <EmptyState
                title="No recent activity"
                description="Student submissions will appear here as they come in."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {recentActivity.map((sub) => (
                  <div key={sub.id} className="flex items-center gap-3 py-3 text-xs">
                    {/* Avatar initials */}
                    <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[11px] shrink-0 select-none" aria-hidden="true">
                      {(sub.student?.firstName?.[0] ?? '?')}{(sub.student?.lastName?.[0] ?? '')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 truncate">
                        {sub.student?.firstName} {sub.student?.lastName}
                      </p>
                      <p className="text-slate-500 truncate">{sub.assignment?.title}</p>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <StatusBadge status={sub.status} />
                      <span className="text-[10px] text-slate-400">{relTime(sub.submittedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column — sidebar panels */}
        <div className="space-y-6">

          {/* Recent discussions */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <SecHead
              title="Recent Discussions"
              sub="Student questions needing attention"
              linkTo="/ta/discussions"
              linkLabel="All threads"
            />

            {recentDiscussions.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No discussion threads yet.</p>
            ) : (
              <div className="space-y-2">
                {recentDiscussions.map((t) => (
                  <Link
                    key={t.id}
                    to="/ta/discussions"
                    className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 hover:bg-white hover:border-slate-300 transition-all group"
                  >
                    <MessageSquare
                      className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${t.isResolved ? 'text-emerald-500' : 'text-blue-500'}`}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-900 truncate group-hover:text-blue-700">
                        {t.title}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {t.author?.firstName} {t.author?.lastName}
                        {t.isEscalated && (
                          <span className="ml-1.5 text-amber-600 font-semibold">· Escalated</span>
                        )}
                        {t.isResolved && (
                          <span className="ml-1.5 text-emerald-600 font-semibold">· Resolved</span>
                        )}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 mt-0.5">{relTime(t.createdAt)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Announcements */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <SecHead
              title="Announcements"
              sub="Recent institutional and class bulletins"
            />

            {recentAnnouncements.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No announcements found.</p>
            ) : (
              <div className="space-y-2">
                {recentAnnouncements.map((a) => {
                  const priorityStyle = {
                    urgent:    'border-rose-200   bg-rose-50/50  text-rose-700',
                    important: 'border-amber-200  bg-amber-50/50 text-amber-700',
                    normal:    'border-slate-200  bg-slate-50    text-slate-600',
                  }[a.priority] || 'border-slate-200 bg-slate-50 text-slate-600';

                  return (
                    <div
                      key={a.id}
                      className={`p-3 rounded-lg border text-xs ${priorityStyle}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-semibold text-slate-900 leading-snug">{a.title}</p>
                        {a.isPinned && (
                          <span className="text-blue-500 shrink-0" title="Pinned" aria-label="Pinned announcement">
                            📌
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 line-clamp-2 leading-relaxed">{a.content}</p>
                      <p className="text-[10px] text-slate-400 mt-1.5">
                        {a.author?.firstName} {a.author?.lastName} · {new Date(a.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Flagged submissions needing escalation */}
          {flaggedSubmissions.length > 0 && (
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Flag className="w-4 h-4 text-amber-600" aria-hidden="true" />
                <h2 className="text-sm font-bold text-slate-900">
                  Escalation Needed
                </h2>
              </div>
              <p className="text-xs text-slate-600 mb-3">
                {flaggedSubmissions.length} submission{flaggedSubmissions.length !== 1 ? 's' : ''} flagged for instructor review.
              </p>
              <div className="space-y-2">
                {flaggedSubmissions.slice(0, 4).map((sub) => (
                  <div key={sub.id} className="p-2.5 rounded-lg bg-white border border-amber-100 text-xs">
                    <p className="font-semibold text-slate-900 truncate">
                      {sub.student?.firstName} {sub.student?.lastName}
                    </p>
                    <p className="text-slate-500 truncate mt-0.5">{sub.assignment?.title}</p>
                    {sub.flagReason && (
                      <p className="text-amber-700 font-medium mt-0.5 text-[11px] truncate">
                        {sub.flagReason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              {flaggedSubmissions.length > 4 && (
                <Link
                  to="/ta/submissions"
                  className="mt-3 flex items-center justify-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900"
                >
                  View all {flaggedSubmissions.length} flagged <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function TaSubmissionsReviewPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  /* ── state ──────────────────────────────────────────────────────────────── */
  const [activeTab, setActiveTab]       = useState('pending');
  const [search, setSearch]             = useState('');
  const [classFilter, setClassFilter]   = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState('');
  const [selectedSub, setSelectedSub]   = useState(null);
  const [preliminaryFeedback, setPreliminaryFeedback] = useState('');
  const [rubricScores, setRubricScores] = useState({});
  const [rubricComments, setRubricComments] = useState({});
  const [flagged, setFlagged]           = useState(false);
  const [flagCategory, setFlagCategory] = useState('');
  const [flagReason, setFlagReason]     = useState('');
  const [saving, setSaving]             = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [validationError, setValidationError] = useState('');

  /* ── data ───────────────────────────────────────────────────────────────── */
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['submissions', 'ta'],
    queryFn: () => lmsApi.listSubmissions(),
    staleTime: 20_000,
  });

  // Fetch assignments separately for rubric criteria + filter dropdown
  const { data: assignmentsData } = useQuery({
    queryKey: ['assignments', 'ta'],
    queryFn: () => lmsApi.listAssignments(),
    staleTime: 30_000,
  });

  // Fetch classes for filter dropdown
  const { data: classesData } = useQuery({
    queryKey: ['classes', 'ta'],
    queryFn: lmsApi.listClasses,
    staleTime: 30_000,
  });

  // Fetch escalation history for the selected submission
  const { data: escalationData, isLoading: escalationLoading } = useQuery({
    queryKey: ['escalation-history', selectedSub?.id],
    queryFn: () => lmsApi.getEscalationHistory(selectedSub.id),
    enabled: Boolean(selectedSub?.id),
    staleTime: 10_000,
  });
  const escalationHistory = escalationData?.data?.history || [];
  const currentEscalation = escalationData?.data?.currentEscalation || null;

  const allSubmissions = data?.data?.submissions || [];
  const allAssignments = assignmentsData?.data?.assignments || [];
  const allClasses     = classesData?.data?.classes || [];

  // Build assignment lookup (includes rubric criteria not available in submissions response)
  const assignmentMap = React.useMemo(() => {
    const map = {};
    for (const a of allAssignments) {
      map[a.id] = a;
    }
    return map;
  }, [allAssignments]);

  /* ── filtering ───────────────────────────────────────────────────────────── */
  const pending    = allSubmissions.filter((s) => ['submitted', 'late', 'under_review'].includes(s.status));
  const flaggedAll = allSubmissions.filter((s) => s.flaggedForInstructorReview);
  const gradedAll = allSubmissions.filter((s) => s.status === 'graded');

  const tabCounts = { all: allSubmissions.length, pending: pending.length, flagged: flaggedAll.length, graded: gradedAll.length };

  const baseRows = activeTab === 'pending' ? pending
                 : activeTab === 'flagged' ? flaggedAll
                 : activeTab === 'graded'  ? gradedAll
                 : allSubmissions;

  const classFiltered = classFilter
    ? baseRows.filter((s) => s.classId === Number(classFilter))
    : baseRows;

  const assignmentFiltered = assignmentFilter
    ? classFiltered.filter((s) => s.assignmentId === Number(assignmentFilter))
    : classFiltered;

  const rows = search.trim()
    ? assignmentFiltered.filter((s) => {
        const t = search.toLowerCase();
        return (
          `${s.student?.firstName ?? ''} ${s.student?.lastName ?? ''}`.toLowerCase().includes(t) ||
          s.assignment?.title?.toLowerCase().includes(t) ||
          (s.student?.studentNumber ?? '').toLowerCase().includes(t)
        );
      })
    : assignmentFiltered;

  // Unique assignments for filter dropdown (derived from visible submissions)
  const assignmentOptions = React.useMemo(() => {
    const seen = new Set();
    const result = [];
    for (const s of classFiltered) {
      if (s.assignmentId && !seen.has(s.assignmentId)) {
        seen.add(s.assignmentId);
        result.push({ id: s.assignmentId, title: s.assignment?.title || `Assignment #${s.assignmentId}` });
      }
    }
    return result.sort((a, b) => a.title.localeCompare(b.title));
  }, [classFiltered]);

  const TABS = [
    { key: 'pending', label: 'Pending Review' },
    { key: 'flagged', label: 'Flagged'        },
    { key: 'graded',  label: 'Graded'         },
    { key: 'all',     label: 'All'            },
  ];

  const FLAG_CATEGORIES = [
    { value: 'plagiarism',              label: 'Possible Plagiarism / Academic Integrity' },
    { value: 'incomplete_submission',   label: 'Incomplete or Unclear Submission'         },
    { value: 'technical_issue',          label: 'Technical Problem with Submitted Files'  },
    { value: 'unusual_content',          label: 'Unusual Submission Content'               },
    { value: 'instructor_review_needed', label: 'Requires Instructor Review'              },
  ];

  // Helper to parse structured flagReason JSON for display
  const parseFlagReason = (reasonStr) => {
    if (!reasonStr) return null;
    try {
      return JSON.parse(reasonStr);
    } catch (_) {
      return { description: reasonStr, category: null };
    }
  };

  const getCategoryLabel = (cat) =>
    FLAG_CATEGORIES.find((c) => c.value === cat)?.label || cat || 'Flagged';

  /* ── review modal helpers ────────────────────────────────────────────────── */
  const openReview = (s) => {
    setSelectedSub(s);
    setPreliminaryFeedback(s.preliminaryFeedback || '');
    setFlagged(Boolean(s.flaggedForInstructorReview));
    setFlagCategory('');
    setFlagReason('');
    setValidationError('');

    // Parse structured flagReason JSON (backward compatible with old plain-text format)
    if (s.flagReason) {
      try {
        const parsed = JSON.parse(s.flagReason);
        setFlagCategory(parsed.category || '');
        setFlagReason(parsed.description || '');
      } catch (_) {
        // Old-format plain text — use as description
        setFlagReason(s.flagReason);
      }
    }

    // Load existing rubric scores and comments
    const existingRubric = s.rubricEvaluation || {};
    const scores = {};
    const comments = {};
    if (existingRubric.criteria) {
      for (const c of existingRubric.criteria) {
        scores[c.criterionId] = c.score;
        comments[c.criterionId] = c.comment || '';
      }
    }
    setRubricScores(scores);
    setRubricComments(comments);
    setShowConfirm(false);
  };

  const closeModal = () => {
    setSelectedSub(null);
    setShowConfirm(false);
    setValidationError('');
    setRubricScores({});
    setRubricComments({});
    setFlagCategory('');
    setFlagged(false);
    setFlagReason('');
  };

  const validateReview = () => {
    if (flagged) {
      if (!flagCategory) {
        return 'Please select a flag category when escalating to the instructor.';
      }
      if (!flagReason || flagReason.trim().length < 3) {
        return 'A description (at least 3 characters) is required when escalating to the instructor.';
      }
    }
    if (!preliminaryFeedback.trim() && !flagged) {
      return 'Please provide preliminary feedback or flag the submission for instructor review.';
    }
    return '';
  };

  const handleSaveTaReview = async (e) => {
    e?.preventDefault();
    const vErr = validateReview();
    if (vErr) { setValidationError(vErr); return; }

    // If not yet confirmed, show confirmation step
    if (!showConfirm) {
      setShowConfirm(true);
      setValidationError('');
      return;
    }

    // Confirmed — proceed to save
    setSaving(true);
    setValidationError('');
    try {
      // Build rubricEvaluation from scores
      const fullAssignment = assignmentMap[selectedSub.assignmentId];
      const rubricCriteria = fullAssignment?.rubric?.criteria || [];
      const rubricEvaluation = rubricCriteria.length > 0
        ? {
            criteria: rubricCriteria.map((c) => ({
              criterionId: c.id,
              criterionName: c.criterionName,
              score: rubricScores[c.id] !== undefined ? Number(rubricScores[c.id]) : 0,
              maxPoints: Number(c.maxPoints),
              comment: rubricComments[c.id] || '',
            })),
          }
        : undefined;

      const res = await lmsApi.reviewSubmission(selectedSub.id, {
        preliminaryFeedback: preliminaryFeedback.trim() || undefined,
        rubricEvaluation,
        flaggedForInstructorReview: flagged,
        flagReason: flagged ? flagReason.trim() : undefined,
        flagCategory: flagged ? flagCategory : undefined,
      });
      addToast(res.message || 'Review saved.');
      closeModal();
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['ta-student-monitoring'] });
      queryClient.invalidateQueries({ queryKey: ['escalation-history'] });
    } catch (err) {
      setValidationError(extractErrorMessage(err));
      setShowConfirm(false);
    } finally {
      setSaving(false);
    }
  };

  /* ── early states ────────────────────────────────────────────────────────── */
  if (isLoading) return <LoadingState label="Loading submissions…" />;
  if (error)     return <ErrorState message={extractErrorMessage(error)} onRetry={refetch} />;

  return (
    <div className="space-y-6 pb-8">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md mb-2">
            <ClipboardCheck className="w-3.5 h-3.5" aria-hidden="true" />
            Submission Review
          </span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Review & Feedback</h1>
          <p className="text-sm text-slate-500 mt-1">
            Provide preliminary feedback, apply rubric scores, and escalate submissions requiring instructor attention.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="self-start sm:self-auto flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          aria-label="Refresh submissions"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          Refresh
        </button>
      </div>

      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        {/* Class + assignment dropdowns */}
        <div className="flex flex-wrap gap-2">
          <select
            value={classFilter}
            onChange={(e) => { setClassFilter(e.target.value); setAssignmentFilter(''); }}
            className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium bg-white min-w-[160px]"
            aria-label="Filter by class section"
          >
            <option value="">All Sections</option>
            {allClasses.map((c) => (
              <option key={c.id} value={c.id}>{c.sectionCode} — {c.courseOffering?.course?.code || c.name}</option>
            ))}
          </select>

          <select
            value={assignmentFilter}
            onChange={(e) => setAssignmentFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium bg-white min-w-[180px]"
            aria-label="Filter by assignment"
          >
            <option value="">All Assignments</option>
            {assignmentOptions.map((a) => (
              <option key={a.id} value={a.id}>{a.title}</option>
            ))}
          </select>
        </div>

        {/* Status tabs + search */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Submission status filter">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={activeTab === t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  activeTab === t.key
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {t.label}
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === t.key ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {tabCounts[t.key]}
                </span>
              </button>
            ))}
          </div>
          <div className="relative sm:ml-auto w-full sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student or assignment…"
              className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
              aria-label="Search submissions"
            />
          </div>
        </div>
      </div>

      {/* ── Flagged alert banner ────────────────────────────────────────── */}
      {activeTab !== 'flagged' && flaggedAll.length > 0 && (
        <div className="flex items-center gap-3 p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs">
          <Flag className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
          <p className="text-amber-800 font-medium">
            {flaggedAll.length} submission{flaggedAll.length !== 1 ? 's are' : ' is'} flagged for instructor review.
          </p>
          <button
            type="button"
            onClick={() => setActiveTab('flagged')}
            className="ml-auto text-amber-700 font-semibold hover:text-amber-900 shrink-0"
          >
            View flagged →
          </button>
        </div>
      )}

      {/* ── Active filter indicators ───────────────────────────────────── */}
      {(classFilter || assignmentFilter) && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-500">Filters:</span>
          {classFilter && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-blue-50 text-blue-700 border-blue-200">
              {allClasses.find((c) => c.id === Number(classFilter))?.sectionCode || 'Class'}
              <button type="button" onClick={() => setClassFilter('')} aria-label="Clear class filter" className="hover:opacity-70">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {assignmentFilter && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-indigo-50 text-indigo-700 border-indigo-200">
              {assignmentOptions.find((a) => a.id === Number(assignmentFilter))?.title || 'Assignment'}
              <button type="button" onClick={() => setAssignmentFilter('')} aria-label="Clear assignment filter" className="hover:opacity-70">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* ── Queue table / empty state ───────────────────────────────────── */}
      {rows.length === 0 ? (
        <EmptyState
          title={
            activeTab === 'pending' ? 'No pending submissions' :
            activeTab === 'flagged' ? 'No flagged submissions' :
            activeTab === 'graded'  ? 'No graded submissions' :
            'No submissions found'
          }
          description={
            search.trim()
              ? `No results match "${search}".`
              : classFilter || assignmentFilter
              ? 'No submissions match the selected filters.'
              : activeTab === 'pending'
              ? 'All submissions have been reviewed or are not yet submitted.'
              : 'No submissions exist for your assigned sections yet.'
          }
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 font-semibold">Assignment</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Submitted</th>
                  <th className="px-4 py-3 font-semibold">Feedback</th>
                  <th className="px-4 py-3 font-semibold">Flag</th>
                  <th className="px-4 py-3 font-semibold sr-only">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((s) => {
                  const isOverdue = s.assignment?.dueDate && new Date(s.assignment.dueDate) < new Date();
                  const submittedDate = s.submittedAt ? new Date(s.submittedAt).toLocaleDateString() : '—';
                  return (
                    <tr
                      key={s.id}
                      className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                        s.flaggedForInstructorReview ? 'bg-amber-50/40' : ''
                      }`}
                      onClick={() => openReview(s)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">
                          {s.student?.firstName} {s.student?.lastName}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{s.student?.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-800 font-medium">{s.assignment?.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {s.isLate && <span className="text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-full">LATE</span>}
                          <span className="text-[11px] text-slate-400">Attempt {s.attemptNumber || 1}</span>
                          {s.assignment?.maxScore && <span className="text-[11px] text-slate-400">/ {s.assignment.maxScore} pts</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] ${s.isLate ? 'text-orange-600 font-medium' : 'text-slate-500'}`}>
                          {submittedDate}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-[160px]">
                        {s.preliminaryFeedback
                          ? <span className="line-clamp-2">{s.preliminaryFeedback}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {s.flaggedForInstructorReview ? (() => {
                          const fr = parseFlagReason(s.flagReason);
                          const catLabel = fr?.category ? getCategoryLabel(fr.category) : 'Flagged';
                          const shortLabel = catLabel.length > 25 ? catLabel.slice(0, 25) + '…' : catLabel;
                          return (
                            <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full font-semibold text-[11px]" title={catLabel}>
                              <Flag className="w-3 h-3" aria-hidden="true" />
                              {shortLabel}
                            </span>
                          );
                        })() : (
                          <span className="text-slate-300 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openReview(s); }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            s.preliminaryFeedback || s.status === 'under_review'
                              ? 'bg-slate-700 hover:bg-slate-900 text-white'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          {s.preliminaryFeedback || s.status === 'under_review' ? 'Update' : 'Review'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="sm:hidden divide-y divide-slate-100">
            {rows.map((s) => (
              <div
                key={s.id}
                className={`p-4 space-y-2 cursor-pointer active:bg-slate-50 transition-colors ${s.flaggedForInstructorReview ? 'bg-amber-50/40' : ''}`}
                onClick={() => openReview(s)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {s.student?.firstName} {s.student?.lastName}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{s.assignment?.title}</p>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {s.isLate && <span className="text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-full">LATE</span>}
                  <span className="text-[11px] text-slate-400">
                    {s.submittedAt ? new Date(s.submittedAt).toLocaleDateString() : 'Not submitted'} · Attempt {s.attemptNumber || 1}
                  </span>
                </div>
                {s.flaggedForInstructorReview && (() => {
                  const fr = parseFlagReason(s.flagReason);
                  return (
                    <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full font-semibold text-[11px]">
                      <Flag className="w-3 h-3" aria-hidden="true" />
                      {fr?.category ? getCategoryLabel(fr.category) : (s.flagReason || 'Flagged for instructor')}
                    </span>
                  );
                })()}
                {s.preliminaryFeedback && (
                  <p className="text-xs text-slate-600 line-clamp-2">{s.preliminaryFeedback}</p>
                )}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); openReview(s); }}
                  className={`w-full py-2 rounded-lg text-xs font-semibold transition-colors ${
                    s.preliminaryFeedback || s.status === 'under_review'
                      ? 'bg-slate-700 hover:bg-slate-900 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {s.preliminaryFeedback || s.status === 'under_review' ? 'Update Review' : 'Review & Feedback'}
                </button>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-400">
            {rows.length} submission{rows.length !== 1 ? 's' : ''}
            {classFilter || assignmentFilter ? ' (filtered)' : ''}
            {search.trim() ? ` matching "${search}"` : ''}
          </div>
        </div>
      )}

      {/* ── Review modal ─────────────────────────────────────────────────── */}
      <ModalDialog
        isOpen={Boolean(selectedSub)}
        onClose={closeModal}
        title={showConfirm ? 'Confirm Review' : 'Submission Review & Feedback'}
        maxWidth="max-w-2xl"
      >
        {selectedSub && (() => {
          const fullAssignment = assignmentMap[selectedSub.assignmentId];
          const rubricCriteria = fullAssignment?.rubric?.criteria || [];
          const hasCode = Boolean(selectedSub.codeSubmission);
          const hasText = Boolean(selectedSub.textResponse);
          const hasFile = Boolean(selectedSub.storedFilename);
          const isLate = selectedSub.isLate;
          const submittedDate = selectedSub.submittedAt
            ? new Date(selectedSub.submittedAt).toLocaleString()
            : 'Not submitted';

          // Live preliminary rubric total
          const rubricTotal = rubricCriteria.reduce(
            (acc, c) => acc + (rubricScores[c.id] !== undefined ? Number(rubricScores[c.id]) : 0), 0
          );
          const rubricMaxTotal = rubricCriteria.reduce(
            (acc, c) => acc + Number(c.maxPoints), 0
          );
          const rubricPct = rubricMaxTotal > 0
            ? Math.round((rubricTotal / rubricMaxTotal) * 100)
            : 0;

          // Review activity indicator
          const existingRubricEval = selectedSub.rubricEvaluation || {};
          const hasBeenReviewed = Boolean(selectedSub.preliminaryFeedback || existingRubricEval.criteria);
          const reviewedByName = existingRubricEval.reviewedByName;
          const reviewedAt = existingRubricEval.reviewedAt
            ? new Date(existingRubricEval.reviewedAt).toLocaleString()
            : null;
          const isPendingApproval = selectedSub.status === 'under_review';

          return showConfirm ? (
            /* ── Confirmation step ─────────────────────────────────────── */
            <div className="space-y-4 text-xs">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <p className="text-blue-800 font-medium">Please confirm the following review before saving:</p>
              </div>

              <dl className="space-y-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex justify-between">
                  <dt className="text-slate-400">Student</dt>
                  <dd className="font-semibold text-slate-900">{selectedSub.student?.firstName} {selectedSub.student?.lastName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">Assignment</dt>
                  <dd className="font-semibold text-slate-900 text-right">{selectedSub.assignment?.title}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">Feedback provided</dt>
                  <dd className={preliminaryFeedback.trim() ? 'text-emerald-600 font-semibold' : 'text-slate-400'}>
                    {preliminaryFeedback.trim() ? 'Yes' : 'No'}
                  </dd>
                </div>
                {rubricCriteria.length > 0 && (
                  <>
                    <div className="flex justify-between">
                      <dt className="text-slate-400">Rubric scored</dt>
                      <dd className={Object.keys(rubricScores).length > 0 ? 'text-emerald-600 font-semibold' : 'text-slate-400'}>
                        {Object.keys(rubricScores).length} / {rubricCriteria.length} criteria
                      </dd>
                    </div>
                    {rubricMaxTotal > 0 && (
                      <div className="flex justify-between">
                        <dt className="text-slate-400">Preliminary total</dt>
                        <dd className="font-bold text-slate-900">
                          {rubricTotal} / {rubricMaxTotal} pts ({rubricPct}%)
                        </dd>
                      </div>
                    )}
                  </>
                )}
                <div className="flex justify-between">
                  <dt className="text-slate-400">Flagged for instructor</dt>
                  <dd className={flagged ? 'text-amber-600 font-semibold' : 'text-slate-400'}>
                    {flagged ? 'Yes' : 'No'}
                  </dd>
                </div>
                {flagged && (
                  <>
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-400 shrink-0">Category</dt>
                      <dd className="text-amber-800 font-medium text-right">{getCategoryLabel(flagCategory)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-400 shrink-0">Description</dt>
                      <dd className="text-amber-800 font-medium text-right max-w-[60%] truncate" title={flagReason}>{flagReason}</dd>
                    </div>
                  </>
                )}
              </dl>

              <p className="text-[11px] text-slate-400 italic">
                This will set the submission status to <strong>Under Review</strong>. The instructor will be able to see your feedback and rubric scores. {flagged ? 'The instructor will be notified of the flag.' : ''}
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-2.5 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors text-xs"
                >
                  ← Back to Edit
                </button>
                <button
                  type="button"
                  onClick={handleSaveTaReview}
                  disabled={saving}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors text-xs disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                      Saving…
                    </>
                  ) : (
                    'Confirm & Save'
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* ── Review form ──────────────────────────────────────────── */
            <form onSubmit={handleSaveTaReview} className="space-y-4 text-xs">
              {/* Submission info */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">
                      {selectedSub.student?.firstName} {selectedSub.student?.lastName}
                    </p>
                    <p className="text-slate-500 mt-0.5">{selectedSub.assignment?.title}</p>
                  </div>
                  <StatusBadge status={selectedSub.status} />
                </div>
                <div className="flex items-center gap-3 flex-wrap pt-1 border-t border-slate-200/60">
                  <span className="text-slate-500">
                    Submitted: <span className={`font-semibold ${isLate ? 'text-orange-600' : 'text-slate-700'}`}>{submittedDate}</span>
                  </span>
                  {isLate && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-full">
                      <Clock className="w-2.5 h-2.5" /> LATE
                    </span>
                  )}
                  <span className="text-slate-500">Attempt: <span className="font-semibold text-slate-700">{selectedSub.attemptNumber || 1}</span></span>
                  {selectedSub.assignment?.maxScore && (
                    <span className="text-slate-500">Max: <span className="font-semibold text-slate-700">{selectedSub.assignment.maxScore} pts</span></span>
                  )}
                </div>
              </div>

              {/* Pending instructor approval banner */}
              {isPendingApproval && (
                <div className="flex items-center gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <p className="text-amber-800 font-medium">
                    This submission is currently <strong>Under Review</strong> — pending instructor approval. Your preliminary scores will not become official grades.
                  </p>
                </div>
              )}

              {/* Review activity indicator */}
              {hasBeenReviewed && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-500">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>
                    Previously reviewed
                    {reviewedByName && ` by ${reviewedByName}`}
                    {reviewedAt && ` on ${reviewedAt}`}
                    {existingRubricEval.rubricPercentage !== undefined && (
                      <span className="font-semibold text-slate-700 ml-1">
                        · Preliminary: {existingRubricEval.rubricTotal}/{existingRubricEval.rubricMaxTotal} ({existingRubricEval.rubricPercentage}%)
                      </span>
                    )}
                  </span>
                </div>
              )}

              {/* Assignment instructions */}
              {fullAssignment?.instructions && (
                <details className="group">
                  <summary className="font-semibold text-slate-700 cursor-pointer select-none flex items-center gap-1.5 list-none">
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-open:rotate-180 transition-transform" />
                    Assignment Instructions
                  </summary>
                  <p className="mt-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 leading-relaxed max-h-32 overflow-y-auto">
                    {fullAssignment.instructions}
                  </p>
                </details>
              )}

              {/* Submission content viewer */}
              <div className="space-y-2.5">
                <p className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Student Submission</p>

                {/* Code submission */}
                {hasCode && (
                  <div>
                    <p className="font-semibold text-slate-600 mb-1">Code</p>
                    <pre className="p-3 rounded-lg bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-48 overflow-y-auto">
                      {selectedSub.codeSubmission}
                    </pre>
                  </div>
                )}

                {/* Text response */}
                {hasText && (
                  <div>
                    <p className="font-semibold text-slate-600 mb-1">Text Response</p>
                    <p className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap">
                      {selectedSub.textResponse}
                    </p>
                  </div>
                )}

                {/* File submission */}
                {hasFile && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <FileSpreadsheet className="w-4 h-4 text-slate-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 truncate">{selectedSub.originalFilename || 'Submitted file'}</p>
                      <p className="text-[11px] text-slate-400">
                        {selectedSub.mimeType || 'Unknown type'} · {selectedSub.fileSizeBytes ? `${(selectedSub.fileSizeBytes / 1024).toFixed(0)} KB` : '—'}
                      </p>
                    </div>
                    <a
                      href={`/api/resources/download/${selectedSub.storedFilename}`}
                      download
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-semibold text-[11px] hover:bg-blue-100 transition-colors shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </a>
                  </div>
                )}

                {/* Repository URL */}
                {selectedSub.repositoryUrl && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-400 text-[11px]">Repo:</span>
                    <a href={selectedSub.repositoryUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-[11px] truncate">
                      {selectedSub.repositoryUrl}
                    </a>
                  </div>
                )}

                {/* No content */}
                {!hasCode && !hasText && !hasFile && !selectedSub.repositoryUrl && (
                  <p className="text-slate-400 italic p-3 text-center bg-slate-50 rounded-lg border border-slate-200">
                    No submission content was provided.
                  </p>
                )}
              </div>

              {/* Rubric criteria scoring */}
              {rubricCriteria.length > 0 && (
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">
                      Preliminary Rubric Scoring
                    </p>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      <Clock className="w-2.5 h-2.5" />
                      Pending Instructor Approval
                    </span>
                  </div>

                  {/* Criteria list */}
                  <div className="space-y-2">
                    {rubricCriteria.map((c, idx) => {
                      const score = rubricScores[c.id];
                      const hasScore = score !== undefined && score !== '';
                      const isOverMax = hasScore && Number(score) > Number(c.maxPoints);
                      return (
                        <div key={c.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                          {/* Criterion header + score input */}
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded shrink-0">
                                  {idx + 1}
                                </span>
                                <p className="font-semibold text-slate-800">{c.criterionName}</p>
                              </div>
                              {c.description && (
                                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed pl-6">{c.description}</p>
                              )}
                              <p className="text-[11px] text-slate-500 mt-1 pl-6">
                                Max: <span className="font-semibold text-slate-600">{c.maxPoints} pts</span>
                              </p>
                            </div>
                            <div className="shrink-0 text-center">
                              <input
                                type="number"
                                min="0"
                                max={c.maxPoints}
                                step="0.5"
                                value={score ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setRubricScores((prev) => ({
                                    ...prev,
                                    [c.id]: val === '' ? undefined : Math.min(Number(c.maxPoints), Math.max(0, Number(val))),
                                  }));
                                }}
                                placeholder="0"
                                className={`w-16 px-2 py-1.5 rounded-lg border text-center font-mono font-bold text-xs focus:ring-2 focus:ring-blue-500 outline-none ${
                                  isOverMax ? 'border-rose-400 bg-rose-50' : 'border-slate-300'
                                }`}
                                aria-label={`Score for ${c.criterionName}`}
                              />
                              <p className="text-[10px] text-slate-400 mt-0.5">/ {c.maxPoints}</p>
                            </div>
                          </div>

                          {/* Per-criterion comment */}
                          <textarea
                            value={rubricComments[c.id] || ''}
                            onChange={(e) => {
                              setRubricComments((prev) => ({
                                ...prev,
                                [c.id]: e.target.value,
                              }));
                            }}
                            placeholder={`Comment on "${c.criterionName}" (optional)…`}
                            rows={2}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] text-slate-700 resize-none focus:ring-2 focus:ring-blue-400 outline-none placeholder-slate-300"
                            aria-label={`Comment for ${c.criterionName}`}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Live preliminary total */}
                  {rubricMaxTotal > 0 && (
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Preliminary Total</p>
                        <p className="font-mono font-bold text-sm text-blue-900">
                          {rubricTotal} <span className="text-blue-400 font-normal">/</span> {rubricMaxTotal} pts
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-blue-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(100, rubricPct)}%` }}
                            role="progressbar"
                            aria-valuenow={rubricPct}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label="Preliminary rubric score percentage"
                          />
                        </div>
                        <span className="font-mono font-bold text-xs text-blue-700 w-10 text-right shrink-0">
                          {rubricPct}%
                        </span>
                      </div>
                      <p className="text-[10px] text-blue-600 italic">
                        This is a preliminary score pending instructor approval — it will not be published as an official grade.
                      </p>
                    </div>
                  )}

                  {/* Notice */}
                  <p className="text-[11px] text-slate-400 italic">
                    Rubric scores and comments are preliminary. Only the instructor can publish or finalize official grades.
                  </p>
                </div>
              )}

              {/* Preliminary feedback */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5" htmlFor="ta-feedback">
                  Preliminary Feedback <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="ta-feedback"
                  rows={4}
                  value={preliminaryFeedback}
                  onChange={(e) => setPreliminaryFeedback(e.target.value)}
                  placeholder="Provide initial comments for the student and instructor…"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none resize-none text-xs"
                />
              </div>

              {/* Flag toggle */}
              <div className="space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={flagged}
                    onChange={(e) => setFlagged(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="font-semibold text-amber-900 flex items-center gap-1.5">
                    <Flag className="w-3.5 h-3.5" />
                    Flag for Instructor Review (Escalate)
                  </span>
                </label>

                {/* No-penalty disclaimer */}
                {flagged && (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
                    <p>Flagging requests instructor review only. No penalty or misconduct accusation is applied to the student. The instructor will make the final decision.</p>
                  </div>
                )}

                {/* Current escalation status (if already flagged) */}
                {flagged && currentEscalation && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px]">
                    <span className="font-bold text-slate-400 uppercase tracking-wider">Current status:</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                      <Clock className="w-3 h-3" />
                      {currentEscalation.status ? currentEscalation.status.replace(/_/g, ' ') : 'Pending Instructor Review'}
                    </span>
                    {currentEscalation.flaggedByName && (
                      <span className="text-slate-400">· flagged by {currentEscalation.flaggedByName}</span>
                    )}
                    {currentEscalation.flaggedAt && (
                      <span className="text-slate-400">on {new Date(currentEscalation.flaggedAt).toLocaleString()}</span>
                    )}
                  </div>
                )}

                {/* Category + description when flagging */}
                {flagged && (
                  <div className="space-y-3 p-3.5 rounded-lg bg-amber-50/50 border border-amber-200">
                    {/* Category dropdown */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5" htmlFor="ta-flag-category">
                        Flag Category <span className="text-rose-500">*</span>
                      </label>
                      <select
                        id="ta-flag-category"
                        value={flagCategory}
                        onChange={(e) => setFlagCategory(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-400 outline-none text-xs bg-white"
                      >
                        <option value="">— Select a category —</option>
                        {FLAG_CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Description textarea */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5" htmlFor="ta-flag-description">
                        Description / Explanation <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        id="ta-flag-description"
                        rows={3}
                        value={flagReason}
                        onChange={(e) => setFlagReason(e.target.value)}
                        placeholder="Describe the concern in detail. Be factual and avoid accusations…"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-400 outline-none text-xs resize-none"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        The instructor will be notified with this category and description when you save. No penalty is applied.
                      </p>
                    </div>
                  </div>
                )}

                {/* Escalation history */}
                {selectedSub?.flaggedForInstructorReview && escalationHistory.length > 0 && (
                  <div className="space-y-2">
                    <p className="font-bold text-slate-700 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                      <ClipboardCheck className="w-3 h-3 text-slate-400" />
                      Escalation History
                    </p>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {escalationHistory.map((h, idx) => (
                        <div key={h.id || idx} className={`flex items-start gap-2 p-2.5 rounded-lg border text-[11px] ${
                          h.action === 'SUBMISSION_FLAGGED_BY_TA' ? 'bg-amber-50/60 border-amber-200' :
                          h.action === 'SUBMISSION_GRADED' ? 'bg-emerald-50/60 border-emerald-200' :
                          'bg-slate-50 border-slate-200'
                        }`}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`font-semibold ${
                                h.action === 'SUBMISSION_FLAGGED_BY_TA' ? 'text-amber-800' :
                                h.action === 'SUBMISSION_GRADED' ? 'text-emerald-700' :
                                'text-slate-700'
                              }`}>
                                {h.actionLabel}
                              </span>
                              {h.categoryLabel && (
                                <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 font-medium text-[10px]">
                                  {h.categoryLabel}
                                </span>
                              )}
                            </div>
                            <p className="text-slate-500 mt-0.5">
                              {h.actorName} · {new Date(h.timestamp).toLocaleString()}
                            </p>
                            {h.description && (
                              <p className="text-slate-600 mt-0.5 line-clamp-2">{h.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Validation error */}
              {validationError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{validationError}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2.5 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors text-xs flex items-center justify-center gap-2"
                >
                  {flagged ? <Flag className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  {flagged ? 'Review & Escalate' : 'Save Review'}
                </button>
              </div>

              <p className="text-[11px] text-slate-400 italic text-center">
                Preliminary review only — official grades are published by the instructor.
              </p>
            </form>
          );
        })()}
      </ModalDialog>
    </div>
  );
}

export function SharedAnnouncementsPage() {
  const { hasPermission, user } = useAuth();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [delItem, setDelItem] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const emptyForm = { scope:'class', classId:'', title:'', content:'', priority:'normal', isPinned:false, publishAt:'', expiresAt:'' };
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useQuery({ queryKey:['announcements'], queryFn:()=>lmsApi.listAnnouncements() });
  const { data: clsData } = useQuery({ queryKey:['classes'], queryFn:lmsApi.listClasses, enabled:hasPermission('announcements:manage') });
  const allClasses = clsData?.data?.classes||[];

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, classId:form.scope==='class'&&form.classId?Number(form.classId):undefined };
      if (editItem) { await lmsApi.updateAnnouncement(editItem.id, payload); addToast('Announcement updated.'); setEditItem(null); }
      else { await lmsApi.createAnnouncement(payload); addToast('Announcement published.'); setCreateOpen(false); }
      queryClient.invalidateQueries({ queryKey:['announcements'] });
    } catch (err) { addToast(extractErrorMessage(err),'error'); }
  };
  const handleDelete = async () => {
    try { await lmsApi.deleteAnnouncement(delItem.id); addToast('Announcement deleted.'); setDelItem(null); queryClient.invalidateQueries({ queryKey:['announcements'] }); }
    catch (err) { addToast(extractErrorMessage(err),'error'); }
  };
  const openEdit = (a) => { setForm({ scope:a.scope, classId:a.classId||'', title:a.title, content:a.content, priority:a.priority, isPinned:a.isPinned||false }); setEditItem(a); };

  const all = data?.data?.announcements||[];
  const counts = { all:all.length, urgent:all.filter(a=>a.priority==='urgent').length, important:all.filter(a=>a.priority==='important').length, pinned:all.filter(a=>a.isPinned).length };
  const filtered = all.filter(a=>{
    const mf=filter==='all'?true:filter==='pinned'?a.isPinned:a.priority===filter;
    const ms=!search||`${a.title} ${a.content}`.toLowerCase().includes(search.toLowerCase());
    return mf&&ms;
  });

  const priorityStyle = {
    urgent:   { card:'border-rose-300 bg-rose-50/30',  badge:'bg-rose-100 text-rose-800 border-rose-200',   dot:'bg-rose-500' },
    important:{ card:'border-amber-200 bg-amber-50/20',badge:'bg-amber-100 text-amber-800 border-amber-200', dot:'bg-amber-400' },
    normal:   { card:'border-slate-200 bg-white',      badge:'bg-slate-100 text-slate-700 border-slate-200',dot:'bg-slate-400' },
  };

  const announcementFormContent = (
    <form onSubmit={handleSave} className="space-y-4 text-xs">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block font-semibold mb-1.5">Scope</label>
          <select value={form.scope} onChange={e=>setForm(p=>({...p,scope:e.target.value}))} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
            <option value="class">Class Section</option><option value="course">Course-Wide</option><option value="department">Department</option><option value="institution">Institution-Wide</option>
          </select></div>
        <div><label className="block font-semibold mb-1.5">Priority</label>
          <select value={form.priority} onChange={e=>setForm(p=>({...p,priority:e.target.value}))} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
            <option value="normal">Normal</option><option value="important">Important</option><option value="urgent">Urgent</option>
          </select></div>
      </div>
      {form.scope==='class'&&<div><label className="block font-semibold mb-1.5">Class Section</label>
        <select required value={form.classId} onChange={e=>setForm(p=>({...p,classId:e.target.value}))} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
          <option value="">— Select class —</option>{allClasses.map(c=><option key={c.id} value={c.id}>{c.sectionCode}</option>)}
        </select></div>}
      <div>
        <label className="block font-semibold mb-1.5">Title</label>
        <input
          required
          value={form.title}
          onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>
      <div>
        <label className="block font-semibold mb-1.5">Content</label>
        <textarea
          required
          rows={4}
          value={form.content}
          onChange={e => setForm(prev => ({ ...prev, content: e.target.value }))}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>
      <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer"><input type="checkbox" checked={form.isPinned} onChange={e=>setForm(prev=>({...prev,isPinned:e.target.checked}))} className="rounded"/> 📌 Pin this announcement</label>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block font-semibold mb-1.5">Schedule Publish (optional)</label><input type="datetime-local" value={form.publishAt||''} onChange={e=>setForm(prev=>({...prev,publishAt:e.target.value}))} className="w-full px-3 py-2 rounded-lg border border-slate-300"/><p className="text-[11px] text-slate-400 mt-0.5">Leave blank to publish immediately</p></div>
        <div><label className="block font-semibold mb-1.5">Expires At (optional)</label><input type="datetime-local" value={form.expiresAt||''} onChange={e=>setForm(prev=>({...prev,expiresAt:e.target.value}))} className="w-full px-3 py-2 rounded-lg border border-slate-300"/><p className="text-[11px] text-slate-400 mt-0.5">Auto-hides after this date</p></div>
      </div>
      <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg">{editItem?'Update Announcement':'Publish Bulletin'}</button>
    </form>
  );

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200">
        <div><span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-violet-700 bg-violet-50 border border-violet-200 px-2.5 py-0.5 rounded-md mb-2"><Megaphone className="w-3.5 h-3.5"/> Bulletins</span><h1 className="text-2xl font-bold text-slate-900 tracking-tight">Announcements</h1><p className="text-sm text-slate-500 mt-1">Institution-wide, department, course, and class-specific bulletins.</p></div>
        {hasPermission('announcements:manage')&&<button type="button" onClick={()=>{setForm(emptyForm);setCreateOpen(true);}} className="self-start inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"><Plus className="w-4 h-4"/> Publish</button>}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[{label:'Total',v:counts.all,cl:'bg-slate-50 border-slate-200 text-slate-700'},{label:'Urgent',v:counts.urgent,cl:'bg-rose-50 border-rose-200 text-rose-700'},{label:'Important',v:counts.important,cl:'bg-amber-50 border-amber-200 text-amber-700'},{label:'Pinned',v:counts.pinned,cl:'bg-blue-50 border-blue-200 text-blue-700'}].map(k=>(
          <div key={k.label} className={`p-4 rounded-xl border ${k.cl}`}><p className="text-2xl font-bold">{k.v}</p><p className="text-xs font-medium mt-0.5 text-slate-600">{k.label}</p></div>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={()=>setFilter('all')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${filter==='all'?'bg-blue-600 text-white border-blue-600':'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>All ({counts.all})</button>
          <button type="button" onClick={()=>setFilter('urgent')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${filter==='urgent'?'bg-blue-600 text-white border-blue-600':'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>Urgent ({counts.urgent})</button>
          <button type="button" onClick={()=>setFilter('important')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${filter==='important'?'bg-blue-600 text-white border-blue-600':'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>Important ({counts.important})</button>
          <button type="button" onClick={()=>setFilter('pinned')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${filter==='pinned'?'bg-blue-600 text-white border-blue-600':'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>Pinned ({counts.pinned})</button>
        </div>
        <div className="relative ml-auto w-full sm:w-56"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"/></div>
      </div>
      {isLoading?<LoadingState/>:filtered.length===0?(<div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center"><Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-3"/><p className="text-sm font-semibold text-slate-500">No announcements found.</p></div>):(
        <div className="space-y-3">{filtered.map(a=>{
          const ps=priorityStyle[a.priority]||priorityStyle.normal;
          const canEdit=hasPermission('announcements:manage')&&(a.authorId===user?.id||user?.roles?.includes('super_admin')||user?.roles?.includes('academic_admin'));
          return (
            <div key={a.id} className={`rounded-xl border p-5 shadow-sm hover:shadow transition-shadow ${ps.card}`}>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${ps.badge}`}><span className={`w-1.5 h-1.5 rounded-full ${ps.dot}`}/>{a.priority?.charAt(0).toUpperCase()+a.priority?.slice(1)}</span>
                  <StatusBadge status={a.scope}/>
                  {a.isPinned&&<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">📌 Pinned</span>}
                  {a.publishAt&&new Date(a.publishAt)>new Date()&&<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700 border border-violet-200">🕐 Scheduled {new Date(a.publishAt).toLocaleDateString()}</span>}
                  {a.expiresAt&&<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">⏳ Expires {new Date(a.expiresAt).toLocaleDateString()}</span>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-slate-400">{a.author?.firstName} {a.author?.lastName} · {new Date(a.createdAt).toLocaleDateString()}</span>
                  {canEdit&&<><button type="button" onClick={()=>openEdit(a)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Pencil className="w-3.5 h-3.5"/></button><button type="button" onClick={()=>setDelItem(a)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"><Trash2 className="w-3.5 h-3.5"/></button></>}
                </div>
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">{a.title}</h3>
              <p className="text-xs text-slate-700 leading-relaxed">{a.content}</p>
            </div>
          );
        })}</div>
      )}
      <ModalDialog isOpen={createOpen} onClose={()=>setCreateOpen(false)} title="Publish Announcement">{announcementFormContent}</ModalDialog>
      <ModalDialog isOpen={Boolean(editItem)} onClose={()=>setEditItem(null)} title="Edit Announcement">{announcementFormContent}</ModalDialog>
      <div className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 ${delItem?'':'hidden'}`}>
        <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-sm p-6">
          <h2 className="text-base font-bold text-slate-900 mb-2">Delete Announcement</h2>
          <p className="text-xs text-slate-600 mb-5">Delete "{delItem?.title}"? This cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={()=>setDelItem(null)} className="px-4 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 hover:bg-slate-50">Cancel</button>
            <button type="button" onClick={handleDelete} className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white">Delete</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SharedDiscussionsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  /* ── state ─────────────────────────────────────────────────────────────── */
  const [classFilter, setClassFilter]   = useState('');   // class section filter
  const [filter, setFilter]             = useState('all');
  const [search, setSearch]             = useState('');
  const [newOpen, setNewOpen]           = useState(false);
  const [threadForm, setThreadForm]     = useState({ classId: '', title: '', body: '', category: 'laboratory_help' });
  const [replyText, setReplyText]       = useState({});
  const [expanded, setExpanded]         = useState({});

  // Moderation state — one modal for all actions
  const [modThread, setModThread]         = useState(null);   // thread being acted on
  const [modAction, setModAction]         = useState(null);   // 'resolve'|'escalate'|'clear_escalate'|'delete'
  const [modNote, setModNote]             = useState('');
  const [modError, setModError]           = useState('');
  const [modSaving, setModSaving]         = useState(false);

  // History panel
  const [historyThread, setHistoryThread] = useState(null);  // thread whose history is showing

  const isTA        = user?.primaryRole === 'teaching_assistant';
  const isStaff     = ['instructor', 'teaching_assistant', 'academic_admin', 'super_admin'].includes(user?.primaryRole);
  const isInstructor = ['instructor', 'academic_admin', 'super_admin'].includes(user?.primaryRole);

  /* ── data ───────────────────────────────────────────────────────────────── */
  const { data: clsData } = useQuery({
    queryKey: ['classes', 'ta'],
    queryFn: lmsApi.listClasses,
    staleTime: 30_000,
  });
  const allClasses = clsData?.data?.classes || [];

  // Build discussion query params: TAs pass classId when a filter is set
  const discussionParams = classFilter ? { classId: classFilter } : {};
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['discussions', classFilter],
    queryFn: () => lmsApi.listDiscussions(discussionParams),
    staleTime: 20_000,
  });

  // Moderation history query — fetches when a thread history panel is opened
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['discussion-moderation-history', historyThread?.id],
    queryFn: () => lmsApi.getDiscussionModerationHistory(historyThread.id),
    enabled: Boolean(historyThread?.id),
    staleTime: 10_000,
  });
  const moderationHistory = historyData?.data?.history || [];

  /* ── derived ────────────────────────────────────────────────────────────── */
  const all = data?.data?.threads || [];
  const counts = {
    all:       all.length,
    open:      all.filter((t) => !t.isResolved).length,
    resolved:  all.filter((t) => t.isResolved).length,
    escalated: all.filter((t) => t.isEscalated).length,
  };
  const filtered = all.filter((t) => {
    const mf = filter === 'all'      ? true
             : filter === 'open'     ? !t.isResolved
             : filter === 'resolved' ? t.isResolved
             : filter === 'escalated'? t.isEscalated
             : true;
    const ms = !search || `${t.title} ${t.body}`.toLowerCase().includes(search.toLowerCase());
    return mf && ms;
  });

  /* ── helpers ────────────────────────────────────────────────────────────── */
  const relTime = (d) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const openMod = (thread, action) => {
    setModThread(thread);
    setModAction(action);
    setModNote(action === 'escalate' ? (thread.escalationNote || '') : '');
    setModError('');
  };

  const closeMod = () => {
    setModThread(null);
    setModAction(null);
    setModNote('');
    setModError('');
    setModSaving(false);
  };

  /* ── handlers ───────────────────────────────────────────────────────────── */
  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await lmsApi.createDiscussion({ ...threadForm, classId: Number(threadForm.classId) });
      addToast('Discussion posted.');
      setNewOpen(false);
      setThreadForm({ classId: '', title: '', body: '', category: 'laboratory_help' });
      queryClient.invalidateQueries({ queryKey: ['discussions'] });
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  const handleReply = async (threadId) => {
    const body = replyText[threadId];
    if (!body?.trim()) return;
    try {
      await lmsApi.replyDiscussion(threadId, { body });
      setReplyText((p) => ({ ...p, [threadId]: '' }));
      addToast('Reply posted.');
      queryClient.invalidateQueries({ queryKey: ['discussions'] });
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  const handleModAction = async () => {
    if (!modThread || !modAction) return;
    setModSaving(true);
    setModError('');
    try {
      if (modAction === 'delete') {
        await lmsApi.deleteDiscussion(modThread.id);
        addToast('Thread deleted.');
        closeMod();
        queryClient.invalidateQueries({ queryKey: ['discussions'] });
        return;
      }
      // resolve / escalate / clear_escalate
      const payload = {};
      if (modAction === 'resolve') {
        payload.isResolved = true;
        if (modNote.trim()) payload.moderationNote = modNote.trim();
      } else if (modAction === 'unresolve') {
        payload.isResolved = false;
        if (modNote.trim()) payload.moderationNote = modNote.trim();
      } else if (modAction === 'escalate') {
        payload.isEscalated = true;
        payload.moderationNote = modNote.trim();
      } else if (modAction === 'clear_escalate') {
        payload.isEscalated = false;
        if (modNote.trim()) payload.moderationNote = modNote.trim();
      }
      await lmsApi.updateDiscussionStatus(modThread.id, payload);
      addToast('Discussion status updated.');
      closeMod();
      queryClient.invalidateQueries({ queryKey: ['discussions'] });
      queryClient.invalidateQueries({ queryKey: ['discussion-moderation-history'] });
    } catch (err) {
      setModError(extractErrorMessage(err));
      setModSaving(false);
    }
  };

  const handleEndorse = async (post) => {
    try {
      await lmsApi.endorseDiscussionPost(post.id);
      addToast(post.isInstructorEndorsed ? 'Endorsement removed.' : 'Reply endorsed as official answer.');
      queryClient.invalidateQueries({ queryKey: ['discussions'] });
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  /* ── modal metadata ─────────────────────────────────────────────────────── */
  const modMeta = {
    resolve:        { title: 'Mark Thread Resolved',         color: 'emerald', cta: 'Mark Resolved',       requireNote: false, noteLabel: 'Moderation note (optional)', notePlaceholder: 'Briefly describe the resolution…' },
    unresolve:      { title: 'Reopen Thread',                 color: 'amber',   cta: 'Reopen Thread',        requireNote: false, noteLabel: 'Reason for reopening (optional)', notePlaceholder: 'Why is this thread being reopened?' },
    escalate:       { title: 'Escalate to Instructor',        color: 'amber',   cta: 'Escalate',             requireNote: true,  noteLabel: 'Moderation note (required)',  notePlaceholder: 'Describe the concern to the instructor…' },
    clear_escalate: { title: 'Clear Escalation',              color: 'slate',   cta: 'Clear Escalation',     requireNote: false, noteLabel: 'Reason for clearing (optional)', notePlaceholder: '' },
    delete:         { title: 'Delete Thread',                 color: 'rose',    cta: 'Delete Thread',        requireNote: false, noteLabel: '', notePlaceholder: '' },
  };

  const meta = modAction ? modMeta[modAction] : null;

  /* ── render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 pb-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md mb-2">
            <MessageSquare className="w-3.5 h-3.5" />
            {isTA ? 'Discussion Moderation' : 'Collaborative Q&A'}
          </span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Discussions & Support</h1>
          <p className="text-sm text-slate-500 mt-1">
            {isTA ? 'Moderate discussions in your assigned sections.' : 'Class questions, troubleshooting, and endorsed answers.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setNewOpen(true)}
            className="self-start inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"
          >
            <Plus className="w-4 h-4" /> Ask a Question
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',      v: counts.all,       cl: 'bg-slate-50 border-slate-200 text-slate-700'   },
          { label: 'Open',       v: counts.open,      cl: 'bg-amber-50 border-amber-200 text-amber-700'   },
          { label: 'Resolved',   v: counts.resolved,  cl: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
          { label: 'Escalated',  v: counts.escalated, cl: 'bg-rose-50 border-rose-200 text-rose-700'      },
          { label: 'Unanswered', v: all.filter((t) => !t.isResolved && (t.posts || []).length === 0).length, cl: 'bg-violet-50 border-violet-200 text-violet-700' },
        ].map((k) => (
          <div key={k.label} className={`p-4 rounded-xl border ${k.cl}`}>
            <p className="text-2xl font-bold">{k.v}</p>
            <p className="text-xs font-medium mt-0.5 text-slate-600">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Most active threads (staff only) */}
      {isStaff && all.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs font-bold text-slate-700 mb-3">Most Active Threads</p>
          <div className="space-y-2">
            {[...all].sort((a, b) => (b.posts?.length || 0) - (a.posts?.length || 0)).slice(0, 3).map((t) => (
              <div key={t.id} className="flex items-center justify-between text-xs">
                <span className="truncate text-slate-700 flex-1 mr-3">{t.title}</span>
                <span className="shrink-0 font-bold text-blue-700">{t.posts?.length || 0} replies</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-col gap-3">
        {/* Section picker (for TA and other staff) */}
        {isStaff && allClasses.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Section:</span>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium bg-white min-w-[180px]"
              aria-label="Filter by class section"
            >
              <option value="">All Sections</option>
              {allClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.sectionCode} — {c.courseOffering?.course?.code || c.name}
                </option>
              ))}
            </select>
            {classFilter && (
              <button
                type="button"
                onClick={() => setClassFilter('')}
                className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        )}

        {/* Status tabs + search */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex flex-wrap gap-2">
            {[['all', 'All', counts.all], ['open', 'Open', counts.open], ['resolved', 'Resolved', counts.resolved], ['escalated', 'Escalated', counts.escalated]].map(([v, l, c]) => (
              <button
                key={v}
                type="button"
                onClick={() => setFilter(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${filter === v ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              >
                {l} ({c})
              </button>
            ))}
          </div>
          <div className="relative ml-auto w-full sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Thread list */}
      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={extractErrorMessage(error)} onRetry={refetch} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No discussions found"
          description={search ? `No threads match "${search}".` : 'No discussions in this section yet.'}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => {
            const isExpanded = expanded[t.id] !== false;
            const canDelete  = isInstructor || t.authorId === user?.id;
            const showHistory = historyThread?.id === t.id;

            return (
              <div
                key={t.id}
                className={`bg-white rounded-xl border shadow-sm hover:shadow transition-shadow ${
                  t.isEscalated ? 'border-amber-300' : t.isResolved ? 'border-emerald-200' : 'border-slate-200'
                }`}
              >
                {/* Thread header */}
                <button
                  type="button"
                  onClick={() => setExpanded((p) => ({ ...p, [t.id]: p[t.id] === false }))}
                  className="w-full p-5 text-left hover:bg-slate-50 transition-colors rounded-t-xl"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={t.category} />
                      {t.isResolved && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Resolved
                        </span>
                      )}
                      {t.isEscalated && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
                          <Flag className="w-3 h-3" /> Escalated to Instructor
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{(t.posts || []).length} replies</span>
                      <span>{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{t.title}</h3>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">{t.body}</p>
                  <p className="text-[11px] text-slate-400 mt-2">
                    {t.author?.firstName} {t.author?.lastName} · {t.classSection?.sectionCode} · {relTime(t.createdAt)}
                  </p>
                  {/* Escalation note badge */}
                  {t.isEscalated && t.escalationNote && (
                    <p className="text-[11px] text-amber-700 mt-1.5 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg line-clamp-1">
                      Note: {t.escalationNote}
                    </p>
                  )}
                </button>

                {/* Expanded body */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-slate-100 space-y-4 pt-4">
                    {/* Moderation action bar (staff only) */}
                    {isStaff && (
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Resolve / Unresolve */}
                        <button
                          type="button"
                          onClick={() => openMod(t, t.isResolved ? 'unresolve' : 'resolve')}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                            t.isResolved
                              ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          }`}
                        >
                          {t.isResolved ? 'Reopen Thread' : '✓ Mark Resolved'}
                        </button>

                        {/* Escalate / Clear — TA and instructor */}
                        <button
                          type="button"
                          onClick={() => openMod(t, t.isEscalated ? 'clear_escalate' : 'escalate')}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                            t.isEscalated
                              ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {t.isEscalated ? 'Clear Escalation' : '⚑ Escalate to Instructor'}
                        </button>

                        {/* Moderation history */}
                        <button
                          type="button"
                          onClick={() => setHistoryThread(showHistory ? null : t)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 ${
                            showHistory
                              ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <ClipboardCheck className="w-3 h-3" />
                          History
                        </button>

                        {/* Delete — author or instructor/admin only */}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => openMod(t, 'delete')}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        )}
                      </div>
                    )}

                    {/* Moderation history panel */}
                    {showHistory && (
                      <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-2">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Moderation History</p>
                        {historyLoading ? (
                          <LoadingState label="Loading history…" />
                        ) : moderationHistory.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">No moderation actions recorded yet.</p>
                        ) : (
                          <div className="space-y-1.5 max-h-40 overflow-y-auto">
                            {moderationHistory.map((h, idx) => (
                              <div
                                key={h.id || idx}
                                className={`flex items-start gap-2 p-2 rounded-lg border text-[11px] ${
                                  h.action === 'DISCUSSION_ESCALATED_BY_TA'    ? 'bg-amber-50 border-amber-200' :
                                  h.action === 'DISCUSSION_RESOLVED'           ? 'bg-emerald-50 border-emerald-200' :
                                  h.action === 'DISCUSSION_THREAD_DELETED'     ? 'bg-rose-50 border-rose-200' :
                                  'bg-white border-slate-200'
                                }`}
                              >
                                <div className="flex-1 min-w-0">
                                  <span className="font-semibold text-slate-800">{h.actionLabel}</span>
                                  <span className="text-slate-400 ml-1">· {h.actorName}</span>
                                  <span className="text-slate-400 ml-1">· {relTime(h.timestamp)}</span>
                                  {h.moderationNote && (
                                    <p className="text-slate-600 mt-0.5 line-clamp-2">{h.moderationNote}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Replies */}
                    {(t.posts || []).length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No replies yet.</p>
                    ) : (
                      <div className="space-y-2 pl-4 border-l-2 border-slate-200">
                        {(t.posts || []).map((post) => (
                          <div key={post.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-slate-900">{post.author?.firstName} {post.author?.lastName}</span>
                              <div className="flex items-center gap-2">
                                {post.isInstructorEndorsed && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3" /> Endorsed
                                  </span>
                                )}
                                {isStaff && (
                                  <button
                                    type="button"
                                    onClick={() => handleEndorse(post)}
                                    className={`p-1 rounded transition-colors ${post.isInstructorEndorsed ? 'text-emerald-600 hover:text-slate-400' : 'text-slate-400 hover:text-emerald-600'}`}
                                    title={post.isInstructorEndorsed ? 'Remove endorsement' : 'Endorse as official answer'}
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="text-slate-700 leading-relaxed">{post.body}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply input */}
                    <div className="flex gap-2 mt-2">
                      <input
                        type="text"
                        value={replyText[t.id] || ''}
                        onChange={(e) => setReplyText((p) => ({ ...p, [t.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && handleReply(t.id)}
                        placeholder="Write a reply… (Enter to send)"
                        className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleReply(t.id)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shrink-0"
                      >
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

      {/* New thread modal */}
      <ModalDialog isOpen={newOpen} onClose={() => setNewOpen(false)} title="Start Discussion Thread">
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold mb-1.5">Class Section</label>
            <select
              required
              value={threadForm.classId}
              onChange={(e) => setThreadForm({ ...threadForm, classId: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
            >
              <option value="">— Select class —</option>
              {allClasses.map((c) => <option key={c.id} value={c.id}>{c.sectionCode}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1.5">Category</label>
            <select
              value={threadForm.category}
              onChange={(e) => setThreadForm({ ...threadForm, category: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
            >
              <option value="laboratory_help">🔬 Laboratory Help</option>
              <option value="lecture_question">💡 Lecture Question</option>
              <option value="troubleshooting">💻 Troubleshooting</option>
              <option value="project">📋 Project</option>
              <option value="general">💬 General</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1.5">Title</label>
            <input
              required
              value={threadForm.title}
              onChange={(e) => setThreadForm({ ...threadForm, title: e.target.value })}
              placeholder="e.g., OSPF neighbor not forming"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1.5">Details</label>
            <textarea
              required
              rows={4}
              value={threadForm.body}
              onChange={(e) => setThreadForm({ ...threadForm, body: e.target.value })}
              placeholder="Describe the issue in detail…"
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg">
            Post Thread
          </button>
        </form>
      </ModalDialog>

      {/* Unified moderation confirmation modal */}
      <ModalDialog
        isOpen={Boolean(modThread && modAction)}
        onClose={closeMod}
        title={meta?.title || 'Confirm Action'}
        maxWidth="max-w-md"
      >
        {modThread && meta && (
          <div className="space-y-4 text-xs">
            {/* Thread summary */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <p className="font-bold text-slate-900">{modThread.title}</p>
              <p className="text-slate-500 mt-0.5">
                {modThread.classSection?.sectionCode} · {modThread.author?.firstName} {modThread.author?.lastName}
              </p>
            </div>

            {/* Action-specific message */}
            {modAction === 'delete' && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <p>Deleting this thread will also remove all replies. This cannot be undone.</p>
              </div>
            )}
            {modAction === 'escalate' && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <p>The assigned instructor will be notified. This does not constitute a disciplinary action.</p>
              </div>
            )}

            {/* Moderation note input */}
            {modAction !== 'delete' && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5" htmlFor="mod-note">
                  {meta.noteLabel}
                  {meta.requireNote && <span className="text-rose-500 ml-1">*</span>}
                </label>
                <textarea
                  id="mod-note"
                  rows={3}
                  value={modNote}
                  onChange={(e) => setModNote(e.target.value)}
                  placeholder={meta.notePlaceholder}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none resize-none text-xs"
                />
              </div>
            )}

            {/* Error */}
            {modError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{modError}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={closeMod}
                className="flex-1 py-2.5 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleModAction}
                disabled={modSaving || (meta.requireNote && modNote.trim().length < 5)}
                className={`flex-1 py-2.5 text-white font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                  modAction === 'delete'    ? 'bg-rose-600 hover:bg-rose-700' :
                  modAction === 'escalate'  ? 'bg-amber-600 hover:bg-amber-700' :
                  modAction === 'resolve'   ? 'bg-emerald-600 hover:bg-emerald-700' :
                  'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {modSaving ? (
                  <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                ) : (
                  meta.cta
                )}
              </button>
            </div>

            {/* TA-specific disclaimer */}
            {isTA && modAction !== 'delete' && (
              <p className="text-[10px] text-slate-400 text-center italic">
                Moderation actions are recorded and visible to the assigned instructor.
              </p>
            )}
          </div>
        )}
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
              <option value={5}>Arra Siena (Teaching Assistant)</option>
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



/* ═══════════════════════════════════════════════════════════════════════════
   TaClassRosterPage — /ta/classes
   Displays the TA's assigned class sections with full enrolled-student rosters.
   Data source: GET /classes  (backend auto-scopes to TA's assigned classIds)
═══════════════════════════════════════════════════════════════════════════ */
export function TaClassRosterPage() {
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState('enrolled'); // 'all' | 'enrolled' | 'pending' | 'dropped'
  const [sortField, setSortField]   = useState('name');          // 'name' | 'studentNumber' | 'status' | 'enrolledAt'
  const [sortDir, setSortDir]       = useState('asc');           // 'asc' | 'desc'
  const [detailStudent, setDetailStudent] = useState(null);      // membership object for the detail panel

  /* ── data ──────────────────────────────────────────────────────────────── */
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['classes', 'ta'],
    queryFn: lmsApi.listClasses,
    staleTime: 30_000,
  });
  const classes = data?.data?.classes || [];

  // Auto-select first class on load
  React.useEffect(() => {
    if (classes.length > 0 && !selectedClassId) setSelectedClassId(classes[0].id);
  }, [classes, selectedClassId]);

  const selectedClass = classes.find((c) => c.id === selectedClassId) || null;
  const taAssignment  = selectedClass?.taAssignments?.find((a) => true); // first TA entry (already scoped by backend)

  // Fetch per-student progress for the selected class (used in detail panel)
  const { data: progressData } = useQuery({
    queryKey: ['progress', 'ta', selectedClassId],
    queryFn: () => lmsApi.getProgressAnalytics({ classId: selectedClassId }),
    enabled: Boolean(selectedClassId),
    staleTime: 30_000,
  });
  const progressByStudent = React.useMemo(() => {
    const map = {};
    for (const cp of progressData?.data?.courseProgress || []) {
      map[cp.studentId] = cp;
    }
    return map;
  }, [progressData]);

  /* ── derived roster ─────────────────────────────────────────────────────── */
  const allMembers = selectedClass?.memberships || [];
  const counts = {
    all:      allMembers.length,
    enrolled: allMembers.filter((m) => m.status === 'enrolled').length,
    pending:  allMembers.filter((m) => m.status === 'pending').length,
    dropped:  allMembers.filter((m) => m.status === 'dropped').length,
  };

  const statusFiltered = statusFilter === 'all'
    ? allMembers
    : allMembers.filter((m) => m.status === statusFilter);

  const searched = search.trim()
    ? statusFiltered.filter((m) => {
        const t = search.toLowerCase();
        return (
          `${m.student?.firstName ?? ''} ${m.student?.lastName ?? ''}`.toLowerCase().includes(t) ||
          (m.student?.studentNumber ?? '').toLowerCase().includes(t) ||
          (m.student?.email ?? '').toLowerCase().includes(t)
        );
      })
    : statusFiltered;

  const sorted = React.useMemo(() => {
    const arr = [...searched];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      if (sortField === 'name') {
        const la = `${a.student?.lastName ?? ''} ${a.student?.firstName ?? ''}`.toLowerCase();
        const lb = `${b.student?.lastName ?? ''} ${b.student?.firstName ?? ''}`.toLowerCase();
        return la < lb ? -dir : la > lb ? dir : 0;
      }
      if (sortField === 'studentNumber') {
        const na = a.student?.studentNumber ?? '';
        const nb = b.student?.studentNumber ?? '';
        return na < nb ? -dir : na > nb ? dir : 0;
      }
      if (sortField === 'status') {
        return a.status < b.status ? -dir : a.status > b.status ? dir : 0;
      }
      if (sortField === 'enrolledAt') {
        return (new Date(a.enrolledAt) - new Date(b.enrolledAt)) * dir;
      }
      return 0;
    });
    return arr;
  }, [searched, sortField, sortDir]);

  /* ── helpers ────────────────────────────────────────────────────────────── */
  const toggleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-blue-600" />
      : <ChevronDown className="w-3 h-3 text-blue-600" />;
  };

  const initials = (m) =>
    `${m.student?.firstName?.[0] ?? '?'}${m.student?.lastName?.[0] ?? ''}`;

  /* ── early states ───────────────────────────────────────────────────────── */
  if (isLoading) return <LoadingState label="Loading assigned sections…" />;
  if (error)     return <ErrorState message={extractErrorMessage(error)} onRetry={refetch} />;

  /* ── render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 pb-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md mb-2">
            <Users className="w-3.5 h-3.5" aria-hidden="true" />
            Assigned Sections
          </span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Class Roster</h1>
          <p className="text-sm text-slate-500 mt-1">
            Browse your assigned sections and view enrolled student information.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="self-start sm:self-auto flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          aria-label="Refresh sections"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          Refresh
        </button>
      </div>

      {classes.length === 0 ? (
        <EmptyState
          title="No sections assigned"
          description="You have not been assigned to any class sections yet. Contact your instructor or academic admin."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* ── Section picker (left column on lg) ──────────────────────── */}
          <div className="lg:col-span-1 space-y-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">
              Sections ({classes.length})
            </p>
            {classes.map((cls) => {
              const isActive  = cls.id === selectedClassId;
              const enrolled  = (cls.memberships || []).filter((m) => m.status === 'enrolled').length;
              const pending   = (cls.memberships || []).filter((m) => m.status === 'pending').length;
              const course    = cls.courseOffering?.course;
              const semester  = cls.courseOffering?.semester;
              const fillPct   = cls.capacity > 0 ? Math.round((enrolled / cls.capacity) * 100) : 0;
              return (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => {
                    setSelectedClassId(cls.id);
                    setSearch('');
                    setStatusFilter('enrolled');
                    setDetailStudent(null);
                  }}
                  aria-pressed={isActive}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    isActive
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="font-mono text-[12px] font-bold text-blue-700 leading-none">
                      {cls.sectionCode}
                    </span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
                      isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {enrolled} enrolled
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-900 truncate leading-snug">
                    {course?.title || cls.name}
                  </p>
                  <p className="text-[11px] font-mono text-slate-400 mt-0.5 truncate">
                    {course?.code ?? '—'} · {semester?.name ?? '—'}
                  </p>
                  {/* Enrollment fill bar */}
                  {cls.capacity > 0 && (
                    <div className="mt-2.5 space-y-0.5">
                      <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden">
                        <div
                          className={`h-1 rounded-full ${fillPct >= 90 ? 'bg-amber-400' : 'bg-blue-400'}`}
                          style={{ width: `${fillPct}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400">{enrolled}/{cls.capacity} capacity</p>
                    </div>
                  )}
                  {pending > 0 && (
                    <p className="text-[10px] text-amber-600 font-semibold mt-1">
                      {pending} pending approval
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Main panel (right columns on lg) ────────────────────────── */}
          <div className="lg:col-span-3 space-y-4">
            {!selectedClass ? (
              <EmptyState title="Select a section" description="Choose a class section on the left to view its roster." />
            ) : (
              <>
                {/* Section info bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Section',   value: selectedClass.sectionCode },
                    { label: 'Course',    value: selectedClass.courseOffering?.course?.code ?? '—' },
                    { label: 'Semester',  value: selectedClass.courseOffering?.semester?.name ?? '—' },
                    { label: 'Schedule',  value: selectedClass.schedule ?? '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm text-xs">
                      <p className="text-slate-400 mb-0.5">{label}</p>
                      <p className="font-semibold text-slate-900 truncate" title={value}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* canViewRoster warning */}
                {taAssignment && !taAssignment.canViewRoster && (
                  <div className="flex items-start gap-3 p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" aria-hidden="true" />
                    <p>Your TA assignment does not include <strong>View Roster</strong> permission for this section. Contact your instructor.</p>
                  </div>
                )}

                {/* Status filter tabs + search */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter roster by status">
                    {[
                      { key: 'enrolled', label: 'Enrolled',  count: counts.enrolled  },
                      { key: 'pending',  label: 'Pending',   count: counts.pending   },
                      { key: 'dropped',  label: 'Dropped',   count: counts.dropped   },
                      { key: 'all',      label: 'All',       count: counts.all       },
                    ].map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        role="tab"
                        aria-selected={statusFilter === t.key}
                        onClick={() => { setStatusFilter(t.key); setDetailStudent(null); }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                          statusFilter === t.key
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {t.label}
                        <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                          statusFilter === t.key ? 'bg-blue-500' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {t.count}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="relative sm:ml-auto w-full sm:w-60">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setDetailStudent(null); }}
                      placeholder="Name, student no., or email…"
                      className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                      aria-label="Search students"
                    />
                  </div>
                </div>

                {/* Roster table */}
                {sorted.length === 0 ? (
                  <EmptyState
                    title="No students found"
                    description={
                      search.trim()
                        ? `No students match "${search}".`
                        : `No ${statusFilter === 'all' ? '' : statusFilter + ' '}students in this section.`
                    }
                  />
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    {/* Desktop table */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider select-none">
                          <tr>
                            <th className="px-4 py-3 w-10 font-semibold">#</th>
                            <th className="px-4 py-3 font-semibold">
                              <button
                                type="button"
                                onClick={() => toggleSort('name')}
                                className="inline-flex items-center gap-1 hover:text-blue-700"
                              >
                                Student <SortIcon field="name" />
                              </button>
                            </th>
                            <th className="px-4 py-3 font-semibold">
                              <button
                                type="button"
                                onClick={() => toggleSort('studentNumber')}
                                className="inline-flex items-center gap-1 hover:text-blue-700"
                              >
                                Student No. <SortIcon field="studentNumber" />
                              </button>
                            </th>
                            <th className="px-4 py-3 font-semibold">Email</th>
                            <th className="px-4 py-3 font-semibold">
                              <button
                                type="button"
                                onClick={() => toggleSort('status')}
                                className="inline-flex items-center gap-1 hover:text-blue-700"
                              >
                                Status <SortIcon field="status" />
                              </button>
                            </th>
                            <th className="px-4 py-3 font-semibold">
                              <button
                                type="button"
                                onClick={() => toggleSort('enrolledAt')}
                                className="inline-flex items-center gap-1 hover:text-blue-700"
                              >
                                Enrolled <SortIcon field="enrolledAt" />
                              </button>
                            </th>
                            <th className="px-4 py-3 font-semibold">Progress</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {sorted.map((m, idx) => {
                            const cp  = progressByStudent[m.studentId] || progressByStudent[m.student?.id];
                            const pct = cp ? Math.min(100, Number(cp.progressPercentage || 0)) : null;
                            const isSelected = detailStudent?.id === m.id;
                            return (
                              <tr
                                key={m.id}
                                className={`transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-blue-50'
                                    : 'hover:bg-slate-50'
                                }`}
                                onClick={() => setDetailStudent(isSelected ? null : m)}
                                aria-selected={isSelected}
                              >
                                <td className="px-4 py-3 text-slate-400 font-mono">{idx + 1}</td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2.5">
                                    <div
                                      className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[11px] shrink-0 select-none"
                                      aria-hidden="true"
                                    >
                                      {initials(m)}
                                    </div>
                                    <p className="font-semibold text-slate-900">
                                      {m.student?.firstName} {m.student?.lastName}
                                    </p>
                                  </div>
                                </td>
                                <td className="px-4 py-3 font-mono text-slate-600">
                                  {m.student?.studentNumber || '—'}
                                </td>
                                <td className="px-4 py-3 text-slate-500 max-w-[160px] truncate">
                                  {m.student?.email || '—'}
                                </td>
                                <td className="px-4 py-3">
                                  <StatusBadge status={m.status} />
                                </td>
                                <td className="px-4 py-3 text-slate-500">
                                  {m.enrolledAt
                                    ? new Date(m.enrolledAt).toLocaleDateString()
                                    : '—'}
                                </td>
                                <td className="px-4 py-3 min-w-[120px]">
                                  {pct !== null ? (
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                        <div
                                          className={`h-1.5 rounded-full ${
                                            pct >= 100 ? 'bg-emerald-500' : pct < 50 ? 'bg-rose-400' : 'bg-blue-500'
                                          }`}
                                          style={{ width: `${pct}%` }}
                                        />
                                      </div>
                                      <span className="font-mono text-[11px] text-slate-600 w-8 shrink-0 text-right">
                                        {pct}%
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-300 text-[11px]">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="sm:hidden divide-y divide-slate-100">
                      {sorted.map((m) => {
                        const cp  = progressByStudent[m.studentId] || progressByStudent[m.student?.id];
                        const pct = cp ? Math.min(100, Number(cp.progressPercentage || 0)) : null;
                        return (
                          <div
                            key={m.id}
                            className="p-4 space-y-2 cursor-pointer hover:bg-slate-50 active:bg-slate-100 transition-colors"
                            onClick={() => setDetailStudent(detailStudent?.id === m.id ? null : m)}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0 select-none">
                                  {initials(m)}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">
                                    {m.student?.firstName} {m.student?.lastName}
                                  </p>
                                  <p className="text-[11px] text-slate-400 font-mono">
                                    {m.student?.studentNumber || m.student?.email || '—'}
                                  </p>
                                </div>
                              </div>
                              <StatusBadge status={m.status} />
                            </div>
                            {pct !== null && (
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className={`h-1.5 rounded-full ${
                                      pct >= 100 ? 'bg-emerald-500' : pct < 50 ? 'bg-rose-400' : 'bg-blue-500'
                                    }`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-[11px] font-mono text-slate-500">{pct}%</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-400 flex items-center justify-between">
                      <span>
                        {sorted.length} of {statusFiltered.length} student{statusFiltered.length !== 1 ? 's' : ''}
                        {search.trim() ? ` matching "${search}"` : ''}
                      </span>
                      {detailStudent && (
                        <span className="text-blue-600 font-semibold">
                          Click a row again to collapse the detail panel
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Student detail panel ─────────────────────────────── */}
                {detailStudent && (() => {
                  const m   = detailStudent;
                  const cp  = progressByStudent[m.studentId] || progressByStudent[m.student?.id];
                  const pct = cp ? Math.min(100, Number(cp.progressPercentage || 0)) : null;
                  const isRisk = pct !== null && pct < 50;
                  const isDone = pct !== null && pct >= 100;

                  return (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      {/* Panel header */}
                      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm select-none">
                            {initials(m)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">
                              {m.student?.firstName} {m.student?.lastName}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {m.student?.email} · {m.student?.studentNumber || 'No student no.'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDetailStudent(null)}
                          aria-label="Close detail panel"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Panel body */}
                      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                        {/* Enrollment info */}
                        <div className="space-y-3">
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                            Enrollment
                          </p>
                          <dl className="space-y-2">
                            {[
                              { label: 'Status',      value: <StatusBadge status={m.status} /> },
                              { label: 'Enrolled',    value: m.enrolledAt ? new Date(m.enrolledAt).toLocaleDateString() : '—' },
                              { label: 'Final Grade', value: m.finalLetterGrade
                                  ? `${m.finalLetterGrade} (${m.finalNumericGrade ?? '—'})`
                                  : '—' },
                              { label: 'Remarks',     value: m.remarks || '—' },
                            ].map(({ label, value }) => (
                              <div key={label} className="flex items-baseline justify-between gap-4">
                                <dt className="text-slate-400 shrink-0">{label}</dt>
                                <dd className="text-slate-800 font-medium text-right">{value}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>

                        {/* Progress info */}
                        <div className="space-y-3">
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                            Course Progress
                          </p>
                          {cp ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                  <div
                                    className={`h-2.5 rounded-full ${isDone ? 'bg-emerald-500' : isRisk ? 'bg-rose-400' : 'bg-blue-500'}`}
                                    style={{ width: `${pct}%` }}
                                    role="progressbar"
                                    aria-valuenow={pct}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                  />
                                </div>
                                <span className={`font-mono font-bold text-sm w-10 text-right shrink-0 ${
                                  isDone ? 'text-emerald-600' : isRisk ? 'text-rose-600' : 'text-blue-600'
                                }`}>
                                  {pct}%
                                </span>
                              </div>
                              <dl className="space-y-2">
                                {[
                                  { label: 'Completed lessons', value: `${cp.completedLessonsCount ?? 0} / ${cp.totalLessonsCount ?? '?'}` },
                                  { label: 'Status',            value: isDone ? 'Completed' : isRisk ? 'Needs Support' : 'In Progress' },
                                ].map(({ label, value }) => (
                                  <div key={label} className="flex items-baseline justify-between gap-4">
                                    <dt className="text-slate-400 shrink-0">{label}</dt>
                                    <dd className={`font-semibold text-right ${
                                      label === 'Status'
                                        ? isDone ? 'text-emerald-600' : isRisk ? 'text-rose-600' : 'text-blue-600'
                                        : 'text-slate-800'
                                    }`}>{value}</dd>
                                  </div>
                                ))}
                              </dl>
                              {isRisk && (
                                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-50 border border-rose-100 text-rose-700">
                                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                                  <p>Below 50% — consider notifying the instructor for a check-in.</p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-slate-400 italic">No progress data recorded yet.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TaStudentProgressPage — /ta/progress
   Shows per-student course completion progress for each assigned section.
   Data source: GET /progress?classId=X  (TA access confirmed — allowTA: true)
═══════════════════════════════════════════════════════════════════════════ */
export function TaStudentProgressPage() {
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [search,    setSearch]    = useState('');
  const [sortField, setSortField] = useState('pct');   // 'name' | 'studentNumber' | 'pct' | 'lessons'
  const [sortDir,   setSortDir]   = useState('asc');   // 'asc' | 'desc'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'risk' | 'ontrack' | 'done'
  const [expandedRow, setExpandedRow] = useState(null); // studentId for lesson detail row

  /* ── data ─────────────────────────────────────────────────────────────── */
  const {
    data: classData,
    isLoading: classLoading,
    error: classError,
    refetch: refetchClasses,
  } = useQuery({
    queryKey: ['classes', 'ta'],
    queryFn: lmsApi.listClasses,
    staleTime: 30_000,
  });
  const classes = classData?.data?.classes || [];

  React.useEffect(() => {
    if (classes.length > 0 && !selectedClassId) setSelectedClassId(classes[0].id);
  }, [classes, selectedClassId]);

  const {
    data: progressData,
    isLoading: progressLoading,
    error: progressError,
    refetch: refetchProgress,
  } = useQuery({
    queryKey: ['progress', 'ta', selectedClassId],
    queryFn: () => lmsApi.getProgressAnalytics({ classId: selectedClassId }),
    enabled: Boolean(selectedClassId),
    staleTime: 30_000,
  });

  const courseProgressList = progressData?.data?.courseProgress   || [];
  const lessonProgressList = progressData?.data?.lessonProgress   || [];

  // Build per-student lesson progress lookup: studentId → lesson[]
  const lessonsByStudent = React.useMemo(() => {
    const map = {};
    for (const lp of lessonProgressList) {
      if (!map[lp.studentId]) map[lp.studentId] = [];
      map[lp.studentId].push(lp);
    }
    return map;
  }, [lessonProgressList]);

  /* ── derived stats ────────────────────────────────────────────────────── */
  const totalStudents = courseProgressList.length;
  const avgProgress   = totalStudents > 0
    ? Math.round(courseProgressList.reduce((acc, cp) => acc + Number(cp.progressPercentage || 0), 0) / totalStudents)
    : 0;
  const atRiskList  = courseProgressList.filter((cp) => Number(cp.progressPercentage) <   50);
  const onTrackList = courseProgressList.filter((cp) => {
    const p = Number(cp.progressPercentage);
    return p >= 50 && p < 100;
  });
  const doneList    = courseProgressList.filter((cp) => Number(cp.progressPercentage) >= 100);

  /* ── filtered + sorted rows ───────────────────────────────────────────── */
  const statusFiltered = React.useMemo(() => {
    if (filterStatus === 'risk')    return atRiskList;
    if (filterStatus === 'ontrack') return onTrackList;
    if (filterStatus === 'done')    return doneList;
    return courseProgressList;
  }, [filterStatus, courseProgressList, atRiskList, onTrackList, doneList]);

  const searched = React.useMemo(() => {
    if (!search.trim()) return statusFiltered;
    const t = search.toLowerCase();
    return statusFiltered.filter((cp) =>
      `${cp.student?.firstName ?? ''} ${cp.student?.lastName ?? ''}`.toLowerCase().includes(t) ||
      (cp.student?.studentNumber ?? '').toLowerCase().includes(t) ||
      (cp.student?.email ?? '').toLowerCase().includes(t)
    );
  }, [search, statusFiltered]);

  const sorted = React.useMemo(() => {
    const arr = [...searched];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      if (sortField === 'name') {
        const la = `${a.student?.lastName ?? ''} ${a.student?.firstName ?? ''}`.toLowerCase();
        const lb = `${b.student?.lastName ?? ''} ${b.student?.firstName ?? ''}`.toLowerCase();
        return (la < lb ? -1 : la > lb ? 1 : 0) * dir;
      }
      if (sortField === 'studentNumber') {
        const na = a.student?.studentNumber ?? '';
        const nb = b.student?.studentNumber ?? '';
        return (na < nb ? -1 : na > nb ? 1 : 0) * dir;
      }
      if (sortField === 'pct') {
        return (Number(a.progressPercentage || 0) - Number(b.progressPercentage || 0)) * dir;
      }
      if (sortField === 'lessons') {
        return ((a.completedLessonsCount || 0) - (b.completedLessonsCount || 0)) * dir;
      }
      return 0;
    });
    return arr;
  }, [searched, sortField, sortDir]);

  /* ── helpers ──────────────────────────────────────────────────────────── */
  const toggleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir(field === 'pct' ? 'asc' : 'asc'); }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    return sortDir === 'asc'
      ? <ChevronUp   className="w-3 h-3 text-indigo-600" />
      : <ChevronDown className="w-3 h-3 text-indigo-600" />;
  };

  const progressMeta = (pct) => {
    const p = Number(pct || 0);
    if (p >= 100) return { label: 'Completed',     cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', bar: 'bg-emerald-500' };
    if (p  <  50) return { label: 'Needs Support', cls: 'bg-rose-50    text-rose-700    border-rose-200',    bar: 'bg-rose-400'    };
    return              { label: 'In Progress',    cls: 'bg-blue-50    text-blue-700    border-blue-200',    bar: 'bg-blue-500'    };
  };

  const initials = (cp) =>
    `${cp.student?.firstName?.[0] ?? '?'}${cp.student?.lastName?.[0] ?? ''}`;

  const selectedCls = classes.find((c) => c.id === selectedClassId);

  /* ── early states ─────────────────────────────────────────────────────── */
  if (classLoading) return <LoadingState label="Loading sections…" />;
  if (classError)   return <ErrorState message={extractErrorMessage(classError)} onRetry={refetchClasses} />;

  /* ── render ───────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 pb-8">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-md mb-2">
            <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
            Student Progress
          </span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Student Progress</h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor curriculum completion and identify students who may need additional support.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { refetchClasses(); refetchProgress(); }}
          className="self-start sm:self-auto flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          aria-label="Refresh progress data"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          Refresh
        </button>
      </div>

      {classes.length === 0 ? (
        <EmptyState
          title="No sections assigned"
          description="You have not been assigned to any class sections yet. Contact your instructor or academic admin."
        />
      ) : (
        <>
          {/* Section tabs */}
          <div
            className="flex flex-wrap gap-2"
            role="tablist"
            aria-label="Select a class section"
          >
            {classes.map((cls) => {
              const isActive = cls.id === selectedClassId;
              return (
                <button
                  key={cls.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => {
                    setSelectedClassId(cls.id);
                    setSearch('');
                    setFilterStatus('all');
                    setExpandedRow(null);
                  }}
                  className={`px-4 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="font-mono">{cls.sectionCode}</span>
                  {cls.courseOffering?.course?.code && (
                    <span className={`ml-1.5 ${isActive ? 'opacity-80' : 'text-slate-400'}`}>
                      · {cls.courseOffering.course.code}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Progress content for selected section */}
          {progressLoading ? (
            <LoadingState label="Loading student progress…" />
          ) : progressError ? (
            <ErrorState message={extractErrorMessage(progressError)} onRetry={refetchProgress} />
          ) : (
            <>
              {/* Summary stat cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* Average */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Avg. Progress</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1.5">{avgProgress}%</p>
                  <div className="mt-2 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${avgProgress}%` }} />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">{totalStudents} student{totalStudents !== 1 ? 's' : ''}</p>
                </div>
                {/* On track */}
                <button
                  type="button"
                  onClick={() => setFilterStatus(filterStatus === 'ontrack' ? 'all' : 'ontrack')}
                  className={`text-left rounded-xl border p-5 shadow-sm transition-all hover:shadow ${
                    filterStatus === 'ontrack'
                      ? 'border-emerald-400 bg-emerald-50'
                      : 'border-slate-200 bg-white'
                  }`}
                  aria-pressed={filterStatus === 'ontrack'}
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">On Track</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1.5">{onTrackList.length}</p>
                  <p className="text-[11px] text-slate-400 mt-1">50–99% — click to filter</p>
                </button>
                {/* Needs support */}
                <button
                  type="button"
                  onClick={() => setFilterStatus(filterStatus === 'risk' ? 'all' : 'risk')}
                  className={`text-left rounded-xl border p-5 shadow-sm transition-all hover:shadow ${
                    filterStatus === 'risk'
                      ? 'border-rose-400 bg-rose-50'
                      : 'border-slate-200 bg-white'
                  }`}
                  aria-pressed={filterStatus === 'risk'}
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Needs Support</p>
                  <p className="text-2xl font-bold text-rose-600 mt-1.5">{atRiskList.length}</p>
                  <p className="text-[11px] text-slate-400 mt-1">Below 50% — click to filter</p>
                </button>
                {/* Completed */}
                <button
                  type="button"
                  onClick={() => setFilterStatus(filterStatus === 'done' ? 'all' : 'done')}
                  className={`text-left rounded-xl border p-5 shadow-sm transition-all hover:shadow ${
                    filterStatus === 'done'
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-slate-200 bg-white'
                  }`}
                  aria-pressed={filterStatus === 'done'}
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Completed</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1.5">{doneList.length}</p>
                  <p className="text-[11px] text-slate-400 mt-1">100% — click to filter</p>
                </button>
              </div>

              {/* At-risk alert banner */}
              {atRiskList.length > 0 && filterStatus !== 'risk' && (
                <div className="flex items-center gap-3 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />
                  <p className="text-rose-800 font-medium">
                    {atRiskList.length} student{atRiskList.length !== 1 ? 's are' : ' is'} below 50% completion and may need support.
                  </p>
                  <button
                    type="button"
                    onClick={() => setFilterStatus('risk')}
                    className="ml-auto text-rose-700 font-semibold hover:text-rose-900 whitespace-nowrap shrink-0"
                  >
                    View at-risk →
                  </button>
                </div>
              )}

              {/* Active filter chip */}
              {filterStatus !== 'all' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Filtered by:</span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                    filterStatus === 'risk'    ? 'bg-rose-50    text-rose-700    border-rose-200'    :
                    filterStatus === 'ontrack' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                 'bg-blue-50    text-blue-700    border-blue-200'
                  }`}>
                    {filterStatus === 'risk' ? 'Needs Support' : filterStatus === 'ontrack' ? 'On Track' : 'Completed'}
                    <button
                      type="button"
                      onClick={() => setFilterStatus('all')}
                      aria-label="Clear filter"
                      className="hover:opacity-70 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                </div>
              )}

              {/* Search + sort controls */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setExpandedRow(null); }}
                    placeholder="Name, student no., or email…"
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    aria-label="Search students"
                  />
                </div>
                <p className="text-xs text-slate-400 ml-auto">
                  Showing {sorted.length} of {courseProgressList.length} student{courseProgressList.length !== 1 ? 's' : ''}
                  {selectedCls ? ` in ${selectedCls.sectionCode}` : ''}
                </p>
              </div>

              {/* Progress table */}
              {sorted.length === 0 ? (
                <EmptyState
                  title={search.trim() ? 'No students found' : 'No progress records'}
                  description={
                    search.trim()
                      ? `No students match "${search}".`
                      : 'No progress data is available for this section yet. Students will appear here once they begin the curriculum.'
                  }
                />
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  {/* Desktop table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider select-none">
                        <tr>
                          <th className="px-4 py-3 font-semibold">
                            <button type="button" onClick={() => toggleSort('name')} className="inline-flex items-center gap-1 hover:text-indigo-700">
                              Student <SortIcon field="name" />
                            </button>
                          </th>
                          <th className="px-4 py-3 font-semibold">
                            <button type="button" onClick={() => toggleSort('studentNumber')} className="inline-flex items-center gap-1 hover:text-indigo-700">
                              Student No. <SortIcon field="studentNumber" />
                            </button>
                          </th>
                          <th className="px-4 py-3 font-semibold w-52">
                            <button type="button" onClick={() => toggleSort('pct')} className="inline-flex items-center gap-1 hover:text-indigo-700">
                              Progress <SortIcon field="pct" />
                            </button>
                          </th>
                          <th className="px-4 py-3 font-semibold">
                            <button type="button" onClick={() => toggleSort('lessons')} className="inline-flex items-center gap-1 hover:text-indigo-700">
                              Lessons <SortIcon field="lessons" />
                            </button>
                          </th>
                          <th className="px-4 py-3 font-semibold">Status</th>
                          <th className="px-4 py-3 font-semibold sr-only">Detail</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((cp) => {
                          const pct  = Math.min(100, Number(cp.progressPercentage || 0));
                          const meta = progressMeta(pct);
                          const isExpanded = expandedRow === cp.studentId;
                          const studentLessons = lessonsByStudent[cp.studentId] || [];
                          const lastLesson = studentLessons.length > 0
                            ? studentLessons.reduce((a, b) =>
                                new Date(a.lastAccessedAt || 0) > new Date(b.lastAccessedAt || 0) ? a : b
                              )
                            : null;

                          return (
                            <React.Fragment key={cp.studentId}>
                              <tr
                                className={`border-b border-slate-100 cursor-pointer transition-colors ${
                                  isExpanded ? 'bg-indigo-50/60' : cp.progressPercentage < 50 ? 'bg-rose-50/20 hover:bg-rose-50/40' : 'hover:bg-slate-50'
                                }`}
                                onClick={() => setExpandedRow(isExpanded ? null : cp.studentId)}
                                aria-expanded={isExpanded}
                              >
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2.5">
                                    <div
                                      className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[11px] shrink-0 select-none"
                                      aria-hidden="true"
                                    >
                                      {initials(cp)}
                                    </div>
                                    <div>
                                      <p className="font-semibold text-slate-900">
                                        {cp.student?.firstName} {cp.student?.lastName}
                                      </p>
                                      <p className="text-[11px] text-slate-400">{cp.student?.email}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 font-mono text-slate-600">
                                  {cp.student?.studentNumber || '—'}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden" style={{ minWidth: 80 }}>
                                      <div
                                        className={`${meta.bar} h-2 rounded-full transition-all`}
                                        style={{ width: `${pct}%` }}
                                        role="progressbar"
                                        aria-valuenow={pct}
                                        aria-valuemin={0}
                                        aria-valuemax={100}
                                        aria-label={`${cp.student?.firstName} ${cp.student?.lastName} — ${pct}%`}
                                      />
                                    </div>
                                    <span className="font-mono font-bold text-slate-700 w-9 text-right shrink-0">{pct}%</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-slate-600">
                                  <span className="font-semibold text-slate-800">{cp.completedLessonsCount ?? 0}</span>
                                  <span className="text-slate-300"> / </span>
                                  {cp.totalLessonsCount ?? '?'}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${meta.cls}`}>
                                    {meta.label}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-slate-400">
                                  {isExpanded
                                    ? <ChevronUp   className="w-4 h-4 text-indigo-500" />
                                    : <ChevronDown className="w-4 h-4" />}
                                </td>
                              </tr>

                              {/* Expanded lesson detail row */}
                              {isExpanded && (
                                <tr className="border-b border-slate-100 bg-indigo-50/30">
                                  <td colSpan={6} className="px-6 py-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                      {/* Last activity */}
                                      <div className="space-y-1.5">
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Last Activity</p>
                                        {lastLesson ? (
                                          <div className="flex items-start gap-2 p-3 bg-white rounded-lg border border-slate-200">
                                            <BookOpen className="w-3.5 h-3.5 text-indigo-500 mt-0.5 shrink-0" aria-hidden="true" />
                                            <div>
                                              <p className="font-semibold text-slate-900">
                                                {lastLesson.lesson?.title ?? 'Unknown lesson'}
                                              </p>
                                              <p className="text-[11px] text-slate-400 mt-0.5">
                                                Last accessed:{' '}
                                                {lastLesson.lastAccessedAt
                                                  ? new Date(lastLesson.lastAccessedAt).toLocaleString()
                                                  : '—'}
                                              </p>
                                              <p className="text-[11px] text-slate-400">
                                                Completed: {lastLesson.isCompleted ? 'Yes' : 'Not yet'}
                                              </p>
                                            </div>
                                          </div>
                                        ) : (
                                          <p className="text-slate-400 italic p-3 bg-white rounded-lg border border-slate-200">
                                            No lesson activity recorded.
                                          </p>
                                        )}
                                      </div>

                                      {/* Progress detail */}
                                      <div className="space-y-1.5">
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Completion Detail</p>
                                        <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                                          <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                              <div
                                                className={`${meta.bar} h-2.5 rounded-full`}
                                                style={{ width: `${pct}%` }}
                                              />
                                            </div>
                                            <span className="font-mono font-bold text-sm w-10 text-right shrink-0" style={{ color: pct >= 100 ? '#059669' : pct < 50 ? '#e11d48' : '#4f46e5' }}>
                                              {pct}%
                                            </span>
                                          </div>
                                          <dl className="space-y-1">
                                            {[
                                              { label: 'Lessons completed', value: `${cp.completedLessonsCount ?? 0} of ${cp.totalLessonsCount ?? '?'}` },
                                              { label: 'Lessons accessed',  value: studentLessons.length },
                                              { label: 'Status',            value: meta.label },
                                            ].map(({ label, value }) => (
                                              <div key={label} className="flex justify-between gap-4">
                                                <dt className="text-slate-400">{label}</dt>
                                                <dd className="font-semibold text-slate-800">{value}</dd>
                                              </div>
                                            ))}
                                          </dl>
                                          {pct < 50 && (
                                            <div className="flex items-start gap-1.5 pt-1.5 border-t border-slate-100 text-rose-700">
                                              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                                              <p>Below 50% — recommend escalating to the instructor for a check-in.</p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="sm:hidden divide-y divide-slate-100">
                    {sorted.map((cp) => {
                      const pct  = Math.min(100, Number(cp.progressPercentage || 0));
                      const meta = progressMeta(pct);
                      const isExpanded = expandedRow === cp.studentId;
                      return (
                        <div
                          key={cp.studentId}
                          className={`p-4 space-y-2.5 cursor-pointer transition-colors ${
                            isExpanded ? 'bg-indigo-50/60' : pct < 50 ? 'bg-rose-50/20' : ''
                          }`}
                          onClick={() => setExpandedRow(isExpanded ? null : cp.studentId)}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0 select-none">
                                {initials(cp)}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-900">
                                  {cp.student?.firstName} {cp.student?.lastName}
                                </p>
                                <p className="text-[11px] text-slate-400 font-mono">
                                  {cp.student?.studentNumber || cp.student?.email || '—'}
                                </p>
                              </div>
                            </div>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${meta.cls}`}>
                              {meta.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div className={`${meta.bar} h-2 rounded-full`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[11px] font-mono font-bold text-slate-600 w-8 text-right shrink-0">{pct}%</span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            {cp.completedLessonsCount ?? 0} / {cp.totalLessonsCount ?? '?'} lessons completed
                          </p>
                          {isExpanded && (
                            <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                              <p><span className="text-slate-400">Lessons accessed: </span>{(lessonsByStudent[cp.studentId] || []).length}</p>
                              {pct < 50 && (
                                <p className="text-rose-600 font-medium flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                                  Recommend instructor check-in
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2">
                    <span>
                      {sorted.length} student{sorted.length !== 1 ? 's' : ''}
                      {search.trim() ? ` matching "${search}"` : ''}
                      {filterStatus !== 'all' ? ` · filtered` : ''}
                    </span>
                    {expandedRow && (
                      <span className="text-indigo-500 font-medium">Click a row again to collapse details</span>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   TaStudentActivityPage — /ta/activity
   Full student monitoring: submission activity, assessment results, published
   grades, and progress — all in one view. Read-only: TAs cannot modify grades.
   Data source: GET /dashboards/ta-student-monitoring/:classId
═══════════════════════════════════════════════════════════════════════════ */
export function TaStudentActivityPage() {
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'risk' | 'pending' | 'inactive'
  const [expandedRow, setExpandedRow] = useState(null);

  /* ── section list (TA-scoped by backend) ───────────────────────────────── */
  const {
    data: classData,
    isLoading: classLoading,
    error: classError,
    refetch: refetchClasses,
  } = useQuery({
    queryKey: ['classes', 'ta'],
    queryFn: lmsApi.listClasses,
    staleTime: 30_000,
  });
  const classes = classData?.data?.classes || [];

  React.useEffect(() => {
    if (classes.length > 0 && !selectedClassId) setSelectedClassId(classes[0].id);
  }, [classes, selectedClassId]);

  /* ── monitoring data ──────────────────────────────────────────────────── */
  const {
    data: monitorData,
    isLoading: monitorLoading,
    error: monitorError,
    refetch: refetchMonitor,
  } = useQuery({
    queryKey: ['ta-student-monitoring', selectedClassId],
    queryFn: () => lmsApi.getTaStudentMonitoring(selectedClassId),
    enabled: Boolean(selectedClassId),
    staleTime: 30_000,
  });

  const d = monitorData?.data || {};
  const students   = d.students   || [];
  const assignments = d.assignments || [];
  const assessments = d.assessments || [];
  const classSection = d.classSection || {};

  /* ── derived class-level stats ────────────────────────────────────────── */
  const totalStudents     = students.length;
  const totalPendingSubs  = students.reduce((acc, s) => acc + s.submissions.missing, 0);
  const totalLateSubs     = students.reduce((acc, s) => acc + s.submissions.late, 0);
  const totalFlagged      = students.reduce((acc, s) => acc + s.submissions.flagged, 0);
  const atRiskStudents    = students.filter((s) =>
    (s.progress && s.progress.percentage < 50) || s.submissions.missing >= 3
  );
  const studentsWithPending = students.filter((s) => s.submissions.missing > 0);

  /* ── filter + search ──────────────────────────────────────────────────── */
  const filteredStudents = React.useMemo(() => {
    let list = students;
    if (statusFilter === 'risk') {
      list = atRiskStudents;
    } else if (statusFilter === 'pending') {
      list = studentsWithPending;
    } else if (statusFilter === 'inactive') {
      list = students.filter((s) => !s.lastActivity.submissionDate && !s.lastActivity.assessmentDate);
    }
    if (!search.trim()) return list;
    const t = search.toLowerCase();
    return list.filter((s) =>
      s.studentName.toLowerCase().includes(t) ||
      (s.studentNumber || '').toLowerCase().includes(t) ||
      s.studentEmail.toLowerCase().includes(t)
    );
  }, [students, statusFilter, search, atRiskStudents, studentsWithPending]);

  /* ── helpers ──────────────────────────────────────────────────────────── */
  const initials = (s) => {
    const parts = s.studentName.split(' ');
    return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : '??';
  };

  const relTime = (dateStr) => {
    if (!dateStr) return null;
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const ProgressBar = ({ value, color = 'bg-blue-500' }) => {
    const v = Math.min(100, Math.max(0, value));
    return (
      <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden" style={{ minWidth: 60 }}>
        <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${v}%` }} />
      </div>
    );
  };

  const filterTabs = [
    { key: 'all',     label: 'All Students',  count: totalStudents },
    { key: 'pending', label: 'Has Pending',   count: studentsWithPending.length },
    { key: 'risk',    label: 'At-Risk',        count: atRiskStudents.length },
    { key: 'inactive',label: 'Inactive',       count: students.filter((s) => !s.lastActivity.submissionDate && !s.lastActivity.assessmentDate).length },
  ];

  /* ── early states ─────────────────────────────────────────────────────── */
  if (classLoading) return <LoadingState label="Loading sections…" />;
  if (classError)   return <ErrorState message={extractErrorMessage(classError)} onRetry={refetchClasses} />;

  /* ── render ───────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 pb-8">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md mb-2">
            <Activity className="w-3.5 h-3.5" aria-hidden="true" />
            Student Monitoring
          </span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Student Activity & Progress</h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor submission activity, assessment results, and published grades across your assigned sections.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { refetchClasses(); refetchMonitor(); }}
          className="self-start sm:self-auto flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          aria-label="Refresh monitoring data"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          Refresh
        </button>
      </div>

      {classes.length === 0 ? (
        <EmptyState
          title="No sections assigned"
          description="You have not been assigned to any class sections yet. Contact your instructor or academic admin."
        />
      ) : (
        <>
          {/* Section selector */}
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Select a class section">
            {classes.map((cls) => {
              const isActive = cls.id === selectedClassId;
              return (
                <button
                  key={cls.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => {
                    setSelectedClassId(cls.id);
                    setSearch('');
                    setStatusFilter('all');
                    setExpandedRow(null);
                  }}
                  className={`px-4 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="font-mono">{cls.sectionCode}</span>
                  {cls.courseOffering?.course?.code && (
                    <span className={`ml-1.5 ${isActive ? 'opacity-80' : 'text-slate-400'}`}>
                      · {cls.courseOffering.course.code}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Monitoring content */}
          {monitorLoading ? (
            <LoadingState label="Loading student monitoring data…" />
          ) : monitorError ? (
            <ErrorState message={extractErrorMessage(monitorError)} onRetry={refetchMonitor} />
          ) : students.length === 0 ? (
            <EmptyState
              title="No enrolled students"
              description="There are no enrolled students in this section yet."
            />
          ) : (
            <>
              {/* Summary stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Students</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1.5">{totalStudents}</p>
                      <p className="text-xs text-slate-500 mt-1">{assignments.length} assignments · {assessments.length} assessments</p>
                    </div>
                    <div className="p-2.5 rounded-lg border bg-blue-50 text-blue-600 border-blue-100">
                      <Users className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
                  className={`text-left bg-white rounded-xl border p-5 shadow-sm transition-all hover:shadow ${
                    statusFilter === 'pending' ? 'border-amber-400 bg-amber-50' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending</p>
                      <p className="text-2xl font-bold text-amber-600 mt-1.5">{totalPendingSubs}</p>
                      <p className="text-xs text-slate-500 mt-1">Missing submissions — click to filter</p>
                    </div>
                    <div className="p-2.5 rounded-lg border bg-amber-50 text-amber-600 border-amber-100">
                      <Clock className="w-5 h-5" />
                    </div>
                  </div>
                </button>

                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Late / Flagged</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1.5">
                        {totalLateSubs}
                        <span className="text-amber-500 text-base ml-1">/ {totalFlagged}</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-1">Late submissions / flagged for review</p>
                    </div>
                    <div className="p-2.5 rounded-lg border bg-rose-50 text-rose-600 border-rose-100">
                      <Flag className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStatusFilter(statusFilter === 'risk' ? 'all' : 'risk')}
                  className={`text-left bg-white rounded-xl border p-5 shadow-sm transition-all hover:shadow ${
                    statusFilter === 'risk' ? 'border-rose-400 bg-rose-50' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">At-Risk</p>
                      <p className="text-2xl font-bold text-rose-600 mt-1.5">{atRiskStudents.length}</p>
                      <p className="text-xs text-slate-500 mt-1">&lt; 50% or 3+ missing — click to filter</p>
                    </div>
                    <div className="p-2.5 rounded-lg border bg-rose-50 text-rose-600 border-rose-100">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                  </div>
                </button>
              </div>

              {/* Filter tabs + search */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter students by status">
                  {filterTabs.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      role="tab"
                      aria-selected={statusFilter === t.key}
                      onClick={() => { setStatusFilter(t.key); setExpandedRow(null); }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        statusFilter === t.key
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {t.label}
                      <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        statusFilter === t.key ? 'bg-blue-500' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {t.count}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="relative sm:ml-auto w-full sm:w-60">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setExpandedRow(null); }}
                    placeholder="Name, student no., or email…"
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    aria-label="Search students"
                  />
                </div>
              </div>

              {/* Active filter chip */}
              {statusFilter !== 'all' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Filtered by:</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-blue-50 text-blue-700 border-blue-200">
                    {filterTabs.find((t) => t.key === statusFilter)?.label || statusFilter}
                    <button
                      type="button"
                      onClick={() => setStatusFilter('all')}
                      aria-label="Clear filter"
                      className="hover:opacity-70 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                </div>
              )}

              {/* Student monitoring table */}
              {filteredStudents.length === 0 ? (
                <EmptyState
                  title={search.trim() ? 'No students found' : 'No students match this filter'}
                  description={
                    search.trim()
                      ? `No students match "${search}".`
                      : 'Try a different filter or clear the search.'
                  }
                />
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  {/* Desktop table */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Student</th>
                          <th className="px-4 py-3 font-semibold text-center">Submissions</th>
                          <th className="px-4 py-3 font-semibold text-center">Assessments</th>
                          <th className="px-4 py-3 font-semibold text-center">Published Grades</th>
                          <th className="px-4 py-3 font-semibold w-32">Progress</th>
                          <th className="px-4 py-3 font-semibold">Last Activity</th>
                          <th className="px-4 py-3 font-semibold sr-only">Detail</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map((s) => {
                          const isExpanded = expandedRow === s.studentId;
                          const isRisk = (s.progress && s.progress.percentage < 50) || s.submissions.missing >= 3;
                          const subPct = s.submissions.totalAssignments > 0
                            ? Math.round((s.submissions.submitted / s.submissions.totalAssignments) * 100)
                            : 0;
                          const progressPct = s.progress?.percentage ?? 0;
                          const progressColor = progressPct >= 100 ? 'bg-emerald-500' : progressPct < 50 ? 'bg-rose-400' : 'bg-blue-500';
                          const lastDate = s.lastActivity.submissionDate || s.lastActivity.assessmentDate;

                          return (
                            <React.Fragment key={s.studentId}>
                              <tr
                                className={`border-b border-slate-100 cursor-pointer transition-colors ${
                                  isExpanded ? 'bg-blue-50/60' : isRisk ? 'bg-rose-50/20 hover:bg-rose-50/40' : 'hover:bg-slate-50'
                                }`}
                                onClick={() => setExpandedRow(isExpanded ? null : s.studentId)}
                                aria-expanded={isExpanded}
                              >
                                {/* Student */}
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[11px] shrink-0 select-none">
                                      {initials(s)}
                                    </div>
                                    <div>
                                      <p className="font-semibold text-slate-900">{s.studentName}</p>
                                      <p className="text-[11px] text-slate-400">
                                        {s.studentNumber || s.studentEmail}
                                      </p>
                                    </div>
                                  </div>
                                </td>

                                {/* Submissions mini-summary */}
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <span className="font-bold text-slate-800">{s.submissions.submitted}</span>
                                    <span className="text-slate-300">/</span>
                                    <span className="text-slate-400">{s.submissions.totalAssignments}</span>
                                    {s.submissions.late > 0 && (
                                      <span className="ml-1 px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-700 text-[10px] font-bold border border-orange-200">
                                        {s.submissions.late} late
                                      </span>
                                    )}
                                    {s.submissions.missing > 0 && (
                                      <span className="ml-1 px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200">
                                        {s.submissions.missing} missing
                                      </span>
                                    )}
                                    {s.submissions.flagged > 0 && (
                                      <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">
                                        {s.submissions.flagged} flagged
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Assessments mini-summary */}
                                <td className="px-4 py-3 text-center">
                                  <span className="font-bold text-slate-800">{s.assessments.completed}</span>
                                  <span className="text-slate-300"> / </span>
                                  <span className="text-slate-400">{s.assessments.totalAssessments}</span>
                                  {s.assessments.averageScore !== null && (
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                      Avg: {s.assessments.averageScore}%
                                    </p>
                                  )}
                                </td>

                                {/* Published grades */}
                                <td className="px-4 py-3 text-center">
                                  {s.grades.publishedCount > 0 ? (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
                                      {s.grades.publishedCount} published
                                    </span>
                                  ) : (
                                    <span className="text-slate-300 text-[11px]">—</span>
                                  )}
                                </td>

                                {/* Progress bar */}
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <ProgressBar value={progressPct} color={progressColor} />
                                    <span className="font-mono font-bold text-slate-700 text-[11px] w-8 text-right shrink-0">
                                      {progressPct}%
                                    </span>
                                  </div>
                                </td>

                                {/* Last activity */}
                                <td className="px-4 py-3">
                                  {lastDate ? (
                                    <span className="text-slate-500 text-[11px]">{relTime(lastDate)}</span>
                                  ) : (
                                    <span className="text-slate-300 text-[11px] italic">No activity</span>
                                  )}
                                </td>

                                {/* Expand toggle */}
                                <td className="px-4 py-3 text-slate-400">
                                  {isExpanded
                                    ? <ChevronUp className="w-4 h-4 text-blue-500" />
                                    : <ChevronDown className="w-4 h-4" />}
                                </td>
                              </tr>

                              {/* Expanded detail row */}
                              {isExpanded && (
                                <tr className="border-b border-slate-100 bg-blue-50/30">
                                  <td colSpan={7} className="px-6 py-5">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-xs">

                                      {/* Submission breakdown */}
                                      <div className="space-y-2">
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                          <ClipboardCheck className="w-3 h-3" /> Submissions
                                        </p>
                                        <dl className="space-y-1.5 p-3 bg-white rounded-lg border border-slate-200">
                                          {[
                                            { label: 'Total assignments', value: s.submissions.totalAssignments },
                                            { label: 'Submitted',         value: s.submissions.submitted,     cls: 'text-emerald-600 font-semibold' },
                                            { label: 'Late',              value: s.submissions.late,          cls: 'text-orange-600 font-semibold' },
                                            { label: 'Missing',           value: s.submissions.missing,       cls: 'text-rose-600 font-semibold' },
                                            { label: 'Graded',             value: s.submissions.graded,        cls: 'text-blue-600 font-semibold' },
                                            { label: 'Flagged',            value: s.submissions.flagged,      cls: 'text-amber-600 font-semibold' },
                                          ].map(({ label, value, cls }) => (
                                            <div key={label} className="flex justify-between gap-4">
                                              <dt className="text-slate-400">{label}</dt>
                                              <dd className={cls || 'text-slate-800 font-medium'}>{value}</dd>
                                            </div>
                                          ))}
                                        </dl>
                                      </div>

                                      {/* Assessment breakdown */}
                                      <div className="space-y-2">
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                          <BarChart3 className="w-3 h-3" /> Assessments
                                        </p>
                                        <dl className="space-y-1.5 p-3 bg-white rounded-lg border border-slate-200">
                                          {[
                                            { label: 'Total assessments',  value: s.assessments.totalAssessments },
                                            { label: 'Completed',          value: s.assessments.completed,        cls: 'text-emerald-600 font-semibold' },
                                            { label: 'In progress',        value: s.assessments.inProgress,      cls: 'text-blue-600 font-semibold' },
                                            { label: 'Published results',  value: s.assessments.publishedResults },
                                            { label: 'Average score',      value: s.assessments.averageScore !== null ? `${s.assessments.averageScore}%` : '—', cls: 'text-indigo-600 font-bold' },
                                          ].map(({ label, value, cls }) => (
                                            <div key={label} className="flex justify-between gap-4">
                                              <dt className="text-slate-400">{label}</dt>
                                              <dd className={cls || 'text-slate-800 font-medium'}>{value}</dd>
                                            </div>
                                          ))}
                                        </dl>
                                      </div>

                                      {/* Published grades */}
                                      <div className="space-y-2">
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                          <CheckCircle2 className="w-3 h-3" /> Published Grades
                                        </p>
                                        <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                                          {s.grades.items.length === 0 ? (
                                            <p className="text-slate-400 italic">No published grades yet.</p>
                                          ) : (
                                            s.grades.items.slice(0, 5).map((g) => (
                                              <div key={g.id} className="flex items-center justify-between gap-2 text-xs">
                                                <span className="text-slate-700 truncate flex-1">{g.itemTitle}</span>
                                                <span className={`font-bold shrink-0 ${
                                                  g.percentage !== null && g.percentage >= 75 ? 'text-emerald-600' :
                                                  g.percentage !== null && g.percentage < 75 ? 'text-rose-600' :
                                                  'text-slate-700'
                                                }`}>
                                                  {Number(g.score)} / {Number(g.maxScore)}
                                                  {g.percentage !== null && (
                                                    <span className="text-slate-400 font-normal ml-1">({g.percentage}%)</span>
                                                  )}
                                                </span>
                                              </div>
                                            ))
                                          )}
                                          {s.grades.items.length > 5 && (
                                            <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                                              +{s.grades.items.length - 5} more grade items
                                            </p>
                                          )}
                                          <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-100">
                                            Read-only — TAs cannot modify or publish grades.
                                          </p>
                                        </div>
                                      </div>

                                      {/* Progress + activity */}
                                      <div className="space-y-2">
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                          <TrendingUp className="w-3 h-3" /> Progress & Activity
                                        </p>
                                        <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-3">
                                          {s.progress ? (
                                            <>
                                              <div className="flex items-center gap-2">
                                                <ProgressBar value={s.progress.percentage} color={progressColor} />
                                                <span className={`font-mono font-bold text-sm w-10 text-right shrink-0 ${
                                                  s.progress.percentage >= 100 ? 'text-emerald-600' :
                                                  s.progress.percentage < 50 ? 'text-rose-600' : 'text-blue-600'
                                                }`}>
                                                  {s.progress.percentage}%
                                                </span>
                                              </div>
                                              <dl className="space-y-1">
                                                <div className="flex justify-between">
                                                  <dt className="text-slate-400">Lessons completed</dt>
                                                  <dd className="text-slate-800 font-medium">
                                                    {s.progress.completedLessons} / {s.progress.totalLessons}
                                                  </dd>
                                                </div>
                                              </dl>
                                            </>
                                          ) : (
                                            <p className="text-slate-400 italic">No progress data.</p>
                                          )}
                                          <dl className="space-y-1 pt-2 border-t border-slate-100">
                                            {[
                                              { label: 'Last submission',   value: s.lastActivity.submissionDate ? relTime(s.lastActivity.submissionDate) : 'Never' },
                                              { label: 'Last assessment',    value: s.lastActivity.assessmentDate ? relTime(s.lastActivity.assessmentDate) : 'Never' },
                                            ].map(({ label, value }) => (
                                              <div key={label} className="flex justify-between gap-4">
                                                <dt className="text-slate-400 flex items-center gap-1">
                                                  <Clock className="w-3 h-3" /> {label}
                                                </dt>
                                                <dd className="text-slate-700 font-medium">{value}</dd>
                                              </div>
                                            ))}
                                          </dl>
                                          {isRisk && (
                                            <div className="flex items-start gap-1.5 p-2.5 rounded-lg bg-rose-50 border border-rose-100 text-rose-700">
                                              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                              <p>At-risk indicator — consider escalating to instructor for check-in.</p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile card list */}
                  <div className="lg:hidden divide-y divide-slate-100">
                    {filteredStudents.map((s) => {
                      const isExpanded = expandedRow === s.studentId;
                      const isRisk = (s.progress && s.progress.percentage < 50) || s.submissions.missing >= 3;
                      const progressPct = s.progress?.percentage ?? 0;
                      const progressColor = progressPct >= 100 ? 'bg-emerald-500' : progressPct < 50 ? 'bg-rose-400' : 'bg-blue-500';
                      const lastDate = s.lastActivity.submissionDate || s.lastActivity.assessmentDate;

                      return (
                        <div
                          key={s.studentId}
                          className={`p-4 space-y-2.5 cursor-pointer transition-colors ${
                            isExpanded ? 'bg-blue-50/60' : isRisk ? 'bg-rose-50/20' : ''
                          }`}
                          onClick={() => setExpandedRow(isExpanded ? null : s.studentId)}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                                {initials(s)}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{s.studentName}</p>
                                <p className="text-[11px] text-slate-400">{s.studentNumber || s.studentEmail}</p>
                              </div>
                            </div>
                            {isRisk && (
                              <span className="px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200">
                                At-Risk
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div className="flex items-center gap-1.5">
                              <ClipboardCheck className="w-3 h-3 text-slate-400" />
                              <span className="text-slate-500">Subs:</span>
                              <span className="font-bold text-slate-800">{s.submissions.submitted}/{s.submissions.totalAssignments}</span>
                              {s.submissions.missing > 0 && (
                                <span className="text-rose-600 font-semibold">({s.submissions.missing} missing)</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <BarChart3 className="w-3 h-3 text-slate-400" />
                              <span className="text-slate-500">Assess:</span>
                              <span className="font-bold text-slate-800">{s.assessments.completed}/{s.assessments.totalAssessments}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <ProgressBar value={progressPct} color={progressColor} />
                            <span className="text-[11px] font-mono font-bold text-slate-600 w-8 text-right">{progressPct}%</span>
                          </div>

                          <p className="text-[11px] text-slate-400">
                            {lastDate ? `Last active ${relTime(lastDate)}` : 'No activity recorded'}
                            {s.grades.publishedCount > 0 && ` · ${s.grades.publishedCount} published grades`}
                          </p>

                          {isExpanded && (
                            <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
                              <div className="grid grid-cols-2 gap-2">
                                <div><span className="text-slate-400">Late: </span><span className="text-orange-600 font-semibold">{s.submissions.late}</span></div>
                                <div><span className="text-slate-400">Missing: </span><span className="text-rose-600 font-semibold">{s.submissions.missing}</span></div>
                                <div><span className="text-slate-400">Graded: </span><span className="text-blue-600 font-semibold">{s.submissions.graded}</span></div>
                                <div><span className="text-slate-400">Flagged: </span><span className="text-amber-600 font-semibold">{s.submissions.flagged}</span></div>
                              </div>
                              {s.assessments.averageScore !== null && (
                                <p><span className="text-slate-400">Assessment avg: </span><span className="text-indigo-600 font-bold">{s.assessments.averageScore}%</span></p>
                              )}
                              {s.progress && (
                                <p><span className="text-slate-400">Lessons: </span><span className="font-semibold">{s.progress.completedLessons} / {s.progress.totalLessons}</span></p>
                              )}
                              {s.grades.items.length > 0 && (
                                <div className="space-y-1 pt-1 border-t border-slate-100">
                                  <p className="text-[11px] font-bold text-slate-500">Published Grades:</p>
                                  {s.grades.items.slice(0, 3).map((g) => (
                                    <div key={g.id} className="flex justify-between text-[11px]">
                                      <span className="text-slate-600 truncate">{g.itemTitle}</span>
                                      <span className="font-bold text-slate-800">{Number(g.score)}/{Number(g.maxScore)}</span>
                                    </div>
                                  ))}
                                  {s.grades.items.length > 3 && <p className="text-[10px] text-slate-400">+{s.grades.items.length - 3} more</p>}
                                </div>
                              )}
                              <p className="text-[10px] text-slate-400 italic">Read-only — TAs cannot modify grades.</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>
                      {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
                      {search.trim() ? ` matching "${search}"` : ''}
                      {statusFilter !== 'all' ? ` · filtered` : ''}
                    </span>
                    {expandedRow && (
                      <span className="text-blue-500 font-medium">Click a row again to collapse</span>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
