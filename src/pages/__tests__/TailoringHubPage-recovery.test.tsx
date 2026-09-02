import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  addTailorHistory: vi.fn(),
  createDocument: vi.fn(),
  executeAI: vi.fn(async (action: () => Promise<unknown>) => action()),
  navigate: vi.fn(),
  saveJobDescription: vi.fn(),
  setJobDescription: vi.fn(),
  setSearchParams: vi.fn(),
  plan: {
    isPro: true,
    isPremium: false,
    isLoading: false,
  },
  tailor: vi.fn(),
  resume: {
    id: 'resume-1',
    contactInfo: { fullName: 'Jane Doe', email: 'jane@example.com', phone: '', location: '' },
    summary: 'Software engineer with production experience.',
    skills: ['JavaScript'],
    experience: [],
    education: [],
    projects: [],
    certifications: [],
    awards: [],
    templateId: 'modern',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
  useSearchParams: () => [new URLSearchParams('mode=workspace'), mocks.setSearchParams],
}));
vi.mock('zustand/react/shallow', () => ({ useShallow: (selector: unknown) => selector }));
vi.mock('@/store/resumeStore', () => {
  const state = {
    currentResumeId: 'resume-1',
    jobDescription: 'This role requires JavaScript, Node.js, reliability, testing, and production ownership.',
    setJobDescription: mocks.setJobDescription,
    addTailorHistory: mocks.addTailorHistory,
    setCurrentResumeId: vi.fn(),
    tailorHistory: [],
  };
  const useResumeStore = Object.assign(
    (selector: (value: typeof state) => unknown) => selector(state),
    { getState: () => state },
  );
  return { useResumeStore };
});
vi.mock('@/hooks/useResumes', () => ({
  useResumes: () => ({ data: [{ $id: 'resume-1', title: 'Master Resume' }], isLoading: false }),
  dbToResumeData: () => mocks.resume,
}));
vi.mock('@/hooks/useJobs', () => ({ useJob: () => ({ data: null }) }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { $id: 'user-1' } }) }));
vi.mock('@/hooks/usePlan', () => ({ usePlan: () => mocks.plan }));
vi.mock('@/hooks/useAIAction', () => ({ useAIAction: () => ({ execute: mocks.executeAI }) }));
vi.mock('@/hooks/useImportJob', () => ({ useImportJob: () => ({ mutateAsync: vi.fn(), isPending: false }) }));
vi.mock('@/hooks/useRedactedResume', () => ({ useRedactedResume: () => mocks.resume }));
vi.mock('@/hooks/useTailorHistory', () => ({ useAppwriteTailoredIds: () => ({ data: new Set() }) }));
vi.mock('@/hooks/useSavedJobPostings', () => ({ isSyntheticSavedJobId: () => false }));
vi.mock('@/lib/resumeLineage', () => ({ isTailoredResume: () => false }));
vi.mock('@/lib/templateMigration', () => ({ migrateTemplateId: (value: string) => value }));
vi.mock('@/lib/aiTailor', () => ({ tailorResumeWithProgress: mocks.tailor }));
vi.mock('@/lib/tailorMerge', () => ({
  buildMergedResume: vi.fn(),
  hasMeaningfulChanges: vi.fn(),
}));
vi.mock('@/lib/appwrite', () => ({
  databases: { createDocument: mocks.createDocument },
  DATABASE_ID: 'main',
  ID: { unique: () => 'new-resume' },
}));
vi.mock('@/lib/appwrite-collections', () => ({ COLLECTIONS: { RESUMES: 'resumes' } }));
vi.mock('@/lib/invalidate-ai-credit-queries', () => ({ invalidateAiCreditQueries: vi.fn() }));
vi.mock('@/lib/activityTracker', () => ({ activityTracker: { setActiveFeature: vi.fn() } }));
vi.mock('@/lib/haptics', () => ({ haptics: { medium: vi.fn(), success: vi.fn(), error: vi.fn(), selection: vi.fn() } }));
vi.mock('@/lib/tailoringResumeMetadata', () => ({ buildTailoringCustomization: vi.fn() }));
vi.mock('@/lib/tailorJobContext', () => ({ saveTailorJobDescriptionForResume: mocks.saveJobDescription }));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

vi.mock('@/components/jobs/ImportJobSheet', () => ({ ImportJobSheet: () => null }));
vi.mock('@/components/job-match/ResumeChip', () => ({ ResumeChip: () => <div>Master Resume</div> }));
vi.mock('@/components/job-match/JobInputArea', () => ({ JobInputArea: () => <div>Job input</div> }));
vi.mock('@/components/job-match/JobPreviewCard', () => ({ JobPreviewCard: () => null }));
vi.mock('@/components/job-match/MatchAnalysisSummary', () => ({
  MatchAnalysisSummary: () => null,
  extractKeywords: () => [],
  computeMatch: () => ({ score: 50 }),
}));
vi.mock('@/components/job-match/JobMatchAdvancedOptions', () => ({ JobMatchAdvancedOptions: () => null }));
vi.mock('@/components/job-match/JobMatchSavedJobsList', () => ({ JobMatchSavedJobsList: () => null }));
vi.mock('@/components/job-match/JobMatchHistoryList', () => ({ JobMatchHistoryList: () => null }));
vi.mock('@/components/tailoring-hub/TailoringHubLanding', () => ({ TailoringHubLanding: () => null }));
vi.mock('@/components/job-match/JobMatchProgressStage', () => ({
  JobMatchProgressStage: () => <div data-testid="tailoring-loading">Tailoring in progress</div>,
}));
vi.mock('@/components/job-match/JobMatchStickyFooter', () => ({
  JobMatchStickyFooter: ({ onTailor }: { onTailor: () => void }) => (
    <button type="button" onClick={onTailor}>Tailor now</button>
  ),
}));

import TailoringHubPage from '@/pages/TailoringHubPage';

describe('TailoringHubPage bounded failure recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.plan.isPro = true;
    mocks.plan.isPremium = false;
    mocks.plan.isLoading = false;
    sessionStorage.setItem('wr_tailoring_session', '1');
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('blocks Free users from the direct Tailoring Hub route', () => {
    mocks.plan.isPro = false;

    render(<TailoringHubPage />);

    expect(screen.getByText('Smart Tailoring is a Pro feature')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tailor now' })).not.toBeInTheDocument();
  });

  it('allows Pro and Ultimate users through the direct Tailoring Hub route', () => {
    const plans = [
      { isPro: true, isPremium: false },
      { isPro: true, isPremium: true },
    ];

    for (const plan of plans) {
      mocks.plan.isPro = plan.isPro;
      mocks.plan.isPremium = plan.isPremium;

      const { unmount } = render(<TailoringHubPage />);
      expect(screen.getByRole('button', { name: 'Tailor now' })).toBeInTheDocument();
      unmount();
    }
  });

  it('ends loading, blocks duplicate clicks, allows retry, and never saves or navigates after timeout', async () => {
    let rejectFirst: (reason: unknown) => void = () => {};
    mocks.tailor
      .mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectFirst = reject; }))
      .mockRejectedValueOnce(Object.assign(new Error('bounded timeout'), { code: 'timeout', status: 504 }));

    render(<TailoringHubPage />);
    const startButton = screen.getByRole('button', { name: 'Tailor now' });
    fireEvent.click(startButton);
    fireEvent.click(startButton);

    expect(await screen.findByTestId('tailoring-loading')).toBeInTheDocument();
    expect(mocks.tailor).toHaveBeenCalledTimes(1);

    await act(async () => {
      rejectFirst(Object.assign(new Error('bounded timeout'), { code: 'timeout', status: 504 }));
    });

    expect(await screen.findByText('Tailoring reached its time limit. Your resume was not changed. Please retry.'))
      .toBeInTheDocument();
    expect(screen.queryByTestId('tailoring-loading')).not.toBeInTheDocument();
    expect(mocks.createDocument).not.toHaveBeenCalled();
    expect(mocks.addTailorHistory).not.toHaveBeenCalled();
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(mocks.saveJobDescription).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Retry tailoring' }));
    await waitFor(() => expect(mocks.tailor).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByTestId('tailoring-loading')).not.toBeInTheDocument());
    expect(mocks.createDocument).not.toHaveBeenCalled();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it('aborts active tailoring on unmount and prevents downstream child resume creation and navigation upon late resolution', async () => {
    let capturedSignal: AbortSignal | undefined;
    let resolveTailoring!: (val: unknown) => void;
    const tailorPromise = new Promise((resolve) => {
      resolveTailoring = resolve;
    });

    mocks.tailor.mockImplementationOnce((_r, _j, _p, _i, signal: AbortSignal) => {
      capturedSignal = signal;
      return tailorPromise;
    });

    const { unmount } = render(<TailoringHubPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Tailor now' }));

    expect(await screen.findByTestId('tailoring-loading')).toBeInTheDocument();
    expect(mocks.tailor).toHaveBeenCalledTimes(1);
    expect(capturedSignal).toBeDefined();
    expect(capturedSignal?.aborted).toBe(false);

    // Unmount while tailoring is in-flight
    unmount();

    // Signal must be aborted immediately upon unmount
    expect(capturedSignal?.aborted).toBe(true);

    // Resolve late tailoring result after unmount
    await act(async () => {
      resolveTailoring({
        summary: 'Late tailored summary',
        keyChanges: [],
        bulletTransformations: [],
        missingSkills: [],
        jobParsed: { title: 'Software Engineer', company: 'Acme Inc' },
      });
    });

    // Downstream side effects must NOT be triggered
    expect(mocks.createDocument).not.toHaveBeenCalled();
    expect(mocks.addTailorHistory).not.toHaveBeenCalled();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it('prevents addTailorHistory and navigate when abort occurs while child createDocument is already pending', async () => {
    let resolveCreateDoc!: (val: unknown) => void;
    const createDocPromise = new Promise((resolve) => {
      resolveCreateDoc = resolve;
    });

    const tailorMerge = await import('@/lib/tailorMerge');
    vi.mocked(tailorMerge.buildMergedResume).mockReturnValueOnce({
      ...mocks.resume,
      summary: 'Tailored summary with changes',
    } as any);
    vi.mocked(tailorMerge.hasMeaningfulChanges).mockReturnValueOnce({
      hasChanges: true,
      changedSections: ['summary'],
    } as any);

    mocks.tailor.mockResolvedValueOnce({
      summary: 'Tailored summary',
      overallScore: { before: 50, after: 90 },
      keyChanges: [{ section: 'summary', description: 'Updated' }],
      bulletTransformations: [],
      missingSkills: [],
      jobParsed: { title: 'Software Engineer', company: 'Acme Inc' },
    });

    mocks.createDocument.mockImplementationOnce(() => createDocPromise);

    const { unmount } = render(<TailoringHubPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Tailor now' }));

    // Wait for createDocument to be invoked
    await waitFor(() => {
      expect(mocks.createDocument).toHaveBeenCalled();
    });

    // Unmount while createDocument is pending
    unmount();

    // Now createDocument resolves late
    await act(async () => {
      resolveCreateDoc({ $id: 'late_child_resume_doc' });
    });

    // Neither history nor navigation must execute
    expect(mocks.addTailorHistory).not.toHaveBeenCalled();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});
