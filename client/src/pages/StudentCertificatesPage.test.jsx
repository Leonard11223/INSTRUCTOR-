import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { lmsApi } from '../services/api';
import { StudentCertificatesPage } from './StudentPages';

vi.mock('../services/api', () => ({
  lmsApi: {
    listCertificates: vi.fn()
  },
  extractErrorMessage: (error) => error?.message || 'Request failed'
}));

function renderCertificates() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <StudentCertificatesPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('StudentCertificatesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lmsApi.listCertificates.mockResolvedValue({
      data: {
        certificates: [{
          id: 21,
          courseCode: 'NET-201',
          courseTitle: 'Enterprise Networking and Security',
          recipientName: 'Maya Lin',
          finalScore: 94,
          certificateCode: 'AIT-2026-21',
          verificationHash: 'a'.repeat(64),
          issuedAt: '2026-10-15T00:00:00.000Z',
          status: 'active'
        }]
      }
    });
  });

  it('renders labeled metrics and a centered certificate with dynamic credential data', async () => {
    renderCertificates();

    expect(await screen.findByRole('heading', { name: 'Certificates' })).toBeInTheDocument();
    expect(screen.getByText('Courses Completed')).toBeInTheDocument();
    expect(screen.getByText('Badges Earned')).toBeInTheDocument();
    expect(screen.getByText('Verified Certificates')).toBeInTheDocument();
    expect(screen.getByText('Average Score')).toBeInTheDocument();
    const averageScoreCard = screen.getByText('Average Score').closest('.bg-white');
    expect(within(averageScoreCard).getByText('94%')).toBeInTheDocument();

    const page = screen.getByRole('heading', { name: 'Certificates' }).closest('.student-certificates-page');
    expect(page.style.getPropertyValue('--blue')).toBe('#1D4ED8');
    const courseSection = document.querySelector('.certificate-course-card');
    expect(courseSection.querySelector('.certificate-course-header')).toBeInTheDocument();
    expect(courseSection.querySelector('.certificate-badge-card')).toBeInTheDocument();
    expect(courseSection.querySelector('.student-certificate-print-target')).toBeInTheDocument();
    expect(courseSection.querySelector('.certificate-header-download-button')).toBeInTheDocument();

    const certificateTitle = screen.getByRole('heading', { name: 'Certificate of Course Completion' });
    const certificate = certificateTitle.closest('.certificate-inner');
    expect(certificate).toHaveClass('text-center');
    expect(within(certificate).getByText('Maya Lin')).toBeInTheDocument();
    expect(within(certificate).getByText(/NET-201: Enterprise Networking and Security/)).toBeInTheDocument();
    expect(within(certificate).getByText(`Verification Hash: ${'a'.repeat(64)}`)).toHaveClass('break-all');
    expect(screen.getByText('Program Director')).toBeInTheDocument();
  });

  it('prints only the selected certificate and clears print state afterward', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    renderCertificates();

    const printButton = await screen.findByRole('button', { name: 'Print / Save PDF Certificate' });
    fireEvent.click(printButton);

    expect(printSpy).toHaveBeenCalledOnce();
    expect(document.body).not.toHaveClass('student-certificates-printing');
    expect(document.querySelector('[data-print-selected="true"]')).toBeNull();
    printSpy.mockRestore();
  });

  it('exports the certificate on a landscape canvas with centered credential text', async () => {
    const context = {
      beginPath: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      lineTo: vi.fn(),
      measureText: vi.fn((text) => ({ width: String(text).length * 9 })),
      moveTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      roundRect: vi.fn(),
      stroke: vi.fn(),
      strokeRect: vi.fn()
    };
    const getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
    const dataUrlSpy = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,test');
    const anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    renderCertificates();

    await screen.findByRole('heading', { name: 'Certificates' });
    const certificateDownload = document.querySelector('.certificate-actions button');
    fireEvent.click(certificateDownload);

    const canvas = getContextSpy.mock.contexts[0];
    expect(canvas).toHaveAttribute('width', '1600');
    expect(canvas).toHaveAttribute('height', '1131');
    expect(context.fillText).toHaveBeenCalledWith(
      'AETHERIA INSTITUTE OF TECHNOLOGY & NETWORKING ACADEMY',
      800,
      175
    );
    expect(context.fillText).toHaveBeenCalledWith('ACTIVE', 1428, 95);
    expect(dataUrlSpy).toHaveBeenCalledWith('image/png');
    expect(anchorClickSpy).toHaveBeenCalledOnce();
    getContextSpy.mockRestore();
    dataUrlSpy.mockRestore();
    anchorClickSpy.mockRestore();
  });
});
