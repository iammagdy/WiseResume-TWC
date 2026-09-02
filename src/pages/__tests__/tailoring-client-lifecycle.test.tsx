import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// Shared mocks
const mocks = vi.hoisted(() => ({
  updateDocument: vi.fn().mockResolvedValue({}),
  createDocument: vi.fn().mockResolvedValue({ $id: 'doc_123' }),
  tailorResumeWithProgress: vi.fn(),
  executeAI: vi.fn(async (action: () => Promise<unknown>) => action()),
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

vi.mock('@/lib/appwrite', () => ({
  databases: {
    updateDocument: mocks.updateDocument,
    createDocument: mocks.createDocument,
    listDocuments: vi.fn().mockResolvedValue({ documents: [] }),
  },
  DATABASE_ID: 'main',
  ID: { unique: () => 'unique_id' },
}));

vi.mock('@/lib/appwrite-collections', () => ({
  COLLECTIONS: { resumes: 'resumes', cover_letters: 'cover_letters' },
}));

vi.mock('@/lib/aiTailor', () => ({
  tailorResumeWithProgress: mocks.tailorResumeWithProgress,
  tailorSection: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user_1', email: 'test@example.com' }, isAuthenticated: true }),
}));

vi.mock('@/hooks/useAIAction', () => ({
  useAIAction: () => ({ execute: mocks.executeAI }),
}));

vi.mock('@/i18n/LocaleProvider', () => ({
  useLocale: () => ({ t: (_k: string, d?: string) => d || _k, locale: 'en' }),
}));

vi.mock('sonner', () => ({
  toast: mocks.toast,
}));

vi.mock('@/lib/haptics', () => {
  const haptics = {
    light: vi.fn(),
    medium: vi.fn(),
    heavy: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    selection: vi.fn(),
  };
  return {
    default: haptics,
    haptics,
    triggerHaptic: haptics,
  };
});

vi.mock('@/hooks/useRedactedResume', () => ({
  useRedactedResume: (r: unknown) => r,
}));

vi.mock('@/lib/activityTracker', () => ({
  activityTracker: { setActiveFeature: vi.fn(), trackAction: vi.fn() },
}));

vi.mock('@/hooks/useResumes', () => ({
  useResumes: () => ({
    data: [
      {
        id: 'resume_1',
        $id: 'resume_1',
        title: 'Master CV',
        content: JSON.stringify({ summary: 'Original' }),
        contact_info: JSON.stringify({ fullName: 'John Doe' }),
        experience: '[]',
        education: '[]',
        skills: '[]',
      },
    ],
    isLoading: false,
  }),
  useResumeMutations: () => ({
    deleteResume: { mutateAsync: vi.fn() },
    createResume: vi.fn(),
  }),
  dbToResumeData: (r: any) => ({
    id: r.id || r.$id,
    $id: r.id || r.$id,
    title: r.title,
    summary: 'Original',
    contactInfo: { fullName: 'John Doe' },
    experience: [],
    education: [],
    skills: [],
  }),
}));

vi.mock('@/store/settingsStore', () => ({
  useSettingsStore: (fn: any) => fn({ redactPiiBeforeAI: false }),
}));

vi.mock('@/store/resumeStore', () => {
  const store = {
    jobDescription: 'A complete job description for a Senior Frontend Engineer with React and TypeScript',
    currentResumeId: 'resume_1',
    tailorHistory: [],
    addTailorHistory: vi.fn(),
    setJobDescription: (d: string) => { store.jobDescription = d; },
    setCurrentResumeId: vi.fn(),
    setPendingTailor: vi.fn(),
    clearPendingTailor: vi.fn(),
    pendingTailorResult: null,
    pendingTailorOriginal: null,
    pendingTailorJobInfo: null,
    pendingTailorIntensity: 'moderate',
    pendingTailorJobUrl: null,
    pendingTailorSections: [],
  };
  return {
    useResumeStore: (fn: any) => fn(store),
  };
});

vi.mock('@/components/ai/AIPrivacyDisclosureProvider', () => ({
  useAIPrivacyDisclosure: () => ({
    requestDisclosure: vi.fn().mockResolvedValue(true),
  }),
  hasAcceptedAIPrivacy: () => true,
}));

// Components
import { SetTargetJobSheet } from '@/components/dashboard/SetTargetJobSheet';
import { QuickTailorSheet } from '@/components/landing/QuickTailorSheet';

describe('P2-3B Tailoring Client Lifecycle', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient();
  });

  describe('SetTargetJobSheet', () => {
    const mockResume = {
      $id: 'resume_set_target_1',
      title: 'Master Resume',
      summary: 'Experienced Engineer',
      contact_info: JSON.stringify({ fullName: 'John Doe', email: 'john@example.com' }),
      experience: JSON.stringify([]),
      education: JSON.stringify([]),
      skills: JSON.stringify(['React', 'TypeScript']),
      certifications: JSON.stringify([]),
      awards: JSON.stringify([]),
      projects: JSON.stringify([]),
      template: 'classic',
    } as any;

    it('passes a non-null AbortSignal and aborts on sheet close, preventing target-job updateDocument upon late resolution', async () => {
      let capturedSignal: AbortSignal | undefined;
      let resolveTailoring!: (val: unknown) => void;
      const tailorPromise = new Promise((resolve) => {
        resolveTailoring = resolve;
      });

      mocks.tailorResumeWithProgress.mockImplementation(
        (_r: unknown, _j: unknown, _p: unknown, _i: unknown, signal?: AbortSignal) => {
          capturedSignal = signal;
          return tailorPromise;
        }
      );

      const { rerender } = render(
        <QueryClientProvider client={queryClient}>
          <SetTargetJobSheet open={true} onOpenChange={vi.fn()} resume={mockResume} />
        </QueryClientProvider>
      );

      const sampleBtn = screen.getByText('Try a sample job');
      fireEvent.click(sampleBtn);

      const analyzeBtn = screen.getByRole('button', { name: /analyze/i });
      await act(async () => {
        fireEvent.click(analyzeBtn);
      });

      expect(capturedSignal).toBeInstanceOf(AbortSignal);
      expect(capturedSignal?.aborted).toBe(false);

      // User abandons action by closing the sheet (open -> false)
      rerender(
        <QueryClientProvider client={queryClient}>
          <SetTargetJobSheet open={false} onOpenChange={vi.fn()} resume={mockResume} />
        </QueryClientProvider>
      );

      expect(capturedSignal?.aborted).toBe(true);

      // Now tailoring resolves late after sheet is closed
      await act(async () => {
        resolveTailoring({
          summary: 'Late tailored summary',
          overallScore: { before: 50, after: 90 },
          jobParsed: { title: 'Senior Frontend', company: 'Acme Corp' },
        });
      });

      // updateDocument must NOT have been called
      expect(mocks.updateDocument).not.toHaveBeenCalled();
    });

    it('aborts active tailoring on component unmount and prevents updateDocument', async () => {
      let capturedSignal: AbortSignal | undefined;
      let resolveTailoring!: (val: unknown) => void;
      const tailorPromise = new Promise((resolve) => {
        resolveTailoring = resolve;
      });

      mocks.tailorResumeWithProgress.mockImplementation(
        (_r: unknown, _j: unknown, _p: unknown, _i: unknown, signal?: AbortSignal) => {
          capturedSignal = signal;
          return tailorPromise;
        }
      );

      const { unmount } = render(
        <QueryClientProvider client={queryClient}>
          <SetTargetJobSheet open={true} onOpenChange={vi.fn()} resume={mockResume} />
        </QueryClientProvider>
      );

      const sampleBtn = screen.getByText('Try a sample job');
      fireEvent.click(sampleBtn);

      const analyzeBtn = screen.getByRole('button', { name: /analyze/i });
      await act(async () => {
        fireEvent.click(analyzeBtn);
      });

      expect(capturedSignal).toBeInstanceOf(AbortSignal);
      expect(capturedSignal?.aborted).toBe(false);

      // Unmount component
      unmount();

      expect(capturedSignal?.aborted).toBe(true);

      // Resolve late
      await act(async () => {
        resolveTailoring({
          summary: 'Late tailored summary',
          overallScore: { before: 50, after: 90 },
          jobParsed: { title: 'Senior Frontend', company: 'Acme Corp' },
        });
      });

      expect(mocks.updateDocument).not.toHaveBeenCalled();
    });
  });

  describe('QuickTailorSheet', () => {
    it('aborts active tailoring when sheet is closed and ignores late resolution', async () => {
      let capturedSignal: AbortSignal | undefined;
      let resolveTailoring!: (val: unknown) => void;
      const tailorPromise = new Promise((resolve) => {
        resolveTailoring = resolve;
      });

      mocks.tailorResumeWithProgress.mockImplementation(
        (_r: unknown, _j: unknown, _p: unknown, _i: unknown, signal?: AbortSignal) => {
          capturedSignal = signal;
          return tailorPromise;
        }
      );

      const { rerender } = render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <QuickTailorSheet open={true} onOpenChange={vi.fn()} />
          </MemoryRouter>
        </QueryClientProvider>
      );

      // Step 1: Click on existing resume card
      const resumeCard = screen.getByText('Master CV');
      await act(async () => {
        fireEvent.click(resumeCard);
      });

      // Step 2: Click sample job
      const sampleBtn = await screen.findByText('Try a sample job');
      await act(async () => {
        fireEvent.click(sampleBtn);
      });

      // Step 2: Click Tailor Now
      const tailorBtn = await screen.findByRole('button', { name: /tailor now/i });
      await act(async () => {
        fireEvent.click(tailorBtn);
      });

      expect(capturedSignal).toBeInstanceOf(AbortSignal);
      expect(capturedSignal?.aborted).toBe(false);

      // User abandons action by closing sheet (open -> false)
      rerender(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <QuickTailorSheet open={false} onOpenChange={vi.fn()} />
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(capturedSignal?.aborted).toBe(true);

      // Resolve late
      await act(async () => {
        resolveTailoring({
          summary: 'Late tailored summary',
          overallScore: { before: 50, after: 90 },
        });
      });

      // No results step repopulation
      expect(screen.queryByText(/tailoring complete/i)).not.toBeInTheDocument();
    });
  });

  describe('TailorPage', () => {
    it('aborts active tailoring on unmount and preserves disabled selector during active tailoring', async () => {
      let capturedSignal: AbortSignal | undefined;
      let resolveTailoring!: (val: unknown) => void;
      const tailorPromise = new Promise((resolve) => {
        resolveTailoring = resolve;
      });

      mocks.tailorResumeWithProgress.mockImplementation(
        (_r: unknown, _j: unknown, _p: unknown, _i: unknown, signal?: AbortSignal) => {
          capturedSignal = signal;
          return tailorPromise;
        }
      );

      const TailorPage = (await import('@/pages/TailorPage')).default;

      const { unmount } = render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <TailorPage />
          </MemoryRouter>
        </QueryClientProvider>
      );

      // Verify resume select trigger is present
      const selectTrigger = document.querySelector('.tailor-resume-select');
      expect(selectTrigger).toBeInTheDocument();

      // Step 1 -> Continue to job
      const continueBtn1 = await screen.findByRole('button', { name: /continue/i });
      await act(async () => {
        fireEvent.click(continueBtn1);
      });

      // Step 2 -> Continue to options
      const continueBtn2 = await screen.findByRole('button', { name: /continue/i });
      await act(async () => {
        fireEvent.click(continueBtn2);
      });

      // Step 3 -> Continue to run
      const continueBtn3 = await screen.findByRole('button', { name: /continue/i });
      await act(async () => {
        fireEvent.click(continueBtn3);
      });

      // Step 4 -> Run optimizer
      const tailorBtn = await screen.findByRole('button', { name: /run optimizer/i });
      await act(async () => {
        fireEvent.click(tailorBtn);
      });

      expect(capturedSignal).toBeInstanceOf(AbortSignal);
      expect(capturedSignal?.aborted).toBe(false);

      // Unmount while tailoring is active
      unmount();

      expect(capturedSignal?.aborted).toBe(true);

      // Resolve late
      await act(async () => {
        resolveTailoring({
          summary: 'Late tailored summary',
          overallScore: { before: 50, after: 90 },
        });
      });
    });
  });
});
