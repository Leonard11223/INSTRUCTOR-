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
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2
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

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Academic Administration"
        title="Institutional Curriculum, Enrollment & Grade Governance"
        subtitle={`Active Term: ${m.activeSemester || 'First Semester, 2026–2027'}`}
      />

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
          subtitle={`${m.totalClasses ?? 0} active class sections`}
          icon={BookOpen}
          accent="indigo"
        />
        <StatCard
          title="Student Enrollments"
          value={m.totalEnrollments ?? 0}
          subtitle="Across current semester offerings"
          icon={Users}
          accent="emerald"
        />
        <StatCard
          title="Pending Grade Approvals"
          value={m.pendingGradeApprovalsCount ?? 0}
          subtitle="Awaiting registrar sign-off"
          icon={ClipboardCheck}
          accent="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 mb-1">Enrollment by Degree Program</h2>
          <p className="text-xs text-slate-500 mb-4">Active student distribution across degree programs</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.enrollmentByProgram || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="programCode" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="enrollments" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-1">Final Grades Pending Approval</h2>
            <p className="text-xs text-slate-500 mb-4">
              Class sections submitted by instructors for official registrar publication
            </p>
            <div className="space-y-3">
              {(d.pendingGradeApprovals || []).length === 0 ? (
                <p className="text-xs text-slate-500 py-8 text-center">
                  All submitted class grades have been reviewed.
                </p>
              ) : (
                (d.pendingGradeApprovals || []).map((cls) => (
                  <div
                    key={cls.id}
                    className="flex items-center justify-between p-3.5 rounded-lg bg-amber-50/60 border border-amber-200 text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{cls.name}</p>
                      <p className="text-slate-600">
                        Course: {cls.courseOffering?.course?.code} · Submitted{' '}
                        {cls.finalGradesSubmittedAt ? new Date(cls.finalGradesSubmittedAt).toLocaleDateString() : 'Recently'}
                      </p>
                    </div>
                    <Link
                      to="/academic/grade-approvals"
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
                    >
                      Review Grades
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DepartmentsAndProgramsPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  // Modals state
  const [deptOpen, setDeptOpen] = useState(false);
  const [editDeptOpen, setEditDeptOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);

  const [progOpen, setProgOpen] = useState(false);
  const [editProgOpen, setEditProgOpen] = useState(false);
  const [editingProg, setEditingProg] = useState(null);

  // Pagination for programs
  const [progPage, setProgPage] = useState(1);
  const [progLimit, setProgLimit] = useState(5);

  // Department forms
  const [deptForm, setDeptForm] = useState({ code: '', name: '', headName: '', description: '', status: 'active' });
  const [editDeptForm, setEditDeptForm] = useState({ code: '', name: '', headName: '', description: '', status: 'active' });

  // Program forms
  const [progForm, setProgForm] = useState({ departmentId: 1, code: '', name: '', degreeType: 'Bachelor', durationYears: 4 });
  const [editProgForm, setEditProgForm] = useState({ departmentId: 1, code: '', name: '', degreeType: 'Bachelor', durationYears: 4 });

  const { data: deptData, isLoading: deptLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: lmsApi.listDepartments
  });

  const { data: progData, isLoading: progLoading } = useQuery({
    queryKey: ['programs'],
    queryFn: lmsApi.listPrograms
  });

  const isLoading = deptLoading || progLoading;

  // Department handlers
  const handleCreateDept = async (e) => {
    e.preventDefault();
    try {
      await lmsApi.createDepartment(deptForm);
      addToast('Department created successfully.');
      setDeptForm({ code: '', name: '', headName: '', description: '', status: 'active' });
      setDeptOpen(false);
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  const handleOpenEditDept = (dept) => {
    setEditingDept(dept);
    setEditDeptForm({
      code: dept.code || '',
      name: dept.name || '',
      headName: dept.headName || '',
      description: dept.description || '',
      status: dept.status || 'active'
    });
    setEditDeptOpen(true);
  };

  const handleSaveEditDept = async (e) => {
    e.preventDefault();
    if (!editingDept) return;
    try {
      await lmsApi.updateDepartment(editingDept.id, editDeptForm);
      addToast(`Department "${editDeptForm.code}" updated successfully.`);
      setEditDeptOpen(false);
      setEditingDept(null);
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  const handleDeleteDept = async (dept) => {
    if (window.confirm(`Are you sure you want to delete department "${dept.code} - ${dept.name}"?`)) {
      try {
        const res = await lmsApi.deleteDepartment(dept.id);
        addToast(res?.message || 'Department deleted successfully.');
        queryClient.invalidateQueries({ queryKey: ['departments'] });
      } catch (err) {
        addToast(extractErrorMessage(err), 'error');
      }
    }
  };

  // Program handlers
  const handleCreateProg = async (e) => {
    e.preventDefault();
    try {
      await lmsApi.createProgram(progForm);
      addToast('Academic program created successfully.');
      setProgForm({ departmentId: departments[0]?.id || 1, code: '', name: '', degreeType: 'Bachelor', durationYears: 4 });
      setProgOpen(false);
      queryClient.invalidateQueries({ queryKey: ['programs'] });
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  const handleOpenEditProg = (prog) => {
    setEditingProg(prog);
    setEditProgForm({
      departmentId: prog.departmentId || departments[0]?.id || 1,
      code: prog.code || '',
      name: prog.name || '',
      degreeType: prog.degreeType || 'Bachelor',
      durationYears: prog.durationYears || 4
    });
    setEditProgOpen(true);
  };

  const handleSaveEditProg = async (e) => {
    e.preventDefault();
    if (!editingProg) return;
    try {
      await lmsApi.updateProgram(editingProg.id, editProgForm);
      addToast(`Program "${editProgForm.code}" updated successfully.`);
      setEditProgOpen(false);
      setEditingProg(null);
      queryClient.invalidateQueries({ queryKey: ['programs'] });
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  const handleDeleteProg = async (prog) => {
    if (window.confirm(`Are you sure you want to delete degree program "${prog.code} - ${prog.name}"?`)) {
      try {
        const res = await lmsApi.deleteProgram(prog.id);
        addToast(res?.message || 'Academic program deleted successfully.');
        queryClient.invalidateQueries({ queryKey: ['programs'] });
      } catch (err) {
        addToast(extractErrorMessage(err), 'error');
      }
    }
  };

  if (isLoading) return <LoadingState />;

  const departments = deptData?.data?.departments || [];
  const programs = progData?.data?.programs || [];
  const totalProgPages = Math.max(1, Math.ceil(programs.length / progLimit));
  const pagedPrograms = programs.slice((progPage - 1) * progLimit, progPage * progLimit);

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Academic Structure"
        title="Departments & Degree Programs"
        subtitle="Manage academic faculties, colleges, and degree curricula."
        actions={
          <>
            <button
              type="button"
              onClick={() => setDeptOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg"
            >
              <Plus className="w-4 h-4" />
              New Department
            </button>
            <button
              type="button"
              onClick={() => setProgOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"
            >
              <Plus className="w-4 h-4" />
              New Degree Program
            </button>
          </>
        }
      />

      {/* Departments Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {departments.map((d) => (
          <div key={d.id} className="bg-white rounded-xl border border-slate-200 p-5 space-y-2.5 flex flex-col justify-between hover:shadow-xs transition-shadow">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded">
                  {d.code}
                </span>
                <div className="flex items-center gap-1.5">
                  <StatusBadge status={d.status} />
                  <button
                    type="button"
                    onClick={() => handleOpenEditDept(d)}
                    title="Edit Department"
                    className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteDept(d)}
                    title="Delete Department"
                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-2">{d.name}</h3>
              <p className="text-xs text-slate-600 mt-1">{d.description || 'No description provided.'}</p>
            </div>
            <p className="text-xs text-slate-500 pt-2 border-t border-slate-100 flex items-center justify-between">
              <span>Head: <strong className="text-slate-800">{d.headName || 'TBA'}</strong></span>
              <span>Courses: <strong className="text-slate-800">{d.courses?.length || 0}</strong></span>
            </p>
          </div>
        ))}
      </div>

      {/* Academic Degree Programs Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">Academic Degree Programs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Program Code</th>
                <th className="px-4 py-3">Program Title</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Degree Type</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {pagedPrograms.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500 text-xs">
                    No degree programs found. Create a new program using the button above.
                  </td>
                </tr>
              ) : (
                pagedPrograms.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-bold text-blue-700">{p.code}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{p.name}</td>
                    <td className="px-4 py-3">{p.department?.name || 'Department'}</td>
                    <td className="px-4 py-3">{p.degreeType}</td>
                    <td className="px-4 py-3">{p.durationYears} Years</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditProg(p)}
                          title="Edit Program"
                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProg(p)}
                          title="Delete Program"
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Degree Programs Pagination */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={progLimit}
              onChange={(e) => {
                setProgLimit(Number(e.target.value));
                setProgPage(1);
              }}
              className="px-2 py-1 rounded border border-slate-300 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
            </select>
            <span className="text-slate-400">|</span>
            <span>
              Showing {programs.length === 0 ? 0 : (progPage - 1) * progLimit + 1}–
              {Math.min(progPage * progLimit, programs.length)} of{' '}
              <strong className="text-slate-900 font-bold">{programs.length}</strong> programs
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={progPage <= 1}
              onClick={() => setProgPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 bg-white font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors shadow-2xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Prev
            </button>
            <span className="px-2 font-semibold text-slate-700">
              Page {progPage} of {totalProgPages}
            </span>
            <button
              type="button"
              disabled={progPage >= totalProgPages}
              onClick={() => setProgPage((p) => Math.min(totalProgPages, p + 1))}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 bg-white font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors shadow-2xs"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Create Department */}
      <ModalDialog isOpen={deptOpen} onClose={() => setDeptOpen(false)} title="Create Academic Department">
        <form onSubmit={handleCreateDept} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold mb-1 text-slate-700">Department Code</label>
            <input
              required
              value={deptForm.code}
              onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
              placeholder="DEPT-AI"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 uppercase font-mono"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1 text-slate-700">Department Name</label>
            <input
              required
              value={deptForm.name}
              onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
              placeholder="Department of Artificial Intelligence & Robotics"
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1 text-slate-700">Department Head</label>
            <input
              value={deptForm.headName}
              onChange={(e) => setDeptForm({ ...deptForm, headName: e.target.value })}
              placeholder="Dr. Alan Turing"
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1 text-slate-700">Description</label>
            <textarea
              rows={2}
              value={deptForm.description}
              onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
              placeholder="Academic department mandate and faculty specializations..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeptOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg">
              Save Department
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Modal: Edit Department */}
      <ModalDialog
        isOpen={editDeptOpen}
        onClose={() => {
          setEditDeptOpen(false);
          setEditingDept(null);
        }}
        title={`Edit Department: ${editingDept?.code || ''}`}
      >
        {editingDept && (
          <form onSubmit={handleSaveEditDept} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Department Code</label>
              <input
                required
                value={editDeptForm.code}
                onChange={(e) => setEditDeptForm({ ...editDeptForm, code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 uppercase font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Department Name</label>
              <input
                required
                value={editDeptForm.name}
                onChange={(e) => setEditDeptForm({ ...editDeptForm, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1 text-slate-700">Department Head</label>
                <input
                  value={editDeptForm.headName}
                  onChange={(e) => setEditDeptForm({ ...editDeptForm, headName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-slate-700">Status</label>
                <select
                  value={editDeptForm.status}
                  onChange={(e) => setEditDeptForm({ ...editDeptForm, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Description</label>
              <textarea
                rows={2}
                value={editDeptForm.description}
                onChange={(e) => setEditDeptForm({ ...editDeptForm, description: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditDeptOpen(false);
                  setEditingDept(null);
                }}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold"
              >
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg">
                Update Department
              </button>
            </div>
          </form>
        )}
      </ModalDialog>

      {/* Modal: Create Program */}
      <ModalDialog isOpen={progOpen} onClose={() => setProgOpen(false)} title="Create Academic Degree Program">
        <form onSubmit={handleCreateProg} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold mb-1 text-slate-700">Department</label>
            <select
              value={progForm.departmentId}
              onChange={(e) => setProgForm({ ...progForm, departmentId: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} - {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Program Code</label>
              <input
                required
                value={progForm.code}
                onChange={(e) => setProgForm({ ...progForm, code: e.target.value.toUpperCase() })}
                placeholder="BSAI"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 uppercase font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Degree Type</label>
              <select
                value={progForm.degreeType}
                onChange={(e) => setProgForm({ ...progForm, degreeType: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
              >
                <option value="Associate">Associate (2 Years)</option>
                <option value="Bachelor">Bachelor (4 Years)</option>
                <option value="Master">Master (2 Years)</option>
                <option value="Doctorate">Doctorate (3–5 Years)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block font-semibold mb-1 text-slate-700">Program Name</label>
            <input
              required
              value={progForm.name}
              onChange={(e) => setProgForm({ ...progForm, name: e.target.value })}
              placeholder="Bachelor of Science in Artificial Intelligence"
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1 text-slate-700">Program Duration (Years)</label>
            <input
              type="number"
              min={1}
              max={6}
              value={progForm.durationYears}
              onChange={(e) => setProgForm({ ...progForm, durationYears: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setProgOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg">
              Save Program
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Modal: Edit Program */}
      <ModalDialog
        isOpen={editProgOpen}
        onClose={() => {
          setEditProgOpen(false);
          setEditingProg(null);
        }}
        title={`Edit Program: ${editingProg?.code || ''}`}
      >
        {editingProg && (
          <form onSubmit={handleSaveEditProg} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Department</label>
              <select
                value={editProgForm.departmentId}
                onChange={(e) => setEditProgForm({ ...editProgForm, departmentId: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} - {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1 text-slate-700">Program Code</label>
                <input
                  required
                  value={editProgForm.code}
                  onChange={(e) => setEditProgForm({ ...editProgForm, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 uppercase font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-slate-700">Degree Type</label>
                <select
                  value={editProgForm.degreeType}
                  onChange={(e) => setEditProgForm({ ...editProgForm, degreeType: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="Associate">Associate (2 Years)</option>
                  <option value="Bachelor">Bachelor (4 Years)</option>
                  <option value="Master">Master (2 Years)</option>
                  <option value="Doctorate">Doctorate (3–5 Years)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Program Name</label>
              <input
                required
                value={editProgForm.name}
                onChange={(e) => setEditProgForm({ ...editProgForm, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Program Duration (Years)</label>
              <input
                type="number"
                min={1}
                max={6}
                value={editProgForm.durationYears}
                onChange={(e) => setEditProgForm({ ...editProgForm, durationYears: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditProgOpen(false);
                  setEditingProg(null);
                }}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold"
              >
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg">
                Update Program
              </button>
            </div>
          </form>
        )}
      </ModalDialog>
    </div>
  );
}

export function TermsManagementPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [semForm, setSemForm] = useState({
    academicYearId: 2,
    name: 'Summer Term, 2027',
    code: '2026-2027-SUM',
    startDate: '2027-06-01',
    endDate: '2027-07-30',
    isCurrent: false
  });

  const { data: yearsData, isLoading } = useQuery({
    queryKey: ['academic-years'],
    queryFn: lmsApi.listAcademicYears
  });

  const { data: semsData } = useQuery({
    queryKey: ['semesters'],
    queryFn: lmsApi.listSemesters
  });

  const handleCreateSemester = async (e) => {
    e.preventDefault();
    try {
      await lmsApi.createSemester(semForm);
      addToast('Semester term created.');
      queryClient.invalidateQueries({ queryKey: ['semesters'] });
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  if (isLoading) return <LoadingState />;

  const years = yearsData?.data?.academicYears || [];
  const semesters = semsData?.data?.semesters || [];

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Academic Calendar"
        title="Academic Years & Semesters"
        subtitle="Configure institutional terms and enrollment windows."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-900">Configured Semesters</h2>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Term Code</th>
                <th className="px-4 py-3">Semester Name</th>
                <th className="px-4 py-3">Academic Year</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {semesters.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-mono font-bold text-blue-700">{s.code}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {s.name} {s.isCurrent && <span className="ml-1 text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">Current</span>}
                  </td>
                  <td className="px-4 py-3">{s.academicYear?.name}</td>
                  <td className="px-4 py-3">{s.startDate} → {s.endDate}</td>
                  <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form onSubmit={handleCreateSemester} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 text-xs">
          <h2 className="text-base font-bold text-slate-900">Add Semester Term</h2>
          <div>
            <label className="block font-semibold mb-1">Academic Year</label>
            <select
              value={semForm.academicYearId}
              onChange={(e) => setSemForm({ ...semForm, academicYearId: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
            >
              {years.map((y) => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1">Term Code</label>
            <input
              required
              value={semForm.code}
              onChange={(e) => setSemForm({ ...semForm, code: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Semester Title</label>
            <input
              required
              value={semForm.name}
              onChange={(e) => setSemForm({ ...semForm, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold mb-1">Start Date</label>
              <input
                type="date"
                value={semForm.startDate}
                onChange={(e) => setSemForm({ ...semForm, startDate: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">End Date</label>
              <input
                type="date"
                value={semForm.endDate}
                onChange={(e) => setSemForm({ ...semForm, endDate: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300"
              />
            </div>
          </div>
          <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg">
            Create Semester
          </button>
        </form>
      </div>
    </div>
  );
}

export function CoursesAndOfferingsPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [courseOpen, setCourseOpen] = useState(false);
  const [offeringOpen, setOfferingOpen] = useState(false);

  const [courseForm, setCourseForm] = useState({
    departmentId: 1,
    programId: 1,
    code: '',
    title: '',
    description: '',
    category: 'Networking & Systems',
    creditUnits: 3,
    level: 'Intermediate',
    deliveryMode: 'Instructor-Led'
  });

  const [offeringForm, setOfferingForm] = useState({
    courseId: 1,
    academicYearId: 2,
    semesterId: 2,
    offeringCode: '',
    titleOverride: '',
    enrollmentPolicy: 'open_self_enroll'
  });

  const { data: coursesData, isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: () => lmsApi.listCourses()
  });

  const { data: offeringsData } = useQuery({
    queryKey: ['course-offerings'],
    queryFn: lmsApi.listOfferings
  });

  const { data: deptsData } = useQuery({
    queryKey: ['departments'],
    queryFn: lmsApi.listDepartments
  });

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    try {
      await lmsApi.createCourse(courseForm);
      addToast('Reusable course subject created.');
      setCourseOpen(false);
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  const handleCreateOffering = async (e) => {
    e.preventDefault();
    try {
      await lmsApi.createOffering(offeringForm);
      addToast('Term course offering created.');
      setOfferingOpen(false);
      queryClient.invalidateQueries({ queryKey: ['course-offerings'] });
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  if (isLoading) return <LoadingState />;

  const courses = coursesData?.data?.courses || [];
  const offerings = offeringsData?.data?.offerings || [];
  const departments = deptsData?.data?.departments || [];

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Course Architecture"
        title="Reusable Courses & Term Offerings"
        subtitle="Distinguish reusable academic subjects (Courses) from term-specific deliveries (Course Offerings)."
        actions={
          <>
            <button
              type="button"
              onClick={() => setCourseOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg"
            >
              <Plus className="w-4 h-4" />
              Create Course Subject
            </button>
            <button
              type="button"
              onClick={() => setOfferingOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"
            >
              <Plus className="w-4 h-4" />
              Create Term Offering
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {courses.map((c) => (
          <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded">
                {c.code}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">{c.creditUnits} Units · {c.deliveryMode}</span>
                <StatusBadge status={c.publicationStatus} />
              </div>
            </div>
            <h3 className="text-base font-bold text-slate-900">{c.title}</h3>
            <p className="text-xs text-slate-600 line-clamp-2">{c.description}</p>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Dept: {c.department?.code}</span>
              <span>Modules: {c.modules?.length || 0} · Offerings: {c.offerings?.length || 0}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">Active Term Course Offerings</h2>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Offering Code</th>
              <th className="px-4 py-3">Subject & Term Title</th>
              <th className="px-4 py-3">Semester</th>
              <th className="px-4 py-3">Enrollment Policy</th>
              <th className="px-4 py-3">Sections</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {offerings.map((o) => (
              <tr key={o.id}>
                <td className="px-4 py-3 font-mono font-bold text-blue-700">{o.offeringCode}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">
                  {o.titleOverride || `${o.course?.title} — ${o.semester?.name}`}
                </td>
                <td className="px-4 py-3">{o.semester?.name}</td>
                <td className="px-4 py-3"><StatusBadge status={o.enrollmentPolicy} /></td>
                <td className="px-4 py-3 font-semibold">{o.classes?.length || 0} Section(s)</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ModalDialog isOpen={courseOpen} onClose={() => setCourseOpen(false)} title="Create Reusable Course Subject">
        <form onSubmit={handleCreateCourse} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Course Code</label>
              <input
                required
                value={courseForm.code}
                onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
                placeholder="NET-302"
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Department</label>
              <select
                value={courseForm.departmentId}
                onChange={(e) => setCourseForm({ ...courseForm, departmentId: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.code} — {d.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block font-semibold mb-1">Course Title</label>
            <input
              required
              value={courseForm.title}
              onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
              placeholder="Software-Defined Networking & Automation"
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Description</label>
            <textarea
              required
              rows={3}
              value={courseForm.description}
              onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <button type="submit" className="w-full py-2 bg-blue-600 text-white font-semibold rounded-lg">
            Create Course
          </button>
        </form>
      </ModalDialog>

      <ModalDialog isOpen={offeringOpen} onClose={() => setOfferingOpen(false)} title="Create Term Course Offering">
        <form onSubmit={handleCreateOffering} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold mb-1">Course Subject</label>
            <select
              value={offeringForm.courseId}
              onChange={(e) => setOfferingForm({ ...offeringForm, courseId: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.code} — {c.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1">Offering Code</label>
            <input
              required
              value={offeringForm.offeringCode}
              onChange={(e) => setOfferingForm({ ...offeringForm, offeringCode: e.target.value })}
              placeholder="NET-302-2026S1"
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Display Title Override</label>
            <input
              value={offeringForm.titleOverride}
              onChange={(e) => setOfferingForm({ ...offeringForm, titleOverride: e.target.value })}
              placeholder="Integrative Programming — First Semester, 2026–2027"
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <button type="submit" className="w-full py-2 bg-blue-600 text-white font-semibold rounded-lg">
            Create Offering
          </button>
        </form>
      </ModalDialog>
    </div>
  );
}

export function ClassesAndSectionsPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [classOpen, setClassOpen] = useState(false);
  const [taModalClass, setTaModalClass] = useState(null);

  const [classForm, setClassForm] = useState({
    courseOfferingId: 1,
    sectionCode: 'BSIT 4-C',
    name: 'BSIT 4-C — Integrative Programming',
    room: 'NetAcad Lab 305',
    schedule: 'Fri 09:00 - 12:00',
    capacity: 40,
    instructorId: 3
  });

  const [taConfig, setTaConfig] = useState({
    taUserId: 5,
    canViewRoster: true,
    canReviewSubmissions: true,
    canApplyRubrics: true,
    canManageDiscussions: true,
    canUploadResources: false
  });

  const { data: classesData, isLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: lmsApi.listClasses
  });

  const { data: offeringsData } = useQuery({
    queryKey: ['course-offerings'],
    queryFn: lmsApi.listOfferings
  });

  const handleCreateClass = async (e) => {
    e.preventDefault();
    try {
      await lmsApi.createClass(classForm);
      addToast('Class section created with default weighted categories.');
      setClassOpen(false);
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  const handleSaveTaConfig = async (e) => {
    e.preventDefault();
    if (!taModalClass) return;
    try {
      await lmsApi.assignTa(taModalClass.id, taConfig);
      addToast(`Configured Teaching Assistant permissions for ${taModalClass.sectionCode}`);
      setTaModalClass(null);
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  if (isLoading) return <LoadingState />;

  const classes = classesData?.data?.classes || [];
  const offerings = offeringsData?.data?.offerings || [];

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Section Management"
        title="Class Sections, Faculty & Teaching Assistant Assignments"
        subtitle="Manage learner cohorts (e.g., BSIT 4-A), assign instructors, and configure class-scoped TA permissions."
        actions={
          <button
            type="button"
            onClick={() => setClassOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Create Class Section
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {classes.map((cls) => (
          <div key={cls.id} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded">
                {cls.sectionCode}
              </span>
              <StatusBadge status={cls.finalGradesStatus} />
            </div>
            <h3 className="text-base font-bold text-slate-900">{cls.name}</h3>
            <p className="text-xs text-slate-600">
              Schedule: <strong>{cls.schedule || 'TBA'}</strong> · Room: <strong>{cls.room || 'Online'}</strong>
            </p>
            <div className="text-xs text-slate-600 space-y-1 pt-2 border-t border-slate-100">
              <p>
                <strong>Instructors:</strong>{' '}
                {(cls.instructorAssignments || []).map((ia) => `${ia.instructor?.firstName} ${ia.instructor?.lastName}`).join(', ') || 'Unassigned'}
              </p>
              <p>
                <strong>Teaching Assistants:</strong>{' '}
                {(cls.taAssignments || []).map((ta) => `${ta.teachingAssistant?.firstName} ${ta.teachingAssistant?.lastName}`).join(', ') || 'None'}
              </p>
              <p>
                <strong>Enrolled Learners:</strong> {cls.memberships?.length || 0} / {cls.capacity}
              </p>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setTaModalClass(cls)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700"
              >
                Configure TA Permissions
              </button>
            </div>
          </div>
        ))}
      </div>

      <ModalDialog isOpen={classOpen} onClose={() => setClassOpen(false)} title="Create Class Section">
        <form onSubmit={handleCreateClass} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold mb-1">Course Offering</label>
            <select
              value={classForm.courseOfferingId}
              onChange={(e) => setClassForm({ ...classForm, courseOfferingId: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
            >
              {offerings.map((o) => (
                <option key={o.id} value={o.id}>{o.offeringCode} — {o.titleOverride || o.course?.title}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Section Code</label>
              <input
                required
                value={classForm.sectionCode}
                onChange={(e) => setClassForm({ ...classForm, sectionCode: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Room / Lab</label>
              <input
                value={classForm.room}
                onChange={(e) => setClassForm({ ...classForm, room: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
          </div>
          <div>
            <label className="block font-semibold mb-1">Section Name</label>
            <input
              required
              value={classForm.name}
              onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Schedule</label>
            <input
              value={classForm.schedule}
              onChange={(e) => setClassForm({ ...classForm, schedule: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <button type="submit" className="w-full py-2 bg-blue-600 text-white font-semibold rounded-lg">
            Create Class Section
          </button>
        </form>
      </ModalDialog>

      <ModalDialog
        isOpen={Boolean(taModalClass)}
        onClose={() => setTaModalClass(null)}
        title={`Configure TA Permissions — ${taModalClass?.sectionCode || ''}`}
      >
        <form onSubmit={handleSaveTaConfig} className="space-y-3 text-xs">
          <p className="text-slate-600">
            Configure class-specific capabilities for Teaching Assistant (Liam Reyes, ID #5). Teaching Assistants can never publish final grades or alter system settings.
          </p>
          {[
            { key: 'canViewRoster', label: 'View Class Student Roster' },
            { key: 'canReviewSubmissions', label: 'Monitor & Review Student Submissions' },
            { key: 'canApplyRubrics', label: 'Apply Grading Rubrics & Preliminary Feedback' },
            { key: 'canManageDiscussions', label: 'Participate & Resolve Class Discussions' },
            { key: 'canUploadResources', label: 'Upload Supplementary Lab Worksheets' }
          ].map((item) => (
            <label key={item.key} className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200">
              <input
                type="checkbox"
                checked={Boolean(taConfig[item.key])}
                onChange={(e) => setTaConfig({ ...taConfig, [item.key]: e.target.checked })}
                className="rounded border-slate-300 text-blue-600"
              />
              <span className="font-semibold text-slate-800">{item.label}</span>
            </label>
          ))}
          <button type="submit" className="w-full py-2 bg-blue-600 text-white font-semibold rounded-lg">
            Save Class TA Permissions
          </button>
        </form>
      </ModalDialog>
    </div>
  );
}

export function EnrollmentManagementPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [selectedClassId, setSelectedClassId] = useState(1);
  const [studentIdToEnroll, setStudentIdToEnroll] = useState(9);
  const [csvText, setCsvText] = useState('firstName,lastName,email,studentNumber\nLucas,Graham,lucas.graham@academy.edu,2026-00311\nHannah,Abbott,hannah.abbott@academy.edu,2026-00312');

  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: lmsApi.listClasses
  });

  const { data: enrollmentsData, isLoading } = useQuery({
    queryKey: ['enrollments', selectedClassId],
    queryFn: () => lmsApi.listEnrollments({ classId: selectedClassId })
  });

  const handleEnroll = async (e) => {
    e.preventDefault();
    try {
      await lmsApi.enrollStudent({ classId: Number(selectedClassId), studentId: Number(studentIdToEnroll) });
      addToast('Student enrolled in class section.');
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  const handleCsvImport = async (e) => {
    e.preventDefault();
    try {
      const res = await lmsApi.importCsv({
        classId: Number(selectedClassId),
        defaultRole: 'student',
        csvText
      });
      addToast(res.message);
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  const classes = classesData?.data?.classes || [];
  const enrollments = enrollmentsData?.data?.enrollments || [];

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Registrar Operations"
        title="Student Enrollment & Bulk CSV Record Import"
        subtitle="Enroll students in class offerings, prevent duplicate enrollments, and bulk-import rosters via CSV."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handleEnroll} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 text-xs">
          <h2 className="text-base font-bold text-slate-900">Direct Section Enrollment</h2>
          <div>
            <label className="block font-semibold mb-1">Target Class Section</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.sectionCode} — {c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1">Student Account ID</label>
            <input
              type="number"
              value={studentIdToEnroll}
              onChange={(e) => setStudentIdToEnroll(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg">
            Enroll Student in Section
          </button>
        </form>

        <form onSubmit={handleCsvImport} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Bulk CSV Student Import</h2>
            <Upload className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-slate-500">Format: <code>firstName,lastName,email,studentNumber</code></p>
          <textarea
            rows={4}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            className="w-full p-3 rounded-lg border border-slate-300 font-mono text-[11px]"
          />
          <button type="submit" className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg">
            Import & Enroll CSV Records
          </button>
        </form>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-900">
              Section Roster ({enrollments.length} Enrolled)
            </h2>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Student Number</th>
                <th className="px-4 py-3">Learner Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Class Section</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {enrollments.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-3 font-mono">{e.student?.studentNumber || `STU-${e.studentId}`}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {e.student?.firstName} {e.student?.lastName}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{e.student?.email}</td>
                  <td className="px-4 py-3">{e.classSection?.sectionCode}</td>
                  <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function GradeApprovalsPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data: classesData, isLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: lmsApi.listClasses
  });

  const decisionMutation = useMutation({
    mutationFn: ({ classId, decision, remarks }) =>
      lmsApi.approveFinalGrades(classId, { decision, remarks }),
    onSuccess: (res) => {
      addToast(res.message);
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => addToast(extractErrorMessage(err), 'error')
  });

  if (isLoading) return <LoadingState />;

  const classes = classesData?.data?.classes || [];

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Registrar Grade Governance"
        title="Final Grade Submission Review & Approval Workflow"
        subtitle="Review instructor-submitted final class grades and authorize official publication."
      />

      <div className="grid grid-cols-1 gap-4">
        {classes.map((cls) => (
          <div
            key={cls.id}
            className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-blue-700">{cls.sectionCode}</span>
                <StatusBadge status={cls.finalGradesStatus} />
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-1">{cls.name}</h3>
              <p className="text-xs text-slate-500">
                Enrolled Students: {cls.memberships?.length || 0} · Course: {cls.courseOffering?.course?.code}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  decisionMutation.mutate({
                    classId: cls.id,
                    decision: 'approved',
                    remarks: 'Approved by Academic Administrator'
                  })
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg"
              >
                <CheckCircle2 className="w-4 h-4" />
                Approve & Publish Final Grades
              </button>
              <button
                type="button"
                onClick={() =>
                  decisionMutation.mutate({
                    classId: cls.id,
                    decision: 'returned',
                    remarks: 'Returned to instructor for verification'
                  })
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-semibold rounded-lg"
              >
                <RotateCcw className="w-4 h-4" />
                Return for Revision
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

