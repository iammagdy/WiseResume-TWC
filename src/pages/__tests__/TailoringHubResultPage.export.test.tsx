/* eslint-disable @typescript-eslint/no-explicit-any -- focused page wiring tests use mocked app data */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResumeData } from '@/types/resume';
import { mockLocation, mockParams } from '@/test/mocks/router';

const mockResumesState = vi.hoisted(() => ({
  docs: [] as any[],
  isLoading: false,
}));

const mockStoreState = vi.hoisted(() => ({
  setCurrentResumeId: vi.fn(),
  setCurrentResume: vi.fn(),
  setSelectedTemplate: vi.fn(),
  tailorHistory: [] as any[],
}));

const appwriteMocks = vi.hoisted(() => ({
  listDocuments: vi.fn().mockResolvedValue({ documents: [] }),
  updateDocument: vi.fn().mockResolvedValue({}),
}));

const exportResumePdfFromDataMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue(new Blob(['%PDF-1.7\nTAILORED_MARKER'], { type: 'application/pdf' })),
);
const generateAndDownloadDOCXMock = vi.hoisted(() => vi.fn().mockResolvedValue(true));
const downloadFileMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ success: true, outcome: 'triggered', method: 'anchor' }),
);
const validatePdfBlobMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  message: vi.fn(),
}));
const hapticsMock = vi.hoisted(() => ({
  light: vi.fn(),
  medium: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@/hooks/useResumes', () => ({
  useResumes: () => ({
    data: mockResumesState.docs,
    isLoading: mockResumesState.isLoading,
  }),
  dbToResumeData: (doc: any): ResumeData => ({
    id: doc.$id,
    contactInfo: doc.contactInfo ?? {
      fullName: doc.fullName ?? 'Tailored Candidate',
      email: 'tailored@example.com',
      phone: '123',
      location: 'Cairo',
    },
    summary: doc.summary ?? '',
    experience: doc.experience ?? [],
    education: doc.education ?? [],
    skills: doc.skills ?? [],
    certifications: doc.certifications ?? [],
    awards: doc.awards ?? [],
    projects: doc.projects ?? [],
    publications: doc.publications ?? [],
    volunteering: doc.volunteering ?? [],
    hobbies: doc.hobbies ?? [],
    references: doc.references ?? [],
    languages: doc.languages ?? [],
    templateId: doc.template ?? 'modern',
    customization: doc.customization ?? { pageFormat: 'letter', documentLocale: 'en' },
  }),
}));

vi.mock('@/store/resumeStore', () => ({
  useResumeStore: (selector: any) => (selector ? selector(mockStoreState) : mockStoreState),
}));

vi.mock('@/lib/appwrite', () => ({
  databases: {
    listDocuments: appwriteMocks.listDocuments,
    updateDocument: appwriteMocks.updateDocument,
  },
  DATABASE_ID: 'main',
  Query: {
    equal: vi.fn((field: string, value: unknown) => ({ field, value })),
    limit: vi.fn((value: number) => ({ limit: value })),
    orderDesc: vi.fn((field: string) => ({ orderDesc: field })),
  },
}));

vi.mock('@/lib/appwrite-collections', () => ({
  COLLECTIONS: {
    resumes: 'resumes',
    tailor_history: 'tailor_history',
    job_applications: 'job_applications',
    cover_letters: 'cover_letters',
    user_job_actions: 'user_job_actions',
  },
}));

vi.mock('@/hooks/useJobApplications', () => ({
  useJobApplicationMutations: () => ({
    updateApplication: { mutateAsync: vi.fn().mockResolvedValue({}) },
  }),
}));

vi.mock('@/hooks/useCoverLetters', () => ({
  useCoverLetter: () => ({ data: null }),
  parseCoverLetter: vi.fn(),
}));

vi.mock('@/lib/tailoringResumeMetadata', () => ({
  tailoringMetadataFromResume: () => null,
}));

vi.mock('@/lib/tailorJobContext', () => ({
  resolveTailorJobContext: (ctx: any) => ({
    jobTitle: ctx.jobTitle ?? 'Product Manager',
    company: ctx.company ?? 'Acme',
    jobDescription: ctx.jobDescription ?? 'Tailored job description',
    jobUrl: ctx.jobUrl ?? null,
  }),
  buildJobApplicationDisplayName: ({ jobTitle, company, fullName }: any) =>
    [fullName, jobTitle, company].filter(Boolean).join(' - ') || 'Tailored CV',
  saveCoverLetterPrefill: vi.fn(),
  saveTailorJobDescriptionForResume: vi.fn(),
  readLinkedCoverLetterForTailoredResume: vi.fn(() => null),
  saveLinkedCoverLetterForTailoredResume: vi.fn(),
}));

vi.mock('@/components/job-match/ScaledResumePage', () => ({
  ScaledResumePage: ({ resume }: { resume: ResumeData }) => (
    <div data-testid="scaled-resume">{resume.summary}</div>
  ),
}));

vi.mock('@/components/job-match/TailorResumeCompare', () => ({
  TailorResumeCompare: ({ afterResume }: { afterResume: ResumeData }) => (
    <div data-testid="compare-resume">{afterResume.summary}</div>
  ),
}));

vi.mock('@/components/job-match/TailorResultCoverLetterPanel', () => ({
  TailorResultCoverLetterPanel: () => <div data-testid="cover-letter-panel" />,
}));

vi.mock('@/components/job-match/TailorQuickPdfExportDialog', () => ({
  TailorQuickPdfExportDialog: ({ open, resume, resumeDocId }: any) =>
    open ? (
      <div data-testid="designed-pdf-dialog">
        {resumeDocId}:{resume?.summary}
      </div>
    ) : null,
}));

vi.mock('@/lib/exportResumePdf', () => ({
  exportResumePdfFromData: exportResumePdfFromDataMock,
  OffscreenRenderTimeoutError: class OffscreenRenderTimeoutError extends Error {},
}));

vi.mock('@/lib/docxGenerator', () => ({
  generateAndDownloadDOCX: generateAndDownloadDOCXMock,
}));

vi.mock('@/lib/downloadUtils', () => ({
  downloadFile: downloadFileMock,
  validatePdfBlob: validatePdfBlobMock,
}));

vi.mock('sonner', () => ({
  toast: toastMock,
}));

vi.mock('@/lib/haptics', () => ({
  haptics: hapticsMock,
  default: hapticsMock,
}));

async function renderResultPage() {
  const { default: TailoringHubResultPage } = await import('@/pages/TailoringHubResultPage');
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/tailoring-hub/result/tailored-1']}>
        <Routes>
          <Route path="/tailoring-hub/result/:resumeId" element={<TailoringHubResultPage />} />
          <Route path="/tailoring-hub" element={<div>Tailoring Hub</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function setTailoredResume() {
  mockResumesState.docs = [
    {
      $id: 'tailored-1',
      title: 'Tailored Product Manager Resume',
      template: 'classic',
      summary: 'TAILORED_MARKER product leadership summary',
      fullName: 'Taylor Tailored',
      experience: [
        {
          id: 'exp-1',
          company: 'Acme',
          position: 'Product Manager',
          startDate: '2020',
          endDate: 'Present',
          current: true,
          description: 'TAILORED_MARKER shipped product work',
          achievements: ['TAILORED_MARKER lifted activation'],
        },
      ],
      skills: ['Roadmapping', 'TAILORED_MARKER'],
    },
    {
      $id: 'source-1',
      title: 'Source Resume',
      template: 'minimal',
      summary: 'SOURCE_MARKER original summary',
      fullName: 'Source Candidate',
      experience: [],
      skills: ['SOURCE_MARKER'],
    },
  ];
}

describe('TailoringHubResultPage export actions', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    for (const key of Object.keys(mockParams)) {
      delete mockParams[key];
    }
    mockParams.resumeId = 'tailored-1';
    mockLocation.pathname = '/tailoring-hub/result/tailored-1';
    mockLocation.search = '';
    mockLocation.hash = '';
    mockLocation.state = null;
    mockResumesState.docs = [];
    mockResumesState.isLoading = false;
    mockStoreState.tailorHistory = [];
    appwriteMocks.listDocuments.mockResolvedValue({ documents: [] });
    appwriteMocks.updateDocument.mockResolvedValue({});
    exportResumePdfFromDataMock.mockResolvedValue(
      new Blob(['%PDF-1.7\nTAILORED_MARKER'], { type: 'application/pdf' }),
    );
    generateAndDownloadDOCXMock.mockResolvedValue(true);
    downloadFileMock.mockResolvedValue({ success: true, outcome: 'triggered', method: 'anchor' });
    validatePdfBlobMock.mockResolvedValue(undefined);
    Object.defineProperty(window, 'open', { value: vi.fn(), writable: true, configurable: true });
  });

  it('exports ATS PDF directly from the tailored result using the route document id', async () => {
    setTailoredResume();
    await renderResultPage();

    fireEvent.click(screen.getByRole('button', { name: 'ATS PDF' }));

    await waitFor(() => expect(exportResumePdfFromDataMock).toHaveBeenCalledTimes(1));
    const [resumeArg, templateArg, optionsArg] = exportResumePdfFromDataMock.mock.calls[0];
    expect(resumeArg).toEqual(expect.objectContaining({
      id: 'tailored-1',
      summary: expect.stringContaining('TAILORED_MARKER'),
    }));
    expect(JSON.stringify(resumeArg)).not.toContain('SOURCE_MARKER');
    expect(templateArg).toBe('classic');
    expect(optionsArg).toEqual(expect.objectContaining({
      atsMode: true,
      showPageNumbers: false,
      showBranding: true,
      renderTimeoutMs: 8000,
    }));
    await waitFor(() => expect(downloadFileMock).toHaveBeenCalledTimes(1));
    expect(validatePdfBlobMock).toHaveBeenCalledWith(expect.any(Blob));
    expect(downloadFileMock).toHaveBeenCalledWith(expect.objectContaining({
      blob: expect.any(Blob),
      fileName: 'Taylor_Tailored_-_Product_Manager_-_Acme_Resume_ATS.pdf',
      mimeType: 'application/pdf',
    }));
    expect(window.open).not.toHaveBeenCalled();
    expect(toastMock.success).toHaveBeenCalledWith('ATS PDF download started');
  });

  it('shows an ATS export error without starting a download when generation fails', async () => {
    setTailoredResume();
    exportResumePdfFromDataMock.mockRejectedValueOnce(new Error('PDF render failed'));
    await renderResultPage();

    fireEvent.click(screen.getByRole('button', { name: 'ATS PDF' }));

    await waitFor(() => expect(toastMock.error).toHaveBeenCalled());
    expect(downloadFileMock).not.toHaveBeenCalled();
  });

  it('blocks rapid duplicate ATS PDF exports while the first export is pending', async () => {
    setTailoredResume();
    let resolvePdf!: (blob: Blob) => void;
    exportResumePdfFromDataMock.mockReturnValueOnce(new Promise<Blob>((resolve) => {
      resolvePdf = resolve;
    }));
    await renderResultPage();

    const atsButton = screen.getByRole('button', { name: 'ATS PDF' });
    fireEvent.click(atsButton);
    fireEvent.click(atsButton);

    await waitFor(() => expect(exportResumePdfFromDataMock).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('button', { name: 'Preparing...' })).toBeDisabled();

    resolvePdf(new Blob(['%PDF-1.7\nTAILORED_MARKER'], { type: 'application/pdf' }));
    await waitFor(() => expect(downloadFileMock).toHaveBeenCalledTimes(1));
  });

  it('exports DOCX from the tailored resume, not the stale/source resume', async () => {
    setTailoredResume();
    await renderResultPage();

    fireEvent.click(screen.getByRole('button', { name: 'Word' }));

    await waitFor(() => expect(generateAndDownloadDOCXMock).toHaveBeenCalledTimes(1));
    const [resumeArg] = generateAndDownloadDOCXMock.mock.calls[0];
    expect(resumeArg).toEqual(expect.objectContaining({
      id: 'tailored-1',
      summary: expect.stringContaining('TAILORED_MARKER'),
    }));
    expect(JSON.stringify(resumeArg)).not.toContain('SOURCE_MARKER');
    expect(window.open).not.toHaveBeenCalled();
    expect(toastMock.success).toHaveBeenCalledWith('Word document download started');
  });

  it('shows a DOCX error when generation or download reports failure', async () => {
    setTailoredResume();
    generateAndDownloadDOCXMock.mockResolvedValueOnce(false);
    await renderResultPage();

    fireEvent.click(screen.getByRole('button', { name: 'Word' }));

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith('Failed to download Word document. Please try again.');
    });
  });

  it('blocks rapid duplicate DOCX exports while the first export is pending', async () => {
    setTailoredResume();
    let resolveDocx!: (success: boolean) => void;
    generateAndDownloadDOCXMock.mockReturnValueOnce(new Promise<boolean>((resolve) => {
      resolveDocx = resolve;
    }));
    await renderResultPage();

    const docxButton = screen.getByRole('button', { name: 'Word' });
    fireEvent.click(docxButton);
    fireEvent.click(docxButton);

    await waitFor(() => expect(generateAndDownloadDOCXMock).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('button', { name: 'Preparing...' })).toBeDisabled();

    resolveDocx(true);
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Word document download started'));
  });

  it('keeps Designed PDF on the existing tailored resume dialog path', async () => {
    setTailoredResume();
    await renderResultPage();

    fireEvent.click(screen.getByRole('button', { name: 'Download CV PDF' }));

    expect(await screen.findByTestId('designed-pdf-dialog')).toHaveTextContent(
      'tailored-1:TAILORED_MARKER product leadership summary',
    );
  });

  it('does not crash when the tailored resume is missing', async () => {
    await renderResultPage();

    expect(screen.getByText('Resume not found.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ATS PDF' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Word' })).not.toBeInTheDocument();
  });
});
