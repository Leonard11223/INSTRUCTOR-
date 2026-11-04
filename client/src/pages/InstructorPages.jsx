import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell
} from 'recharts';
import {
  BookOpen, ClipboardCheck, Clock, AlertCircle, Plus, Terminal,
  Award, Send, FileDown, History, MessageSquare, ChevronRight,
  CheckCircle2, FileText, BarChart3, GraduationCap, ArrowUpRight,
  Flag, RefreshCw, Search, Pencil, Trash2, Users, Eye, Calendar
} from 'lucide-react';
import { lmsApi, extractErrorMessage, apiClient } from '../services/api';
import {
  StatusBadge, LoadingState, ErrorState, ModalDialog, useToast, PageHeader, StatCard
} from '../components/ui/SharedComponents';

/* ─── helpers ──────────────────────────────────────────────── */
function ProgressBar({ value = 0, color = 'bg-blue-500', height = 'h-2' }) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <div className={`w-full bg-slate-100 rounded-full ${height} overflow-hidden`}>
      <div className={`${color} ${height} rounded-full transition-all`} style={{ width: `${v}%` }} />
    </div>
  );
}
function Badge({ label, color = 'blue', icon: Icon }) {
  const m = { blue:'text-blue-700 bg-blue-50 border-blue-200', emerald:'text-emerald-700 bg-emerald-50 border-emerald-200', amber:'text-amber-700 bg-amber-50 border-amber-200', indigo:'text-indigo-700 bg-indigo-50 border-indigo-200', violet:'text-violet-700 bg-violet-50 border-violet-200', rose:'text-rose-700 bg-rose-50 border-rose-200' };
  return <span className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider border px-2.5 py-0.5 rounded-md mb-2 ${m[color]||m.blue}`}>{Icon&&<Icon className="w-3.5 h-3.5"/>}{label}</span>;
}
function SecHead({ title, sub, linkTo, linkLabel }) {
  return (
    <div className="flex items-start justify-between mb-3">
      <div><h2 className="text-sm font-bold text-slate-900">{title}</h2>{sub&&<p className="text-xs text-slate-500 mt-0.5">{sub}</p>}</div>
      {linkTo&&<Link to={linkTo} className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline shrink-0">{linkLabel||'View all'}<ArrowUpRight className="w-3 h-3"/></Link>}
    </div>
  );
}
function QuickBtn({ to, icon: Icon, label, color }) {
  const m = { blue:'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100', amber:'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100', emerald:'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100', indigo:'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100', rose:'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100', violet:'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100' };
  return <Link to={to} className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-xs font-semibold transition-colors ${m[color]||m.blue}`}><Icon className="w-5 h-5"/><span className="text-center leading-tight">{label}</span></Link>;
}
function Tab({ label, count, active, onClick }) {
  return <button type="button" onClick={onClick} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${active?'bg-blue-600 text-white border-blue-600':'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{label}{count!==undefined&&<span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${active?'bg-blue-500':'bg-slate-100 text-slate-500'}`}>{count}</span>}</button>;
}
function ConfirmModal({ isOpen, onClose, onConfirm, title, message }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-sm p-6">
        <h2 className="text-base font-bold text-slate-900 mb-2">{title}</h2>
        <p className="text-xs text-slate-600 mb-5">{message}</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={onConfirm} className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white">Delete</button>
        </div>
      </div>
    </div>
  );
}
const CHART_COLORS = ['#2563eb','#7c3aed','#059669','#d97706','#dc2626'];

/* ══════════════════════════════════════════════════════════════
   1. DASHBOARD
══════════════════════════════════════════════════════════════ */
export function InstructorDashboardPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard','instructor'],
    queryFn: lmsApi.getDashboardSummary,
    refetchInterval: 60_000
  });
  if (isLoading) return <LoadingState label="Loading instructor workspace…"/>;
  if (error) return <ErrorState message={extractErrorMessage(error)} onRetry={refetch}/>;
  const d = data?.data||{};
  const m = d.metrics||{};
  const classes=d.activeClasses||[], stats=d.classCompletionStats||[];
  const pending=d.pendingSubmissions||[], support=d.studentsNeedingSupport||[];
  const assess=d.upcomingAssessments||[], threads=d.recentQuestions||[];
  const courses=d.assignedCourses||[];
  const flagged=pending.filter(s=>s.flaggedForInstructorReview);
  const highPass=stats.filter(c=>c.averageProgress>75).length;
  const midPass=Math.max(0,stats.filter(c=>c.averageProgress>50).length-highPass);
  const buckets=[
    {name:'0–25%', value:support.filter(s=>s.progressPercentage<=25).length},
    {name:'26–50%',value:support.filter(s=>s.progressPercentage>25&&s.progressPercentage<=50).length},
    {name:'51–75%',value:midPass},
    {name:'76–100%',value:highPass},
  ].filter(b=>b.value>0);
  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200">
        <div><Badge label="Faculty Teaching Workspace" icon={GraduationCap}/><h1 className="text-2xl font-bold text-slate-900 tracking-tight">Instructor Dashboard</h1><p className="text-sm text-slate-500 mt-1">Overview of classes, student progress, and pending tasks.</p></div>
        <button type="button" onClick={()=>refetch()} className="self-start sm:self-auto flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"><RefreshCw className="w-3.5 h-3.5"/> Refresh</button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {label:'Courses / Classes',value:`${m.assignedCoursesCount??0} / ${m.activeClassesCount??0}`,sub:`${m.enrolledStudentsCount??0} learners`,icon:BookOpen,accent:'bg-blue-50 text-blue-600 border-blue-100',bar:'bg-blue-500',bval:m.activeClassesCount?Math.min(100,(m.activeClassesCount/10)*100):0},
          {label:'Pending Review',value:m.pendingSubmissionsCount??0,sub:flagged.length>0?`${flagged.length} TA-flagged`:`${m.pendingGradingTasksCount??0} tasks`,icon:ClipboardCheck,accent:m.pendingSubmissionsCount>0?'bg-amber-50 text-amber-600 border-amber-100':'bg-slate-50 text-slate-400 border-slate-100',bar:'bg-amber-400',bval:m.pendingGradingTasksCount?Math.min(100,(m.pendingSubmissionsCount/m.pendingGradingTasksCount)*100):0},
          {label:'Assessments',value:m.upcomingAssessmentsCount??0,sub:m.overdueActivitiesCount>0?`${m.overdueActivitiesCount} overdue`:'None overdue',icon:Clock,accent:'bg-indigo-50 text-indigo-600 border-indigo-100',bar:'bg-indigo-500',bval:m.upcomingAssessmentsCount?70:0},
          {label:'At-Risk Learners',value:support.length,sub:'Below 50%',icon:AlertCircle,accent:support.length>0?'bg-rose-50 text-rose-600 border-rose-100':'bg-slate-50 text-slate-400 border-slate-100',bar:'bg-rose-400',bval:m.enrolledStudentsCount?(support.length/m.enrolledStudentsCount)*100:0},
        ].map(card=>(
          <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow transition-shadow">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{card.label}</p><p className="text-2xl font-bold text-slate-900 mt-1.5">{card.value}</p><p className="text-xs text-slate-500 mt-1">{card.sub}</p></div>
              <div className={`p-2.5 rounded-lg border ${card.accent}`}><card.icon className="w-5 h-5"/></div>
            </div>
            <ProgressBar value={card.bval} color={card.bar} height="h-1.5"/>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <SecHead title="Quick Actions" sub="Jump to common tasks"/>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          <QuickBtn to="/instructor/assignments" icon={FileText} label="New Assignment" color="blue"/>
          <QuickBtn to="/instructor/assessments" icon={ClipboardCheck} label="New Quiz" color="indigo"/>
          <QuickBtn to="/instructor/submissions" icon={Award} label="Grade Work" color="amber"/>
          <QuickBtn to="/instructor/courses" icon={BookOpen} label="Author Content" color="emerald"/>
          <QuickBtn to="/instructor/announcements" icon={Send} label="Announcement" color="violet"/>
          <QuickBtn to="/instructor/gradebook" icon={BarChart3} label="Gradebook" color="rose"/>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <SecHead title="Class Completion Statistics" sub="Average curriculum progress (%)" linkTo="/instructor/reports" linkLabel="Full report"/>
            {stats.length===0?<div className="h-48 flex items-center justify-center text-xs text-slate-400">No class data yet.</div>:(
              <div className="h-52"><ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                  <XAxis dataKey="sectionCode" tick={{fontSize:11,fill:'#64748b'}} axisLine={false} tickLine={false}/>
                  <YAxis domain={[0,100]} tick={{fontSize:11,fill:'#64748b'}} axisLine={false} tickLine={false} unit="%"/>
                  <Tooltip contentStyle={{fontSize:12,borderRadius:8,border:'1px solid #e2e8f0'}} formatter={v=>[`${v}%`,'Avg Progress']}/>
                  <Bar dataKey="averageProgress" radius={[6,6,0,0]}>{stats.map((_,i)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}</Bar>
                </BarChart>
              </ResponsiveContainer></div>
            )}
            {classes.length>0&&<div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">{classes.slice(0,4).map(cls=>{const s=stats.find(x=>x.classId===cls.id);const p=s?.averageProgress??0;return(<div key={cls.id} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white transition-colors"><div className="flex items-center justify-between mb-1.5"><p className="text-xs font-bold text-slate-900 truncate">{cls.sectionCode}</p><span className="text-[11px] font-mono font-bold text-blue-700">{p}%</span></div><p className="text-[11px] text-slate-500 truncate mb-2">{cls.courseOffering?.course?.title||cls.name}</p><ProgressBar value={p} color={p<40?'bg-rose-400':p<70?'bg-amber-400':'bg-emerald-500'}/><p className="text-[11px] text-slate-400 mt-1.5">{cls.memberships?.length??0} students</p></div>);})}</div>}
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <SecHead title="Pending Submissions" sub="Awaiting evaluation" linkTo="/instructor/submissions" linkLabel="Open queue"/>
            {pending.length===0?(<div className="flex flex-col items-center justify-center py-10 gap-2"><CheckCircle2 className="w-8 h-8 text-emerald-400"/><p className="text-xs font-medium text-slate-500">All caught up.</p></div>):(
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">{pending.map(sub=>(
                <div key={sub.id} className={`p-3 rounded-lg border flex items-center justify-between gap-3 text-xs hover:bg-slate-50 ${sub.flaggedForInstructorReview?'bg-amber-50/60 border-amber-200':'bg-white border-slate-200'}`}>
                  <div className="min-w-0 flex-1"><div className="flex items-center gap-1.5">{sub.flaggedForInstructorReview&&<Flag className="w-3 h-3 text-amber-500 shrink-0"/>}<p className="font-semibold text-slate-900 truncate">{sub.student?.firstName} {sub.student?.lastName}</p></div><p className="text-slate-500 truncate mt-0.5">{sub.assignment?.title}</p>{sub.flaggedForInstructorReview&&sub.flagReason&&<p className="text-amber-700 font-medium mt-0.5 text-[11px]">TA: {sub.flagReason}</p>}</div>
                  <div className="shrink-0 flex flex-col items-end gap-1.5"><StatusBadge status={sub.status}/>{sub.assignment?.dueDate&&<span className="text-[10px] text-slate-400">Due {new Date(sub.assignment.dueDate).toLocaleDateString()}</span>}</div>
                </div>
              ))}</div>
            )}
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <SecHead title="Assigned Courses" sub={`${courses.length} course${courses.length!==1?'s':''}`} linkTo="/instructor/courses" linkLabel="Studio"/>
            {courses.length===0?<p className="text-xs text-slate-400 py-4 text-center">No courses.</p>:<div className="space-y-2">{courses.slice(0,5).map(c=>(
              <Link key={c.id} to="/instructor/courses" className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0"><BookOpen className="w-4 h-4 text-blue-600"/></div>
                <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-slate-900 truncate">{c.title}</p><p className="text-[11px] text-slate-500 truncate">{c.code}</p></div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0"/>
              </Link>
            ))}</div>}
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <SecHead title="Upcoming Assessments" sub="Quizzes & exams" linkTo="/instructor/assessments" linkLabel="Manage"/>
            {assess.length===0?<p className="text-xs text-slate-400 py-4 text-center">None scheduled.</p>:<div className="space-y-2">{assess.slice(0,5).map(a=>{const od=a.closeDate&&new Date(a.closeDate)<new Date();return(<div key={a.id} className={`p-2.5 rounded-lg border text-xs ${od?'bg-rose-50 border-rose-200':'bg-slate-50 border-slate-200'}`}><p className="font-semibold text-slate-900 truncate">{a.title}</p><div className="flex items-center justify-between mt-1"><span className={`text-[11px] font-medium ${od?'text-rose-600':'text-slate-500'}`}>{a.closeDate?`${od?'Closed':'Closes'} ${new Date(a.closeDate).toLocaleDateString()}`:'No close date'}</span><StatusBadge status={a.status||'draft'}/></div></div>);})}</div>}
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <SecHead title="Recent Discussions" sub="Latest questions" linkTo="/instructor/discussions" linkLabel="View all"/>
            {threads.length===0?<p className="text-xs text-slate-400 py-4 text-center">No activity.</p>:<div className="space-y-2">{threads.slice(0,5).map(t=>(
              <div key={t.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs hover:bg-white transition-colors">
                <div className="flex items-start gap-2"><MessageSquare className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${t.isResolved?'text-emerald-500':'text-blue-500'}`}/><div className="min-w-0 flex-1"><p className="font-semibold text-slate-900 truncate">{t.title}</p><p className="text-[11px] text-slate-500 mt-0.5">{t.author?.firstName} {t.author?.lastName} · {t.isResolved?<span className="text-emerald-600 font-medium">Resolved</span>:<span className="text-amber-600 font-medium">Open</span>}</p></div></div>
              </div>
            ))}</div>}
          </div>
        </div>
      </div>
      {support.length>0&&(
        <div className="bg-white rounded-xl border border-rose-200 p-5 shadow-sm">
          <div className="flex items-start justify-between mb-4"><div><div className="flex items-center gap-2 mb-1"><AlertCircle className="w-4 h-4 text-rose-500"/><h2 className="text-sm font-bold text-slate-900">At-Risk Learner Indicators</h2></div><p className="text-xs text-slate-500">Below 50% completion — consider proactive check-ins.</p></div><Link to="/instructor/gradebook" className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline shrink-0">Gradebook <ArrowUpRight className="w-3 h-3"/></Link></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">{support.map((st,i)=>(<div key={i} className="p-3.5 rounded-lg bg-rose-50/60 border border-rose-200 text-xs space-y-2"><div className="flex items-center justify-between"><span className="font-bold text-slate-900 truncate">{st.studentName}</span><span className={`font-mono font-bold text-sm ${st.progressPercentage<25?'text-rose-700':'text-amber-700'}`}>{st.progressPercentage}%</span></div><ProgressBar value={st.progressPercentage} color={st.progressPercentage<25?'bg-rose-400':'bg-amber-400'}/><p className="text-slate-500 truncate">{st.studentEmail}</p><p className="text-[11px] text-slate-600">{st.indicatorNote}</p></div>))}</div>
        </div>
      )}
      {buckets.length>0&&(
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <SecHead title="Student Progress Distribution" sub="Breakdown across all classes"/>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="h-44 w-44 shrink-0"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={buckets} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">{buckets.map((_,i)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}</Pie><Tooltip contentStyle={{fontSize:12,borderRadius:8}}/></PieChart></ResponsiveContainer></div>
            <div className="flex-1 grid grid-cols-2 gap-3">{buckets.map((b,i)=>(<div key={i} className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200"><div className="w-3 h-3 rounded-full shrink-0" style={{backgroundColor:CHART_COLORS[i%CHART_COLORS.length]}}/><div><p className="text-xs font-semibold text-slate-900">{b.name}</p><p className="text-[11px] text-slate-500">{b.value} student{b.value!==1?'s':''}</p></div></div>))}</div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   2. COURSE STUDIO — with edit/delete module & lesson
══════════════════════════════════════════════════════════════ */

export function InstructorCourseStudioPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [selId, setSelId] = useState(null);
  const [studioTab, setStudioTab] = useState('content');
  const [modOpen, setModOpen] = useState(false);
  const [lesOpen, setLesOpen] = useState(false);
  const [courseOpen, setCourseOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [editMod, setEditMod] = useState(null);
  const [editLes, setEditLes] = useState(null);
  const [previewLes, setPreviewLes] = useState(null);
  const [delMod, setDelMod] = useState(null);
  const [delLes, setDelLes] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [modForm, setModForm] = useState({ title:'', description:'', orderIndex:1, estimatedMinutes:60 });
  const [lesForm, setLesForm] = useState({ moduleId:'', title:'', lessonType:'laboratory', contentHtml:'<h2>Objectives</h2>', codeSnippet:'', estimatedMinutes:45, publicationStatus:'published' });
  const [lesFile, setLesFile] = useState(null);
  const [courseForm, setCourseForm] = useState({ title:'', code:'', description:'', category:'networking', creditUnits:3, deliveryMode:'Instructor-Led', level:'Intermediate', departmentId:'' });
  const [newCourseResult, setNewCourseResult] = useState(null); // holds { course, joinCode } after creation
  const [pendingClassId, setPendingClassId] = useState(null);
  const [aiFile, setAiFile] = useState(null);
  const [aiTopic, setAiTopic] = useState('');
  const [aiCount, setAiCount] = useState(10);
  const [aiResults, setAiResults] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [joinCodeData, setJoinCodeData] = useState(null);
  const [joinCodeLoading, setJoinCodeLoading] = useState(false);

  const { data: cData } = useQuery({ queryKey:['courses'], queryFn:()=>lmsApi.listCourses() });
  const { data: dData, isLoading } = useQuery({ queryKey:['course',selId], queryFn:()=>lmsApi.getCourseById(selId), enabled:Boolean(selId) });
  const { data: banksData } = useQuery({ queryKey:['question-banks'], queryFn:()=>lmsApi.listQuestionBanks() });
  const { data: deptsData } = useQuery({ queryKey:['departments'], queryFn:()=>lmsApi.listDepartments() });
  const refresh = () => queryClient.invalidateQueries({ queryKey:['course',selId] });

  // Pending enrollments for the current class
  const { data: pendingData, refetch: refetchPending } = useQuery({
    queryKey: ['pending-enrollments', pendingClassId],
    queryFn: () => lmsApi.getPendingEnrollments(pendingClassId),
    enabled: Boolean(pendingClassId)
  });
  const pendingEnrollments = pendingData?.data?.pending || [];

  const handleApprove = async (membershipId, studentName) => {
    try {
      await lmsApi.approveEnrollment(membershipId);
      addToast(studentName + ' approved!');
      refetchPending();
      queryClient.invalidateQueries({ queryKey: ['course', selId] });
    } catch (err) { addToast(extractErrorMessage(err), 'error'); }
  };

  const handleReject = async (membershipId, studentName) => {
    try {
      await lmsApi.rejectEnrollment(membershipId, { reason: 'Enrollment request declined by instructor.' });
      addToast(studentName + '\'s request rejected.');
      refetchPending();
    } catch (err) { addToast(extractErrorMessage(err), 'error'); }
  };

  const loadJoinCode = async (classId) => {
    if (!classId) return;
    setJoinCodeLoading(true);
    try {
      const res = await lmsApi.getJoinCodeInfo(classId);
      setJoinCodeData(res.data);
    } catch (_) {
      // ignore
    }
    setJoinCodeLoading(false);
  };

  const handleGenerateJoinCode = async (classId, regenerate) => {
    try {
      const res = await lmsApi.generateJoinCode(classId, { enable: true, regenerate: !!regenerate });
      setJoinCodeData(res.data);
      addToast('Join code generated!');
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  const handleDisableJoinCode = async (classId) => {
    try {
      const res = await lmsApi.generateJoinCode(classId, { enable: false });
      setJoinCodeData(res.data);
      addToast('Join code disabled.');
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  const handleAiGenerate = async (e) => {
    e.preventDefault();
    if (!aiFile) { addToast('Please select a file.', 'error'); return; }
    setAiLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', aiFile);
      fd.append('count', String(aiCount));
      fd.append('topic', aiTopic);
      const res = await lmsApi.generateQuestionsFromFile(fd);
      setAiResults(res.data.questions);
      addToast(res.data.questions.length + ' questions generated (' + res.data.method + ').');
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
    setAiLoading(false);
  };

  const handleSaveAiQuestions = async (bankId, courseId) => {
    if (!bankId || !courseId) { addToast('Select a question bank and course first.', 'error'); return; }
    setAiSaving(true);
    let saved = 0;
    for (const q of aiResults) {
      try {
        await lmsApi.createQuestion({ ...q, questionBankId: Number(bankId), courseId: Number(courseId) });
        saved++;
      } catch (_) {
        // skip
      }
    }
    addToast(saved + ' questions saved to question bank.');
    setAiSaving(false);
    setAiOpen(false);
    setAiResults([]);
    setAiFile(null);
    queryClient.invalidateQueries({ queryKey: ['question-banks'] });
  };

  const handleSaveMod = async (e) => {
    e.preventDefault();
    try {
      if (editMod) {
        await lmsApi.updateModule(editMod.id, modForm);
        addToast('Module updated.');
        setEditMod(null);
      } else {
        await lmsApi.createModule({ ...modForm, courseId: Number(selId) });
        addToast('Module added.');
        setModOpen(false);
      }
      refresh();
    } catch (err) { addToast(extractErrorMessage(err), 'error'); }
  };

  const handleSaveLes = async (e) => {
    e.preventDefault();
    try {
      if (editLes) {
        await lmsApi.updateLesson(editLes.id, lesForm);
        if (lesFile) {
          const fd = new FormData();
          fd.append('file', lesFile);
          fd.append('title', lesFile.name);
          await lmsApi.attachFileToLesson(editLes.id, fd);
          setLesFile(null);
        }
        addToast('Lesson updated.');
        setEditLes(null);
      } else {
        if (lesFile) {
          const fd = new FormData();
          Object.entries({ ...lesForm, courseId: String(selId) }).forEach(([k, v]) => {
            if (v !== null && v !== undefined) fd.append(k, String(v));
          });
          fd.append('file', lesFile);
          await lmsApi.createLesson(fd);
          setLesFile(null);
        } else {
          await lmsApi.createLesson({ ...lesForm, courseId: Number(selId) });
        }
        addToast('Lesson published.');
        setLesOpen(false);
      }
      refresh();
    } catch (err) { addToast(extractErrorMessage(err), 'error'); }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    try {
      // Sanitize — ensure creditUnits is a valid number
      const payload = {
        ...courseForm,
        creditUnits: Number(courseForm.creditUnits) || 3,
        departmentId: Number(courseForm.departmentId),
        description: courseForm.description.trim().length >= 10
          ? courseForm.description.trim()
          : (courseForm.description.trim() + ' course.').padEnd(10, '.'),
        publicationStatus: 'published'
      };
      const courseRes = await lmsApi.createCourse(payload);
      const newCourse = courseRes.data?.course;
      if (!newCourse) throw new Error('Course creation failed.');
      addToast('Course created: ' + newCourse.title);

      // 2. If a class section exists for the new course, auto-generate join code
      // (Class sections are created by Academic Admin — we just show the course was created)
      // Store result to display to instructor
      setNewCourseResult({ course: newCourse, joinCode: null });
      setCourseOpen(false);
      setCourseForm({ title:'', code:'', description:'', category:'networking', creditUnits:3, deliveryMode:'Instructor-Led', level:'Intermediate', departmentId:'' });
      queryClient.invalidateQueries({ queryKey:['courses'] });
    } catch (err) { addToast(extractErrorMessage(err), 'error'); }
  };

  const handleDelMod = async () => {
    try { await lmsApi.deleteModule(delMod.id); addToast('Module archived.'); setDelMod(null); refresh(); }
    catch (err) { addToast(extractErrorMessage(err), 'error'); }
  };

  const handleDelLes = async () => {
    try { await lmsApi.deleteLesson(delLes.id); addToast('Lesson archived.'); setDelLes(null); refresh(); }
    catch (err) { addToast(extractErrorMessage(err), 'error'); }
  };

  const moveModule = async (modules, fromIdx, toIdx) => {
    const mods = [...modules];
    const tmp = mods[fromIdx];
    mods[fromIdx] = mods[toIdx];
    mods[toIdx] = tmp;
    try {
      await apiClient.put('/modules/reorder', { modules: mods.map((m, i) => ({ id: m.id, orderIndex: i + 1 })) });
      queryClient.invalidateQueries({ queryKey: ['course', selId] });
    } catch (err) { addToast(extractErrorMessage(err), 'error'); }
  };

  const courses = cData?.data?.courses || [];
  const course = dData?.data?.course;
  const toggle = (id) => setExpanded(p => ({ ...p, [id]: p[id] === false }));
  const emoji = { laboratory: '🔬', video: '🎬', coding_exercise: '💻', reading: '📖' };
  const openEditMod = (mod) => { setModForm({ title: mod.title, description: mod.description || '', orderIndex: mod.orderIndex || 1, estimatedMinutes: mod.estimatedMinutes || 60 }); setEditMod(mod); };
  const openEditLes = (les) => { setLesForm({ moduleId: les.moduleId, title: les.title, lessonType: les.lessonType, contentHtml: les.contentHtml || '', codeSnippet: les.codeSnippet || '', estimatedMinutes: les.estimatedMinutes || 45, publicationStatus: les.publicationStatus || 'published' }); setEditLes(les); };

  const switchTab = (v) => {
    setStudioTab(v);
    if (v === 'joincode') {
      const cls = course?.offerings?.[0]?.classes?.[0];
      if (cls) { loadJoinCode(cls.id); }
    }
    if (v === 'pending') {
      const cls = course?.offerings?.[0]?.classes?.[0];
      if (cls) { setPendingClassId(cls.id); }
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <Badge label="Course & Curriculum Studio" color="emerald" icon={BookOpen} />
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Courses & Content</h1>
          <p className="text-sm text-slate-500 mt-1">Author modules, lessons, and attach learning resources.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={() => { setModForm({ title:'', description:'', orderIndex:1, estimatedMinutes:60 }); setModOpen(true); }} className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Module
          </button>
          <button type="button" onClick={() => { setLesForm({ moduleId:'', title:'', lessonType:'laboratory', contentHtml:'<h2>Objectives</h2>', codeSnippet:'', estimatedMinutes:45, publicationStatus:'published' }); setLesOpen(true); }} className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Lesson
          </button>
          <button type="button" onClick={() => setCourseOpen(true)} className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Course
          </button>
          <button type="button" onClick={() => setAiOpen(true)} className="px-3.5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5">
            🤖 AI Quiz
          </button>
        </div>
      </div>

      {/* Course Picker */}
      {courses.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {courses.map((c) => (
            <button key={c.id} type="button" onClick={() => setSelId(c.id)}
              className={'text-left p-4 rounded-xl border-2 transition-all ' + (selId === c.id ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300')}>
              <div className="flex items-start justify-between gap-2">
                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                </div>
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

      {/* No course selected */}
      {!selId && (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-500">Select a course to view its content.</p>
        </div>
      )}

      {/* Course selected — loading */}
      {selId && (isLoading || !course) && <LoadingState />}

      {/* Course selected — loaded */}
      {selId && !isLoading && course && (
        <div className="space-y-3">
          {/* Meta Banner */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 mb-0.5">{course.code}</p>
              <h2 className="text-base font-bold text-slate-900">{course.title}</h2>
              {course.description && <p className="text-xs text-slate-500 mt-0.5">{course.description}</p>}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-center">
                <p className="text-lg font-bold text-blue-600">{course.modules?.length ?? 0}</p>
                <p className="text-[11px] text-slate-500">Modules</p>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div className="text-center">
                <p className="text-lg font-bold text-emerald-600">
                  {(course.modules || []).reduce((s, m) => s + (m.lessons?.length || 0), 0)}
                </p>
                <p className="text-[11px] text-slate-500">Lessons</p>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div className="text-center">
                <p className="text-lg font-bold text-violet-600">
                  {(course.offerings || []).reduce((s, o) => s + (o.classes || []).reduce((a, c) => a + (c.memberships?.length || 0), 0), 0)}
                </p>
                <p className="text-[11px] text-slate-500">Students</p>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <StatusBadge status={course.publicationStatus || 'draft'} />
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit flex-wrap">
            {[
              ['content', '📚 Content'],
              ['students', '👥 Students'],
              ['joincode', '🔑 Join Code'],
              ['pending', '⏳ Pending (' + (pendingEnrollments.length) + ')']
            ].map(([v, l]) => (
              <button key={v} type="button" onClick={() => switchTab(v)}
                className={'px-4 py-2 text-xs font-semibold rounded-md transition-colors ' + (studioTab === v ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-800')}>
                {l}
              </button>
            ))}
          </div>

          {/* Content Tab */}
          {studioTab === 'content' && (
            <div className="space-y-3">
              {(course.modules || []).length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center">
                  <p className="text-xs text-slate-400">No modules yet — click Module to get started.</p>
                </div>
              ) : (
                (course.modules || []).map((mod, mi) => {
                  const open = expanded[mod.id] !== false;
                  return (
                    <div key={mod.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                      <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <button type="button" onClick={() => toggle(mod.id)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
                          <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">{mi + 1}</span>
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-slate-900 truncate">{mod.title}</h3>
                            {mod.description && <p className="text-[11px] text-slate-500 truncate">{mod.description}</p>}
                          </div>
                        </button>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] text-slate-500 hidden sm:block">{mod.lessons?.length || 0} lessons</span>
                          <StatusBadge status={mod.publicationStatus || 'draft'} />
                          <div className="flex flex-col">
                            <button type="button" disabled={mi === 0}
                              onClick={() => moveModule(course.modules, mi, mi - 1)}
                              className="text-[10px] text-slate-400 hover:text-blue-600 disabled:opacity-30 leading-none">▲</button>
                            <button type="button" disabled={mi === (course.modules || []).length - 1}
                              onClick={() => moveModule(course.modules, mi, mi + 1)}
                              className="text-[10px] text-slate-400 hover:text-blue-600 disabled:opacity-30 leading-none">▼</button>
                          </div>
                          <button type="button" onClick={() => openEditMod(mod)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => setDelMod(mod)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                      {open && (
                        <div className="divide-y divide-slate-100">
                          {(mod.lessons || []).length === 0 ? (
                            <p className="px-5 py-3 text-xs text-slate-400 italic">No lessons yet.</p>
                          ) : (
                            (mod.lessons || []).map((les, li) => (
                              <div key={les.id} className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50">
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className="text-base shrink-0">{emoji[les.lessonType] || '📄'}</span>
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-slate-900 truncate">{mi + 1}.{li + 1} {les.title}</p>
                                    <p className="text-[11px] text-slate-500 capitalize mt-0.5">{les.lessonType?.replace(/_/g, ' ')} · {les.estimatedMinutes} min</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <StatusBadge status={les.publicationStatus || 'draft'} />
                                  <button type="button" onClick={() => setPreviewLes(les)} className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors" title="Preview"><Eye className="w-3.5 h-3.5" /></button>
                                  <button type="button" onClick={() => openEditLes(les)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                                  <button type="button" onClick={() => setDelLes(les)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Students Tab */}
          {studioTab === 'students' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
                <h2 className="text-sm font-bold text-slate-900">Enrolled Students — {course.title}</h2>
                <p className="text-xs text-slate-500 mt-0.5">All students enrolled in sections of this course</p>
              </div>
              {(course.offerings || []).length === 0 ? (
                <p className="px-5 py-8 text-xs text-slate-400 text-center">No class sections found for this course.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {(course.offerings || []).map((offering) => (
                    (offering.classes || []).map((cls) => (
                      <div key={cls.id} className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-xs font-bold text-slate-900">{cls.sectionCode}</p>
                            <p className="text-[11px] text-slate-500">{offering.semester?.name} · {cls.schedule || 'No schedule'} · {cls.room || 'No room'}</p>
                          </div>
                          <span className="text-xs font-bold text-blue-700">{cls.memberships?.length || 0} / {cls.capacity} students</span>
                        </div>
                        {(cls.memberships || []).length === 0 ? (
                          <p className="text-xs text-slate-400 italic">No students enrolled yet.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {(cls.memberships || []).map((m) => (
                              <div key={m.id} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0 font-bold text-blue-700 text-[11px]">
                                  {m.student?.firstName?.[0]}{m.student?.lastName?.[0]}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-slate-900 truncate">{m.student?.firstName} {m.student?.lastName}</p>
                                  <p className="text-slate-400 font-mono truncate">{m.student?.studentNumber}</p>
                                </div>
                                <StatusBadge status={m.status} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Join Code Tab */}
          {studioTab === 'joincode' && (
            <div className="space-y-4">
              {(course.offerings || []).length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">No class sections found.</p>
              ) : (
                (course.offerings || []).map((offering) => (
                  (offering.classes || []).map((cls) => (
                    <div key={cls.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-xs font-bold text-slate-900">{cls.sectionCode} — {course.title}</p>
                          <p className="text-[11px] text-slate-500">{offering.semester?.name}</p>
                        </div>
                        <StatusBadge status={joinCodeData?.joinCodeEnabled ? 'active' : 'draft'} />
                      </div>
                      {joinCodeLoading ? <LoadingState /> : (
                        <div className="space-y-4">
                          {joinCodeData?.joinCode && joinCodeData?.joinCodeEnabled ? (
                            <div className="p-4 rounded-xl bg-blue-50 border-2 border-blue-200 text-center">
                              <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 mb-1">Class Join Code</p>
                              <p className="text-4xl font-black text-blue-800 tracking-[0.3em] font-mono">{joinCodeData.joinCode}</p>
                              <p className="text-xs text-blue-600 mt-2">{joinCodeData.enrolledCount || 0} / {joinCodeData.capacity} students enrolled</p>
                              <p className="text-[11px] text-slate-500 mt-1">Share this code with your students. They enter it in the Student Dashboard to join.</p>
                            </div>
                          ) : (
                            <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-center">
                              <p className="text-xs text-slate-500">No join code active for this section.</p>
                            </div>
                          )}
                          <div className="flex gap-2 flex-wrap">
                            <button type="button" onClick={() => handleGenerateJoinCode(cls.id, false)}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg">
                              {joinCodeData?.joinCode ? 'Enable Code' : 'Generate Code'}
                            </button>
                            {joinCodeData?.joinCode && (
                              <button type="button" onClick={() => handleGenerateJoinCode(cls.id, true)}
                                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg">
                                🔄 New Code
                              </button>
                            )}
                            {joinCodeData?.joinCodeEnabled && (
                              <button type="button" onClick={() => handleDisableJoinCode(cls.id)}
                                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg">
                                Disable
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ))
              )}
            </div>
          )}

          {/* Pending Enrollments Tab */}
          {studioTab === 'pending' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-5 py-4 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">⏳ Pending Enrollment Requests</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Students who joined via code — approve or reject each request</p>
                </div>
                <span className="text-xs font-bold text-amber-700 bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg">
                  {pendingEnrollments.length} pending
                </span>
              </div>
              {pendingEnrollments.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-2xl mb-2">✅</p>
                  <p className="text-sm font-semibold text-slate-500">No pending requests</p>
                  <p className="text-xs text-slate-400 mt-1">All enrollment requests have been processed.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {pendingEnrollments.map((m) => (
                    <div key={m.id} className="px-5 py-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0 font-bold text-amber-700 text-sm">
                          {m.student?.firstName?.[0]}{m.student?.lastName?.[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900">{m.student?.firstName} {m.student?.lastName}</p>
                          <p className="text-[11px] text-slate-500">{m.student?.email}</p>
                          <p className="text-[11px] font-mono text-slate-400">{m.student?.studentNumber}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button type="button"
                          onClick={() => handleApprove(m.id, m.student?.firstName + ' ' + m.student?.lastName)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1">
                          ✓ Approve
                        </button>
                        <button type="button"
                          onClick={() => handleReject(m.id, m.student?.firstName + ' ' + m.student?.lastName)}
                          className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg flex items-center gap-1">
                          ✕ Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Module Modal */}
      <ModalDialog isOpen={modOpen || Boolean(editMod)} onClose={() => { setModOpen(false); setEditMod(null); }} title={editMod ? 'Edit Module' : 'Create Module'}>
        <form onSubmit={handleSaveMod} className="space-y-4 text-xs">
          <div><label className="block font-semibold mb-1.5">Title</label><input required value={modForm.title} onChange={e => setModForm({ ...modForm, title: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300" /></div>
          <div><label className="block font-semibold mb-1.5">Description</label><textarea rows={3} value={modForm.description} onChange={e => setModForm({ ...modForm, description: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block font-semibold mb-1.5">Order</label><input type="number" value={modForm.orderIndex} onChange={e => setModForm({ ...modForm, orderIndex: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-300" /></div>
            <div><label className="block font-semibold mb-1.5">Est. Minutes</label><input type="number" value={modForm.estimatedMinutes} onChange={e => setModForm({ ...modForm, estimatedMinutes: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-300" /></div>
          </div>
          <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg">{editMod ? 'Update Module' : 'Save Module'}</button>
        </form>
      </ModalDialog>

      {/* Lesson Modal */}
      <ModalDialog isOpen={lesOpen || Boolean(editLes)} onClose={() => { setLesOpen(false); setEditLes(null); }} title={editLes ? 'Edit Lesson' : 'Author Lesson'} maxWidth="max-w-2xl">
        <form onSubmit={handleSaveLes} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block font-semibold mb-1.5">Module</label>
              <select value={lesForm.moduleId} onChange={e => setLesForm({ ...lesForm, moduleId: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
                <option value="">— Select —</option>
                {(course?.modules || []).map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
            </div>
            <div><label className="block font-semibold mb-1.5">Type</label>
              <select value={lesForm.lessonType} onChange={e => setLesForm({ ...lesForm, lessonType: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
                <option value="reading">📖 Reading</option>
                <option value="laboratory">🔬 Laboratory</option>
                <option value="coding_exercise">💻 Coding</option>
                <option value="video">🎬 Video</option>
              </select>
            </div>
          </div>
          <div><label className="block font-semibold mb-1.5">Title</label><input required value={lesForm.title} onChange={e => setLesForm({ ...lesForm, title: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300" /></div>
          <div><label className="block font-semibold mb-1.5">Content HTML</label><textarea rows={4} required value={lesForm.contentHtml} onChange={e => setLesForm({ ...lesForm, contentHtml: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-[11px]" /></div>
          <div><label className="block font-semibold mb-1.5">Code Snippet</label><textarea rows={3} value={lesForm.codeSnippet} onChange={e => setLesForm({ ...lesForm, codeSnippet: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono bg-slate-900 text-emerald-400 text-[11px]" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block font-semibold mb-1.5">Est. Minutes</label><input type="number" value={lesForm.estimatedMinutes} onChange={e => setLesForm({ ...lesForm, estimatedMinutes: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-300" /></div>
            <div><label className="block font-semibold mb-1.5">Status</label>
              <select value={lesForm.publicationStatus} onChange={e => setLesForm({ ...lesForm, publicationStatus: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>
          {/* File Upload */}
          <div>
            <label className="block font-semibold mb-1.5">
              📎 Attach File (PDF, DOCX, PPTX, ZIP, etc.) — optional
            </label>
            <input type="file" accept=".pdf,.docx,.pptx,.ppt,.xlsx,.zip,.txt,.png,.jpg"
              onChange={e => setLesFile(e.target.files[0])}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs" />
            {lesFile && (
              <p className="text-[11px] text-emerald-700 mt-1">
                📄 {lesFile.name} ({(lesFile.size / 1024).toFixed(1)} KB) — will be attached for download
              </p>
            )}
            {/* Show existing attachments if editing */}
            {editLes && (editLes.resources || []).length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-[11px] font-semibold text-slate-600">Existing attachments:</p>
                {(editLes.resources || []).map(r => (
                  <a key={r.id} href={'/api/resources/' + r.id + '/download'} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 text-[11px] text-blue-600 hover:underline">
                    ⬇ {r.originalFilename || r.title}
                  </a>
                ))}
              </div>
            )}
          </div>
          <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg">{editLes ? 'Update Lesson' : 'Publish Lesson'}</button>
        </form>
      </ModalDialog>

      {/* Add Course Modal */}
      <ModalDialog isOpen={courseOpen} onClose={() => { setCourseOpen(false); setNewCourseResult(null); }} title="➕ Add New Course" maxWidth="max-w-xl">
        {newCourseResult ? (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
              <p className="text-lg font-bold text-emerald-900 mb-1">✅ Course Created!</p>
              <p className="text-sm font-semibold text-slate-800">{newCourseResult.course.title}</p>
              <p className="font-mono text-slate-500 mt-0.5">{newCourseResult.course.code}</p>
            </div>
            <div className="p-4 rounded-xl bg-blue-50 border-2 border-blue-200 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 mb-1">Next Step</p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Go to the <strong>🔑 Join Code</strong> tab after a class section is assigned to this course to generate a join code for students.
              </p>
            </div>
            <button type="button" onClick={() => { setCourseOpen(false); setNewCourseResult(null); }}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreateCourse} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1.5">Course Title</label>
                <input required value={courseForm.title} onChange={e => {
                  const title = e.target.value;
                  // Auto-generate code from title + category prefix
                  const prefixMap = {
                    networking: 'NET', programming: 'PRG', cybersecurity: 'SEC',
                    database: 'DB', other: 'CRS'
                  };
                  const prefix = prefixMap[courseForm.category] || 'CRS';
                  const words = title.trim().split(/\s+/);
                  const abbr = words.length >= 2
                    ? words.slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('')
                    : (title.slice(0, 3).toUpperCase());
                  const autoCode = prefix + '-' + abbr + '101';
                  setCourseForm({ ...courseForm, title, code: autoCode });
                }}
                  placeholder="e.g., Introduction to Networks" className="w-full px-3 py-2 rounded-lg border border-slate-300" />
              </div>
              <div>
                <label className="block font-semibold mb-1.5">
                  Course Code
                  <span className="ml-1.5 text-[10px] font-normal text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">auto-suggested, editable</span>
                </label>
                <input required value={courseForm.code} onChange={e => setCourseForm({ ...courseForm, code: e.target.value })}
                  placeholder="e.g., NET-IN101" className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono tracking-wider" />
                {courseForm.code && (
                  <p className="text-[11px] text-slate-400 mt-1">✏️ Feel free to change this to match your school's format</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1.5">Department</label>
                <select required value={courseForm.departmentId} onChange={e => setCourseForm({ ...courseForm, departmentId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
                  <option value="">— Select department —</option>
                  {(deptsData?.data?.departments || []).map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div />
            </div>
            <div>
              <label className="block font-semibold mb-1.5">Description <span className="text-slate-400 font-normal">(min. 10 characters)</span></label>
              <textarea rows={3} value={courseForm.description} onChange={e => setCourseForm({ ...courseForm, description: e.target.value })}
                placeholder="Brief description of the course…" className="w-full px-3 py-2 rounded-lg border border-slate-300" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold mb-1.5">Category</label>
                <select value={courseForm.category} onChange={e => {
                  const cat = e.target.value;
                  const prefixMap = { networking:'NET', programming:'PRG', cybersecurity:'SEC', database:'DB', other:'CRS' };
                  const prefix = prefixMap[cat] || 'CRS';
                  const words = courseForm.title.trim().split(/\s+/);
                  const abbr = words.length >= 2 ? words.slice(0,2).map(w=>w[0]?.toUpperCase()||'').join('') : (courseForm.title.slice(0,3).toUpperCase() || '');
                  const autoCode = prefix + '-' + abbr + '101';
                  setCourseForm({ ...courseForm, category: cat, code: courseForm.title ? autoCode : courseForm.code });
                }} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
                  <option value="networking">Networking</option>
                  <option value="programming">Programming</option>
                  <option value="cybersecurity">Cybersecurity</option>
                  <option value="database">Database</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1.5">Level</label>
                <select value={courseForm.level} onChange={e => setCourseForm({ ...courseForm, level: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
                  <option value="Introductory">Introductory</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Professional">Professional</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1.5">Credit Units</label>
                <input type="number" min="1" max="6" value={courseForm.creditUnits}
                  onChange={e => setCourseForm({ ...courseForm, creditUnits: e.target.value === '' ? 3 : Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300" />
              </div>
            </div>
            <div>
              <label className="block font-semibold mb-1.5">Delivery Mode</label>
              <select value={courseForm.deliveryMode} onChange={e => setCourseForm({ ...courseForm, deliveryMode: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
                <option value="Instructor-Led">Instructor-Led</option>
                <option value="Self-Paced">Self-Paced</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-[11px]">
              ℹ️ After creating the course, a class section will need to be assigned by Academic Admin. Then you can generate a <strong>Join Code</strong> from the 🔑 tab for students to enroll.
            </div>
            <button type="submit" className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg">
              Create Course
            </button>
          </form>
        )}
      </ModalDialog>

      {/* AI Quiz Modal */}
      <ModalDialog isOpen={aiOpen} onClose={() => { setAiOpen(false); setAiResults([]); setAiFile(null); }} title="🤖 AI Quiz Generator" maxWidth="max-w-2xl">
        <div className="space-y-5 text-xs">
          {aiResults.length === 0 ? (
            <form onSubmit={handleAiGenerate} className="space-y-4">
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800">
                <p className="font-semibold mb-1">How it works</p>
                <p>Upload a PDF, DOCX, or TXT file. The system reads the content and automatically generates multiple-choice questions for your question bank.</p>
              </div>
              <div>
                <label className="block font-semibold mb-1.5">Upload File (PDF, DOCX, TXT)</label>
                <input required type="file" accept=".pdf,.docx,.txt" onChange={e => setAiFile(e.target.files[0])} className="w-full px-3 py-2 rounded-lg border border-slate-300" />
                {aiFile && <p className="text-slate-500 mt-1">📄 {aiFile.name} ({(aiFile.size / 1024).toFixed(1)} KB)</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1.5">Topic / Subject</label>
                  <input value={aiTopic} onChange={e => setAiTopic(e.target.value)}
                    placeholder="e.g., Network Security, OSPF"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300" />
                  {/* Quick fill buttons from course title */}
                  {selId && (cData?.data?.courses||[]).filter(c=>c.id===selId).map(c=>(
                    <button key={c.id} type="button" onClick={()=>setAiTopic(c.title)}
                      className="mt-1 text-[11px] text-blue-600 hover:underline">
                      Use: {c.title}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="block font-semibold mb-1.5">Number of Questions</label>
                  <select value={aiCount} onChange={e => setAiCount(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
                    {[5, 10, 15, 20].map(n => <option key={n} value={n}>{n} questions</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" disabled={aiLoading} className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-lg disabled:opacity-60 flex items-center justify-center gap-2">
                {aiLoading ? <span>⏳ Generating...</span> : <span>🤖 Generate {aiCount} Questions</span>}
              </button>
              <p className="text-center text-slate-400 text-[11px]">ℹ️ Set OPENAI_API_KEY in server .env to enable AI generation. Falls back to rule-based if not set.</p>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-bold text-slate-900">✅ {aiResults.length} questions generated!</p>
                <button type="button" onClick={() => setAiResults([])} className="text-xs text-slate-500 hover:underline">← Start over</button>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {aiResults.map((q, i) => (
                  <div key={i} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[10px] font-bold text-violet-600 uppercase">Q{i + 1}</span>
                      <span className={'text-[10px] px-1.5 py-0.5 rounded font-semibold border ' + (q.difficulty === 'Hard' ? 'bg-rose-50 text-rose-700 border-rose-200' : q.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200')}>
                        {q.difficulty}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-900">{q.prompt}</p>
                    <div className="mt-1.5 grid grid-cols-2 gap-1">
                      {(q.options || []).map((o, oi) => (
                        <p key={oi} className={'text-[11px] px-2 py-0.5 rounded ' + (o.isCorrect ? 'bg-emerald-100 text-emerald-800 font-semibold' : 'text-slate-500')}>
                          {o.isCorrect ? '✓ ' : ''}{o.optionText}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <p className="font-semibold text-slate-700">Save to Question Bank:</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold mb-1 text-slate-600">Question Bank</label>
                    <select id="ai-bank-id" className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs">
                      <option value="">— Select bank —</option>
                      {(banksData?.data?.questionBanks||[]).map(b=>(
                        <option key={b.id} value={b.id}>{b.title} — {b.topic}</option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-400 mt-1">
                      No banks? Create one in <strong>Quizzes → + New Bank</strong> first.
                    </p>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold mb-1 text-slate-600">Course</label>
                    <select id="ai-course-id" defaultValue={selId} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs">
                      <option value="">— Select course —</option>
                      {(cData?.data?.courses||[]).map(c=>(
                        <option key={c.id} value={c.id}>{c.code} — {c.title}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button type="button" disabled={aiSaving} onClick={() => {
                  const bankId = document.getElementById('ai-bank-id')?.value;
                  const courseId = document.getElementById('ai-course-id')?.value;
                  handleSaveAiQuestions(bankId, courseId);
                }} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg disabled:opacity-60">
                  {aiSaving ? 'Saving...' : '💾 Save All to Question Bank'}
                </button>
              </div>
            </div>
          )}
        </div>
      </ModalDialog>

      {/* Lesson Preview Modal */}
      <ModalDialog isOpen={Boolean(previewLes)} onClose={() => setPreviewLes(null)} title={'Preview — ' + (previewLes?.title || '')} maxWidth="max-w-2xl">
        {previewLes && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={previewLes.publicationStatus || 'draft'} />
              <span className="text-slate-500 capitalize">{previewLes.lessonType?.replace(/_/g, ' ')} · {previewLes.estimatedMinutes} min</span>
            </div>
            {previewLes.contentHtml && (
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 overflow-auto max-h-64"
                dangerouslySetInnerHTML={{ __html: previewLes.contentHtml }} />
            )}
            {previewLes.codeSnippet && (
              <div>
                <p className="font-semibold text-slate-700 mb-1.5">Code Block</p>
                <pre className="p-3 rounded-lg bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-48">{previewLes.codeSnippet}</pre>
              </div>
            )}
            {!previewLes.contentHtml && !previewLes.codeSnippet && (
              <p className="text-slate-400 italic text-center py-6">No content to preview yet.</p>
            )}
          </div>
        )}
      </ModalDialog>

      <ConfirmModal isOpen={Boolean(delMod)} onClose={() => setDelMod(null)} onConfirm={handleDelMod} title="Archive Module" message={'Archive "' + (delMod?.title || '') + '"? Students will no longer see it.'} />
      <ConfirmModal isOpen={Boolean(delLes)} onClose={() => setDelLes(null)} onConfirm={handleDelLes} title="Archive Lesson" message={'Archive "' + (delLes?.title || '') + '"?'} />
    </div>
  );
}


export function InstructorAssignmentsPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [delItem, setDelItem] = useState(null);
  const [extOpen, setExtOpen] = useState(null); // assignment to extend
  const [csvOpen, setCsvOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [extForm, setExtForm] = useState({ studentId:'', newDueDate:'', reason:'' });
  const [csvFile, setCsvFile] = useState(null);
  const [csvCatId, setCsvCatId] = useState('');
  const emptyForm = { classId:'', courseId:'', title:'', assignmentType:'laboratory', instructions:'', dueDate:'', maxScore:100, starterCode:'// Starter\n', rubricCriteria:[{criterionName:'Functional Accuracy',maxPoints:50},{criterionName:'Documentation',maxPoints:50}] };
  const [form, setForm] = useState(emptyForm);

  const { data: classesData } = useQuery({ queryKey:['classes'], queryFn:lmsApi.listClasses });
  const { data: coursesData } = useQuery({ queryKey:['courses'], queryFn:()=>lmsApi.listCourses() });
  const { data, isLoading } = useQuery({ queryKey:['assignments'], queryFn:()=>lmsApi.listAssignments() });

  const openCreate = () => { setForm(emptyForm); setCreateOpen(true); };
  const openEdit = (a) => { setForm({ classId:a.classId||'', courseId:a.courseId||'', title:a.title, assignmentType:a.assignmentType, instructions:a.instructions||'', dueDate:a.dueDate?a.dueDate.slice(0,10):'', maxScore:a.maxScore, starterCode:a.starterCode||'', rubricCriteria:[] }); setEditItem(a); };

  const handleExtend = async (e) => {
    e.preventDefault();
    try {
      await lmsApi.extendAssignment(extOpen.id, extForm);
      addToast(`Extension granted until ${extForm.newDueDate}.`);
      setExtOpen(null);
      setExtForm({ studentId:'', newDueDate:'', reason:'' });
    } catch (err) { addToast(extractErrorMessage(err), 'error'); }
  };

  const handleCsvImport = async (e) => {
    e.preventDefault();
    if (!csvFile || !csvCatId) { addToast('Select a file and grade category.', 'error'); return; }
    const fd = new FormData();
    fd.append('file', csvFile);
    fd.append('gradeCategoryId', csvCatId);
    // Use classId from first selected class or prompt
    const classId = allClasses[0]?.id;
    if (!classId) { addToast('No classes available.', 'error'); return; }
    try {
      const res = await lmsApi.importGradesCsv(classId, fd);
      addToast(res.message); setCsvOpen(false); setCsvFile(null);
      queryClient.invalidateQueries({ queryKey: ['gradebook'] });
    } catch (err) { addToast(extractErrorMessage(err), 'error'); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, classId:Number(form.classId), courseId:Number(form.courseId) };
      if (editItem) { await lmsApi.updateAssignment(editItem.id, payload); addToast('Assignment updated.'); setEditItem(null); }
      else { await lmsApi.createAssignment(payload); addToast('Assignment published.'); setCreateOpen(false); }
      queryClient.invalidateQueries({ queryKey:['assignments'] });
    } catch (err) { addToast(extractErrorMessage(err),'error'); }
  };
  const handleDelete = async () => {
    try { await lmsApi.deleteAssignment(delItem.id); addToast('Assignment deleted.'); setDelItem(null); queryClient.invalidateQueries({ queryKey:['assignments'] }); }
    catch (err) { addToast(extractErrorMessage(err),'error'); }
  };

  const allClasses = classesData?.data?.classes||[];
  const allCourses = coursesData?.data?.courses||[];
  const all = data?.data?.assignments||[];
  const typeBadge = { laboratory:'bg-violet-50 text-violet-700 border-violet-200', programming:'bg-blue-50 text-blue-700 border-blue-200', network_config:'bg-emerald-50 text-emerald-700 border-emerald-200', project_milestone:'bg-amber-50 text-amber-700 border-amber-200' };
  const filtered = all.filter(a=>(filter==='all'||a.assignmentType===filter)&&(!search||a.title.toLowerCase().includes(search.toLowerCase())));

  const AssignmentForm = () => (
    <form onSubmit={handleSave} className="space-y-4 text-xs">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block font-semibold mb-1.5">Class Section</label>
          <select required value={form.classId} onChange={e=>setForm({...form,classId:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
            <option value="">— Select —</option>{allClasses.map(c=><option key={c.id} value={c.id}>{c.sectionCode}</option>)}
          </select></div>
        <div><label className="block font-semibold mb-1.5">Course</label>
          <select required value={form.courseId} onChange={e=>setForm({...form,courseId:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
            <option value="">— Select —</option>{allCourses.map(c=><option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}
          </select></div>
      </div>
      <div><label className="block font-semibold mb-1.5">Title</label><input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300"/></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block font-semibold mb-1.5">Type</label>
          <select value={form.assignmentType} onChange={e=>setForm({...form,assignmentType:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
            <option value="laboratory">Laboratory</option><option value="programming">Programming</option><option value="network_config">Network Config</option><option value="project_milestone">Project</option>
          </select></div>
        <div><label className="block font-semibold mb-1.5">Due Date</label><input type="date" required value={form.dueDate} onChange={e=>setForm({...form,dueDate:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300"/></div>
      </div>
      <div><label className="block font-semibold mb-1.5">Max Score</label><input type="number" value={form.maxScore} onChange={e=>setForm({...form,maxScore:Number(e.target.value)})} className="w-full px-3 py-2 rounded-lg border border-slate-300"/></div>
      <div><label className="block font-semibold mb-1.5">Instructions</label><textarea required rows={3} value={form.instructions} onChange={e=>setForm({...form,instructions:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300"/></div>
      <div><label className="block font-semibold mb-1.5">Starter Code</label><textarea rows={3} value={form.starterCode} onChange={e=>setForm({...form,starterCode:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"/></div>
      <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg">{editItem?'Update Assignment':'Publish Assignment'}</button>
    </form>
  );

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200">
        <div><Badge label="Assignments & Labs" color="indigo" icon={Terminal}/><h1 className="text-2xl font-bold text-slate-900 tracking-tight">Assignments & Laboratories</h1><p className="text-sm text-slate-500 mt-1">Configure deadlines, starter code, and grading rubrics.</p></div>
        <button type="button" onClick={openCreate} className="self-start inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"><Plus className="w-4 h-4"/> Create Assignment</button>
        <button type="button" onClick={()=>setCsvOpen(true)} className="self-start inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg"><FileDown className="w-3.5 h-3.5"/> Import Grades CSV</button>
      </div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {[['all','All'],['laboratory','Laboratory'],['programming','Programming'],['network_config','Network Config'],['project_milestone','Project']].map(([v,l])=>(
            <Tab key={v} label={l} count={v==='all'?all.length:all.filter(a=>a.assignmentType===v).length} active={filter===v} onClick={()=>setFilter(v)}/>
          ))}
        </div>
        <div className="relative ml-auto w-full sm:w-56"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"/></div>
      </div>
      {isLoading?<LoadingState/>:filtered.length===0?(<div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center"><FileText className="w-10 h-10 text-slate-300 mx-auto mb-3"/><p className="text-sm font-semibold text-slate-500">No assignments found.</p></div>):(
        <div className="grid grid-cols-1 gap-4">{filtered.map(a=>{
          const overdue=a.dueDate&&new Date(a.dueDate)<new Date();
          return (
            <div key={a.id} className={`bg-white rounded-xl border p-5 shadow-sm hover:shadow transition-shadow ${overdue?'border-amber-200':'border-slate-200'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${typeBadge[a.assignmentType]||'bg-slate-100 text-slate-700 border-slate-200'}`}>{a.assignmentType?.replace(/_/g,' ')}</span>
                  {overdue&&<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-amber-50 text-amber-700 border-amber-200">Past Due</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">Due: <strong className={overdue?'text-amber-700':'text-slate-700'}>{a.dueDate?new Date(a.dueDate).toLocaleDateString():'—'}</strong></span>
                  <span className="text-xs text-slate-500">Max: <strong>{a.maxScore}pts</strong></span>
                  <span className="text-xs font-semibold text-blue-600">{a.submissions?.length||0} submissions</span>
                  <button type="button" onClick={()=>openEdit(a)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Pencil className="w-3.5 h-3.5"/></button>
                  <button type="button" onClick={()=>setDelItem(a)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"><Trash2 className="w-3.5 h-3.5"/></button>
                  <button type="button" onClick={()=>{setExtOpen(a);setExtForm({studentId:'',newDueDate:a.dueDate?a.dueDate.slice(0,10):'',reason:'Extension granted by instructor'});}} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="Grant extension"><Calendar className="w-3.5 h-3.5"/></button>
                </div>
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">{a.title}</h3>
              <p className="text-xs text-slate-600 line-clamp-2">{a.instructions}</p>
              {a.rubric&&<div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs"><p className="font-bold text-slate-800 mb-2">Rubric: {a.rubric.title}</p><div className="grid grid-cols-1 sm:grid-cols-3 gap-2">{(a.rubric.criteria||[]).map(c=><div key={c.id} className="p-2 bg-white rounded border border-slate-200 flex items-center justify-between gap-2"><span className="font-medium text-slate-700 truncate">{c.criterionName}</span><span className="text-blue-600 font-bold shrink-0">{c.maxPoints}pt</span></div>)}</div></div>}
            </div>
          );
        })}</div>
      )}
      <ModalDialog isOpen={createOpen} onClose={()=>setCreateOpen(false)} title="Create Assignment" maxWidth="max-w-xl"><AssignmentForm/></ModalDialog>
      <ModalDialog isOpen={Boolean(editItem)} onClose={()=>setEditItem(null)} title="Edit Assignment" maxWidth="max-w-xl"><AssignmentForm/></ModalDialog>
      <ConfirmModal isOpen={Boolean(delItem)} onClose={()=>setDelItem(null)} onConfirm={handleDelete} title="Delete Assignment" message={`Delete "${delItem?.title}"? This cannot be undone.`}/>

      {/* Extension Modal */}
      <ModalDialog isOpen={Boolean(extOpen)} onClose={()=>setExtOpen(null)} title={`Grant Extension — ${extOpen?.title}`}>
        <form onSubmit={handleExtend} className="space-y-4 text-xs">
          <p className="text-slate-500">Grant an individual student a different due date for this assignment.</p>
          <div><label className="block font-semibold mb-1.5">Student ID (User ID)</label><input required type="number" value={extForm.studentId} onChange={e=>setExtForm({...extForm,studentId:e.target.value})} placeholder="Enter student user ID" className="w-full px-3 py-2 rounded-lg border border-slate-300"/></div>
          <div><label className="block font-semibold mb-1.5">New Due Date</label><input required type="date" value={extForm.newDueDate} onChange={e=>setExtForm({...extForm,newDueDate:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300"/></div>
          <div><label className="block font-semibold mb-1.5">Reason</label><input value={extForm.reason} onChange={e=>setExtForm({...extForm,reason:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300"/></div>
          <button type="submit" className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg">Grant Extension</button>
        </form>
      </ModalDialog>

      {/* Bulk CSV Import Modal */}
      <ModalDialog isOpen={csvOpen} onClose={()=>setCsvOpen(false)} title="Bulk Grade Import (CSV)">
        <form onSubmit={handleCsvImport} className="space-y-4 text-xs">
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800">
            <p className="font-semibold mb-1">CSV Format</p>
            <p className="font-mono">studentNumber,score,feedback</p>
            <p className="font-mono">2024-00001,92,Good work</p>
          </div>
          <div><label className="block font-semibold mb-1.5">Grade Category</label>
            <select required value={csvCatId} onChange={e=>setCsvCatId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
              <option value="">— Select category —</option>
              <option value="1">Quizzes</option>
              <option value="2">Assignments</option>
              <option value="3">Laboratory Activities</option>
              <option value="4">Major Examination</option>
            </select></div>
          <div><label className="block font-semibold mb-1.5">CSV File</label><input required type="file" accept=".csv" onChange={e=>setCsvFile(e.target.files[0])} className="w-full px-3 py-2 rounded-lg border border-slate-300"/></div>
          <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg">Import Grades</button>
        </form>
      </ModalDialog>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   4. SUBMISSION REVIEW — filter tabs, grade modal, flag display
══════════════════════════════════════════════════════════════ */
export function InstructorSubmissionsPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [sel, setSel] = useState(null);
  const [score, setScore] = useState(90);
  const [feedback, setFeedback] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [batchSelected, setBatchSelected] = useState([]);
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchScore, setBatchScore] = useState(90);
  const [batchFeedback, setBatchFeedback] = useState('');

  const { data, isLoading } = useQuery({ queryKey:['submissions'], queryFn:()=>lmsApi.listSubmissions() });

  const handleGrade = async (returnForRevision=false) => {
    if (!sel) return;
    try {
      const res = await lmsApi.reviewSubmission(sel.id, { score:Number(score), feedback, returnForRevision });
      addToast(res.message); setSel(null);
      queryClient.invalidateQueries({ queryKey:['submissions'] });
      queryClient.invalidateQueries({ queryKey:['dashboard'] });
    } catch (err) { addToast(extractErrorMessage(err),'error'); }
  };

  const handleBatchGrade = async (e) => {
    e.preventDefault();
    let done = 0;
    for (const id of batchSelected) {
      try {
        await lmsApi.reviewSubmission(id, { score: Number(batchScore), feedback: batchFeedback });
        done++;
      } catch (_) {}
    }
    addToast(`Graded ${done} of ${batchSelected.length} submissions.`);
    setBatchOpen(false); setBatchSelected([]);
    queryClient.invalidateQueries({ queryKey:['submissions'] });
  };

  const toggleSelect = (id) => setBatchSelected(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id]);

  const all = data?.data?.submissions||[];
  const counts = { all:all.length, submitted:all.filter(s=>s.status==='submitted').length, late:all.filter(s=>s.status==='late').length, under_review:all.filter(s=>s.status==='under_review').length, graded:all.filter(s=>s.status==='graded').length, flagged:all.filter(s=>s.flaggedForInstructorReview).length };
  const filtered = all.filter(s=>{
    const mf=filter==='all'?true:filter==='flagged'?s.flaggedForInstructorReview:s.status===filter;
    const ms=!search||`${s.student?.firstName} ${s.student?.lastName} ${s.assignment?.title}`.toLowerCase().includes(search.toLowerCase());
    return mf&&ms;
  });

  return (
    <div className="space-y-6 pb-8">
      <div className="pb-5 border-b border-slate-200"><Badge label="Submission Evaluation" color="amber" icon={ClipboardCheck}/><h1 className="text-2xl font-bold text-slate-900 tracking-tight">Submission Review</h1><p className="text-sm text-slate-500 mt-1">Inspect student work, evaluate rubrics, and publish official grades.</p></div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[{label:'Pending',v:counts.submitted+counts.under_review,cl:'bg-amber-50 border-amber-200 text-amber-700'},{label:'Late',v:counts.late,cl:'bg-orange-50 border-orange-200 text-orange-700'},{label:'TA Flagged',v:counts.flagged,cl:'bg-rose-50 border-rose-200 text-rose-700'},{label:'Graded',v:counts.graded,cl:'bg-emerald-50 border-emerald-200 text-emerald-700'}].map(k=>(
          <div key={k.label} className={`p-4 rounded-xl border ${k.cl}`}><p className="text-2xl font-bold">{k.v}</p><p className="text-xs font-medium mt-0.5 text-slate-600">{k.label}</p></div>
        ))}
      </div>
      {batchSelected.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs">
          <span className="font-semibold text-blue-800">{batchSelected.length} selected</span>
          <button type="button" onClick={()=>setBatchOpen(true)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold">Batch Grade</button>
          <button type="button" onClick={()=>setBatchSelected([])} className="text-blue-600 hover:underline">Clear</button>
        </div>
      )}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex flex-wrap gap-2">
          <Tab label="All" count={counts.all} active={filter==='all'} onClick={()=>setFilter('all')}/>
          <Tab label="Pending" count={counts.submitted} active={filter==='submitted'} onClick={()=>setFilter('submitted')}/>
          <Tab label="Late" count={counts.late} active={filter==='late'} onClick={()=>setFilter('late')}/>
          <Tab label="Under Review" count={counts.under_review} active={filter==='under_review'} onClick={()=>setFilter('under_review')}/>
          <Tab label="TA Flagged" count={counts.flagged} active={filter==='flagged'} onClick={()=>setFilter('flagged')}/>
          <Tab label="Graded" count={counts.graded} active={filter==='graded'} onClick={()=>setFilter('graded')}/>
        </div>
        <div className="relative ml-auto w-full sm:w-56"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"/></div>
      </div>
      {isLoading?<LoadingState/>:(
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] tracking-wide border-b border-slate-200">
                <tr>{['','Student','Assignment','Attempt','Status','Score','Due','Action'].map(h=><th key={h} className="px-4 py-3">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length===0?<tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">No submissions match the filter.</td></tr>:filtered.map(s=>(
                  <tr key={s.id} className={`hover:bg-slate-50 transition-colors ${s.flaggedForInstructorReview?'bg-amber-50/30':''}`}>
                    <td className="px-4 py-3"><input type="checkbox" checked={batchSelected.includes(s.id)} onChange={()=>toggleSelect(s.id)} className="rounded border-slate-300"/></td>
                    <td className="px-4 py-3"><p className="font-bold text-slate-900">{s.student?.firstName} {s.student?.lastName}</p><p className="text-slate-400 font-mono">{s.student?.studentNumber}</p></td>
                    <td className="px-4 py-3 font-semibold text-slate-800 max-w-[160px] truncate">{s.assignment?.title}</td>
                    <td className="px-4 py-3 text-slate-500">#{s.attemptNumber}</td>
                    <td className="px-4 py-3"><div className="flex flex-col gap-1"><StatusBadge status={s.status}/>{s.flaggedForInstructorReview&&<span className="flex items-center gap-1 text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded font-semibold"><Flag className="w-2.5 h-2.5"/> Flagged</span>}</div></td>
                    <td className="px-4 py-3 font-mono font-bold">{s.score!==null?`${s.score}/${s.assignment?.maxScore||100}`:<span className="text-slate-400">—</span>}</td>
                    <td className="px-4 py-3 text-slate-500">{s.assignment?.dueDate?new Date(s.assignment.dueDate).toLocaleDateString():'—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button type="button" onClick={()=>{setSel(s);setScore(s.score??90);setFeedback(s.feedback||'');}} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-[11px] flex items-center gap-1"><Eye className="w-3 h-3"/> Evaluate</button>
                        {s.storedFilename&&<a href={`/api/resources/${s.id}/download`} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Download submitted file"><FileDown className="w-3.5 h-3.5"/></a>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <ModalDialog isOpen={Boolean(sel)} onClose={()=>setSel(null)} title={`Evaluate — ${sel?.student?.firstName||''} ${sel?.student?.lastName||''}`} maxWidth="max-w-2xl">
        {sel&&<div className="space-y-4 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200"><p className="font-bold text-slate-900">{sel.assignment?.title}</p>{sel.textResponse&&<p className="text-slate-600 mt-1 leading-relaxed">{sel.textResponse}</p>}</div>
          {sel.codeSubmission&&<div><p className="font-semibold text-slate-700 mb-1">Submitted Code:</p><pre className="p-3 rounded-lg bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-48">{sel.codeSubmission}</pre></div>}
          {sel.flaggedForInstructorReview&&<div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 flex gap-2"><Flag className="w-4 h-4 shrink-0 mt-0.5"/><div><strong>TA Flag:</strong> {sel.flagReason||'Flagged for review'}</div></div>}
          {sel.preliminaryFeedback&&<div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900"><strong>TA Note:</strong> {sel.preliminaryFeedback}</div>}
          <div className="pt-2 border-t border-slate-200 space-y-3">
            <div><label className="block font-semibold mb-1.5">Score (Max {sel.assignment?.maxScore||100})</label>
              <input type="number" value={score} onChange={e=>setScore(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-blue-700"/>
              <div className="mt-2"><ProgressBar value={(score/(sel.assignment?.maxScore||100))*100} color={score>=75?'bg-emerald-500':score>=50?'bg-amber-400':'bg-rose-400'}/></div>
            </div>
            <div><label className="block font-semibold mb-1.5">Instructor Feedback</label><textarea rows={3} value={feedback} onChange={e=>setFeedback(e.target.value)} placeholder="Provide constructive feedback…" className="w-full px-3 py-2 rounded-lg border border-slate-300"/></div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={()=>handleGrade(true)} className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold rounded-lg">Return for Revision</button>
            <button type="button" onClick={()=>handleGrade(false)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg">Publish Grade</button>
          </div>
        </div>}
      </ModalDialog>

      {/* Batch Grade Modal */}
      <ModalDialog isOpen={batchOpen} onClose={()=>setBatchOpen(false)} title={`Batch Grade — ${batchSelected.length} submissions`}>
        <form onSubmit={handleBatchGrade} className="space-y-4 text-xs">
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
            This will apply the same score and feedback to all {batchSelected.length} selected submissions.
          </div>
          <div><label className="block font-semibold mb-1.5">Score (applies to all)</label>
            <input type="number" required value={batchScore} onChange={e=>setBatchScore(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-blue-700"/>
            <div className="mt-2"><ProgressBar value={(batchScore/100)*100} color={batchScore>=75?'bg-emerald-500':batchScore>=50?'bg-amber-400':'bg-rose-400'}/></div>
          </div>
          <div><label className="block font-semibold mb-1.5">Feedback (applies to all)</label>
            <textarea rows={3} value={batchFeedback} onChange={e=>setBatchFeedback(e.target.value)} placeholder="General feedback for this batch…" className="w-full px-3 py-2 rounded-lg border border-slate-300"/>
          </div>
          <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg">Publish Grades for All Selected</button>
        </form>
      </ModalDialog>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   5. ASSESSMENTS — Create Assessment modal + Question Bank CRUD
══════════════════════════════════════════════════════════════ */
export function InstructorAssessmentsPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [tab, setTab] = useState('assessments');
  const [aOpen, setAOpen] = useState(false);
  const [qOpen, setQOpen] = useState(false);
  const [bOpen, setBOpen] = useState(false);
  const [editA, setEditA] = useState(null);
  const [delA, setDelA] = useState(null);
  const [delQ, setDelQ] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(null); // assessment to add questions to
  const [attemptsOpen, setAttemptsOpen] = useState(null); // assessment to view attempts
  const [pickerSelected, setPickerSelected] = useState([]);

  const emptyA = { classId:'', courseId:'', title:'', assessmentType:'quiz', instructions:'', timeLimitMinutes:45, maxScore:100, openDate:'', closeDate:'', maxAttempts:1, randomizeQuestions:false, autoPublishResults:true, publicationStatus:'published', questionIds:[] };
  const [aForm, setAForm] = useState(emptyA);
  const [qForm, setQForm] = useState({ questionBankId:'', courseId:'', topic:'', questionType:'multiple_choice', difficulty:'Medium', prompt:'', points:10, options:[{optionText:'Option A',isCorrect:true},{optionText:'Option B',isCorrect:false},{optionText:'Option C',isCorrect:false}] });
  const [bForm, setBForm] = useState({ courseId:'', title:'', topic:'', description:'' });

  const { data: banksData, isLoading } = useQuery({ queryKey:['question-banks'], queryFn:()=>lmsApi.listQuestionBanks() });
  const { data: assessData } = useQuery({ queryKey:['assessments'], queryFn:()=>lmsApi.listAssessments() });
  const { data: classesData } = useQuery({ queryKey:['classes'], queryFn:lmsApi.listClasses });
  const { data: coursesData } = useQuery({ queryKey:['courses'], queryFn:()=>lmsApi.listCourses() });

  const banks = banksData?.data?.questionBanks||[];
  const assessments = assessData?.data?.assessments||[];
  const allClasses = classesData?.data?.classes||[];
  const allCourses = coursesData?.data?.courses||[];

  const handleSaveA = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...aForm, classId:Number(aForm.classId), courseId:Number(aForm.courseId) };
      if (editA) { await lmsApi.updateAssessment(editA.id, payload); addToast('Assessment updated.'); setEditA(null); }
      else { await lmsApi.createAssessment(payload); addToast('Assessment created.'); setAOpen(false); }
      queryClient.invalidateQueries({ queryKey:['assessments'] });
    } catch (err) { addToast(extractErrorMessage(err),'error'); }
  };
  const handleDelA = async () => {
    try { await lmsApi.deleteAssessment(delA.id); addToast('Assessment deleted.'); setDelA(null); queryClient.invalidateQueries({ queryKey:['assessments'] }); }
    catch (err) { addToast(extractErrorMessage(err),'error'); }
  };
  const handleSaveQ = async (e) => {
    e.preventDefault();
    try { await lmsApi.createQuestion({ ...qForm, questionBankId:Number(qForm.questionBankId), courseId:Number(qForm.courseId) }); addToast('Question added.'); setQOpen(false); queryClient.invalidateQueries({ queryKey:['question-banks'] }); }
    catch (err) { addToast(extractErrorMessage(err),'error'); }
  };
  const handleSaveB = async (e) => {
    e.preventDefault();
    try { await lmsApi.createQuestionBank({ ...bForm, courseId:Number(bForm.courseId) }); addToast('Question bank created.'); setBOpen(false); queryClient.invalidateQueries({ queryKey:['question-banks'] }); }
    catch (err) { addToast(extractErrorMessage(err),'error'); }
  };
  const handleDelQ = async () => {
    try { await lmsApi.deleteQuestion(delQ.id); addToast('Question archived.'); setDelQ(null); queryClient.invalidateQueries({ queryKey:['question-banks'] }); }
    catch (err) { addToast(extractErrorMessage(err),'error'); }
  };

  const openEditA = (a) => { setAForm({ classId:a.classId||'', courseId:a.courseId||'', title:a.title, assessmentType:a.assessmentType, instructions:a.instructions||'', timeLimitMinutes:a.timeLimitMinutes||45, maxScore:a.maxScore||100, openDate:a.openDate?a.openDate.slice(0,10):'', closeDate:a.closeDate?a.closeDate.slice(0,10):'', maxAttempts:a.maxAttempts||1, randomizeQuestions:a.randomizeQuestions||false, autoPublishResults:a.autoPublishResults||true, publicationStatus:a.publicationStatus||'published', questionIds:[] }); setEditA(a); };

  const diffCls = { Easy:'bg-emerald-50 text-emerald-700 border-emerald-200', Medium:'bg-amber-50 text-amber-700 border-amber-200', Hard:'bg-rose-50 text-rose-700 border-rose-200' };

  const AssessmentForm = () => (
    <form onSubmit={handleSaveA} className="space-y-4 text-xs">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block font-semibold mb-1.5">Class</label>
          <select required value={aForm.classId} onChange={e=>setAForm({...aForm,classId:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
            <option value="">— Select —</option>{allClasses.map(c=><option key={c.id} value={c.id}>{c.sectionCode}</option>)}
          </select></div>
        <div><label className="block font-semibold mb-1.5">Course</label>
          <select required value={aForm.courseId} onChange={e=>setAForm({...aForm,courseId:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
            <option value="">— Select —</option>{allCourses.map(c=><option key={c.id} value={c.id}>{c.code}</option>)}
          </select></div>
      </div>
      <div><label className="block font-semibold mb-1.5">Title</label><input required value={aForm.title} onChange={e=>setAForm({...aForm,title:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300"/></div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="block font-semibold mb-1.5">Type</label>
          <select value={aForm.assessmentType} onChange={e=>setAForm({...aForm,assessmentType:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
            <option value="quiz">Quiz</option><option value="midterm">Midterm</option><option value="final">Final Exam</option><option value="lab_practical">Lab Practical</option>
          </select></div>
        <div><label className="block font-semibold mb-1.5">Time Limit (min)</label><input type="number" value={aForm.timeLimitMinutes} onChange={e=>setAForm({...aForm,timeLimitMinutes:Number(e.target.value)})} className="w-full px-3 py-2 rounded-lg border border-slate-300"/></div>
        <div><label className="block font-semibold mb-1.5">Max Score</label><input type="number" value={aForm.maxScore} onChange={e=>setAForm({...aForm,maxScore:Number(e.target.value)})} className="w-full px-3 py-2 rounded-lg border border-slate-300"/></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block font-semibold mb-1.5">Open Date</label><input type="date" value={aForm.openDate} onChange={e=>setAForm({...aForm,openDate:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300"/></div>
        <div><label className="block font-semibold mb-1.5">Close Date</label><input type="date" value={aForm.closeDate} onChange={e=>setAForm({...aForm,closeDate:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300"/></div>
      </div>
      <div><label className="block font-semibold mb-1.5">Instructions</label><textarea rows={2} value={aForm.instructions} onChange={e=>setAForm({...aForm,instructions:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300"/></div>
      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer"><input type="checkbox" checked={aForm.randomizeQuestions} onChange={e=>setAForm({...aForm,randomizeQuestions:e.target.checked})} className="rounded"/> Randomize Questions</label>
        <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer"><input type="checkbox" checked={aForm.autoPublishResults} onChange={e=>setAForm({...aForm,autoPublishResults:e.target.checked})} className="rounded"/> Auto-publish Results</label>
      </div>
      <div><label className="block font-semibold mb-1.5">Status</label>
        <select value={aForm.publicationStatus} onChange={e=>setAForm({...aForm,publicationStatus:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
          <option value="draft">Draft</option><option value="published">Published</option>
        </select></div>
      <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg">{editA?'Update Assessment':'Create Assessment'}</button>
    </form>
  );

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200">
        <div><Badge label="Assessment Engine" color="violet" icon={ClipboardCheck}/><h1 className="text-2xl font-bold text-slate-900 tracking-tight">Quizzes & Question Bank</h1><p className="text-sm text-slate-500 mt-1">Build reusable question banks and configure server-timed examinations.</p></div>
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={()=>setBOpen(true)} className="self-start inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg"><Plus className="w-3.5 h-3.5"/> New Bank</button>
          <button type="button" onClick={()=>setQOpen(true)} className="self-start inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg"><Plus className="w-3.5 h-3.5"/> Add Question</button>
          <button type="button" onClick={()=>{setAForm(emptyA);setAOpen(true);}} className="self-start inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"><Plus className="w-4 h-4"/> New Assessment</button>
        </div>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {[['assessments',`Assessments (${assessments.length})`],['banks',`Question Banks (${banks.length})`]].map(([v,l])=>(
          <button key={v} type="button" onClick={()=>setTab(v)} className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors ${tab===v?'bg-white text-blue-700 shadow-sm':'text-slate-600 hover:text-slate-800'}`}>{l}</button>
        ))}
      </div>

      {tab==='assessments'&&(assessments.length===0?<div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center"><p className="text-sm text-slate-400">No assessments yet.</p></div>:(
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{assessments.map(a=>{
          const overdue=a.closeDate&&new Date(a.closeDate)<new Date();
          return (
            <div key={a.id} className={`bg-white rounded-xl border p-5 space-y-3 shadow-sm hover:shadow transition-shadow ${overdue?'border-rose-200':'border-slate-200'}`}>
              <div className="flex items-center justify-between">
                <StatusBadge status={a.assessmentType}/>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{a.timeLimitMinutes} min · {a.maxScore} pts</span>
                  <button type="button" onClick={()=>{setPickerSelected([]);setPickerOpen(a);}} className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors" title="Add questions from bank"><Plus className="w-3.5 h-3.5"/></button>
                  <button type="button" onClick={()=>setAttemptsOpen(a)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="View attempts"><Eye className="w-3.5 h-3.5"/></button>
                  <button type="button" onClick={()=>openEditA(a)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Pencil className="w-3.5 h-3.5"/></button>
                  <button type="button" onClick={()=>setDelA(a)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"><Trash2 className="w-3.5 h-3.5"/></button>
                </div>
              </div>
              <h3 className="text-sm font-bold text-slate-900">{a.title}</h3>
              {a.instructions&&<p className="text-xs text-slate-600 line-clamp-2">{a.instructions}</p>}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                <span>{a.assessmentQuestions?.length||0} questions</span>
                <span>{a.attempts?.length||0} attempts</span>
                {a.closeDate&&<span className={overdue?'text-rose-600 font-semibold':''}>{overdue?'Closed':'Closes'} {new Date(a.closeDate).toLocaleDateString()}</span>}
              </div>
            </div>
          );
        })}</div>
      ))}

      {tab==='banks'&&(isLoading?<LoadingState/>:banks.length===0?<div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center"><p className="text-sm text-slate-400">No question banks yet.</p></div>:(
        <div className="space-y-4">{banks.map(bank=>(
          <div key={bank.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div><h2 className="text-sm font-bold text-slate-900">{bank.title}</h2><p className="text-xs text-slate-500">Topic: {bank.topic}</p></div>
              <span className="text-xs font-bold text-blue-700">{bank.questions?.length||0} questions</span>
            </div>
            <div className="divide-y divide-slate-100">
              {(bank.questions||[]).length===0?<p className="px-5 py-3 text-xs text-slate-400 italic">No questions yet.</p>:(bank.questions||[]).map(q=>(
                <div key={q.id} className="px-5 py-3 text-xs flex items-start justify-between gap-3 hover:bg-slate-50">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-blue-700 uppercase text-[11px]">{q.questionType?.replace(/_/g,' ')}</span>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${diffCls[q.difficulty]||'bg-slate-100 text-slate-600 border-slate-200'}`}>{q.difficulty}</span>
                    </div>
                    <p className="font-semibold text-slate-900 truncate">{q.prompt}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold text-slate-600">{q.points}pt</span>
                    <button type="button" onClick={()=>setDelQ(q)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"><Trash2 className="w-3.5 h-3.5"/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}</div>
      ))}

      {/* Create/Edit Assessment Modal */}
      <ModalDialog isOpen={aOpen||Boolean(editA)} onClose={()=>{setAOpen(false);setEditA(null);}} title={editA?'Edit Assessment':'Create Assessment'} maxWidth="max-w-2xl"><AssessmentForm/></ModalDialog>

      {/* Create Question Bank Modal */}
      <ModalDialog isOpen={bOpen} onClose={()=>setBOpen(false)} title="Create Question Bank">
        <form onSubmit={handleSaveB} className="space-y-4 text-xs">
          <div><label className="block font-semibold mb-1.5">Course</label>
            <select required value={bForm.courseId} onChange={e=>setBForm({...bForm,courseId:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
              <option value="">— Select —</option>{allCourses.map(c=><option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}
            </select></div>
          <div><label className="block font-semibold mb-1.5">Bank Title</label><input required value={bForm.title} onChange={e=>setBForm({...bForm,title:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300"/></div>
          <div><label className="block font-semibold mb-1.5">Topic</label><input required value={bForm.topic} onChange={e=>setBForm({...bForm,topic:e.target.value})} placeholder="e.g., Network Security" className="w-full px-3 py-2 rounded-lg border border-slate-300"/></div>
          <div><label className="block font-semibold mb-1.5">Description</label><textarea rows={2} value={bForm.description} onChange={e=>setBForm({...bForm,description:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300"/></div>
          <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg">Create Bank</button>
        </form>
      </ModalDialog>

      {/* Add Question Modal */}
      <ModalDialog isOpen={qOpen} onClose={()=>setQOpen(false)} title="Add Question to Bank">
        <form onSubmit={handleSaveQ} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block font-semibold mb-1.5">Question Bank</label>
              <select required value={qForm.questionBankId} onChange={e=>setQForm({...qForm,questionBankId:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
                <option value="">— Select —</option>{banks.map(b=><option key={b.id} value={b.id}>{b.title}</option>)}
              </select></div>
            <div><label className="block font-semibold mb-1.5">Course</label>
              <select required value={qForm.courseId} onChange={e=>setQForm({...qForm,courseId:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
                <option value="">— Select —</option>{allCourses.map(c=><option key={c.id} value={c.id}>{c.code}</option>)}
              </select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block font-semibold mb-1.5">Type</label>
              <select value={qForm.questionType} onChange={e=>setQForm({...qForm,questionType:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
                <option value="multiple_choice">Multiple Choice</option><option value="true_false">True / False</option><option value="matching">Matching</option><option value="multiple_select">Multiple Select</option>
              </select></div>
            <div><label className="block font-semibold mb-1.5">Difficulty</label>
              <select value={qForm.difficulty} onChange={e=>setQForm({...qForm,difficulty:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
                <option value="Easy">Easy</option><option value="Medium">Medium</option><option value="Hard">Hard</option>
              </select></div>
          </div>
          <div><label className="block font-semibold mb-1.5">Topic</label><input value={qForm.topic} onChange={e=>setQForm({...qForm,topic:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300"/></div>
          <div><label className="block font-semibold mb-1.5">Points</label><input type="number" value={qForm.points} onChange={e=>setQForm({...qForm,points:Number(e.target.value)})} className="w-full px-3 py-2 rounded-lg border border-slate-300"/></div>
          <div><label className="block font-semibold mb-1.5">Question Prompt</label><textarea required rows={3} value={qForm.prompt} onChange={e=>setQForm({...qForm,prompt:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300"/></div>
          <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg">Save Question</button>
        </form>
      </ModalDialog>

      <ConfirmModal isOpen={Boolean(delA)} onClose={()=>setDelA(null)} onConfirm={handleDelA} title="Delete Assessment" message={`Delete "${delA?.title}"?`}/>
      <ConfirmModal isOpen={Boolean(delQ)} onClose={()=>setDelQ(null)} onConfirm={handleDelQ} title="Archive Question" message={`Archive this question?`}/>

      {/* Question Picker Modal — add questions from bank to assessment */}
      <ModalDialog isOpen={Boolean(pickerOpen)} onClose={()=>setPickerOpen(null)} title={`Add Questions to: ${pickerOpen?.title}`} maxWidth="max-w-2xl">
        <div className="space-y-4 text-xs">
          <p className="text-slate-500">Select questions from your question banks to add to this assessment.</p>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {banks.map(bank=>(
              <div key={bank.id}>
                <p className="font-bold text-slate-700 mb-2 sticky top-0 bg-white py-1">{bank.title}</p>
                {(bank.questions||[]).map(q=>(
                  <label key={q.id} className="flex items-start gap-3 p-2.5 rounded-lg border border-slate-200 mb-1.5 hover:bg-slate-50 cursor-pointer">
                    <input type="checkbox" className="mt-0.5 rounded" checked={pickerSelected.includes(q.id)} onChange={()=>setPickerSelected(p=>p.includes(q.id)?p.filter(x=>x!==q.id):[...p,q.id])}/>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono text-blue-700 uppercase text-[10px]">{q.questionType?.replace(/_/g,' ')}</span>
                        <span className="text-slate-500">· {q.difficulty} · {q.points}pt</span>
                      </div>
                      <p className="text-slate-900 truncate">{q.prompt}</p>
                    </div>
                  </label>
                ))}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
            <span className="text-slate-500">{pickerSelected.length} selected</span>
            <button type="button" disabled={pickerSelected.length===0} onClick={async()=>{
              try {
                await lmsApi.updateAssessment(pickerOpen.id,{ questionIds:pickerSelected });
                addToast(`${pickerSelected.length} questions added.`); setPickerOpen(null);
                queryClient.invalidateQueries({queryKey:['assessments']});
              } catch(err){addToast(extractErrorMessage(err),'error');}
            }} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-40">Add to Assessment</button>
          </div>
        </div>
      </ModalDialog>

      {/* Attempt History Modal */}
      <ModalDialog isOpen={Boolean(attemptsOpen)} onClose={()=>setAttemptsOpen(null)} title={`Attempts — ${attemptsOpen?.title}`} maxWidth="max-w-2xl">
        <div className="text-xs space-y-3">
          {(attemptsOpen?.attempts||[]).length===0?(<p className="text-slate-400 py-6 text-center">No attempts recorded yet.</p>):(
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] tracking-wide border-b border-slate-200">
                  <tr><th className="px-3 py-2">Student</th><th className="px-3 py-2">Attempt #</th><th className="px-3 py-2">Score</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Submitted</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(attemptsOpen?.attempts||[]).map(at=>(
                    <tr key={at.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-semibold text-slate-900">{at.student?.firstName||'—'} {at.student?.lastName||''}</td>
                      <td className="px-3 py-2 text-slate-500">#{at.attemptNumber}</td>
                      <td className="px-3 py-2 font-mono font-bold">{at.totalScore!=null?`${at.totalScore}/${attemptsOpen.maxScore}`:'—'}</td>
                      <td className="px-3 py-2"><StatusBadge status={at.status}/></td>
                      <td className="px-3 py-2 text-slate-400">{at.submittedAt?new Date(at.submittedAt).toLocaleString():'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </ModalDialog>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   6. GRADEBOOK — with edit grade categories weights modal
══════════════════════════════════════════════════════════════ */
export function InstructorGradebookPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [selClass, setSelClass] = useState(null);
  const [manOpen, setManOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [studentDetailOpen, setStudentDetailOpen] = useState(null);
  const [manForm, setManForm] = useState({ gradeCategoryId:'', studentId:'', itemTitle:'', score:90, maxScore:100, reason:'' });
  const [catForm, setCatForm] = useState([]);

  const { data: clsData } = useQuery({ queryKey:['classes'], queryFn:lmsApi.listClasses });
  const { data: gbData, isLoading } = useQuery({ queryKey:['gradebook',selClass], queryFn:()=>lmsApi.getClassGradebook(selClass), enabled:Boolean(selClass) });

  const classes = clsData?.data?.classes||[];
  const gb = gbData?.data||{};

  // Grade distribution chart data
  const distData = ['A','B','C','D','F'].map(letter => ({
    grade: letter,
    count: (gb.students||[]).filter(s => s.letterGrade === letter).length
  }));

  const openCat = () => { setCatForm((gb.categories||[]).map(c=>({id:c.id,name:c.name,categoryType:c.categoryType,weightPercent:c.weightPercent}))); setCatOpen(true); };

  const handleManual = async (e) => {
    e.preventDefault();
    try { await lmsApi.recordManualGrade(selClass, { ...manForm, gradeCategoryId:Number(manForm.gradeCategoryId), studentId:Number(manForm.studentId) }); addToast('Grade recorded.'); setManOpen(false); queryClient.invalidateQueries({ queryKey:['gradebook',selClass] }); }
    catch (err) { addToast(extractErrorMessage(err),'error'); }
  };
  const handleSaveCat = async (e) => {
    e.preventDefault();
    const total = catForm.reduce((s,c)=>s+Number(c.weightPercent),0);
    if (Math.abs(total-100)>0.01) { addToast(`Weights must sum to 100% (currently ${total.toFixed(1)}%)`, 'error'); return; }
    try { await lmsApi.updateGradeCategories(selClass, catForm); addToast('Grade categories updated.'); setCatOpen(false); queryClient.invalidateQueries({ queryKey:['gradebook',selClass] }); }
    catch (err) { addToast(extractErrorMessage(err),'error'); }
  };
  const handleSubmitFinal = async () => {
    try { const r = await lmsApi.submitFinalGrades(selClass); addToast(r.message); queryClient.invalidateQueries({ queryKey:['gradebook',selClass] }); }
    catch (err) { addToast(extractErrorMessage(err),'error'); }
  };

  const gradeColor = (pct) => pct>=75?'text-emerald-700':pct>=50?'text-amber-700':'text-rose-700';

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200">
        <div><Badge label="Weighted Gradebook" color="rose" icon={Award}/><h1 className="text-2xl font-bold text-slate-900 tracking-tight">Class Gradebook</h1><p className="text-sm text-slate-500 mt-1">Weighted calculations with auditable revision history.</p></div>
        <div className="flex gap-2 flex-wrap">
          <a href={`/api/reports?type=gradebook&classId=${selClass}&format=csv`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg"><FileDown className="w-4 h-4"/> CSV</a>
          <button type="button" onClick={openCat} disabled={!selClass} className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg disabled:opacity-40"><Pencil className="w-4 h-4"/> Edit Weights</button>
          <button type="button" onClick={()=>setManOpen(true)} disabled={!selClass} className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg disabled:opacity-40"><Plus className="w-4 h-4"/> Enter Grade</button>
          <button type="button" onClick={handleSubmitFinal} disabled={!selClass} className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg disabled:opacity-40"><Send className="w-4 h-4"/> Submit Final</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 flex-wrap">{classes.map(c=>(
          <button key={c.id} type="button" onClick={()=>setSelClass(c.id)} className={`px-4 py-2 rounded-lg text-xs font-bold border transition-colors ${selClass===c.id?'bg-blue-600 text-white border-blue-600':'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>{c.sectionCode}</button>
        ))}</div>
        {selClass&&<div className="flex items-center gap-2 text-xs"><span className="text-slate-500">Status:</span><StatusBadge status={gb.finalGradesStatus||'in_progress'}/></div>}
      </div>

      {!selClass?(<div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center"><Users className="w-10 h-10 text-slate-300 mx-auto mb-3"/><p className="text-sm font-semibold text-slate-500">Select a class above to view its gradebook.</p></div>):(
        <>
          {(gb.categories||[]).length>0&&<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{(gb.categories||[]).map(cat=>(
            <div key={cat.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-[11px] font-semibold uppercase text-slate-500">{cat.categoryType}</p>
              <p className="text-xs font-bold text-slate-900 mt-0.5">{cat.name}</p>
              <p className="text-xl font-extrabold text-blue-600 mt-1">{cat.weightPercent}%</p>
              <ProgressBar value={cat.weightPercent} color="bg-blue-500" height="h-1.5"/>
            </div>
          ))}</div>}

          {isLoading?<LoadingState/>:(
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] tracking-wide border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Student</th>
                      {(gb.categories||[]).map(cat=><th key={cat.id} className="px-4 py-3">{cat.name} ({cat.weightPercent}%)</th>)}
                      <th className="px-4 py-3">Standing</th><th className="px-4 py-3">Grade</th><th className="px-4 py-3">Remarks</th><th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(gb.students||[]).length===0?<tr><td colSpan={5+(gb.categories||[]).length} className="px-4 py-10 text-center text-slate-400">No student records.</td></tr>:(gb.students||[]).map(st=>(
                      <tr key={st.studentId} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3"><p className="font-bold text-slate-900">{st.studentName}</p><p className="font-mono text-slate-400">{st.studentNumber}</p></td>
                        {(gb.categories||[]).map(cat=>{const b=st.categoryBreakdown?.[cat.id];return<td key={cat.id} className="px-4 py-3 font-mono">{b?.percentage!=null?`${b.percentage}%`:'—'}</td>;})}
                        <td className={`px-4 py-3 font-mono font-bold text-sm ${gradeColor(st.standingPercentage)}`}>{st.standingPercentage!=null?`${st.standingPercentage}%`:'—'}</td>
                        <td className="px-4 py-3 font-bold">{st.institutionalGrade?`${st.institutionalGrade} (${st.letterGrade})`:'—'}</td>
                        <td className="px-4 py-3"><StatusBadge status={st.isPassing?'active':'warning'}/></td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5">
                            <button type="button" onClick={()=>setStudentDetailOpen(st)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="View detail"><Eye className="w-3.5 h-3.5"/></button>
                            <a href={`/api/reports?type=gradebook&classId=${selClass}&studentId=${st.studentId}&format=csv`} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="Export student grade CSV"><FileDown className="w-3.5 h-3.5"/></a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(gb.history||[]).length>0&&<div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-3"><History className="w-4 h-4 text-blue-600"/><h3 className="text-sm font-bold text-slate-900">Grade Revision Audit Trail</h3></div>
            <div className="space-y-2 max-h-64 overflow-y-auto">{(gb.history||[]).map(h=>(
              <div key={h.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center justify-between gap-3">
                <div><p className="font-bold text-slate-900">Student #{h.studentId}: {h.previousScore??'None'} → {h.newScore}</p><p className="text-slate-500 mt-0.5">{h.reason}</p></div>
                <span className="text-slate-400 shrink-0">{new Date(h.createdAt).toLocaleString()}</span>
              </div>
            ))}</div>
          </div>}
        </>
      )}

      {/* Edit Categories Modal */}
      <ModalDialog isOpen={catOpen} onClose={()=>setCatOpen(false)} title="Edit Grade Category Weights">
        <form onSubmit={handleSaveCat} className="space-y-4 text-xs">
          <p className="text-slate-500">Weights must total exactly 100%.</p>
          {catForm.map((cat,i)=>(
            <div key={cat.id} className="flex items-center gap-3">
              <div className="flex-1"><label className="block font-semibold mb-1">{cat.name}</label><input value={cat.name} onChange={e=>setCatForm(f=>f.map((c,j)=>j===i?{...c,name:e.target.value}:c))} className="w-full px-3 py-2 rounded-lg border border-slate-300"/></div>
              <div className="w-24"><label className="block font-semibold mb-1">Weight %</label><input type="number" min="0" max="100" value={cat.weightPercent} onChange={e=>setCatForm(f=>f.map((c,j)=>j===i?{...c,weightPercent:Number(e.target.value)}:c))} className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-blue-700"/></div>
            </div>
          ))}
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-600">Total:</span>
            <span className={`${Math.abs(catForm.reduce((s,c)=>s+Number(c.weightPercent),0)-100)<0.01?'text-emerald-600':'text-rose-600'}`}>{catForm.reduce((s,c)=>s+Number(c.weightPercent),0).toFixed(1)}%</span>
          </div>
          <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg">Save Category Weights</button>
        </form>
      </ModalDialog>

      {/* Manual Grade Modal */}
      <ModalDialog isOpen={manOpen} onClose={()=>setManOpen(false)} title="Record / Revise Grade">
        <form onSubmit={handleManual} className="space-y-4 text-xs">
          <div><label className="block font-semibold mb-1.5">Student</label>
            <select required value={manForm.studentId} onChange={e=>setManForm({...manForm,studentId:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
              <option value="">— Select —</option>{(gb.students||[]).map(s=><option key={s.studentId} value={s.studentId}>{s.studentName}</option>)}
            </select></div>
          <div><label className="block font-semibold mb-1.5">Category</label>
            <select required value={manForm.gradeCategoryId} onChange={e=>setManForm({...manForm,gradeCategoryId:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
              <option value="">— Select —</option>{(gb.categories||[]).map(c=><option key={c.id} value={c.id}>{c.name} ({c.weightPercent}%)</option>)}
            </select></div>
          <div><label className="block font-semibold mb-1.5">Activity Title</label><input required value={manForm.itemTitle} onChange={e=>setManForm({...manForm,itemTitle:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300"/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block font-semibold mb-1.5">Score</label><input type="number" required value={manForm.score} onChange={e=>setManForm({...manForm,score:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300"/></div>
            <div><label className="block font-semibold mb-1.5">Max Score</label><input type="number" required value={manForm.maxScore} onChange={e=>setManForm({...manForm,maxScore:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300"/></div>
          </div>
          <div><label className="block font-semibold mb-1.5">Audit Reason</label><input required value={manForm.reason} onChange={e=>setManForm({...manForm,reason:e.target.value})} placeholder="Reason for this entry or revision…" className="w-full px-3 py-2 rounded-lg border border-slate-300"/></div>
          <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg">Save & Log</button>
        </form>
      </ModalDialog>

      {/* Grade Distribution Chart */}
      {selClass && (gb.students||[]).length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <SecHead title="Class Standing Distribution" sub="Grade letter breakdown for this class"/>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distData} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                <XAxis dataKey="grade" tick={{fontSize:12,fill:'#64748b'}} axisLine={false} tickLine={false}/>
                <YAxis allowDecimals={false} tick={{fontSize:11,fill:'#64748b'}} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{fontSize:12,borderRadius:8,border:'1px solid #e2e8f0'}}/>
                <Bar dataKey="count" radius={[6,6,0,0]}>
                  {distData.map((d,i)=><Cell key={i} fill={['#059669','#2563eb','#d97706','#f97316','#dc2626'][i]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Student Detail Modal */}
      <ModalDialog isOpen={Boolean(studentDetailOpen)} onClose={()=>setStudentDetailOpen(null)} title={`Student Detail — ${studentDetailOpen?.studentName}`} maxWidth="max-w-xl">
        {studentDetailOpen && <div className="text-xs space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-center"><p className={`text-2xl font-bold ${gradeColor(studentDetailOpen.standingPercentage)}`}>{studentDetailOpen.standingPercentage!=null?`${studentDetailOpen.standingPercentage}%`:'—'}</p><p className="text-slate-500 mt-0.5">Standing</p></div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center"><p className="text-2xl font-bold text-slate-900">{studentDetailOpen.institutionalGrade||'—'}</p><p className="text-slate-500 mt-0.5">Grade</p></div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center"><p className="text-2xl font-bold text-slate-900">{studentDetailOpen.letterGrade||'—'}</p><p className="text-slate-500 mt-0.5">Letter</p></div>
          </div>
          <div>
            <p className="font-semibold text-slate-700 mb-2">Category Breakdown</p>
            <div className="space-y-2">{(gb.categories||[]).map(cat=>{const b=studentDetailOpen.categoryBreakdown?.[cat.id];return(<div key={cat.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200"><span className="font-medium text-slate-700">{cat.name} ({cat.weightPercent}%)</span><span className="font-mono font-bold text-blue-700">{b?.percentage!=null?`${b.percentage}%`:'—'}</span></div>);})}</div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={studentDetailOpen.isPassing?'active':'warning'}/>
            <span className="text-slate-500">{studentDetailOpen.remarks}</span>
          </div>
        </div>}
      </ModalDialog>
    </div>
  );
}
/* ══════════════════════════════════════════════════════════════
   7. CLASS MANAGEMENT — instructor-specific roster + certificates
══════════════════════════════════════════════════════════════ */
export function InstructorClassManagementPage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [selId, setSelId] = useState(null);
  const [certStudent, setCertStudent] = useState(null);
  const [attendTab, setAttendTab] = useState('roster'); // 'roster' | 'attendance'
  const [newSession, setNewSession] = useState(false);
  const [sessionForm, setSessionForm] = useState({ sessionDate: new Date().toISOString().slice(0,10), topic: '' });
  const [activeSession, setActiveSession] = useState(null); // session being marked
  const [attendRecords, setAttendRecords] = useState({}); // { studentId: 'present'|'absent'|'late'|'excused' }
  const [progressStudent, setProgressStudent] = useState(null);

  const { data: clsData, isLoading: clsLoading } = useQuery({ queryKey:['classes'], queryFn:lmsApi.listClasses });
  const { data: detailData, isLoading: detailLoading } = useQuery({ queryKey:['class',selId], queryFn:()=>lmsApi.getClassById(selId), enabled:Boolean(selId) });
  const { data: attendData, refetch: refetchAttend } = useQuery({ queryKey:['attendance',selId], queryFn:()=>lmsApi.listAttendanceSessions({ classId:selId }), enabled:Boolean(selId) });
  const { data: attendSummaryData } = useQuery({ queryKey:['attendance-summary',selId], queryFn:()=>lmsApi.getAttendanceSummary({ classId:selId }), enabled:Boolean(selId) });

  const classes = clsData?.data?.classes||[];
  const cls = detailData?.data?.classSection;
  const sessions = attendData?.data?.sessions||[];
  const attendSummary = attendSummaryData?.data?.summary||[];

  const handleIssueCert = async () => {
    if (!certStudent) return;
    try { await lmsApi.issueCertificate({ classId:selId, studentId:certStudent.id }); addToast('Certificate issued.'); setCertStudent(null); queryClient.invalidateQueries({ queryKey:['class',selId] }); }
    catch (err) { addToast(extractErrorMessage(err),'error'); }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    try {
      const res = await lmsApi.createAttendanceSession({ classId: selId, ...sessionForm });
      addToast('Session created. Mark attendance below.');
      setNewSession(false);
      // Pre-populate from the created session
      const records = {};
      (res.data.session.records||[]).forEach(r => { records[r.studentId] = r.status; });
      setAttendRecords(records);
      setActiveSession(res.data.session);
      refetchAttend();
      queryClient.invalidateQueries({ queryKey:['attendance-summary',selId] });
    } catch (err) { addToast(extractErrorMessage(err),'error'); }
  };

  const handleSaveAttend = async () => {
    if (!activeSession) return;
    const records = Object.entries(attendRecords).map(([studentId, status]) => ({ studentId: Number(studentId), status }));
    try {
      await lmsApi.saveAttendanceRecords(activeSession.id, records);
      addToast('Attendance saved.'); setActiveSession(null); setAttendRecords({});
      refetchAttend();
      queryClient.invalidateQueries({ queryKey:['attendance-summary',selId] });
    } catch (err) { addToast(extractErrorMessage(err),'error'); }
  };

  const openSession = (session) => {
    const records = {};
    (session.records||[]).forEach(r => { records[r.studentId] = r.status; });
    setAttendRecords(records);
    setActiveSession(session);
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="pb-5 border-b border-slate-200">
        <Badge label="Class Management" color="blue" icon={Users}/>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Class Management</h1>
        <p className="text-sm text-slate-500 mt-1">View assigned class sections, rosters, grade weights, and issue certificates.</p>
      </div>

      {clsLoading?<LoadingState/>:classes.length===0?(<div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center"><Users className="w-10 h-10 text-slate-300 mx-auto mb-3"/><p className="text-sm font-semibold text-slate-500">No classes assigned to you yet.</p></div>):(
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {classes.map(c=>(
            <button key={c.id} type="button" onClick={()=>setSelId(c.id)} className={`text-left p-4 rounded-xl border-2 transition-all ${selId===c.id?'border-blue-500 bg-blue-50 shadow-sm':'border-slate-200 bg-white hover:border-slate-300'}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="font-mono font-bold text-blue-700 text-sm">{c.sectionCode}</span>
                <StatusBadge status={c.finalGradesStatus||'in_progress'}/>
              </div>
              <p className="text-xs font-semibold text-slate-900 truncate">{c.courseOffering?.course?.title}</p>
              <p className="text-[11px] text-slate-500 mt-1">{c.memberships?.length||0} students · {c.schedule||'No schedule'}</p>
            </button>
          ))}
        </div>
      )}

      {selId&&(detailLoading?<LoadingState/>:cls&&(
        <div className="space-y-4">
          {/* Class Info */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">{cls.sectionCode} — {cls.courseOffering?.course?.title}</h2>
                <p className="text-xs text-slate-500 mt-0.5">Room: {cls.room||'TBA'} · Schedule: {cls.schedule||'TBA'}</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="text-center"><p className="text-lg font-bold text-blue-600">{cls.memberships?.length||0}</p><p className="text-slate-500">Students</p></div>
                <div className="w-px h-8 bg-slate-200"/>
                <div className="text-center"><p className="text-lg font-bold text-emerald-600">{cls.gradeCategories?.length||0}</p><p className="text-slate-500">Grade Cats</p></div>
              </div>
            </div>
            {/* Grade Categories summary */}
            {(cls.gradeCategories||[]).length>0&&<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{(cls.gradeCategories||[]).map(cat=>(
              <div key={cat.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <p className="font-bold text-slate-900">{cat.name}</p>
                <p className="text-blue-600 font-extrabold text-base mt-0.5">{cat.weightPercent}%</p>
              </div>
            ))}</div>}
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
            {[['roster','Roster'],['attendance','Attendance']].map(([v,l])=>(
              <button key={v} type="button" onClick={()=>setAttendTab(v)} className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors ${attendTab===v?'bg-white text-blue-700 shadow-sm':'text-slate-600 hover:text-slate-800'}`}>{l}</button>
            ))}
          </div>

          {/* Roster */}
          {attendTab==='roster'&&<div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Class Roster ({cls.memberships?.length||0} students)</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] tracking-wide border-b border-slate-200">
                  <tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Student No.</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Certificate</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(cls.memberships||[]).length===0?<tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No students enrolled.</td></tr>:(cls.memberships||[]).map(m=>(
                    <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-900">{m.student?.firstName} {m.student?.lastName}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">{m.student?.studentNumber||'—'}</td>
                      <td className="px-4 py-3 text-slate-500">{m.student?.email}</td>
                      <td className="px-4 py-3"><StatusBadge status={m.status}/></td>
                      <td className="px-4 py-3">
                        {m.finalLetterGrade?(<button type="button" onClick={()=>setCertStudent(m.student)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-[11px] flex items-center gap-1"><Award className="w-3 h-3"/> Issue Cert</button>):(<span className="text-slate-400 text-[11px]">No final grade</span>)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>}

          {/* Attendance Panel */}
          {attendTab==='attendance'&&<div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Attendance Sessions ({sessions.length})</h2>
              <button type="button" onClick={()=>setNewSession(true)} className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"><Plus className="w-3.5 h-3.5"/> New Session</button>
            </div>

            {/* Active session marker */}
            {activeSession&&<div className="bg-white rounded-xl border border-blue-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div><h3 className="text-sm font-bold text-slate-900">Marking: {activeSession.sessionDate}</h3><p className="text-xs text-slate-500 mt-0.5">{activeSession.topic}</p></div>
                <button type="button" onClick={handleSaveAttend} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg">Save Attendance</button>
              </div>
              <div className="space-y-2">{(cls?.memberships||[]).map(m=>(
                <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <span className="font-semibold text-slate-900">{m.student?.firstName} {m.student?.lastName}</span>
                  <div className="flex gap-1">
                    {['present','late','excused','absent'].map(s=>(
                      <button key={s} type="button" onClick={()=>setAttendRecords(p=>({...p,[m.studentId]:s}))}
                        className={`px-2.5 py-1 rounded-lg font-semibold capitalize transition-colors ${attendRecords[m.studentId]===s?({'present':'bg-emerald-600 text-white','late':'bg-amber-500 text-white','excused':'bg-blue-500 text-white','absent':'bg-rose-600 text-white'}[s]):'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}>{s}</button>
                    ))}
                  </div>
                </div>
              ))}</div>
            </div>}

            {/* Sessions list */}
            {sessions.length===0?<p className="text-xs text-slate-400 italic">No sessions yet. Click New Session to start.</p>:(
              <div className="space-y-2">{sessions.map(sess=>(
                <div key={sess.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
                  <div><p className="text-xs font-bold text-slate-900">{sess.sessionDate}</p><p className="text-[11px] text-slate-500 mt-0.5">{sess.topic||'No topic'} · {(sess.records||[]).length} records</p></div>
                  <button type="button" onClick={()=>openSession(sess)} className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg">Edit</button>
                </div>
              ))}</div>
            )}

            {/* Attendance Summary */}
            {attendSummary.length>0&&<div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-200"><h3 className="text-sm font-bold text-slate-900">Attendance Summary ({attendSummaryData?.data?.totalSessions||0} sessions)</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] border-b border-slate-200">
                    <tr><th className="px-4 py-2">Student</th><th className="px-4 py-2">Present</th><th className="px-4 py-2">Late</th><th className="px-4 py-2">Excused</th><th className="px-4 py-2">Absent</th><th className="px-4 py-2">Rate</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">{attendSummary.map(s=>(
                    <tr key={s.studentId} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-semibold text-slate-900">{s.studentName}</td>
                      <td className="px-4 py-2 text-emerald-700 font-bold">{s.present}</td>
                      <td className="px-4 py-2 text-amber-700">{s.late}</td>
                      <td className="px-4 py-2 text-blue-700">{s.excused}</td>
                      <td className="px-4 py-2 text-rose-700">{s.absent}</td>
                      <td className="px-4 py-2"><span className={`font-bold ${s.attendanceRate>=80?'text-emerald-700':s.attendanceRate>=60?'text-amber-700':'text-rose-700'}`}>{s.attendanceRate}%</span></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>}
          </div>}
        </div>
      ))}

      {/* New Session Modal */}
      <ModalDialog isOpen={newSession} onClose={()=>setNewSession(false)} title="Create Attendance Session">
        <form onSubmit={handleCreateSession} className="space-y-4 text-xs">
          <div><label className="block font-semibold mb-1.5">Session Date</label><input required type="date" value={sessionForm.sessionDate} onChange={e=>setSessionForm({...sessionForm,sessionDate:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300"/></div>
          <div><label className="block font-semibold mb-1.5">Topic / Lesson</label><input value={sessionForm.topic} onChange={e=>setSessionForm({...sessionForm,topic:e.target.value})} placeholder="e.g., Module 3 Lab — OSPF" className="w-full px-3 py-2 rounded-lg border border-slate-300"/></div>
          <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg">Create Session</button>
        </form>
      </ModalDialog>

      <ModalDialog isOpen={Boolean(certStudent)} onClose={()=>setCertStudent(null)} title="Issue Certificate">
        {certStudent&&<div className="text-xs space-y-4">
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
            <p className="font-bold text-emerald-900">{certStudent.firstName} {certStudent.lastName}</p>
            <p className="text-emerald-700 mt-0.5">{certStudent.email}</p>
          </div>
          <p className="text-slate-600">A certificate of completion will be issued and the student will be notified.</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={()=>setCertStudent(null)} className="px-4 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 hover:bg-slate-50">Cancel</button>
            <button type="button" onClick={handleIssueCert} className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white">Issue Certificate</button>
          </div>
        </div>}
      </ModalDialog>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   3. ASSIGNMENTS — full CRUD with edit + delete
══════════════════════════════════════════════════════════════ */
