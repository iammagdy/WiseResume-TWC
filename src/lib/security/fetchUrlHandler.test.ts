import { describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createFetchUrlHandler } from '../../../api/fetch-url';

type LookupResult = Array<{ address: string; family: number }>;

function request(body: unknown, method = 'POST'): VercelRequest {
  return { method, body, headers: { 'content-type': 'application/json' } } as VercelRequest;
}

function response() {
  const result: { statusCode: number; body?: unknown } = { statusCode: 200 };
  const res = {
    status: vi.fn((statusCode: number) => {
      result.statusCode = statusCode;
      return res;
    }),
    json: vi.fn((body: unknown) => {
      result.body = body;
      return res;
    }),
    setHeader: vi.fn(),
    end: vi.fn(),
  } as unknown as VercelResponse;
  return { res, result };
}

function handlerWith(options?: {
  fetchImpl?: typeof fetch;
  lookupImpl?: (hostname: string) => Promise<LookupResult>;
  timeoutMs?: number;
  maxBytes?: number;
}) {
  return createFetchUrlHandler({
    fetchImpl: options?.fetchImpl ?? vi.fn(async () => new Response('<html><body>Readable resume profile content</body></html>', {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    })),
    lookupImpl: options?.lookupImpl ?? vi.fn(async () => [{ address: '93.184.216.34', family: 4 }]),
    timeoutMs: options?.timeoutMs ?? 100,
    maxBytes: options?.maxBytes ?? 1024,
  });
}

async function invoke(handler: ReturnType<typeof handlerWith>, body: unknown, method = 'POST') {
  const { res, result } = response();
  await handler(request(body, method), res);
  return result;
}

describe('/api/fetch-url', () => {
  it('returns readable HTML from a valid public HTTPS URL', async () => {
    const result = await invoke(handlerWith(), { url: 'https://example.com/resume' });
    expect(result.statusCode).toBe(200);
    expect(result.body).toEqual({ html: '<html><body>Readable resume profile content</body></html>' });
  });

  it('rejects a missing URL', async () => {
    expect(await invoke(handlerWith(), {})).toMatchObject({ statusCode: 400, body: { code: 'INVALID_URL' } });
  });

  it('rejects an invalid URL', async () => {
    expect(await invoke(handlerWith(), { url: 'not a url' })).toMatchObject({ statusCode: 400, body: { code: 'INVALID_URL' } });
    expect(await invoke(handlerWith(), { url: 'https://not a valid host' })).toMatchObject({ statusCode: 400, body: { code: 'INVALID_URL' } });
  });

  it('blocks non-HTTP schemes', async () => {
    expect(await invoke(handlerWith(), { url: 'file:///etc/passwd' })).toMatchObject({ statusCode: 400, body: { code: 'BLOCKED_URL' } });
  });

  it.each([
    'http://localhost:3000/private',
    'http://127.0.0.1/private',
    'http://10.0.0.5/private',
    'http://169.254.169.254/latest/meta-data',
  ])('blocks local, private, and metadata target %s', async (url) => {
    expect(await invoke(handlerWith(), { url })).toMatchObject({ statusCode: 400, body: { code: 'BLOCKED_URL' } });
  });

  it('blocks a hostname that resolves to a private address', async () => {
    const result = await invoke(handlerWith({
      lookupImpl: vi.fn(async () => [{ address: '192.168.1.10', family: 4 }]),
    }), { url: 'https://public-looking.example/resume' });
    expect(result).toMatchObject({ statusCode: 400, body: { code: 'BLOCKED_URL' } });
  });

  it('validates redirects and blocks a redirect to a private IP', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, {
      status: 302,
      headers: { location: 'http://127.0.0.1/admin' },
    }));
    const result = await invoke(handlerWith({ fetchImpl }), { url: 'https://example.com/resume' });
    expect(result).toMatchObject({ statusCode: 400, body: { code: 'BLOCKED_URL' } });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('blocks an oversized response', async () => {
    const fetchImpl = vi.fn(async () => new Response('x'.repeat(2048), {
      status: 200,
      headers: { 'content-type': 'text/plain', 'content-length': '2048' },
    }));
    expect(await invoke(handlerWith({ fetchImpl, maxBytes: 128 }), { url: 'https://example.com/large' }))
      .toMatchObject({ statusCode: 413, body: { code: 'RESPONSE_TOO_LARGE' } });
  });

  it('returns a controlled timeout error without exposing internals', async () => {
    const fetchImpl = vi.fn(async (_input: URL | RequestInfo, init?: RequestInit) => {
      await new Promise<void>((_, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('secret upstream detail', 'AbortError')));
      });
      throw new Error('unreachable');
    });
    const result = await invoke(handlerWith({ fetchImpl, timeoutMs: 1 }), { url: 'https://example.com/slow' });
    expect(result).toMatchObject({ statusCode: 504, body: { code: 'FETCH_TIMEOUT' } });
    expect(JSON.stringify(result.body)).not.toContain('secret upstream detail');
  });

  it('applies the timeout while DNS resolution is still pending', async () => {
    const lookupImpl = vi.fn(async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
      return [{ address: '93.184.216.34', family: 4 }];
    });
    const result = await invoke(handlerWith({ lookupImpl, timeoutMs: 1 }), { url: 'https://example.com/slow-dns' });
    expect(result).toMatchObject({ statusCode: 504, body: { code: 'FETCH_TIMEOUT' } });
  });

  it('accepts POST only', async () => {
    expect(await invoke(handlerWith(), { url: 'https://example.com' }, 'GET'))
      .toMatchObject({ statusCode: 405, body: { code: 'METHOD_NOT_ALLOWED' } });
  });
});
