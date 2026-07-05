import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RemoteJobsPage from '../RemoteJobsPage';

// Mock @/lib/aiTailor
let resolveTailor: any = null;
vi.mock('@/lib/aiTailor', () => ({
  tailorResumeWithProgress: vi.fn().mockImplementation(async (r, j, onProgress) => {
    onProgress({ progress: 50 });
    return new Promise((resolve) => {
      resolveTailor = () => {
        resolve({
          summary: 'Tailored summary',
          skills: [],
          experience: [],
          overallScore: { before: 50, after: 80 },
          keyChanges: [],
          bulletTransformations: [],
          missingSkills: [],
        });
      };
    });
  }),
  generateCoverLetter: vi.fn().mockResolvedValue('Sample cover letter content'),
}));

// Mock @/lib/appwrite
vi.mock('@/lib/appwrite', () => ({
  databases: {
    createDocument: vi.fn().mockResolvedValue({ $id: 'tailored_123' }),
    listDocuments: vi.fn().mockResolvedValue({ documents: [] }),
    updateDocument: vi.fn().mockResolvedValue({}),
  },
  DATABASE_ID: 'main',
  ID: { unique: () => 'unique_id' },
  Query: {
    equal: (field: string, value: any) => `${field}==${value}`,
    limit: (l: number) => `limit:${l}`,
  },
}));

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

// Mock useResumes
vi.mock('@/hooks/useResumes', () => ({
  useResumes: () => ({
    data: [
      {
        $id: 'resume_1',
        title: 'Master CV',
        is_master: true,
        template: 'classic',
        contactInfo: { fullName: 'Test User', email: 'test@example.com', phone: '123', location: 'Cairo' },
        experience: [],
        education: [],
        skills: [],
        certifications: [],
        awards: [],
        projects: [],
        summary: 'Master CV Summary',
      },
    ],
    isLoading: false,
  }),
  useSetMasterCV: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
  }),
  dbToResumeData: (r: any) => r,
}));

// Mock useAICreditsMutations
vi.mock('@/hooks/useAICredits', () => ({
  useAICreditsMutations: () => ({
    checkCredits: vi.fn().mockResolvedValue(true),
  }),
}));

// Mock useJobApplicationMutations
vi.mock('@/hooks/useJobApplications', () => ({
  useJobApplicationMutations: () => ({
    updateApplication: {
      mutateAsync: vi.fn().mockResolvedValue({}),
    },
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
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <RemoteJobsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Remote Jobs Feed')).toBeInTheDocument();
    expect(screen.getByText('Senior React Developer')).toBeInTheDocument();
    expect(screen.getByText('TechCorp')).toBeInTheDocument();
    expect(screen.getByText('Apply on website')).toBeInTheDocument();
    expect(screen.getByText('Fast Tailor')).toBeInTheDocument();
    expect(screen.getByText('Configure Hub')).toBeInTheDocument();
  });

  it('displays the loading state when Fast Tailor is clicked', async () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <RemoteJobsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const button = screen.getByText('Fast Tailor');
    act(() => {
      button.click();
    });

    expect(screen.getByText('Generating Tailoring Package')).toBeInTheDocument();

    // Resolve the promise to finalize the component state and cleanup
    await act(async () => {
      if (resolveTailor) resolveTailor();
    });
  });
});
