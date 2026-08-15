import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const schema = require('../../../scripts/setup_ai_runtime_receipts_schema.cjs') as {
  ATTRIBUTE_SPECS: Array<{ key: string; required: boolean }>;
  assertServerOnlyCollection: (collection: { permissions?: unknown; documentSecurity?: unknown }) => void;
};

const writerPaths = [
  'appwrite-hubs/ai-gateway/src/runtime-receipts.cjs',
  'appwrite-hubs/resume-section-ai/src/runtime-receipts.cjs',
  'appwrite-hubs/job-import/src/runtime-receipts.cjs',
];

const requiredKeys = [
  'request_id',
  'hub',
  'feature_id',
  'status',
  'completed_at',
  'expires_at',
];

describe('AI runtime receipts schema contract', () => {
  it('matches the confirmed live required-attribute contract', () => {
    expect(schema.ATTRIBUTE_SPECS.filter((attribute) => attribute.required).map((attribute) => attribute.key)).toEqual(requiredKeys);
    expect(schema.ATTRIBUTE_SPECS.filter((attribute) => !attribute.required).map((attribute) => attribute.key)).toEqual([
      'execution_id',
      'provider',
      'model',
      'user_id',
      'idempotency_state',
      'error_class',
      'started_at',
      'http_status',
      'latency_ms',
      'credits_charged',
      'is_fallback',
      'is_admin_test',
    ]);
  });

  it.each(writerPaths)('materializes all required fields for %s', (writerPath) => {
    const writer = require(resolve(process.cwd(), writerPath)) as {
      buildReceipt: (input: Record<string, unknown>) => Record<string, unknown>;
    };
    const receipt = writer.buildReceipt({
      requestId: 'air_test_request',
      hub: writerPath.split('/')[1],
      feature: 'test-feature',
      status: 'completed',
      startedAt: new Date('2026-08-15T00:00:00.000Z'),
    });

    expect(receipt.request_id).toBe('air_test_request');
    expect(receipt.hub).toBeTruthy();
    expect(receipt.feature_id).toBe('test-feature');
    expect(receipt.status).toBe('completed');
    expect(receipt.completed_at).toEqual(expect.any(String));
    expect(receipt.expires_at).toEqual(expect.any(String));
  });

  it('accepts a compatible server-only collection', () => {
    expect(() => schema.assertServerOnlyCollection({ permissions: [], documentSecurity: false })).not.toThrow();
  });

  it('fails closed for incompatible server-only settings', () => {
    expect(() => schema.assertServerOnlyCollection({ permissions: ['role:any'], documentSecurity: false })).toThrow();
    expect(() => schema.assertServerOnlyCollection({ permissions: [], documentSecurity: true })).toThrow();
    expect(() => schema.assertServerOnlyCollection({ permissions: 'not-an-array', documentSecurity: false })).toThrow();
  });

  it('reports only safe security metadata in assertion diagnostics', () => {
    expect(() => schema.assertServerOnlyCollection({ permissions: ['sensitive-permission-value'], documentSecurity: true })).toThrow(
      /permissionsIsArray=true, permissionCount=1, documentSecurity=true/,
    );
    try {
      schema.assertServerOnlyCollection({ permissions: ['sensitive-permission-value'], documentSecurity: true });
    } catch (error) {
      const message = String(error);
      expect(message).not.toContain('sensitive-permission-value');
      expect(message).not.toContain('role:any');
      expect(message).not.toContain('sensitive-permission-value');
      expect(message).not.toContain('user_id');
    }
  });

  it('keeps the security assertion fail-closed and free of mutation paths', () => {
    const source = readFileSync(resolve(process.cwd(), 'scripts/setup_ai_runtime_receipts_schema.cjs'), 'utf8');
    expect(source).not.toContain('updateCollection');
    expect(source).not.toContain('deleteCollection');
    expect(source).toContain('permissionsIsArray=');
    expect(source).toContain('permissionCount=');
    expect(source).toContain('documentSecurity=');
  });
});
