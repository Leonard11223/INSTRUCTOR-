import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { lmsApi } from '../services/api';
import { ToastProvider } from '../components/ui/SharedComponents';
import { StudentCatalogPage, StudentDashboardPage } from './StudentPages';

vi.mock('../services/api', () => ({
  lmsApi: {
    getDashboardSummary: vi.fn(),
    listCourses: vi.fn(),
    getMyPlacements: vi.fn(),
    enrollStudent: vi.fn()
  },
  extractErrorMessage: (error) => error?.message || 'Request failed'
}));

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <StudentDashboardPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function renderCatalog() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter>
          <StudentCatalogPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}

describe('StudentDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard metrics and enrolled course details from the API', async () => {
    const dueDate = new Date(Date.now() + 5 * 86400000).toISOString();
    lmsApi.getDashboardSummary.mockResolvedValue({
      data: {
        metrics: {
          enrolledCoursesCount: 1,
          overallCourseProgress: 50,
          pendingAssignmentsCount: 1,
          overdueAssignmentsCount: 0,
          upcomingExamsCount: 2,
          earnedCertificatesCount: 1
        },
        enrolledCourses: [{
          membershipId: 7,
          classId: 12,
          courseCode: 'NET-201',
          sectionCode: 'BSIT 4-A',
          courseTitle: 'Enterprise Networking',
          courseDescription: 'Configure and secure enterprise networks.',
          creditUnits: 4,
          schedule: 'Monday / Wednesday, 9:00–11:30 AM',
          room: 'NetAcad Lab 301',
          progressPercentage: 50,
          membershipStatus: 'enrolled'
        }],
        upcomingAssignments: [{
          id: 8,
          classId: 12,
          title: 'OSPF Configuration Lab',
          dueDate
        }],
        recentPublishedGrades: [{
          id: 9,
          classId: 12,
          itemTitle: 'Routing Quiz',
          score: 18,
          maxScore: 20
        }],
        recentAnnouncements: [{
          id: 10,
          title: 'Lab Update',
          content: 'Please review the updated lab schedule.'
        }]
      }
    });

    renderDashboard();

    expect(await screen.findByText('Personalized Learning & Progress Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Pending Assignments')).toBeInTheDocument();
    expect(screen.getByText('OSPF Configuration Lab')).toBeInTheDocument();
    const courseCard = screen.getByRole('heading', { name: 'Enterprise Networking' }).closest('article');
    expect(within(courseCard).getByText(/NET-201/)).toBeInTheDocument();
    expect(within(courseCard).getByText('4 credits')).toBeInTheDocument();
    expect(within(courseCard).getByText('Monday / Wednesday, 9:00–11:30 AM')).toBeInTheDocument();
    expect(within(courseCard).getByText('NetAcad Lab 301')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Enterprise Networking progress' })).toHaveAttribute('aria-valuenow', '50');
  });

  it('shows a useful empty state when no courses are enrolled', async () => {
    lmsApi.getDashboardSummary.mockResolvedValue({
      data: {
        metrics: {},
        enrolledCourses: [],
        upcomingAssignments: [],
        recentPublishedGrades: [],
        recentAnnouncements: []
      }
    });

    renderDashboard();

    expect(await screen.findByText('No enrolled courses yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explore Course Catalog' })).toHaveAttribute('href', '/student/catalog');
    expect(screen.getByText('No upcoming assignment deadlines.')).toBeInTheDocument();
    expect(screen.getByText('No published grades yet.')).toBeInTheDocument();
    expect(screen.getByText('No recent announcements.')).toBeInTheDocument();
  });

  it('loads and displays the student’s academic placement in the course catalog', async () => {
    lmsApi.listCourses.mockResolvedValue({ data: { courses: [] } });
    lmsApi.getMyPlacements.mockResolvedValue({
      data: {
        placements: [{
          program: { code: 'BSIT' },
          yearLevel: 4,
          cohortSection: '4-A',
          academicYear: { name: '2026-2027', isCurrent: true }
        }]
      }
    });

    renderCatalog();

    expect(await screen.findByText(/BSIT · Year 4 · Section 4-A/)).toBeInTheDocument();
    expect(lmsApi.getMyPlacements).toHaveBeenCalledOnce();
  });
});
