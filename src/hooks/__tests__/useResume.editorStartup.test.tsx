import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '@/hooks/useAuth';
import { useResume } from '@/hooks/useResumes';

const appwriteMocks = vi.hoisted(() => ({
  getDocument: vi.fn(),
}));

vi.mock('@/lib/appwrite', () => ({
  DATABASE_ID: 'main',
  databases: {
    getDocument: appwriteMocks.getDocument,
  },
  ID: { unique: vi.fn(() => 'new-id') },
  Query: {
    equal: vi.fn(),
    orderDesc: vi.fn(),
    limit: vi.fn(),
  },
}));

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function ResumeProbe({ resumeId, timeoutMs = 5_000 }: { resumeId: string; timeoutMs?: number }) {
  const query = useResume(resumeId, { requestTimeoutMs: timeoutMs, retry: false });
  if (query.error) return <div>request-error</div>;
  if (query.data === null) return <div>resume-missing</div>;
  if (query.data) return <div>{query.data.title}</div>;
  return <div>loading</div>;
}

describe('useResume Editor startup behavior', () => {
  beforeEach(() => {
    appwriteMocks.getDocument.mockReset();
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'user-a' } } as ReturnType<typeof useAuth>);
  });

  it('loads the requested document once and deduplicates same-ID rerenders', async () => {
    appwriteMocks.getDocument.mockResolvedValue({
      $id: 'resume-a',
      user_id: 'user-a',
      title: 'Resume A',
    });
    const wrapper = makeWrapper();
    const view = render(<ResumeProbe resumeId="resume-a" />, { wrapper });

    expect(await screen.findByText('Resume A')).toBeInTheDocument();
    view.rerender(<ResumeProbe resumeId="resume-a" />);

    expect(appwriteMocks.getDocument).toHaveBeenCalledTimes(1);
    expect(appwriteMocks.getDocument).toHaveBeenCalledWith('main', expect.any(String), 'resume-a');
  });

  it('loads a new document when the requested resume ID changes', async () => {
    appwriteMocks.getDocument.mockImplementation(async (_db, _collection, resumeId) => ({
      $id: resumeId,
      user_id: 'user-a',
      title: resumeId === 'resume-a' ? 'Resume A' : 'Resume B',
    }));
    const wrapper = makeWrapper();
    const view = render(<ResumeProbe resumeId="resume-a" />, { wrapper });
    expect(await screen.findByText('Resume A')).toBeInTheDocument();

    view.rerender(<ResumeProbe resumeId="resume-b" />);
    expect(await screen.findByText('Resume B')).toBeInTheDocument();

    expect(appwriteMocks.getDocument).toHaveBeenCalledTimes(2);
    expect(appwriteMocks.getDocument.mock.calls.map((call) => call[2])).toEqual(['resume-a', 'resume-b']);
  });

  it('does not automatically duplicate a failed blocking request', async () => {
    appwriteMocks.getDocument.mockRejectedValue(new Error('temporary network failure'));
    render(<ResumeProbe resumeId="resume-a" />, { wrapper: makeWrapper() });

    expect(await screen.findByText('request-error')).toBeInTheDocument();
    await waitFor(() => expect(appwriteMocks.getDocument).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('resume-missing')).not.toBeInTheDocument();
  });

  it('turns an unbounded document read into a bounded error without retrying', async () => {
    appwriteMocks.getDocument.mockImplementation(() => new Promise(() => undefined));
    render(<ResumeProbe resumeId="resume-a" timeoutMs={20} />, { wrapper: makeWrapper() });

    expect(await screen.findByText('request-error')).toBeInTheDocument();
    expect(appwriteMocks.getDocument).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('resume-missing')).not.toBeInTheDocument();
  });

  it('keeps a real 404 distinct from a temporary request failure', async () => {
    appwriteMocks.getDocument.mockRejectedValue({ code: 404 });
    render(<ResumeProbe resumeId="missing-resume" />, { wrapper: makeWrapper() });

    expect(await screen.findByText('resume-missing')).toBeInTheDocument();
    expect(screen.queryByText('request-error')).not.toBeInTheDocument();
  });
});
