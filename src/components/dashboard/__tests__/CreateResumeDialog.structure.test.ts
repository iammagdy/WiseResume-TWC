import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('CreateResumeDialog conditional structure', () => {
  it('closes mode selection before rendering the blank intake branch', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/components/dashboard/CreateResumeDialog.tsx'), 'utf8');
    expect(source).toMatch(/\{existingResumes\.length > 0[\s\S]*?\)\}\s*<\/div>\s*\) : mode === 'blank' && blankStep === 'intake'/);
    expect(source).not.toContain('</div>    </div>');
  });
});
