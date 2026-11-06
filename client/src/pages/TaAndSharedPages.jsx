import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users, ClipboardCheck, Flag, MessageSquare, Megaphone, Send,
  FileSpreadsheet, Download, Plus, CheckCircle2, AlertTriangle,
  Pencil, Trash2, Search, BookOpen
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
  const [newOpen, setNewOpen] = useState(false);
  const [delThread, setDelThread] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [threadForm, setThreadForm] = useState({ classId:'', title:'', body:'', category:'laboratory_help' });
  const [replyText, setReplyText] = useState({});

  const { data, isLoading } = useQuery({ queryKey:['discussions'], queryFn:()=>lmsApi.listDiscussions() });
  const { data: clsData } = useQuery({ queryKey:['classes'], queryFn:lmsApi.listClasses });
  const allClasses = clsData?.data?.classes||[];

  const handleCreate = async (e) => {
    e.preventDefault();
    try { await lmsApi.createDiscussion({ ...threadForm, classId:Number(threadForm.classId) }); addToast('Discussion posted.'); setNewOpen(false); queryClient.invalidateQueries({ queryKey:['discussions'] }); }
    catch (err) { addToast(extractErrorMessage(err),'error'); }
  };
  const handleReply = async (threadId) => {
    const body = replyText[threadId];
    if (!body?.trim()) return;
    try { await lmsApi.replyDiscussion(threadId,{ body }); setReplyText(p=>({...p,[threadId]:''})); addToast('Reply posted.'); queryClient.invalidateQueries({ queryKey:['discussions'] }); }
    catch (err) { addToast(extractErrorMessage(err),'error'); }
  };
  const handleToggle = async (t, field) => {
    try { await lmsApi.updateDiscussionStatus(t.id,{ [field]:!t[field], ...(field==='isEscalated'?{escalationNote:'Escalated by TA for Instructor review'}:{}) }); addToast('Status updated.'); queryClient.invalidateQueries({ queryKey:['discussions'] }); }
    catch (err) { addToast(extractErrorMessage(err),'error'); }
  };
  const handleDelete = async () => {
    try { await lmsApi.deleteDiscussion(delThread.id); addToast('Thread deleted.'); setDelThread(null); queryClient.invalidateQueries({ queryKey:['discussions'] }); }
    catch (err) { addToast(extractErrorMessage(err),'error'); }
  };

  const all = data?.data?.threads||[];
  const counts = { all:all.length, open:all.filter(t=>!t.isResolved).length, resolved:all.filter(t=>t.isResolved).length, escalated:all.filter(t=>t.isEscalated).length };
  const filtered = all.filter(t=>{
    const mf=filter==='all'?true:filter==='open'?!t.isResolved:filter==='resolved'?t.isResolved:filter==='escalated'?t.isEscalated:true;
    const ms=!search||`${t.title} ${t.body}`.toLowerCase().includes(search.toLowerCase());
    return mf&&ms;
  });
  const isStaff = ['instructor','teaching_assistant','academic_admin','super_admin'].includes(user?.primaryRole);

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200">
        <div><span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md mb-2"><MessageSquare className="w-3.5 h-3.5"/> Collaborative Q&A</span><h1 className="text-2xl font-bold text-slate-900 tracking-tight">Discussions & Support</h1><p className="text-sm text-slate-500 mt-1">Class questions, troubleshooting, and endorsed answers.</p></div>
        <button type="button" onClick={()=>setNewOpen(true)} className="self-start inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"><Plus className="w-4 h-4"/> Ask a Question</button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[{label:'Total',v:counts.all,cl:'bg-slate-50 border-slate-200 text-slate-700'},{label:'Open',v:counts.open,cl:'bg-amber-50 border-amber-200 text-amber-700'},{label:'Resolved',v:counts.resolved,cl:'bg-emerald-50 border-emerald-200 text-emerald-700'},{label:'Escalated',v:counts.escalated,cl:'bg-rose-50 border-rose-200 text-rose-700'},{label:'Unanswered',v:all.filter(t=>!t.isResolved&&(t.posts||[]).length===0).length,cl:'bg-violet-50 border-violet-200 text-violet-700'}].map(k=>(
          <div key={k.label} className={`p-4 rounded-xl border ${k.cl}`}><p className="text-2xl font-bold">{k.v}</p><p className="text-xs font-medium mt-0.5 text-slate-600">{k.label}</p></div>
        ))}
      </div>
      {/* Analytics — most active threads */}
      {isStaff && all.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs font-bold text-slate-700 mb-3">Most Active Threads</p>
          <div className="space-y-2">{[...all].sort((a,b)=>(b.posts?.length||0)-(a.posts?.length||0)).slice(0,3).map(t=>(
            <div key={t.id} className="flex items-center justify-between text-xs">
              <span className="truncate text-slate-700 flex-1 mr-3">{t.title}</span>
              <span className="shrink-0 font-bold text-blue-700">{t.posts?.length||0} replies</span>
            </div>
          ))}</div>
        </div>
      )}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {[['all','All',counts.all],['open','Open',counts.open],['resolved','Resolved',counts.resolved],['escalated','Escalated',counts.escalated]].map(([v,l,c])=>(
            <button key={v} type="button" onClick={()=>setFilter(v)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${filter===v?'bg-blue-600 text-white border-blue-600':'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{l} ({c})</button>
          ))}
        </div>
        <div className="relative ml-auto w-full sm:w-56"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"/></div>
      </div>
      {isLoading?<LoadingState/>:filtered.length===0?(<div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center"><MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3"/><p className="text-sm font-semibold text-slate-500">No discussions found.</p></div>):(
        <div className="space-y-3">{filtered.map(t=>{
          const isOpen=expanded[t.id]!==false;
          return (
            <div key={t.id} className={`bg-white rounded-xl border shadow-sm hover:shadow transition-shadow ${t.isEscalated?'border-amber-300':t.isResolved?'border-emerald-200':'border-slate-200'}`}>
              <button type="button" onClick={()=>setExpanded(p=>({...p,[t.id]:p[t.id]===false}))} className="w-full p-5 text-left hover:bg-slate-50 transition-colors rounded-t-xl">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={t.category}/>
                    {t.isResolved&&<span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200"><CheckCircle2 className="w-3 h-3"/> Resolved</span>}
                    {t.isEscalated&&<span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">⚑ Escalated</span>}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400"><span>{(t.posts||[]).length} replies</span><span>{isOpen?'▲':'▼'}</span></div>
                </div>
                <h3 className="text-sm font-bold text-slate-900">{t.title}</h3>
                <p className="text-xs text-slate-600 mt-1 line-clamp-2">{t.body}</p>
                <p className="text-[11px] text-slate-400 mt-2">{t.author?.firstName} {t.author?.lastName} · {t.classSection?.sectionCode} · {new Date(t.createdAt).toLocaleDateString()}</p>
              </button>
              {isOpen&&<div className="px-5 pb-5 border-t border-slate-100 space-y-4 pt-4">
                {isStaff&&<div className="flex items-center gap-2 flex-wrap">
                  <button type="button" onClick={()=>handleToggle(t,'isResolved')} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${t.isResolved?'bg-slate-100 text-slate-600 hover:bg-slate-200':'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'}`}>{t.isResolved?'Mark Unresolved':'✓ Mark Resolved'}</button>
                  <button type="button" onClick={()=>handleToggle(t,'isEscalated')} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${t.isEscalated?'bg-amber-100 text-amber-800 hover:bg-amber-200':'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{t.isEscalated?'Clear Escalation':'⚑ Escalate'}</button>
                  {(t.authorId===user?.id||user?.roles?.includes('super_admin')||user?.roles?.includes('instructor'))&&<button type="button" onClick={()=>setDelThread(t)} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors flex items-center gap-1"><Trash2 className="w-3 h-3"/> Delete</button>}
                </div>}
                {(t.posts||[]).length===0?<p className="text-xs text-slate-400 italic">No replies yet.</p>:(
                  <div className="space-y-2 pl-4 border-l-2 border-slate-200">{(t.posts||[]).map(post=>(
                    <div key={post.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                      <div className="flex items-center justify-between mb-1"><span className="font-bold text-slate-900">{post.author?.firstName} {post.author?.lastName}</span>
                          <div className="flex items-center gap-2">
                            {post.isInstructorEndorsed&&<span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"><CheckCircle2 className="w-3 h-3"/> Faculty Endorsed</span>}
                            {isStaff&&<button type="button" onClick={async()=>{try{await lmsApi.endorseDiscussionPost(post.id);addToast(post.isInstructorEndorsed?'Endorsement removed.':'Reply endorsed as official answer.');queryClient.invalidateQueries({queryKey:['discussions']});}catch(err){addToast(extractErrorMessage(err),'error');}}} className={`p-1 rounded transition-colors ${post.isInstructorEndorsed?'text-emerald-600 hover:text-slate-400':'text-slate-400 hover:text-emerald-600'}`} title={post.isInstructorEndorsed?'Remove endorsement':'Endorse as official answer'}><CheckCircle2 className="w-3.5 h-3.5"/></button>}
                          </div>
                        </div>
                      <p className="text-slate-700 leading-relaxed">{post.body}</p>
                    </div>
                  ))}</div>
                )}
                <div className="flex gap-2 mt-2">
                  <input type="text" value={replyText[t.id]||''} onChange={e=>setReplyText(p=>({...p,[t.id]:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&handleReply(t.id)} placeholder="Write a reply… (Enter to send)" className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"/>
                  <button type="button" onClick={()=>handleReply(t.id)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shrink-0"><Send className="w-3.5 h-3.5"/> Reply</button>
                </div>
              </div>}
            </div>
          );
        })}</div>
      )}
      <ModalDialog isOpen={newOpen} onClose={()=>setNewOpen(false)} title="Start Discussion Thread">
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          <div><label className="block font-semibold mb-1.5">Class Section</label>
            <select required value={threadForm.classId} onChange={e=>setThreadForm({...threadForm,classId:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
              <option value="">— Select class —</option>{allClasses.map(c=><option key={c.id} value={c.id}>{c.sectionCode}</option>)}
            </select></div>
          <div><label className="block font-semibold mb-1.5">Category</label>
            <select value={threadForm.category} onChange={e=>setThreadForm({...threadForm,category:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
              <option value="laboratory_help">🔬 Laboratory Help</option><option value="technical_question">💻 Technical Question</option><option value="assignment_help">📝 Assignment Help</option><option value="general_discussion">💬 General</option>
            </select></div>
          <div><label className="block font-semibold mb-1.5">Title</label><input required value={threadForm.title} onChange={e=>setThreadForm(p=>({...p,title:e.target.value}))} placeholder="e.g., OSPF neighbor not forming" className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"/></div>
          <div><label className="block font-semibold mb-1.5">Details</label><textarea required rows={4} value={threadForm.body} onChange={e=>setThreadForm(p=>({...p,body:e.target.value}))} placeholder="Describe the issue in detail…" className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"/></div>
          <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg">Post Thread</button>
        </form>
      </ModalDialog>
      <div className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 ${delThread?'':'hidden'}`}>
        <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-sm p-6">
          <h2 className="text-base font-bold text-slate-900 mb-2">Delete Thread</h2>
          <p className="text-xs text-slate-600 mb-5">Delete "{delThread?.title}"? All replies will be removed.</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={()=>setDelThread(null)} className="px-4 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 hover:bg-slate-50">Cancel</button>
            <button type="button" onClick={handleDelete} className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white">Delete</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SharedMessagesPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { user } = useAuth();
  const [recipientId, setRecipientId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const { data: usersData } = useQuery({
    queryKey: ['users-messaging'],
    queryFn: () => lmsApi.listUsers({ status: 'active' }).catch(() => ({ data: { users: [] } }))
  });

  const { data, isLoading } = useQuery({
    queryKey: ['messages'],
    queryFn: lmsApi.listMessages
  });

  const handleSend = async (e) => {
    e.preventDefault();
    if (!recipientId) { addToast('Please select a recipient.', 'error'); return; }
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
  const allUsers = (usersData?.data?.users || []).filter(u => u.id !== user?.id);

  return (
    <div className="space-y-6 pb-8">
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
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
              <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-500">No conversations yet.</p>
              <p className="text-xs text-slate-400 mt-1">Send a message to start a conversation.</p>
            </div>
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
                    <div key={msg.id} className={'p-3 rounded-lg border text-xs ' + (msg.sender?.id === user?.id ? 'bg-blue-50 border-blue-100 ml-8' : 'bg-slate-50 border-slate-200')}>
                      <p className="font-bold text-slate-900">{msg.sender?.firstName} {msg.sender?.lastName}</p>
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
              required
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
            >
              <option value="">— Select recipient —</option>
              {allUsers.map(u => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName} ({u.primaryRole?.replace('_', ' ')})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1">Subject</label>
            <input
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Coursework inquiry..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Message</label>
            <textarea
              required
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
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


/* ══════════════════════════════════════════════════════════════
   TA CLASSES PAGE — view assigned classes and rosters
══════════════════════════════════════════════════════════════ */
export function TaClassesPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['classes'],
    queryFn: lmsApi.listClasses
  });

  if (isLoading) return <LoadingState label="Loading your assigned classes..." />;
  if (error) return <ErrorState message={extractErrorMessage(error)} onRetry={refetch} />;

  const classes = data?.data?.classes || [];

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        badge="Assigned Classes & Roster"
        title="My Assigned Classes"
        subtitle="View all class sections you are assigned to support as Teaching Assistant."
      />

      {classes.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-500">No classes assigned yet.</p>
          <p className="text-xs text-slate-400 mt-1">Contact your instructor or administrator to get assigned to a class.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {classes.map((cls) => (
            <div key={cls.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow transition-shadow">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-xs font-bold font-mono text-blue-700">{cls.sectionCode}</p>
                  <h3 className="text-sm font-bold text-slate-900 mt-0.5">{cls.courseOffering?.course?.title || cls.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {cls.courseOffering?.semester?.name} · {cls.schedule || 'No schedule'} · {cls.room || 'No room'}
                  </p>
                </div>
                <StatusBadge status={cls.status || 'active'} />
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {cls.memberships?.length || 0} / {cls.capacity} students</span>
              </div>

              {/* Roster */}
              {(cls.memberships || []).length > 0 && (
                <div className="border-t border-slate-100 pt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Student Roster</p>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {(cls.memberships || []).map((m) => (
                      <div key={m.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-700 shrink-0">
                            {m.student?.firstName?.[0]}{m.student?.lastName?.[0]}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{m.student?.firstName} {m.student?.lastName}</p>
                            <p className="text-slate-400 font-mono">{m.student?.studentNumber}</p>
                          </div>
                        </div>
                        <StatusBadge status={m.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   TA RESOURCES PAGE — view learning resources for assigned classes
══════════════════════════════════════════════════════════════ */
export function TaResourcesPage() {
  const { data: classesData } = useQuery({ queryKey: ['classes'], queryFn: lmsApi.listClasses });
  const [selClassId, setSelClassId] = useState(null);

  const classes = classesData?.data?.classes || [];

  const { data: classDetail, isLoading } = useQuery({
    queryKey: ['class-detail', selClassId],
    queryFn: () => lmsApi.getClassById(selClassId),
    enabled: Boolean(selClassId)
  });

  const course = classDetail?.data?.classSection?.courseOffering?.course;
  const modules = course?.modules || [];

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        badge="Learning Resources"
        title="Course Learning Materials"
        subtitle="Access modules, lessons, and resources for your assigned classes."
      />

      {/* Class selector */}
      {classes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {classes.map((c) => (
            <button key={c.id} type="button" onClick={() => setSelClassId(c.id)}
              className={'px-4 py-2 rounded-lg text-xs font-bold border transition-colors ' +
                (selClassId === c.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50')}>
              {c.sectionCode}
            </button>
          ))}
        </div>
      )}

      {!selClassId ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <p className="text-sm font-semibold text-slate-500">Select a class above to view its learning materials.</p>
        </div>
      ) : isLoading ? <LoadingState /> : (
        <div className="space-y-4">
          {modules.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center">
              <p className="text-xs text-slate-400">No modules published yet for this class.</p>
            </div>
          ) : (
            modules.map((mod, mi) => (
              <div key={mod.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">{mi + 1}</span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{mod.title}</h3>
                    {mod.description && <p className="text-[11px] text-slate-500">{mod.description}</p>}
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-[11px] text-slate-500">{mod.lessons?.length || 0} lessons</span>
                    <StatusBadge status={mod.publicationStatus || 'draft'} />
                  </div>
                </div>
                <div className="divide-y divide-slate-100">
                  {(mod.lessons || []).length === 0 ? (
                    <p className="px-5 py-3 text-xs text-slate-400 italic">No lessons yet.</p>
                  ) : (
                    (mod.lessons || []).map((les, li) => (
                      <div key={les.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-base shrink-0">
                            {les.lessonType === 'laboratory' ? '🔬' : les.lessonType === 'video' ? '🎬' : les.lessonType === 'coding_exercise' ? '💻' : '📖'}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-900 truncate">{mi + 1}.{li + 1} {les.title}</p>
                            <p className="text-[11px] text-slate-500 capitalize mt-0.5">{les.lessonType?.replace(/_/g, ' ')} · {les.estimatedMinutes} min</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <StatusBadge status={les.publicationStatus || 'draft'} />
                          {(les.resources || []).length > 0 && (
                            <span className="text-[11px] text-blue-600 font-semibold">{les.resources.length} file{les.resources.length !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* Aliases for RyanClaud team routes — point to existing implementations */
export { TaClassesPage as TaClassRosterPage };
export { TaClassesPage as TaStudentProgressPage };
export { TaClassesPage as TaStudentActivityPage };
