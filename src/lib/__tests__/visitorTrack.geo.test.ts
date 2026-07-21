import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('visitor tracking browser geo behavior', () => {
  const originalFetch = globalThis.fetch;

  let createExecutionMock: ReturnType<typeof vi.fn>;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    localStorage.clear();
    sessionStorage.clear();

    createExecutionMock = vi.fn().mockResolvedValue({ $id: 'exec_1' });
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ country: 'US' }),
    });
    globalThis.fetch = fetchMock as typeof fetch;

    vi.doMock('@/lib/appwrite', () => ({
      functions: {
        createExecution: (...args: unknown[]) => createExecutionMock(...args),
      },
    }));
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.doUnmock('@/lib/appwrite');
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
  });

  it('does not call GeoJS or include browser-resolved country in page view events', async () => {
    const { trackPageView } = await import('../visitorTrack');

    trackPageView('/dashboard');

    expect(fetchMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(2000);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(createExecutionMock).toHaveBeenCalledWith(
      'track-visitor-event',
      expect.any(String),
      true,
    );

    const payload = JSON.parse(String(createExecutionMock.mock.calls[0][1])) as {
      events: Array<{ event_type: string; country?: string | null }>;
    };
    const pageView = payload.events.find((event) => event.event_type === 'page_view');

    expect(pageView).toBeDefined();
    expect(pageView).not.toHaveProperty('country');
  });

  it('keeps DevKit routes excluded from browser visitor tracking', async () => {
    const { trackPageView } = await import('../visitorTrack');

    trackPageView('/devkit');
    await vi.advanceTimersByTimeAsync(10_000);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(createExecutionMock).not.toHaveBeenCalled();
  });
});

describe('GeoJS CSP scope', () => {
  it('does not add GeoJS to browser CSP allowlists', () => {
    for (const file of ['vite.config.ts', 'public/_headers']) {
      expect(readRepoFile(file), file).not.toContain('get.geojs.io');
    }
  });

  it('keeps the browser visitor tracker free of direct GeoJS requests', () => {
    expect(readRepoFile('src/lib/visitorTrack.ts')).not.toContain('get.geojs.io');
    expect(readRepoFile('src/lib/visitorTrack.ts')).not.toContain('country.json');
  });
});
