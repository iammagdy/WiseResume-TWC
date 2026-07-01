import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('public content route placement', () => {
  it('defines English guides and examples before the protected route group', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/AppInterior.tsx'), 'utf8');
    const protectedAt = source.indexOf('<Route element={<ProtectedRoute />}>');
    for (const route of ['path="/guides"', 'path="/guides/:slug"', 'path="/examples"']) {
      const occurrences = [...source.matchAll(new RegExp(route.replace(/[/:]/g, '\\$&'), 'g'))].map((match) => match.index ?? -1);
      expect(occurrences, `${route} should have one public definition`).toHaveLength(1);
      expect(occurrences[0]).toBeGreaterThan(0);
      expect(occurrences[0]).toBeLessThan(protectedAt);
    }
  });
});
