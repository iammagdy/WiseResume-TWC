/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { mockNavigate } from '@/test/mocks/router';

const mockResumeState = vi.hoisted(() => ({
  currentResume: null as any,
  selectedTemplate: 'modern',
  generatedCoverLetter: null,
  coverLetterJobContext: null,
  setSelectedTemplate: vi.fn((template: string) => {
    mockResumeState.selectedTemplate = template;
  }),
  setCurrentResume: vi.fn((resume: any) => {
    mockResumeState.currentResume = resume;
  }),
  setCurrentResumeId: vi.fn(),
  updateResume: vi.fn(),
}));

const mockResumeQuery = vi.hoisted(() => ({
  data: null as any,
  isLoading: false,
  isFetching: false,
}));
const useResumeMock = vi.hoisted(() => vi.fn(() => mockResumeQuery));
const persistTemplateMock = vi.hoisted(() => vi.fn().mockResolvedValue({ $id: 'resume-1' }));

const generateAndDownloadDOCX = vi.hoisted(() => vi.fn().mockResolvedValue(true));
const generateNativePDFMock = vi.hoisted(() => vi.fn().mockResolvedValue(new Blob(['%PDF-1.7\n' + 'x'.repeat(128)], { type: 'application/pdf' })));
const downloadFileMock = vi.hoisted(() => vi.fn().mockResolvedValue({ success: true, outcome: 'triggered', method: 'anchor' }));

vi.mock('@/store/resumeStore', () => ({
  useResumeStore: () => mockResumeState,
}));

vi.mock('@/hooks/useResumes', () => ({
  useResume: useResumeMock,
  useResumeMutations: () => ({ updateResume: { mutateAsync: persistTemplateMock } }),
  dbToResumeData: vi.fn((doc: any) => ({
    id: doc.$id,
    templateId: doc.template || 'modern',
    title: doc.title,
    summary: doc.summary || '',
    contactInfo: typeof doc.contact_info === 'string' ? JSON.parse(doc.contact_info) : doc.contact_info,
    experience: typeof doc.experience === 'string' ? JSON.parse(doc.experience) : (doc.experience || []),
    education: typeof doc.education === 'string' ? JSON.parse(doc.education) : (doc.education || []),
    skills: typeof doc.skills === 'string' ? JSON.parse(doc.skills) : (doc.skills || []),
    certifications: [],
    awards: [],
    projects: [],
    publications: [],
    volunteering: [],
    hobbies: [],
    references: [],
    languages: [],
  })),
}));

vi.mock('@/components/editor/TemplateSelector', () => ({
  TemplateSelector: ({ open, onTemplateApplied }: { open: boolean; onTemplateApplied?: (id: string) => void }) => open ? (
    <button onClick={() => onTemplateApplied?.('classic')}>Apply Classic</button>
  ) : null,
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => ({ profile: null }),
}));

vi.mock('@/hooks/useExportProgress', () => ({
  useExportProgress: () => ({
    exportProgress: null,
    onProgress: vi.fn(),
    reset: vi.fn(),
  }),
}));

vi.mock('@/hooks/useRateApp', () => ({
  useRateApp: () => ({
    incrementPositiveActions: vi.fn(),
    shouldPromptForRating: false,
    openFeedback: vi.fn(),
    dismissRating: vi.fn(),
  }),
}));

vi.mock('@/components/templates/ModernTemplate', () => ({
  ModernTemplate: () => <div data-testid="modern-template">Modern Template</div>,
}));

vi.mock('@/lib/docxGenerator', () => ({
  generateAndDownloadDOCX,
}));

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

vi.mock('@/lib/appwrite', () => ({
  storage: { createFile: vi.fn(), getFileView: vi.fn(() => '') },
  ID: { unique: vi.fn(() => 'unique-id') },
}));

vi.mock('@/lib/appwrite-collections', () => ({
  BUCKETS: { avatars: 'avatars' },
}));

vi.mock('@/lib/nativePdfGenerator', () => ({
  generateNativePDF: generateNativePDFMock,
  generateCoverLetterNativePDF: vi.fn().mockResolvedValue(new Blob(['pdf'])),
  mergePDFBlobs: vi.fn().mockResolvedValue(new Blob(['pdf'])),
  PDFServerUnavailableError: class PDFServerUnavailableError extends Error {},
}));

vi.mock('@/lib/downloadUtils', () => ({
  downloadFile: downloadFileMock,
  validatePdfBlob: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/components/editor/PreviewScaledWrapper', () => ({
  PreviewScaledWrapper: ({ children, resumeRef }: { children: React.ReactNode; resumeRef: React.RefObject<HTMLDivElement> }) => (
    <div ref={resumeRef as any}>{children}</div>
  ),
}));

let PreviewPage: typeof import('@/pages/PreviewPage').default;

function renderPreview(initialPath: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/preview" element={<PreviewPage />} />
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function makeResumeDoc() {
  return {
    $id: 'resume-1',
    template: 'modern',
    title: 'Tailored Resume',
    summary: 'Tailored summary',
    contact_info: JSON.stringify({
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      phone: '123',
      location: 'Cairo',
    }),
    experience: JSON.stringify([
      {
        id: 'exp-1',
        company: 'Acme',
        position: 'Engineer',
        startDate: '2022',
        endDate: 'Present',
        current: true,
        description: 'Built features',
        achievements: ['Raised activation'],
      },
    ]),
    education: '[]',
    skills: '["React"]',
  };
}

describe('PreviewPage URL bootstrap', () => {
  beforeAll(async () => {
    PreviewPage = (await import('@/pages/PreviewPage')).default;
  });

  beforeEach(() => {
    vi.useRealTimers();
    mockResumeState.currentResume = null;
    mockResumeState.selectedTemplate = 'modern';
    mockResumeState.setCurrentResume.mockClear();
    mockResumeState.setCurrentResumeId.mockClear();
    mockResumeState.setSelectedTemplate.mockClear();
    mockResumeState.updateResume.mockClear();
    mockResumeQuery.data = null;
    mockResumeQuery.isLoading = false;
    mockResumeQuery.isFetching = false;
    generateAndDownloadDOCX.mockClear();
    generateNativePDFMock.mockClear();
    downloadFileMock.mockClear();
    useResumeMock.mockClear();
    persistTemplateMock.mockClear();
    (globalThis as any).ResizeObserver = class {
      observe() {}
      disconnect() {}
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads a resume from ?id in a fresh tab and hydrates the store', async () => {
    mockResumeQuery.data = makeResumeDoc();

    const view = renderPreview('/preview?id=resume-1');

    await waitFor(() => {
      expect(mockResumeState.setCurrentResume).toHaveBeenCalled();
      expect(mockResumeState.setCurrentResumeId).toHaveBeenCalledWith('resume-1');
      expect(mockResumeState.setSelectedTemplate).toHaveBeenCalledWith('modern');
    });

    view.rerender(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}>
        <MemoryRouter initialEntries={['/preview?id=resume-1']}>
          <Routes>
            <Route path="/preview" element={<PreviewPage />} />
            <Route path="/dashboard" element={<div>Dashboard</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  it('waits for resume bootstrap before running docx export and does not redirect during load', async () => {
    vi.useFakeTimers();
    mockResumeQuery.isLoading = true;

    const view = renderPreview('/preview?id=resume-1&action=docx');

    await act(async () => {
      vi.advanceTimersByTime(1200);
    });

    expect(generateAndDownloadDOCX).not.toHaveBeenCalled();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();

    mockResumeQuery.data = makeResumeDoc();
    mockResumeQuery.isLoading = false;

    await act(async () => {
      view.rerender(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}>
          <MemoryRouter initialEntries={['/preview?id=resume-1&action=docx']}>
            <Routes>
              <Route path="/preview" element={<PreviewPage />} />
              <Route path="/dashboard" element={<div>Dashboard</div>} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      );
      await Promise.resolve();
    });

    expect(mockResumeState.setCurrentResume).toHaveBeenCalled();

    view.rerender(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}>
        <MemoryRouter initialEntries={['/preview?id=resume-1&action=docx']}>
          <Routes>
            <Route path="/preview" element={<PreviewPage />} />
            <Route path="/dashboard" element={<div>Dashboard</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await act(async () => {
      vi.advanceTimersByTime(900);
    });

    expect(mockResumeState.currentResume?.id).toBe('resume-1');
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  // --- E-2 fix: auto-export action fires AFTER bootstrap, not before ---

  function makeQueryClient() {
    return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  }

  function makeTree(path: string) {
    return (
      <QueryClientProvider client={makeQueryClient()}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/preview" element={<PreviewPage />} />
            <Route path="/dashboard" element={<div>Dashboard</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  }

  it('action=docx waits for bootstrap and requires a user click before exporting', async () => {
    vi.useFakeTimers();
    mockResumeQuery.isLoading = true;

    const view = render(makeTree('/preview?id=resume-1&action=docx'));

    // Bootstrap pending — timer should not have fired even after advancing time
    await act(async () => { vi.advanceTimersByTime(1200); });
    expect(generateAndDownloadDOCX).not.toHaveBeenCalled();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();

    // Complete bootstrap
    mockResumeQuery.data = makeResumeDoc();
    mockResumeQuery.isLoading = false;

    await act(async () => {
      view.rerender(makeTree('/preview?id=resume-1&action=docx'));
      await Promise.resolve();
    });

    expect(mockResumeState.setCurrentResume).toHaveBeenCalled();

    view.rerender(makeTree('/preview?id=resume-1&action=docx'));

    // Advance past the 800ms export timer
    await act(async () => { vi.advanceTimersByTime(900); });
    // Flush async chain inside handleExport (dynamic import + mockResolvedValue)
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(generateAndDownloadDOCX).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Download DOCX' }));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(generateAndDownloadDOCX).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  it('action=download waits for bootstrap and requires a user click before exporting', async () => {
    vi.useFakeTimers();
    mockResumeQuery.isLoading = true;

    const view = render(makeTree('/preview?id=resume-1&action=download'));

    await act(async () => { vi.advanceTimersByTime(1200); });
    expect(generateNativePDFMock).not.toHaveBeenCalled();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();

    mockResumeQuery.data = makeResumeDoc();
    mockResumeQuery.isLoading = false;

    await act(async () => {
      view.rerender(makeTree('/preview?id=resume-1&action=download'));
      await Promise.resolve();
    });

    expect(mockResumeState.setCurrentResume).toHaveBeenCalled();

    view.rerender(makeTree('/preview?id=resume-1&action=download'));

    await act(async () => { vi.advanceTimersByTime(900); });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(generateNativePDFMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(generateNativePDFMock).toHaveBeenCalledTimes(1);
    expect(downloadFileMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  it('action=ats-pdf waits for bootstrap and requires a user click before exporting', async () => {
    vi.useFakeTimers();
    mockResumeQuery.isLoading = true;

    const view = render(makeTree('/preview?id=resume-1&action=ats-pdf'));

    await act(async () => { vi.advanceTimersByTime(1200); });
    expect(generateNativePDFMock).not.toHaveBeenCalled();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();

    mockResumeQuery.data = makeResumeDoc();
    mockResumeQuery.isLoading = false;

    await act(async () => {
      view.rerender(makeTree('/preview?id=resume-1&action=ats-pdf'));
      await Promise.resolve();
    });

    expect(mockResumeState.setCurrentResume).toHaveBeenCalled();

    view.rerender(makeTree('/preview?id=resume-1&action=ats-pdf'));

    await act(async () => { vi.advanceTimersByTime(900); });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(generateNativePDFMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Download ATS PDF' }));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(generateNativePDFMock).toHaveBeenCalledTimes(1);
    // ATS mode passes atsMode: true
    expect(generateNativePDFMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ atsMode: true }),
    );
    expect(downloadFileMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  it('action reveals a user-activated fallback after the 800ms timer', async () => {
    vi.useFakeTimers();
    // Bootstrap completes immediately (data already available)
    mockResumeQuery.data = makeResumeDoc();
    mockResumeQuery.isLoading = false;

    const view = render(makeTree('/preview?id=resume-1&action=docx'));

    // Allow bootstrap effects to run
    await act(async () => { await Promise.resolve(); });

    view.rerender(makeTree('/preview?id=resume-1&action=docx'));

    // At 400ms (before 800ms timer) — export must NOT have fired yet
    await act(async () => { vi.advanceTimersByTime(400); });
    expect(generateAndDownloadDOCX).not.toHaveBeenCalled();

    // At 900ms — timer fires, export must have happened
    await act(async () => { vi.advanceTimersByTime(500); });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(generateAndDownloadDOCX).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Download DOCX' })).toBeInTheDocument();
  });

  it('normal /preview without action does not trigger auto-export', async () => {
    vi.useFakeTimers();
    mockResumeQuery.data = makeResumeDoc();
    mockResumeQuery.isLoading = false;

    render(makeTree('/preview?id=resume-1'));

    await act(async () => { vi.advanceTimersByTime(1200); });
    await act(async () => { await Promise.resolve(); });

    expect(generateAndDownloadDOCX).not.toHaveBeenCalled();
    expect(generateNativePDFMock).not.toHaveBeenCalled();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  it('stale Zustand currentResume is replaced by URL-id resume after bootstrap', async () => {
    const staleResume = {
      id: 'stale-resume',
      contactInfo: { fullName: 'Stale User' },
      experience: [],
      education: [],
      skills: [],
    };
    mockResumeState.currentResume = staleResume as any;
    mockResumeQuery.data = makeResumeDoc(); // resume-1
    mockResumeQuery.isLoading = false;

    render(makeTree('/preview?id=resume-1'));

    await waitFor(() => {
      expect(mockResumeState.setCurrentResume).toHaveBeenCalled();
    });

    // After bootstrap, the store should hold resume-1, not the stale resume
    expect(mockResumeState.currentResume?.id).toBe('resume-1');
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  it('fetches the URL resume even when the store already contains the same id', () => {
    mockResumeState.currentResume = { ...makeResumeDoc(), id: 'resume-1', summary: 'Stale summary' } as any;
    render(makeTree('/preview?id=resume-1'));

    expect(useResumeMock).toHaveBeenCalledWith('resume-1');
  });

  it('does not re-bootstrap stale database data when the user changes template', async () => {
    mockResumeQuery.data = makeResumeDoc();
    const view = render(makeTree('/preview?id=resume-1'));

    await waitFor(() => expect(mockResumeState.setCurrentResume).toHaveBeenCalledTimes(1));
    mockResumeState.selectedTemplate = 'classic';
    view.rerender(makeTree('/preview?id=resume-1'));

    expect(mockResumeState.setCurrentResume).toHaveBeenCalledTimes(1);
  });

  it('persists a template selected from preview', async () => {
    mockResumeState.currentResume = {
      ...makeResumeDoc(),
      id: 'resume-1',
      templateId: 'modern',
      contactInfo: JSON.parse(makeResumeDoc().contact_info),
      experience: [], education: [], skills: [],
    } as any;
    render(makeTree('/preview'));

    fireEvent.click(screen.getByRole('button', { name: 'Change' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply Classic' }));

    await waitFor(() => expect(persistTemplateMock).toHaveBeenCalledWith({
      resumeId: 'resume-1',
      updates: { templateId: 'classic' },
    }));
  });

  it('renders clear error page and dashboard button when bootstrap query fails', async () => {
    mockResumeQuery.data = null;
    mockResumeQuery.isLoading = false;
    mockResumeQuery.isFetching = false;
    (mockResumeQuery as any).isError = true;

    renderPreview('/preview?id=invalid-resume-id');

    expect(await screen.findByText('Resume Not Found')).toBeInTheDocument();
    expect(screen.getByText(/The resume you are trying to view does not exist/i)).toBeInTheDocument();

    const btn = screen.getByRole('button', { name: 'Go to Dashboard' });
    expect(btn).toBeInTheDocument();

    mockNavigate.mockClear();
    fireEvent.click(btn);
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');

    (mockResumeQuery as any).isError = false;
  });
});
