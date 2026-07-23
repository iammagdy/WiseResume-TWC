import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const adminHub = require('../../../appwrite-hubs/admin-devkit-data/src/main.js') as {
  _test: {
    normalizeBroadcastInput: (body: Record<string, unknown>) => {
      title: string;
      message: string;
      severity: string;
      expiresAt: string | null;
    };
    toAdminBroadcast: (document: Record<string, unknown>) => Record<string, unknown>;
  };
};

describe('admin broadcast model', () => {
  it('normalizes publish input to the canonical fields', () => {
    expect(adminHub._test.normalizeBroadcastInput({
      title: '  Notice  ',
      body: '  Message  ',
      severity: 'critical',
      expires_at: '2026-07-25T12:00:00Z',
    })).toEqual({
      title: 'Notice',
      message: 'Message',
      severity: 'critical',
      expiresAt: '2026-07-25T12:00:00.000Z',
    });
  });

  it('rejects malformed required fields and dates', () => {
    expect(() => adminHub._test.normalizeBroadcastInput({
      title: '',
      body: 'Message',
    })).toThrow('title and body are required');
    expect(() => adminHub._test.normalizeBroadcastInput({
      title: 'Notice',
      body: 'Message',
      expires_at: 'not-a-date',
    })).toThrow('expires_at must be a valid ISO date');
  });

  it('preserves inactive state for owner management', () => {
    expect(adminHub._test.toAdminBroadcast({
      $id: 'broadcast-1',
      title: 'Notice',
      body: 'Message',
      severity: 'warning',
      active: false,
      created_at: '2026-07-24T12:00:00.000Z',
    })).toMatchObject({
      id: 'broadcast-1',
      active: false,
      severity: 'warning',
    });
  });

  it('writes and expires the canonical active field through owner-only actions', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'appwrite-hubs/admin-devkit-data/src/main.js'),
      'utf8',
    );
    expect(source).toContain("action === 'publish-broadcast'");
    expect(source).toContain("action === 'expire-broadcast'");
    expect(source).toContain('active: true');
    expect(source).toContain('{ active: false }');
  });
});
