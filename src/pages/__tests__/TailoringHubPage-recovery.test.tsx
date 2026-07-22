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
    sessionStorage.setItem('wr_tailoring_session', '1');
    vi.spyOn(console, 'error').mockImplementation(() => {});
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
});
