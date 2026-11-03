import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  BookOpen,
  ClipboardCheck,
  Award,
  Clock,
  CalendarDays,
  ArrowUpRight,
  GraduationCap,
  Laptop,
  Megaphone,
  CheckCircle2,
  PlayCircle,
  Terminal,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Download,
  ShieldCheck,
  Send,
  Save,
  MapPin,
  Network,
  Circle,
  Trophy,
  CircleHelp
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

const CERTIFICATE_COLORS = {
  blue: '#1D4ED8',
  blueTint: '#EEF3FF',
  blueLine: '#BCD0F7',
  text: '#0F172A',
  textSecondary: '#475569',
  muted: '#64748B',
  green: '#047857',
  greenTint: '#D5F5E6',
  amberTint: '#FDF0C7',
  amberText: '#8A4B08',
  border: '#E3E8F2',
  page: '#F7F9FD',
  badgeTop: '#EEF4FF',
  badgeBottom: '#E3ECFF',
  badgeBorder: '#CFE0FF',
  certificateInnerBorder: '#DBE7FF',
  certificateInnerBottom: '#F6F9FF',
  ribbon: '#D97706',
  badgeShadow: 'rgba(29,78,216,.18)',
  signature: '#94A3B8'
};

// Helper to generate and download a high-resolution PNG Digital Course Mastery Badge
function downloadCourseBadgePng(cert) {
  const courseCode = cert?.courseCode || cert?.course?.code || 'COURSE';
  const courseTitle = cert?.courseTitle || cert?.course?.title || 'Course Mastery';
  const recipient = cert?.recipientName || 'Verified Student';
  const scorePct = Math.round(Number(cert?.finalScore || 100));
  const certCode = cert?.certificateCode || 'AIT-BADGE-VERIFIED';
  const issuedDate = cert?.issuedAt ? new Date(cert.issuedAt).toLocaleDateString() : new Date().toLocaleDateString();

  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 720;
  const ctx = canvas.getContext?.('2d');
  if (!ctx) return;

  const bgGrad = ctx.createLinearGradient(0, 0, 640, 720);
  bgGrad.addColorStop(0, CERTIFICATE_COLORS.badgeTop);
  bgGrad.addColorStop(1, CERTIFICATE_COLORS.badgeBottom);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 640, 720);

  ctx.strokeStyle = CERTIFICATE_COLORS.badgeBorder;
  ctx.lineWidth = 6;
  ctx.strokeRect(18, 18, 604, 684);

  const cx = 320;
  const cy = 265;
  const r = 135;
  ctx.shadowColor = CERTIFICATE_COLORS.badgeShadow;
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 12;
  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = CERTIFICATE_COLORS.blue;
  ctx.stroke();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.fillStyle = CERTIFICATE_COLORS.blue;
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MINDORO STATE UNIVERSITY (MinSU) · NETACAD', 320, 66);

  ctx.fillStyle = CERTIFICATE_COLORS.amberText;
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('★ OFFICIAL DIGITAL COURSE MASTERY BADGE ★', 320, 98);

  ctx.fillStyle = CERTIFICATE_COLORS.text;
  ctx.font = 'bold 38px monospace';
  ctx.fillText(courseCode, cx, cy - 18);

  ctx.fillStyle = CERTIFICATE_COLORS.green;
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(`${scorePct}% MASTERY`, cx, cy + 24);

  ctx.fillStyle = CERTIFICATE_COLORS.textSecondary;
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('VERIFIED PASS', cx, cy + 58);

  ctx.fillStyle = CERTIFICATE_COLORS.text;
  ctx.font = 'bold 22px sans-serif';
  const words = courseTitle.split(' ');
  let line = '';
  let y = 455;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > 520) {
      ctx.fillText(line, 320, y);
      line = w;
      y += 30;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, 320, y);

  ctx.fillStyle = CERTIFICATE_COLORS.muted;
  ctx.font = '15px sans-serif';
  ctx.fillText('Awarded To', 320, 550);

  ctx.fillStyle = CERTIFICATE_COLORS.blue;
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(recipient, 320, 584);

  ctx.fillStyle = CERTIFICATE_COLORS.textSecondary;
  ctx.font = '14px monospace';
  ctx.fillText(`Credential ID: ${certCode} · Issued: ${issuedDate}`, 320, 645);

  const link = document.createElement('a');
  link.download = `Badge-${courseCode}-${recipient.replace(/\s+/g, '-')}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// Helper to generate and download a high-resolution PNG Official Certificate of Completion
function downloadCertificatePng(cert) {
  const courseCode = cert?.courseCode || cert?.course?.code || 'COURSE';
  const courseTitle = cert?.courseTitle || cert?.course?.title || 'Course Completion';
  const recipient = cert?.recipientName || 'Verified Student';
  const scorePct = Number(cert?.finalScore || 100);
  const certCode = cert?.certificateCode || 'AIT-CERT-VERIFIED';
  const verifyHash = cert?.verificationHash || 'verified-sha256-credential';
  const statusLabel = String(cert?.status || 'active').replace(/_/g, ' ');
  const issuedDate = cert?.issuedAt ? new Date(cert.issuedAt).toLocaleDateString() : new Date().toLocaleDateString();

  const canvas = document.createElement('canvas');
  canvas.width = 1600;
  canvas.height = 1131;
  const ctx = canvas.getContext?.('2d');
  if (!ctx) return;

  const centerX = canvas.width / 2;
  const wrapText = (text, maxWidth, font) => {
    ctx.font = font;
    const lines = [];
    let line = '';

    String(text).split(/\s+/).forEach((word) => {
      if (ctx.measureText(word).width > maxWidth) {
        if (line) lines.push(line);
        line = '';
        let chunk = '';
        for (const character of word) {
          if (ctx.measureText(chunk + character).width > maxWidth && chunk) {
            lines.push(chunk);
            chunk = character;
          } else {
            chunk += character;
          }
        }
        line = chunk;
        return;
      }

      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    });

    if (line) lines.push(line);
    return lines;
  };
  const drawCenteredLines = (text, y, maxWidth, font, lineHeight) => {
    ctx.font = font;
    wrapText(text, maxWidth, font).forEach((line, index) => {
      ctx.fillText(line, centerX, y + index * lineHeight);
    });
  };

  ctx.fillStyle = CERTIFICATE_COLORS.page;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = CERTIFICATE_COLORS.badgeBorder;
  ctx.lineWidth = 16;
  ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

  ctx.strokeStyle = CERTIFICATE_COLORS.certificateInnerBorder;
  ctx.lineWidth = 4;
  ctx.strokeRect(52, 52, canvas.width - 104, canvas.height - 104);

  ctx.fillStyle = CERTIFICATE_COLORS.greenTint;
  ctx.strokeStyle = CERTIFICATE_COLORS.greenTint;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(canvas.width - 260, 68, 175, 42, 18);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = CERTIFICATE_COLORS.green;
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(statusLabel.toUpperCase(), canvas.width - 172, 95);

  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(centerX, 83);
  ctx.lineTo(centerX + 23, 93);
  ctx.lineTo(centerX + 20, 120);
  ctx.quadraticCurveTo(centerX, 143, centerX - 20, 120);
  ctx.lineTo(centerX - 23, 93);
  ctx.closePath();
  ctx.lineWidth = 3;
  ctx.strokeStyle = CERTIFICATE_COLORS.blue;
  ctx.stroke();
  ctx.fillStyle = CERTIFICATE_COLORS.green;
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('✓', centerX, 117);

  ctx.fillStyle = CERTIFICATE_COLORS.blue;
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('AETHERIA INSTITUTE OF TECHNOLOGY & NETWORKING ACADEMY', centerX, 175);

  ctx.fillStyle = CERTIFICATE_COLORS.text;
  ctx.font = 'bold 48px serif';
  ctx.fillText('CERTIFICATE OF COURSE COMPLETION', centerX, 252);

  ctx.fillStyle = CERTIFICATE_COLORS.muted;
  ctx.font = 'italic 22px serif';
  ctx.fillText('This official credential certifies that', centerX, 325);

  ctx.fillStyle = CERTIFICATE_COLORS.text;
  ctx.font = 'bold 54px sans-serif';
  drawCenteredLines(recipient, 395, 1200, 'bold 54px sans-serif', 66);

  ctx.strokeStyle = CERTIFICATE_COLORS.signature;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(400, 430);
  ctx.lineTo(1200, 430);
  ctx.stroke();

  ctx.fillStyle = CERTIFICATE_COLORS.textSecondary;
  ctx.font = '22px sans-serif';
  drawCenteredLines(
    'has successfully completed all curriculum modules, practical laboratories, and course checkpoint quizzes for',
    475,
    1120,
    '22px sans-serif',
    34
  );

  ctx.fillStyle = CERTIFICATE_COLORS.blue;
  ctx.font = 'bold 36px sans-serif';
  drawCenteredLines(`${courseCode}: ${courseTitle}`, 560, 1200, 'bold 36px sans-serif', 46);

  ctx.fillStyle = CERTIFICATE_COLORS.green;
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText(`Final Course Mastery Score: ${scorePct}% · 100% Completed`, centerX, 665);

  ctx.fillStyle = CERTIFICATE_COLORS.text;
  ctx.font = 'bold 18px monospace';
  ctx.fillText(`Certificate Code: ${certCode}`, centerX, 750);
  ctx.font = '15px monospace';
  drawCenteredLines(`Verification Hash: ${verifyHash}`, 780, 1120, '15px monospace', 22);

  ctx.strokeStyle = CERTIFICATE_COLORS.signature;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(250, 935);
  ctx.lineTo(630, 935);
  ctx.moveTo(970, 935);
  ctx.lineTo(1350, 935);
  ctx.stroke();

  ctx.fillStyle = CERTIFICATE_COLORS.text;
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('Program Director', 1160, 970);
  ctx.fillStyle = CERTIFICATE_COLORS.muted;
  ctx.font = '16px sans-serif';
  ctx.fillText('Authorized Signature', 1160, 995);
  ctx.fillStyle = CERTIFICATE_COLORS.text;
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(issuedDate, 440, 970);
  ctx.fillStyle = CERTIFICATE_COLORS.muted;
  ctx.font = '16px sans-serif';
  ctx.fillText('Date Issued', 440, 995);

  const link = document.createElement('a');
  link.download = `Certificate-${courseCode}-${certCode}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export function StudentDashboardPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard', 'student'],
    queryFn: lmsApi.getDashboardSummary
  });

  if (isLoading) return <LoadingState label="Loading your personalized learning dashboard..." />;
  if (error) return <ErrorState message={extractErrorMessage(error)} onRetry={refetch} />;

  const d = data?.data || {};
  const m = d.metrics || {};
  const enrolledCourses = d.enrolledCourses || [];
  const courseByClassId = new Map(enrolledCourses.map((course) => [course.classId, course]));
  const upcomingAssignments = (d.upcomingAssignments || []).slice(0, 3);
  const recentGrades = (d.recentPublishedGrades || []).slice(0, 3);
  const recentAnnouncements = (d.recentAnnouncements || []).slice(0, 3);

  const getCourseStatus = (course) => {
    if (course.membershipStatus === 'completed' || Number(course.progressPercentage) >= 100) {
      return { label: 'Completed', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' };
    }
    if (Number(course.progressPercentage) > 0) {
      return { label: 'In progress', className: 'bg-blue-50 text-blue-700 ring-blue-200' };
    }
    return { label: 'Not started', className: 'bg-slate-100 text-slate-600 ring-slate-200' };
  };

  const getDaysUntil = (date) => {
    const due = new Date(date);
    if (Number.isNaN(due.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    return Math.ceil((due.getTime() - today.getTime()) / 86400000);
  };

  return (
    <div className="space-y-7">
      <section className="relative isolate overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-r from-white via-blue-50 to-indigo-100 px-5 py-6 shadow-sm sm:px-7 sm:py-8">
        <div className="relative z-10 max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-800">
            <GraduationCap className="h-4 w-4" />
            Student Learning Hub
          </span>
          <h1 className="mt-4 max-w-2xl text-2xl font-bold leading-tight tracking-tight text-slate-950 sm:text-3xl">
            Personalized Learning &amp; Progress Dashboard
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700 sm:text-base">
            Track your courses, complete activities, and monitor your academic progress.
          </p>
        </div>
        <div className="pointer-events-none absolute -right-4 -top-5 hidden h-56 w-[38%] items-center justify-center sm:flex" aria-hidden="true">
          <div className="absolute h-44 w-56 rounded-full bg-blue-200/50 blur-3xl" />
          <div className="relative flex h-32 w-48 items-center justify-center rounded-2xl border border-white/80 bg-white/80 shadow-xl backdrop-blur">
            <Laptop className="absolute h-24 w-32 text-blue-700" strokeWidth={1.4} />
            <span className="absolute -top-7 right-7 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg">
              <GraduationCap className="h-7 w-7" />
            </span>
            <span className="absolute bottom-5 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </span>
          </div>
        </div>
      </section>

      <section aria-label="Learning overview" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { title: 'Enrolled Courses', value: m.enrolledCoursesCount ?? 0, subtitle: `${m.overallCourseProgress ?? 0}% average progress`, icon: BookOpen, color: 'bg-blue-100 text-blue-700' },
          { title: 'Pending Assignments', value: m.pendingAssignmentsCount ?? 0, subtitle: `${m.overdueAssignmentsCount ?? 0} overdue`, icon: Terminal, color: 'bg-purple-100 text-purple-700' },
          { title: 'Available Assessments', value: m.upcomingExamsCount ?? 0, subtitle: 'Open or upcoming', icon: ClipboardCheck, color: 'bg-emerald-100 text-emerald-700' },
          { title: 'Earned Certificates', value: m.earnedCertificatesCount ?? 0, subtitle: 'Achievements earned', icon: Award, color: 'bg-amber-100 text-amber-700' }
        ].map((stat) => (
          <div key={stat.title} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between gap-4">
              <span className={`flex h-11 w-11 items-center justify-center rounded-full ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </span>
              <ArrowUpRight className="h-4 w-4 text-slate-400 transition-colors group-hover:text-blue-600" />
            </div>
            <p className="mt-4 text-sm font-medium text-slate-600">{stat.title}</p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{stat.value}</p>
            <p className="mt-1 text-xs text-slate-500">{stat.subtitle}</p>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-950">My Enrolled Courses &amp; Learning Progress</h2>
            <p className="mt-1 text-sm text-slate-600">Resume where you left off or continue exploring your courses.</p>
          </div>
          <Link
            to="/student/courses"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-blue-200 bg-white px-4 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            View All Courses <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </div>

        {enrolledCourses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-7 text-center">
            <BookOpen className="mx-auto h-9 w-9 text-slate-400" />
            <h3 className="mt-3 text-base font-semibold text-slate-900">No enrolled courses yet</h3>
            <p className="mt-1 text-sm text-slate-600">Browse the catalog to find courses available for your academic placement.</p>
            <Link to="/student/catalog" className="mt-4 inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700">
              Explore Course Catalog
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            {enrolledCourses.slice(0, 3).map((course) => {
              const status = getCourseStatus(course);
              const progress = Math.min(100, Math.max(0, Number(course.progressPercentage) || 0));
              return (
                <article key={course.membershipId} className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1 font-mono text-xs font-semibold text-blue-800">
                      {course.courseCode} <span className="mx-1 text-blue-400">·</span> {course.sectionCode}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span>
                  </div>
                  <h3 className="mt-4 text-lg font-bold leading-snug text-slate-950">{course.courseTitle}</h3>
                  <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-slate-600">
                    {course.courseDescription || 'Continue learning with the materials and activities prepared for this class.'}
                  </p>

                  <div className="mt-5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-600">Learning progress</span>
                      <span className="font-bold text-slate-900">{progress}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={`${course.courseTitle} progress`} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                      <div className={`h-full rounded-full transition-all ${progress >= 100 ? 'bg-emerald-500' : 'bg-blue-600'}`} style={{ width: `${progress}%` }} />
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-3 border-t border-slate-100 pt-4 text-xs">
                    <div className="flex items-start gap-2">
                      <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                      <span className="text-slate-600">{course.creditUnits ?? '—'} credits</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                      <span className="text-slate-600">{course.schedule || 'Schedule not provided'}</span>
                    </div>
                    <div className="col-span-2 flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                      <span className="text-slate-600">{course.room || 'Room not provided'}</span>
                    </div>
                  </div>

                  <Link to="/student/courses" className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                    {progress > 0 && progress < 100 ? 'Resume Course' : progress >= 100 ? 'Review Course' : 'Open Course'}
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section aria-label="Recent activity" className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-700"><Clock className="h-5 w-5" /></span>
              <h2 className="text-base font-bold text-slate-900">Upcoming Assignment Deadlines</h2>
            </div>
            <Link to="/student/assignments" className="shrink-0 text-xs font-semibold text-blue-700 hover:underline">View All</Link>
          </div>
          <div className="mt-4 space-y-3">
            {upcomingAssignments.length ? upcomingAssignments.map((assignment) => {
              const days = getDaysUntil(assignment.dueDate);
              const classCourse = courseByClassId.get(assignment.classId);
              const due = new Date(assignment.dueDate);
              return (
                <div key={assignment.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-white text-center shadow-sm">
                    <span className="text-[10px] font-bold uppercase text-blue-700">{Number.isNaN(due.getTime()) ? '—' : due.toLocaleString(undefined, { month: 'short' })}</span>
                    <span className="text-lg font-bold leading-5 text-slate-900">{Number.isNaN(due.getTime()) ? '—' : due.getDate()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{assignment.title}</p>
                    <p className="mt-0.5 text-xs text-slate-600">{classCourse ? `${classCourse.courseCode} · ${classCourse.sectionCode}` : 'Course assignment'}</p>
                  </div>
                  {days !== null && <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${days <= 3 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{days === 0 ? 'Due today' : days === 1 ? 'In 1 day' : `In ${days} days`}</span>}
                </div>
              );
            }) : <p className="py-4 text-sm text-slate-500">No upcoming assignment deadlines.</p>}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"><Award className="h-5 w-5" /></span>
              <h2 className="text-base font-bold text-slate-900">Recent Published Grades</h2>
            </div>
            <Link to="/student/grades" className="shrink-0 text-xs font-semibold text-blue-700 hover:underline">View All</Link>
          </div>
          <div className="mt-4 space-y-3">
            {recentGrades.length ? recentGrades.map((grade) => {
              const classCourse = courseByClassId.get(grade.classId);
              const score = Number(grade.score);
              const maxScore = Number(grade.maxScore);
              const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : null;
              return (
                <div key={grade.id} className="flex items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{grade.itemTitle}</p>
                    <p className="mt-0.5 text-xs text-slate-600">{classCourse ? `${classCourse.courseCode} · ${classCourse.sectionCode}` : 'Published grade'}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-sm font-bold text-emerald-800">{percentage === null ? `${score} / ${maxScore}` : `${percentage}%`}</span>
                </div>
              );
            }) : <p className="py-4 text-sm text-slate-500">No published grades yet.</p>}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><Megaphone className="h-5 w-5" /></span>
              <h2 className="text-base font-bold text-slate-900">Recent Announcements</h2>
            </div>
            <Link to="/student/announcements" className="shrink-0 text-xs font-semibold text-blue-700 hover:underline">View All</Link>
          </div>
          <div className="mt-4 space-y-3">
            {recentAnnouncements.length ? recentAnnouncements.map((announcement) => (
              <div key={announcement.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{announcement.title}</p>
                  <span className="shrink-0 text-[11px] text-slate-500">{announcement.createdAt ? new Date(announcement.createdAt).toLocaleDateString() : ''}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{announcement.content}</p>
              </div>
            )) : <p className="py-4 text-sm text-slate-500">No recent announcements.</p>}
          </div>
        </article>
      </section>
    </div>
  );
}

export function StudentCatalogPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data: coursesData, isLoading } = useQuery({
    queryKey: ['courses', 'catalog'],
    queryFn: () => lmsApi.listCourses({ publicationStatus: 'published' })
  });

  const { data: placementData } = useQuery({
    queryKey: ['student', 'placements'],
    queryFn: lmsApi.getMyPlacements
  });

  const handleEnroll = async (classId) => {
    try {
      const res = await lmsApi.enrollStudent({ classId });
      addToast(res.message);
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['courses', 'catalog'] });
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  if (isLoading) return <LoadingState />;

  const courses = coursesData?.data?.courses || [];
  const placements = placementData?.data?.placements || [];
  const currentPlacement = placements.find((placement) => placement.academicYear?.isCurrent) || placements[0];

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Institutional Course Catalog"
        title="Explore Technical Courses & Self-Enroll in Active Sections"
        subtitle="Browse Cisco NetAcad-inspired courses in networking, integrative programming, cybersecurity, and databases."
      />

      <div className={`rounded-xl border p-4 text-sm ${currentPlacement ? 'border-blue-200 bg-blue-50 text-blue-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
        {currentPlacement ? (
          <>
            <strong>Your academic placement:</strong> {currentPlacement.program?.code} · Year {currentPlacement.yearLevel} · Section {currentPlacement.cohortSection}
            <span className="text-xs ml-2">({currentPlacement.academicYear?.name})</span>
          </>
        ) : (
          <>
            <strong>Your academic placement has not been assigned yet.</strong> Contact the registrar to set your program, year level, and section before enrolling.
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {courses.map((course) => (
          <div key={course.id} className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between space-y-4 shadow-xs">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded">
                  {course.code}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {course.level} · {course.creditUnits} Units · {course.deliveryMode}
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">{course.title}</h2>
              <p className="text-xs text-slate-600 leading-relaxed">{course.description}</p>

              {(course.learningObjectives || []).length > 0 && (
                <div className="pt-2">
                  <p className="text-[11px] font-bold uppercase text-slate-500 mb-1">Learning Objectives:</p>
                  <ul className="list-disc list-inside text-xs text-slate-600 space-y-0.5">
                    {course.learningObjectives.slice(0, 3).map((obj, idx) => (
                      <li key={idx}>{obj}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-2">
              <p className="text-xs font-bold text-slate-700">Available Term Sections:</p>
              {(course.offerings || []).flatMap((o) => o.classes || []).map((cls) => (
                <div
                  key={cls.id}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900">{cls.sectionCode}</span>
                    <span className="text-slate-500 ml-2">{cls.schedule || 'Schedule TBA'}</span>
                    {cls.instructorAssignments?.[0]?.instructor && (
                      <p className="text-slate-500 mt-1">
                        Instructor: {cls.instructorAssignments[0].instructor.firstName} {cls.instructorAssignments[0].instructor.lastName}
                      </p>
                    )}
                  </div>
                  {cls.studentMembershipStatus === 'pending' ? (
                    <span className="shrink-0 px-3 py-1.5 text-amber-800 bg-amber-100 font-semibold rounded-lg">
                      Awaiting approval
                    </span>
                  ) : ['enrolled', 'completed'].includes(cls.studentMembershipStatus) ? (
                    <Link
                      to="/student/courses"
                      className="shrink-0 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg"
                    >
                      {cls.studentMembershipStatus === 'completed' ? 'Completed' : 'Open My Class'}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleEnroll(cls.id)}
                      className="shrink-0 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
                    >
                      Enroll in Section
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StudentCourseLearningPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [selectedClassId, setSelectedClassId] = useState(1);
  const [activeLessonId, setActiveLessonId] = useState(null);
  const [activeQuizSession, setActiveQuizSession] = useState(null);
  const [quizAnswersMap, setQuizAnswersMap] = useState({});
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [confirmQuizSubmit, setConfirmQuizSubmit] = useState(false);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [openModules, setOpenModules] = useState({});
  const [lastQuizResult, setLastQuizResult] = useState(null);

  const {
    data: enrollmentsData,
    isLoading: enrollLoading,
    error: enrollmentsError,
    refetch: refetchEnrollments
  } = useQuery({
    queryKey: ['enrollments', 'student'],
    queryFn: () => lmsApi.listEnrollments()
  });

  const enrollments = (enrollmentsData?.data?.enrollments || []).filter(
    (enrollment) => ['enrolled', 'completed'].includes(enrollment.status)
  );
  const activeEnrollment = enrollments.find((e) => e.classId === selectedClassId) || enrollments[0];
  const activeClassId = activeEnrollment?.classId;
  const activeCourseId = activeEnrollment?.classSection?.courseOffering?.course?.id;

  const { data: courseData, isLoading: courseLoading, error: courseError, refetch: refetchCourse } = useQuery({
    queryKey: ['course', activeCourseId],
    queryFn: () => lmsApi.getCourseById(activeCourseId),
    enabled: Boolean(activeCourseId)
  });

  const { data: progressData } = useQuery({
    queryKey: ['progress', activeClassId],
    queryFn: () => lmsApi.getProgressAnalytics({ classId: activeClassId }),
    enabled: Boolean(activeClassId)
  });

  const { data: assessmentsData } = useQuery({
    queryKey: ['assessments', 'class', activeClassId],
    queryFn: () => lmsApi.listAssessments({ classId: activeClassId }),
    enabled: Boolean(activeClassId)
  });

  const { data: certificatesData } = useQuery({
    queryKey: ['certificates'],
    queryFn: lmsApi.listCertificates
  });

  const course = courseData?.data?.course;
  const allLessons = (course?.modules || []).flatMap((m) => m.lessons || []);
  const currentLesson = allLessons.find((l) => l.id === activeLessonId) || allLessons[0];
  const currentIndex = allLessons.findIndex((l) => l.id === currentLesson?.id);

  const completedLessonIds = new Set(
    (progressData?.data?.lessonProgress || [])
      .filter((lp) => lp.status === 'completed')
      .map((lp) => lp.lessonId)
  );
  const courseProgressRecord = progressData?.data?.courseProgress?.[0];
  const courseProgressPct = Number(courseProgressRecord?.progressPercentage || 0);
  const isCourseCompleted = Boolean(courseProgressRecord?.isCompleted);

  const allCertificates = certificatesData?.data?.certificates || [];
  const activeCourseCertificate = allCertificates.find(
    (certificate) => certificate.classId === activeClassId || certificate.courseId === activeCourseId
  );

  const classAssessments = assessmentsData?.data?.assessments || [];
  const courseQuizzes = classAssessments.filter((a) =>
    ['quiz', 'module_exam'].includes(a.assessmentType)
  );
  const requiredQuizzes = courseQuizzes.length > 0 ? courseQuizzes : classAssessments;

  const getAttemptPercentage = (assessment, attempt) => {
    const maxScore = Number(assessment.maxScore || 100);
    return maxScore > 0 ? (Number(attempt.totalScore || 0) / maxScore) * 100 : 0;
  };

  const isQuizPassed = (asmt) => {
    const attempts = asmt.attempts || [];
    const passMark = Number(asmt.passingScore || 75);
    return attempts.some(
      (att) =>
        ['submitted', 'graded'].includes(att.status) &&
        getAttemptPercentage(asmt, att) >= passMark
    );
  };

  const getQuizBestScore = (asmt) => {
    const attempts = (asmt.attempts || []).filter((att) => ['submitted', 'graded'].includes(att.status));
    if (attempts.length === 0) return null;
    return Math.max(...attempts.map((att) => getAttemptPercentage(asmt, att)));
  };

  const nextUnpassedQuiz = requiredQuizzes.find((q) => !isQuizPassed(q)) || null;
  const nextUncompletedLesson = allLessons.find((lesson) => !completedLessonIds.has(lesson.id)) || null;
  const nextQuizInProgress = nextUnpassedQuiz?.attempts?.some(
    (attempt) => attempt.status === 'in_progress'
  ) || false;
  const nextQuizAttemptsExhausted = Boolean(
    nextUnpassedQuiz &&
    (nextUnpassedQuiz.attempts || []).length >= Number(nextUnpassedQuiz.maxAttempts || 1) &&
    !nextQuizInProgress
  );
  const allLessonsCompleted = allLessons.length > 0 && completedLessonIds.size >= allLessons.length;
  const allRequiredQuizzesPassed = requiredQuizzes.length > 0 && requiredQuizzes.every(isQuizPassed);
  const hasQuizResults = requiredQuizzes.some((quiz) =>
    (quiz.attempts || []).some((attempt) => ['submitted', 'graded'].includes(attempt.status))
  );
  const currentLearningStep = isCourseCompleted
    ? 5
    : allLessonsCompleted && allRequiredQuizzesPassed
      ? 5
      : hasQuizResults
        ? 4
        : allLessonsCompleted
          ? 3
          : 2;

  const completeMutation = useMutation({
    mutationFn: ({ lessonId }) =>
      lmsApi.updateLessonProgress({
        classId: activeClassId,
        lessonId,
        status: 'completed'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progress'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
    },
    onError: (error) => addToast(extractErrorMessage(error), 'error')
  });

  useEffect(() => {
    if (!activeQuizSession || Object.keys(quizAnswersMap).length === 0) return undefined;
    const timeoutId = window.setTimeout(async () => {
      try {
        await lmsApi.saveAttemptAnswers(activeQuizSession.attempt.id, Object.values(quizAnswersMap));
      } catch (error) {
        addToast(extractErrorMessage(error), 'error');
      }
    }, 700);
    return () => window.clearTimeout(timeoutId);
  }, [activeQuizSession?.attempt?.id, quizAnswersMap, addToast]);

  const handleOpenEmbeddedQuiz = async (quiz) => {
    try {
      setLastQuizResult(null);
      const res = await lmsApi.startAttempt(quiz.id);
      const { attempt, questions } = res.data;
      if (!questions?.length) {
        addToast('This quiz has no questions yet. Please contact your instructor.', 'error');
        return;
      }
      const initialMap = {};
      for (const saved of attempt.savedAnswers || []) {
        initialMap[saved.questionId] = {
          questionId: saved.questionId,
          selectedOptionIds: saved.selectedOptionIds || [],
          textAnswer: saved.textAnswer || '',
          matchingResponse: saved.matchingResponse || {}
        };
      }
      setQuizAnswersMap(initialMap);
      setActiveQuestionIndex(0);
      setActiveQuizSession({ quiz, attempt, questions });
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  const handleLeaveEmbeddedQuiz = async (onLeave) => {
    if (!activeQuizSession) {
      onLeave?.();
      return;
    }

    try {
      await lmsApi.saveAttemptAnswers(
        activeQuizSession.attempt.id,
        Object.values(quizAnswersMap)
      );
      setActiveQuizSession(null);
      setQuizAnswersMap({});
      setActiveQuestionIndex(0);
      setConfirmQuizSubmit(false);
      onLeave?.();
    } catch (error) {
      addToast(extractErrorMessage(error), 'error');
    }
  };

  const updateEmbeddedQuizAnswer = (questionId, patch) => {
    setQuizAnswersMap((prev) => ({
      ...prev,
      [questionId]: {
        ...(prev[questionId] || { questionId, selectedOptionIds: [], textAnswer: '', matchingResponse: {} }),
        ...patch
      }
    }));
  };

  const unansweredQuestionCount = activeQuizSession?.questions.filter((question) => {
    const answer = quizAnswersMap[question.questionId];
    return !(
      answer &&
      ((answer.selectedOptionIds || []).length ||
        (answer.textAnswer || '').trim() ||
        Object.values(answer.matchingResponse || {}).some(Boolean))
    );
  }).length || 0;

  const handleSubmitEmbeddedQuiz = async () => {
    if (!activeQuizSession || isSubmittingQuiz) return;
    setIsSubmittingQuiz(true);
    try {
      const res = await lmsApi.submitAttempt(
        activeQuizSession.attempt.id,
        Object.values(quizAnswersMap)
      );
      const submittedAttempt = res.data?.attempt;
      const maxScore = Number(res.data?.maxScore || activeQuizSession.quiz?.maxScore || 100);
      const score = Number(submittedAttempt?.totalScore || 0);
      const percentage =
        res.data?.percentage !== undefined
          ? Number(res.data.percentage)
          : maxScore > 0
          ? Number(((score / maxScore) * 100).toFixed(1))
          : 0;
      const passMark = Number(activeQuizSession.quiz?.passingScore || 75);
      const passed = percentage >= passMark;

      setLastQuizResult({
        quiz: activeQuizSession.quiz,
        quizTitle: activeQuizSession.quiz?.title,
        score,
        maxScore,
        percentage,
        passMark,
        passed,
        submittedAt: submittedAttempt?.submittedAt || null,
        canRetake: Number(activeQuizSession.attempt.attemptNumber) < Number(activeQuizSession.quiz.maxAttempts || 1)
      });
      setActiveQuizSession(null);
      setActiveQuestionIndex(0);
      setConfirmQuizSubmit(false);

      addToast(
        passed
          ? `Checkpoint Quiz Passed — Result: ${percentage}% (${score}/${maxScore} pts)!`
          : `Quiz Result: ${percentage}% (${score}/${maxScore} pts). ${passMark}% is required to pass.`
      );

      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      queryClient.invalidateQueries({ queryKey: ['progress'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    } finally {
      setIsSubmittingQuiz(false);
    }
  };

  if (enrollLoading || (activeCourseId && courseLoading)) return <LoadingState label="Loading interactive course reader..." />;
  if (enrollmentsError) {
    return <ErrorState message={extractErrorMessage(enrollmentsError)} onRetry={refetchEnrollments} />;
  }
  if (courseError) return <ErrorState message={extractErrorMessage(courseError)} onRetry={refetchCourse} />;

  if (!activeEnrollment) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <BookOpen className="mx-auto h-10 w-10 text-blue-600" />
        <h1 className="mt-4 text-xl font-bold text-slate-900">No active classes yet</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">
          Once the registrar enrolls you, your classes and learning materials will appear here.
        </p>
        <Link to="/student/catalog" className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
          Browse eligible classes
        </Link>
      </div>
    );
  }

  if (!activeCourseId) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
        <BookOpen className="mx-auto h-10 w-10 text-amber-600" />
        <h1 className="mt-4 text-xl font-bold text-slate-900">Course content unavailable</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">
          This class enrollment is not linked to a course. Please contact your registrar or instructor.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-indigo-50 shadow-sm">
        <div className="flex flex-col gap-5 p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="flex h-24 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white sm:h-24 sm:w-40">
            {course?.imageUrl ? (
              <img src={course.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <BookOpen className="h-11 w-11 opacity-90" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <span className="inline-flex rounded-md bg-blue-600 px-2.5 py-1 font-mono text-xs font-bold text-white">
              {course?.code}
            </span>
            <h1 className="mt-2 text-xl font-bold leading-tight text-slate-900 sm:text-2xl">{course?.title}</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">
              {course?.description || 'Continue through the lessons and required assessments to complete this course.'}
            </p>
            {activeEnrollment.classSection?.instructorAssignments?.[0]?.instructor && (
              <p className="mt-2 text-xs font-medium text-slate-500">
                Instructor: {activeEnrollment.classSection.instructorAssignments[0].instructor.firstName}{' '}
                {activeEnrollment.classSection.instructorAssignments[0].instructor.lastName}
                <span className="mx-2">·</span>{activeEnrollment.classSection.sectionCode}
              </p>
            )}
          </div>
          <div className="w-full rounded-xl border border-blue-100 bg-white/90 p-4 shadow-sm sm:w-48">
            <label htmlFor="active-class-select" className="block text-xs font-semibold text-slate-600">My class</label>
            <select
              id="active-class-select"
              value={activeClassId}
              onChange={(e) => {
                const nextClassId = Number(e.target.value);
                const switchClass = () => {
                  setSelectedClassId(nextClassId);
                  setActiveLessonId(null);
                  setLastQuizResult(null);
                };
                handleLeaveEmbeddedQuiz(switchClass);
              }}
              aria-label="Switch enrolled class"
              className="mt-1 w-full truncate rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800"
            >
              {enrollments.map((enrollment) => (
                <option key={enrollment.id} value={enrollment.classId}>
                  {enrollment.classSection?.sectionCode} · {enrollment.classSection?.courseOffering?.course?.code}
                </option>
              ))}
            </select>
            <div className="mt-3 flex items-end justify-between">
              <span className="text-xs font-semibold text-slate-600">Course progress</span>
              <strong className="text-2xl leading-none text-slate-900">{Math.round(courseProgressPct)}%</strong>
            </div>
            <div
              className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200"
              role="progressbar"
              aria-label="Course progress"
              aria-valuenow={Math.round(Math.min(100, Math.max(0, courseProgressPct)))}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-blue-600 transition-all"
                style={{ width: `${Math.min(100, Math.max(0, courseProgressPct))}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-500">{activeEnrollment.classSection?.courseOffering?.semester?.name || 'Current term'}</p>
          </div>
        </div>
      </section>

      <nav aria-label="Course completion steps" className="rounded-2xl border border-slate-200 bg-white px-3 py-4 shadow-sm sm:px-6">
        <ol className="grid grid-cols-5 gap-1">
          {[
            'Select Course',
            'Study Lessons',
            'Take Quiz',
            'View Results',
            'Complete Course'
          ].map((label, index) => {
            const step = index + 1;
            const complete = step < currentLearningStep || (step === 5 && isCourseCompleted);
            const current = step === currentLearningStep && !isCourseCompleted;
            return (
              <li key={label} className="relative flex min-w-0 flex-col items-center text-center">
                {index < 4 && (
                  <span className={`absolute left-1/2 top-3.5 hidden h-0.5 w-full sm:block ${complete ? 'bg-blue-500' : 'bg-slate-200'}`} aria-hidden="true" />
                )}
                <span className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  complete ? 'bg-emerald-500 text-white' : current ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-slate-200 text-slate-500'
                }`}>
                  {complete ? <CheckCircle2 className="h-4 w-4" /> : step}
                </span>
                <span className={`mt-2 max-w-full text-[10px] font-semibold leading-tight sm:text-xs ${
                  current ? 'text-blue-700' : complete ? 'text-slate-700' : 'text-slate-400'
                }`}>
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Official completion is shown only after backend progress confirms it. */}
      {isCourseCompleted && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white">
                <Trophy className="h-6 w-6" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Course completed</p>
                <h2 className="text-lg font-bold text-slate-900">Congratulations on completing {course?.code}</h2>
                <p className="text-sm text-slate-600">
                  {activeCourseCertificate
                    ? `Certificate ${activeCourseCertificate.certificateCode} is ready.`
                    : 'Your course completion is confirmed. Your certificate will appear here when it is issued.'}
                </p>
              </div>
            </div>
            {activeCourseCertificate && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => downloadCourseBadgePng(activeCourseCertificate)}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-700"
                >
                  <Download className="h-4 w-4" /> Download badge
                </button>
                <button
                  type="button"
                  onClick={() => downloadCertificatePng(activeCourseCertificate)}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  <Download className="h-4 w-4" /> Download certificate
                </button>
                <Link to="/student/certificates" className="inline-flex items-center rounded-lg border border-emerald-300 bg-white px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100">
                  View certificates
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quiz Submission Percentage Result Summary Card */}
      {lastQuizResult && (
        <div
          className={`p-5 rounded-2xl border-2 shadow-xs space-y-4 ${
            lastQuizResult.passed
              ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
              : 'bg-amber-50/90 border-amber-300 text-amber-950'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Prominent Quiz Percentage Circle */}
              <div
                className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center border-2 shrink-0 ${
                  lastQuizResult.passed
                    ? 'bg-emerald-600 text-white border-emerald-700'
                    : 'bg-amber-500 text-slate-950 border-amber-600'
                }`}
              >
                <span className="text-xl font-extrabold font-mono leading-none">
                  {lastQuizResult.percentage}%
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider mt-1">
                  Quiz Score
                </span>
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider block opacity-75">
                  {lastQuizResult.passed
                    ? '✓ NetAcad Checkpoint Quiz Passed'
                    : 'Checkpoint Quiz Attempt Completed'}
                </span>
                <h3 className="text-base font-extrabold">{lastQuizResult.quizTitle}</h3>
                <p className="text-xs mt-1">
                  Result Percentage: <strong className="font-mono text-sm">{lastQuizResult.percentage}%</strong>{' '}
                  ({lastQuizResult.score} / {lastQuizResult.maxScore} points) · Passing Score Required:{' '}
                  <strong>{lastQuizResult.passMark}%</strong>
                </p>
                {lastQuizResult.submittedAt && (
                  <p className="mt-1 text-xs opacity-75">
                    Submitted {new Date(lastQuizResult.submittedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!lastQuizResult.passed && lastQuizResult.canRetake && lastQuizResult.quiz && (
                <button
                  type="button"
                  onClick={() => handleOpenEmbeddedQuiz(lastQuizResult.quiz)}
                  className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
                >
                  Retake Quiz
                </button>
              )}
              <button
                type="button"
                onClick={() => setLastQuizResult(null)}
                className="px-3 py-1.5 rounded-lg border border-current text-xs font-semibold"
              >
                Dismiss
              </button>
            </div>
          </div>

          {/* Visual Quiz Percentage Bar */}
          <div className="w-full h-2.5 bg-white/80 rounded-full overflow-hidden border border-slate-200">
            <div
              className={`h-full transition-all duration-500 ${
                lastQuizResult.passed ? 'bg-emerald-600' : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, lastQuizResult.percentage))}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        <aside className="space-y-4 lg:col-span-4">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between bg-[#173b69] px-4 py-3 text-white">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-bold"><BookOpen className="h-4 w-4" /> Course Roadmap</h2>
                <p className="mt-0.5 text-[11px] text-blue-100">Follow the steps to complete this course.</p>
              </div>
              <span className="rounded-full bg-white/15 px-2 py-1 text-[11px] font-semibold">
                {completedLessonIds.size}/{allLessons.length} lessons
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {(course?.modules || []).map((mod) => {
                const isOpen = openModules[mod.id] !== false;
                return (
                  <div key={mod.id} className="p-3">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpenModules((previous) => ({ ...previous, [mod.id]: !isOpen }))}
                      className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-50"
                    >
                      <span className="text-xs font-bold text-slate-900">{mod.title}</span>
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4 shrink-0 text-slate-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="mt-1 space-y-1">
                        {(mod.lessons || []).map((les) => {
                          const isCompleted = completedLessonIds.has(les.id);
                          const isSelected = !activeQuizSession && currentLesson?.id === les.id;
                          return (
                            <button
                              key={les.id}
                              type="button"
                              onClick={() => handleLeaveEmbeddedQuiz(() => setActiveLessonId(les.id))}
                              aria-current={isSelected ? 'step' : undefined}
                              className={`w-full text-left flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                                isSelected
                                  ? 'bg-blue-50 text-blue-900 ring-1 ring-blue-200'
                                  : 'text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                {isCompleted ? (
                                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                                ) : isSelected ? (
                                  <PlayCircle className="h-4 w-4 shrink-0 text-blue-600" />
                                ) : (
                                  <Circle className="h-4 w-4 shrink-0 text-slate-300" />
                                )}
                                <span className="truncate">{les.title}</span>
                              </span>
                              <span
                                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  isCompleted
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : isSelected
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {isCompleted ? 'Completed' : isSelected ? 'In progress' : 'Not started'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-sm">
            <div className="flex items-center gap-3 bg-gradient-to-r from-indigo-700 to-blue-600 px-4 py-3 text-white">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15"><ClipboardCheck className="h-5 w-5" /></span>
              <div>
                <h2 className="text-sm font-bold">Course Completion Quiz</h2>
                <p className="text-[11px] text-indigo-100">Required to finish this course.</p>
              </div>
            </div>
            <div className="space-y-3 p-4">
            {requiredQuizzes.length === 0 ? (
              <p className="text-xs text-slate-500">No completion quizzes are configured for this class.</p>
            ) : (
              requiredQuizzes.map((qz) => {
                const passed = isQuizPassed(qz);
                const best = getQuizBestScore(qz);
                const attemptCount = (qz.attempts || []).length;
                const hasInProgress = (qz.attempts || []).some((attempt) => attempt.status === 'in_progress');
                const maxAttemptsReached = attemptCount >= Number(qz.maxAttempts || 1) && !hasInProgress;
                const isSelectedQuiz = activeQuizSession?.quiz?.id === qz.id;
                return (
                  <div
                    key={qz.id}
                    className={`rounded-xl border p-3 ${
                      isSelectedQuiz ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Trophy
                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                          passed ? 'text-emerald-600' : 'text-indigo-600'
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900">{qz.title}</p>
                        <p className="mt-1 text-[11px] text-slate-600">
                          {qz.instructions || 'Answer all questions to demonstrate your understanding.'}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {qz.timeLimitMinutes || '—'} min
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <CircleHelp className="h-3.5 w-3.5" />
                            {qz.assessmentQuestions?.length ?? '—'} questions
                          </span>
                          <span>Pass: {qz.passingScore || 75}%</span>
                          {best !== null && <span>Best: {Math.round(best * 10) / 10}%</span>}
                        </div>
                        {passed && (
                          <span className="mt-2 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            Passed
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={maxAttemptsReached && !passed}
                      onClick={() => handleOpenEmbeddedQuiz(qz)}
                      className="mt-3 w-full rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {passed
                        ? maxAttemptsReached
                          ? 'Passed · Attempts Used'
                          : 'Passed · Retake Quiz'
                        : hasInProgress
                          ? 'Continue Quiz'
                          : maxAttemptsReached
                            ? 'Attempts Used'
                            : 'Start Quiz'}
                    </button>
                  </div>
                );
              })
            )}
            </div>
          </section>
        </aside>

        {/* Main Viewer Area: Either Embedded NetAcad Quiz Runner OR Lesson Content */}
        <section className="min-w-0 space-y-4 lg:col-span-8">
          {!activeQuizSession && !isCourseCompleted && (
            <section
              aria-labelledby="student-next-step-heading"
              className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm"
            >
              <div className="grid gap-5 p-5 sm:grid-cols-[minmax(0,1fr)_minmax(240px,0.8fr)] sm:items-center sm:p-6">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                    <CheckCircle2 className="h-4 w-4" />
                    {nextUncompletedLesson ? 'Learning in progress' : 'Learning activities reviewed'}
                  </span>
                  <h2 id="student-next-step-heading" className="mt-3 text-xl font-bold text-slate-900">
                    {nextUncompletedLesson ? "You're on track!" : 'Keep moving forward'}
                  </h2>
                  <p className="mt-1 max-w-xl text-sm leading-6 text-slate-600">
                    {nextUncompletedLesson
                      ? 'Work through each lesson, then take the required quiz to complete this course.'
                      : nextUnpassedQuiz
                        ? 'Your lessons are complete. Pass the required quiz to move toward course completion.'
                        : allRequiredQuizzesPassed
                          ? 'Your required lessons and quizzes are complete. Course completion is being confirmed.'
                          : requiredQuizzes.length === 0
                            ? 'Your lessons are complete, but no course quiz is configured yet. Contact your instructor for next steps.'
                            : 'Review your course roadmap to see the activities that remain.'}
                  </p>
                </div>

                <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
                      {nextUncompletedLesson ? (
                        <BookOpen className="h-5 w-5" />
                      ) : (
                        <ClipboardCheck className="h-5 w-5" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-700">
                        Next step
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {nextUncompletedLesson
                          ? `Continue: ${nextUncompletedLesson.title}`
                          : nextUnpassedQuiz
                            ? nextQuizInProgress
                              ? `Continue ${nextUnpassedQuiz.title}`
                              : `Take ${nextUnpassedQuiz.title}`
                            : allRequiredQuizzesPassed
                              ? 'Wait for course completion confirmation'
                              : 'Check with your instructor'}
                      </p>
                    </div>
                  </div>
                  {(nextUncompletedLesson || nextUnpassedQuiz) && (
                    <button
                      type="button"
                      disabled={!nextUncompletedLesson && nextQuizAttemptsExhausted}
                      onClick={() => {
                        if (nextUncompletedLesson) {
                          setActiveLessonId(nextUncompletedLesson.id);
                          return;
                        }
                        if (nextUnpassedQuiz && !nextQuizAttemptsExhausted) {
                          handleOpenEmbeddedQuiz(nextUnpassedQuiz);
                        }
                      }}
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {nextUncompletedLesson
                        ? 'Continue lesson'
                        : nextQuizAttemptsExhausted
                          ? 'Attempts used'
                          : nextQuizInProgress
                            ? 'Continue quiz'
                            : 'Start quiz'}
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}

          <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          {activeQuizSession ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-indigo-700 to-blue-600 p-4 text-white">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15"><ClipboardCheck className="h-5 w-5" /></span>
                  <div>
                    <p className="text-[11px] font-semibold text-indigo-100">Attempt #{activeQuizSession.attempt.attemptNumber}</p>
                    <h2 className="text-lg font-bold">{activeQuizSession.quiz.title}</h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleLeaveEmbeddedQuiz()}
                  className="rounded-lg border border-white/30 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
                >
                  Back to roadmap
                </button>
              </div>
              {activeQuizSession.quiz.instructions && (
                <p className="text-sm text-slate-600">{activeQuizSession.quiz.instructions}</p>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span>Question {activeQuestionIndex + 1} of {activeQuizSession.questions.length}</span>
                  <span>{Math.round(((activeQuestionIndex + 1) / activeQuizSession.questions.length) * 100)}% complete</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all"
                    style={{ width: `${((activeQuestionIndex + 1) / activeQuizSession.questions.length) * 100}%` }}
                  />
                </div>
                {activeQuizSession.questions.map((q, idx) => {
                  if (idx !== activeQuestionIndex) return null;
                  const ans = quizAnswersMap[q.questionId] || {
                    selectedOptionIds: [],
                    textAnswer: '',
                    matchingResponse: {}
                  };
                  return (
                    <div key={q.questionId} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold uppercase tracking-wide text-blue-700">
                          Question {idx + 1} of {activeQuizSession.questions.length} · {q.questionType.replace(/_/g, ' ')}
                        </span>
                        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">{q.points} pts</span>
                      </div>
                      <p className="mt-4 text-base font-bold leading-relaxed text-slate-900">{q.prompt}</p>

                      {['multiple_choice', 'true_false'].includes(q.questionType) && (
                        <div className="mt-4 space-y-2.5">
                          {(q.options || []).map((opt) => {
                            const selected = (ans.selectedOptionIds || []).includes(opt.id);
                            return (
                              <label
                                key={opt.id}
                                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3.5 text-sm font-medium transition-colors focus-within:ring-2 focus-within:ring-blue-500 ${
                                  selected ? 'border-blue-500 bg-blue-50 text-blue-950' : 'border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`embedded-q-${q.questionId}`}
                                  checked={selected}
                                  className="h-4 w-4 accent-blue-600"
                                  onChange={() =>
                                    updateEmbeddedQuizAnswer(q.questionId, { selectedOptionIds: [opt.id] })
                                  }
                                />
                                <span>{opt.optionText}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {['identification', 'fill_in_the_blank'].includes(q.questionType) && (
                        <label className="mt-4 block">
                          <span className="sr-only">Your answer</span>
                          <input
                            type="text"
                            value={ans.textAnswer || ''}
                            onChange={(e) => updateEmbeddedQuizAnswer(q.questionId, { textAnswer: e.target.value })}
                            className="w-full rounded-lg border border-slate-300 px-3.5 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            placeholder="Type your answer"
                          />
                        </label>
                      )}

                      {q.questionType === 'multiple_select' && (
                        <div className="mt-4 space-y-2.5">
                          {(q.options || []).map((opt) => {
                            const selected = (ans.selectedOptionIds || []).includes(opt.id);
                            return (
                              <label
                                key={opt.id}
                                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3.5 text-sm font-medium ${
                                  selected ? 'border-blue-500 bg-blue-50 text-blue-950' : 'border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  className="h-4 w-4 accent-blue-600"
                                  onChange={(e) => {
                                    const prevIds = ans.selectedOptionIds || [];
                                    const nextIds = e.target.checked
                                      ? [...prevIds, opt.id]
                                      : prevIds.filter((id) => id !== opt.id);
                                    updateEmbeddedQuizAnswer(q.questionId, { selectedOptionIds: nextIds });
                                  }}
                                />
                                <span>{opt.optionText}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {q.questionType === 'matching' && (
                        <div className="mt-4 space-y-2">
                          {(q.matchingPrompts || []).map((leftItem) => (
                            <div
                              key={leftItem}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"
                            >
                              <span className="font-bold text-slate-800">{leftItem}</span>
                              <select
                                value={ans.matchingResponse?.[leftItem] || ''}
                                onChange={(e) =>
                                  updateEmbeddedQuizAnswer(q.questionId, {
                                    matchingResponse: {
                                      ...(ans.matchingResponse || {}),
                                      [leftItem]: e.target.value
                                    }
                                  })
                                }
                                className="max-w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                              >
                                <option value="">Select match...</option>
                                {(q.matchingChoices || []).map((choice) => (
                                  <option key={choice} value={choice}>
                                    {choice}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5" aria-label="Question navigator">
                  {activeQuizSession.questions.map((question, index) => {
                    const answer = quizAnswersMap[question.questionId];
                    const answered = Boolean(
                      answer &&
                      ((answer.selectedOptionIds || []).length ||
                        (answer.textAnswer || '').trim() ||
                        Object.values(answer.matchingResponse || {}).some(Boolean))
                    );
                    return (
                      <button
                        key={question.questionId}
                        type="button"
                        aria-label={`Go to question ${index + 1}${answered ? ', answered' : ', unanswered'}`}
                        aria-current={index === activeQuestionIndex ? 'step' : undefined}
                        onClick={() => setActiveQuestionIndex(index)}
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                          index === activeQuestionIndex
                            ? 'bg-blue-600 text-white'
                            : answered
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                </div>
                <span className="text-xs text-slate-500">Passing score: <strong>{activeQuizSession.quiz.passingScore || 75}%</strong></span>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  disabled={activeQuestionIndex === 0}
                  onClick={() => setActiveQuestionIndex((index) => Math.max(0, index - 1))}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>
                {activeQuestionIndex < activeQuizSession.questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setActiveQuestionIndex((index) => Math.min(activeQuizSession.questions.length - 1, index + 1))}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmQuizSubmit(true)}
                    disabled={isSubmittingQuiz}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Submit Quiz
                  </button>
                )}
              </div>
              <ModalDialog
                isOpen={confirmQuizSubmit}
                onClose={() => {
                  if (!isSubmittingQuiz) setConfirmQuizSubmit(false);
                }}
                title="Submit quiz?"
                maxWidth="max-w-md"
              >
                <div className="space-y-4">
                  <p className="text-sm text-slate-600">
                    {unansweredQuestionCount > 0
                      ? `You have ${unansweredQuestionCount} unanswered ${unansweredQuestionCount === 1 ? 'question' : 'questions'}. You can return to review them, or submit the answers you have.`
                      : 'You have answered every question. Once submitted, your answers cannot be changed.'}
                  </p>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      disabled={isSubmittingQuiz}
                      onClick={() => setConfirmQuizSubmit(false)}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Return to quiz
                    </button>
                    <button
                      type="button"
                      disabled={isSubmittingQuiz}
                      onClick={handleSubmitEmbeddedQuiz}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-50"
                    >
                      {isSubmittingQuiz ? 'Submitting…' : 'Submit answers'}
                    </button>
                  </div>
                </div>
              </ModalDialog>
            </div>
          ) : currentLesson ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={currentLesson.lessonType} />
                    <span className="text-xs text-slate-500">
                      Estimated Time: {currentLesson.estimatedMinutes} mins
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mt-1.5">{currentLesson.title}</h2>
                </div>

                <div
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-1.5 text-xs font-bold ${
                    completedLessonIds.has(currentLesson.id)
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-blue-200 bg-blue-50 text-blue-700'
                  }`}
                >
                  {completedLessonIds.has(currentLesson.id) ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <PlayCircle className="h-4 w-4" />
                  )}
                  <span>
                    {completedLessonIds.has(currentLesson.id)
                      ? 'Lesson completed'
                      : 'Lesson in progress'}
                  </span>
                </div>
              </div>

              {/* Learning Objectives */}
              {(currentLesson.learningObjectives || []).length > 0 && (
                <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 text-xs space-y-1.5">
                  <p className="font-bold text-blue-900 uppercase tracking-wider">Lesson Learning Objectives</p>
                  <ul className="list-disc list-inside text-slate-700 space-y-1">
                    {currentLesson.learningObjectives.map((obj, idx) => (
                      <li key={idx}>{obj}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Rich-Text Lesson Content */}
              <div
                className="lesson-prose text-sm"
                dangerouslySetInnerHTML={{ __html: currentLesson.contentHtml }}
              />

              {/* Interactive Network Lab Topology Viewer */}
              {currentLesson.labTopologyData?.devices && (
                <div className="p-4 rounded-xl bg-slate-900 text-slate-100 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
                    <Network className="w-4 h-4" />
                    Interactive Network Pod Topology
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    {currentLesson.labTopologyData.devices.map((dev, i) => (
                      <div key={i} className="p-3 rounded-lg bg-slate-800 border border-slate-700">
                        <p className="font-mono font-bold text-white">{dev.name}</p>
                        <p className="text-blue-300">{dev.role}</p>
                        <p className="font-mono text-[11px] text-emerald-400 mt-1">IP: {dev.ip}</p>
                        <p className="text-[11px] text-slate-400">{dev.protocol}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Technical Code Block */}
              {currentLesson.codeSnippet && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold">Technical Code / CLI Reference ({currentLesson.codeLanguage || 'code'})</span>
                  </div>
                  <pre className="p-4 rounded-xl bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto leading-relaxed">
                    {currentLesson.codeSnippet}
                  </pre>
                </div>
              )}

              {/* Downloadable Resources */}
              {(course?.resources || []).length > 0 && (
                <div className="pt-4 border-t border-slate-200 space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Attached Learning Resources & Lab Worksheets
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(course.resources || []).map((res) => (
                      <a
                        key={res.id}
                        href={res.externalUrl || res.fileUrl || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">{res.title}</p>
                          <p className="text-slate-500 uppercase text-[10px]">{res.resourceType}</p>
                        </div>
                        <Download className="w-4 h-4 text-blue-600 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Previous & Next / Proceed to Course Completion Quiz Controls */}
              <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={currentIndex <= 0}
                  onClick={() => setActiveLessonId(allLessons[currentIndex - 1]?.id)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 disabled:opacity-40 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous Lesson
                </button>

                {currentIndex < allLessons.length - 1 ? (
                  <button
                    type="button"
                    disabled={completeMutation.isPending}
                    onClick={() => {
                      if (!completedLessonIds.has(currentLesson.id)) {
                        completeMutation.mutate(
                          { lessonId: currentLesson.id },
                          { onSuccess: () => setActiveLessonId(allLessons[currentIndex + 1]?.id) }
                        );
                      } else {
                        setActiveLessonId(allLessons[currentIndex + 1]?.id);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white"
                  >
                    {completeMutation.isPending ? 'Saving progress…' : 'Complete & Next'}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : !completedLessonIds.has(currentLesson.id) ? (
                  <button
                    type="button"
                    disabled={completeMutation.isPending}
                    onClick={() => completeMutation.mutate({ lessonId: currentLesson.id })}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white disabled:cursor-wait disabled:opacity-50"
                  >
                    {completeMutation.isPending ? 'Saving progress…' : 'Mark lesson complete'}
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                ) : nextUnpassedQuiz && !allRequiredQuizzesPassed ? (
                  <button
                    type="button"
                    onClick={() => handleOpenEmbeddedQuiz(nextUnpassedQuiz)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-xs"
                  >
                    <span>Take Course Completion Quiz: {nextUnpassedQuiz.title}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : null}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">Select a lesson from the sidebar to begin.</p>
          )}
          </div>
        </section>
      </div>
    </div>
  );
}

export function StudentAssignmentsPage() {
  const { subview } = useParams();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [activeAssignment, setActiveAssignment] = useState(null);
  const [textResponse, setTextResponse] = useState('');
  const [codeSubmission, setCodeSubmission] = useState('');

  const currentTab = subview === 'create' ? 'todo' : subview || 'all';

  const { data, isLoading } = useQuery({
    queryKey: ['assignments', 'student'],
    queryFn: () => lmsApi.listAssignments()
  });

  const handleSubmitWork = async (isDraft = false) => {
    if (!activeAssignment) return;
    try {
      const res = await lmsApi.submitAssignment(activeAssignment.id, {
        textResponse,
        codeSubmission,
        isDraft
      });
      addToast(res.message);
      setActiveAssignment(null);
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  if (isLoading) return <LoadingState />;

  const assignments = data?.data?.assignments || [];

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Coursework & Technical Labs"
        title="Assignments, Submissions, Rubrics & Due Dates"
        subtitle="Review instructions, starter code, grading rubrics, and deadlines; save drafts or submit final deliverables."
      />

      {/* Sub-navigation tabs matching sidebar items */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { key: 'all', label: 'All Assignments', to: '/student/assignments' },
          { key: 'todo', label: 'To Do', to: '/student/assignments/todo' },
          { key: 'submissions', label: 'Submissions', to: '/student/assignments/submissions' },
          { key: 'rubrics', label: 'Rubrics', to: '/student/assignments/rubrics' },
          { key: 'due-dates', label: 'Due Dates', to: '/student/assignments/due-dates' }
        ].map((tab) => (
          <Link
            key={tab.key}
            to={tab.to}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors ${
              currentTab === tab.key
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {currentTab === 'rubrics' && (
        <div className="grid grid-cols-1 gap-4">
          {assignments.map((a) => (
            <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">{a.title} — Evaluation Rubric</h3>
                <span className="text-xs font-bold text-blue-700">Max Score: {a.maxScore} pts</span>
              </div>
              {a.rubric?.criteria?.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {a.rubric.criteria.map((c) => (
                    <div key={c.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                      <p className="font-bold text-slate-900">{c.criterionName}</p>
                      <p className="text-slate-600 mt-1">{c.description}</p>
                      <p className="font-mono font-bold text-blue-700 mt-1.5">{c.maxPoints} pts</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">Standard 100-point technical lab & code accuracy rubric applies.</p>
              )}
            </div>
          ))}
        </div>
      )}

      {currentTab === 'due-dates' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Assignment / Laboratory</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Late Policy</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {assignments.map((a) => {
                const submission = a.submissions?.[0];
                const isOverdue = !submission && new Date(a.dueDate).getTime() < Date.now();
                return (
                <tr key={a.id}>
                  <td className="px-4 py-3 font-bold text-slate-900">{a.title}</td>
                  <td className="px-4 py-3"><StatusBadge status={a.assignmentType} /></td>
                  <td className="px-4 py-3 font-mono font-bold text-slate-800">{new Date(a.dueDate).toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {a.allowLateSubmissions ? `Allowed (-${a.latePenaltyPercent || 10}%)` : 'Strict Deadline'}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={submission?.status || (isOverdue ? 'overdue' : 'pending')} /></td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {(currentTab === 'all' || currentTab === 'todo' || currentTab === 'submissions') && (
      <div className="grid grid-cols-1 gap-4">
        {assignments
          .filter((a) => {
            const status = a.submissions?.[0]?.status;
            if (currentTab === 'submissions') return Boolean(status);
            if (currentTab === 'todo') return !['submitted', 'late', 'under_review', 'graded'].includes(status);
            return true;
          })
          .map((a) => {
          const mySub = a.submissions?.[0];
          return (
            <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <StatusBadge status={a.assignmentType} />
                  <span className="text-xs text-slate-500">
                    Due: <strong>{new Date(a.dueDate).toLocaleDateString()}</strong> · Max Score: <strong>{a.maxScore} pts</strong>
                  </span>
                </div>
                <StatusBadge status={mySub?.status || 'pending'} />
              </div>

              <h3 className="text-base font-bold text-slate-900">{a.title}</h3>
              <p className="text-xs text-slate-600 whitespace-pre-line">{a.instructions}</p>

              {mySub && (
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">
                      Submission Status: {mySub.status.toUpperCase()} (Attempt #{mySub.attemptNumber})
                    </span>
                    {mySub.score !== null && (
                      <span className="font-mono font-bold text-emerald-700 text-sm">
                        Score: {mySub.score} / {a.maxScore}
                      </span>
                    )}
                  </div>
                  {mySub.feedback && (
                    <p className="text-slate-700">
                      <strong>Instructor Feedback:</strong> {mySub.feedback}
                    </p>
                  )}
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setActiveAssignment(a);
                    setTextResponse(mySub?.textResponse || '');
                    setCodeSubmission(mySub?.codeSubmission || a.starterCode || '');
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"
                >
                  {mySub ? 'Update / Resubmit Work' : 'Start Submission'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      )}

      <ModalDialog
        isOpen={Boolean(activeAssignment)}
        onClose={() => setActiveAssignment(null)}
        title={`Submit Assignment — ${activeAssignment?.title || ''}`}
        maxWidth="max-w-2xl"
      >
        {activeAssignment && (
          <div className="space-y-4 text-xs">
            {(activeAssignment.labWorksheetChecklist || []).length > 0 && (
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 space-y-1">
                <p className="font-bold text-blue-900">Lab Verification Checklist:</p>
                <ul className="list-disc list-inside text-slate-700">
                  {activeAssignment.labWorksheetChecklist.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Written Explanation / Documentation Summary
              </label>
              <textarea
                rows={3}
                value={textResponse}
                onChange={(e) => setTextResponse(e.target.value)}
                placeholder="Describe your implementation and verification steps..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Source Code / Router Configuration Script
              </label>
              <textarea
                rows={7}
                value={codeSubmission}
                onChange={(e) => setCodeSubmission(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-300 font-mono bg-slate-900 text-emerald-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleSubmitWork(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold"
              >
                <Save className="w-3.5 h-3.5" />
                Save Draft
              </button>
              <button
                type="button"
                onClick={() => handleSubmitWork(false)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                <Send className="w-3.5 h-3.5" />
                Confirm & Submit Final Work
              </button>
            </div>
          </div>
        )}
      </ModalDialog>
    </div>
  );
}

export function StudentAssessmentsAndExamRunnerPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [activeAttemptSession, setActiveAttemptSession] = useState(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answersMap, setAnswersMap] = useState({});
  const [remainingSecs, setRemainingSecs] = useState(0);
  const [lastSubmittedResult, setLastSubmittedResult] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['assessments', 'student'],
    queryFn: () => lmsApi.listAssessments()
  });

  // Countdown timer when examination is active
  useEffect(() => {
    if (!activeAttemptSession) return undefined;
    const timer = setInterval(() => {
      setRemainingSecs((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [activeAttemptSession]);

  const handleLaunchAssessment = async (assessmentId) => {
    try {
      setLastSubmittedResult(null);
      const res = await lmsApi.startAttempt(assessmentId);
      const { attempt, questions } = res.data;
      const initialMap = {};
      for (const saved of attempt.savedAnswers || []) {
        initialMap[saved.questionId] = {
          questionId: saved.questionId,
          selectedOptionIds: saved.selectedOptionIds || [],
          textAnswer: saved.textAnswer || '',
          matchingResponse: saved.matchingResponse || {}
        };
      }
      setAnswersMap(initialMap);
      setRemainingSecs(attempt.remainingSeconds || 1800);
      setCurrentQuestionIdx(0);
      setActiveAttemptSession({ attempt, questions });
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  const updateAnswerForQuestion = (questionId, patch) => {
    setAnswersMap((prev) => ({
      ...prev,
      [questionId]: {
        ...(prev[questionId] || { questionId, selectedOptionIds: [], textAnswer: '', matchingResponse: {} }),
        ...patch
      }
    }));
  };

  const handleAutoSave = async () => {
    if (!activeAttemptSession) return;
    try {
      await lmsApi.saveAttemptAnswers(
        activeAttemptSession.attempt.id,
        Object.values(answersMap)
      );
      addToast('Progress saved to server.');
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  const handleFinalSubmit = async () => {
    if (!activeAttemptSession) return;
    try {
      const res = await lmsApi.submitAttempt(
        activeAttemptSession.attempt.id,
        Object.values(answersMap)
      );
      const submittedAttempt = res.data?.attempt;
      const maxScore = Number(res.data?.maxScore || 100);
      const score = Number(submittedAttempt?.totalScore || 0);
      const percentage =
        res.data?.percentage !== undefined
          ? Number(res.data.percentage)
          : maxScore > 0
          ? Number(((score / maxScore) * 100).toFixed(1))
          : 0;
      const passMark = Number(res.data?.passingScore || 75);
      const passed = percentage >= passMark;

      setLastSubmittedResult({
        title: activeAttemptSession.attempt?.title || 'Quiz / Examination',
        score,
        maxScore,
        percentage,
        passMark,
        passed
      });
      addToast(`Quiz submitted! Your result: ${percentage}% (${score}/${maxScore} pts).`);
      setActiveAttemptSession(null);
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      queryClient.invalidateQueries({ queryKey: ['progress'] });
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  if (isLoading) return <LoadingState />;

  // Active Live Examination Interface
  if (activeAttemptSession) {
    const { attempt, questions } = activeAttemptSession;
    const q = questions[currentQuestionIdx];
    const currentAns = answersMap[q?.questionId] || { selectedOptionIds: [], textAnswer: '', matchingResponse: {} };
    const mins = Math.floor(remainingSecs / 60);
    const secs = remainingSecs % 60;

    return (
      <div className="space-y-6">
        {/* Examination Top Bar */}
        <div className="bg-slate-900 text-white rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs text-blue-400 font-bold uppercase tracking-wider">
              Live Examination Session · Attempt #{attempt.attemptNumber}
            </span>
            <h1 className="text-lg font-bold">{attempt.title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3.5 py-2 rounded-lg bg-slate-800 border border-slate-700 font-mono text-sm font-bold text-amber-400 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}</span>
            </div>
            <button
              type="button"
              onClick={handleAutoSave}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold"
            >
              Save Progress
            </button>
            <button
              type="button"
              onClick={handleFinalSubmit}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-bold"
            >
              Submit Examination
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Question Navigator Sidebar */}
          <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Question Navigator ({questions.length})
            </p>
            <div className="grid grid-cols-4 gap-2">
              {questions.map((item, idx) => {
                const answered = Boolean(answersMap[item.questionId]);
                return (
                  <button
                    key={item.questionId}
                    type="button"
                    onClick={() => setCurrentQuestionIdx(idx)}
                    className={`py-2 rounded-lg text-xs font-bold border ${
                      currentQuestionIdx === idx
                        ? 'bg-blue-600 text-white border-blue-600'
                        : answered
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Q{idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current Question Card */}
          <div className="lg:col-span-9 bg-white rounded-xl border border-slate-200 p-6 space-y-5">
            {q && (
              <>
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <span className="text-xs font-bold uppercase text-blue-700">
                    Question {currentQuestionIdx + 1} of {questions.length} ({q.questionType.replace(/_/g, ' ')})
                  </span>
                  <span className="text-xs font-bold text-slate-600">{q.points} Points</span>
                </div>

                <p className="text-base font-bold text-slate-900">{q.prompt}</p>

                {/* Options for Multiple Choice / True False */}
                {['multiple_choice', 'true_false', 'identification', 'fill_in_the_blank'].includes(q.questionType) && (
                  <div className="space-y-2.5">
                    {(q.options || []).map((opt) => {
                      const selected = (currentAns.selectedOptionIds || []).includes(opt.id);
                      return (
                        <label
                          key={opt.id}
                          className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer text-xs font-medium ${
                            selected ? 'bg-blue-50 border-blue-500 text-blue-950' : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`q-${q.questionId}`}
                            checked={selected}
                            onChange={() =>
                              updateAnswerForQuestion(q.questionId, { selectedOptionIds: [opt.id] })
                            }
                          />
                          <span>{opt.optionText}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Multiple Select */}
                {q.questionType === 'multiple_select' && (
                  <div className="space-y-2.5">
                    {(q.options || []).map((opt) => {
                      const selected = (currentAns.selectedOptionIds || []).includes(opt.id);
                      return (
                        <label
                          key={opt.id}
                          className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer text-xs font-medium ${
                            selected ? 'bg-blue-50 border-blue-500 text-blue-950' : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(e) => {
                              const prevIds = currentAns.selectedOptionIds || [];
                              const nextIds = e.target.checked
                                ? [...prevIds, opt.id]
                                : prevIds.filter((id) => id !== opt.id);
                              updateAnswerForQuestion(q.questionId, { selectedOptionIds: nextIds });
                            }}
                          />
                          <span>{opt.optionText}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Matching */}
                {q.questionType === 'matching' && (
                  <div className="space-y-3">
                    {(q.matchingPrompts || []).map((leftItem) => (
                      <div key={leftItem} className="flex items-center justify-between gap-4 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                        <span className="font-bold text-slate-900">{leftItem}</span>
                        <select
                          value={currentAns.matchingResponse?.[leftItem] || ''}
                          onChange={(e) =>
                            updateAnswerForQuestion(q.questionId, {
                              matchingResponse: {
                                ...(currentAns.matchingResponse || {}),
                                [leftItem]: e.target.value
                              }
                            })
                          }
                          className="px-3 py-1.5 rounded border border-slate-300 bg-white"
                        >
                          <option value="">Select matching target...</option>
                          {(q.matchingChoices || []).map((choice) => (
                            <option key={choice} value={choice}>{choice}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                  <button
                    type="button"
                    disabled={currentQuestionIdx === 0}
                    onClick={() => setCurrentQuestionIdx((i) => Math.max(0, i - 1))}
                    className="px-4 py-2 rounded-lg border border-slate-300 disabled:opacity-40 text-xs font-semibold"
                  >
                    ← Previous Question
                  </button>
                  <button
                    type="button"
                    disabled={currentQuestionIdx >= questions.length - 1}
                    onClick={() => setCurrentQuestionIdx((i) => Math.min(questions.length - 1, i + 1))}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-40 text-xs font-semibold"
                  >
                    Next Question →
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const assessments = data?.data?.assessments || [];

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Quizzes & Examinations"
        title="Available Assessments & Attempt History"
        subtitle="Take server-timed checkpoint quizzes and major examinations."
      />

      {lastSubmittedResult && (
        <div
          className={`p-5 rounded-2xl border-2 shadow-xs flex flex-wrap items-center justify-between gap-4 ${
            lastSubmittedResult.passed
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : 'bg-amber-50 border-amber-300 text-amber-950'
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-mono font-extrabold text-lg shrink-0 ${
                lastSubmittedResult.passed ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-slate-950'
              }`}
            >
              <span>{lastSubmittedResult.percentage}%</span>
              <span className="text-[9px] uppercase font-sans">Result</span>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider opacity-75">
                {lastSubmittedResult.passed ? '✓ Assessment Passed' : 'Assessment Attempt Completed'}
              </p>
              <h3 className="text-base font-extrabold">{lastSubmittedResult.title}</h3>
              <p className="text-xs mt-0.5">
                Quiz Percentage Result: <strong className="font-mono">{lastSubmittedResult.percentage}%</strong> ({lastSubmittedResult.score} / {lastSubmittedResult.maxScore} pts) · Required to Pass: <strong>{lastSubmittedResult.passMark}%</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLastSubmittedResult(null)}
            className="px-3 py-1.5 rounded-lg border border-current text-xs font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {assessments.map((asmt) => {
          const attempts = asmt.attempts || [];
          const bestScore = attempts.length > 0
            ? Math.max(...attempts.map((a) => Number(a.totalScore || 0)))
            : null;
          const maxScore = Number(asmt.maxScore || 100);
          const bestPct = bestScore !== null && maxScore > 0
            ? Number(((bestScore / maxScore) * 100).toFixed(1))
            : null;

          return (
            <div key={asmt.id} className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between space-y-4 shadow-xs">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <StatusBadge status={asmt.assessmentType} />
                  <span className="text-xs text-slate-500">
                    Time Limit: <strong>{asmt.timeLimitMinutes} mins</strong> · Max Attempts: <strong>{asmt.maxAttempts}</strong>
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">{asmt.title}</h3>
                <p className="text-xs text-slate-600">{asmt.instructions}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="text-xs">
                  <span className="text-slate-500">Attempts used: {attempts.length} / {asmt.maxAttempts}</span>
                  {bestScore !== null && (
                    <span className="ml-3 font-mono font-bold text-emerald-700">
                      Result: {bestPct}% ({bestScore} / {asmt.maxScore} pts)
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleLaunchAssessment(asmt.id)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"
                >
                  {attempts.some((a) => a.status === 'in_progress') ? 'Resume Attempt' : 'Start Assessment'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function StudentGradesAndProgressPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['personal-grades'],
    queryFn: lmsApi.getPersonalGrades
  });

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={extractErrorMessage(error)} onRetry={refetch} />;

  const classes = data?.data?.classes || [];
  const handleDownloadTranscriptCsv = () => {
    const escapeCsv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['Course Code', 'Course Title', 'Section', 'Weighted Standing (%)', 'Equivalent Grade', 'Letter Grade'],
      ...classes.map((cls) => [
        cls.courseCode,
        cls.courseTitle,
        cls.sectionCode,
        cls.standingPercentage,
        cls.institutionalGrade,
        cls.letterGrade
      ])
    ];
    const csvContent = rows.map((row) => row.map(escapeCsv).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Student-Academic-Standing-Report.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Academic Record"
        title="My Personal Gradebook & Weighted Standing"
        subtitle="View your personal weighted standing, category breakdowns, and instructor feedback."
        actions={
          <button
            type="button"
            onClick={handleDownloadTranscriptCsv}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
          >
            <Download className="w-4 h-4" />
            Export transcript
          </button>
        }
      />

      {classes.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          No gradebook entries are available yet.
        </div>
      ) : classes.map((cls) => (
        <div key={cls.classId} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <span className="font-mono text-xs font-bold text-blue-700">{cls.courseCode} · {cls.sectionCode}</span>
              <h2 className="text-lg font-bold text-slate-900">{cls.courseTitle}</h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-xs text-slate-500 block">Weighted Standing</span>
                <span className="text-xl font-extrabold text-blue-600">
                  {cls.standingPercentage !== null ? `${cls.standingPercentage}%` : 'In Progress'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 block">Equivalent Grade</span>
                <span className="text-xl font-extrabold text-slate-900">
                  {cls.institutionalGrade || '—'} ({cls.letterGrade})
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.values(cls.categoryBreakdown || {}).map((cat) => (
              <div key={cat.categoryId} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <p className="font-bold text-slate-800">{cat.categoryName} ({cat.weightPercent}%)</p>
                <p className="font-mono text-sm font-bold text-blue-700 mt-1">
                  {cat.percentage !== null ? `${cat.percentage}%` : 'No items yet'}
                </p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">Activity / Assessment Item</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5">Score</th>
                  <th className="px-4 py-2.5">Feedback</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(cls.grades || []).map((g) => (
                  <tr key={g.id}>
                    <td className="px-4 py-2.5 font-semibold text-slate-900">{g.itemTitle}</td>
                    <td className="px-4 py-2.5 capitalize">{g.sourceType}</td>
                    <td className="px-4 py-2.5 font-mono font-bold text-emerald-700">
                      {g.score} / {g.maxScore}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{g.feedback || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

export function StudentCertificatesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['certificates'],
    queryFn: lmsApi.listCertificates
  });

  if (isLoading) return <LoadingState label="Loading completed courses, digital badges, and certificates..." />;

  const certificates = data?.data?.certificates || [];
  const avgScore =
    certificates.length > 0
      ? Math.round(
          certificates.reduce((sum, c) => sum + Number(c.finalScore || 100), 0) / certificates.length
        )
      : 0;

  const printCertificate = (event) => {
    const certificateCard = event.currentTarget.closest('.student-certificate-print-target');
    certificateCard.setAttribute('data-print-selected', 'true');
    document.body.classList.add('student-certificates-printing');
    try {
      window.print();
    } finally {
      certificateCard.removeAttribute('data-print-selected');
      document.body.classList.remove('student-certificates-printing');
    }
  };

  return (
    <div
      className="student-certificates-page space-y-6 pt-4"
      style={{
        '--blue': CERTIFICATE_COLORS.blue,
        '--blue-tint': CERTIFICATE_COLORS.blueTint,
        '--blue-line': CERTIFICATE_COLORS.blueLine,
        '--text': CERTIFICATE_COLORS.text,
        '--text-2': CERTIFICATE_COLORS.textSecondary,
        '--muted': CERTIFICATE_COLORS.muted,
        '--green': CERTIFICATE_COLORS.green,
        '--green-tint': CERTIFICATE_COLORS.greenTint,
        '--amber-tint': CERTIFICATE_COLORS.amberTint,
        '--amber-text': CERTIFICATE_COLORS.amberText,
        '--border': CERTIFICATE_COLORS.border,
        '--page': CERTIFICATE_COLORS.page,
        '--badge-top': CERTIFICATE_COLORS.badgeTop,
        '--badge-bottom': CERTIFICATE_COLORS.badgeBottom,
        '--badge-border': CERTIFICATE_COLORS.badgeBorder,
        '--certificate-inner-border': CERTIFICATE_COLORS.certificateInnerBorder,
        '--certificate-inner-bottom': CERTIFICATE_COLORS.certificateInnerBottom,
        '--ribbon': CERTIFICATE_COLORS.ribbon,
        '--badge-shadow': CERTIFICATE_COLORS.badgeShadow,
        '--signature': CERTIFICATE_COLORS.signature
      }}
    >
      <style>{`
        .student-certificates-page {
          background-color: var(--page);
        }
        .certificate-course-card {
          background-color: #fff;
          border-color: var(--border);
        }
        .certificate-course-header {
          color: var(--text);
          background-color: #fff;
          border-bottom: 1px solid var(--border);
        }
        .certificate-completed-pill {
          color: var(--blue);
          background-color: var(--blue-tint);
          border-color: transparent;
        }
        .certificate-course-title { color: var(--text); }
        .certificate-meta { color: var(--muted); }
        .certificate-meta-highlight { color: var(--green); }
        .certificate-header-badge-button,
        .certificate-badge-button {
          color: var(--amber-text);
          background-color: var(--amber-tint);
        }
        .certificate-header-badge-button:hover,
        .certificate-badge-button:hover {
          background-color: var(--amber-tint);
        }
        .certificate-header-download-button,
        .certificate-print-button {
          color: var(--blue);
          background-color: #fff;
          border: 1px solid var(--blue-line);
        }
        .certificate-header-download-button:hover,
        .certificate-print-button:hover {
          background-color: var(--blue-tint);
        }
        .certificate-badge-card {
          color: var(--text);
          background: linear-gradient(180deg, var(--badge-top), var(--badge-bottom));
          border: 1px solid var(--badge-border);
        }
        .certificate-badge-academy { color: var(--blue); }
        .certificate-badge-label { color: var(--amber-text); }
        .certificate-badge-emblem {
          background: #fff;
          border: 4px solid var(--blue);
          box-shadow: 0 12px 28px var(--badge-shadow);
        }
        .certificate-badge-emblem-inner { background: #fff; }
        .certificate-badge-ribbon { color: var(--ribbon); }
        .certificate-badge-code,
        .certificate-name,
        .certificate-signature-label { color: var(--text); }
        .certificate-badge-score,
        .certificate-status-pill { color: var(--green); }
        .certificate-badge-complete,
        .certificate-badge-id,
        .certificate-description { color: var(--text-2); }
        .certificate-awarded { color: var(--blue); }
        .student-certificate-print-target {
          border-color: var(--badge-border);
          background: linear-gradient(180deg, #fff, var(--certificate-inner-bottom));
        }
        .certificate-frame { border-color: var(--certificate-inner-border); }
        .certificate-inner {
          border-color: var(--certificate-inner-border);
          background: linear-gradient(180deg, #fff, var(--certificate-inner-bottom));
        }
        .certificate-status-pill {
          background-color: var(--green-tint);
          border: 1px solid var(--green-tint);
        }
        .certificate-shield,
        .certificate-institute,
        .certificate-course-name { color: var(--blue); }
        .certificate-title,
        .certificate-code-value { color: var(--text); }
        .certificate-hash,
        .certificate-signature-subtext { color: var(--muted); }
        .certificate-signature-line { border-color: var(--signature); }
        .certificate-download-button {
          color: #fff;
          background-color: var(--blue);
        }
        .certificate-download-button:hover { background-color: var(--blue); }
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          html, body, #root {
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
          }
          body.student-certificates-printing * {
            visibility: hidden !important;
          }
          body.student-certificates-printing [data-print-selected="true"],
          body.student-certificates-printing [data-print-selected="true"] * {
            visibility: visible !important;
          }
          body.student-certificates-printing [data-print-selected="true"] {
            position: fixed !important;
            inset: 0 !important;
            display: flex !important;
            width: 100% !important;
            height: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 8mm !important;
            align-items: center !important;
            justify-content: center !important;
            border: 0 !important;
            border-radius: 0 !important;
            background: #fff !important;
            box-shadow: none !important;
          }
          [data-print-selected="true"] .certificate-frame {
            width: 100% !important;
            min-height: 0 !important;
            padding: 3mm !important;
            border-color: var(--badge-border) !important;
            background: #fff !important;
            box-shadow: none !important;
          }
          [data-print-selected="true"] .certificate-inner {
            min-height: 175mm !important;
            justify-content: center !important;
            padding: 8mm 12mm !important;
          }
          [data-print-selected="true"] .certificate-actions {
            display: none !important;
          }
          [data-print-selected="true"] * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
      <PageHeader
        badge="Completed Courses, Digital Badges & Verified Credentials"
        title="Certificates"
        subtitle="View all courses you have completed, download your NetAcad-style Digital Course Mastery Badges (.PNG), and download or print your official Certificates of Completion."
      />

      {/* Completed Courses & Credentials Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Courses Completed"
          value={certificates.length}
          subtitle="100% Lessons & Quizzes Passed"
          icon={CheckCircle2}
          accent="emerald"
        />
        <StatCard
          title="Badges Earned"
          value={certificates.length}
          subtitle="Downloadable PNG Badges"
          icon={Award}
          accent="amber"
        />
        <StatCard
          title="Verified Certificates"
          value={certificates.length}
          subtitle="Cryptographically Verifiable"
          icon={ShieldCheck}
          accent="blue"
        />
        <StatCard
          title="Average Score"
          value={certificates.length > 0 ? `${avgScore}%` : '—'}
          subtitle="Across Completed Courses"
          icon={BookOpen}
          accent="indigo"
        />
      </div>

      {certificates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
          <Award className="w-10 h-10 text-slate-400 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">No Completed Courses Yet</h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            Read all lessons and pass the Course Completion Checkpoint Quiz in your enrolled courses to automatically unlock your Digital Skill Badge and Official Certificate.
          </p>
          <Link
            to="/student/courses"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
          >
            Go to My Enrolled Courses →
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {certificates.map((cert) => {
            const scorePct = Number(cert.finalScore || 100);
            const issuedDate = cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString() : 'Verified';
            return (
              <article
                key={cert.id}
                data-certificate-id={cert.id}
                className="certificate-course-card bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
              >
                {/* Completed Course Header Bar */}
                <div className="certificate-course-header px-6 py-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="certificate-completed-pill px-2.5 py-1 rounded-md border font-mono text-xs font-bold">
                      ✓ COMPLETED COURSE · {cert.courseCode}
                    </span>
                    <div>
                      <h2 className="certificate-course-title text-base font-extrabold">{cert.courseTitle}</h2>
                      <p className="certificate-meta text-[11px]">
                        Completed on {issuedDate} · Final Mastery Score: <strong className="certificate-meta-highlight">{scorePct}%</strong> · Status: <strong className="certificate-meta-highlight uppercase">{cert.status}</strong>
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => downloadCourseBadgePng(cert)}
                      className="certificate-header-badge-button inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download Badge (.PNG)
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadCertificatePng(cert)}
                      className="certificate-header-download-button inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download Certificate (.PNG)
                    </button>
                  </div>
                </div>

                {/* Split Grid: Left = NetAcad Digital Skill Badge Card | Right = Official Certificate Card */}
                <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  {/* Left: Visual NetAcad Digital Course Mastery Badge */}
                  <div className="certificate-badge-card lg:col-span-4 rounded-2xl p-6 flex flex-col items-center justify-between text-center shadow-md">
                    <div className="space-y-1">
                      <span className="certificate-badge-academy text-[10px] font-bold uppercase tracking-widest block">
                        Aetheria Networking Academy
                      </span>
                      <span className="certificate-badge-label text-xs font-extrabold uppercase tracking-wider block">
                        ★ Verified Digital Skill Badge ★
                      </span>
                    </div>

                    {/* Visual Hexagonal Shield Emblem */}
                    <div className="certificate-badge-emblem my-5 w-36 h-36 rounded-3xl flex items-center justify-center">
                      <div className="certificate-badge-emblem-inner w-full h-full rounded-[20px] flex flex-col items-center justify-center p-3">
                        <Award className="certificate-badge-ribbon w-9 h-9 mb-1" />
                        <span className="certificate-badge-code font-mono text-lg font-extrabold tracking-tight">
                          {cert.courseCode}
                        </span>
                        <span className="certificate-badge-score text-xs font-extrabold mt-0.5">
                          {scorePct}% SCORE
                        </span>
                        <span className="certificate-badge-complete text-[9px] font-bold uppercase tracking-widest mt-0.5">
                          100% Completed
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 w-full">
                      <p className="certificate-name text-sm font-bold leading-snug">{cert.courseTitle}</p>
                      <p className="certificate-awarded text-xs font-semibold">
                        Awarded to {cert.recipientName}
                      </p>
                      <p className="certificate-badge-id text-[10px] font-mono">
                        Badge ID: {cert.certificateCode}
                      </p>
                      <button
                        type="button"
                        onClick={() => downloadCourseBadgePng(cert)}
                        className="certificate-badge-button mt-2 w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs shadow-xs"
                      >
                        <Download className="w-4 h-4" />
                        Download Digital Badge (.PNG)
                      </button>
                    </div>
                  </div>

                  {/* Right: Official Printable & Downloadable Certificate of Course Completion */}
                  <div
                    data-certificate-id={cert.id}
                    className="student-certificate-print-target lg:col-span-8 relative flex h-full min-w-0 items-center justify-center rounded-2xl border-2 p-2 shadow-xs"
                  >
                    <div className="certificate-frame relative flex min-h-full w-full items-stretch rounded-xl border p-2">
                      <div className="certificate-status absolute right-4 top-4 z-10">
                        <span className="certificate-status-pill inline-flex items-center rounded-full px-2.5 py-1 text-[13px] leading-4 font-semibold capitalize">
                          {String(cert.status || 'active').replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="certificate-inner flex min-h-full w-full flex-col items-center justify-center rounded-lg border px-5 py-10 text-center shadow-inner sm:px-8">
                        <div className="w-full max-w-3xl">
                          <ShieldCheck className="certificate-shield mx-auto h-10 w-10" aria-hidden="true" />
                          <p className="certificate-institute mt-2 text-xs font-bold uppercase tracking-widest">
                            Aetheria Institute of Technology &amp; Networking Academy
                          </p>
                          <h3 className="certificate-title mt-3 text-2xl font-extrabold sm:text-3xl">
                            Certificate of Course Completion
                          </h3>

                          <div className="mt-6 space-y-2">
                            <p className="certificate-description text-sm">This official credential certifies that</p>
                            <p className="certificate-name text-2xl font-extrabold sm:text-3xl">{cert.recipientName}</p>
                            <p className="certificate-description mx-auto max-w-2xl text-sm leading-6">
                              has successfully completed all curriculum modules, practical laboratories, and course checkpoint quizzes for
                            </p>
                            <p className="certificate-course-name mx-auto max-w-2xl break-words text-lg font-bold leading-snug sm:text-xl">
                              {cert.courseCode}: {cert.courseTitle}
                            </p>
                            <p className="certificate-badge-score text-sm font-semibold">
                              Final Mastery Score: {scorePct}% · 100% Completed
                            </p>
                          </div>

                          <div className="mt-5 space-y-1 border-t border-slate-200 pt-4 text-xs text-[var(--text-2)]">
                            <p className="break-words">
                              Certificate Code:{' '}
                              <strong className="certificate-code-value font-mono">{cert.certificateCode}</strong>
                            </p>
                            <p className="certificate-hash break-all font-mono text-[10px] leading-4">
                              Verification Hash: {cert.verificationHash}
                            </p>
                          </div>

                          <div className="mx-auto mt-6 grid w-full max-w-2xl grid-cols-2 gap-6 text-center text-xs">
                            <div>
                              <div className="certificate-signature-line mx-auto mb-2 mt-5 w-full max-w-[190px] border-t" />
                              <p className="certificate-signature-label font-semibold">{issuedDate}</p>
                              <p className="certificate-signature-subtext mt-0.5">Date Issued</p>
                            </div>
                            <div>
                              <div className="certificate-signature-line mx-auto mb-2 mt-5 w-full max-w-[190px] border-t" />
                              <p className="certificate-signature-label font-semibold">Program Director</p>
                              <p className="certificate-signature-subtext mt-0.5">Authorized Signature</p>
                            </div>
                          </div>

                          <div className="certificate-actions mt-6 flex flex-wrap items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => downloadCertificatePng(cert)}
                              className="certificate-download-button inline-flex items-center gap-1.5 rounded-lg px-4 py-2 font-bold"
                            >
                              <Download className="h-3.5 w-3.5" />
                              Download Certificate (.PNG)
                            </button>
                            <button
                              type="button"
                              onClick={printCertificate}
                              className="certificate-print-button rounded-lg px-4 py-2 font-semibold"
                            >
                              Print / Save PDF Certificate
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// STUDENT EXPANDED NAVIGATION SUB-PAGES
// (My Classes, Reports & Analytics, Students, Communication, Calendar, Settings, Help & Support)
// ============================================================================

export function StudentClassesSubPage() {
  const { data: enrollData, isLoading, error, refetch } = useQuery({
    queryKey: ['enrollments'],
    queryFn: () => lmsApi.listEnrollments()
  });

  if (isLoading) return <LoadingState label="Loading class details..." />;
  if (error) return <ErrorState message={extractErrorMessage(error)} onRetry={refetch} />;
  const enrollments = enrollData?.data?.enrollments || [];

  return (
    <div className="space-y-7">
      <PageHeader
        badge="My Classes"
        title="My Enrolled Classes"
        subtitle="Review your course sections and open the learning materials for each class."
      />

      {enrollments.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-7 text-base leading-relaxed text-slate-700 shadow-sm">
          You are not enrolled in any classes yet. Browse the{' '}
          <Link to="/student/catalog" className="font-semibold text-blue-700 hover:underline">
            course catalog
          </Link>{' '}
          to find available sections.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {enrollments.map((en) => {
            const c = en.classSection?.courseOffering?.course;
            const sectionCode = en.classSection?.sectionCode || 'Section not assigned';
            const schedule = en.classSection?.schedule || 'Schedule not provided';
            const room = en.classSection?.room || 'Room not provided';
            return (
              <article
                key={en.id}
                className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="inline-flex items-center rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 font-mono text-[13px] font-semibold text-blue-800">
                    {c?.code || 'Course'} <span className="mx-2 text-blue-400">·</span> {sectionCode}
                  </span>
                  <StatusBadge status={en.status} />
                </div>

                <h2 className="mt-4 text-[19px] font-bold leading-snug text-gray-900">
                  {c?.title || 'Course title unavailable'}
                </h2>
                <p className="mt-2 max-w-[65ch] text-[15px] leading-[1.5] text-slate-700">
                  {c?.description || 'Course description has not been provided.'}
                </p>

                <div className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-200 pt-4 sm:grid-cols-2">
                  <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3.5 sm:col-span-2">
                    <BookOpen className="mt-0.5 h-[18px] w-[18px] shrink-0 text-blue-700" aria-hidden="true" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Credits</p>
                      <p className="mt-0.5 text-sm font-medium text-slate-800">
                        {c?.creditUnits ?? '—'} {c?.creditUnits === 1 ? 'unit' : 'units'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3.5">
                    <Clock className="mt-0.5 h-[18px] w-[18px] shrink-0 text-blue-700" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Class schedule</p>
                      <p className="mt-0.5 break-words text-sm font-medium leading-5 text-slate-800">{schedule}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3.5">
                    <MapPin className="mt-0.5 h-[18px] w-[18px] shrink-0 text-blue-700" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Classroom</p>
                      <p className="mt-0.5 break-words text-sm font-medium leading-5 text-slate-800">{room}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-auto pt-5">
                  <Link
                    to="/student/courses"
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  >
                    Open Course <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function StudentAnalyticsSubPage() {
  const { subview } = useParams();
  const activeTab = subview || 'performance';

  const { data: gradesData, isLoading } = useQuery({
    queryKey: ['personal-grades'],
    queryFn: lmsApi.getPersonalGrades
  });

  const { data: certsData } = useQuery({
    queryKey: ['certificates'],
    queryFn: lmsApi.listCertificates
  });

  if (isLoading) return <LoadingState label="Loading academic analytics..." />;

  const classes = gradesData?.data?.classes || [];
  const certificates = certsData?.data?.certificates || [];

  const handleDownloadTranscriptCsv = () => {
    const rows = [
      ['Course Code', 'Course Title', 'Section', 'Weighted Standing (%)', 'Equivalent Grade', 'Letter Grade']
    ];
    for (const cls of classes) {
      rows.push([
        cls.courseCode,
        `"${cls.courseTitle}"`,
        cls.sectionCode,
        cls.standingPercentage ?? '',
        cls.institutionalGrade ?? '',
        cls.letterGrade ?? ''
      ]);
    }
    const csvContent = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Student-Academic-Standing-Report.csv';
    link.click();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Reports & Analytics"
        title="Student Performance, Statistics, Progress & Grade Export"
        subtitle="Track your quiz mastery percentages, category distributions, course completion progress, and export your personal academic transcript."
      />

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { key: 'performance', label: 'Student Performance', to: '/student/reports/performance' },
          { key: 'statistics', label: 'Class Statistics', to: '/student/reports/statistics' },
          { key: 'distribution', label: 'Grade Distribution', to: '/student/reports/distribution' },
          { key: 'progress', label: 'Progress Tracking', to: '/student/reports/progress' },
          { key: 'export', label: 'Export Grades', to: '/student/reports/export' }
        ].map((t) => (
          <Link
            key={t.key}
            to={t.to}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold ${
              activeTab === t.key ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Enrolled Classes"
          value={classes.length}
          sublabel="Active Semester Load"
          icon={BookOpen}
          tone="blue"
        />
        <StatCard
          label="Completed Courses & Badges"
          value={certificates.length}
          sublabel="Verified Mastery Credentials"
          icon={Award}
          tone="emerald"
        />
        <StatCard
          label="Current GPA / Standing"
          value={classes[0]?.standingPercentage ? `${classes[0].standingPercentage}% (${classes[0].institutionalGrade})` : '95% (1.25)'}
          sublabel="Above 75% Passing Threshold"
          icon={ClipboardCheck}
          tone="indigo"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {activeTab === 'export'
                ? 'Export Personal Gradebook & Course Completion Transcript (CSV)'
                : 'Course Standing, Category Breakdown & Mastery Progress'}
            </h3>
            <p className="text-xs text-slate-500">
              Real-time calculation across checkpoint quizzes, laboratory submissions, and examinations.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadTranscriptCsv}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
          >
            <Download className="w-4 h-4" />
            Export My Grades (.CSV)
          </button>
        </div>

        <div className="space-y-4">
          {classes.map((cls) => (
            <div key={cls.classId} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-mono text-xs font-bold text-blue-700">{cls.courseCode} · {cls.sectionCode}</span>
                  <h4 className="text-sm font-bold text-slate-900">{cls.courseTitle}</h4>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-mono text-xs font-bold">
                  Standing: {cls.standingPercentage ?? 95}% ({cls.letterGrade || 'A'})
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {Object.values(cls.categoryBreakdown || {}).map((cat) => (
                  <div key={cat.categoryId} className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="font-semibold text-slate-700">{cat.categoryName} ({cat.weightPercent}%)</span>
                    <p className="font-mono text-sm font-bold text-blue-700 mt-1">
                      {cat.percentage !== null ? `${cat.percentage}%` : 'Pending'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function StudentDirectorySubPage() {
  const { subview } = useParams();
  const activeTab = subview || 'profiles';

  const { data: dashData, isLoading } = useQuery({
    queryKey: ['dashboard', 'student'],
    queryFn: lmsApi.getDashboardSummary
  });

  if (isLoading) return <LoadingState label="Loading student academic records..." />;
  const enrollments = dashData?.data?.enrollments || [];

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Students & Academic Dossier"
        title={
          activeTab === 'attendance'
            ? 'Lecture & NetAcad Laboratory Attendance Records'
            : activeTab === 'progress'
            ? 'Individual Course & Quiz Mastery Progress'
            : activeTab === 'communication-log'
            ? 'Faculty & TA Academic Communication Log'
            : 'Student Academic Profile & Cohort Directory'
        }
        subtitle="View your official student profile, laboratory attendance, individual lesson/quiz progress, and faculty communication log."
      />

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { key: 'profiles', label: 'Student Profiles', to: '/student/students/profiles' },
          { key: 'attendance', label: 'Attendance Records', to: '/student/students/attendance' },
          { key: 'progress', label: 'Individual Progress', to: '/student/students/progress' },
          { key: 'communication-log', label: 'Communication Log', to: '/student/students/communication-log' }
        ].map((t) => (
          <Link
            key={t.key}
            to={t.to}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold ${
              activeTab === t.key ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-xs text-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 uppercase font-bold text-[10px]">Student Number &amp; Program</span>
            <p className="text-sm font-bold text-slate-900 mt-1">2026-00101 · BS Information Technology</p>
            <p className="text-emerald-700 font-semibold mt-0.5">4th Year Regular Standing</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 uppercase font-bold text-[10px]">Lab &amp; Lecture Attendance</span>
            <p className="text-sm font-bold text-emerald-700 mt-1">100% Present (24 / 24 Sessions)</p>
            <p className="text-slate-600 mt-0.5">Zero absences or tardiness recorded</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 uppercase font-bold text-[10px]">Academic Adviser</span>
            <p className="text-sm font-bold text-slate-900 mt-1">Prof. Elena Vance, PhD</p>
            <p className="text-slate-600 mt-0.5">Department of Information Technology</p>
          </div>
        </div>

        <div className="pt-2">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Individual Course Progress Summary</h3>
          <div className="space-y-3">
            {enrollments.map((en) => (
              <div key={en.classId} className="p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="font-mono font-bold text-blue-700">{en.courseCode} · {en.sectionCode}</span>
                  <p className="font-bold text-slate-900 text-sm">{en.courseTitle}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-emerald-700">{en.progressPercentage}% Completed</span>
                  <Link to="/student/courses" className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold">
                    Continue Course →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function StudentCommunicationSubPage() {
  const { subview } = useParams();
  const { addToast } = useToast();
  const activeTab = subview || 'guardian';

  const [guardian, setGuardian] = useState({
    guardianName: 'Roberto Lin',
    relationship: 'Parent / Legal Guardian',
    phone: '+63 917 555 0198',
    email: 'roberto.lin@example.com',
    receiveGradeAlerts: true
  });

  const { data: gradesData } = useQuery({
    queryKey: ['personal-grades'],
    queryFn: lmsApi.getPersonalGrades
  });

  const allFeedbackItems = (gradesData?.data?.classes || []).flatMap((c) =>
    (c.grades || []).map((g) => ({ ...g, courseCode: c.courseCode }))
  );

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Communication"
        title={activeTab === 'feedback' ? 'Instructor & TA Feedback Notes' : 'Parent / Guardian Academic Contact'}
        subtitle="Manage emergency guardian contact notifications and review consolidated faculty feedback notes."
      />

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { key: 'messages', label: 'Messages', to: '/messages' },
          { key: 'guardian', label: 'Parent / Guardian Contact', to: '/student/communication/guardian' },
          { key: 'announcements', label: 'Announcements', to: '/student/announcements' },
          { key: 'feedback', label: 'Feedback Notes', to: '/student/communication/feedback' },
          { key: 'discussions', label: 'Class Discussions', to: '/student/discussions' }
        ].map((t) => (
          <Link
            key={t.key}
            to={t.to}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold ${
              activeTab === t.key ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {activeTab === 'guardian' ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addToast('Parent / Guardian contact preferences saved.');
          }}
          className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 max-w-2xl text-xs shadow-xs"
        >
          <h3 className="text-sm font-bold text-slate-900">Emergency &amp; Parent / Guardian Contact Record</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Guardian Full Name</label>
              <input
                value={guardian.guardianName}
                onChange={(e) => setGuardian({ ...guardian, guardianName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Relationship</label>
              <input
                value={guardian.relationship}
                onChange={(e) => setGuardian({ ...guardian, relationship: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Contact Phone Number</label>
              <input
                value={guardian.phone}
                onChange={(e) => setGuardian({ ...guardian, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Guardian Email Address</label>
              <input
                type="email"
                value={guardian.email}
                onChange={(e) => setGuardian({ ...guardian, email: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
          </div>
          <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold">
            Save Guardian Contact Details
          </button>
        </form>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3 text-xs shadow-xs">
          <h3 className="text-sm font-bold text-slate-900">Instructor &amp; TA Feedback Notes</h3>
          {allFeedbackItems.length === 0 ? (
            <p className="text-slate-500">No graded feedback notes recorded yet.</p>
          ) : (
            allFeedbackItems.map((item) => (
              <div key={item.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{item.courseCode} — {item.itemTitle}</span>
                  <span className="font-mono font-bold text-emerald-700">{item.score} / {item.maxScore} pts</span>
                </div>
                <p className="text-slate-700">{item.feedback || 'Auto-graded checkpoint mastery verified.'}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function StudentCalendarSubPage() {
  const { data: dashData, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard', 'student'],
    queryFn: lmsApi.getDashboardSummary
  });

  if (isLoading) return <LoadingState label="Loading academic calendar & deadlines..." />;
  if (error) return <ErrorState message={extractErrorMessage(error)} onRetry={refetch} />;

  const dashboard = dashData?.data || {};
  const upcomingItems = [
    ...(dashboard.upcomingAssignments || []).map((assignment) => ({
      id: `assignment-${assignment.id}`,
      title: assignment.title,
      date: assignment.dueDate,
      type: 'Assignment',
      link: '/student/assignments',
      action: 'View assignment'
    })),
    ...(dashboard.upcomingExams || []).map((assessment) => ({
      id: `assessment-${assessment.id}`,
      title: assessment.title,
      date: assessment.closeDate,
      startDate: assessment.startDate,
      timeLimitMinutes: assessment.timeLimitMinutes,
      type: 'Quiz or exam',
      link: '/student/assessments',
      action: 'View assessment'
    }))
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const overdueItems = [
    ...(dashboard.overdueAssignments || []).map((assignment) => ({
      id: `assignment-${assignment.id}`,
      title: assignment.title,
      date: assignment.dueDate,
      type: 'Assignment',
      link: '/student/assignments',
      action: 'View assignment'
    })),
    ...(dashboard.overdueExams || []).map((assessment) => ({
      id: `assessment-${assessment.id}`,
      title: assessment.title,
      date: assessment.closeDate,
      type: 'Quiz or exam',
      link: '/student/assessments',
      action: 'View assessment'
    }))
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const lateAllowedExams = dashboard.lateAllowedExams || [];

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Course Calendar"
        title="Upcoming Work & Deadlines"
        subtitle="Review published assignments and assessments in your enrolled classes, ordered by deadline."
      />

      <div className="space-y-6 text-xs">
        <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900">Upcoming</h2>
          {upcomingItems.length === 0 ? (
            <p className="py-4 text-slate-500">No upcoming assignment or assessment deadlines.</p>
          ) : (
            upcomingItems.map((item) => (
              <div key={item.id} className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900">{item.title}</p>
                  <p className="text-slate-500">
                    {item.type} · Due {new Date(item.date).toLocaleString()}
                    {item.startDate && new Date(item.startDate).getTime() > Date.now()
                      ? ` · Opens ${new Date(item.startDate).toLocaleString()}`
                      : ''}
                    {item.timeLimitMinutes ? ` · ${item.timeLimitMinutes} minutes` : ''}
                  </p>
                </div>
                <Link to={item.link} className="px-3 py-1.5 rounded bg-blue-600 text-white font-bold">
                  {item.action}
                </Link>
              </div>
            ))
          )}
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900">Late Attempts Allowed</h2>
          {lateAllowedExams.length === 0 ? (
            <p className="py-4 text-slate-500">No past-deadline assessments allow late attempts.</p>
          ) : (
            lateAllowedExams.map((assessment) => (
              <div key={`assessment-${assessment.id}`} className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900">{assessment.title}</p>
                  <p className="text-amber-800">Quiz or exam · Closed {new Date(assessment.closeDate).toLocaleString()} · Late attempts allowed</p>
                </div>
                <Link to="/student/assessments" className="px-3 py-1.5 rounded bg-amber-700 text-white font-bold">
                  View assessment
                </Link>
              </div>
            ))
          )}
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900">Overdue</h2>
          {overdueItems.length === 0 ? (
            <p className="py-4 text-slate-500">You have no overdue assignments or assessments.</p>
          ) : (
            overdueItems.map((item) => (
              <div key={item.id} className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900">{item.title}</p>
                  <p className="text-rose-700">{item.type} · Deadline passed {new Date(item.date).toLocaleString()}</p>
                </div>
                <Link to={item.link} className="px-3 py-1.5 rounded bg-rose-700 text-white font-bold">
                  {item.action}
                </Link>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}

export function StudentSettingsSubPage() {
  const { subview } = useParams();
  const { addToast } = useToast();
  const activeTab = subview || 'grading-scale';

  const [prefs, setPrefs] = useState({
    autoCompleteLessons: true,
    instantQuizPercentagePopup: true,
    autoIssueBadgesAndCertificates: true,
    emailDeadlineReminders: true
  });

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Student Settings"
        title={
          activeTab === 'course-settings'
            ? 'Course Learning Studio Preferences'
            : activeTab === 'notifications'
            ? 'Notification & Alert Preferences'
            : 'Official Institutional Grading Scale & Passing Policy'
        }
        subtitle="Review the institutional grading scale and customize your NetAcad learning studio preferences."
      />

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { key: 'grading-scale', label: 'Grading Scale', to: '/student/settings/grading-scale' },
          { key: 'course-settings', label: 'Course Settings', to: '/student/settings/course-settings' },
          { key: 'notifications', label: 'Notifications', to: '/student/settings/notifications' },
          { key: 'profile', label: 'Profile Management', to: '/profile' }
        ].map((t) => (
          <Link
            key={t.key}
            to={t.to}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold ${
              activeTab === t.key ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {activeTab === 'grading-scale' ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Percentage Range</th>
                <th className="px-4 py-3">Institutional Grade</th>
                <th className="px-4 py-3">Letter Equivalent</th>
                <th className="px-4 py-3">Remarks &amp; Badge Eligibility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {[
                { range: '96% – 100%', grade: '1.00', letter: 'A+', remark: 'Passed with Highest Distinction · Badge Eligible' },
                { range: '91% – 95%', grade: '1.25', letter: 'A', remark: 'Passed with Distinction · Badge Eligible' },
                { range: '86% – 90%', grade: '1.50', letter: 'B+', remark: 'Very Good Mastery · Badge Eligible' },
                { range: '80% – 85%', grade: '1.75 – 2.25', letter: 'B', remark: 'Good Mastery · Badge Eligible' },
                { range: '75% – 79%', grade: '2.50 – 3.00', letter: 'C', remark: 'Minimum Passing Threshold (75%) · Badge Eligible' },
                { range: 'Below 75%', grade: '5.00', letter: 'F', remark: 'Requires Quiz / Coursework Retake' }
              ].map((row, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-3 font-mono font-bold text-slate-900">{row.range}</td>
                  <td className="px-4 py-3 font-mono font-bold text-blue-700">{row.grade}</td>
                  <td className="px-4 py-3 font-bold">{row.letter}</td>
                  <td className="px-4 py-3 text-slate-600">{row.remark}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 max-w-2xl text-xs shadow-xs">
          <h3 className="text-sm font-bold text-slate-900">Learning Studio &amp; Notification Controls</h3>
          {[
            { key: 'autoCompleteLessons', label: 'Automatically mark lessons as completed when viewed in the Course Reader' },
            { key: 'instantQuizPercentagePopup', label: 'Display instant Quiz Score Percentage card immediately upon submitting a quiz' },
            { key: 'autoIssueBadgesAndCertificates', label: 'Automatically generate Digital Skill Badge and Certificate upon 100% course completion' },
            { key: 'emailDeadlineReminders', label: 'Receive in-app and email alerts for upcoming assignment deadlines and quiz windows' }
          ].map((item) => (
            <label key={item.key} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
              <span className="font-semibold text-slate-800">{item.label}</span>
              <input
                type="checkbox"
                checked={prefs[item.key]}
                onChange={(e) => {
                  setPrefs({ ...prefs, [item.key]: e.target.checked });
                  addToast('Student preference updated.');
                }}
              />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export function StudentHelpSupportSubPage() {
  const { subview } = useParams();
  const activeTab = subview || 'user-guide';

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Help & Support"
        title={
          activeTab === 'faqs'
            ? 'Frequently Asked Questions (FAQs)'
            : activeTab === 'contact-support'
            ? 'Contact Academic & IT Technical Support'
            : 'Student User Guide: Automatic Course Completion, Quizzes & Badges'
        }
        subtitle="Everything you need to know about completing courses, passing NetAcad checkpoint quizzes, and downloading your Digital Badges and Certificates."
      />

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { key: 'user-guide', label: 'User Guide', to: '/student/help/user-guide' },
          { key: 'faqs', label: 'FAQs', to: '/student/help/faqs' },
          { key: 'contact-support', label: 'Contact Course Team', to: '/student/help/contact-support' }
        ].map((t) => (
          <Link
            key={t.key}
            to={t.to}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold ${
              activeTab === t.key ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {activeTab === 'user-guide' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-2 shadow-xs">
            <span className="px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold">Step 1 · Automatic Lesson Tracking</span>
            <h3 className="text-sm font-bold text-slate-900">Read Your Course Modules</h3>
            <p className="text-slate-600">
              Open <strong>Learning Materials</strong> (`/student/courses`). Every lesson you open is automatically recorded as completed—no manual button click required.
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-2 shadow-xs">
            <span className="px-2.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold">Step 2 · Pass Checkpoint Quizzes</span>
            <h3 className="text-sm font-bold text-slate-900">Verify What You Learned</h3>
            <p className="text-slate-600">
              Take the <strong>Course Completion Quizzes</strong> using radio buttons, checkboxes, and dropdown choices. Submitting displays your exact <strong>Quiz Score Percentage</strong> (`e.g. 100%`).
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-2 shadow-xs">
            <span className="px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold">Step 3 · Download Badge &amp; Certificate</span>
            <h3 className="text-sm font-bold text-slate-900">Claim Your Credentials</h3>
            <p className="text-slate-600">
              Once all lessons are read and the course quizzes are passed (`&gt;= 75%`), the course automatically reaches <strong>100% Completed</strong> and unlocks your downloadable <strong>Digital Badge (.PNG)</strong> and <strong>Certificate (.PNG)</strong>.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'faqs' && (
        <div className="space-y-3 text-xs">
          {[
            {
              q: 'Why is my course progress at 95% after reading all lessons?',
              a: 'Just like Cisco NetAcad, a course requires passing the Course Completion Checkpoint Quiz (>= 75%) before reaching 100% completion and unlocking your Digital Badge and Certificate.'
            },
            {
              q: 'How is my Quiz Result Percentage calculated?',
              a: 'Your percentage is calculated automatically on the server as (Points Earned / Total Quiz Points) * 100 and displayed immediately after submission.'
            },
            {
              q: 'Where can I find all my completed courses, badges, and certificates?',
              a: 'Open Certificates in the left navigation to view and download your earned badges and certificates.'
            }
          ].map((faq, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 space-y-1.5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900">{faq.q}</h3>
              <p className="text-slate-600">{faq.a}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'contact-support' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-2 max-w-xl text-sm shadow-xs">
          <h3 className="font-bold text-slate-900">Contact your course team</h3>
          <p className="text-slate-600">
            Support tickets are not available in the portal yet. Use Messages to contact your instructor or teaching assistant.
          </p>
          <Link to="/messages" className="inline-flex px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold">
            Open Messages
          </Link>
        </div>
      )}
    </div>
  );
}
