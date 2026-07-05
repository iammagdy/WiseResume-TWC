import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RemoteJobsPage from '../RemoteJobsPage';

// Mock useTranslation
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
    i18n: { language: 'en' },
  }),
}));

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { $id: 'user_123', email: 'test@example.com' },
    isAuthenticated: true,
  }),
}));

// Mock useRemoteJobs
vi.mock('@/hooks/useRemoteJobs', () => ({
  useRemoteJobs: () => ({
    jobs: [
      {
        $id: 'job_1',
        source: 'remotive',
        source_job_id: '101',
        title: 'Senior React Developer',
        company: 'TechCorp',
        location: 'Remote',
        published_at: '2026-07-05T00:00:00Z',
        description_excerpt: 'Looking for a Senior React Developer to join our team.',
        canonical_url: 'https://remotive.com/job/101',
        apply_url: 'https://remotive.com/job/101',
        tags: ['React', 'TypeScript'],
        dedupe_key: 'remotive:101',
        content_hash: 'h_123',
        fetched_at: '2026-07-05T00:00:00Z',
        status: 'active',
      },
    ],
    userActions: new Map(),
    total: 1,
    isLoading: false,
    isSynced: true,
    error: null,
    refetch: vi.fn(),
    trackAction: vi.fn().mockResolvedValue({ ok: true }),
  }),
}));

describe('RemoteJobsPage Component', () => {
  it('renders the header title and job card details', () => {
    render(
      <MemoryRouter>
        <RemoteJobsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Remote Jobs Feed')).toBeInTheDocument();
    expect(screen.getByText('Senior React Developer')).toBeInTheDocument();
    expect(screen.getByText('TechCorp')).toBeInTheDocument();
    expect(screen.getByText('Apply on website')).toBeInTheDocument();
    expect(screen.getByText('Tailor my resume for this job')).toBeInTheDocument();
  });
});
