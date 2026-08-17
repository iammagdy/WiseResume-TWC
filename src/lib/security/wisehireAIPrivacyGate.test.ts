import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function source(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('WiseHire AI privacy gates', () => {
  it.each([
    ['src/components/wisehire/brief/BriefForm.tsx', 'wisehire_candidate_brief'],
    ['src/components/wisehire/jd-writer/JDWriterForm.tsx', 'wisehire_jd_writer'],
    ['src/hooks/wisehire/useBulkScreen.ts', 'wisehire_bulk_screen'],
    ['src/hooks/wisehire/useMaskCVs.ts', 'wisehire_mask_cvs'],
    ['src/hooks/wisehire/useOutreach.ts', 'wisehire_outreach_draft'],
  ])('%s requires the shared AI disclosure before provider processing', (file, operation) => {
    const content = source(file);
    expect(content).toContain("from '@/hooks/useAIAction'");
    expect(content).toContain(`operation: '${operation}'`);
    expect(content).toContain('executeAI(');
  });

  it('does not advertise obsolete client-owned provider-key requirements', () => {
    const combined = [
      source('src/components/wisehire/brief/BriefForm.tsx'),
      source('src/components/wisehire/jd-writer/JDWriterForm.tsx'),
      source('src/pages/wisehire/BulkScreenPage.tsx'),
      source('src/pages/wisehire/CandidateMaskingPage.tsx'),
    ].join('\n');
    expect(combined).not.toMatch(/Starter plan requires|AI key required|Add an OpenAI or Anthropic key/i);
  });
});
