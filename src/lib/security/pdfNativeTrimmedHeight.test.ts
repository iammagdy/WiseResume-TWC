import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('api/export/pdf-native.ts', 'utf8');
const localServerSource = readFileSync('server/index.ts', 'utf8');

describe('native PDF final-page trimming contract', () => {
  it('does not promote the live min-height sentinel into rendered content height', () => {
    expect(source).toContain(
      'contentHeight = Math.max(Math.round(contentHeight), measuredHeight, contentPageHeight);',
    );
    expect(source).not.toMatch(
      /contentHeight\s*=\s*Math\.max\([^;]*requestedLayoutHeight/,
    );
    expect(localServerSource).toContain(
      'contentHeight = Math.max(clientHeight, measuredHeight, printableHeight);',
    );
    expect(localServerSource).not.toMatch(
      /contentHeight\s*=\s*Math\.max\([^;]*requestedLayoutHeight/,
    );
  });
});
