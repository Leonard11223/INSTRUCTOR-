import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../components/ui/SharedComponents';
import { lmsApi } from '../services/api';
import {
  TaStudentActivityPage,
  TaStudentProgressPage,
  TaSubmissionsReviewPage
} from './TaAndSharedPages';

const classSection = {
  id: 12,
  sectionCode: 'BSIT 4-A',
  name: 'Integrative Programming',
  courseOffering: { course: { title: 'Integrative Programming' } }
};

const student = {
  studentId: 21,
  studentName: 'Maya Lin',
  studentEmail: 'maya@example.edu',
  studentNumber: '2026-00101',
  progress: { percentage: 50, completedLessons: 2, totalLessons: 4 },
  submissions: { submitted: 1, totalAssignments: 2, missing: 1, late: 0, flagged: 0 },
  assessments: { completed: 1, totalAssessments: 2, publishedResults: 1, inProgress: 0 },
  lastActivity: { submissionDate: '2026-11-09T10:00:00.000Z', assessmentDate: null }
};

function renderPage(page) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter>{page}</MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Teaching Assistant pages', () => {
  it('shows class-scoped student progress from the monitoring endpoint', async () => {
    vi.spyOn(lmsApi, 'listClasses').mockResolvedValue({
      data: { classes: [classSection] }
    });
    const monitoring = vi.spyOn(lmsApi, 'getTaStudentMonitoring').mockResolvedValue({
      data: {
        classId: classSection.id,
        classSection: { sectionCode: classSection.sectionCode, name: classSection.name, courseCode: 'IT-401' },
        assignments: [{ id: 1 }, { id: 2 }],
        assessments: [{ id: 1 }],
        students: [student]
      }
    });

    renderPage(<TaStudentProgressPage />);

    expect(await screen.findByText('Student Progress')).toBeInTheDocument();
    expect(await screen.findByText('Maya Lin')).toBeInTheDocument();
    expect(screen.getByText('50% (2/4 lessons)')).toBeInTheDocument();
    await waitFor(() => expect(monitoring).toHaveBeenCalledWith(String(classSection.id)));
  });

  it('shows activity fields instead of reusing the roster page', async () => {
    vi.spyOn(lmsApi, 'listClasses').mockResolvedValue({
      data: { classes: [classSection] }
    });
    vi.spyOn(lmsApi, 'getTaStudentMonitoring').mockResolvedValue({
      data: {
        classId: classSection.id,
        classSection: { sectionCode: classSection.sectionCode, name: classSection.name, courseCode: 'IT-401' },
        assignments: [],
        assessments: [],
        students: [student]
      }
    });

    renderPage(<TaStudentActivityPage />);

    expect(await screen.findByText('Student Activity')).toBeInTheDocument();
    expect(await screen.findByText('Maya Lin')).toBeInTheDocument();
    expect(await screen.findByRole('columnheader', { name: 'Latest Assignment Submission' })).toBeInTheDocument();
    expect(screen.getByText('No attempts')).toBeInTheDocument();
    expect(screen.queryByText('Student Roster')).not.toBeInTheDocument();
  });

  it('submits the selected escalation category and displays queue errors with retry', async () => {
    vi.spyOn(lmsApi, 'listSubmissions').mockResolvedValue({
      data: {
        submissions: [{
          id: 41,
          student: { firstName: 'Maya', lastName: 'Lin' },
          assignment: { title: 'Lab 1' },
          status: 'submitted'
        }]
      }
    });
    const review = vi.spyOn(lmsApi, 'reviewSubmission').mockResolvedValue({
      message: 'TA review saved.'
    });

    renderPage(<TaSubmissionsReviewPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Preliminary Review' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Flag this submission/ }));
    fireEvent.change(screen.getByLabelText('Flag Category'), { target: { value: 'technical_issue' } });
    fireEvent.change(screen.getByPlaceholderText('Describe why instructor review is needed...'), {
      target: { value: 'Device access failed' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save TA Review' }));

    await waitFor(() => expect(review).toHaveBeenCalledWith(41, expect.objectContaining({
      flaggedForInstructorReview: true,
      flagCategory: 'technical_issue',
      flagReason: 'Device access failed'
    })));

    vi.restoreAllMocks();
    vi.spyOn(lmsApi, 'listSubmissions').mockRejectedValue(new Error('Queue unavailable'));
    renderPage(<TaSubmissionsReviewPage />);
    expect(await screen.findByText('Unable to Retrieve Data')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry Request' })).toBeInTheDocument();
  });
});
