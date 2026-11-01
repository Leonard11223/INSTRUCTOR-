import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell
} from 'recharts';
import {
  BookOpen, ClipboardCheck, Clock, AlertCircle, Plus, Terminal, Award, Send,
  FileDown, History, MessageSquare, ChevronRight, CheckCircle2, FileText,
  BarChart3, GraduationCap, ArrowUpRight, Flag, RefreshCw, Search, Eye
} from 'lucide-react';
import { lmsApi, extractErrorMessage } from '../services/api';
import {
  StatusBadge, LoadingState, ErrorState, ModalDialog, useToast
} from '../components/ui/SharedComponents';

/* ─── shared helpers ──────────────────────────────────────── */
function ProgressBar({ value = 0, color = 'bg-blue-500', height = 'h-2' }) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <div className={`w-full bg-slate-100 rounded-full ${height} overflow-hidden`}>
      <div className={`${color} ${height} rounded-full transition-all duration-500`} style={{ width: `${v}%` }} />
    </div>
  );
}

function QuickBtn({ to, icon: Icon, label, color }) {
  const map = {
    blue:   'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    amber:  'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
    emerald:'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
    rose:   'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
    violet: 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100',
  };
  return (
    <Link to={to} className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-xs font-semibold transition-colors ${map[color] || map.blue}`}>
      <Icon className="w-5 h-5" /><span className="text-center leading-tight">{label}</span>
    </Link>
  );
}

function SecHead({ title, sub, linkTo, linkLabel }) {
  return (
    <div className="flex items-start justify-between mb-3">
      <div>
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
      {linkTo && (
        <Link to={linkTo} className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline shrink-0">
          {linkLabel || 'View all'} <ArrowUpRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

function Badge({ label, color = 'blue', icon: Icon }) {
  const map = {
    blue:   'text-blue-700 bg-blue-50 border-blue-200',
    emerald:'text-emerald-700 bg-emerald-50 border-emerald-200',
    amber:  'text-amber-700 bg-amber-50 border-amber-200',
    indigo: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    violet: 'text-violet-700 bg-violet-50 border-violet-200',
    rose:   'text-rose-700 bg-rose-50 border-rose-200',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider border px-2.5 py-0.5 rounded-md mb-2 ${map[color]}`}>
      {Icon && <Icon className="w-3.5 h-3.5" />}{label}
    </span>
  );
}

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

const CHART_COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626'];

/* ══════════════════════════════════════════════════════════════
   1. INSTRUCTOR DASHBOARD
══════════════════════════════════════════════════════════════ */
export function InstructorDashboardPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard', 'instructor'],
    queryFn: lmsApi.getDashboardSummary,
    refetchInterval: 60_000
  });

  if (isLoading) return <LoadingState label="Loading instructor workspace…" />;
  if (error) return <ErrorState message={extractErrorMessage(error)} onRetry={refetch} />;

  const d = data?.data || {};
  const m = d.metrics || {};
  const classes = d.activeClasses || [];
  const stats   = d.classCompletionStats || [];
  const pending = d.pendingSubmissions || [];
  const support = d.studentsNeedingSupport || [];
  const assess  = d.upcomingAssessments || [];
  const threads = d.recentQuestions || [];
  const courses = d.assignedCourses || [];
  const flagged = pending.filter((s) => s.flaggedForInstructorReview);

  // All 4 buckets use per-student progress records (support only covers <50%;
  // students ≥50% come from class membership counts minus the at-risk set).
  const totalStudents = m.enrolledStudentsCount ?? 0;
  const atRiskCount   = support.length;
  const aboveFiftyCount = Math.max(0, totalStudents - atRiskCount);
  // Approximate the upper buckets from class-level averages when student-level
  // data isn't individually available above 50%.
  const highPassCount = stats.filter((c) => c.averageProgress > 75).length;
  const midPassCount  = Math.max(0, stats.filter((c) => c.averageProgress > 50).length - highPassCount);
  const buckets = [
    { name: '0–25%',  value: support.filter((s) => s.progressPercentage <= 25).length },
    { name: '26–50%', value: support.filter((s) => s.progressPercentage > 25 && s.progressPercentage <= 50).length },
    { name: '51–75%', value: midPassCount },
    { name: '76–100%',value: highPassCount },
  ].filter((b) => b.value > 0);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <Badge label="Faculty Teaching Workspace" icon={GraduationCap} />
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Instructor Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Overview of classes, student progress, and pending tasks.</p>
        </div>
        <button type="button" onClick={() => refetch()}
          className="self-start sm:self-auto flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Courses / Classes', value: `${m.assignedCoursesCount ?? 0} / ${m.activeClassesCount ?? 0}`, sub: `${m.enrolledStudentsCount ?? 0} learners`, icon: BookOpen, accent: 'bg-blue-50 text-blue-600 border-blue-100', bar: 'bg-blue-500', bval: m.activeClassesCount ? Math.min(100, (m.activeClassesCount / 10) * 100) : 0 },
          { label: 'Pending Review', value: m.pendingSubmissionsCount ?? 0, sub: flagged.length > 0 ? `${flagged.length} TA-flagged` : `${m.pendingGradingTasksCount ?? 0} grading tasks`, icon: ClipboardCheck, accent: m.pendingSubmissionsCount > 0 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-50 text-slate-400 border-slate-100', bar: 'bg-amber-400', bval: m.pendingGradingTasksCount ? Math.min(100, (m.pendingSubmissionsCount / m.pendingGradingTasksCount) * 100) : 0 },
          { label: 'Assessments', value: m.upcomingAssessmentsCount ?? 0, sub: m.overdueActivitiesCount > 0 ? `${m.overdueActivitiesCount} overdue` : 'No overdue', icon: Clock, accent: 'bg-indigo-50 text-indigo-600 border-indigo-100', bar: 'bg-indigo-500', bval: m.upcomingAssessmentsCount ? 70 : 0 },
          { label: 'At-Risk Learners', value: support.length, sub: 'Below 50% milestone', icon: AlertCircle, accent: support.length > 0 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-50 text-slate-400 border-slate-100', bar: 'bg-rose-400', bval: m.enrolledStudentsCount ? (support.length / m.enrolledStudentsCount) * 100 : 0 },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow transition-shadow">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{card.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1.5">{card.value}</p>
                <p className="text-xs text-slate-500 mt-1">{card.sub}</p>
              </div>
              <div className={`p-2.5 rounded-lg border ${card.accent}`}><card.icon className="w-5 h-5" /></div>
            </div>
            <ProgressBar value={card.bval} color={card.bar} height="h-1.5" />
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <SecHead title="Quick Actions" sub="Jump to common instructor tasks" />
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          <QuickBtn to="/instructor/assignments"   icon={FileText}       label="New Assignment"  color="blue"    />
          <QuickBtn to="/instructor/assessments"   icon={ClipboardCheck} label="New Quiz"        color="indigo"  />
          <QuickBtn to="/instructor/submissions"   icon={Award}          label="Grade Work"      color="amber"   />
          <QuickBtn to="/instructor/courses"       icon={BookOpen}       label="Author Content"  color="emerald" />
          <QuickBtn to="/instructor/announcements" icon={Send}           label="Announcement"    color="violet"  />
          <QuickBtn to="/instructor/gradebook"     icon={BarChart3}      label="Gradebook"       color="rose"    />
        </div>
      </div>

      {/* 3-col grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Chart + class cards */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <SecHead title="Class Completion Statistics" sub="Average curriculum progress across sections" linkTo="/instructor/reports" linkLabel="Full report" />
            {stats.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-xs text-slate-400">No class data yet.</div>
            ) : (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="sectionCode" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} unit="%" />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} formatter={(v) => [`${v}%`, 'Avg Progress']} />
                    <Bar dataKey="averageProgress" radius={[6, 6, 0, 0]}>
                      {stats.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {classes.length > 0 && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {classes.slice(0, 4).map((cls) => {
                  const s = stats.find((x) => x.classId === cls.id);
                  const p = s?.averageProgress ?? 0;
                  return (
                    <div key={cls.id} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white transition-colors">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs font-bold text-slate-900 truncate">{cls.sectionCode}</p>
                        <span className="text-[11px] font-mono font-bold text-blue-700">{p}%</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mb-2">{cls.courseOffering?.course?.title || cls.name}</p>
                      <ProgressBar value={p} color={p < 40 ? 'bg-rose-400' : p < 70 ? 'bg-amber-400' : 'bg-emerald-500'} />
                      <p className="text-[11px] text-slate-400 mt-1.5">{cls.memberships?.length ?? 0} students enrolled</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pending submissions */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <SecHead title="Pending Submissions & TA Flags" sub="Student work awaiting evaluation" linkTo="/instructor/submissions" linkLabel="Open queue" />
            {pending.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                <p className="text-xs font-medium text-slate-500">All caught up — no pending submissions.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {pending.map((sub) => (
                  <div key={sub.id} className={`p-3 rounded-lg border flex items-center justify-between gap-3 text-xs hover:bg-slate-50 ${sub.flaggedForInstructorReview ? 'bg-amber-50/60 border-amber-200' : 'bg-white border-slate-200'}`}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {sub.flaggedForInstructorReview && <Flag className="w-3 h-3 text-amber-500 shrink-0" />}
                        <p className="font-semibold text-slate-900 truncate">{sub.student?.firstName} {sub.student?.lastName}</p>
                      </div>
                      <p className="text-slate-500 truncate mt-0.5">{sub.assignment?.title}</p>
                      {sub.flaggedForInstructorReview && sub.flagReason && <p className="text-amber-700 font-medium mt-0.5 text-[11px]">TA: {sub.flagReason}</p>}
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1.5">
                      <StatusBadge status={sub.status} />
                      {sub.assignment?.dueDate && <span className="text-[10px] text-slate-400">Due {new Date(sub.assignment.dueDate).toLocaleDateString()}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right col */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <SecHead title="Assigned Courses" sub={`${courses.length} course${courses.length !== 1 ? 's' : ''}`} linkTo="/instructor/courses" linkLabel="Studio" />
            {courses.length === 0 ? <p className="text-xs text-slate-400 py-4 text-center">No courses assigned.</p> : (
              <div className="space-y-2">
                {courses.slice(0, 5).map((c) => (
                  <Link key={c.id} to="/instructor/courses" className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0"><BookOpen className="w-4 h-4 text-blue-600" /></div>
                    <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-slate-900 truncate">{c.title}</p><p className="text-[11px] text-slate-500 truncate">{c.code}</p></div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <SecHead title="Upcoming Assessments" sub="Scheduled quizzes & exams" linkTo="/instructor/assessments" linkLabel="Manage" />
            {assess.length === 0 ? <p className="text-xs text-slate-400 py-4 text-center">None scheduled.</p> : (
              <div className="space-y-2">
                {assess.slice(0, 5).map((a) => {
                  const od = a.closeDate && new Date(a.closeDate) < new Date();
                  return (
                    <div key={a.id} className={`p-2.5 rounded-lg border text-xs ${od ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                      <p className="font-semibold text-slate-900 truncate">{a.title}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className={`text-[11px] font-medium ${od ? 'text-rose-600' : 'text-slate-500'}`}>{a.closeDate ? `${od ? 'Closed' : 'Closes'} ${new Date(a.closeDate).toLocaleDateString()}` : 'No close date'}</span>
                        <StatusBadge status={a.status || 'draft'} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <SecHead title="Recent Discussions" sub="Latest class questions" linkTo="/instructor/discussions" linkLabel="View all" />
            {threads.length === 0 ? <p className="text-xs text-slate-400 py-4 text-center">No activity yet.</p> : (
              <div className="space-y-2">
                {threads.slice(0, 5).map((t) => (
                  <div key={t.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs hover:bg-white transition-colors">
                    <div className="flex items-start gap-2">
                      <MessageSquare className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${t.isResolved ? 'text-emerald-500' : 'text-blue-500'}`} />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 truncate">{t.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{t.author?.firstName} {t.author?.lastName} · {t.isResolved ? <span className="text-emerald-600 font-medium">Resolved</span> : <span className="text-amber-600 font-medium">Open</span>}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* At-risk learners */}
      {support.length > 0 && (
        <div className="bg-white rounded-xl border border-rose-200 p-5 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1"><AlertCircle className="w-4 h-4 text-rose-500" /><h2 className="text-sm font-bold text-slate-900">At-Risk Learner Indicators</h2></div>
              <p className="text-xs text-slate-500">Students below 50% completion — consider proactive check-ins.</p>
            </div>
            <Link to="/instructor/gradebook" className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline shrink-0">Gradebook <ArrowUpRight className="w-3 h-3" /></Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {support.map((st, i) => (
              <div key={i} className="p-3.5 rounded-lg bg-rose-50/60 border border-rose-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 truncate">{st.studentName}</span>
                  <span className={`font-mono font-bold text-sm ${st.progressPercentage < 25 ? 'text-rose-700' : 'text-amber-700'}`}>{st.progressPercentage}%</span>
                </div>
                <ProgressBar value={st.progressPercentage} color={st.progressPercentage < 25 ? 'bg-rose-400' : 'bg-amber-400'} />
                <p className="text-slate-500 truncate">{st.studentEmail}</p>
                <p className="text-[11px] text-slate-600">{st.indicatorNote}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress distribution */}
      {buckets.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <SecHead title="Student Progress Distribution" sub="Breakdown across all assigned classes" />
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="h-44 w-44 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={buckets} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                    {buckets.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-3">
              {buckets.map((b, i) => (
                <div key={i} className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <div><p className="text-xs font-semibold text-slate-900">{b.name}</p><p className="text-[11px] text-slate-500">{b.value} student{b.value !== 1 ? 's' : ''}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   2. COURSE STUDIO
══════════════════════════════════════════════════════════════ */
export function InstructorCourseStudioPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [selId, setSelId] = useState(null);
  const [modOpen, setModOpen] = useState(false);
  const [lesOpen, setLesOpen] = useState(false);
  const [resOpen, setResOpen] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [modForm, setModForm] = useState({ title: '', description: '', orderIndex: 1, estimatedMinutes: 60 });
  const [lesForm, setLesForm] = useState({ moduleId: 1, title: '', lessonType: 'laboratory', contentHtml: '<h2>Objectives</h2>', codeSnippet: '', estimatedMinutes: 45, publicationStatus: 'published' });
  const [resForm, setResForm] = useState({ title: '', description: '', resourceType: 'pdf', externalUrl: '' });

  const { data: cData } = useQuery({ queryKey: ['courses'], queryFn: () => lmsApi.listCourses() });
  const { data: dData, isLoading } = useQuery({ queryKey: ['course', selId], queryFn: () => lmsApi.getCourseById(selId), enabled: Boolean(selId) });

  const save = (fn, msg, close) => async (e) => {
    e.preventDefault();
    try { await fn(); addToast(msg); close(false); queryClient.invalidateQueries({ queryKey: ['course', selId] }); }
    catch (err) { addToast(extractErrorMessage(err), 'error'); }
  };

  const courses = cData?.data?.courses || [];
  const course  = dData?.data?.course;
  const toggle  = (id) => setExpanded((p) => ({ ...p, [id]: p[id] === false }));
  const emoji   = { laboratory: '🔬', video: '🎬', coding_exercise: '💻', reading: '📖' };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <Badge label="Course & Curriculum Studio" color="emerald" icon={BookOpen} />
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Courses & Content</h1>
          <p className="text-sm text-slate-500 mt-1">Author modules, lessons, and attach learning resources.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={() => setModOpen(true)} className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Module</button>
          <button type="button" onClick={() => setLesOpen(true)} className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Lesson</button>
          <button type="button" onClick={() => setResOpen(true)} className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Resource</button>
        </div>
      </div>

      {/* Course picker */}
      {courses.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {courses.map((c) => (
            <button key={c.id} type="button" onClick={() => setSelId(c.id)}
              className={`text-left p-4 rounded-xl border-2 transition-all ${selId === c.id ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0"><BookOpen className="w-4 h-4 text-blue-600" /></div>
                {selId === c.id && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />}
              </div>
              <p className="text-xs font-bold text-slate-900 mt-2 truncate">{c.title}</p>
              <p className="text-[11px] font-mono text-slate-500 mt-0.5">{c.code}</p>
              <div className="flex items-center gap-2 mt-2">
                <StatusBadge status={c.publicationStatus || 'draft'} />
                <span className="text-[11px] text-slate-400">{c.modules?.length ?? 0} modules</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {!selId ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-500">Select a course above to view its content.</p>
        </div>
      ) : isLoading || !course ? <LoadingState /> : (
        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">{course.title}</h2>
              {course.description && <p className="text-xs text-slate-500 mt-0.5">{course.description}</p>}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-center"><p className="text-lg font-bold text-blue-600">{course.modules?.length ?? 0}</p><p className="text-[11px] text-slate-500">Modules</p></div>
              <div className="w-px h-8 bg-slate-200" />
              <div className="text-center"><p className="text-lg font-bold text-emerald-600">{(course.modules || []).reduce((s, m) => s + (m.lessons?.length || 0), 0)}</p><p className="text-[11px] text-slate-500">Lessons</p></div>
              <div className="w-px h-8 bg-slate-200" /><StatusBadge status={course.publicationStatus || 'draft'} />
            </div>
          </div>

          {(course.modules || []).length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center"><p className="text-xs text-slate-400">No modules yet — click Module to get started.</p></div>
          ) : (course.modules || []).map((mod, mi) => {
            const open = expanded[mod.id] !== false;
            return (
              <div key={mod.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <button type="button" onClick={() => toggle(mod.id)}
                  className="w-full px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">{mi + 1}</span>
                    <div className="text-left min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 truncate">{mod.title}</h3>
                      {mod.description && <p className="text-[11px] text-slate-500 truncate">{mod.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[11px] text-slate-500 hidden sm:block">{mod.lessons?.length || 0} lessons · {mod.estimatedMinutes || 0} min</span>
                    <StatusBadge status={mod.publicationStatus || 'draft'} />
                    <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`} />
                  </div>
                </button>
                {open && (
                  <div className="divide-y divide-slate-100">
                    {(mod.lessons || []).length === 0 ? (
                      <p className="px-5 py-3 text-xs text-slate-400 italic">No lessons yet.</p>
                    ) : (mod.lessons || []).map((les, li) => (
                      <div key={les.id} className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-base shrink-0">{emoji[les.lessonType] || '📄'}</span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-900 truncate">{mi + 1}.{li + 1} {les.title}</p>
                            <p className="text-[11px] text-slate-500 capitalize mt-0.5">{les.lessonType?.replace(/_/g, ' ')} · {les.estimatedMinutes} min</p>
                          </div>
                        </div>
                        <StatusBadge status={les.publicationStatus || 'draft'} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ModalDialog isOpen={modOpen} onClose={() => setModOpen(false)} title="Create Module">
        <form onSubmit={save(() => lmsApi.createModule({ ...modForm, courseId: Number(selId) }), 'Module added.', setModOpen)} className="space-y-4 text-xs">
          <div><label className="block font-semibold mb-1.5">Title</label><input required value={modForm.title} onChange={(e) => setModForm({ ...modForm, title: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300" /></div>
          <div><label className="block font-semibold mb-1.5">Description</label><textarea rows={3} value={modForm.description} onChange={(e) => setModForm({ ...modForm, description: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block font-semibold mb-1.5">Order</label><input type="number" value={modForm.orderIndex} onChange={(e) => setModForm({ ...modForm, orderIndex: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-300" /></div>
            <div><label className="block font-semibold mb-1.5">Est. Minutes</label><input type="number" value={modForm.estimatedMinutes} onChange={(e) => setModForm({ ...modForm, estimatedMinutes: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-300" /></div>
          </div>
          <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg">Save Module</button>
        </form>
      </ModalDialog>

      <ModalDialog isOpen={lesOpen} onClose={() => setLesOpen(false)} title="Author Lesson" maxWidth="max-w-2xl">
        <form onSubmit={save(() => lmsApi.createLesson({ ...lesForm, courseId: Number(selId) }), 'Lesson published.', setLesOpen)} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block font-semibold mb-1.5">Module</label>
              <select value={lesForm.moduleId} onChange={(e) => setLesForm({ ...lesForm, moduleId: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
                {(course?.modules || []).map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select></div>
            <div><label className="block font-semibold mb-1.5">Type</label>
              <select value={lesForm.lessonType} onChange={(e) => setLesForm({ ...lesForm, lessonType: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
                <option value="reading">📖 Reading</option><option value="laboratory">🔬 Laboratory</option>
                <option value="coding_exercise">💻 Coding</option><option value="video">🎬 Video</option>
              </select></div>
          </div>
          <div><label className="block font-semibold mb-1.5">Title</label><input required value={lesForm.title} onChange={(e) => setLesForm({ ...lesForm, title: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300" /></div>
          <div><label className="block font-semibold mb-1.5">Content HTML</label><textarea rows={4} required value={lesForm.contentHtml} onChange={(e) => setLesForm({ ...lesForm, contentHtml: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-[11px]" /></div>
          <div><label className="block font-semibold mb-1.5">Code Snippet</label><textarea rows={3} value={lesForm.codeSnippet} onChange={(e) => setLesForm({ ...lesForm, codeSnippet: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono bg-slate-900 text-emerald-400 text-[11px]" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block font-semibold mb-1.5">Est. Minutes</label><input type="number" value={lesForm.estimatedMinutes} onChange={(e) => setLesForm({ ...lesForm, estimatedMinutes: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-300" /></div>
            <div><label className="block font-semibold mb-1.5">Status</label>
              <select value={lesForm.publicationStatus} onChange={(e) => setLesForm({ ...lesForm, publicationStatus: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
                <option value="published">Published</option><option value="draft">Draft</option>
              </select></div>
          </div>
          <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg">Publish Lesson</button>
        </form>
      </ModalDialog>

      <ModalDialog isOpen={resOpen} onClose={() => setResOpen(false)} title="Attach Resource">
        <form onSubmit={save(async () => { const fd = new FormData(); Object.entries({ courseId: String(selId), ...resForm }).forEach(([k, v]) => fd.append(k, v)); await lmsApi.createResource(fd); }, 'Resource attached.', setResOpen)} className="space-y-4 text-xs">
          <div><label className="block font-semibold mb-1.5">Title</label><input required value={resForm.title} onChange={(e) => setResForm({ ...resForm, title: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300" /></div>
          <div><label className="block font-semibold mb-1.5">Type</label>
            <select value={resForm.resourceType} onChange={(e) => setResForm({ ...resForm, resourceType: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
              <option value="pdf">PDF</option><option value="packet_tracer">Packet Tracer (.pkt)</option>
              <option value="worksheet">Worksheet</option><option value="code">Starter Code</option><option value="video">Video Link</option>
            </select></div>
          <div><label className="block font-semibold mb-1.5">URL</label><input value={resForm.externalUrl} onChange={(e) => setResForm({ ...resForm, externalUrl: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300" /></div>
          <div><label className="block font-semibold mb-1.5">Description</label><textarea rows={2} value={resForm.description} onChange={(e) => setResForm({ ...resForm, description: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300" /></div>
          <button type="submit" className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg">Attach Resource</button>
        </form>
      </ModalDialog>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   3. ASSIGNMENTS & LABS
══════════════════════════════════════════════════════════════ */
export function InstructorAssignmentsPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    classId: '', courseId: '', title: '', assignmentType: 'laboratory',
    instructions: '', dueDate: '', maxScore: 100, starterCode: '// Starter\n',
    rubricCriteria: [
      { criterionName: 'Functional Accuracy', maxPoints: 50 },
      { criterionName: 'Documentation & Security', maxPoints: 50 }
    ]
  });

  const { data: classesData } = useQuery({ queryKey: ['classes'], queryFn: lmsApi.listClasses });
  const { data: coursesData } = useQuery({ queryKey: ['courses'], queryFn: () => lmsApi.listCourses() });
  const { data, isLoading } = useQuery({ queryKey: ['assignments'], queryFn: () => lmsApi.listAssignments() });

  const handleCreate = async (e) => {
    e.preventDefault();
    try { await lmsApi.createAssignment({ ...form, classId: Number(form.classId), courseId: Number(form.courseId) }); addToast('Assignment published.'); setCreateOpen(false); queryClient.invalidateQueries({ queryKey: ['assignments'] }); }
    catch (err) { addToast(extractErrorMessage(err), 'error'); }
  };

  const allClasses = classesData?.data?.classes || [];
  const allCourses = coursesData?.data?.courses || [];
  const all = data?.data?.assignments || [];
  const typeBadge = { laboratory: 'bg-violet-50 text-violet-700 border-violet-200', programming: 'bg-blue-50 text-blue-700 border-blue-200', network_config: 'bg-emerald-50 text-emerald-700 border-emerald-200', project_milestone: 'bg-amber-50 text-amber-700 border-amber-200' };
  const filtered = all.filter((a) => (filter === 'all' || a.assignmentType === filter) && (!search || a.title.toLowerCase().includes(search.toLowerCase())));

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <Badge label="Assignments & Labs" color="indigo" icon={Terminal} />
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Assignments & Laboratories</h1>
          <p className="text-sm text-slate-500 mt-1">Configure deadlines, starter code, and grading rubrics.</p>
        </div>
        <button type="button" onClick={() => setCreateOpen(true)} className="self-start inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg">
          <Plus className="w-4 h-4" /> Create Assignment
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {[['all','All'], ['laboratory','Laboratory'], ['programming','Programming'], ['network_config','Network Config'], ['project_milestone','Project']].map(([v, l]) => (
            <Tab key={v} label={l} count={v === 'all' ? all.length : all.filter((a) => a.assignmentType === v).length} active={filter === v} onClick={() => setFilter(v)} />
          ))}
        </div>
        <div className="relative ml-auto w-full sm:w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
      </div>

      {isLoading ? <LoadingState /> : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-500">No assignments found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((a) => {
            const overdue = a.dueDate && new Date(a.dueDate) < new Date();
            return (
              <div key={a.id} className={`bg-white rounded-xl border p-5 shadow-sm hover:shadow transition-shadow ${overdue ? 'border-amber-200' : 'border-slate-200'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${typeBadge[a.assignmentType] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>{a.assignmentType?.replace(/_/g, ' ')}</span>
                    {overdue && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-amber-50 text-amber-700 border-amber-200">Past Due</span>}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500 shrink-0">
                    <span>Due: <strong className={overdue ? 'text-amber-700' : 'text-slate-700'}>{a.dueDate ? new Date(a.dueDate).toLocaleDateString() : '—'}</strong></span>
                    <span>Max: <strong>{a.maxScore}pts</strong></span>
                    <span className="text-blue-600 font-semibold">{a.submissions?.length || 0} submissions</span>
                  </div>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">{a.title}</h3>
                <p className="text-xs text-slate-600 line-clamp-2">{a.instructions}</p>
                {a.rubric && (
                  <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                    <p className="font-bold text-slate-800 mb-2">Rubric: {a.rubric.title}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {(a.rubric.criteria || []).map((c) => (
                        <div key={c.id} className="p-2 bg-white rounded border border-slate-200 flex items-center justify-between gap-2">
                          <span className="font-medium text-slate-700 truncate">{c.criterionName}</span>
                          <span className="text-blue-600 font-bold shrink-0">{c.maxPoints}pt</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ModalDialog isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Create Assignment / Lab" maxWidth="max-w-xl">
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block font-semibold mb-1.5">Class Section</label>
              <select required value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
                <option value="">— Select class —</option>
                {allClasses.map((c) => <option key={c.id} value={c.id}>{c.sectionCode}</option>)}
              </select></div>
            <div><label className="block font-semibold mb-1.5">Course</label>
              <select required value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
                <option value="">— Select course —</option>
                {allCourses.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}
              </select></div>
          </div>
          <div><label className="block font-semibold mb-1.5">Title</label><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block font-semibold mb-1.5">Type</label>
              <select value={form.assignmentType} onChange={(e) => setForm({ ...form, assignmentType: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
                <option value="laboratory">Laboratory</option><option value="programming">Programming</option>
                <option value="network_config">Network Config</option><option value="project_milestone">Project</option>
              </select></div>
            <div><label className="block font-semibold mb-1.5">Due Date</label><input type="date" required value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300" /></div>
          </div>
          <div><label className="block font-semibold mb-1.5">Max Score</label><input type="number" value={form.maxScore} onChange={(e) => setForm({ ...form, maxScore: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-300" /></div>
          <div><label className="block font-semibold mb-1.5">Instructions</label><textarea required rows={3} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300" /></div>
          <div><label className="block font-semibold mb-1.5">Starter Code</label><textarea rows={3} value={form.starterCode} onChange={(e) => setForm({ ...form, starterCode: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono" /></div>
          <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg">Publish Assignment</button>
        </form>
      </ModalDialog>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   4. SUBMISSION REVIEW
══════════════════════════════════════════════════════════════ */
export function InstructorSubmissionsPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [sel, setSel] = useState(null);
  const [score, setScore] = useState(90);
  const [feedback, setFeedback] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['submissions'], queryFn: () => lmsApi.listSubmissions() });

  const handleGrade = async (returnForRevision = false) => {
    if (!sel) return;
    try {
      const res = await lmsApi.reviewSubmission(sel.id, { score: Number(score), feedback, returnForRevision });
      addToast(res.message); setSel(null);
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err) { addToast(extractErrorMessage(err), 'error'); }
  };

  const all = data?.data?.submissions || [];
  const counts = {
    all: all.length,
    submitted: all.filter((s) => s.status === 'submitted').length,
    late: all.filter((s) => s.status === 'late').length,
    under_review: all.filter((s) => s.status === 'under_review').length,
    graded: all.filter((s) => s.status === 'graded').length,
    flagged: all.filter((s) => s.flaggedForInstructorReview).length,
  };
  const filtered = all.filter((s) => {
    const mf = filter === 'all' ? true : filter === 'flagged' ? s.flaggedForInstructorReview : s.status === filter;
    const ms = !search || `${s.student?.firstName} ${s.student?.lastName} ${s.assignment?.title}`.toLowerCase().includes(search.toLowerCase());
    return mf && ms;
  });

  return (
    <div className="space-y-6 pb-8">
      <div className="pb-5 border-b border-slate-200">
        <Badge label="Submission Evaluation" color="amber" icon={ClipboardCheck} />
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Submission Review</h1>
        <p className="text-sm text-slate-500 mt-1">Inspect student work, evaluate rubrics, and publish official grades.</p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Pending', v: counts.submitted + counts.under_review, cl: 'bg-amber-50 border-amber-200 text-amber-700' },
          { label: 'Late', v: counts.late, cl: 'bg-orange-50 border-orange-200 text-orange-700' },
          { label: 'TA Flagged', v: counts.flagged, cl: 'bg-rose-50 border-rose-200 text-rose-700' },
          { label: 'Graded', v: counts.graded, cl: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
        ].map((k) => (
          <div key={k.label} className={`p-4 rounded-xl border ${k.cl}`}>
            <p className="text-2xl font-bold">{k.v}</p>
            <p className="text-xs font-medium mt-0.5 text-slate-600">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex flex-wrap gap-2">
          <Tab label="All" count={counts.all} active={filter==='all'} onClick={() => setFilter('all')} />
          <Tab label="Pending" count={counts.submitted} active={filter==='submitted'} onClick={() => setFilter('submitted')} />
          <Tab label="Late" count={counts.late} active={filter==='late'} onClick={() => setFilter('late')} />
          <Tab label="Under Review" count={counts.under_review} active={filter==='under_review'} onClick={() => setFilter('under_review')} />
          <Tab label="TA Flagged" count={counts.flagged} active={filter==='flagged'} onClick={() => setFilter('flagged')} />
          <Tab label="Graded" count={counts.graded} active={filter==='graded'} onClick={() => setFilter('graded')} />
        </div>
        <div className="relative ml-auto w-full sm:w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
      </div>

      {isLoading ? <LoadingState /> : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] tracking-wide border-b border-slate-200">
                <tr>
                  {['Student','Assignment','Attempt','Status','Score','Due','Action'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No submissions match the filter.</td></tr>
                ) : filtered.map((s) => (
                  <tr key={s.id} className={`hover:bg-slate-50 transition-colors ${s.flaggedForInstructorReview ? 'bg-amber-50/30' : ''}`}>
                    <td className="px-4 py-3"><p className="font-bold text-slate-900">{s.student?.firstName} {s.student?.lastName}</p><p className="text-slate-400 font-mono">{s.student?.studentNumber}</p></td>
                    <td className="px-4 py-3 font-semibold text-slate-800 max-w-[160px] truncate">{s.assignment?.title}</td>
                    <td className="px-4 py-3 text-slate-500">#{s.attemptNumber}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <StatusBadge status={s.status} />
                        {s.flaggedForInstructorReview && <span className="flex items-center gap-1 text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded font-semibold"><Flag className="w-2.5 h-2.5" /> Flagged</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold">{s.score !== null ? `${s.score}/${s.assignment?.maxScore || 100}` : <span className="text-slate-400">—</span>}</td>
                    <td className="px-4 py-3 text-slate-500">{s.assignment?.dueDate ? new Date(s.assignment.dueDate).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => { setSel(s); setScore(s.score ?? 90); setFeedback(s.feedback || ''); }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-[11px] flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Evaluate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ModalDialog isOpen={Boolean(sel)} onClose={() => setSel(null)} title={`Evaluate — ${sel?.student?.firstName || ''} ${sel?.student?.lastName || ''}`} maxWidth="max-w-2xl">
        {sel && (
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <p className="font-bold text-slate-900">{sel.assignment?.title}</p>
              {sel.textResponse && <p className="text-slate-600 mt-1 leading-relaxed">{sel.textResponse}</p>}
            </div>
            {sel.codeSubmission && (
              <div>
                <p className="font-semibold text-slate-700 mb-1">Submitted Code:</p>
                <pre className="p-3 rounded-lg bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-48">{sel.codeSubmission}</pre>
              </div>
            )}
            {sel.flaggedForInstructorReview && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 flex gap-2">
                <Flag className="w-4 h-4 shrink-0 mt-0.5" /><div><strong>TA Flag:</strong> {sel.flagReason || 'Flagged for review'}</div>
              </div>
            )}
            {sel.preliminaryFeedback && (
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900"><strong>TA Note:</strong> {sel.preliminaryFeedback}</div>
            )}
            <div className="pt-2 border-t border-slate-200 space-y-3">
              <div>
                <label className="block font-semibold mb-1.5">Score (Max {sel.assignment?.maxScore || 100})</label>
                <input type="number" value={score} onChange={(e) => setScore(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-blue-700" />
                <div className="mt-2"><ProgressBar value={(score / (sel.assignment?.maxScore || 100)) * 100} color={score >= 75 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-400' : 'bg-rose-400'} /></div>
              </div>
              <div>
                <label className="block font-semibold mb-1.5">Instructor Feedback</label>
                <textarea rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Provide constructive feedback…" className="w-full px-3 py-2 rounded-lg border border-slate-300" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => handleGrade(true)} className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold rounded-lg">Return for Revision</button>
              <button type="button" onClick={() => handleGrade(false)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg">Publish Grade</button>
            </div>
          </div>
        )}
      </ModalDialog>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   5. ASSESSMENTS & QUESTION BANK
══════════════════════════════════════════════════════════════ */
export function InstructorAssessmentsPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [qOpen, setQOpen] = useState(false);
  const [tab, setTab] = useState('assessments');
  const [qForm, setQForm] = useState({
    questionBankId: '', courseId: '', topic: 'Network Security',
    questionType: 'multiple_choice', difficulty: 'Medium', prompt: '', points: 10,
    options: [{ optionText: 'Option A (Correct)', isCorrect: true }, { optionText: 'Option B', isCorrect: false }, { optionText: 'Option C', isCorrect: false }]
  });

  const { data: banksData, isLoading } = useQuery({ queryKey: ['question-banks'], queryFn: () => lmsApi.listQuestionBanks() });
  const { data: assessData } = useQuery({ queryKey: ['assessments'], queryFn: () => lmsApi.listAssessments() });
  const { data: coursesData } = useQuery({ queryKey: ['courses'], queryFn: () => lmsApi.listCourses() });

  const handleQ = async (e) => {
    e.preventDefault();
    try { await lmsApi.createQuestion({ ...qForm, questionBankId: Number(qForm.questionBankId), courseId: Number(qForm.courseId) }); addToast('Question added.'); setQOpen(false); queryClient.invalidateQueries({ queryKey: ['question-banks'] }); }
    catch (err) { addToast(extractErrorMessage(err), 'error'); }
  };

  const banks = banksData?.data?.questionBanks || [];
  const assessments = assessData?.data?.assessments || [];
  const allCourses = coursesData?.data?.courses || [];
  const diffCls = { Easy: 'bg-emerald-50 text-emerald-700 border-emerald-200', Medium: 'bg-amber-50 text-amber-700 border-amber-200', Hard: 'bg-rose-50 text-rose-700 border-rose-200' };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <Badge label="Assessment Engine" color="violet" icon={ClipboardCheck} />
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Quizzes & Question Bank</h1>
          <p className="text-sm text-slate-500 mt-1">Build reusable question banks and configure server-timed examinations.</p>
        </div>
        <button type="button" onClick={() => setQOpen(true)} className="self-start inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg">
          <Plus className="w-4 h-4" /> Add Question
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {[['assessments', `Assessments (${assessments.length})`], ['banks', `Question Banks (${banks.length})`]].map(([v, l]) => (
          <button key={v} type="button" onClick={() => setTab(v)}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors ${tab === v ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>{l}</button>
        ))}
      </div>

      {tab === 'assessments' && (
        assessments.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center"><p className="text-sm text-slate-400">No assessments yet.</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assessments.map((a) => {
              const overdue = a.closeDate && new Date(a.closeDate) < new Date();
              return (
                <div key={a.id} className={`bg-white rounded-xl border p-5 space-y-3 shadow-sm hover:shadow transition-shadow ${overdue ? 'border-rose-200' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <StatusBadge status={a.assessmentType} />
                    <span className="text-xs text-slate-500">{a.timeLimitMinutes} min · {a.maxScore} pts</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{a.title}</h3>
                  {a.instructions && <p className="text-xs text-slate-600 line-clamp-2">{a.instructions}</p>}
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                    <span>{a.assessmentQuestions?.length || 0} questions</span>
                    <span>{a.attempts?.length || 0} attempts</span>
                    {a.closeDate && <span className={overdue ? 'text-rose-600 font-semibold' : ''}>{overdue ? 'Closed' : 'Closes'} {new Date(a.closeDate).toLocaleDateString()}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {tab === 'banks' && (
        isLoading ? <LoadingState /> : banks.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center"><p className="text-sm text-slate-400">No question banks yet.</p></div>
        ) : (
          <div className="space-y-4">
            {banks.map((bank) => (
              <div key={bank.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div><h2 className="text-sm font-bold text-slate-900">{bank.title}</h2><p className="text-xs text-slate-500">Topic: {bank.topic}</p></div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-blue-700">{bank.questions?.length || 0} questions</span>
                  </div>
                </div>
                <div className="divide-y divide-slate-100">
                  {(bank.questions || []).length === 0 ? (
                    <p className="px-5 py-3 text-xs text-slate-400 italic">No questions yet.</p>
                  ) : (bank.questions || []).map((q) => (
                    <div key={q.id} className="px-5 py-3 text-xs flex items-start justify-between gap-3 hover:bg-slate-50">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-bold text-blue-700 uppercase text-[11px]">{q.questionType?.replace(/_/g, ' ')}</span>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${diffCls[q.difficulty] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>{q.difficulty}</span>
                        </div>
                        <p className="font-semibold text-slate-900 truncate">{q.prompt}</p>
                      </div>
                      <span className="font-bold text-slate-600 shrink-0">{q.points}pt</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      <ModalDialog isOpen={qOpen} onClose={() => setQOpen(false)} title="Add Question to Bank">
        <form onSubmit={handleQ} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block font-semibold mb-1.5">Question Bank</label>
              <select required value={qForm.questionBankId} onChange={(e) => setQForm({ ...qForm, questionBankId: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
                <option value="">— Select bank —</option>
                {banks.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
              </select></div>
            <div><label className="block font-semibold mb-1.5">Course</label>
              <select required value={qForm.courseId} onChange={(e) => setQForm({ ...qForm, courseId: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
                <option value="">— Select course —</option>
                {allCourses.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}
              </select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block font-semibold mb-1.5">Type</label>
              <select value={qForm.questionType} onChange={(e) => setQForm({ ...qForm, questionType: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
                <option value="multiple_choice">Multiple Choice</option><option value="true_false">True / False</option>
                <option value="matching">Matching</option><option value="multiple_select">Multiple Select</option>
              </select></div>
            <div><label className="block font-semibold mb-1.5">Difficulty</label>
              <select value={qForm.difficulty} onChange={(e) => setQForm({ ...qForm, difficulty: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
                <option value="Easy">Easy</option><option value="Medium">Medium</option><option value="Hard">Hard</option>
              </select></div>
          </div>
          <div><label className="block font-semibold mb-1.5">Points</label><input type="number" value={qForm.points} onChange={(e) => setQForm({ ...qForm, points: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-300" /></div>
          <div><label className="block font-semibold mb-1.5">Question Prompt</label><textarea required rows={3} value={qForm.prompt} onChange={(e) => setQForm({ ...qForm, prompt: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300" /></div>
          <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg">Save Question</button>
        </form>
      </ModalDialog>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   6. GRADEBOOK
══════════════════════════════════════════════════════════════ */
export function InstructorGradebookPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [selClass, setSelClass] = useState(1);
  const [manOpen, setManOpen] = useState(false);
  const [manForm, setManForm] = useState({ gradeCategoryId: 3, studentId: 6, itemTitle: '', score: 90, maxScore: 100, reason: '' });

  const { data: clsData } = useQuery({ queryKey: ['classes'], queryFn: lmsApi.listClasses });
  const { data: gbData, isLoading } = useQuery({ queryKey: ['gradebook', selClass], queryFn: () => lmsApi.getClassGradebook(selClass), enabled: Boolean(selClass) });

  const handleManual = async (e) => {
    e.preventDefault();
    try { await lmsApi.recordManualGrade(selClass, manForm); addToast('Grade recorded.'); setManOpen(false); queryClient.invalidateQueries({ queryKey: ['gradebook', selClass] }); }
    catch (err) { addToast(extractErrorMessage(err), 'error'); }
  };
  const handleSubmitFinal = async () => {
    try { const r = await lmsApi.submitFinalGrades(selClass); addToast(r.message); queryClient.invalidateQueries({ queryKey: ['gradebook', selClass] }); }
    catch (err) { addToast(extractErrorMessage(err), 'error'); }
  };

  const classes = clsData?.data?.classes || [];
  const gb = gbData?.data || {};

  const gradeColor = (pct) => pct >= 75 ? 'text-emerald-700' : pct >= 50 ? 'text-amber-700' : 'text-rose-700';

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <Badge label="Weighted Gradebook" color="rose" icon={Award} />
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Class Gradebook</h1>
          <p className="text-sm text-slate-500 mt-1">Weighted grade calculations with auditable revision history.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <a href={`/api/reports?type=gradebook&classId=${selClass}&format=csv`} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg">
            <FileDown className="w-4 h-4" /> CSV
          </a>
          <button type="button" onClick={() => setManOpen(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg">
            <Plus className="w-4 h-4" /> Enter / Revise Grade
          </button>
          <button type="button" onClick={handleSubmitFinal} className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg">
            <Send className="w-4 h-4" /> Submit Final Grades
          </button>
        </div>
      </div>

      {/* Class selector + approval status */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          {classes.map((c) => (
            <button key={c.id} type="button" onClick={() => setSelClass(c.id)}
              className={`px-4 py-2 rounded-lg text-xs font-bold border transition-colors ${selClass === c.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>
              {c.sectionCode}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Status:</span><StatusBadge status={gb.finalGradesStatus || 'in_progress'} />
        </div>
      </div>

      {/* Category weights */}
      {(gb.categories || []).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(gb.categories || []).map((cat) => (
            <div key={cat.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-[11px] font-semibold uppercase text-slate-500">{cat.categoryType}</p>
              <p className="text-xs font-bold text-slate-900 mt-0.5">{cat.name}</p>
              <p className="text-xl font-extrabold text-blue-600 mt-1">{cat.weightPercent}%</p>
              <ProgressBar value={cat.weightPercent} color="bg-blue-500" height="h-1.5" />
            </div>
          ))}
        </div>
      )}

      {/* Grade table */}
      {isLoading ? <LoadingState /> : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] tracking-wide border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  {(gb.categories || []).map((cat) => <th key={cat.id} className="px-4 py-3">{cat.name} ({cat.weightPercent}%)</th>)}
                  <th className="px-4 py-3">Standing</th>
                  <th className="px-4 py-3">Grade</th>
                  <th className="px-4 py-3">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(gb.students || []).length === 0 ? (
                  <tr><td colSpan={5 + (gb.categories || []).length} className="px-4 py-10 text-center text-slate-400">No student records.</td></tr>
                ) : (gb.students || []).map((st) => (
                  <tr key={st.studentId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3"><p className="font-bold text-slate-900">{st.studentName}</p><p className="font-mono text-slate-400">{st.studentNumber}</p></td>
                    {(gb.categories || []).map((cat) => {
                      const b = st.categoryBreakdown?.[cat.id];
                      return <td key={cat.id} className="px-4 py-3 font-mono">{b?.percentage != null ? `${b.percentage}%` : '—'}</td>;
                    })}
                    <td className={`px-4 py-3 font-mono font-bold text-sm ${gradeColor(st.standingPercentage)}`}>{st.standingPercentage != null ? `${st.standingPercentage}%` : '—'}</td>
                    <td className="px-4 py-3 font-bold">{st.institutionalGrade ? `${st.institutionalGrade} (${st.letterGrade})` : '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={st.isPassing ? 'active' : 'warning'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit history */}
      {(gb.history || []).length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-3"><History className="w-4 h-4 text-blue-600" /><h3 className="text-sm font-bold text-slate-900">Grade Revision Audit Trail</h3></div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {(gb.history || []).map((h) => (
              <div key={h.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center justify-between gap-3">
                <div><p className="font-bold text-slate-900">Student #{h.studentId}: {h.previousScore ?? 'None'} → {h.newScore}</p><p className="text-slate-500 mt-0.5">{h.reason}</p></div>
                <span className="text-slate-400 shrink-0">{new Date(h.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <ModalDialog isOpen={manOpen} onClose={() => setManOpen(false)} title="Record / Revise Grade">
        <form onSubmit={handleManual} className="space-y-4 text-xs">
          <div><label className="block font-semibold mb-1.5">Student</label>
            <select value={manForm.studentId} onChange={(e) => setManForm({ ...manForm, studentId: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
              {(gb.students || []).map((s) => <option key={s.studentId} value={s.studentId}>{s.studentName}</option>)}
            </select></div>
          <div><label className="block font-semibold mb-1.5">Category</label>
            <select value={manForm.gradeCategoryId} onChange={(e) => setManForm({ ...manForm, gradeCategoryId: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
              {(gb.categories || []).map((c) => <option key={c.id} value={c.id}>{c.name} ({c.weightPercent}%)</option>)}
            </select></div>
          <div><label className="block font-semibold mb-1.5">Activity Title</label><input required value={manForm.itemTitle} onChange={(e) => setManForm({ ...manForm, itemTitle: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block font-semibold mb-1.5">Score</label><input type="number" required value={manForm.score} onChange={(e) => setManForm({ ...manForm, score: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300" /></div>
            <div><label className="block font-semibold mb-1.5">Max Score</label><input type="number" required value={manForm.maxScore} onChange={(e) => setManForm({ ...manForm, maxScore: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300" /></div>
          </div>
          <div><label className="block font-semibold mb-1.5">Audit Reason</label><input required value={manForm.reason} onChange={(e) => setManForm({ ...manForm, reason: e.target.value })} placeholder="Reason for this entry or revision…" className="w-full px-3 py-2 rounded-lg border border-slate-300" /></div>
          <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg">Save & Log</button>
        </form>
      </ModalDialog>
    </div>
  );
}
