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
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  Area,
  AreaChart
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
  RotateCcw,
  Search,
  Lock,
  Key,
  Edit2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  BarChart3,
  PieChart as PieIcon,
  GraduationCap,
  UserCheck,
  AlertTriangle
} from 'lucide-react';
import { lmsApi, extractErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  PageHeader,
  StatCard,
  StatusBadge,
  LoadingState,
  ErrorState,
  ModalDialog,
  useToast
} from '../components/ui/SharedComponents';

// ── Shared: Classes This Semester table with pagination ──────────────────────
function ClassesThisTermTable({ classes = [], activeSemester, rowsPerPageDefault = 5 }) {
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(rowsPerPageDefault);

  const total      = classes.length;
  const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));
  const currentPg  = Math.min(page, totalPages);
  const paged      = classes.slice((currentPg - 1) * rowsPerPage, currentPg * rowsPerPage);
  const startIdx   = total === 0 ? 0 : (currentPg - 1) * rowsPerPage + 1;
  const endIdx     = Math.min(currentPg * rowsPerPage, total);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900">Classes This Semester</h2>
          {activeSemester && <p className="text-xs text-slate-400 mt-0.5">{activeSemester}</p>}
        </div>
        <span className="text-xs text-slate-400">{total} section{total !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Section</th>
              <th className="px-4 py-3">Course</th>
              <th className="px-4 py-3">Instructor</th>
              <th className="px-4 py-3">Students Enrolled</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {paged.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  No classes configured for the current semester.
                </td>
              </tr>
            )}
            {paged.map((cls) => {
              const fillPct = cls.capacity > 0 ? Math.round((cls.enrolledCount / cls.capacity) * 100) : 0;
              const isFull  = cls.enrolledCount >= cls.capacity;
              return (
                <tr key={cls.id} className="hover:bg-slate-50">
                  {/* Section code */}
                  <td className="px-4 py-3 font-mono font-bold text-blue-700 whitespace-nowrap">
                    {cls.sectionCode}
                  </td>

                  {/* Course */}
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{cls.courseCode || '—'}</p>
                    {cls.courseTitle && (
                      <p className="text-[11px] text-slate-400 truncate max-w-[180px]">{cls.courseTitle}</p>
                    )}
                  </td>

                  {/* Instructor */}
                  <td className="px-4 py-3">
                    {cls.hasInstructor
                      ? <span className="text-slate-700">{cls.instructorName}</span>
                      : <span className="text-red-500 font-semibold">Unassigned</span>}
                  </td>

                  {/* Students enrolled — count + inline progress bar */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <span className={`font-bold whitespace-nowrap ${isFull ? 'text-red-600' : 'text-slate-800'}`}>
                        {cls.enrolledCount}
                        <span className="font-normal text-slate-400"> / {cls.capacity}</span>
                      </span>
                    </div>
                    {/* Capacity bar */}
                    <div className="w-full bg-slate-100 rounded-full h-1 mt-1 overflow-hidden">
                      <div
                        className={`h-1 rounded-full ${
                          fillPct >= 90 ? 'bg-red-500' : fillPct >= 70 ? 'bg-amber-400' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, fillPct)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{fillPct}% full</p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={rowsPerPage}
            onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
            className="px-2 py-1 rounded border border-slate-300 bg-white font-semibold"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>
          <span className="text-slate-400">|</span>
          <span>
            {total === 0 ? '0' : `${startIdx}–${endIdx}`} of <strong>{total}</strong>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            disabled={currentPg <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="inline-flex items-center gap-1 px-3 py-1 rounded border border-slate-300 bg-white font-semibold disabled:opacity-40 hover:bg-slate-100"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Prev
          </button>
          <span className="px-2 font-semibold">{currentPg} / {totalPages}</span>
          <button
            disabled={currentPg >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="inline-flex items-center gap-1 px-3 py-1 rounded border border-slate-300 bg-white font-semibold disabled:opacity-40 hover:bg-slate-100"
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AcademicDashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard', 'academic_admin'],
    queryFn: lmsApi.getDashboardSummary
  });

  const { data: usersData } = useQuery({
    queryKey: ['users', '', '', '', 1, 5],
    queryFn: () => lmsApi.listUsers({ limit: 5, page: 1 })
  });

  if (isLoading) return <LoadingState label="Loading dashboard…" />;
  if (error) return <ErrorState message={extractErrorMessage(error)} onRetry={refetch} />;

  const d = data?.data || {};
  const m = d.metrics || {};
  const recentUsers = usersData?.data?.users || [];
  const totalUsers  = usersData?.data?.pagination?.total ?? 0;

  const activeSemesterLabel = m.activeSemester
    ? `${m.activeSemester}${m.activeAcademicYear ? ` · ${m.activeAcademicYear}` : ''}`
    : 'No active semester configured';

  const classes       = d.classesAtAGlance || [];
  const totalCap      = classes.reduce((a, c) => a + (c.capacity || 0), 0);
  const totalEnrolled = classes.reduce((a, c) => a + (c.enrolledCount || 0), 0);
  const fillRate      = totalCap > 0 ? Math.round((totalEnrolled / totalCap) * 100) : 0;
  const unassigned    = classes.filter((c) => !c.hasInstructor).length;

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Academic Administration"
        title={`Welcome back, ${user?.firstName || 'Administrator'}`}
        subtitle={`Active Term: ${activeSemesterLabel}`}
      />

      {/* ── Stat cards — admin-focused ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Departments"
          value={m.totalDepartments ?? 0}
          subtitle={`${m.totalPrograms ?? 0} degree programs`}
          icon={Building2}
          accent="blue"
        />
        <StatCard
          title="Total Users"
          value={totalUsers}
          subtitle="Institutional accounts"
          icon={Users}
          accent="indigo"
        />
        <StatCard
          title="Courses Offered"
          value={m.totalCourses ?? 0}
          subtitle={`${m.totalClasses ?? 0} class sections this term`}
          icon={BookOpen}
          accent="emerald"
        />
        <StatCard
          title="Enrollments"
          value={m.totalEnrollments ?? 0}
          subtitle={`${fillRate}% capacity · ${unassigned > 0 ? `${unassigned} unassigned` : 'All assigned'}`}
          icon={GraduationCap}
          accent="amber"
        />
      </div>

      {/* ── Enrollment chart + Quick actions ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 mb-1">Enrollment by Degree Program</h2>
          <p className="text-xs text-slate-500 mb-4">Student distribution · {m.activeSemester || 'current term'}</p>
          <div className="h-56">
            {(d.enrollmentByProgram || []).length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                No enrollment data for the current term.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.enrollmentByProgram} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="programCode" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val, _, props) => [val, props.payload.programName]}
                    labelFormatter={(l) => `Program: ${l}`}
                  />
                  <Bar dataKey="enrollments" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <h2 className="text-base font-bold text-slate-900">Quick Actions</h2>
          {[
            { label: 'Manage Users',           desc: 'Create, edit, reset accounts',   to: '/academic/users',         color: 'bg-blue-600 hover:bg-blue-700' },
            { label: 'Departments & Programs', desc: 'Academic structure',              to: '/academic/structure',     color: 'bg-indigo-600 hover:bg-indigo-700' },
            { label: 'Years & Semesters',      desc: 'Configure academic terms',        to: '/academic/terms',         color: 'bg-violet-600 hover:bg-violet-700' },
            { label: 'Announcements',          desc: 'Post institutional notices',      to: '/academic/announcements', color: 'bg-emerald-600 hover:bg-emerald-700' },
            { label: 'Analytics',              desc: 'View institutional insights',     to: '/academic/analytics',     color: 'bg-amber-600 hover:bg-amber-700' }
          ].map((a) => (
            <Link key={a.to} to={a.to}
              className={`flex items-center justify-between w-full px-4 py-3 ${a.color} text-white rounded-lg transition-colors`}>
              <div>
                <p className="text-xs font-bold">{a.label}</p>
                <p className="text-[11px] opacity-80">{a.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 opacity-70 shrink-0" />
            </Link>
          ))}
        </div>
      </div>

      {/* ── Department overview ───────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Department Overview</h2>
          <Link to="/academic/structure" className="text-xs text-blue-600 hover:underline font-semibold">Manage →</Link>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Head</th>
              <th className="px-4 py-3 text-center">Programs</th>
              <th className="px-4 py-3 text-center">Courses</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {(d.departmentSummary || []).length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No departments configured.</td></tr>
            )}
            {(d.departmentSummary || []).map((dept) => (
              <tr key={dept.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono font-bold text-blue-700">{dept.code}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">{dept.name}</td>
                <td className="px-4 py-3 text-slate-500">{dept.headName || <span className="italic text-slate-300">TBA</span>}</td>
                <td className="px-4 py-3 text-center font-semibold">{dept.programCount ?? 0}</td>
                <td className="px-4 py-3 text-center font-semibold">{dept.courseCount ?? 0}</td>
                <td className="px-4 py-3"><StatusBadge status={dept.status || 'active'} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Classes This Semester — card grid matching instructor style ────── */}
      {/* ── Classes This Semester — table with pagination ───────────────────── */}
      <ClassesThisTermTable
        classes={d.classesAtAGlance || []}
        activeSemester={m.activeSemester}
        rowsPerPageDefault={5}
      />

      {/* ── Recent users + Announcements ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent user accounts */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Recent User Accounts</h2>
            <Link to="/academic/users" className="text-xs text-blue-600 hover:underline font-semibold">View All →</Link>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {recentUsers.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-400">No users found.</td></tr>
              )}
              {recentUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{u.firstName} {u.lastName}</p>
                    <p className="text-slate-400 text-[10px]">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 capitalize text-slate-600">
                    {(u.roles?.[0]?.slug || 'student').replace('_', ' ')}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Recent announcements */}
        <div className="bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Recent Announcements</h2>
            <Link to="/academic/announcements" className="text-xs text-blue-600 hover:underline font-semibold">View All →</Link>
          </div>
          <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-72">
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
                    {a.author ? `${a.author.firstName} ${a.author.lastName}` : 'System'} · {new Date(a.createdAt).toLocaleDateString()}
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

  // ── Pagination state ──────────────────────────────────────────────────────
  const [progPage, setProgPage] = useState(1);
  const [progRowsPerPage, setProgRowsPerPage] = useState(5);

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

  const totalPrograms = programs.length;
  const totalPages = Math.max(1, Math.ceil(totalPrograms / progRowsPerPage));
  const currentPage = Math.min(progPage, totalPages);
  const paginatedPrograms = programs.slice((currentPage - 1) * progRowsPerPage, currentPage * progRowsPerPage);
  const startIdx = totalPrograms === 0 ? 0 : (currentPage - 1) * progRowsPerPage + 1;
  const endIdx = Math.min(currentPage * progRowsPerPage, totalPrograms);

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
            {paginatedPrograms.map((p) => (
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

export function AcademicUserManagementPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const { addToast } = useToast();

  // ── Filters ──────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // ── Modals ────────────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [resetUser, setResetUser] = useState(null);         // user being password-reset
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [resetResult, setResetResult] = useState(null);     // { email, temporaryPassword }

  // ── Edit form ──────────────────────────────────────────────────────────────
  const [editForm, setEditForm] = useState({
    firstName: '', lastName: '', email: '', status: 'active', roleSlug: 'student'
  });

  // ── Create form ────────────────────────────────────────────────────────────
  const [createForm, setCreateForm] = useState({
    firstName: '', lastName: '', email: '', password: 'Password@123', roleSlug: 'student'
  });

  const { data, isLoading } = useQuery({
    queryKey: ['users', search, roleFilter, statusFilter, page, limit],
    queryFn: () => lmsApi.listUsers({ search, role: roleFilter, status: statusFilter, page, limit })
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => lmsApi.updateUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      addToast('User account updated.');
    },
    onError: (err) => addToast(extractErrorMessage(err), 'error')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => lmsApi.deleteUser(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      addToast(res?.message || 'User removed.');
    },
    onError: (err) => addToast(extractErrorMessage(err), 'error')
  });

  const resetMutation = useMutation({
    mutationFn: ({ id, newPassword }) => lmsApi.resetUserPassword(id, { newPassword }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setResetResult({ email: resetUser?.email, temporaryPassword: res.data?.temporaryPassword || newPassword || 'Password@123' });
      addToast(`Password reset for ${resetUser?.email}.`);
    },
    onError: (err) => addToast(extractErrorMessage(err), 'error')
  });

  const users = data?.data?.users || [];
  const pagination = data?.data?.pagination || { total: 0, page, limit, totalPages: 1 };

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSearchChange = (val) => { setSearch(val); setPage(1); };
  const handleRoleFilterChange = (val) => { setRoleFilter(val); setPage(1); };
  const handleStatusFilterChange = (val) => { setStatusFilter(val); setPage(1); };
  const handleLimitChange = (val) => { setLimit(Number(val)); setPage(1); };

  const openEdit = (u) => {
    setEditingUser(u);
    setEditForm({
      firstName: u.firstName || '', lastName: u.lastName || '',
      email: u.email || '', status: u.status || 'active',
      roleSlug: u.roles?.[0]?.slug || 'student'
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const isSuperAdmin = (editingUser.roles || []).some((r) => r.slug === 'super_admin');
      const payload = { firstName: editForm.firstName, lastName: editForm.lastName, status: editForm.status };
      if (!isSuperAdmin && editForm.roleSlug) payload.roleSlug = editForm.roleSlug;
      await lmsApi.updateUser(editingUser.id, payload);
      addToast(`Account for ${editForm.firstName} ${editForm.lastName} updated.`);
      setEditOpen(false);
      setEditingUser(null);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (err) { addToast(extractErrorMessage(err), 'error'); }
  };

  const handleDelete = (u) => {
    const isSuperAdmin = (u.roles || []).some((r) => r.slug === 'super_admin');
    if (isSuperAdmin) { addToast('Super Admin accounts cannot be deleted.', 'error'); return; }
    if (window.confirm(`Delete or deactivate "${u.email}"?`)) deleteMutation.mutate(u.id);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await lmsApi.createUser(createForm);
      addToast('User account created.');
      setCreateForm({ firstName: '', lastName: '', email: '', password: 'Password@123', roleSlug: 'student' });
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (err) { addToast(extractErrorMessage(err), 'error'); }
  };

  const openReset = (u) => {
    setResetUser(u);
    setResetPasswordValue('');
    setResetResult(null);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetUser) return;
    resetMutation.mutate({ id: resetUser.id, newPassword: resetPasswordValue || undefined });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Registrar Operations"
        title="User Account Management & Password Reset"
        subtitle="Create, edit, activate, suspend, and reset passwords for institutional accounts."
        actions={
          <button type="button" onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg">
            <Plus className="w-4 h-4" /> Create User Account
          </button>
        }
      />

      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input type="text" value={search} onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300" />
        </div>
        <select value={roleFilter} onChange={(e) => handleRoleFilterChange(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white">
          <option value="">All Roles</option>
          <option value="super_admin">Super Administrator</option>
          <option value="academic_admin">Academic Administrator</option>
          <option value="instructor">Instructor</option>
          <option value="teaching_assistant">Teaching Assistant</option>
          <option value="student">Student</option>
        </select>
        <select value={statusFilter} onChange={(e) => handleStatusFilterChange(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* ── User table ──────────────────────────────────────────────────── */}
      {isLoading ? (
        <LoadingState />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Name & Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No users match the filter criteria.</td></tr>
                )}
                {users.map((u) => {
                  const role = u.roles?.[0]?.slug || 'student';
                  const isSuperAdmin = role === 'super_admin';
                  const isSelf = u.id === currentUser?.id;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                          {u.firstName} {u.lastName}
                          {isSelf && <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-700 font-bold">You</span>}
                        </p>
                        <p className="text-slate-500">{u.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        {isSuperAdmin ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs select-none">
                            <Lock className="w-3.5 h-3.5" /> Super Admin (Locked)
                          </span>
                        ) : (
                          <select value={role}
                            onChange={(e) => updateMutation.mutate({ id: u.id, payload: { roleSlug: e.target.value } })}
                            className="px-2 py-1 rounded border border-slate-300 text-xs bg-white font-medium">
                            <option value="student">Student</option>
                            <option value="instructor">Instructor</option>
                            <option value="teaching_assistant">TA</option>
                            <option value="academic_admin">Academic Admin</option>
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {/* Activate / Suspend */}
                          {u.status !== 'active' ? (
                            <button onClick={() => updateMutation.mutate({ id: u.id, payload: { status: 'active' } })}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold">Activate</button>
                          ) : (
                            <button disabled={isSuperAdmin}
                              onClick={() => updateMutation.mutate({ id: u.id, payload: { status: 'suspended' } })}
                              className={`px-2.5 py-1 rounded text-[11px] font-semibold ${isSuperAdmin ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-amber-100 hover:bg-amber-200 text-amber-900'}`}>Suspend</button>
                          )}

                          {/* Reset Password — the unique Academic Admin feature */}
                          {!isSuperAdmin && (
                            <button onClick={() => openReset(u)}
                              title="Reset user password"
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-semibold transition-colors">
                              <Key className="w-3 h-3" /> Reset
                            </button>
                          )}

                          {/* Edit */}
                          <button onClick={() => openEdit(u)} title="Edit user"
                            className="p-1 rounded text-slate-600 hover:text-blue-600 hover:bg-blue-50">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button disabled={isSuperAdmin || isSelf} onClick={() => handleDelete(u)}
                            title={isSuperAdmin ? 'Protected' : isSelf ? 'Cannot delete self' : 'Delete user'}
                            className={`p-1 rounded ${isSuperAdmin || isSelf ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`}>
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ──────────────────────────────────────────────── */}
          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select value={limit} onChange={(e) => handleLimitChange(e.target.value)}
                className="px-2 py-1 rounded border border-slate-300 bg-white font-semibold">
                <option value={10}>10</option><option value={25}>25</option>
                <option value={50}>50</option><option value={100}>100</option>
              </select>
              <span className="text-slate-400">|</span>
              <span>Showing {pagination.total === 0 ? 0 : (page - 1) * limit + 1}–{Math.min(page * limit, pagination.total)} of <strong>{pagination.total}</strong> users</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-slate-300 bg-white font-semibold disabled:opacity-40">
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>
              <span className="px-3 py-1 font-semibold">Page {pagination.page} of {pagination.totalPages}</span>
              <button disabled={page >= pagination.totalPages} onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-slate-300 bg-white font-semibold disabled:opacity-40">
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create User modal ────────────────────────────────────────────── */}
      <ModalDialog isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Provision New Account">
        <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">First Name</label>
              <input required value={createForm.firstName} onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Last Name</label>
              <input required value={createForm.lastName} onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300" />
            </div>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Institutional Email</label>
            <input required type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Initial Password</label>
              <input type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Primary Role</label>
              <select value={createForm.roleSlug} onChange={(e) => setCreateForm({ ...createForm, roleSlug: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
                <option value="student">Student</option>
                <option value="instructor">Instructor</option>
                <option value="teaching_assistant">Teaching Assistant</option>
              </select>
            </div>
          </div>
          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold">Create Account</button>
          </div>
        </form>
      </ModalDialog>

      {/* ── Edit User modal ──────────────────────────────────────────────── */}
      <ModalDialog isOpen={editOpen} onClose={() => { setEditOpen(false); setEditingUser(null); }}
        title={`Edit User: ${editingUser?.email || ''}`}>
        {editingUser && (
          <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">First Name</label>
                <input required value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Last Name</label>
                <input required value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Account Status</label>
                <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">System Role</label>
                {(editingUser.roles || []).some((r) => r.slug === 'super_admin') ? (
                  <div className="w-full px-3 py-2 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 font-bold flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" /> Super Admin (Locked)
                  </div>
                ) : (
                  <select value={editForm.roleSlug} onChange={(e) => setEditForm({ ...editForm, roleSlug: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium">
                    <option value="student">Student</option>
                    <option value="instructor">Instructor</option>
                    <option value="teaching_assistant">Teaching Assistant</option>
                    <option value="academic_admin">Academic Admin</option>
                  </select>
                )}
              </div>
            </div>
            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <button type="button" onClick={() => { setEditOpen(false); setEditingUser(null); }} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold">Cancel</button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold">Save Changes</button>
            </div>
          </form>
        )}
      </ModalDialog>

      {/* ── Reset Password modal ────────────────────────────────────────── */}
      {resetUser && (
        <ModalDialog isOpen title={`Reset Password — ${resetUser.email}`} onClose={() => { setResetUser(null); setResetResult(null); }}
          maxWidth="max-w-md">
          {resetResult ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                <p className="text-sm font-semibold text-emerald-800 mb-2">Password reset successfully.</p>
                <p className="text-xs text-slate-600">The temporary password for <strong>{resetResult.email}</strong> is:</p>
                <div className="mt-2 p-3 bg-white rounded-lg border border-slate-300 font-mono text-sm font-bold text-slate-900 select-all">
                  {resetResult.temporaryPassword}
                </div>
                <p className="text-[11px] text-slate-500 mt-2">Share this password with the user. They should change it upon next login.</p>
              </div>
              <div className="flex justify-end">
                <button onClick={() => { setResetUser(null); setResetResult(null); }}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium hover:bg-slate-50">Close</button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
              <p className="text-slate-600">
                Reset the password for <strong>{resetUser.email}</strong> ({resetUser.firstName} {resetUser.lastName}).
                Leave blank to use the default <code className="bg-slate-100 px-1 rounded">Password@123</code>.
              </p>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Password <span className="text-slate-400 font-normal">(optional)</span></label>
                <input type="text" value={resetPasswordValue}
                  onChange={(e) => setResetPasswordValue(e.target.value)}
                  placeholder="Password@123"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono" />
              </div>
              <p className="text-[11px] text-amber-600">This will also unlock the account and clear any failed login attempts.</p>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setResetUser(null); }}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={resetMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-50">
                  <Key className="w-4 h-4" /> {resetMutation.isPending ? 'Resetting…' : 'Reset Password'}
                </button>
              </div>
            </form>
          )}
        </ModalDialog>
      )}
    </div>
  );
}

export function AcademicAnalyticsPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard', 'academic_admin'],
    queryFn: lmsApi.getDashboardSummary
  });

  const { data: classReport } = useQuery({
    queryKey: ['reports', 'classSummary', ''],
    queryFn: () => lmsApi.getReport({ type: 'classSummary', format: 'json' })
  });

  if (isLoading) return <LoadingState label="Loading academic analytics…" />;
  if (error) return <ErrorState message={extractErrorMessage(error)} onRetry={refetch} />;

  const d = data?.data || {};
  const m = d.metrics || {};
  const dash = data?.data || {};

  // ── Grade approval status distribution for pie chart ────────────────────
  const gradeStatusData = (() => {
    const classes = dash.classesAtAGlance || [];
    const counts = {};
    classes.forEach((c) => {
      const status = c.finalGradesStatus || 'in_progress';
      counts[status] = (counts[status] || 0) + 1;
    });
    const labels = {
      in_progress: 'In Progress',
      submitted_for_approval: 'Submitted',
      approved: 'Approved',
      published: 'Published',
      returned: 'Returned'
    };
    const colors = ['#3b82f6', '#f59e0b', '#10b981', '#059669', '#ef4444'];
    return Object.entries(counts).map(([key, value], i) => ({
      name: labels[key] || key,
      value,
      color: colors[i] || '#94a3b8'
    }));
  })();

  // ── Class capacity utilization data ──────────────────────────────────────
  const capacityData = (dash.classesAtAGlance || []).map((c) => ({
    name: c.sectionCode,
    enrolled: c.enrolledCount || 0,
    capacity: c.capacity || 40,
    fillRate: c.capacity > 0 ? Math.round((c.enrolledCount / c.capacity) * 100) : 0
  }));

  // ── Department summary data ──────────────────────────────────────────────
  const deptData = dash.departmentSummary || [];

  // ── Enrollment by program ────────────────────────────────────────────────
  const enrollmentData = (dash.enrollmentByProgram || []).map((p) => ({
    name: p.programCode,
    fullName: p.programName,
    students: p.enrollments || 0
  }));

  // ── Class report data from the reports API ──────────────────────────────
  const classRows = classReport?.data?.rows || [];

  // ── Summary stats ───────────────────────────────────────────────────────
  const totalClasses = m.totalClasses ?? 0;
  const totalEnrollments = m.totalEnrollments ?? 0;
  const totalCourses = m.totalCourses ?? 0;
  const totalDepartments = m.totalDepartments ?? 0;
  const unassignedCount = m.unassignedClassesCount ?? 0;
  const pendingApprovals = m.pendingGradeApprovalsCount ?? 0;
  const activeSemester = m.activeSemester || 'Not configured';

  // ── Average enrollment per class ────────────────────────────────────────
  const avgEnrollment = totalClasses > 0 ? Math.round(totalEnrollments / totalClasses) : 0;

  // ── Fill rate (overall capacity) ────────────────────────────────────────
  const totalCapacity = capacityData.reduce((a, c) => a + c.capacity, 0);
  const totalEnrolled = capacityData.reduce((a, c) => a + c.enrolled, 0);
  const overallFillRate = totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0;

  const PIE_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#059669', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Academic Intelligence"
        title="Institutional Analytics & Performance Insights"
        subtitle={`Active Term: ${activeSemester}${m.activeAcademicYear ? ` · ${m.activeAcademicYear}` : ''}`}
      />

      {/* ── Overview stat cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Enrollments"
          value={totalEnrollments}
          subtitle={`Across ${totalClasses} class sections`}
          icon={Users}
          accent="blue"
        />
        <StatCard
          title="Catalog Courses"
          value={totalCourses}
          subtitle={`In ${totalDepartments} departments`}
          icon={BookOpen}
          accent="indigo"
        />
        <StatCard
          title="Avg Enrollment / Class"
          value={avgEnrollment}
          subtitle={`${overallFillRate}% overall capacity fill`}
          icon={TrendingUp}
          accent="emerald"
        />
        <StatCard
          title="Pending Approvals"
          value={pendingApprovals}
          subtitle={unassignedCount > 0 ? `${unassignedCount} unassigned classes` : 'All classes assigned'}
          icon={ClipboardCheck}
          accent="amber"
        />
      </div>

      {/* ── Charts row 1: Enrollment by Program + Grade Status ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enrollment by Program — Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 mb-1">Enrollment by Degree Program</h2>
          <p className="text-xs text-slate-500 mb-4">Active student distribution across degree programs</p>
          <div className="h-72">
            {enrollmentData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                No enrollment data available for the current term.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={enrollmentData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val, _, props) => [val, props.payload.fullName]}
                    labelFormatter={(label) => `Program: ${label}`}
                  />
                  <Bar dataKey="students" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Grade Approval Status — Pie/Donut Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 mb-1">Grade Approval Status</h2>
          <p className="text-xs text-slate-500 mb-4">Distribution across all class sections</p>
          <div className="h-72">
            {gradeStatusData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                No class data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gradeStatusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {gradeStatusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val, name) => [val, name]} />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ fontSize: 11 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ── Charts row 2: Class Capacity Utilization ───────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <h2 className="text-base font-bold text-slate-900 mb-1">Class Capacity Utilization</h2>
        <p className="text-xs text-slate-500 mb-4">Enrolled vs. maximum capacity per class section</p>
        <div className="h-72">
          {capacityData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
              No class sections available for the current term.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={capacityData} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={50} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val, name) => [val, name === 'enrolled' ? 'Enrolled' : 'Capacity']}
                  labelFormatter={(label) => `Section: ${label}`}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="capacity" fill="#e2e8f0" name="Capacity" radius={[4, 4, 0, 0]} />
                <Bar dataKey="enrolled" fill="#3b82f6" name="Enrolled" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Department Overview Table ────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">Department Performance Overview</h2>
          <p className="text-xs text-slate-500 mt-0.5">Programs, courses, and leadership across departments</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Head</th>
                <th className="px-4 py-3 text-center">Programs</th>
                <th className="px-4 py-3 text-center">Courses</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {deptData.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No departments configured.</td></tr>
              )}
              {deptData.map((dept) => (
                <tr key={dept.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-bold text-blue-700">{dept.code}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{dept.name}</td>
                  <td className="px-4 py-3 text-slate-600">{dept.headName || <span className="text-slate-400 italic">TBA</span>}</td>
                  <td className="px-4 py-3 text-center font-semibold">{dept.programCount ?? 0}</td>
                  <td className="px-4 py-3 text-center font-semibold">{dept.courseCount ?? 0}</td>
                  <td className="px-4 py-3"><StatusBadge status={dept.status || 'active'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Classes at a Glance ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Classes table */}
        <div className="lg:col-span-2">
          <ClassesThisTermTable
            classes={dash.classesAtAGlance || []}
            activeSemester={m.activeSemester}
            rowsPerPageDefault={5}
          />
        </div>

        {/* Quick insights sidebar */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Quick Insights</h2>

          {/* Insight: Unassigned classes */}
          <div className={`p-3 rounded-lg border ${unassignedCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
            <div className="flex items-center gap-2">
              {unassignedCount > 0
                ? <AlertTriangle className="w-4 h-4 text-amber-600" />
                : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              <p className="text-xs font-semibold text-slate-700">Instructor Assignments</p>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {unassignedCount > 0
                ? `${unassignedCount} class section${unassignedCount > 1 ? 's' : ''} ${unassignedCount > 1 ? 'have' : 'has'} no assigned instructor.`
                : 'All class sections have instructors assigned.'}
            </p>
          </div>

          {/* Insight: Grade approvals */}
          <div className={`p-3 rounded-lg border ${pendingApprovals > 0 ? 'bg-blue-50 border-blue-200' : 'bg-emerald-50 border-emerald-200'}`}>
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-blue-600" />
              <p className="text-xs font-semibold text-slate-700">Grade Approvals</p>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {pendingApprovals > 0
                ? `${pendingApprovals} class section${pendingApprovals > 1 ? 's' : ''} awaiting your approval.`
                : 'All submitted grades have been reviewed.'}
            </p>
          </div>

          {/* Insight: Capacity */}
          <div className="p-3 rounded-lg border bg-slate-50 border-slate-200">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-600" />
              <p className="text-xs font-semibold text-slate-700">Capacity Utilization</p>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {totalEnrolled} of {totalCapacity} seats filled ({overallFillRate}%).
              {overallFillRate >= 90 ? ' Near full capacity.' : overallFillRate >= 70 ? ' Good utilization.' : ' Room available.'}
            </p>
          </div>

          {/* Insight: Active term */}
          <div className="p-3 rounded-lg border bg-indigo-50 border-indigo-200">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-indigo-600" />
              <p className="text-xs font-semibold text-slate-700">Active Term</p>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {activeSemester}{m.activeAcademicYear ? ` · ${m.activeAcademicYear}` : ''}
            </p>
          </div>
        </div>
      </div>
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


