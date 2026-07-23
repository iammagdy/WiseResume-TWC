import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const schema = require('../../../scripts/setup_broadcasts_schema.cjs') as {
  ATTRIBUTES: Array<{ key: string }>;
  schemaPlan: (existing: Array<{ key: string }>) => Array<{ key: string }>;
};

describe('broadcast schema setup', () => {
  it('defines the canonical status and expiry fields', () => {
    expect(schema.ATTRIBUTES.map((attribute) => attribute.key)).toEqual([
      'title',
      'body',
      'severity',
      'active',
      'created_by',
      'created_at',
      'expires_at',
    ]);
  });

  it('is idempotent when the canonical attributes already exist', () => {
    const existing = schema.ATTRIBUTES.map(({ key }) => ({ key }));
    expect(schema.schemaPlan(existing)).toEqual([]);
  });

  it('does not add broad collection permissions', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'scripts/setup_broadcasts_schema.cjs'),
      'utf8',
    );
    expect(source).not.toContain('Role.any');
    expect(source).not.toContain('Role.users');
    expect(source).not.toContain('updateCollection');
    expect(source).not.toContain('deleteCollection');
  });
});
