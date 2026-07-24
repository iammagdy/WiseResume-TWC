import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('legacy admin diagnostics endpoint', () => {
  it('is absent from the public API surface', () => {
    expect(existsSync('api/admin-diagnostics.ts')).toBe(false);
  });
});
