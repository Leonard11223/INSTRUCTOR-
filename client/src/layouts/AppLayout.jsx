import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Settings,
  FileSpreadsheet,
  BarChart3,
  Building2,
  BookOpen,
  GraduationCap,
  Calendar,
  Layers,
  ClipboardCheck,
  Award,
  Megaphone,
  MessageSquare,
  Bell,
  LogOut,
  Menu,
  X,
  UserCircle,
  Terminal,
  HelpCircle,
  CheckCheck,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FileText,
  Lock,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  Mail,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { lmsApi } from '../services/api';

const NAVIGATION_BY_ROLE = {
  super_admin: [
    { to: '/admin/dashboard', label: 'System Dashboard', icon: LayoutDashboard },
    { to: '/admin/users', label: 'User Management', icon: Users },
    { to: '/admin/roles', label: 'Roles & Permissions', icon: ShieldCheck },
    { to: '/admin/academic-config', label: 'Academic Configuration', icon: Building2 },
    { to: '/admin/settings', label: 'System & Integrations', icon: Settings },
    { to: '/admin/audit-logs', label: 'Security & Audit Logs', icon: Lock },
    { to: '/admin/reports', label: 'System Reports', icon: FileSpreadsheet }
  ],
  academic_admin: [
    { to: '/academic/dashboard', label: 'Academic Dashboard', icon: LayoutDashboard },
    { to: '/academic/structure', label: 'Departments & Programs', icon: Building2 },
    { to: '/academic/terms', label: 'Years & Semesters', icon: Calendar },
    { to: '/academic/users', label: 'User Management', icon: Users },
    { to: '/academic/analytics', label: 'Academic Analytics', icon: BarChart3 },
    { to: '/academic/announcements', label: 'Announcements', icon: Megaphone },
    { to: '/academic/reports', label: 'Academic Reports', icon: FileSpreadsheet }
  ],
  instructor: [
    { to: '/instructor/dashboard', label: 'Instructor Dashboard', icon: LayoutDashboard },
    { to: '/instructor/courses', label: 'My Courses & Content', icon: BookOpen },
    { to: '/instructor/classes', label: 'Class Management', icon: Layers },
    { to: '/instructor/assignments', label: 'Assignments & Labs', icon: Terminal },
    { to: '/instructor/submissions', label: 'Submission Review', icon: ClipboardCheck },
    { to: '/instructor/assessments', label: 'Quizzes & Question Bank', icon: HelpCircle },
    { to: '/instructor/gradebook', label: 'Class Gradebook', icon: Award },
    { to: '/instructor/discussions', label: 'Discussions & Support', icon: MessageSquare },
    { to: '/instructor/announcements', label: 'Announcements', icon: Megaphone },
    { to: '/instructor/reports', label: 'Class Reports', icon: FileSpreadsheet }
  ],
  teaching_assistant: [
    { to: '/ta/dashboard', label: 'TA Dashboard', icon: LayoutDashboard },
    {
      id: 'ta-classes',
      label: 'Sections & Students',
      icon: Users,
      defaultOpen: true,
      children: [
        { to: '/ta/classes',   label: 'Class Roster'      },
        { to: '/ta/progress',  label: 'Student Progress'  },
        { to: '/ta/activity',  label: 'Student Activity'  }
      ]
    },
    {
      id: 'ta-submissions',
      label: 'Submissions',
      icon: ClipboardCheck,
      defaultOpen: true,
      children: [
        { to: '/ta/submissions', label: 'Review & Feedback' },
      ]
    },
    { to: '/ta/discussions',   label: 'Discussion Moderation', icon: MessageSquare },
    { to: '/ta/announcements', label: 'Announcements',         icon: Megaphone     },
    { to: '/messages',         label: 'Messages',              icon: Bell          },
    { to: '/profile',          label: 'Profile & Settings',    icon: Settings      }
  ],
  student: [
    { to: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'my-learning',
      label: 'My Learning',
      icon: BookOpen,
      defaultOpen: true,
      children: [
        { to: '/student/courses', label: 'My Courses' },
        { to: '/student/classes/semester', label: 'My Classes' },
        { to: '/student/catalog', label: 'Course Catalog' }
      ]
    },
    {
      id: 'coursework',
      label: 'Coursework',
      icon: FileText,
      children: [
        { to: '/student/assignments', label: 'Assignments' },
        { to: '/student/assessments', label: 'Quizzes & Exams' }
      ]
    },
    { to: '/student/grades', label: 'Grades & Progress', icon: Award },
    {
      id: 'communication',
      label: 'Communication',
      icon: MessageSquare,
      children: [
        { to: '/messages', label: 'Messages' },
        { to: '/student/announcements', label: 'Announcements' },
        { to: '/student/discussions', label: 'Class Discussions' }
      ]
    },
    { to: '/student/certificates', label: 'Certificates', icon: ShieldCheck },
    { to: '/student/calendar/deadlines', label: 'Calendar & Deadlines', icon: Calendar },
    { to: '/student/help/user-guide', label: 'Help & Support', icon: HelpCircle }
  ]
};

const ROLE_LABELS = {
  super_admin: 'Super Administrator',
  academic_admin: 'Academic Administrator',
  instructor: 'Instructor / Faculty',
  teaching_assistant: 'Teaching Assistant',
  student: 'Student / Learner'
};

const COLLAPSED_NAV_ITEM_CLASS =
  'mx-auto box-border flex h-[60px] min-h-[60px] w-[60px] min-w-[60px] shrink-0 items-center justify-center rounded-xl p-0';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState({ 'my-learning': true });
  const [collapsedTooltip, setCollapsedTooltip] = useState(null);
  const collapsedTooltipTimer = useRef(null);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('minsu_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('minsu_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const userInitials = React.useMemo(() => {
    if (!user?.fullName) return 'VA';
    const parts = user.fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [user?.fullName]);

  const navItems = NAVIGATION_BY_ROLE[user?.primaryRole] || NAVIGATION_BY_ROLE.student;

  const toggleGroup = (id) => {
    setOpenGroups((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const isGroupOpen = (item) => {
    if (openGroups[item.id] !== undefined) {
      return openGroups[item.id];
    }
    if (item.children?.some((c) => location.pathname === c.to || location.pathname.startsWith(`${c.to}/`))) {
      return true;
    }
    return Boolean(item.defaultOpen);
  };

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: lmsApi.listNotifications,
    enabled: Boolean(user),
    refetchInterval: 60_000,   // poll every 60 s so new TA notifications appear
    staleTime: 30_000,
  });

  const notifications = notifData?.data?.notifications || [];
  const unreadCount = notifData?.data?.unreadCount || 0;

  const markAllMutation = useMutation({
    mutationFn: () => lmsApi.markNotificationRead('all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  const markOneMutation = useMutation({
    mutationFn: (id) => lmsApi.markNotificationRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const pathSegments = location.pathname.split('/').filter(Boolean);

  const showCollapsedTooltip = (event, label, isCollapsed, isMobile) => {
    if (!isCollapsed || isMobile) return;
    window.clearTimeout(collapsedTooltipTimer.current);
    const { top, height } = event.currentTarget.getBoundingClientRect();
    collapsedTooltipTimer.current = window.setTimeout(() => {
      setCollapsedTooltip({ label, top: top + height / 2 });
    }, 350);
  };

  const hideCollapsedTooltip = () => {
    window.clearTimeout(collapsedTooltipTimer.current);
    setCollapsedTooltip(null);
  };

  useEffect(() => () => window.clearTimeout(collapsedTooltipTimer.current), []);

  const getCollapsedTooltipProps = (label, isCollapsed, isMobile) => ({
    onMouseEnter: (event) => showCollapsedTooltip(event, label, isCollapsed, isMobile),
    onMouseLeave: hideCollapsedTooltip,
    onFocus: (event) => showCollapsedTooltip(event, label, isCollapsed, isMobile),
    onBlur: hideCollapsedTooltip
  });

  const renderNavIcon = (Icon, isCollapsed) => (
    <span
      className={`flex shrink-0 items-center justify-center ${
        isCollapsed ? 'h-6 w-6' : 'h-5 w-5'
      }`}
      aria-hidden="true"
    >
      <Icon
        className={`m-0 block shrink-0 ${isCollapsed ? 'h-6 w-6' : 'h-5 w-5'}`}
      />
    </span>
  );

  const renderNavLinks = (isMobile = false, isCollapsed = false) =>
    navItems.map((item) => {
      const Icon = item.icon;

      if (item.children) {
        const expanded = isGroupOpen(item);
        const hasActiveChild = item.children.some(
          (c) => location.pathname === c.to || location.pathname.startsWith(`${c.to}/`)
        );

        return (
          <div key={item.id} className={`relative space-y-1 ${isCollapsed ? 'w-full' : ''}`}>
            <button
              type="button"
              onClick={() => {
                if (isCollapsed) {
                  hideCollapsedTooltip();
                  setSidebarCollapsed(false);
                  setOpenGroups((previous) => ({ ...previous, [item.id]: true }));
                } else {
                  toggleGroup(item.id);
                }
              }}
              {...getCollapsedTooltipProps(item.label, isCollapsed, isMobile)}
              aria-label={item.label}
              aria-expanded={expanded}
              className={`relative flex items-center rounded-xl font-semibold transition-colors ${
                isCollapsed
                  ? COLLAPSED_NAV_ITEM_CLASS
                  : 'w-full justify-between gap-3 px-3 py-2.5 text-[15px]'
              } ${
                hasActiveChild
                  ? isCollapsed
                    ? 'bg-blue-500/15 text-blue-200 ring-1 ring-inset ring-blue-400/25 before:absolute before:left-1 before:top-1/2 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-blue-400'
                    : 'bg-slate-800 text-blue-300 font-semibold before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-r-full before:bg-blue-400'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {isCollapsed ? (
                renderNavIcon(Icon, true)
              ) : (
                <>
                  <span className="flex items-center gap-3">
                    {renderNavIcon(Icon, false)}
                    <span>{item.label}</span>
                  </span>
                  {expanded ? (
                    <ChevronUp className="h-4 w-4 shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  )}
                </>
              )}
            </button>

            {expanded && (!isCollapsed || isMobile) && (
              <div className="space-y-0.5 py-0.5 pl-9 pr-2">
                {item.children.map((sub) => (
                  <NavLink
                    key={`${item.id}-${sub.to}-${sub.label}`}
                    to={sub.to}
                    onClick={() => {
                      if (isMobile) setMobileMenuOpen(false);
                    }}
                    className={({ isActive }) =>
                      `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-600/20 text-blue-300 font-bold border border-blue-500/30'
                          : 'text-slate-400 hover:bg-slate-800/70 hover:text-white'
                      }`
                    }
                  >
                    {sub.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        );
      }

      return (
        <NavLink
          key={item.to}
          to={item.to}
          {...getCollapsedTooltipProps(item.label, isCollapsed, isMobile)}
          aria-label={isCollapsed ? item.label : undefined}
          onClick={() => {
            if (isMobile) setMobileMenuOpen(false);
          }}
          className={({ isActive }) =>
            `relative flex items-center ${
              isCollapsed
                ? COLLAPSED_NAV_ITEM_CLASS
                : 'w-full gap-3 px-3 py-2.5'
            } rounded-xl font-semibold transition-colors ${
              !isCollapsed ? 'text-[15px]' : ''
            } ${
              isActive
                ? isCollapsed
                  ? 'bg-blue-500/15 text-blue-200 ring-1 ring-inset ring-blue-400/25 before:absolute before:left-1 before:top-1/2 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-blue-400'
                  : 'bg-slate-800 text-blue-300 shadow-xs before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-r-full before:bg-blue-400'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`
          }
        >
          {renderNavIcon(Icon, isCollapsed)}
          {!isCollapsed && <span>{item.label}</span>}
        </NavLink>
      );
    });

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Desktop Sidebar */}
      <aside
        className={`fixed inset-y-0 z-30 hidden h-screen h-dvh flex-col overflow-x-hidden border-r border-slate-800 bg-[#101B32] text-slate-100 transition-[width] duration-200 ease-in-out lg:flex ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div
          className={`flex shrink-0 items-center border-b border-slate-800 ${
            sidebarCollapsed ? 'h-[76px] justify-center px-2' : 'h-16 gap-3 px-5'
          }`}
        >
          <div
            className={`flex shrink-0 items-center justify-center rounded-xl bg-blue-600 font-bold text-white shadow-inner ${
              sidebarCollapsed ? 'h-14 w-14' : 'h-9 w-9'
            }`}
          >
            <GraduationCap className={`${sidebarCollapsed ? 'h-7 w-7' : 'h-6 w-6'}`} />
          </div>
          {!sidebarCollapsed && <div>
            <span className="font-bold text-base tracking-tight text-white block leading-none">
              Aetheria NetAcad
            </span>
            <span className="text-[11px] text-blue-400 font-medium">
              Institutional Learning Hub
            </span>
          </div>}
        </div>

        {/* Role Indicator */}
        <div
          {...getCollapsedTooltipProps(
            `Active Role Scope: ${ROLE_LABELS[user?.primaryRole] || 'Learner'}`,
            sidebarCollapsed,
            false
          )}
          className={`border-b border-slate-800/80 bg-slate-950/40 ${
            sidebarCollapsed ? 'flex h-[60px] shrink-0 items-center justify-center' : 'shrink-0 px-4 py-3'
          }`}
        >
          {sidebarCollapsed ? (
            <UserCircle className="h-[22px] w-[22px] text-slate-400" aria-hidden="true" />
          ) : (
            <>
              <p className="text-[13px] uppercase tracking-wider text-slate-400 font-semibold">
                Active Role Scope
              </p>
              <p className="mt-0.5 text-[13px] font-bold text-blue-400">
                {ROLE_LABELS[user?.primaryRole] || 'Learner'}
              </p>
            </>
          )}
        </div>

        {/* Navigation Links */}
        <nav
          aria-label="Main Sidebar Navigation"
          className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-4 ${
            sidebarCollapsed
              ? 'flex w-full flex-col items-center gap-2 px-2'
              : 'space-y-1 px-3'
          }`}
        >
          {renderNavLinks(false, sidebarCollapsed)}
        </nav>

        {/* Bottom Profile & Logout */}
        <div
          className={`mt-auto shrink-0 border-t border-slate-800 bg-slate-950/50 ${
            sidebarCollapsed
              ? 'flex w-full flex-col items-center gap-2 p-2'
              : 'space-y-2 p-3'
          }`}
        >
          <Link
            to="/profile"
            {...getCollapsedTooltipProps(
              `${user?.fullName || 'Profile'} · Profile`,
              sidebarCollapsed,
              false
            )}
            aria-label={sidebarCollapsed ? 'View profile' : undefined}
            className={`flex items-center rounded-lg hover:bg-slate-800 transition-colors ${
              sidebarCollapsed
                ? 'flex h-[60px] w-[60px] shrink-0 items-center justify-center p-0'
                : 'gap-3 px-3 py-2'
            }`}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold text-white overflow-hidden">
              {user?.avatarUrl
                ? <img src={user.avatarUrl} alt={user.fullName} className="h-10 w-10 rounded-full object-cover" />
                : (user?.fullName || 'Student').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()
              }
            </span>
            {!sidebarCollapsed && <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{user?.fullName}</p>
              <p className="truncate text-xs text-slate-300">{user?.email}</p>
            </div>}
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            {...getCollapsedTooltipProps('Sign out', sidebarCollapsed, false)}
            aria-label={sidebarCollapsed ? 'Sign out' : undefined}
            className={`flex items-center justify-center rounded-xl border border-slate-800 text-xs font-semibold text-slate-300 transition-colors hover:bg-red-600/20 hover:text-white ${
              sidebarCollapsed ? 'h-12 w-[60px] shrink-0 p-0' : 'w-full gap-2 px-3 py-2'
            }`}
          >
            <LogOut className={`${sidebarCollapsed ? 'h-[22px] w-[22px]' : 'h-5 w-5'}`} />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>
      {collapsedTooltip && sidebarCollapsed && (
        <div
          role="tooltip"
          className="pointer-events-none fixed left-[88px] z-[60] -translate-y-1/2 whitespace-nowrap rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-white shadow-lg"
          style={{ top: collapsedTooltip.top }}
        >
          {collapsedTooltip.label}
        </div>
      )}

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-64 max-w-xs bg-slate-900 text-white flex flex-col h-full z-10">
            <div className="flex items-center justify-between px-4 h-16 border-b border-slate-800">
              <span className="font-bold text-base">Aetheria NetAcad</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {renderNavLinks(true)}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 transition-[padding] duration-200 ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        {/* Top Header */}
        <header className="sticky top-0 z-20 h-16 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => {
                hideCollapsedTooltip();
                toggleSidebar();
              }}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="hidden lg:inline-flex p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>

            {/* Breadcrumbs */}
            <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-slate-600">
              <span className="text-slate-900 font-semibold">Aetheria LMS</span>
              {pathSegments.map((seg, idx) => (
                <React.Fragment key={idx}>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className="capitalize text-slate-800">{seg.replace(/-/g, ' ')}</span>
                </React.Fragment>
              ))}
            </nav>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3">
            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((prev) => !prev)}
                aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
                className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[1rem] h-4 px-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-[22rem] bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden flex flex-col max-h-[80vh]">
                  {/* Panel header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
                    <div className="flex items-center gap-2">
                      <Bell className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Notifications
                      </span>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={() => markAllMutation.mutate()}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* Notification list */}
                  <div className="overflow-y-auto divide-y divide-slate-100 flex-1">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                        <Bell className="w-8 h-8 text-slate-200 mb-2" />
                        <p className="text-xs font-semibold text-slate-500">No notifications yet</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">New activity will appear here.</p>
                      </div>
                    ) : (
                      notifications.map((n) => {
                        // Map notification type → icon + accent colour
                        const TYPE_META = {
                          assignment:   { Icon: ClipboardCheck, color: 'text-blue-500',   bg: 'bg-blue-50',   label: 'Assignment'   },
                          announcement: { Icon: Megaphone,      color: 'text-violet-500', bg: 'bg-violet-50', label: 'Announcement' },
                          enrollment:   { Icon: Users,          color: 'text-emerald-500',bg: 'bg-emerald-50',label: 'Enrollment'   },
                          grade:        { Icon: Award,          color: 'text-amber-500',  bg: 'bg-amber-50',  label: 'Grade'        },
                          feedback:     { Icon: MessageSquare,  color: 'text-indigo-500', bg: 'bg-indigo-50', label: 'Feedback'     },
                          assessment:   { Icon: HelpCircle,     color: 'text-rose-500',   bg: 'bg-rose-50',   label: 'Assessment'   },
                          message:      { Icon: Mail,           color: 'text-sky-500',    bg: 'bg-sky-50',    label: 'Message'      },
                          deadline:     { Icon: Calendar,       color: 'text-orange-500', bg: 'bg-orange-50', label: 'Deadline'     },
                          completion:   { Icon: CheckCheck,     color: 'text-emerald-600',bg: 'bg-emerald-50',label: 'Completion'   },
                          certificate:  { Icon: ShieldCheck,    color: 'text-green-600',  bg: 'bg-green-50',  label: 'Certificate'  },
                          system:       { Icon: Info,           color: 'text-slate-500',  bg: 'bg-slate-100', label: 'System'       },
                        };
                        const meta = TYPE_META[n.type] || TYPE_META.system;
                        const { Icon, color, bg, label } = meta;

                        // Relative timestamp
                        const diff = Date.now() - new Date(n.createdAt).getTime();
                        const mins = Math.floor(diff / 60000);
                        let timeLabel;
                        if (mins < 1)       timeLabel = 'Just now';
                        else if (mins < 60) timeLabel = `${mins}m ago`;
                        else if (mins < 1440) timeLabel = `${Math.floor(mins / 60)}h ago`;
                        else                timeLabel = new Date(n.createdAt).toLocaleDateString();

                        return (
                          <div
                            key={n.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              // Mark as read + navigate
                              if (!n.isRead) markOneMutation.mutate(n.id);
                              setNotifOpen(false);
                              if (n.destinationUrl) navigate(n.destinationUrl);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                if (!n.isRead) markOneMutation.mutate(n.id);
                                setNotifOpen(false);
                                if (n.destinationUrl) navigate(n.destinationUrl);
                              }
                            }}
                            className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 outline-none ${
                              !n.isRead ? 'bg-blue-50/50' : ''
                            }`}
                          >
                            {/* Type icon */}
                            <div className={`${bg} p-1.5 rounded-lg shrink-0 mt-0.5`} aria-hidden="true">
                              <Icon className={`w-3.5 h-3.5 ${color}`} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-1.5">
                                <p className={`text-[13px] leading-snug font-semibold truncate ${!n.isRead ? 'text-slate-900' : 'text-slate-700'}`}>
                                  {n.title}
                                </p>
                                {!n.isRead && (
                                  <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1" aria-label="Unread" />
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className={`text-[10px] font-semibold uppercase tracking-wider ${color}`}>{label}</span>
                                <span className="text-slate-300 text-[10px]">·</span>
                                <span className="text-[10px] text-slate-400">{timeLabel}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Footer */}
                  {notifications.length > 0 && (
                    <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 shrink-0 text-center">
                      <p className="text-[11px] text-slate-400">
                        Showing {notifications.length} most recent · Click to mark as read
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((open) => !open)}
                aria-expanded={profileOpen}
                aria-label="Open profile menu"
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700"
              >
                <span className="w-7 h-7 rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center overflow-hidden shrink-0">
                  {user?.avatarUrl
                    ? <img src={user.avatarUrl} alt={user.fullName} className="w-7 h-7 rounded-full object-cover" />
                    : (user?.fullName || 'Student').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()
                  }
                </span>
                <span className="hidden text-sm font-semibold md:inline">{user?.fullName}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-lg border border-slate-200 bg-white p-2 shadow-xl z-50">
                  <p className="px-3 py-2 text-xs font-semibold text-slate-900 truncate">{user?.fullName}</p>
                  <p className="px-3 pb-2 text-[11px] text-slate-500 truncate">{user?.email}</p>
                  <Link to="/profile" onClick={() => setProfileOpen(false)} className="block rounded-md px-3 py-2 text-xs text-slate-700 hover:bg-slate-100">
                    View profile
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left rounded-md px-3 py-2 text-xs text-rose-700 hover:bg-rose-50"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
