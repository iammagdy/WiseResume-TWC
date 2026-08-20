import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'src/components/dashboard/DashboardUploadWidget.tsx'),
  'utf8',
);

describe('DashboardUploadWidget initialization contract', () => {
  it('declares the ATS scoring callback before the effect dependency array references it', () => {
    const callbackDeclaration = source.indexOf('const triggerATSScoring = useCallback');
    const reviewEffect = source.indexOf('// Open review sheet when parsing completes');

    expect(callbackDeclaration).toBeGreaterThanOrEqual(0);
    expect(reviewEffect).toBeGreaterThan(callbackDeclaration);
    expect(source).toContain('}, [parsedData, isProcessing, triggerATSScoring]);');
  });
});
