import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

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

const generateAndDownloadDOCX = vi.hoisted(() => vi.fn().mockResolvedValue(true));

vi.mock('@/store/resumeStore', () => ({
  useResumeStore: () => mockResumeState,
}));

vi.mock('@/hooks/useResumes', () => ({
  useResume: vi.fn(() => mockResumeQuery),
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
    (globalThis as any).ResizeObserver = class {
      observe() {}
      disconnect() {}
    };
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
});
