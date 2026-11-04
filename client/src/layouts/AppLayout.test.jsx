import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import AppLayout from './AppLayout';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      primaryRole: 'student',
      fullName: 'Mina Learner',
      email: 'mina@example.edu'
    },
    logout: vi.fn()
  })
}));

vi.mock('../services/api', () => ({
  lmsApi: {
    listNotifications: vi.fn().mockResolvedValue({
      data: { notifications: [], unreadCount: 0 }
    }),
    markNotificationRead: vi.fn().mockResolvedValue({ data: { success: true } })
  }
}));

function renderLayout(route = '/student/courses') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <AppLayout />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('AppLayout sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('keeps the active route recognizable and centers controls when collapsed', () => {
    renderLayout();

    expect(screen.getByText('Aetheria NetAcad')).toBeInTheDocument();
    const collapseButton = screen.getByRole('button', { name: 'Collapse sidebar' });
    fireEvent.click(collapseButton);

    const sidebar = screen.getByRole('complementary');
    expect(sidebar.className).toContain('w-20');
    expect(screen.queryByText('Aetheria NetAcad')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View profile' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'My Learning' }).className).toContain('bg-blue-500/15');

    const navItems = [
      screen.getByRole('link', { name: 'Dashboard' }),
      screen.getByRole('button', { name: 'My Learning' }),
      screen.getByRole('button', { name: 'Coursework' }),
      screen.getByRole('link', { name: 'Grades & Progress' }),
      screen.getByRole('button', { name: 'Communication' }),
      screen.getByRole('link', { name: 'Certificates' }),
      screen.getByRole('link', { name: 'Calendar & Deadlines' }),
      screen.getByRole('link', { name: 'Help & Support' })
    ];
    navItems.forEach((item) => {
      expect(item.className).toContain('h-[60px]');
      expect(item.className).toContain('min-h-[60px]');
      expect(item.className).toContain('w-[60px]');
      expect(item.className).toContain('min-w-[60px]');
      expect(item.className).toContain('rounded-xl');
      expect(item.querySelector('svg').className.baseVal).toContain('h-6 w-6');
    });
    const collapsedNav = screen.getByRole('navigation', { name: 'Main Sidebar Navigation' });
    expect(collapsedNav.className).toContain('items-center gap-2');
    expect(screen.getByRole('link', { name: 'View profile' }).className).toContain('h-[60px]');
    expect(screen.getByRole('button', { name: 'Sign out' }).className).toContain('h-12');
  });

  it('shows delayed tooltips on hover and keyboard focus and expands groups on activation', async () => {
    renderLayout();
    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));

    const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });
    fireEvent.mouseEnter(dashboardLink);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Dashboard');
    fireEvent.mouseLeave(dashboardLink);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    const helpLink = screen.getByRole('link', { name: 'Help & Support' });
    fireEvent.focus(helpLink);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Help & Support');

    fireEvent.click(screen.getByRole('button', { name: 'My Learning' }));
    expect(screen.getByText('My Courses')).toBeInTheDocument();
    expect(screen.getByText('Aetheria NetAcad')).toBeInTheDocument();
  });
});
