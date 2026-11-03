import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import {
  Building2,
  BookOpen,
  Layers,
  Users,
  ClipboardCheck,
  Plus,
  Upload,
  CheckCircle2,
  RotateCcw
} from 'lucide-react';
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

export function AcademicDashboardPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard', 'academic_admin'],
    queryFn: lmsApi.getDashboardSummary
  });

  if (isLoading) return <LoadingState label="Loading academic operations dashboard..." />;
  if (error) return <ErrorState message={extractErrorMessage(error)} onRetry={refetch} />;

  const d = data?.data || {};
  const m = d.metrics || {};

  const activeSemesterLabel = m.activeSemester
    ? `${m.activeSemester}${m.activeAcademicYear ? ` · ${m.activeAcademicYear}` : ''}`
    : 'No active semester configured';

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Academic Administration"
        title="Institutional Curriculum, Enrollment & Grade Governance"
        subtitle={`Active Term: ${activeSemesterLabel}`}
      />

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Departments & Programs"
          value={`${m.totalDepartments ?? 0} / ${m.totalPrograms ?? 0}`}
          subtitle="Active academic units"
          icon={Building2}
          accent="blue"
        />
        <StatCard
          title="Catalog Courses"
          value={m.totalCourses ?? 0}
          subtitle={`${m.totalClasses ?? 0} class sections this term`}
          icon={BookOpen}
          accent="indigo"
        />
        <StatCard
          title="Current Enrollments"
          value={m.totalEnrollments ?? 0}
          subtitle={m.activeSemester ? `In ${m.activeSemester}` : 'All semesters'}
          icon={Users}
          accent="emerald"
        />
        <StatCard
          title="Pending Grade Approvals"
          value={m.pendingGradeApprovalsCount ?? 0}
          subtitle={m.unassignedClassesCount > 0 ? `${m.unassignedClassesCount} class(es) unassigned` : 'All classes have instructors'}
          icon={ClipboardCheck}
          accent="amber"
        />
      </div>

      {/* ── Bar chart + Grade approvals ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enrollment by Program chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 mb-1">Enrollment by Degree Program</h2>
          <p className="text-xs text-slate-500 mb-4">
            Active student distribution · {m.activeSemester || 'All time'}
          </p>
          <div className="h-64">
            {(d.enrollmentByProgram || []).length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                No enrollment data available for the current term.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.enrollmentByProgram}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="programCode" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val, _, props) => [val, props.payload.programName]}
                    labelFormatter={(label) => `Program: ${label}`}
                  />
                  <Bar dataKey="enrollments" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Pending grade approvals */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col">
          <h2 className="text-base font-bold text-slate-900 mb-1">Final Grades Pending Approval</h2>
          <p className="text-xs text-slate-500 mb-4">
            Submitted by instructors — awaiting registrar sign-off
          </p>
          <div className="space-y-3 flex-1 overflow-y-auto max-h-52">
            {(d.pendingGradeApprovals || []).length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">
                All submitted class grades have been reviewed. ✓
              </p>
            ) : (
              (d.pendingGradeApprovals || []).map((cls) => (
                <div key={cls.id}
                  className="flex items-center justify-between p-3.5 rounded-lg bg-amber-50/60 border border-amber-200 text-xs">
                  <div>
                    <p className="font-bold text-slate-900">{cls.name}</p>
                    <p className="text-slate-600">
                      {cls.courseOffering?.course?.code}
                      {cls.courseOffering?.semester ? ` · ${cls.courseOffering.semester.name}` : ''}
                      {' · Submitted '}
                      {cls.finalGradesSubmittedAt
                        ? new Date(cls.finalGradesSubmittedAt).toLocaleDateString()
                        : 'Recently'}
                    </p>
                  </div>
                  <Link to="/academic/grade-approvals"
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg whitespace-nowrap">
                    Review
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Department summary table ──────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">Department Overview</h2>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Department Name</th>
              <th className="px-4 py-3">Head</th>
              <th className="px-4 py-3">Programs</th>
              <th className="px-4 py-3">Courses</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {(d.departmentSummary || []).length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No departments configured yet.</td></tr>
            )}
            {(d.departmentSummary || []).map((dept) => (
              <tr key={dept.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono font-bold text-blue-700">{dept.code}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">{dept.name}</td>
                <td className="px-4 py-3 text-slate-600">{dept.headName || <span className="text-slate-400 italic">TBA</span>}</td>
                <td className="px-4 py-3 font-semibold">{dept.programCount ?? 0}</td>
                <td className="px-4 py-3 font-semibold">{dept.courseCount ?? 0}</td>
                <td className="px-4 py-3"><StatusBadge status={dept.status || 'active'} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Classes at a glance + Recent announcements ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Classes at a glance (current semester) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-900">Classes This Semester</h2>
            {m.activeSemester && (
              <p className="text-xs text-slate-400 mt-0.5">{m.activeSemester}</p>
            )}
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Section</th>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3">Instructor</th>
                <th className="px-4 py-3">Enrolled / Cap</th>
                <th className="px-4 py-3">Grades</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {(d.classesAtAGlance || []).length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  No classes configured for the current semester.
                </td></tr>
              )}
              {(d.classesAtAGlance || []).map((cls) => (
                <tr key={cls.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-bold text-blue-700">{cls.sectionCode}</td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-slate-900">{cls.courseCode}</span>
                    {cls.courseTitle && <span className="block text-slate-400 truncate max-w-[140px]">{cls.courseTitle}</span>}
                  </td>
                  <td className="px-4 py-3">
                    {cls.hasInstructor
                      ? <span className="text-slate-700">{cls.instructorName}</span>
                      : <span className="text-red-500 font-semibold">Unassigned</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cls.enrolledCount >= cls.capacity ? 'text-red-600 font-semibold' : 'text-slate-700'}>
                      {cls.enrolledCount}
                    </span>
                    <span className="text-slate-400"> / {cls.capacity}</span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={cls.finalGradesStatus || 'in_progress'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Recent announcements feed */}
        <div className="bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Recent Announcements</h2>
            <Link to="/academic/announcements" className="text-xs text-blue-600 hover:underline font-semibold">
              View All
            </Link>
          </div>
          <div className="divide-y divide-slate-100 flex-1 overflow-y-auto">
            {(d.recentAnnouncements || []).length === 0 ? (
              <p className="px-5 py-8 text-center text-xs text-slate-400">No recent announcements.</p>
            ) : (
              (d.recentAnnouncements || []).map((a) => (
                <div key={a.id} className="px-5 py-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-slate-900 truncate flex-1">{a.title}</p>
                    <StatusBadge status={a.priority} />
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2">{a.content}</p>
                  <p className="text-[10px] text-slate-400">
                    {a.author ? `${a.author.firstName} ${a.author.lastName}` : 'System'} ·{' '}
                    {new Date(a.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DepartmentsAndProgramsPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  // ── Create forms ──────────────────────────────────────────────────────────
  const [deptOpen, setDeptOpen] = useState(false);
  const [progOpen, setProgOpen] = useState(false);
  const [deptForm, setDeptForm] = useState({ code: '', name: '', headName: '', description: '' });
  const [progForm, setProgForm] = useState({ departmentId: '', code: '', name: '', degreeType: 'Bachelor', durationYears: 4, description: '' });

  // ── Edit state ────────────────────────────────────────────────────────────
  const [editingDept, setEditingDept] = useState(null);   // dept object being edited
  const [editingProg, setEditingProg] = useState(null);   // prog object being edited
  const [editDeptForm, setEditDeptForm] = useState({});
  const [editProgForm, setEditProgForm] = useState({});

  // ── Delete confirmation ───────────────────────────────────────────────────
  const [deletingDeptId, setDeletingDeptId] = useState(null);
  const [deletingProgId, setDeletingProgId] = useState(null);

  const { data: deptData, isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: lmsApi.listDepartments
  });
  const { data: progData } = useQuery({
    queryKey: ['programs'],
    queryFn: lmsApi.listPrograms
  });

  const departments = deptData?.data?.departments || [];
  const programs    = progData?.data?.programs    || [];

  // Auto-select first department in program create form
  React.useEffect(() => {
    if (departments.length > 0 && progForm.departmentId === '') {
      setProgForm((f) => ({ ...f, departmentId: departments[0].id }));
    }
  }, [departments]);

  // ── Department handlers ───────────────────────────────────────────────────
  const handleCreateDept = async (e) => {
    e.preventDefault();
    try {
      await lmsApi.createDepartment(deptForm);
      addToast('Department created.');
      setDeptForm({ code: '', name: '', headName: '', description: '' });
      setDeptOpen(false);
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    } catch (err) { addToast(extractErrorMessage(err), 'error'); }
  };

  const openEditDept = (d) => {
    setEditingDept(d);
    setEditDeptForm({ code: d.code, name: d.name, headName: d.headName || '', description: d.description || '', status: d.status });
  };

  const handleUpdateDept = async (e) => {
    e.preventDefault();
    try {
      await lmsApi.updateDepartment(editingDept.id, editDeptForm);
      addToast('Department updated.');
      setEditingDept(null);
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    } catch (err) { addToast(extractErrorMessage(err), 'error'); }
  };

  const handleDeleteDept = async (id) => {
    try {
      await lmsApi.deleteDepartment(id);
      addToast('Department deleted.');
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['programs'] });
    } catch (err) { addToast(extractErrorMessage(err), 'error'); }
    finally { setDeletingDeptId(null); }
  };

  // ── Program handlers ──────────────────────────────────────────────────────
  const handleCreateProg = async (e) => {
    e.preventDefault();
    try {
      await lmsApi.createProgram({ ...progForm, departmentId: Number(progForm.departmentId), durationYears: Number(progForm.durationYears) });
      addToast('Academic program created.');
      setProgForm((f) => ({ ...f, code: '', name: '', degreeType: 'Bachelor', durationYears: 4, description: '' }));
      setProgOpen(false);
      queryClient.invalidateQueries({ queryKey: ['programs'] });
    } catch (err) { addToast(extractErrorMessage(err), 'error'); }
  };

  const openEditProg = (p) => {
    setEditingProg(p);
    setEditProgForm({
      departmentId:  p.departmentId,
      code:          p.code,
      name:          p.name,
      degreeType:    p.degreeType || 'Bachelor',
      durationYears: p.durationYears || 4,
      description:   p.description || '',
      status:        p.status
    });
  };

  const handleUpdateProg = async (e) => {
    e.preventDefault();
    try {
      await lmsApi.updateProgram(editingProg.id, { ...editProgForm, departmentId: Number(editProgForm.departmentId), durationYears: Number(editProgForm.durationYears) });
      addToast('Program updated.');
      setEditingProg(null);
      queryClient.invalidateQueries({ queryKey: ['programs'] });
    } catch (err) { addToast(extractErrorMessage(err), 'error'); }
  };

  const handleDeleteProg = async (id) => {
    try {
      await lmsApi.deleteProgram(id);
      addToast('Program deleted.');
      queryClient.invalidateQueries({ queryKey: ['programs'] });
    } catch (err) { addToast(extractErrorMessage(err), 'error'); }
    finally { setDeletingProgId(null); }
  };

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Academic Structure"
        title="Departments & Degree Programs"
        subtitle="Manage academic faculties, colleges, and degree curricula."
        actions={
          <>
            <button type="button" onClick={() => setDeptOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg">
              <Plus className="w-4 h-4" /> New Department
            </button>
            <button type="button" onClick={() => setProgOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg">
              <Plus className="w-4 h-4" /> New Degree Program
            </button>
          </>
        }
      />

      {/* ── Department cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {departments.length === 0 && (
          <p className="col-span-3 text-center text-slate-400 text-sm py-6">No departments configured yet.</p>
        )}
        {departments.map((d) => (
          <div key={d.id} className="bg-white rounded-xl border border-slate-200 p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded">{d.code}</span>
              <StatusBadge status={d.status} />
            </div>
            <h3 className="text-sm font-bold text-slate-900">{d.name}</h3>
            {d.description && <p className="text-xs text-slate-600 line-clamp-2">{d.description}</p>}
            <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
              Head: <strong>{d.headName || 'TBA'}</strong> · Courses: <strong>{d.courses?.length || 0}</strong>
            </p>
            <div className="flex gap-2 pt-1">
              <button onClick={() => openEditDept(d)}
                className="flex-1 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg hover:bg-slate-50">
                Edit
              </button>
              <button onClick={() => setDeletingDeptId(d.id)}
                className="flex-1 py-1.5 text-xs font-semibold border border-red-200 text-red-600 rounded-lg hover:bg-red-50">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Programs table ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">Academic Degree Programs</h2>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Program Code</th>
              <th className="px-4 py-3">Program Title</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Degree Type</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {programs.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400">No programs configured yet.</td></tr>
            )}
            {programs.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono font-bold text-blue-700">{p.code}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">{p.name}</td>
                <td className="px-4 py-3">{p.department?.name}</td>
                <td className="px-4 py-3">{p.degreeType}</td>
                <td className="px-4 py-3">{p.durationYears} yrs</td>
                <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                <td className="px-4 py-3 flex gap-2">
                  <button onClick={() => openEditProg(p)} className="text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                  <button onClick={() => setDeletingProgId(p.id)} className="text-red-500 hover:text-red-700 font-medium">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Create Department modal ──────────────────────────────────────── */}
      <ModalDialog isOpen={deptOpen} onClose={() => setDeptOpen(false)} title="Create Academic Department">
        <form onSubmit={handleCreateDept} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold mb-1">Department Code</label>
            <input required value={deptForm.code}
              onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
              placeholder="DEPT-AI" className="w-full px-3 py-2 rounded-lg border border-slate-300" />
          </div>
          <div>
            <label className="block font-semibold mb-1">Department Name</label>
            <input required value={deptForm.name}
              onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
              placeholder="Department of Artificial Intelligence & Robotics"
              className="w-full px-3 py-2 rounded-lg border border-slate-300" />
          </div>
          <div>
            <label className="block font-semibold mb-1">Department Head</label>
            <input value={deptForm.headName}
              onChange={(e) => setDeptForm({ ...deptForm, headName: e.target.value })}
              placeholder="Dr. Alan Turing" className="w-full px-3 py-2 rounded-lg border border-slate-300" />
          </div>
          <div>
            <label className="block font-semibold mb-1">Description</label>
            <textarea rows={3} value={deptForm.description}
              onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
              placeholder="Brief description of the department's academic focus..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 resize-none" />
          </div>
          <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg">
            Save Department
          </button>
        </form>
      </ModalDialog>

      {/* ── Edit Department modal ────────────────────────────────────────── */}
      <ModalDialog isOpen={!!editingDept} onClose={() => setEditingDept(null)} title="Edit Department">
        <form onSubmit={handleUpdateDept} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold mb-1">Department Code</label>
            <input required value={editDeptForm.code || ''}
              onChange={(e) => setEditDeptForm({ ...editDeptForm, code: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300" />
          </div>
          <div>
            <label className="block font-semibold mb-1">Department Name</label>
            <input required value={editDeptForm.name || ''}
              onChange={(e) => setEditDeptForm({ ...editDeptForm, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300" />
          </div>
          <div>
            <label className="block font-semibold mb-1">Department Head</label>
            <input value={editDeptForm.headName || ''}
              onChange={(e) => setEditDeptForm({ ...editDeptForm, headName: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300" />
          </div>
          <div>
            <label className="block font-semibold mb-1">Description</label>
            <textarea rows={3} value={editDeptForm.description || ''}
              onChange={(e) => setEditDeptForm({ ...editDeptForm, description: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 resize-none" />
          </div>
          <div>
            <label className="block font-semibold mb-1">Status</label>
            <select value={editDeptForm.status || 'active'}
              onChange={(e) => setEditDeptForm({ ...editDeptForm, status: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg">
            Save Changes
          </button>
        </form>
      </ModalDialog>

      {/* ── Create Program modal ─────────────────────────────────────────── */}
      <ModalDialog isOpen={progOpen} onClose={() => setProgOpen(false)} title="Create Academic Program">
        <form onSubmit={handleCreateProg} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold mb-1">Department</label>
            <select value={progForm.departmentId}
              onChange={(e) => setProgForm({ ...progForm, departmentId: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1">Program Code</label>
            <input required value={progForm.code}
              onChange={(e) => setProgForm({ ...progForm, code: e.target.value })}
              placeholder="BSAI" className="w-full px-3 py-2 rounded-lg border border-slate-300" />
          </div>
          <div>
            <label className="block font-semibold mb-1">Program Name</label>
            <input required value={progForm.name}
              onChange={(e) => setProgForm({ ...progForm, name: e.target.value })}
              placeholder="Bachelor of Science in Artificial Intelligence"
              className="w-full px-3 py-2 rounded-lg border border-slate-300" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold mb-1">Degree Type</label>
              <input value={progForm.degreeType}
                onChange={(e) => setProgForm({ ...progForm, degreeType: e.target.value })}
                placeholder="Bachelor" className="w-full px-3 py-2 rounded-lg border border-slate-300" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Duration (Years)</label>
              <input type="number" min={1} max={8} value={progForm.durationYears}
                onChange={(e) => setProgForm({ ...progForm, durationYears: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300" />
            </div>
          </div>
          <div>
            <label className="block font-semibold mb-1">Description</label>
            <textarea rows={3} value={progForm.description}
              onChange={(e) => setProgForm({ ...progForm, description: e.target.value })}
              placeholder="Brief description of the degree program..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 resize-none" />
          </div>
          <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg">
            Save Program
          </button>
        </form>
      </ModalDialog>

      {/* ── Edit Program modal ───────────────────────────────────────────── */}
      <ModalDialog isOpen={!!editingProg} onClose={() => setEditingProg(null)} title="Edit Program">
        <form onSubmit={handleUpdateProg} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold mb-1">Department</label>
            <select value={editProgForm.departmentId || ''}
              onChange={(e) => setEditProgForm({ ...editProgForm, departmentId: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1">Program Code</label>
            <input required value={editProgForm.code || ''}
              onChange={(e) => setEditProgForm({ ...editProgForm, code: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300" />
          </div>
          <div>
            <label className="block font-semibold mb-1">Program Name</label>
            <input required value={editProgForm.name || ''}
              onChange={(e) => setEditProgForm({ ...editProgForm, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold mb-1">Degree Type</label>
              <input value={editProgForm.degreeType || ''}
                onChange={(e) => setEditProgForm({ ...editProgForm, degreeType: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Duration (Years)</label>
              <input type="number" min={1} max={8} value={editProgForm.durationYears || 4}
                onChange={(e) => setEditProgForm({ ...editProgForm, durationYears: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300" />
            </div>
          </div>
          <div>
            <label className="block font-semibold mb-1">Description</label>
            <textarea rows={3} value={editProgForm.description || ''}
              onChange={(e) => setEditProgForm({ ...editProgForm, description: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 resize-none" />
          </div>
          <div>
            <label className="block font-semibold mb-1">Status</label>
            <select value={editProgForm.status || 'active'}
              onChange={(e) => setEditProgForm({ ...editProgForm, status: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg">
            Save Changes
          </button>
        </form>
      </ModalDialog>

      {/* ── Delete Department confirmation ───────────────────────────────── */}
      {deletingDeptId && (
        <ModalDialog isOpen title="Delete Department" onClose={() => setDeletingDeptId(null)} maxWidth="max-w-md">
          <p className="text-sm text-slate-600 mb-5">
            Are you sure you want to delete this department? This cannot be undone.
            Departments with linked courses or programs cannot be deleted.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeletingDeptId(null)} className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium hover:bg-slate-50">Cancel</button>
            <button onClick={() => handleDeleteDept(deletingDeptId)} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold">Delete</button>
          </div>
        </ModalDialog>
      )}

      {/* ── Delete Program confirmation ──────────────────────────────────── */}
      {deletingProgId && (
        <ModalDialog isOpen title="Delete Program" onClose={() => setDeletingProgId(null)} maxWidth="max-w-md">
          <p className="text-sm text-slate-600 mb-5">
            Are you sure you want to delete this program? This cannot be undone.
            Programs with linked courses cannot be deleted.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeletingProgId(null)} className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium hover:bg-slate-50">Cancel</button>
            <button onClick={() => handleDeleteProg(deletingProgId)} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold">Delete</button>
          </div>
        </ModalDialog>
      )}
    </div>
  );
}

export function TermsManagementPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  // ── Create forms (no status field — managed via side panel) ──────────────
  const [ayForm, setAyForm] = useState({ name: '', startDate: '', endDate: '' });
  const [semForm, setSemForm] = useState({ academicYearId: '', name: '', code: '', startDate: '', endDate: '' });

  // ── Selected row for status side-panel ───────────────────────────────────
  const [selectedAy, setSelectedAy] = useState(null);   // full AY object
  const [selectedSem, setSelectedSem] = useState(null); // full semester object

  // ── Local status panel state (mirrors selected row) ──────────────────────
  const [ayPanelStatus, setAyPanelStatus] = useState('upcoming');
  const [ayPanelCurrent, setAyPanelCurrent] = useState(false);
  const [semPanelStatus, setSemPanelStatus] = useState('upcoming');
  const [semPanelCurrent, setSemPanelCurrent] = useState(false);

  // ── Delete confirmation ───────────────────────────────────────────────────
  const [deletingAyId, setDeletingAyId] = useState(null);
  const [deletingSemId, setDeletingSemId] = useState(null);

  const { data: yearsData, isLoading } = useQuery({
    queryKey: ['academic-years'],
    queryFn: lmsApi.listAcademicYears
  });
  const { data: semsData } = useQuery({
    queryKey: ['semesters'],
    queryFn: lmsApi.listSemesters
  });

  const years     = yearsData?.data?.academicYears || [];
  const semesters = semsData?.data?.semesters      || [];

  // Auto-select first year in semester form once loaded
  React.useEffect(() => {
    if (years.length > 0 && semForm.academicYearId === '') {
      const first = years[0];
      setSemForm((f) => ({
        ...f,
        academicYearId: first.id,
        startDate: first.startDate || '',
        endDate:   first.endDate   || ''
      }));
    }
  }, [years]);

  // When a row is selected, seed the side-panel from that row's current values
  const selectAy = (y) => {
    setSelectedAy(y);
    setAyPanelStatus(y.status);
    setAyPanelCurrent(y.isCurrent);
  };
  const selectSem = (s) => {
    setSelectedSem(s);
    setSemPanelStatus(s.status);
    setSemPanelCurrent(s.isCurrent);
  };

  // ── Academic Year handlers ────────────────────────────────────────────────
  const handleCreateAcademicYear = async (e) => {
    e.preventDefault();
    try {
      await lmsApi.createAcademicYear({ ...ayForm, status: 'upcoming', isCurrent: false });
      addToast('Academic year created.');
      setAyForm({ name: '', startDate: '', endDate: '' });
      queryClient.invalidateQueries({ queryKey: ['academic-years'] });
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  const handleSaveAyStatus = async () => {
    if (!selectedAy) return;
    try {
      await lmsApi.updateAcademicYear(selectedAy.id, {
        status:    ayPanelStatus,
        isCurrent: ayPanelStatus === 'active' ? ayPanelCurrent : false
      });
      addToast('Academic year updated.');
      queryClient.invalidateQueries({ queryKey: ['academic-years'] });
      setSelectedAy(null);
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  const handleDeleteAcademicYear = async (id) => {
    try {
      await lmsApi.deleteAcademicYear(id);
      addToast('Academic year deleted.');
      if (selectedAy?.id === id) setSelectedAy(null);
      queryClient.invalidateQueries({ queryKey: ['academic-years'] });
      queryClient.invalidateQueries({ queryKey: ['semesters'] });
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    } finally {
      setDeletingAyId(null);
    }
  };

  // ── Semester handlers ─────────────────────────────────────────────────────
  const handleCreateSemester = async (e) => {
    e.preventDefault();
    try {
      await lmsApi.createSemester({ ...semForm, academicYearId: Number(semForm.academicYearId), status: 'upcoming', isCurrent: false });
      addToast('Semester term created.');
      setSemForm((f) => ({ ...f, name: '', code: '', startDate: f.startDate, endDate: f.endDate }));
      queryClient.invalidateQueries({ queryKey: ['semesters'] });
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  const handleSaveSemStatus = async () => {
    if (!selectedSem) return;
    try {
      await lmsApi.updateSemester(selectedSem.id, {
        status:    semPanelStatus,
        isCurrent: semPanelStatus === 'active' ? semPanelCurrent : false
      });
      addToast('Semester updated.');
      queryClient.invalidateQueries({ queryKey: ['semesters'] });
      setSelectedSem(null);
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  const handleDeleteSemester = async (id) => {
    try {
      await lmsApi.deleteSemester(id);
      addToast('Semester deleted.');
      if (selectedSem?.id === id) setSelectedSem(null);
      queryClient.invalidateQueries({ queryKey: ['semesters'] });
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    } finally {
      setDeletingSemId(null);
    }
  };

  if (isLoading) return <LoadingState />;

  // Find selected year object for auto-fill
  const selectedYearObj = years.find((y) => y.id === Number(semForm.academicYearId));

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Academic Calendar"
        title="Academic Years & Semesters"
        subtitle="Configure institutional terms and enrollment windows."
      />

      {/* ── Academic Years ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-900">Academic Years</h2>
            {selectedAy && <p className="text-[11px] text-slate-400 mt-0.5">Row selected — manage status on the right.</p>}
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {years.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No academic years configured yet.</td></tr>
              )}
              {years.map((y) => (
                <tr
                  key={y.id}
                  onClick={() => selectedAy?.id === y.id ? setSelectedAy(null) : selectAy(y)}
                  className={`cursor-pointer transition-colors ${selectedAy?.id === y.id ? 'bg-blue-50 ring-1 ring-inset ring-blue-300' : 'hover:bg-slate-50'}`}
                >
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {y.name}
                    {y.isCurrent && <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full">Current</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{y.startDate} → {y.endDate}</td>
                  <td className="px-4 py-3"><StatusBadge status={y.status} /></td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeletingAyId(y.id); }}
                      className="text-red-500 hover:text-red-700 font-medium"
                    >Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right panel: status editor when row selected, otherwise create form */}
        {selectedAy ? (
          <div className="bg-white rounded-xl border border-blue-200 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Manage Status</h2>
              <button onClick={() => setSelectedAy(null)} className="text-slate-400 hover:text-slate-600 text-xs">✕ Close</button>
            </div>
            <p className="text-slate-500 font-semibold truncate">{selectedAy.name}</p>

            <div className="space-y-2">
              <p className="font-semibold text-slate-700">Set Status</p>
              {['upcoming', 'active', 'completed', 'archived'].map((s) => (
                <label key={s} className="flex items-center gap-2 cursor-pointer capitalize">
                  <input
                    type="radio"
                    name="ay-status"
                    value={s}
                    checked={ayPanelStatus === s}
                    onChange={() => { setAyPanelStatus(s); if (s !== 'active') setAyPanelCurrent(false); }}
                    className="accent-blue-600"
                  />
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </label>
              ))}
            </div>

            {/* Current toggle — only visible when Active is selected */}
            {ayPanelStatus === 'active' && (
              <label className="flex items-center gap-2 cursor-pointer pt-1 border-t border-slate-100">
                <input
                  type="checkbox"
                  checked={ayPanelCurrent}
                  onChange={(e) => setAyPanelCurrent(e.target.checked)}
                  className="rounded accent-emerald-600"
                />
                <span className="font-semibold text-emerald-700">Mark as Current Year</span>
              </label>
            )}

            <button
              onClick={handleSaveAyStatus}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
            >Save Changes</button>
          </div>
        ) : (
          <form onSubmit={handleCreateAcademicYear} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 text-xs">
            <h2 className="text-base font-bold text-slate-900">Add Academic Year</h2>
            <div>
              <label className="block font-semibold mb-1">Year Name <span className="text-slate-400 font-normal">(e.g. 2027–2028)</span></label>
              <input
                required
                placeholder="e.g. 2027–2028"
                value={ayForm.name}
                onChange={(e) => setAyForm({ ...ayForm, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold mb-1">Start Date</label>
                <input
                  required type="date"
                  value={ayForm.startDate}
                  onChange={(e) => setAyForm({ ...ayForm, startDate: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">End Date</label>
                <input
                  required type="date"
                  value={ayForm.endDate}
                  onChange={(e) => setAyForm({ ...ayForm, endDate: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300"
                />
              </div>
            </div>
            <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg">
              Create Academic Year
            </button>
          </form>
        )}
      </div>

      {/* ── Semesters ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-900">Configured Semesters</h2>
            {selectedSem && <p className="text-[11px] text-slate-400 mt-0.5">Row selected — manage status on the right.</p>}
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Term Code</th>
                <th className="px-4 py-3">Semester Name</th>
                <th className="px-4 py-3">Academic Year</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {semesters.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No semesters configured yet.</td></tr>
              )}
              {semesters.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => selectedSem?.id === s.id ? setSelectedSem(null) : selectSem(s)}
                  className={`cursor-pointer transition-colors ${selectedSem?.id === s.id ? 'bg-blue-50 ring-1 ring-inset ring-blue-300' : 'hover:bg-slate-50'}`}
                >
                  <td className="px-4 py-3 font-mono font-bold text-blue-700">{s.code}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {s.name}
                    {s.isCurrent && <span className="ml-1 text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full">Current</span>}
                  </td>
                  <td className="px-4 py-3">{s.academicYear?.name}</td>
                  <td className="px-4 py-3 text-slate-500">{s.startDate} → {s.endDate}</td>
                  <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeletingSemId(s.id); }}
                      className="text-red-500 hover:text-red-700 font-medium"
                    >Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right panel: status editor when row selected, otherwise create form */}
        {selectedSem ? (
          <div className="bg-white rounded-xl border border-blue-200 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Manage Status</h2>
              <button onClick={() => setSelectedSem(null)} className="text-slate-400 hover:text-slate-600 text-xs">✕ Close</button>
            </div>
            <p className="text-slate-500 font-semibold truncate">{selectedSem.name}</p>

            <div className="space-y-2">
              <p className="font-semibold text-slate-700">Set Status</p>
              {['upcoming', 'active', 'closed', 'archived'].map((s) => (
                <label key={s} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="sem-status"
                    value={s}
                    checked={semPanelStatus === s}
                    onChange={() => { setSemPanelStatus(s); if (s !== 'active') setSemPanelCurrent(false); }}
                    className="accent-blue-600"
                  />
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </label>
              ))}
            </div>

            {/* Current toggle — only visible when Active is selected */}
            {semPanelStatus === 'active' && (
              <label className="flex items-center gap-2 cursor-pointer pt-1 border-t border-slate-100">
                <input
                  type="checkbox"
                  checked={semPanelCurrent}
                  onChange={(e) => setSemPanelCurrent(e.target.checked)}
                  className="rounded accent-emerald-600"
                />
                <span className="font-semibold text-emerald-700">Mark as Current Semester</span>
              </label>
            )}

            <button
              onClick={handleSaveSemStatus}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
            >Save Changes</button>
          </div>
        ) : (
          <form onSubmit={handleCreateSemester} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 text-xs">
            <h2 className="text-base font-bold text-slate-900">Add Semester Term</h2>
            <div>
              <label className="block font-semibold mb-1">Academic Year</label>
              <select
                required
                value={semForm.academicYearId}
                onChange={(e) => {
                  const yr = years.find((y) => y.id === Number(e.target.value));
                  setSemForm((f) => ({
                    ...f,
                    academicYearId: Number(e.target.value),
                    startDate: yr?.startDate || '',
                    endDate:   yr?.endDate   || ''
                  }));
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
              >
                {years.length === 0 && <option value="">— No academic years yet —</option>}
                {years.map((y) => (
                  <option key={y.id} value={y.id}>{y.name}</option>
                ))}
              </select>
            </div>
            {/* Auto-filled date hint */}
            {selectedYearObj && (
              <p className="text-[11px] text-slate-400 -mt-1">
                Dates pre-filled from <span className="font-semibold">{selectedYearObj.name}</span> — adjust if needed.
              </p>
            )}
            <div>
              <label className="block font-semibold mb-1">Term Code</label>
              <input
                required
                placeholder="e.g. 2027-2028-S1"
                value={semForm.code}
                onChange={(e) => setSemForm({ ...semForm, code: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Semester Title</label>
              <input
                required
                placeholder="e.g. First Semester, 2027–2028"
                value={semForm.name}
                onChange={(e) => setSemForm({ ...semForm, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold mb-1">Start Date</label>
                <input
                  required type="date"
                  value={semForm.startDate}
                  onChange={(e) => setSemForm({ ...semForm, startDate: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">End Date</label>
                <input
                  required type="date"
                  value={semForm.endDate}
                  onChange={(e) => setSemForm({ ...semForm, endDate: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={years.length === 0}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg"
            >
              Create Semester
            </button>
          </form>
        )}
      </div>

      {/* ── Delete confirmation modals ─────────────────────────────────── */}
      {deletingAyId && (
        <ModalDialog isOpen title="Delete Academic Year" onClose={() => setDeletingAyId(null)} maxWidth="max-w-md">
          <p className="text-sm text-slate-600 mb-5">
            Are you sure you want to delete this academic year? This cannot be undone.
            Academic years with linked semesters cannot be deleted.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeletingAyId(null)} className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium hover:bg-slate-50">Cancel</button>
            <button onClick={() => handleDeleteAcademicYear(deletingAyId)} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold">Delete</button>
          </div>
        </ModalDialog>
      )}

      {deletingSemId && (
        <ModalDialog isOpen title="Delete Semester" onClose={() => setDeletingSemId(null)} maxWidth="max-w-md">
          <p className="text-sm text-slate-600 mb-5">
            Are you sure you want to delete this semester? This cannot be undone.
            Semesters with linked course offerings cannot be deleted.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeletingSemId(null)} className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium hover:bg-slate-50">Cancel</button>
            <button onClick={() => handleDeleteSemester(deletingSemId)} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold">Delete</button>
          </div>
        </ModalDialog>
      )}
    </div>
  );
}

export function CoursesAndOfferingsPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  // ── Create modals ─────────────────────────────────────────────────────────
  const [courseOpen, setCourseOpen]     = useState(false);
  const [offeringOpen, setOfferingOpen] = useState(false);

  // ── Edit state ────────────────────────────────────────────────────────────
  const [editingCourse,   setEditingCourse]   = useState(null);
  const [editingOffering, setEditingOffering] = useState(null);
  const [editCourseForm,   setEditCourseForm]   = useState({});
  const [editOfferingForm, setEditOfferingForm] = useState({});

  // ── Delete confirmation ───────────────────────────────────────────────────
  const [deletingCourseId,   setDeletingCourseId]   = useState(null);
  const [deletingOfferingId, setDeletingOfferingId] = useState(null);

  // ── Create form state (all IDs start empty — filled dynamically) ──────────
  const [courseForm, setCourseForm] = useState({
    departmentId: '', programId: '', code: '', title: '', description: '',
    category: 'Networking & Systems', creditUnits: 3, lectureHours: 2, labHours: 3,
    level: 'Intermediate', deliveryMode: 'Instructor-Led', publicationStatus: 'published'
  });
  const [offeringForm, setOfferingForm] = useState({
    courseId: '', academicYearId: '', semesterId: '',
    offeringCode: '', titleOverride: '', enrollmentPolicy: 'open_self_enroll',
    passingScore: 75, status: 'published'
  });

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: coursesData,   isLoading } = useQuery({ queryKey: ['courses'],          queryFn: () => lmsApi.listCourses() });
  const { data: offeringsData }            = useQuery({ queryKey: ['course-offerings'], queryFn: lmsApi.listOfferings });
  const { data: deptsData }                = useQuery({ queryKey: ['departments'],       queryFn: lmsApi.listDepartments });
  const { data: progsData }                = useQuery({ queryKey: ['programs'],          queryFn: lmsApi.listPrograms });
  const { data: yearsData }                = useQuery({ queryKey: ['academic-years'],    queryFn: lmsApi.listAcademicYears });
  const { data: semsData }                 = useQuery({ queryKey: ['semesters'],         queryFn: lmsApi.listSemesters });

  const courses     = coursesData?.data?.courses     || [];
  const offerings   = offeringsData?.data?.offerings || [];
  const departments = deptsData?.data?.departments   || [];
  const programs    = progsData?.data?.programs      || [];
  const years       = yearsData?.data?.academicYears || [];
  const semesters   = semsData?.data?.semesters      || [];

  // Auto-select first items once loaded
  React.useEffect(() => {
    if (departments.length > 0 && courseForm.departmentId === '')
      setCourseForm((f) => ({ ...f, departmentId: departments[0].id }));
  }, [departments]);

  React.useEffect(() => {
    if (courses.length > 0 && offeringForm.courseId === '')
      setOfferingForm((f) => ({ ...f, courseId: courses[0].id }));
  }, [courses]);

  React.useEffect(() => {
    if (years.length > 0 && offeringForm.academicYearId === '')
      setOfferingForm((f) => ({ ...f, academicYearId: years[0].id }));
  }, [years]);

  React.useEffect(() => {
    if (semesters.length > 0 && offeringForm.semesterId === '')
      setOfferingForm((f) => ({ ...f, semesterId: semesters[0].id }));
  }, [semesters]);

  // Programs filtered to the selected department
  const filteredPrograms = programs.filter((p) => p.departmentId === Number(courseForm.departmentId));

  // ── Course handlers ───────────────────────────────────────────────────────
  const handleCreateCourse = async (e) => {
    e.preventDefault();
    try {
      await lmsApi.createCourse({
        ...courseForm,
        departmentId: Number(courseForm.departmentId),
        programId: courseForm.programId ? Number(courseForm.programId) : null,
        creditUnits: Number(courseForm.creditUnits),
        lectureHours: Number(courseForm.lectureHours),
        labHours: Number(courseForm.labHours)
      });
      addToast('Course subject created.');
      setCourseForm((f) => ({ ...f, code: '', title: '', description: '' }));
      setCourseOpen(false);
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    } catch (err) { addToast(extractErrorMessage(err), 'error'); }
  };

  const openEditCourse = (c) => {
    setEditingCourse(c);
    setEditCourseForm({
      departmentId: c.departmentId, programId: c.programId || '',
      code: c.code, title: c.title, description: c.description,
      category: c.category, creditUnits: c.creditUnits,
      lectureHours: c.lectureHours, labHours: c.labHours,
      level: c.level, deliveryMode: c.deliveryMode,
      publicationStatus: c.publicationStatus
    });
  };

  const handleUpdateCourse = async (e) => {
    e.preventDefault();
    try {
      await lmsApi.updateCourse(editingCourse.id, {
        ...editCourseForm,
        departmentId: Number(editCourseForm.departmentId),
        programId: editCourseForm.programId ? Number(editCourseForm.programId) : null,
        creditUnits: Number(editCourseForm.creditUnits),
        lectureHours: Number(editCourseForm.lectureHours),
        labHours: Number(editCourseForm.labHours)
      });
      addToast('Course updated.');
      setEditingCourse(null);
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    } catch (err) { addToast(extractErrorMessage(err), 'error'); }
  };

  const handleDeleteCourse = async (id) => {
    try {
      await lmsApi.deleteCourse(id);
      addToast('Course deleted.');
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    } catch (err) { addToast(extractErrorMessage(err), 'error'); }
    finally { setDeletingCourseId(null); }
  };

  // ── Offering handlers ─────────────────────────────────────────────────────
  const handleCreateOffering = async (e) => {
    e.preventDefault();
    try {
      await lmsApi.createOffering({
        ...offeringForm,
        courseId: Number(offeringForm.courseId),
        academicYearId: Number(offeringForm.academicYearId),
        semesterId: Number(offeringForm.semesterId),
        passingScore: Number(offeringForm.passingScore)
      });
      addToast('Term course offering created.');
      setOfferingForm((f) => ({ ...f, offeringCode: '', titleOverride: '' }));
      setOfferingOpen(false);
      queryClient.invalidateQueries({ queryKey: ['course-offerings'] });
    } catch (err) { addToast(extractErrorMessage(err), 'error'); }
  };

  const openEditOffering = (o) => {
    setEditingOffering(o);
    setEditOfferingForm({
      courseId: o.courseId, academicYearId: o.academicYearId, semesterId: o.semesterId,
      offeringCode: o.offeringCode, titleOverride: o.titleOverride || '',
      enrollmentPolicy: o.enrollmentPolicy, passingScore: o.passingScore,
      certificateEnabled: o.certificateEnabled, status: o.status
    });
  };

  const handleUpdateOffering = async (e) => {
    e.preventDefault();
    try {
      await lmsApi.updateOffering(editingOffering.id, {
        ...editOfferingForm,
        courseId: Number(editOfferingForm.courseId),
        academicYearId: Number(editOfferingForm.academicYearId),
        semesterId: Number(editOfferingForm.semesterId),
        passingScore: Number(editOfferingForm.passingScore)
      });
      addToast('Offering updated.');
      setEditingOffering(null);
      queryClient.invalidateQueries({ queryKey: ['course-offerings'] });
    } catch (err) { addToast(extractErrorMessage(err), 'error'); }
  };

  const handleDeleteOffering = async (id) => {
    try {
      await lmsApi.deleteOffering(id);
      addToast('Offering deleted.');
      queryClient.invalidateQueries({ queryKey: ['course-offerings'] });
    } catch (err) { addToast(extractErrorMessage(err), 'error'); }
    finally { setDeletingOfferingId(null); }
  };

  if (isLoading) return <LoadingState />;

  // ── Shared field sub-components ───────────────────────────────────────────
  const CourseFields = ({ form, setForm, depts, progs }) => (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block font-semibold mb-1">Course Code</label>
          <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}
            placeholder="NET-302" className="w-full px-3 py-2 rounded-lg border border-slate-300" />
        </div>
        <div>
          <label className="block font-semibold mb-1">Department</label>
          <select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: Number(e.target.value), programId: '' })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
            {depts.map((d) => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block font-semibold mb-1">Program <span className="text-slate-400 font-normal">(optional)</span></label>
          <select value={form.programId || ''} onChange={(e) => setForm({ ...form, programId: e.target.value ? Number(e.target.value) : '' })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
            <option value="">— None —</option>
            {progs.filter((p) => p.departmentId === Number(form.departmentId)).map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block font-semibold mb-1">Category</label>
          <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300" />
        </div>
      </div>
      <div>
        <label className="block font-semibold mb-1">Course Title</label>
        <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Software-Defined Networking & Automation"
          className="w-full px-3 py-2 rounded-lg border border-slate-300" />
      </div>
      <div>
        <label className="block font-semibold mb-1">Description</label>
        <textarea required rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 resize-none" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block font-semibold mb-1">Credit Units</label>
          <input type="number" min={1} max={12} value={form.creditUnits} onChange={(e) => setForm({ ...form, creditUnits: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300" />
        </div>
        <div>
          <label className="block font-semibold mb-1">Lec Hrs</label>
          <input type="number" min={0} max={20} value={form.lectureHours} onChange={(e) => setForm({ ...form, lectureHours: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300" />
        </div>
        <div>
          <label className="block font-semibold mb-1">Lab Hrs</label>
          <input type="number" min={0} max={20} value={form.labHours} onChange={(e) => setForm({ ...form, labHours: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block font-semibold mb-1">Level</label>
          <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
            {['Introductory','Intermediate','Advanced','Professional'].map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="block font-semibold mb-1">Delivery Mode</label>
          <select value={form.deliveryMode} onChange={(e) => setForm({ ...form, deliveryMode: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
            {['Instructor-Led','Self-Paced','Hybrid'].map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block font-semibold mb-1">Publication Status</label>
        <select value={form.publicationStatus} onChange={(e) => setForm({ ...form, publicationStatus: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
          {['draft','published','archived'].map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
        </select>
      </div>
    </>
  );

  const OfferingFields = ({ form, setForm, courseList, semList }) => (
    <>
      <div>
        <label className="block font-semibold mb-1">Course Subject</label>
        <select value={form.courseId} onChange={(e) => setForm({ ...form, courseId: Number(e.target.value) })}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
          {courseList.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}
        </select>
      </div>
      <div>
        <label className="block font-semibold mb-1">Semester</label>
        <select value={form.semesterId} onChange={(e) => setForm({ ...form, semesterId: Number(e.target.value) })}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
          {semList.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.academicYear?.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block font-semibold mb-1">Offering Code</label>
        <input required value={form.offeringCode} onChange={(e) => setForm({ ...form, offeringCode: e.target.value })}
          placeholder="NET-302-2026S1" className="w-full px-3 py-2 rounded-lg border border-slate-300" />
      </div>
      <div>
        <label className="block font-semibold mb-1">Display Title Override <span className="text-slate-400 font-normal">(optional)</span></label>
        <input value={form.titleOverride} onChange={(e) => setForm({ ...form, titleOverride: e.target.value })}
          placeholder="Integrative Programming — First Semester, 2026–2027"
          className="w-full px-3 py-2 rounded-lg border border-slate-300" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block font-semibold mb-1">Enrollment Policy</label>
          <select value={form.enrollmentPolicy} onChange={(e) => setForm({ ...form, enrollmentPolicy: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
            <option value="open_self_enroll">Open Self-Enroll</option>
            <option value="instructor_approval">Instructor Approval</option>
            <option value="admin_only">Admin Only</option>
          </select>
        </div>
        <div>
          <label className="block font-semibold mb-1">Passing Score (%)</label>
          <input type="number" min={50} max={100} value={form.passingScore} onChange={(e) => setForm({ ...form, passingScore: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300" />
        </div>
      </div>
      <div>
        <label className="block font-semibold mb-1">Status</label>
        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
          {['draft','published','completed','archived'].map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
        </select>
      </div>
    </>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Course Architecture"
        title="Reusable Courses & Term Offerings"
        subtitle="Distinguish reusable academic subjects (Courses) from term-specific deliveries (Course Offerings)."
        actions={
          <>
            <button type="button" onClick={() => setCourseOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg">
              <Plus className="w-4 h-4" /> Create Course Subject
            </button>
            <button type="button" onClick={() => setOfferingOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg">
              <Plus className="w-4 h-4" /> Create Term Offering
            </button>
          </>
        }
      />

      {/* ── Course cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {courses.length === 0 && (
          <p className="col-span-2 text-center text-slate-400 text-sm py-6">No courses configured yet.</p>
        )}
        {courses.map((c) => (
          <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded">{c.code}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">{c.creditUnits} Units · {c.deliveryMode}</span>
                <StatusBadge status={c.publicationStatus} />
              </div>
            </div>
            <h3 className="text-base font-bold text-slate-900">{c.title}</h3>
            <p className="text-xs text-slate-600 line-clamp-2">{c.description}</p>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Dept: {c.department?.code} {c.program ? `· ${c.program.code}` : ''}</span>
              <span>Modules: {c.modules?.length || 0} · Offerings: {c.offerings?.length || 0}</span>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => openEditCourse(c)}
                className="flex-1 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg hover:bg-slate-50">
                Edit
              </button>
              <button onClick={() => setDeletingCourseId(c.id)}
                className="flex-1 py-1.5 text-xs font-semibold border border-red-200 text-red-600 rounded-lg hover:bg-red-50">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Offerings table ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">Active Term Course Offerings</h2>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Offering Code</th>
              <th className="px-4 py-3">Subject & Term</th>
              <th className="px-4 py-3">Semester</th>
              <th className="px-4 py-3">Enrollment Policy</th>
              <th className="px-4 py-3">Sections</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {offerings.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400">No offerings configured yet.</td></tr>
            )}
            {offerings.map((o) => (
              <tr key={o.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono font-bold text-blue-700">{o.offeringCode}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">
                  {o.titleOverride || `${o.course?.title} — ${o.semester?.name}`}
                </td>
                <td className="px-4 py-3">{o.semester?.name}</td>
                <td className="px-4 py-3"><StatusBadge status={o.enrollmentPolicy} /></td>
                <td className="px-4 py-3 font-semibold">{o.classes?.length || 0}</td>
                <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                <td className="px-4 py-3 flex gap-2">
                  <button onClick={() => openEditOffering(o)} className="text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                  <button onClick={() => setDeletingOfferingId(o.id)} className="text-red-500 hover:text-red-700 font-medium">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Create Course modal ───────────────────────────────────────────── */}
      <ModalDialog isOpen={courseOpen} onClose={() => setCourseOpen(false)} title="Create Reusable Course Subject">
        <form onSubmit={handleCreateCourse} className="space-y-3 text-xs">
          <CourseFields form={courseForm} setForm={setCourseForm} depts={departments} progs={programs} />
          <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg">Create Course</button>
        </form>
      </ModalDialog>

      {/* ── Edit Course modal ─────────────────────────────────────────────── */}
      <ModalDialog isOpen={!!editingCourse} onClose={() => setEditingCourse(null)} title="Edit Course Subject">
        <form onSubmit={handleUpdateCourse} className="space-y-3 text-xs">
          <CourseFields form={editCourseForm} setForm={setEditCourseForm} depts={departments} progs={programs} />
          <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg">Save Changes</button>
        </form>
      </ModalDialog>

      {/* ── Create Offering modal ─────────────────────────────────────────── */}
      <ModalDialog isOpen={offeringOpen} onClose={() => setOfferingOpen(false)} title="Create Term Course Offering">
        <form onSubmit={handleCreateOffering} className="space-y-3 text-xs">
          <OfferingFields form={offeringForm} setForm={setOfferingForm} courseList={courses} semList={semesters} />
          <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg">Create Offering</button>
        </form>
      </ModalDialog>

      {/* ── Edit Offering modal ───────────────────────────────────────────── */}
      <ModalDialog isOpen={!!editingOffering} onClose={() => setEditingOffering(null)} title="Edit Course Offering">
        <form onSubmit={handleUpdateOffering} className="space-y-3 text-xs">
          <OfferingFields form={editOfferingForm} setForm={setEditOfferingForm} courseList={courses} semList={semesters} />
          <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg">Save Changes</button>
        </form>
      </ModalDialog>

      {/* ── Delete Course confirmation ────────────────────────────────────── */}
      {deletingCourseId && (
        <ModalDialog isOpen title="Delete Course" onClose={() => setDeletingCourseId(null)} maxWidth="max-w-md">
          <p className="text-sm text-slate-600 mb-5">
            Are you sure you want to delete this course? This cannot be undone.
            Courses with linked offerings cannot be deleted — archive them instead.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeletingCourseId(null)} className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium hover:bg-slate-50">Cancel</button>
            <button onClick={() => handleDeleteCourse(deletingCourseId)} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold">Delete</button>
          </div>
        </ModalDialog>
      )}

      {/* ── Delete Offering confirmation ──────────────────────────────────── */}
      {deletingOfferingId && (
        <ModalDialog isOpen title="Delete Offering" onClose={() => setDeletingOfferingId(null)} maxWidth="max-w-md">
          <p className="text-sm text-slate-600 mb-5">
            Are you sure you want to delete this course offering? This cannot be undone.
            Offerings with linked class sections cannot be deleted.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeletingOfferingId(null)} className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium hover:bg-slate-50">Cancel</button>
            <button onClick={() => handleDeleteOffering(deletingOfferingId)} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold">Delete</button>
          </div>
        </ModalDialog>
      )}
    </div>
  );
}

export function ClassesAndSectionsPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  // ── Modal open state ──────────────────────────────────────────────────────
  const [classOpen,    setClassOpen]    = useState(false);
  const [editingClass, setEditingClass] = useState(null);   // class object being edited
  const [taModalClass, setTaModalClass] = useState(null);   // class for TA config modal
  const [instructorModalClass, setInstructorModalClass] = useState(null); // class for instructor assign modal
  const [deletingClassId, setDeletingClassId] = useState(null);

  // ── Create form — all IDs empty, filled dynamically ──────────────────────
  const [classForm, setClassForm] = useState({
    courseOfferingId: '', sectionCode: '', name: '',
    room: '', schedule: '', capacity: 40,
    allowLateSubmissions: true, instructorId: ''
  });

  // ── Edit form ─────────────────────────────────────────────────────────────
  const [editForm, setEditForm] = useState({});

  // ── TA config state ───────────────────────────────────────────────────────
  const [taConfig, setTaConfig] = useState({
    taUserId: '',
    canViewRoster: true, canReviewSubmissions: true,
    canApplyRubrics: true, canManageDiscussions: true, canUploadResources: false
  });

  // ── Assign instructor state ───────────────────────────────────────────────
  const [assignInstructorId, setAssignInstructorId] = useState('');

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: classesData, isLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: lmsApi.listClasses
  });
  const { data: offeringsData } = useQuery({
    queryKey: ['course-offerings'],
    queryFn: lmsApi.listOfferings
  });
  const { data: instructorsData } = useQuery({
    queryKey: ['users', 'instructor'],
    queryFn: () => lmsApi.listUsers({ role: 'instructor', status: 'active', limit: 100 })
  });
  const { data: tasData } = useQuery({
    queryKey: ['users', 'teaching_assistant'],
    queryFn: () => lmsApi.listUsers({ role: 'teaching_assistant', status: 'active', limit: 100 })
  });

  const classes      = classesData?.data?.classes       || [];
  const offerings    = offeringsData?.data?.offerings    || [];
  const instructors  = instructorsData?.data?.users      || [];
  const teachingAsst = tasData?.data?.users              || [];

  // Auto-select first offering once loaded
  React.useEffect(() => {
    if (offerings.length > 0 && classForm.courseOfferingId === '')
      setClassForm((f) => ({ ...f, courseOfferingId: offerings[0].id }));
  }, [offerings]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCreateClass = async (e) => {
    e.preventDefault();
    try {
      await lmsApi.createClass({
        ...classForm,
        courseOfferingId: Number(classForm.courseOfferingId),
        capacity: Number(classForm.capacity),
        instructorId: classForm.instructorId ? Number(classForm.instructorId) : null
      });
      addToast('Class section created with default grading categories.');
      setClassForm({ courseOfferingId: offerings[0]?.id || '', sectionCode: '', name: '', room: '', schedule: '', capacity: 40, allowLateSubmissions: true, instructorId: '' });
      setClassOpen(false);
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    } catch (err) { addToast(extractErrorMessage(err), 'error'); }
  };

  const openEditClass = (cls) => {
    setEditingClass(cls);
    setEditForm({
      sectionCode: cls.sectionCode, name: cls.name,
      room: cls.room || '', schedule: cls.schedule || '',
      capacity: cls.capacity, allowLateSubmissions: cls.allowLateSubmissions,
      latePenaltyPercent: cls.latePenaltyPercent, status: cls.status
    });
  };

  const handleUpdateClass = async (e) => {
    e.preventDefault();
    try {
      await lmsApi.updateClass(editingClass.id, { ...editForm, capacity: Number(editForm.capacity) });
      addToast('Class section updated.');
      setEditingClass(null);
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    } catch (err) { addToast(extractErrorMessage(err), 'error'); }
  };

  const handleDeleteClass = async (id) => {
    try {
      await lmsApi.deleteClass(id);
      addToast('Class section deleted.');
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    } catch (err) { addToast(extractErrorMessage(err), 'error'); }
    finally { setDeletingClassId(null); }
  };

  const openAssignInstructor = (cls) => {
    setInstructorModalClass(cls);
    setAssignInstructorId(cls.instructorAssignments?.[0]?.instructorId || (instructors[0]?.id ?? ''));
  };

  const handleAssignInstructor = async (e) => {
    e.preventDefault();
    try {
      await lmsApi.assignInstructor(instructorModalClass.id, { instructorId: Number(assignInstructorId), isPrimary: true });
      addToast('Instructor assigned.');
      setInstructorModalClass(null);
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    } catch (err) { addToast(extractErrorMessage(err), 'error'); }
  };

  const openTaModal = (cls) => {
    setTaModalClass(cls);
    const existing = cls.taAssignments?.[0];
    setTaConfig({
      taUserId: existing?.taUserId || (teachingAsst[0]?.id ?? ''),
      canViewRoster:         existing?.canViewRoster         ?? true,
      canReviewSubmissions:  existing?.canReviewSubmissions   ?? true,
      canApplyRubrics:       existing?.canApplyRubrics        ?? true,
      canManageDiscussions:  existing?.canManageDiscussions   ?? true,
      canUploadResources:    existing?.canUploadResources     ?? false
    });
  };

  const handleSaveTaConfig = async (e) => {
    e.preventDefault();
    try {
      await lmsApi.assignTa(taModalClass.id, { ...taConfig, taUserId: Number(taConfig.taUserId) });
      addToast(`TA permissions saved for ${taModalClass.sectionCode}.`);
      setTaModalClass(null);
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    } catch (err) { addToast(extractErrorMessage(err), 'error'); }
  };

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Section Management"
        title="Class Sections, Faculty & Teaching Assistant Assignments"
        subtitle="Manage learner cohorts, assign instructors, and configure class-scoped TA permissions."
        actions={
          <button type="button" onClick={() => setClassOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg">
            <Plus className="w-4 h-4" /> Create Class Section
          </button>
        }
      />

      {/* ── Class cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {classes.length === 0 && (
          <p className="col-span-2 text-center text-slate-400 text-sm py-8">No class sections configured yet.</p>
        )}
        {classes.map((cls) => (
          <div key={cls.id} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded">{cls.sectionCode}</span>
              <div className="flex items-center gap-2">
                <StatusBadge status={cls.status} />
                <StatusBadge status={cls.finalGradesStatus} />
              </div>
            </div>
            <h3 className="text-base font-bold text-slate-900">{cls.name}</h3>
            <p className="text-xs text-slate-600">
              Schedule: <strong>{cls.schedule || 'TBA'}</strong> · Room: <strong>{cls.room || 'Online'}</strong> · Capacity: <strong>{cls.memberships?.filter(m => m.status === 'enrolled').length || 0} / {cls.capacity}</strong>
            </p>
            <div className="text-xs text-slate-600 space-y-1 pt-2 border-t border-slate-100">
              <p>
                <strong>Instructor:</strong>{' '}
                {(cls.instructorAssignments || []).length > 0
                  ? cls.instructorAssignments.map((ia) => `${ia.instructor?.firstName} ${ia.instructor?.lastName}`).join(', ')
                  : <span className="text-red-500 font-semibold">Unassigned</span>}
              </p>
              <p>
                <strong>Teaching Assistants:</strong>{' '}
                {(cls.taAssignments || []).length > 0
                  ? cls.taAssignments.map((ta) => `${ta.teachingAssistant?.firstName} ${ta.teachingAssistant?.lastName}`).join(', ')
                  : 'None'}
              </p>
            </div>
            {/* Action buttons */}
            <div className="pt-2 grid grid-cols-2 gap-2">
              <button onClick={() => openEditClass(cls)}
                className="py-1.5 text-xs font-semibold border border-slate-300 rounded-lg hover:bg-slate-50">
                Edit
              </button>
              <button onClick={() => setDeletingClassId(cls.id)}
                className="py-1.5 text-xs font-semibold border border-red-200 text-red-600 rounded-lg hover:bg-red-50">
                Delete
              </button>
              <button onClick={() => openAssignInstructor(cls)}
                className="py-1.5 text-xs font-semibold border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50">
                Assign Instructor
              </button>
              <button onClick={() => openTaModal(cls)}
                className="py-1.5 text-xs font-semibold border border-slate-300 rounded-lg hover:bg-slate-50">
                Configure TA
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Create Class modal ──────────────────────────────────────────────── */}
      <ModalDialog isOpen={classOpen} onClose={() => setClassOpen(false)} title="Create Class Section">
        <form onSubmit={handleCreateClass} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold mb-1">Course Offering</label>
            <select required value={classForm.courseOfferingId}
              onChange={(e) => setClassForm({ ...classForm, courseOfferingId: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
              {offerings.length === 0 && <option value="">— No offerings available —</option>}
              {offerings.map((o) => (
                <option key={o.id} value={o.id}>{o.offeringCode} — {o.titleOverride || o.course?.title}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Section Code</label>
              <input required placeholder="e.g. BSIT 4-C" value={classForm.sectionCode}
                onChange={(e) => setClassForm({ ...classForm, sectionCode: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Capacity</label>
              <input type="number" min={1} max={500} value={classForm.capacity}
                onChange={(e) => setClassForm({ ...classForm, capacity: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300" />
            </div>
          </div>
          <div>
            <label className="block font-semibold mb-1">Section Name</label>
            <input required placeholder="e.g. BSIT 4-C — Integrative Programming" value={classForm.name}
              onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Room / Lab</label>
              <input placeholder="e.g. NetAcad Lab 305" value={classForm.room}
                onChange={(e) => setClassForm({ ...classForm, room: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Schedule</label>
              <input placeholder="e.g. Fri 09:00–12:00" value={classForm.schedule}
                onChange={(e) => setClassForm({ ...classForm, schedule: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300" />
            </div>
          </div>
          <div>
            <label className="block font-semibold mb-1">Initial Instructor <span className="text-slate-400 font-normal">(optional)</span></label>
            <select value={classForm.instructorId}
              onChange={(e) => setClassForm({ ...classForm, instructorId: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
              <option value="">— Assign later —</option>
              {instructors.map((u) => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-xs">
            <input type="checkbox" checked={classForm.allowLateSubmissions}
              onChange={(e) => setClassForm({ ...classForm, allowLateSubmissions: e.target.checked })}
              className="rounded" />
            <span className="font-semibold">Allow Late Submissions</span>
          </label>
          <button type="submit" disabled={offerings.length === 0}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg">
            Create Class Section
          </button>
        </form>
      </ModalDialog>

      {/* ── Edit Class modal ─────────────────────────────────────────────────── */}
      <ModalDialog isOpen={!!editingClass} onClose={() => setEditingClass(null)} title="Edit Class Section">
        <form onSubmit={handleUpdateClass} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Section Code</label>
              <input required value={editForm.sectionCode || ''}
                onChange={(e) => setEditForm({ ...editForm, sectionCode: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Capacity</label>
              <input type="number" min={1} max={500} value={editForm.capacity || 40}
                onChange={(e) => setEditForm({ ...editForm, capacity: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300" />
            </div>
          </div>
          <div>
            <label className="block font-semibold mb-1">Section Name</label>
            <input required value={editForm.name || ''}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Room / Lab</label>
              <input value={editForm.room || ''}
                onChange={(e) => setEditForm({ ...editForm, room: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Schedule</label>
              <input value={editForm.schedule || ''}
                onChange={(e) => setEditForm({ ...editForm, schedule: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Late Penalty (%)</label>
              <input type="number" min={0} max={100} value={editForm.latePenaltyPercent ?? 10}
                onChange={(e) => setEditForm({ ...editForm, latePenaltyPercent: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Status</label>
              <select value={editForm.status || 'active'}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
                <option value="active">Active</option>
                <option value="closed">Closed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-xs">
            <input type="checkbox" checked={!!editForm.allowLateSubmissions}
              onChange={(e) => setEditForm({ ...editForm, allowLateSubmissions: e.target.checked })}
              className="rounded" />
            <span className="font-semibold">Allow Late Submissions</span>
          </label>
          <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg">
            Save Changes
          </button>
        </form>
      </ModalDialog>

      {/* ── Assign Instructor modal ─────────────────────────────────────────── */}
      <ModalDialog isOpen={!!instructorModalClass} onClose={() => setInstructorModalClass(null)}
        title={`Assign Instructor — ${instructorModalClass?.sectionCode || ''}`}>
        <form onSubmit={handleAssignInstructor} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold mb-1">Select Instructor</label>
            <select required value={assignInstructorId}
              onChange={(e) => setAssignInstructorId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
              {instructors.length === 0 && <option value="">— No instructors available —</option>}
              {instructors.map((u) => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={instructors.length === 0}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-lg">
            Assign Instructor
          </button>
        </form>
      </ModalDialog>

      {/* ── Configure TA modal ──────────────────────────────────────────────── */}
      <ModalDialog isOpen={!!taModalClass} onClose={() => setTaModalClass(null)}
        title={`Configure TA — ${taModalClass?.sectionCode || ''}`}>
        <form onSubmit={handleSaveTaConfig} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold mb-1">Select Teaching Assistant</label>
            <select required value={taConfig.taUserId}
              onChange={(e) => setTaConfig({ ...taConfig, taUserId: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
              {teachingAsst.length === 0 && <option value="">— No TAs available —</option>}
              {teachingAsst.map((u) => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>
              ))}
            </select>
          </div>
          <p className="text-slate-500 text-[11px]">TAs cannot publish final grades or alter system settings.</p>
          {[
            { key: 'canViewRoster',         label: 'View Class Student Roster' },
            { key: 'canReviewSubmissions',  label: 'Monitor & Review Student Submissions' },
            { key: 'canApplyRubrics',       label: 'Apply Grading Rubrics & Preliminary Feedback' },
            { key: 'canManageDiscussions',  label: 'Participate & Resolve Class Discussions' },
            { key: 'canUploadResources',    label: 'Upload Supplementary Lab Worksheets' }
          ].map((item) => (
            <label key={item.key} className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 cursor-pointer">
              <input type="checkbox" checked={!!taConfig[item.key]}
                onChange={(e) => setTaConfig({ ...taConfig, [item.key]: e.target.checked })}
                className="rounded border-slate-300 text-blue-600" />
              <span className="font-semibold text-slate-800">{item.label}</span>
            </label>
          ))}
          <button type="submit" disabled={teachingAsst.length === 0}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg">
            Save TA Permissions
          </button>
        </form>
      </ModalDialog>

      {/* ── Delete confirmation modal ───────────────────────────────────────── */}
      {deletingClassId && (
        <ModalDialog isOpen title="Delete Class Section" onClose={() => setDeletingClassId(null)} maxWidth="max-w-md">
          <p className="text-sm text-slate-600 mb-5">
            Are you sure you want to delete this class section? This cannot be undone.
            Sections with enrolled students cannot be deleted — archive them instead.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeletingClassId(null)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium hover:bg-slate-50">
              Cancel
            </button>
            <button onClick={() => handleDeleteClass(deletingClassId)}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold">
              Delete
            </button>
          </div>
        </ModalDialog>
      )}
    </div>
  );
}

export function EnrollmentManagementPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  // ── Class selection & status filter ──────────────────────────────────────
  const [selectedClassId, setSelectedClassId] = useState('');
  const [statusFilter,    setStatusFilter]    = useState('all');

  // ── Direct enrollment form ────────────────────────────────────────────────
  const [studentIdToEnroll, setStudentIdToEnroll] = useState('');

  // ── Transfer form ─────────────────────────────────────────────────────────
  const [transferOpen,  setTransferOpen]  = useState(false);
  const [transferForm,  setTransferForm]  = useState({ fromClassId: '', toClassId: '', studentId: '' });

  // ── Drop confirmation ─────────────────────────────────────────────────────
  const [droppingId, setDroppingId] = useState(null);
  const [dropRemarks, setDropRemarks] = useState('');

  // ── CSV import ────────────────────────────────────────────────────────────
  const [csvText, setCsvText] = useState('firstName,lastName,email,studentNumber');

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: lmsApi.listClasses
  });
  const { data: studentsData } = useQuery({
    queryKey: ['users', 'student'],
    queryFn: () => lmsApi.listUsers({ role: 'student', status: 'active', limit: 200 })
  });
  const { data: enrollmentsData, isLoading } = useQuery({
    queryKey: ['enrollments', selectedClassId],
    queryFn: () => lmsApi.listEnrollments(selectedClassId ? { classId: selectedClassId } : {}),
    enabled: true
  });

  const classes     = classesData?.data?.classes     || [];
  const students    = studentsData?.data?.users       || [];
  const allEnrollments = enrollmentsData?.data?.enrollments || [];

  // Auto-select first class once loaded
  React.useEffect(() => {
    if (classes.length > 0 && selectedClassId === '')
      setSelectedClassId(classes[0].id);
  }, [classes]);

  // Filtered roster
  const enrollments = statusFilter === 'all'
    ? allEnrollments
    : allEnrollments.filter((e) => e.status === statusFilter);

  // Counts by status for the header badges
  const pending  = allEnrollments.filter((e) => e.status === 'pending').length;
  const enrolled = allEnrollments.filter((e) => e.status === 'enrolled').length;
  const dropped  = allEnrollments.filter((e) => e.status === 'dropped').length;

  // Find selected class object (for capacity display)
  const selectedClass = classes.find((c) => c.id === Number(selectedClassId));

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleEnroll = async (e) => {
    e.preventDefault();
    if (!studentIdToEnroll) return addToast('Please select a student.', 'error');
    try {
      await lmsApi.enrollStudent({ classId: Number(selectedClassId), studentId: Number(studentIdToEnroll) });
      addToast('Student enrolled successfully.');
      setStudentIdToEnroll('');
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    } catch (err) { addToast(extractErrorMessage(err), 'error'); }
  };

  const handleDrop = async () => {
    if (!droppingId) return;
    try {
      await lmsApi.dropStudent(droppingId, { remarks: dropRemarks });
      addToast('Student dropped from class section.');
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    } catch (err) { addToast(extractErrorMessage(err), 'error'); }
    finally { setDroppingId(null); setDropRemarks(''); }
  };

  const handleApprove = async (enrollmentId) => {
    try {
      await lmsApi.updateEnrollmentStatus(enrollmentId, { status: 'enrolled' });
      addToast('Enrollment approved.');
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    } catch (err) { addToast(extractErrorMessage(err), 'error'); }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    try {
      await lmsApi.transferStudent({
        fromClassId: Number(transferForm.fromClassId),
        toClassId:   Number(transferForm.toClassId),
        studentId:   Number(transferForm.studentId)
      });
      addToast('Student transferred successfully.');
      setTransferOpen(false);
      setTransferForm({ fromClassId: '', toClassId: '', studentId: '' });
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    } catch (err) { addToast(extractErrorMessage(err), 'error'); }
  };

  const handleCsvImport = async (e) => {
    e.preventDefault();
    try {
      const result = await lmsApi.importCsv({
        classId: Number(selectedClassId),
        defaultRole: 'student',
        csvText
      });
      addToast(result.message);
      setCsvText('firstName,lastName,email,studentNumber');
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    } catch (err) { addToast(extractErrorMessage(err), 'error'); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Registrar Operations"
        title="Student Enrollment & Bulk CSV Record Import"
        subtitle="Enroll students, manage pending approvals, drop or transfer, and bulk-import rosters via CSV."
      />

      {/* ── Action forms row ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Direct enrollment */}
        <form onSubmit={handleEnroll} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 text-xs">
          <h2 className="text-base font-bold text-slate-900">Direct Enrollment</h2>
          <div>
            <label className="block font-semibold mb-1">Class Section</label>
            <select value={selectedClassId}
              onChange={(e) => setSelectedClassId(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
              {classes.length === 0 && <option value="">— No classes —</option>}
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.sectionCode} — {c.courseOffering?.course?.code || c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1">Student</label>
            <select value={studentIdToEnroll}
              onChange={(e) => setStudentIdToEnroll(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
              <option value="">— Select a student —</option>
              {students.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName} {u.studentNumber ? `(${u.studentNumber})` : ''}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={!studentIdToEnroll || !selectedClassId}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg">
            Enroll Student
          </button>
        </form>

        {/* CSV import */}
        <form onSubmit={handleCsvImport} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Bulk CSV Import</h2>
            <Upload className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-slate-400 text-[11px]">
            Format: <code className="bg-slate-100 px-1 rounded">firstName,lastName,email,studentNumber</code>
            <br />Existing accounts are matched by email. New accounts get password <code className="bg-slate-100 px-1 rounded">Stud@12345</code>.
          </p>
          <textarea rows={5} value={csvText} onChange={(e) => setCsvText(e.target.value)}
            className="w-full p-3 rounded-lg border border-slate-300 font-mono text-[11px] resize-none" />
          <button type="submit" disabled={!selectedClassId}
            className="w-full py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold rounded-lg">
            Import & Enroll
          </button>
        </form>

        {/* Transfer + quick stats */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 text-xs">
          <h2 className="text-base font-bold text-slate-900">Roster Overview</h2>
          {selectedClass && (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Capacity</span>
                <span className={`font-semibold ${enrolled >= selectedClass.capacity ? 'text-red-600' : 'text-slate-700'}`}>
                  {enrolled} / {selectedClass.capacity}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div className="bg-blue-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (enrolled / selectedClass.capacity) * 100)}%` }} />
              </div>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {[
              { label: 'Enrolled',  val: enrolled, color: 'text-emerald-600' },
              { label: 'Pending',   val: pending,  color: 'text-amber-600'   },
              { label: 'Dropped',   val: dropped,  color: 'text-red-500'     }
            ].map((s) => (
              <div key={s.label} className="text-center p-2 rounded-lg bg-slate-50 border border-slate-200">
                <p className={`text-lg font-bold ${s.color}`}>{s.val}</p>
                <p className="text-slate-500 text-[10px]">{s.label}</p>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => {
              setTransferForm({ fromClassId: selectedClassId, toClassId: '', studentId: '' });
              setTransferOpen(true);
            }}
            className="w-full py-2 border border-indigo-300 text-indigo-700 hover:bg-indigo-50 font-semibold rounded-lg">
            Transfer a Student
          </button>
        </div>
      </div>

      {/* ── Roster table ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-base font-bold text-slate-900">
            Section Roster
            {allEnrollments.length > 0 && (
              <span className="ml-2 text-xs font-normal text-slate-400">{allEnrollments.length} total</span>
            )}
          </h2>
          {/* Status filter */}
          <div className="flex items-center gap-1 text-xs">
            {['all', 'enrolled', 'pending', 'dropped', 'transferred', 'completed'].map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded-lg font-semibold capitalize transition-colors ${
                  statusFilter === s
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <LoadingState />
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Student No.</th>
                <th className="px-4 py-3">Learner Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Section</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {enrollments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    {allEnrollments.length === 0 ? 'No enrollments in this class section.' : `No "${statusFilter}" enrollments.`}
                  </td>
                </tr>
              )}
              {enrollments.map((enr) => (
                <tr key={enr.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-slate-600">
                    {enr.student?.studentNumber || `STU-${enr.studentId}`}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {enr.student?.firstName} {enr.student?.lastName}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{enr.student?.email}</td>
                  <td className="px-4 py-3">{enr.classSection?.sectionCode}</td>
                  <td className="px-4 py-3"><StatusBadge status={enr.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {/* Approve pending */}
                      {enr.status === 'pending' && (
                        <button onClick={() => handleApprove(enr.id)}
                          className="text-emerald-600 hover:text-emerald-800 font-semibold">
                          Approve
                        </button>
                      )}
                      {/* Drop — only for enrolled or pending */}
                      {['enrolled', 'pending'].includes(enr.status) && (
                        <button onClick={() => { setDroppingId(enr.id); setDropRemarks(''); }}
                          className="text-red-500 hover:text-red-700 font-semibold">
                          Drop
                        </button>
                      )}
                      {/* Show remarks for dropped/transferred */}
                      {['dropped', 'transferred'].includes(enr.status) && enr.remarks && (
                        <span className="text-slate-400 italic truncate max-w-[120px]" title={enr.remarks}>
                          {enr.remarks}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Drop confirmation modal ─────────────────────────────────────── */}
      {droppingId && (
        <ModalDialog isOpen title="Drop Student" onClose={() => setDroppingId(null)} maxWidth="max-w-md">
          <p className="text-sm text-slate-600 mb-3">
            Are you sure you want to drop this student from the class section? Their status will be set to <strong>dropped</strong>.
          </p>
          <div className="mb-5">
            <label className="block text-xs font-semibold mb-1">Remarks <span className="text-slate-400 font-normal">(optional)</span></label>
            <input value={dropRemarks} onChange={(e) => setDropRemarks(e.target.value)}
              placeholder="Reason for dropping..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs" />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDroppingId(null)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium hover:bg-slate-50">
              Cancel
            </button>
            <button onClick={handleDrop}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold">
              Drop Student
            </button>
          </div>
        </ModalDialog>
      )}

      {/* ── Transfer modal ──────────────────────────────────────────────── */}
      {transferOpen && (
        <ModalDialog isOpen title="Transfer Student to Another Section" onClose={() => setTransferOpen(false)} maxWidth="max-w-md">
          <form onSubmit={handleTransfer} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold mb-1">Student</label>
              <select required value={transferForm.studentId}
                onChange={(e) => setTransferForm({ ...transferForm, studentId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
                <option value="">— Select student —</option>
                {allEnrollments
                  .filter((enr) => ['enrolled', 'pending'].includes(enr.status))
                  .map((enr) => (
                    <option key={enr.id} value={enr.studentId}>
                      {enr.student?.firstName} {enr.student?.lastName} ({enr.student?.studentNumber || `ID ${enr.studentId}`})
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">From Section</label>
              <select required value={transferForm.fromClassId}
                onChange={(e) => setTransferForm({ ...transferForm, fromClassId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
                <option value="">— Select source class —</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.sectionCode} — {c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">To Section</label>
              <select required value={transferForm.toClassId}
                onChange={(e) => setTransferForm({ ...transferForm, toClassId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
                <option value="">— Select destination class —</option>
                {classes.filter((c) => c.id !== Number(transferForm.fromClassId)).map((c) => (
                  <option key={c.id} value={c.id}>{c.sectionCode} — {c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setTransferOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium hover:bg-slate-50">
                Cancel
              </button>
              <button type="submit"
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold">
                Transfer
              </button>
            </div>
          </form>
        </ModalDialog>
      )}
    </div>
  );
}

export function GradeApprovalsPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  // ── Filters & expanded gradebook state ───────────────────────────────────
  const [showAll, setShowAll]             = useState(false);   // toggle all classes vs submitted only
  const [expandedClassId, setExpandedClassId] = useState(null); // which class shows gradebook
  const [gradebook, setGradebook]         = useState(null);    // loaded gradebook data
  const [gradebookLoading, setGradebookLoading] = useState(false);

  // ── Confirmation dialog state ─────────────────────────────────────────────
  const [pendingAction, setPendingAction] = useState(null); // { classId, decision, sectionCode }
  const [actionRemarks, setActionRemarks] = useState('');

  const { data: classesData, isLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: lmsApi.listClasses
  });

  const decisionMutation = useMutation({
    mutationFn: ({ classId, decision, remarks }) =>
      lmsApi.approveFinalGrades(classId, { decision, remarks }),
    onSuccess: (res) => {
      addToast(res.message);
      setPendingAction(null);
      setActionRemarks('');
      setExpandedClassId(null);
      setGradebook(null);
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'academic_admin'] });
    },
    onError: (err) => addToast(extractErrorMessage(err), 'error')
  });

  if (isLoading) return <LoadingState />;

  const allClasses  = classesData?.data?.classes || [];
  const classes     = showAll
    ? allClasses
    : allClasses.filter((c) => c.finalGradesStatus === 'submitted_for_approval');

  const pendingCount = allClasses.filter((c) => c.finalGradesStatus === 'submitted_for_approval').length;

  // ── Load gradebook for a class ────────────────────────────────────────────
  const handleToggleGradebook = async (classId) => {
    if (expandedClassId === classId) {
      setExpandedClassId(null);
      setGradebook(null);
      return;
    }
    setExpandedClassId(classId);
    setGradebookLoading(true);
    try {
      const res = await lmsApi.getClassGradebook(classId);
      setGradebook(res.data);
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
      setExpandedClassId(null);
    } finally {
      setGradebookLoading(false);
    }
  };

  // ── Open confirmation dialog ──────────────────────────────────────────────
  const openConfirm = (cls, decision) => {
    setPendingAction({ classId: cls.id, decision, sectionCode: cls.sectionCode });
    setActionRemarks(decision === 'returned' ? '' : '');
  };

  const handleConfirm = () => {
    if (!pendingAction) return;
    decisionMutation.mutate({
      classId:  pendingAction.classId,
      decision: pendingAction.decision,
      remarks:  actionRemarks || undefined
    });
  };

  // ── Grade letter color helper ─────────────────────────────────────────────
  const gradeColor = (pct) => {
    if (pct === null || pct === undefined) return 'text-slate-400';
    if (pct >= 75) return 'text-emerald-600';
    return 'text-red-500';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Registrar Grade Governance"
        title="Final Grade Submission Review & Approval Workflow"
        subtitle="Review instructor-submitted final class grades and authorize official publication."
      />

      {/* ── Header stats + filter toggle ─────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 text-sm">
          <span className="font-semibold text-slate-700">
            {pendingCount} class{pendingCount !== 1 ? 'es' : ''} awaiting approval
          </span>
          {allClasses.length > pendingCount && (
            <button onClick={() => setShowAll((v) => !v)}
              className="text-blue-600 hover:underline font-medium text-xs">
              {showAll ? 'Show pending only' : `Show all ${allClasses.length} classes`}
            </button>
          )}
        </div>
      </div>

      {/* ── Class cards ───────────────────────────────────────────────────── */}
      {classes.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
          <p className="text-slate-600 font-semibold">No pending grade submissions.</p>
          <p className="text-xs text-slate-400 mt-1">All submitted class grades have been reviewed.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {classes.map((cls) => {
            const isExpanded    = expandedClassId === cls.id;
            const isPending     = cls.finalGradesStatus === 'submitted_for_approval';
            const instructors   = (cls.instructorAssignments || [])
              .map((ia) => `${ia.instructor?.firstName || ''} ${ia.instructor?.lastName || ''}`.trim())
              .filter(Boolean)
              .join(', ') || 'Unassigned';
            const enrolledCount = (cls.memberships || []).filter((m) => m.status === 'enrolled').length;

            return (
              <div key={cls.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Card header */}
                <div className="p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        {cls.sectionCode}
                      </span>
                      <StatusBadge status={cls.finalGradesStatus} />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{cls.name}</h3>
                    <p className="text-xs text-slate-500">
                      Course: <strong>{cls.courseOffering?.course?.code || '—'}</strong>
                      {' · '}Instructor: <strong>{instructors}</strong>
                      {' · '}Enrolled: <strong>{enrolledCount}</strong>
                      {cls.finalGradesSubmittedAt && (
                        <> · Submitted: <strong>{new Date(cls.finalGradesSubmittedAt).toLocaleDateString()}</strong></>
                      )}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* View Grades toggle */}
                    <button onClick={() => handleToggleGradebook(cls.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg">
                      {isExpanded ? '▲ Hide Grades' : '▼ View Grades'}
                    </button>

                    {isPending && (
                      <>
                        <button onClick={() => openConfirm(cls, 'approved')}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg">
                          <CheckCircle2 className="w-4 h-4" />
                          Approve
                        </button>
                        <button onClick={() => openConfirm(cls, 'returned')}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-semibold rounded-lg">
                          <RotateCcw className="w-4 h-4" />
                          Return
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Gradebook preview panel */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50 p-5">
                    {gradebookLoading ? (
                      <div className="flex items-center justify-center py-6 text-slate-400 text-sm">
                        Loading gradebook…
                      </div>
                    ) : gradebook && gradebook.classId === cls.id ? (
                      <>
                        {/* Summary row */}
                        <div className="flex items-center gap-4 mb-4 text-xs text-slate-500">
                          <span>Passing score: <strong className="text-slate-700">{gradebook.passingScore}%</strong></span>
                          <span>Configured weight: <strong className="text-slate-700">{gradebook.totalConfiguredWeight}%</strong></span>
                          <span>Students: <strong className="text-slate-700">{gradebook.students?.length || 0}</strong></span>
                          <span className={`font-semibold ${gradebook.students?.filter(s => s.isPassing).length === gradebook.students?.length ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {gradebook.students?.filter(s => s.isPassing && s.standingPercentage !== null).length} / {gradebook.students?.length} passing
                          </span>
                        </div>

                        {/* Grade categories header */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-white border border-slate-200 rounded">
                              <tr>
                                <th className="px-3 py-2 font-semibold text-slate-700">Student</th>
                                {(gradebook.categories || []).map((cat) => (
                                  <th key={cat.id} className="px-3 py-2 font-semibold text-slate-700 text-center whitespace-nowrap">
                                    {cat.name}
                                    <span className="block text-[10px] text-slate-400 font-normal">{cat.weightPercent}%</span>
                                  </th>
                                ))}
                                <th className="px-3 py-2 font-semibold text-slate-700 text-center">Standing</th>
                                <th className="px-3 py-2 font-semibold text-slate-700 text-center">Grade</th>
                                <th className="px-3 py-2 font-semibold text-slate-700 text-center">Remarks</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {(gradebook.students || []).map((s) => (
                                <tr key={s.studentId} className={`hover:bg-white ${!s.isPassing && s.standingPercentage !== null ? 'bg-red-50/40' : ''}`}>
                                  <td className="px-3 py-2">
                                    <p className="font-semibold text-slate-900">{s.studentName}</p>
                                    <p className="text-slate-400 text-[10px]">{s.studentNumber}</p>
                                  </td>
                                  {(gradebook.categories || []).map((cat) => {
                                    const cb = s.categoryBreakdown?.[cat.id];
                                    return (
                                      <td key={cat.id} className="px-3 py-2 text-center">
                                        {cb?.percentage !== null && cb?.percentage !== undefined
                                          ? <span className={gradeColor(cb.percentage)}>{cb.percentage.toFixed(1)}%</span>
                                          : <span className="text-slate-300">—</span>}
                                      </td>
                                    );
                                  })}
                                  <td className={`px-3 py-2 text-center font-bold ${gradeColor(s.standingPercentage)}`}>
                                    {s.standingPercentage !== null ? `${s.standingPercentage}%` : '—'}
                                  </td>
                                  <td className={`px-3 py-2 text-center font-bold ${gradeColor(s.standingPercentage)}`}>
                                    {s.institutionalGrade || '—'}
                                    {s.letterGrade && s.letterGrade !== 'N/A' && (
                                      <span className="ml-1 text-slate-400 font-normal">({s.letterGrade})</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-center text-slate-500">{s.remarks || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Confirmation dialog ───────────────────────────────────────────── */}
      {pendingAction && (
        <ModalDialog
          isOpen
          title={pendingAction.decision === 'returned' ? 'Return Grades for Revision' : 'Approve Final Grades'}
          onClose={() => { setPendingAction(null); setActionRemarks(''); }}
          maxWidth="max-w-md"
        >
          {pendingAction.decision === 'approved' ? (
            <p className="text-sm text-slate-600 mb-4">
              You are about to <strong>approve and publish</strong> final grades for{' '}
              <strong>{pendingAction.sectionCode}</strong>. Students will have their final
              grades recorded and instructors will be notified.
            </p>
          ) : (
            <p className="text-sm text-slate-600 mb-4">
              You are returning grades for <strong>{pendingAction.sectionCode}</strong> to
              the instructor for revision. Please provide a reason.
            </p>
          )}
          <div className="mb-5">
            <label className="block text-xs font-semibold mb-1">
              {pendingAction.decision === 'returned' ? 'Reason for Return' : 'Remarks (optional)'}
            </label>
            <textarea
              rows={3}
              value={actionRemarks}
              onChange={(e) => setActionRemarks(e.target.value)}
              placeholder={pendingAction.decision === 'returned'
                ? 'Describe what needs to be corrected...'
                : 'Optional approval notes to the instructor...'}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs resize-none"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => { setPendingAction(null); setActionRemarks(''); }}
              className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium hover:bg-slate-50">
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={decisionMutation.isPending || (pendingAction.decision === 'returned' && !actionRemarks.trim())}
              className={`px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50 ${
                pendingAction.decision === 'returned'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {decisionMutation.isPending ? 'Processing…' : pendingAction.decision === 'returned' ? 'Return to Instructor' : 'Approve & Publish'}
            </button>
          </div>
        </ModalDialog>
      )}
    </div>
  );
}


