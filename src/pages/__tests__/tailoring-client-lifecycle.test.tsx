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
  client: { subscribe: vi.fn(() => () => {}) },
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
    currentResume: {
      id: 'resume_1',
      title: 'Master Resume',
      summary: 'Software Engineer',
      contactInfo: { fullName: 'John Doe', email: 'john@example.com' },
      experience: [],
      education: [],
      skills: ['React', 'TypeScript'],
      certifications: [],
      awards: [],
      projects: [],
      templateId: 'modern',
    },
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
    coverLetterHistory: [],
    setGeneratedCoverLetter: vi.fn(),
    addCoverLetterHistory: vi.fn(),
    deleteCoverLetterHistoryEntry: vi.fn(),
    clearCoverLetterHistory: vi.fn(),
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

    it('does not remain stuck in analyzing phase when sheet is closed and reopened', async () => {
      mocks.tailorResumeWithProgress.mockImplementation(
        () => new Promise(() => {}) // never resolves
      );

      const { rerender } = render(
        <QueryClientProvider client={queryClient}>
          <SetTargetJobSheet open={true} onOpenChange={vi.fn()} resume={mockResume} />
        </QueryClientProvider>
      );

      fireEvent.click(screen.getByText('Try a sample job'));
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /analyze/i }));
      });

      // Sheet is analyzing
      expect(screen.queryByRole('button', { name: /analyze/i })).not.toBeInTheDocument();

      // Close sheet
      rerender(
        <QueryClientProvider client={queryClient}>
          <SetTargetJobSheet open={false} onOpenChange={vi.fn()} resume={mockResume} />
        </QueryClientProvider>
      );

      // Reopen sheet
      rerender(
        <QueryClientProvider client={queryClient}>
          <SetTargetJobSheet open={true} onOpenChange={vi.fn()} resume={mockResume} />
        </QueryClientProvider>
      );

      // Must be back in input phase with Analyze button visible
      expect(screen.getByRole('button', { name: /analyze/i })).toBeInTheDocument();
    });

    it('preserves new request transient state when an old aborted request settles late', async () => {
      let resolveRunA!: (val: unknown) => void;
      const promiseA = new Promise((resolve) => { resolveRunA = resolve; });
      let resolveRunB!: (val: unknown) => void;
      const promiseB = new Promise((resolve) => { resolveRunB = resolve; });

      let callCount = 0;
      mocks.tailorResumeWithProgress.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? promiseA : promiseB;
      });

      const { rerender } = render(
        <QueryClientProvider client={queryClient}>
          <SetTargetJobSheet open={true} onOpenChange={vi.fn()} resume={mockResume} />
        </QueryClientProvider>
      );

      fireEvent.click(screen.getByText('Try a sample job'));
      // Run A
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /analyze/i }));
      });

      // Abort run A by closing
      rerender(
        <QueryClientProvider client={queryClient}>
          <SetTargetJobSheet open={false} onOpenChange={vi.fn()} resume={mockResume} />
        </QueryClientProvider>
      );

      // Reopen and start Run B
      rerender(
        <QueryClientProvider client={queryClient}>
          <SetTargetJobSheet open={true} onOpenChange={vi.fn()} resume={mockResume} />
        </QueryClientProvider>
      );

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /analyze/i }));
      });

      // Run B is analyzing
      expect(screen.queryByRole('button', { name: /analyze/i })).not.toBeInTheDocument();

      // Now run A settles late
      await act(async () => {
        resolveRunA({
          summary: 'A summary',
          overallScore: { before: 50, after: 70 },
        });
      });

      // Run B must remain active (analyzing), not reset by run A's finally
      expect(screen.queryByRole('button', { name: /analyze/i })).not.toBeInTheDocument();
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

    it('does not remain stuck on processing when closed and reopened before 300ms timer', async () => {
      mocks.tailorResumeWithProgress.mockImplementation(
        () => new Promise(() => {}) // never resolves
      );

      const { rerender } = render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <QuickTailorSheet open={true} onOpenChange={vi.fn()} />
          </MemoryRouter>
        </QueryClientProvider>
      );

      // Step 1: select resume
      await act(async () => {
        fireEvent.click(screen.getByText('Master CV'));
      });

      // Step 2: sample job
      const sampleBtn = await screen.findByText('Try a sample job');
      await act(async () => {
        fireEvent.click(sampleBtn);
      });

      // Step 2: Tailor Now -> enters processing
      const tailorBtn = await screen.findByRole('button', { name: /tailor now/i });
      await act(async () => {
        fireEvent.click(tailorBtn);
      });

      // Close sheet (open -> false)
      rerender(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <QuickTailorSheet open={false} onOpenChange={vi.fn()} />
          </MemoryRouter>
        </QueryClientProvider>
      );

      // Immediately reopen BEFORE 300ms timer elapses (no timer advance)
      rerender(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <QuickTailorSheet open={true} onOpenChange={vi.fn()} />
          </MemoryRouter>
        </QueryClientProvider>
      );

      // Must NOT be stuck in processing step; select-resume is displayed
      expect(screen.getByText('Choose Your Resume')).toBeInTheDocument();
    });
  });

  describe('TailorSheet', () => {
    it('aborts active tailoring on close, does not remain stuck on reopen, and ignores late resolution', async () => {
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

      const TailorSheet = (await import('@/components/editor/TailorSheet')).TailorSheet;

      const { rerender } = render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <TailorSheet open={true} onOpenChange={vi.fn()} currentResumeId="resume_1" />
          </MemoryRouter>
        </QueryClientProvider>
      );

      const tailorBtn = screen.getByRole('button', { name: /tailor my resume/i });
      await act(async () => {
        fireEvent.click(tailorBtn);
      });

      expect(capturedSignal).toBeInstanceOf(AbortSignal);
      expect(capturedSignal?.aborted).toBe(false);

      // Close sheet
      rerender(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <TailorSheet open={false} onOpenChange={vi.fn()} currentResumeId="resume_1" />
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(capturedSignal?.aborted).toBe(true);

      // Reopen sheet
      rerender(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <TailorSheet open={true} onOpenChange={vi.fn()} currentResumeId="resume_1" />
          </MemoryRouter>
        </QueryClientProvider>
      );

      // Must not be stuck in Tailoring Resume... state
      expect(screen.getByRole('button', { name: /tailor my resume/i })).toBeInTheDocument();
      expect(screen.queryByText(/tailoring resume\.\.\./i)).not.toBeInTheDocument();

      // Resolve late
      await act(async () => {
        resolveTailoring({
          summary: 'Late tailored summary',
          overallScore: { before: 50, after: 90 },
        });
      });

      // No results shown for abandoned run
      expect(screen.queryByText(/resume tailored!/i)).not.toBeInTheDocument();
    }, 15000);
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

    it('prevents stale finally from clearing active run state on cancel followed by immediate retry', async () => {
      let resolveRunA!: (val: unknown) => void;
      const promiseA = new Promise((resolve) => { resolveRunA = resolve; });
      let capturedSignalA: AbortSignal | undefined;
      let capturedSignalB: AbortSignal | undefined;

      let runCount = 0;
      mocks.tailorResumeWithProgress.mockImplementation(
        (_r: unknown, _j: unknown, onProgress: any, _i: unknown, signal?: AbortSignal) => {
          runCount++;
          if (runCount === 1) {
            capturedSignalA = signal;
            onProgress({ progress: 20, message: 'Analyzing job...', step: 'analyzing' });
            return promiseA;
          } else {
            capturedSignalB = signal;
            onProgress({ progress: 40, message: 'Optimizing skills...', step: 'optimizing_skills' });
            return new Promise(() => {}); // keeps running
          }
        }
      );

      const realDateNow = Date.now;
      let mockedTime = realDateNow();
      const dateSpy = vi.spyOn(Date, 'now').mockImplementation(() => mockedTime);

      const TailorPage = (await import('@/pages/TailorPage')).default;

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <TailorPage />
          </MemoryRouter>
        </QueryClientProvider>
      );

      // Step 1 -> Continue
      await act(async () => {
        fireEvent.click(await screen.findByRole('button', { name: /continue/i }));
      });
      // Step 2 -> Continue
      await act(async () => {
        fireEvent.click(await screen.findByRole('button', { name: /continue/i }));
      });
      // Step 3 -> Continue
      await act(async () => {
        fireEvent.click(await screen.findByRole('button', { name: /continue/i }));
      });

      // Step 4 -> Run optimizer (Run A)
      const tailorBtnA = await screen.findByRole('button', { name: /run optimizer/i });
      await act(async () => {
        fireEvent.click(tailorBtnA);
      });

      expect(capturedSignalA).toBeInstanceOf(AbortSignal);
      expect(capturedSignalA?.aborted).toBe(false);

      // Advance mock time by 6 seconds so Cancel button renders
      mockedTime += 6000;

      // Find and click Cancel button (pick first of responsive instances)
      const cancelBtns = await screen.findAllByRole('button', { name: /cancel/i });
      await act(async () => {
        fireEvent.click(cancelBtns[0]);
      });

      expect(capturedSignalA?.aborted).toBe(true);

      // Immediately start Run B
      const tailorBtnB = await screen.findByRole('button', { name: /run optimizer/i });
      await act(async () => {
        fireEvent.click(tailorBtnB);
      });

      expect(capturedSignalB).toBeInstanceOf(AbortSignal);
      expect(capturedSignalB?.aborted).toBe(false);

      // Now Run A settles late
      await act(async () => {
        resolveRunA({
          summary: 'A summary',
          overallScore: { before: 50, after: 70 },
        });
      });

      // Run B must remain active (isTailoring=true), NOT cleared by Run A's finally
      expect(capturedSignalB?.aborted).toBe(false);
      expect(screen.queryByRole('button', { name: /run optimizer/i })).not.toBeInTheDocument();

      dateSpy.mockRestore();
    }, 15000);
  });
});
