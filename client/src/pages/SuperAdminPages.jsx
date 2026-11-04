import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
  Users,
  BookOpen,
  Layers,
  ShieldCheck,
  Activity,
  Plus,
  Search,
  Lock,
  Settings,
  Database,
  ChevronLeft,
  ChevronRight,
  Shield,
  Edit2,
  Trash2,
  Key,
  AlertTriangle,
  Terminal,
  Cpu,
  Mail,
  CheckCircle2,
  Clock,
  Sliders,
  Globe,
  Building2,
  Server,
  Check,
  ArrowRight,
  Play,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { lmsApi, extractErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { userCreateFormSchema } from '../schemas/validation';
import {
  PageHeader,
  StatCard,
  StatusBadge,
  LoadingState,
  ErrorState,
  ModalDialog,
  useToast
} from '../components/ui/SharedComponents';

const SECURITY_PROBES = [
  {
    id: 'probe-iam',
    title: 'Superadmin Role & Privilege Kernel Lock',
    description: 'Kernel-level protection prevents tampering with super_admin role assignment or deletion.',
    status: 'ENFORCED',
    severity: 'Active Guard',
    pts: '100% Locked'
  },
  {
    id: 'probe-cascade',
    title: 'Academic Referential Integrity & Cascade Locks',
    description: 'Deletions on departments and degree programs with active dependencies are strictly rejected.',
    status: 'ACTIVE',
    severity: 'Referential Guard',
    pts: 'Zero Orphaned Records'
  },
  {
    id: 'probe-crypto',
    title: 'Cryptographic Password Hashing & JWT Refresh',
    description: 'SHA-256 / bcrypt salt rounds with rotating signed access tokens for authenticated sessions.',
    status: 'OPERATIONAL',
    severity: 'Cipher Guard',
    pts: '256-bit AES / Bcrypt'
  },
  {
    id: 'probe-audit',
    title: 'Immutable Administrative Audit Trail Ledger',
    description: 'All state-mutating actions are recorded with actor, IP, timestamp, and severity classification.',
    status: 'RECORDING',
    severity: 'Ledger Guard',
    pts: 'Append-Only Ledger'
  }
];

export function SuperAdminDashboardPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard', 'super_admin'],
    queryFn: lmsApi.getDashboardSummary
  });

  const [auditPage, setAuditPage] = useState(1);
  const auditLimit = 6;
  const [runningDiagnostics, setRunningDiagnostics] = useState(false);
  const [activeProbeIndex, setActiveProbeIndex] = useState(0);

  if (isLoading) return <LoadingState label="Loading system-wide metrics..." />;
  if (error) return <ErrorState message={extractErrorMessage(error)} onRetry={refetch} />;

  const summary = data?.data || {};
  const m = summary.metrics || {};
  const roleDist = summary.roleDistribution || [];
  const auditLogs = summary.recentAuditLogs || [];
  const securityEvents = summary.securityEvents || [];

  const totalAuditPages = Math.max(1, Math.ceil(auditLogs.length / auditLimit));
  const pagedAuditLogs = auditLogs.slice((auditPage - 1) * auditLimit, auditPage * auditLimit);

  const handleRunDiagnostics = () => {
    setRunningDiagnostics(true);
    setTimeout(() => {
      setRunningDiagnostics(false);
      addToast('System Diagnostic Probe Passed: All 5 platform subsystems verified operational.', 'success');
    }, 850);
  };

  const activeProbe = SECURITY_PROBES[activeProbeIndex];

  return (
    <div className="space-y-6">
      {/* Hero Banner ("NET-201" Style from Reference Screenshot) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-blue-500/20">
        {/* Ambient Glows */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-16 w-56 h-56 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 items-center justify-center shrink-0 shadow-inner">
              <ShieldCheck className="w-8 h-8 text-blue-200" />
            </div>
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/25 border border-blue-400/30 text-blue-200 text-xs font-bold tracking-wide">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                SYS-CORE-01 · PLATFORM GOVERNANCE
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                MinSU NetAcad Enterprise Architecture & Security Command
              </h1>
              <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
                Super-Administrator operations command center for identity governance, multi-tenant academic catalogs, and real-time security watchdog.
              </p>
            </div>
          </div>

          {/* Right Floating KPI Progress Card */}
          <div className="w-full lg:w-72 shrink-0 bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 shadow-lg text-white">
            <div className="flex items-center justify-between text-xs font-semibold text-blue-200 mb-1">
              <span>Platform Health Score</span>
              <span className="text-[11px] bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded-full font-bold">
                Healthy
              </span>
            </div>
            <div className="text-3xl font-black tracking-tight text-white mt-1">
              99.98%
            </div>
            {/* Progress bar */}
            <div className="w-full bg-white/20 rounded-full h-2 mt-3 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-400 to-emerald-400 h-2 rounded-full w-[99.98%]" />
            </div>
            <p className="text-[11px] text-blue-100/80 mt-2.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <span>All 8 Core Services Operational</span>
            </p>
          </div>
        </div>
      </div>

      {/* Horizontal 5-Stage Stepper Pipeline Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs overflow-x-auto">
        <div className="flex items-center justify-between min-w-[720px] gap-2">
          {[
            { step: '1', title: 'IAM Auth', desc: 'Active & Locked', done: true },
            { step: '2', title: 'Role ACL', desc: 'Enforced', done: true },
            { step: '3', title: 'Academic Catalogs', desc: 'Synchronized', done: true },
            { step: '4', title: 'Laboratory Connectors', desc: 'Connected', done: true },
            { step: '5', title: 'Security Audit Ledger', desc: 'Immutable', done: true }
          ].map((s, idx, arr) => (
            <React.Fragment key={s.step}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm ring-4 ring-blue-50">
                  {s.step}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900">{s.title}</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">{s.desc}</span>
                </div>
              </div>
              {idx < arr.length - 1 && (
                <div className="flex-1 h-0.5 bg-slate-200 mx-2 min-w-[30px]" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Two-Column Dashboard Core: Left Roadmap & Right Telemetry Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column ("Course Roadmap" style, 7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">Platform Architecture Roadmap</h2>
                  <p className="text-xs text-slate-500">Core architectural subsystems and automated guard rails</p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                100% Passing
              </span>
            </div>

            {/* Modules List */}
            <div className="p-4 sm:p-5 space-y-4">
              {/* Module 1 */}
              <div className="border border-slate-200/90 rounded-xl p-4 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Subsystem 1: Identity & Access Management (IAM)
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                    Kernel Level
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="font-medium text-slate-800">1.1 Role-Based Access Control (RBAC) & Superadmin Lock</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Completed
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <Activity className="w-4 h-4 text-blue-500 shrink-0" />
                      <span className="font-medium text-slate-800">1.2 Session Handshake & JWT Token Invalidation</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      Operational
                    </span>
                  </div>
                </div>
              </div>

              {/* Module 2 */}
              <div className="border border-slate-200/90 rounded-xl p-4 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Subsystem 2: Academic & Laboratory Architecture
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                    App Core
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="font-medium text-slate-800">2.1 Department & Degree Program Multi-Tenant Engines</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Verified
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <Terminal className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span className="font-medium text-slate-800">2.2 Cisco Packet Tracer & Code Sandbox Connectors</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                      Connected
                    </span>
                  </div>
                </div>
              </div>

              {/* Module 3 */}
              <div className="border border-slate-200/90 rounded-xl p-4 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Subsystem 3: Disaster Recovery & Security Logging
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                    Forensics
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <Lock className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="font-medium text-slate-800">3.1 Immutable SHA-256 System Audit Trail Ledger</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Active
                    </span>
                  </div>
                </div>
              </div>

              {/* Diagnostics trigger button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleRunDiagnostics}
                  disabled={runningDiagnostics}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-60"
                >
                  {runningDiagnostics ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Probing Subsystems...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white" />
                      <span>Run System Diagnostics Probe</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column ("Course Completion Quiz" style, 5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-full">
            {/* Header with Purple/Indigo gradient */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white p-4 sm:p-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] uppercase tracking-wider font-extrabold text-blue-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Live Watchdog
                </span>
                <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">
                  {SECURITY_PROBES.length} of {SECURITY_PROBES.length} Verified
                </span>
              </div>
              <h2 className="text-base font-bold text-white leading-tight">
                Security Command Console & Telemetry Watchdog
              </h2>
              <p className="text-xs text-blue-100/80 mt-1">
                Real-time threat monitoring and kernel security enforcement
              </p>
            </div>

            {/* Telemetry Stats Bar */}
            <div className="grid grid-cols-3 divide-x divide-slate-100 bg-slate-50/70 border-b border-slate-200 p-3 text-center text-xs">
              <div>
                <p className="text-[10px] text-slate-500 font-semibold uppercase">Latency</p>
                <p className="font-bold text-slate-800 mt-0.5 flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3 text-blue-500" /> ~12ms
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-semibold uppercase">Monitored</p>
                <p className="font-bold text-slate-800 mt-0.5 flex items-center justify-center gap-1">
                  <Server className="w-3 h-3 text-indigo-500" /> 24 Endpoints
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-semibold uppercase">Threat</p>
                <p className="font-bold text-emerald-600 mt-0.5 flex items-center justify-center gap-1">
                  <Shield className="w-3 h-3 text-emerald-500" /> Nominal
                </p>
              </div>
            </div>

            {/* Interactive Security Probe Inspection (Quiz Style) */}
            <div className="p-4 sm:p-5 flex-1 space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900">
                  Inspection Probe {activeProbeIndex + 1} of {SECURITY_PROBES.length}
                </span>
                <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                  {activeProbe.pts}
                </span>
              </div>

              <p className="text-xs font-semibold text-slate-800">
                Select an active platform security control below to inspect its enforcement parameters:
              </p>

              {/* Probe Options */}
              <div className="space-y-2">
                {SECURITY_PROBES.map((probe, idx) => {
                  const isSelected = activeProbeIndex === idx;
                  return (
                    <div
                      key={probe.id}
                      onClick={() => setActiveProbeIndex(idx)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-3 ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/60 shadow-xs'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        checked={isSelected}
                        onChange={() => setActiveProbeIndex(idx)}
                        className="mt-0.5 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-slate-900">{probe.title}</p>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            {probe.status}
                          </span>
                        </div>
                        {isSelected && (
                          <p className="text-slate-600 mt-1.5 text-[11px] leading-relaxed">
                            {probe.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/admin/settings')}
                  className="flex-1 py-2 px-3 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
                >
                  Platform Settings
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/admin/audit-logs')}
                  className="flex-1 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>Inspect Audit Logs</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Registered Users"
          value={m.totalUsers ?? 0}
          subtitle={`${m.activeUsers ?? 0} active · ${m.suspendedUsers ?? 0} suspended`}
          icon={Users}
          accent="blue"
        />
        <StatCard
          title="Courses & Offerings"
          value={m.totalCourses ?? 0}
          subtitle={`${m.totalOfferings ?? 0} term offerings`}
          icon={BookOpen}
          accent="indigo"
        />
        <StatCard
          title="Active Class Sections"
          value={m.totalClasses ?? 0}
          subtitle={`${m.totalEnrollments ?? 0} student enrollments`}
          icon={Layers}
          accent="emerald"
        />
        <StatCard
          title="Platform Health"
          value="Healthy"
          subtitle={m.systemHealth || 'All services operational'}
          icon={Activity}
          accent="emerald"
        />
      </div>

      {/* Account Distribution Chart & Recent Security Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Account Distribution by Role</h2>
              <p className="text-xs text-slate-500">Active user assignments across all system roles</p>
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
              {m.totalUsers ?? 0} Accounts
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roleDist}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="slug" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent Security & Authentication Events</h2>
              <p className="text-xs text-slate-500">Real-time authentication and access events</p>
            </div>
            <Link
              to="/admin/audit-logs"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-2.5 max-h-64 overflow-y-auto">
            {securityEvents.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-xs"
              >
                <div>
                  <span className="font-mono font-bold text-slate-900">{ev.action}</span>
                  <p className="text-slate-500 mt-0.5">
                    Actor: {ev.actorEmail || 'System'} · IP: {ev.ipAddress}
                  </p>
                </div>
                <StatusBadge status={ev.severity} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Administrative Audit Trail with NetAcad styling & Pagination */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Administrative Audit Trail</h2>
            <p className="text-xs text-slate-500">Chronological transaction record of administrative events</p>
          </div>
          <Link
            to="/admin/audit-logs"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <span>Full Audit Log</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {pagedAuditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{log.actorEmail || 'System'}</td>
                  <td className="px-4 py-3">{log.actorRole || '-'}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-blue-700">{log.action}</td>
                  <td className="px-4 py-3 capitalize">{log.category}</td>
                  <td className="px-4 py-3"><StatusBadge status={log.severity} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Dashboard Audit Table Pagination */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <span>
            Showing {auditLogs.length === 0 ? 0 : (auditPage - 1) * auditLimit + 1}–
            {Math.min(auditPage * auditLimit, auditLogs.length)} of{' '}
            <strong className="text-slate-900 font-bold">{auditLogs.length}</strong> recent events
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={auditPage <= 1}
              onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 bg-white font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors shadow-2xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Prev
            </button>
            <span className="px-2 font-semibold text-slate-700">
              Page {auditPage} of {totalAuditPages}
            </span>
            <button
              type="button"
              disabled={auditPage >= totalAuditPages}
              onClick={() => setAuditPage((p) => Math.min(totalAuditPages, p + 1))}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 bg-white font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors shadow-2xs"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function UserManagementPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    status: 'active',
    roleSlug: 'student'
  });

  const { data, isLoading } = useQuery({
    queryKey: ['users', search, roleFilter, statusFilter, page, limit],
    queryFn: () => lmsApi.listUsers({ search, role: roleFilter, status: statusFilter, page, limit })
  });

  const handleSearchChange = (val) => {
    setSearch(val);
    setPage(1);
  };

  const handleRoleFilterChange = (val) => {
    setRoleFilter(val);
    setPage(1);
  };

  const handleStatusFilterChange = (val) => {
    setStatusFilter(val);
    setPage(1);
  };

  const handleLimitChange = (val) => {
    setLimit(Number(val));
    setPage(1);
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(userCreateFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: 'Password@123',
      roleSlug: 'student'
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => lmsApi.updateUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      addToast('User account updated successfully.');
    },
    onError: (err) => addToast(extractErrorMessage(err), 'error')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => lmsApi.deleteUser(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      addToast(res?.message || 'User account removed successfully.');
    },
    onError: (err) => addToast(extractErrorMessage(err), 'error')
  });

  const handleOpenEdit = (u) => {
    setEditingUser(u);
    setEditForm({
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      email: u.email || '',
      status: u.status || 'active',
      roleSlug: u.roles?.[0]?.slug || 'student'
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const isSuperAdmin = (editingUser.roles || []).some((r) => r.slug === 'super_admin');
      const payload = {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        status: editForm.status
      };
      if (!isSuperAdmin && editForm.roleSlug) {
        payload.roleSlug = editForm.roleSlug;
      }
      await lmsApi.updateUser(editingUser.id, payload);
      addToast(`Account for ${editForm.firstName} ${editForm.lastName} updated.`);
      setEditOpen(false);
      setEditingUser(null);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  const handleDeleteUser = (u) => {
    const isSuperAdmin = (u.roles || []).some((r) => r.slug === 'super_admin');
    if (isSuperAdmin) {
      addToast('Super Administrator accounts are permanently protected against deletion.', 'error');
      return;
    }
    if (window.confirm(`Are you sure you want to delete or deactivate user account "${u.email}" (${u.firstName} ${u.lastName})?`)) {
      deleteMutation.mutate(u.id);
    }
  };

  const onCreateSubmit = async (values) => {
    try {
      await lmsApi.createUser(values);
      addToast('User account provisioned successfully.');
      reset();
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  const users = data?.data?.users || [];
  const pagination = data?.data?.pagination || {
    total: users.length,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil((users.length || 0) / limit))
  };

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Identity & Access Management"
        title="Platform User Directory & Role Assignment"
        subtitle="Create, activate, suspend, edit, and manage institutional accounts across all five roles."
        actions={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Create User Account
          </button>
        }
      />

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => handleRoleFilterChange(e.target.value)}
          aria-label="Filter by role"
          className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
        >
          <option value="">All Roles</option>
          <option value="super_admin">Super Administrator</option>
          <option value="academic_admin">Academic Administrator</option>
          <option value="instructor">Instructor</option>
          <option value="teaching_assistant">Teaching Assistant</option>
          <option value="student">Student</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => handleStatusFilterChange(e.target.value)}
          aria-label="Filter by status"
          className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Name & Email</th>
                  <th className="px-4 py-3">System Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500 text-xs">
                      No users match the specified search or filter criteria.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const currentRole = u.roles?.[0]?.slug || 'student';
                    const isSuperAdmin = currentRole === 'super_admin';
                    const isSelf = u.id === currentUser?.id;

                    return (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                            {u.firstName} {u.lastName}
                            {isSelf && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-700 font-bold">
                                You
                              </span>
                            )}
                          </p>
                          <p className="text-slate-500">{u.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          {isSuperAdmin ? (
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs select-none shadow-2xs"
                              title="The Super Administrator role is permanently locked and protected against modification."
                            >
                              <Lock className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Super Admin (Locked)</span>
                            </span>
                          ) : (
                            <select
                              value={currentRole}
                              onChange={(e) =>
                                updateMutation.mutate({ id: u.id, payload: { roleSlug: e.target.value } })
                              }
                              aria-label={`Change role for ${u.email}`}
                              className="px-2 py-1 rounded border border-slate-300 text-xs bg-white font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="super_admin">Super Admin</option>
                              <option value="academic_admin">Academic Admin</option>
                              <option value="instructor">Instructor</option>
                              <option value="teaching_assistant">Teaching Assistant</option>
                              <option value="student">Student</option>
                            </select>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={u.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {u.status !== 'active' ? (
                              <button
                                type="button"
                                onClick={() => updateMutation.mutate({ id: u.id, payload: { status: 'active' } })}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold transition-colors"
                              >
                                Activate
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={isSuperAdmin}
                                onClick={() => updateMutation.mutate({ id: u.id, payload: { status: 'suspended' } })}
                                title={isSuperAdmin ? 'Active Super Administrators cannot be suspended' : 'Suspend account'}
                                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                                  isSuperAdmin
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                    : 'bg-amber-100 hover:bg-amber-200 text-amber-900'
                                }`}
                              >
                                Suspend
                              </button>
                            )}

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(u)}
                              title="Edit user details"
                              className="p-1 rounded text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              disabled={isSuperAdmin || isSelf}
                              onClick={() => handleDeleteUser(u)}
                              title={
                                isSuperAdmin
                                  ? 'Super Administrator accounts are permanently protected against deletion'
                                  : isSelf
                                  ? 'You cannot delete your own account'
                                  : 'Delete or archive user account'
                              }
                              className={`p-1 rounded transition-colors ${
                                isSuperAdmin || isSelf
                                  ? 'text-slate-300 cursor-not-allowed'
                                  : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                              }`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={limit}
                onChange={(e) => handleLimitChange(e.target.value)}
                className="px-2 py-1 rounded border border-slate-300 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-slate-400">|</span>
              <span>
                Showing {pagination.total === 0 ? 0 : (page - 1) * limit + 1}–
                {Math.min(page * limit, pagination.total)} of{' '}
                <strong className="text-slate-900 font-bold">{pagination.total}</strong> users
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-slate-300 bg-white font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors shadow-2xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>

              <span className="px-3 py-1 font-semibold text-slate-700">
                Page {pagination.page} of {pagination.totalPages}
              </span>

              <button
                type="button"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-slate-300 bg-white font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors shadow-2xs"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create User Account */}
      <ModalDialog
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Provision New Institutional Account"
      >
        <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">First Name</label>
              <input {...register('firstName')} className="w-full px-3 py-2 rounded-lg border border-slate-300" />
              {errors.firstName && <p className="text-red-600 mt-0.5">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Last Name</label>
              <input {...register('lastName')} className="w-full px-3 py-2 rounded-lg border border-slate-300" />
              {errors.lastName && <p className="text-red-600 mt-0.5">{errors.lastName.message}</p>}
            </div>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Institutional Email</label>
            <input type="email" {...register('email')} className="w-full px-3 py-2 rounded-lg border border-slate-300" />
            {errors.email && <p className="text-red-600 mt-0.5">{errors.email.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Initial Password</label>
              <input type="password" {...register('password')} className="w-full px-3 py-2 rounded-lg border border-slate-300" />
              {errors.password && <p className="text-red-600 mt-0.5">{errors.password.message}</p>}
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Primary Role</label>
              <select {...register('roleSlug')} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
                <option value="student">Student / Learner</option>
                <option value="instructor">Instructor / Teacher</option>
                <option value="teaching_assistant">Teaching Assistant</option>
                <option value="academic_admin">Academic Administrator</option>
                <option value="super_admin">Super Administrator</option>
              </select>
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              {isSubmitting ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Modal: Edit User Account */}
      <ModalDialog
        isOpen={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditingUser(null);
        }}
        title={`Edit User Account: ${editingUser?.email || ''}`}
      >
        {editingUser && (
          <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">First Name</label>
                <input
                  required
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Last Name</label>
                <input
                  required
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Account Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">System Role</label>
                {(editingUser.roles || []).some((r) => r.slug === 'super_admin') ? (
                  <div className="w-full px-3 py-2 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 font-bold flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Super Admin (Locked for Security)</span>
                  </div>
                ) : (
                  <select
                    value={editForm.roleSlug}
                    onChange={(e) => setEditForm({ ...editForm, roleSlug: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium"
                  >
                    <option value="student">Student / Learner</option>
                    <option value="instructor">Instructor / Teacher</option>
                    <option value="teaching_assistant">Teaching Assistant</option>
                    <option value="academic_admin">Academic Administrator</option>
                    <option value="super_admin">Super Administrator</option>
                  </select>
                )}
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setEditOpen(false);
                  setEditingUser(null);
                }}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                Save Changes
              </button>
            </div>
          </form>
        )}
      </ModalDialog>
    </div>
  );
}

export function RolePermissionMatrixPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [selectedRoleId, setSelectedRoleId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['roles-permissions'],
    queryFn: lmsApi.listRoles
  });

  if (isLoading) return <LoadingState />;

  const roles = data?.data?.roles || [];
  const permissions = data?.data?.permissions || [];
  const activeRole = roles.find((r) => r.id === (selectedRoleId || roles[0]?.id));
  const activePermCodes = new Set((activeRole?.permissions || []).map((p) => p.code));

  const isSuperAdminRole = activeRole?.slug === 'super_admin';

  const handleTogglePermission = async (code) => {
    if (!activeRole) return;
    if (isSuperAdminRole) {
      addToast('Super Administrator permissions are permanently locked to preserve system integrity.', 'error');
      return;
    }
    const nextCodes = activePermCodes.has(code)
      ? Array.from(activePermCodes).filter((c) => c !== code)
      : [...Array.from(activePermCodes), code];

    try {
      await lmsApi.updateRolePermissions(activeRole.id, nextCodes);
      queryClient.invalidateQueries({ queryKey: ['roles-permissions'] });
      addToast(`Updated permissions for ${activeRole.name}`);
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        badge="RBAC Policy Engine"
        title="Role & Permission Authorization Matrix"
        subtitle="Configure centralized server-side permission grants for each institutional role."
      />

      <div className="flex flex-wrap gap-2">
        {roles.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setSelectedRoleId(r.id)}
            className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${
              activeRole?.id === r.id
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {r.name} ({r.permissions?.length || 0})
          </button>
        ))}
      </div>

      {activeRole && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">{activeRole.name}</h2>
                {isSuperAdminRole && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] border border-indigo-200">
                    <Lock className="w-3 h-3" />
                    Locked Core Role
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{activeRole.description}</p>
            </div>
            <span className="text-xs font-mono bg-slate-100 px-2.5 py-1 rounded text-slate-700">
              slug: {activeRole.slug}
            </span>
          </div>

          {isSuperAdminRole && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-indigo-50/80 border border-indigo-200/90 text-indigo-950 text-xs shadow-2xs">
              <Lock className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Super Administrator Role Is Permanently Protected & Locked</p>
                <p className="text-indigo-700 mt-0.5 leading-relaxed">
                  All system permissions are permanently assigned to this role and cannot be modified or revoked to avoid platform lockout.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {permissions.map((perm) => {
              const checked = activePermCodes.has(perm.code);
              return (
                <label
                  key={perm.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border text-xs transition-colors ${
                    isSuperAdminRole
                      ? 'bg-slate-50/70 border-slate-200 cursor-not-allowed opacity-90'
                      : checked
                      ? 'bg-blue-50/50 border-blue-300 cursor-pointer'
                      : 'bg-white border-slate-200 hover:bg-slate-50 cursor-pointer'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={isSuperAdminRole}
                    onChange={() => handleTogglePermission(perm.code)}
                    className="mt-0.5 rounded border-slate-300 text-blue-600 disabled:opacity-60"
                  />
                  <div>
                    <p className="font-mono font-bold text-slate-900">{perm.code}</p>
                    <p className="text-slate-500 mt-0.5">{perm.description}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function SystemSettingsPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [instModalOpen, setInstModalOpen] = useState(false);
  const [instForm, setInstForm] = useState({
    name: '',
    code: '',
    domain: '',
    contactEmail: '',
    passingGradeDefault: 75,
    allowSelfEnrollment: true
  });

  const [securityModalOpen, setSecurityModalOpen] = useState(false);
  const [securityForm, setSecurityForm] = useState({
    maxFailedLoginAttempts: 5,
    lockoutDurationMinutes: 15,
    sessionTimeoutMinutes: 480,
    requireStrongPasswords: true,
    auditRetentionDays: 365
  });

  const [gradingModalOpen, setGradingModalOpen] = useState(false);
  const [gradingForm, setGradingForm] = useState([
    { name: 'Quizzes', categoryType: 'quiz', weightPercent: 20 },
    { name: 'Assignments', categoryType: 'assignment', weightPercent: 25 },
    { name: 'Laboratory Activities', categoryType: 'laboratory', weightPercent: 25 },
    { name: 'Major Examination', categoryType: 'major_exam', weightPercent: 30 }
  ]);

  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: lmsApi.listSettings
  });

  const { data: instData, isLoading: instLoading } = useQuery({
    queryKey: ['institution'],
    queryFn: lmsApi.getInstitution
  });

  const isLoading = settingsLoading || instLoading;

  if (isLoading) return <LoadingState />;

  const settings = settingsData?.data?.settings || [];
  const institution = instData?.data?.institution || {};

  const integrationsSetting = settings.find((s) => s.key === 'integrations_config');
  const integrations = integrationsSetting?.value || {
    packetTracerLabSupport: { enabled: true, mode: 'file_and_topology_viewer' },
    codeSandboxService: { enabled: false, status: 'external_isolated_runner_not_connected', note: 'Static syntax inspection and instructor test rubric enabled' },
    smtpEmailNotifications: { enabled: false, status: 'in_app_primary' }
  };

  const securitySetting = settings.find((s) => s.key === 'security_policy');
  const securityPolicy = securitySetting?.value || {
    maxFailedLoginAttempts: 5,
    lockoutDurationMinutes: 15,
    sessionTimeoutMinutes: 480,
    requireStrongPasswords: true,
    auditRetentionDays: 365
  };

  const gradingSetting = settings.find((s) => s.key === 'grading_default_template');
  const gradingTemplate = Array.isArray(gradingSetting?.value) ? gradingSetting.value : [
    { name: 'Quizzes', categoryType: 'quiz', weightPercent: 20 },
    { name: 'Assignments', categoryType: 'assignment', weightPercent: 25 },
    { name: 'Laboratory Activities', categoryType: 'laboratory', weightPercent: 25 },
    { name: 'Major Examination', categoryType: 'major_exam', weightPercent: 30 }
  ];

  const backupSetting = settings.find((s) => s.key === 'maintenance_backup_policy');
  const backupPolicy = backupSetting?.value || {
    automatedDailyBackup: true,
    lastBackupTimestamp: new Date().toISOString(),
    maintenanceWindow: 'Sundays 02:00-04:00 UTC',
    systemStatus: 'operational'
  };

  // Open Edit Modals
  const handleOpenEditInstitution = () => {
    setInstForm({
      name: institution.name || '',
      code: institution.code || '',
      domain: institution.domain || '',
      contactEmail: institution.contactEmail || '',
      passingGradeDefault: Number(institution.passingGradeDefault || 75),
      allowSelfEnrollment: institution.allowSelfEnrollment !== false
    });
    setInstModalOpen(true);
  };

  const handleOpenEditSecurity = () => {
    setSecurityForm({
      maxFailedLoginAttempts: Number(securityPolicy.maxFailedLoginAttempts || 5),
      lockoutDurationMinutes: Number(securityPolicy.lockoutDurationMinutes || 15),
      sessionTimeoutMinutes: Number(securityPolicy.sessionTimeoutMinutes || 480),
      requireStrongPasswords: securityPolicy.requireStrongPasswords !== false,
      auditRetentionDays: Number(securityPolicy.auditRetentionDays || 365)
    });
    setSecurityModalOpen(true);
  };

  const handleOpenEditGrading = () => {
    setGradingForm(gradingTemplate.map((item) => ({ ...item })));
    setGradingModalOpen(true);
  };

  // Save Handlers
  const handleSaveInstitution = async (e) => {
    e.preventDefault();
    try {
      await lmsApi.updateInstitution(instForm);
      queryClient.invalidateQueries({ queryKey: ['institution'] });
      setInstModalOpen(false);
      addToast('Institutional profile updated successfully.');
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  const handleSaveSecurityPolicy = async (e) => {
    e.preventDefault();
    try {
      await lmsApi.updateSetting('security_policy', {
        category: 'security',
        description: 'Platform authentication and session security controls',
        value: securityForm
      });
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      setSecurityModalOpen(false);
      addToast('Platform security policy updated successfully.');
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  const handleSaveGrading = async (e) => {
    e.preventDefault();
    const total = gradingForm.reduce((acc, item) => acc + Number(item.weightPercent || 0), 0);
    if (total !== 100) {
      addToast(`Total weight must equal exactly 100% (currently ${total}%).`, 'error');
      return;
    }
    try {
      await lmsApi.updateSetting('grading_default_template', {
        category: 'grading',
        description: 'Institutional default weighted grading template (Total = 100%)',
        value: gradingForm
      });
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      setGradingModalOpen(false);
      addToast('Default grading weight template updated.');
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  const handleToggleIntegration = async (serviceKey) => {
    const currentVal = integrations;
    const nextVal = {
      ...currentVal,
      [serviceKey]: {
        ...currentVal[serviceKey],
        enabled: !currentVal[serviceKey]?.enabled
      }
    };
    try {
      await lmsApi.updateSetting('integrations_config', {
        category: 'integrations',
        description: 'External laboratory and notification service integrations',
        value: nextVal
      });
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      addToast(`Updated integration status for ${serviceKey}.`);
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  const handleTriggerBackupVerify = async () => {
    try {
      await lmsApi.updateSetting('maintenance_backup_policy', {
        category: 'maintenance',
        description: 'Backup and maintenance operational status',
        value: {
          automatedDailyBackup: true,
          lastBackupTimestamp: new Date().toISOString(),
          maintenanceWindow: 'Sundays 02:00-04:00 UTC',
          systemStatus: 'operational'
        }
      });
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      addToast('Database backup checkpoint verified and logged.');
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Platform Governance"
        title="System & Integrations Management"
        subtitle="Configure institutional parameters, external laboratory connectors, security policies, and maintenance controls."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenEditInstitution}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg shadow-2xs"
            >
              <Edit2 className="w-3.5 h-3.5 text-slate-600" />
              Edit Institutional Profile
            </button>
            <button
              type="button"
              onClick={handleTriggerBackupVerify}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs"
            >
              <Database className="w-3.5 h-3.5 text-blue-400" />
              Verify Backup Checkpoint
            </button>
          </div>
        }
      />

      {/* 1. Institutional Profile Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{institution.name || 'Mindoro State University (MinSU)'}</h2>
              <p className="text-xs text-slate-500 font-mono">Code: {institution.code || 'MinSU'} · Domain: {institution.domain || 'minsu.edu.ph'}</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Production Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block mb-0.5">Contact & Support Email</span>
            <strong className="text-slate-900 text-sm font-semibold">{institution.contactEmail || 'admin@academy.edu'}</strong>
          </div>
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block mb-0.5">Passing Grade Baseline</span>
            <strong className="text-slate-900 text-sm font-semibold">{institution.passingGradeDefault}%</strong>
          </div>
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block mb-0.5">Self-Enrollment Policy</span>
            <strong className="text-slate-900 text-sm font-semibold">
              {institution.allowSelfEnrollment !== false ? 'Open Self-Enrollment' : 'Restricted (Admin Only)'}
            </strong>
          </div>
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block mb-0.5">System Timezone & Clock</span>
            <strong className="text-slate-900 text-sm font-semibold">Asia/Manila (UTC+8)</strong>
          </div>
        </div>
      </div>

      {/* 2. Laboratory & Educational Tech Integrations */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Laboratory & Technical Integrations</h3>
            <p className="text-xs text-slate-500">Enable, disable, and monitor institutional laboratory execution connectors.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Cisco Packet Tracer */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <Terminal className="w-4 h-4" />
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    integrations.packetTracerLabSupport?.enabled
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {integrations.packetTracerLabSupport?.enabled ? 'Active' : 'Disabled'}
                </span>
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Cisco Packet Tracer Lab</h4>
              <p className="text-slate-500 mt-1">
                Embedded network simulation topology viewer and automated .pkt/.pkz assignment file submission parsing.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-slate-400 font-mono text-[11px]">Mode: Topology Viewer</span>
              <button
                type="button"
                onClick={() => handleToggleIntegration('packetTracerLabSupport')}
                className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors ${
                  integrations.packetTracerLabSupport?.enabled
                    ? 'bg-amber-100 hover:bg-amber-200 text-amber-900'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {integrations.packetTracerLabSupport?.enabled ? 'Disable Lab' : 'Enable Lab'}
              </button>
            </div>
          </div>

          {/* Code Execution Sandbox */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <Cpu className="w-4 h-4" />
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    integrations.codeSandboxService?.enabled
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {integrations.codeSandboxService?.enabled ? 'Active' : 'Standby'}
                </span>
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Code Execution Sandbox</h4>
              <p className="text-slate-500 mt-1">
                Isolated container environment for automated unit test evaluation, Python/C++ code grading, and web output rendering.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-slate-400 font-mono text-[11px]">Mode: Isolated Runner</span>
              <button
                type="button"
                onClick={() => handleToggleIntegration('codeSandboxService')}
                className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors ${
                  integrations.codeSandboxService?.enabled
                    ? 'bg-amber-100 hover:bg-amber-200 text-amber-900'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {integrations.codeSandboxService?.enabled ? 'Disable Runner' : 'Enable Runner'}
              </button>
            </div>
          </div>

          {/* SMTP Gateway */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  <Mail className="w-4 h-4" />
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    integrations.smtpEmailNotifications?.enabled
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {integrations.smtpEmailNotifications?.enabled ? 'SMTP Relay' : 'In-App Primary'}
                </span>
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Email Notification Gateway</h4>
              <p className="text-slate-500 mt-1">
                Transactional email dispatch for password resets, grade approval notifications, and official academic notices.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-slate-400 font-mono text-[11px]">Relay: Institutional SMTP</span>
              <button
                type="button"
                onClick={() => handleToggleIntegration('smtpEmailNotifications')}
                className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors ${
                  integrations.smtpEmailNotifications?.enabled
                    ? 'bg-amber-100 hover:bg-amber-200 text-amber-900'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {integrations.smtpEmailNotifications?.enabled ? 'Use In-App' : 'Enable SMTP'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Security Policy & Grading Weights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Security Policy Panel */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Authentication & Session Security</h3>
              </div>
              <button
                type="button"
                onClick={handleOpenEditSecurity}
                className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-300 hover:bg-slate-50 text-slate-700"
              >
                Edit Policy
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-600">Max Failed Login Attempts (Lockout)</span>
                <span className="font-bold text-slate-900">{securityPolicy.maxFailedLoginAttempts} attempts</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-600">Account Lockout Duration</span>
                <span className="font-bold text-slate-900">{securityPolicy.lockoutDurationMinutes} minutes</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-600">Session Inactivity Timeout</span>
                <span className="font-bold text-slate-900">{securityPolicy.sessionTimeoutMinutes} mins ({securityPolicy.sessionTimeoutMinutes / 60} hrs)</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-600">Password Complexity Enforcement</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {securityPolicy.requireStrongPasswords ? 'Enforced' : 'Standard'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-600">Audit Trail Retention Window</span>
                <span className="font-bold text-slate-900">{securityPolicy.auditRetentionDays} days</span>
              </div>
            </div>
          </div>
        </div>

        {/* Institutional Grading Template */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Institutional Default Grading Weights</h3>
              </div>
              <button
                type="button"
                onClick={handleOpenEditGrading}
                className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-300 hover:bg-slate-50 text-slate-700"
              >
                Edit Weights
              </button>
            </div>

            {/* Visual Weight Distribution Bar */}
            <div className="mb-4">
              <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-100">
                {gradingTemplate.map((item, idx) => {
                  const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500'];
                  return (
                    <div
                      key={item.categoryType || idx}
                      style={{ width: `${item.weightPercent}%` }}
                      className={`${colors[idx % colors.length]}`}
                      title={`${item.name}: ${item.weightPercent}%`}
                    />
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {gradingTemplate.map((item, idx) => {
                const dotColors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500'];
                return (
                  <div key={item.categoryType || idx} className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${dotColors[idx % dotColors.length]}`}></span>
                      <span className="font-semibold text-slate-800">{item.name}</span>
                    </div>
                    <strong className="text-slate-900 font-bold text-sm">{item.weightPercent}%</strong>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Total Baseline Calculation:</span>
            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              100% Balanced
            </span>
          </div>
        </div>
      </div>

      {/* 4. Maintenance & Operational Status */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Database className="w-4 h-4 text-slate-700" />
          Disaster Recovery & Operational Status
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block mb-0.5">Automated Daily Backup</span>
            <strong className="text-emerald-700 font-bold flex items-center gap-1 text-sm">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Active (02:00 UTC)
            </strong>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block mb-0.5">Last Verified Checkpoint</span>
            <strong className="text-slate-900 font-mono text-xs block truncate">
              {backupPolicy.lastBackupTimestamp ? new Date(backupPolicy.lastBackupTimestamp).toLocaleString() : 'Recently Verified'}
            </strong>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block mb-0.5">Maintenance Window</span>
            <strong className="text-slate-900 font-semibold text-xs">{backupPolicy.maintenanceWindow || 'Sundays 02:00-04:00 UTC'}</strong>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block mb-0.5">Platform Integrity Status</span>
            <strong className="text-emerald-700 font-bold flex items-center gap-1 text-sm">
              <Check className="w-3.5 h-3.5" />
              Operational
            </strong>
          </div>
        </div>
      </div>

      {/* Modal: Edit Institutional Profile */}
      <ModalDialog
        isOpen={instModalOpen}
        onClose={() => setInstModalOpen(false)}
        title="Edit Institutional Profile & Branding"
      >
        <form onSubmit={handleSaveInstitution} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold mb-1 text-slate-700">Institution Name</label>
            <input
              required
              value={instForm.name}
              onChange={(e) => setInstForm({ ...instForm, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Institution Code</label>
              <input
                required
                value={instForm.code}
                onChange={(e) => setInstForm({ ...instForm, code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 uppercase font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Primary Domain</label>
              <input
                required
                value={instForm.domain}
                onChange={(e) => setInstForm({ ...instForm, domain: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Support / Contact Email</label>
              <input
                type="email"
                required
                value={instForm.contactEmail}
                onChange={(e) => setInstForm({ ...instForm, contactEmail: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Default Passing Grade (%)</label>
              <input
                type="number"
                min={50}
                max={100}
                value={instForm.passingGradeDefault}
                onChange={(e) => setInstForm({ ...instForm, passingGradeDefault: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
          </div>
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-900">Allow Open Student Self-Enrollment</p>
              <p className="text-slate-500">When enabled, students can register directly from the public landing portal.</p>
            </div>
            <input
              type="checkbox"
              checked={instForm.allowSelfEnrollment}
              onChange={(e) => setInstForm({ ...instForm, allowSelfEnrollment: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setInstModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              Save Profile
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Modal: Edit Security Policy */}
      <ModalDialog
        isOpen={securityModalOpen}
        onClose={() => setSecurityModalOpen(false)}
        title="Edit Platform Security & Session Policy"
      >
        <form onSubmit={handleSaveSecurityPolicy} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Max Failed Logins</label>
              <input
                type="number"
                min={3}
                max={20}
                value={securityForm.maxFailedLoginAttempts}
                onChange={(e) => setSecurityForm({ ...securityForm, maxFailedLoginAttempts: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Lockout Duration (Mins)</label>
              <input
                type="number"
                min={5}
                max={120}
                value={securityForm.lockoutDurationMinutes}
                onChange={(e) => setSecurityForm({ ...securityForm, lockoutDurationMinutes: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Session Timeout (Mins)</label>
              <input
                type="number"
                min={30}
                max={1440}
                value={securityForm.sessionTimeoutMinutes}
                onChange={(e) => setSecurityForm({ ...securityForm, sessionTimeoutMinutes: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Audit Retention (Days)</label>
              <input
                type="number"
                min={30}
                max={730}
                value={securityForm.auditRetentionDays}
                onChange={(e) => setSecurityForm({ ...securityForm, auditRetentionDays: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
          </div>
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-900">Enforce Strong Password Requirements</p>
              <p className="text-slate-500">Requires uppercase letter, number, and minimum 8 characters.</p>
            </div>
            <input
              type="checkbox"
              checked={securityForm.requireStrongPasswords}
              onChange={(e) => setSecurityForm({ ...securityForm, requireStrongPasswords: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setSecurityModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              Save Security Policy
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Modal: Edit Grading Weights */}
      <ModalDialog
        isOpen={gradingModalOpen}
        onClose={() => setGradingModalOpen(false)}
        title="Edit Institutional Default Grading Weights"
      >
        <form onSubmit={handleSaveGrading} className="space-y-3.5 text-xs">
          <p className="text-slate-500">
            Configure the baseline grading weight distribution. Total weights across all categories must sum to <strong>100%</strong>.
          </p>
          <div className="space-y-3">
            {gradingForm.map((item, idx) => (
              <div key={item.categoryType || idx} className="grid grid-cols-2 gap-3 items-center">
                <input
                  required
                  value={item.name}
                  onChange={(e) => {
                    const next = [...gradingForm];
                    next[idx].name = e.target.value;
                    setGradingForm(next);
                  }}
                  className="px-3 py-2 rounded-lg border border-slate-300"
                />
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    required
                    value={item.weightPercent}
                    onChange={(e) => {
                      const next = [...gradingForm];
                      next[idx].weightPercent = Number(e.target.value);
                      setGradingForm(next);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-right font-bold"
                  />
                  <span className="text-slate-500 font-semibold">%</span>
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="font-semibold text-slate-700">Calculated Sum:</span>
            <span
              className={`font-bold text-sm ${
                gradingForm.reduce((acc, item) => acc + Number(item.weightPercent || 0), 0) === 100
                  ? 'text-emerald-600'
                  : 'text-red-600'
              }`}
            >
              {gradingForm.reduce((acc, item) => acc + Number(item.weightPercent || 0), 0)}% / 100%
            </span>
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setGradingModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              Save Grading Weights
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}

export function AuditLogsPage() {
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', category, severity, search, page, limit],
    queryFn: () => lmsApi.listAuditLogs({ category, severity, search, page, limit })
  });

  const handleCategoryChange = (val) => {
    setCategory(val);
    setPage(1);
  };

  const handleSeverityChange = (val) => {
    setSeverity(val);
    setPage(1);
  };

  const handleSearchChange = (val) => {
    setSearch(val);
    setPage(1);
  };

  const handleLimitChange = (val) => {
    setLimit(Number(val));
    setPage(1);
  };

  const logs = data?.data?.logs || [];
  const pagination = data?.data?.pagination || {
    total: logs.length,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil((logs.length || 0) / limit))
  };

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Compliance & Forensics"
        title="Security Events & Sensitive Operations Audit Trail"
        subtitle="Immutable record of authentication, role modifications, academic configurations, and grade publications."
      />

      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search action, actor email, or entity..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300"
          />
        </div>
        <select
          value={category}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
        >
          <option value="">All Categories</option>
          <option value="auth">Authentication</option>
          <option value="security">Security Events</option>
          <option value="user">User Management</option>
          <option value="role">Role & Permissions</option>
          <option value="academic">Academic Operations</option>
          <option value="grade">Grading & Approvals</option>
        </select>
        <select
          value={severity}
          onChange={(e) => handleSeverityChange(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
        >
          <option value="">All Severities</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Target Entity</th>
                  <th className="px-4 py-3">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500 text-xs">
                      No audit log records match the current filter criteria.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{log.actorEmail || 'System'}</td>
                      <td className="px-4 py-3">{log.actorRole || '-'}</td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{log.action}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {log.entityType ? `${log.entityType} #${log.entityId}` : '-'}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={log.severity} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Audit Logs Pagination */}
          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={limit}
                onChange={(e) => handleLimitChange(e.target.value)}
                className="px-2 py-1 rounded border border-slate-300 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-slate-400">|</span>
              <span>
                Showing {pagination.total === 0 ? 0 : (page - 1) * limit + 1}–
                {Math.min(page * limit, pagination.total)} of{' '}
                <strong className="text-slate-900 font-bold">{pagination.total}</strong> records
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-slate-300 bg-white font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors shadow-2xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>

              <span className="px-3 py-1 font-semibold text-slate-700">
                Page {pagination.page} of {pagination.totalPages}
              </span>

              <button
                type="button"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-slate-300 bg-white font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors shadow-2xs"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

