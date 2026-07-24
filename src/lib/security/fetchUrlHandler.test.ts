import { describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createFetchUrlHandler } from '../../../api/fetch-url';

type LookupResult = Array<{ address: string; family: number }>;

function request(body: unknown, method = 'POST'): VercelRequest {
  return {
    method,
    body,
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer test-jwt',
    },
  } as VercelRequest;
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
  requestImpl?: (url: URL, resolved: LookupResult[number], signal: AbortSignal) => Promise<Response>;
  lookupImpl?: (hostname: string) => Promise<LookupResult>;
  verifyJwtImpl?: (jwt: string) => Promise<string>;
  rateLimitImpl?: (userId: string) => Promise<{ allowed: boolean; retryAfterSeconds: number }>;
  timeoutMs?: number;
  maxBytes?: number;
}) {
  return createFetchUrlHandler({
    requestImpl: options?.requestImpl ?? vi.fn(async () => new Response('<html><body>Readable resume profile content</body></html>', {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    })),
    lookupImpl: options?.lookupImpl ?? vi.fn(async () => [{ address: '93.184.216.34', family: 4 }]),
    verifyJwtImpl: options?.verifyJwtImpl ?? vi.fn(async () => 'user-123'),
    rateLimitImpl: options?.rateLimitImpl ?? vi.fn(async () => ({ allowed: true, retryAfterSeconds: 0 })),
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
    'http://198.51.100.7/example',
    'http://203.0.113.7/example',
    'http://[::1]/private',
    'http://[::ffff:127.0.0.1]/private',
    'http://[2001:db8::1]/example',
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
    const requestImpl = vi.fn(async () => new Response(null, {
      status: 302,
      headers: { location: 'http://127.0.0.1/admin' },
    }));
    const result = await invoke(handlerWith({ requestImpl }), { url: 'https://example.com/resume' });
    expect(result).toMatchObject({ statusCode: 400, body: { code: 'BLOCKED_URL' } });
    expect(requestImpl).toHaveBeenCalledTimes(1);
  });

  it('blocks an oversized response', async () => {
    const requestImpl = vi.fn(async () => new Response('x'.repeat(2048), {
      status: 200,
      headers: { 'content-type': 'text/plain', 'content-length': '2048' },
    }));
    expect(await invoke(handlerWith({ requestImpl, maxBytes: 128 }), { url: 'https://example.com/large' }))
      .toMatchObject({ statusCode: 413, body: { code: 'RESPONSE_TOO_LARGE' } });
  });

  it('rejects non-readable content before returning it to the client', async () => {
    const requestImpl = vi.fn(async () => new Response('not a page', {
      status: 200,
      headers: { 'content-type': 'application/pdf' },
    }));
    expect(await invoke(handlerWith({ requestImpl }), { url: 'https://example.com/resume.pdf' }))
      .toMatchObject({ statusCode: 415, body: { code: 'UNREADABLE_CONTENT' } });
  });

  it('returns a controlled timeout error without exposing internals', async () => {
    const requestImpl = vi.fn(async (_url: URL, _resolved: LookupResult[number], signal: AbortSignal) => {
      await new Promise<void>((_, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('secret upstream detail', 'AbortError')));
      });
      throw new Error('unreachable');
    });
    const result = await invoke(handlerWith({ requestImpl, timeoutMs: 1 }), { url: 'https://example.com/slow' });
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

  it('requires a valid Appwrite JWT before importing', async () => {
    const { res, result } = response();
    await handlerWith()(request({ url: 'https://example.com' }, 'POST') as VercelRequest, res);
    expect(result.statusCode).toBe(200);

    const missingAuth = request({ url: 'https://example.com' });
    missingAuth.headers.authorization = undefined;
    const second = response();
    await handlerWith()(missingAuth, second.res);
    expect(second.result).toMatchObject({ statusCode: 401, body: { code: 'AUTH_REQUIRED' } });

    const rejected = await invoke(handlerWith({
      verifyJwtImpl: vi.fn(async () => { throw new Error('private auth detail'); }),
    }), { url: 'https://example.com' });
    expect(rejected).toMatchObject({ statusCode: 401, body: { code: 'AUTH_REQUIRED' } });
    expect(JSON.stringify(rejected.body)).not.toContain('private auth detail');
  });

  it('fails closed when the durable rate limiter is unavailable or exceeded', async () => {
    const unavailable = await invoke(handlerWith({
      rateLimitImpl: vi.fn(async () => { throw new Error('database detail'); }),
    }), { url: 'https://example.com' });
    expect(unavailable).toMatchObject({ statusCode: 503, body: { code: 'RATE_LIMIT_UNAVAILABLE' } });

    const limited = await invoke(handlerWith({
      rateLimitImpl: vi.fn(async () => ({ allowed: false, retryAfterSeconds: 42 })),
    }), { url: 'https://example.com' });
    expect(limited).toMatchObject({ statusCode: 429, body: { code: 'RATE_LIMITED' } });
  });

  it('allows requests again after a limiter window resets', async () => {
    let attempts = 0;
    const rateLimitImpl = vi.fn(async () => {
      attempts += 1;
      return attempts === 1
        ? { allowed: false, retryAfterSeconds: 1 }
        : { allowed: true, retryAfterSeconds: 0 };
    });
    expect(await invoke(handlerWith({ rateLimitImpl }), { url: 'https://example.com' }))
      .toMatchObject({ statusCode: 429, body: { code: 'RATE_LIMITED' } });
    expect(await invoke(handlerWith({ rateLimitImpl }), { url: 'https://example.com' }))
      .toMatchObject({ statusCode: 200 });
  });

  it('pins the request to the address that passed DNS validation and re-resolves redirects', async () => {
    const lookupImpl = vi.fn(async (hostname: string) => [{
      address: hostname === 'example.com' ? '93.184.216.34' : '142.250.74.14',
      family: 4,
    }]);
    const requestImpl = vi.fn(async (url: URL, resolved: LookupResult[number]) => {
      if (url.hostname === 'example.com') {
        expect(resolved.address).toBe('93.184.216.34');
        return new Response(null, { status: 302, headers: { location: 'https://www.example.net/resume' } });
      }
      expect(resolved.address).toBe('142.250.74.14');
      return new Response('safe content', { status: 200, headers: { 'content-type': 'text/plain' } });
    });

    const result = await invoke(handlerWith({ lookupImpl, requestImpl }), { url: 'https://example.com/start' });
    expect(result).toMatchObject({ statusCode: 200, body: { html: 'safe content' } });
    expect(lookupImpl).toHaveBeenCalledTimes(2);
  });
});
