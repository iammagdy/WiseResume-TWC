import { test, expect } from '../fixtures/auth-required';
import { attachObservers } from '../fixtures/observers';
import { statSync } from 'node:fs';
import path from 'node:path';

/**
 * Export validation. We don't depend on a seeded resume — we open the
 * editor route directly and look for any export affordance. For each
 * export format we trigger the download, verify the file extension /
 * MIME hint, and assert the file is non-empty (PDF files start with
 * "%PDF", DOCX files start with "PK", JSON parses, plain text is
 * non-empty UTF-8).
 */

interface ExportCase {
  label: RegExp;
  expectedExt: RegExp;
  validate: (filePath: string) => string | null;
}

const EXPORTS: ExportCase[] = [
  {
    label: /pdf|download.*pdf|export.*pdf/i,
    expectedExt: /\.pdf$/i,
    validate: filePath => {
      const buf = require('node:fs').readFileSync(filePath).slice(0, 5).toString('utf8');
      return buf.startsWith('%PDF') ? null : `not a PDF file (header: ${buf})`;
    },
  },
  {
    label: /docx|word/i,
    expectedExt: /\.docx$/i,
    validate: filePath => {
      const buf = require('node:fs').readFileSync(filePath).slice(0, 4);
      // DOCX is a ZIP; ZIP magic = 'PK\x03\x04'
      return buf[0] === 0x50 && buf[1] === 0x4b ? null : `not a ZIP/DOCX (bytes: ${buf.toString('hex')})`;
    },
  },
  {
    label: /json/i,
    expectedExt: /\.json$/i,
    validate: filePath => {
      try {
        JSON.parse(require('node:fs').readFileSync(filePath, 'utf8'));
        return null;
      } catch (e) {
        return `not parseable JSON: ${(e as Error).message}`;
      }
    },
  },
  {
    label: /plain.?text|\.txt|^txt/i,
    expectedExt: /\.txt$/i,
    validate: filePath => {
      const text = require('node:fs').readFileSync(filePath, 'utf8');
      return text.trim().length > 0 ? null : 'plain-text file is empty';
    },
  },
];

test.describe('Exports — real download validation', () => {
  for (const ec of EXPORTS) {
    test(`Export ${ec.label.source}`, async ({ page }) => {
      const obs = attachObservers(page);
      await page.goto('/editor');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2500);

      // Open any export menu first if present
      const exportMenu = page.getByRole('button', { name: /export|download/i }).first();
      if (!(await exportMenu.count())) {
        test.info().annotations.push({ type: 'note', description: 'No export/download button visible on /editor — recorded as potential bug if exports are expected here.' });
        test.skip(true, 'No export menu on /editor');
      }
      await exportMenu.click().catch(() => null);
      await page.waitForTimeout(500);

      const formatBtn = page.getByRole('menuitem', { name: ec.label }).or(page.getByRole('button', { name: ec.label })).first();
      if (!(await formatBtn.count())) {
        test.info().annotations.push({ type: 'note', description: `No export option matching ${ec.label} visible.` });
        test.skip(true, `No export format ${ec.label} visible`);
      }

      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 60_000 }),
        formatBtn.click(),
      ]);

      const suggested = download.suggestedFilename();
      test.info().annotations.push({ type: 'filename', description: suggested });
      expect(suggested, `Suggested filename "${suggested}" did not match ${ec.expectedExt}`).toMatch(ec.expectedExt);

      const dest = path.join('tests/e2e/.artifacts', `export-${Date.now()}-${suggested}`);
      await download.saveAs(dest);
      const size = statSync(dest).size;
      expect(size, 'Downloaded file should be non-zero bytes').toBeGreaterThan(50);
      const validationFailure = ec.validate(dest);
      expect(validationFailure, validationFailure || '').toBeNull();

      test.info().annotations.push({ type: 'edge-fn', description: JSON.stringify(obs.edgeFnCalls.slice(0, 10)) });
    });
  }
});
