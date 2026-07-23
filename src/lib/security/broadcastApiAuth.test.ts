import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from '../../../api/broadcasts';

function responseHarness() {
  const state: {
    status: number;
    body: unknown;
    headers: Record<string, string>;
  } = {
    status: 200,
    body: null,
    headers: {},
  };

  const response = {
    setHeader(name: string, value: string) {
      state.headers[name] = value;
      return response;
    },
    status(code: number) {
      state.status = code;
      return response;
    },
    json(body: unknown) {
      state.body = body;
      return response;
    },
  } as unknown as VercelResponse;

  return { response, state };
}

describe('broadcast API authentication', () => {
  it('rejects unsupported methods', async () => {
    const { response, state } = responseHarness();
    await handler({ method: 'POST', headers: {} } as VercelRequest, response);
    expect(state.status).toBe(405);
  });

  it('rejects requests without an Appwrite JWT', async () => {
    const { response, state } = responseHarness();
    await handler({ method: 'GET', headers: {} } as VercelRequest, response);
    expect(state.status).toBe(401);
    expect(state.headers['Cache-Control']).toBe('private, no-store');
  });

  it('uses authenticated server delivery without querying active in Appwrite', () => {
    const apiSource = readFileSync(resolve(process.cwd(), 'api/broadcasts.ts'), 'utf8');
    const fetchSource = readFileSync(resolve(process.cwd(), 'server/broadcastsFetch.ts'), 'utf8');
    expect(apiSource).toContain("'X-Appwrite-JWT': jwt");
    expect(apiSource).toContain('/account');
    expect(fetchSource).toContain('Query.limit(100)');
    expect(fetchSource).not.toContain("Query.equal('active'");
    expect(fetchSource).not.toContain('Query.select');
  });
});
