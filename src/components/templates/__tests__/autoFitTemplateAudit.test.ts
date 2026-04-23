import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Per-template auto-fit verification (task #43).
 *
 * The "Fit to N pages" feature drives `customization.fontScale`, which in turn
 * is materialised as CSS overrides by `buildCompactScaleBlock` in
 * `src/lib/templateCustomization.ts`. That block only scales utility classes
 * it explicitly enumerates — `text-*`, `leading-*`, `mb-*`, `mt-*`, `pb-*`,
 * `pt-*`, `pl-*`, `pr-*`, `p-*`, `py-*`, `px-*`, `gap-*`, `gap-y-*`,
 * `gap-x-*`, `space-y-*` — and only at the spacing-scale numeric tokens
 * 0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10.
 *
 * Anything else used by a template that contributes to vertical height
 * (arbitrary `text-[Npx]`, fixed `h-[Npx]`/`min-h-*`, `my-*`/`mx-*` margins,
 * spacing tokens like 7/9/12/16/20/24, arbitrary `mb-[12px]`, etc.) will NOT
 * shrink when `--compact-scale` drops, and is therefore a candidate culprit
 * if auto-fit fails to converge on that template at target 1/2/3 pages.
 *
 * This test extracts every utility class used inside `className="…"` strings
 * across all template files, classifies each as scaled / unscaled-but-vertical
 * / horizontal-or-irrelevant, and writes a per-template Markdown report to
 * `reports/auto-fit-template-audit.md`. It then asserts that the report has
 * been generated and that no NEW high-risk class shows up in a template
 * without being either covered by `buildCompactScaleBlock` or listed in the
 * baseline below as a known/accepted exception.
 *
 * To extend `buildCompactScaleBlock` for a newly-flagged class:
 *   - Add the spacing token to `SPACING_REM`, OR
 *   - Add the property prefix to `spacingProps`, OR
 *   - Add a parser for arbitrary `text-[Npx]` (see follow-up task on this).
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = resolve(__dirname, '..');
const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..');
const REPORT_PATH = join(REPO_ROOT, 'reports', 'auto-fit-template-audit.md');

const SCALED_SPACING_TOKENS = new Set(['0', '0.5', '1', '1.5', '2', '3', '4', '5', '6', '8', '10']);
const SCALED_SPACING_PREFIXES = new Set([
  'mb', 'mt', 'pb', 'pt', 'pl', 'pr', 'p', 'py', 'px', 'gap', 'gap-y', 'gap-x',
]);
const SCALED_LEADING_KEYWORDS = new Set(['none', 'tight', 'snug', 'relaxed', 'loose']);
const SCALED_LEADING_NUMERIC = new Set(['3', '4', '5', '6', '7', '8', '9', '10']);
const SCALED_TEXT_SIZES = new Set([
  'xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl',
]);

const VERTICAL_PREFIXES = new Set([
  'mb', 'mt', 'my', 'pb', 'pt', 'py', 'p', 'gap', 'gap-y', 'space-y',
  'h', 'min-h', 'max-h',
]);

interface ClassFinding {
  className: string;
  reason: string;
}

interface TemplateReport {
  file: string;
  unscaledVertical: ClassFinding[];
  arbitraryText: ClassFinding[];
  arbitrarySpacing: ClassFinding[];
  fixedHeights: ClassFinding[];
}

function listTemplateFiles(): string[] {
  return readdirSync(TEMPLATES_DIR)
    .filter((f) => f.endsWith('Template.tsx'))
    .map((f) => join(TEMPLATES_DIR, f));
}

function extractClassStrings(src: string): string[] {
  const out: string[] = [];
  const re = /className\s*=\s*["'`]([^"'`]+)["'`]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) out.push(m[1]);
  return out;
}

function classify(cls: string): { kind: keyof Omit<TemplateReport, 'file'> | 'ok'; reason: string } {
  // Strip Tailwind variants (sm:, md:, hover:, print:, etc.)
  const bare = cls.replace(/^[a-z0-9-]+:/i, '').trim();
  if (!bare) return { kind: 'ok', reason: '' };

  // Arbitrary font size: text-[10px], text-[1.2rem]
  const arbText = bare.match(/^text-\[([^\]]+)\]$/);
  if (arbText) {
    return { kind: 'arbitraryText', reason: `arbitrary font-size token "${arbText[1]}" — not scaled by --compact-scale` };
  }

  // Arbitrary spacing: mb-[12px], py-[6px], gap-[3px]
  const arbSpacing = bare.match(/^(mb|mt|my|pb|pt|py|p|gap|gap-y|space-y)-\[([^\]]+)\]$/);
  if (arbSpacing) {
    return { kind: 'arbitrarySpacing', reason: `arbitrary ${arbSpacing[1]} token "${arbSpacing[2]}" — not scaled by --compact-scale` };
  }

  // Fixed heights: h-[200px], min-h-[792px], max-h-screen, h-12
  const fixedH = bare.match(/^(h|min-h|max-h)-(\[[^\]]+\]|\d+(?:\.\d+)?|full|screen|auto|fit|svh|dvh|lvh)$/);
  if (fixedH) {
    // min-h-[792px] on the page wrapper is intentional (page sentinel) — flag
    // but separately under fixedHeights so the reviewer can decide.
    return { kind: 'fixedHeights', reason: `fixed/relative height "${bare}" — does not respond to --compact-scale` };
  }

  // Numeric spacing utilities: mb-7, py-12, gap-16, etc.
  const spacing = bare.match(/^([a-z]+(?:-[a-z])?)-(\d+(?:\.\d+)?)$/);
  if (spacing) {
    const [, prefix, token] = spacing;
    if (VERTICAL_PREFIXES.has(prefix)) {
      const scaledFamily = SCALED_SPACING_PREFIXES.has(prefix);
      const scaledToken = SCALED_SPACING_TOKENS.has(token);
      if (scaledFamily && scaledToken) return { kind: 'ok', reason: '' };
      if (scaledFamily && !scaledToken) {
        return { kind: 'unscaledVertical', reason: `${prefix}-${token}: prefix is scaled but token "${token}" not in SPACING_REM` };
      }
      // prefix not scaled at all (my-*, h-*, min-h-*, max-h-*, space-y-* numeric)
      // space-y-* numeric IS scaled though — re-check
      if (prefix === 'space-y' && scaledToken) return { kind: 'ok', reason: '' };
      return { kind: 'unscaledVertical', reason: `prefix "${prefix}-" is not in spacingProps — vertical class never shrinks` };
    }
    // horizontal-only or irrelevant
    return { kind: 'ok', reason: '' };
  }

  // text-* size keyword
  const textKw = bare.match(/^text-([a-z0-9]+)$/);
  if (textKw && SCALED_TEXT_SIZES.has(textKw[1])) return { kind: 'ok', reason: '' };

  // leading-* keyword or numeric
  const leadingKw = bare.match(/^leading-([a-z0-9]+)$/);
  if (leadingKw) {
    if (SCALED_LEADING_KEYWORDS.has(leadingKw[1]) || SCALED_LEADING_NUMERIC.has(leadingKw[1])) {
      return { kind: 'ok', reason: '' };
    }
    if (leadingKw[1] === 'normal') return { kind: 'ok', reason: '' }; // intentionally skipped
  }

  return { kind: 'ok', reason: '' };
}

function auditTemplate(file: string): TemplateReport {
  const src = readFileSync(file, 'utf8');
  const classStrings = extractClassStrings(src);
  const report: TemplateReport = {
    file: file.replace(REPO_ROOT + '/', ''),
    unscaledVertical: [],
    arbitraryText: [],
    arbitrarySpacing: [],
    fixedHeights: [],
  };
  const seen = new Set<string>();
  for (const str of classStrings) {
    for (const cls of str.split(/\s+/)) {
      if (!cls || seen.has(cls)) continue;
      seen.add(cls);
      const { kind, reason } = classify(cls);
      if (kind === 'ok') continue;
      report[kind].push({ className: cls, reason });
    }
  }
  return report;
}

function renderReport(reports: TemplateReport[]): string {
  const lines: string[] = [];
  lines.push('# Auto-fit Template Audit');
  lines.push('');
  lines.push(`Generated by \`src/components/templates/__tests__/autoFitTemplateAudit.test.ts\`.`);
  lines.push('');
  lines.push('Static analysis of every resume template against the set of utility classes scaled by `buildCompactScaleBlock` in `src/lib/templateCustomization.ts`. Anything listed below contributes to vertical height but is NOT scaled by `--compact-scale`, so it can prevent auto-fit from converging on the user-requested page count.');
  lines.push('');
  lines.push('## Categories');
  lines.push('');
  lines.push('- **Unscaled vertical utility**: prefix or spacing token not covered by `buildCompactScaleBlock` — high priority, easy fix (extend `SPACING_REM` / `spacingProps`).');
  lines.push('- **Arbitrary font size** (`text-[10px]`): bypasses the `text-xs..5xl` scaling list. Tracked in the existing follow-up task "Add an arbitrary text size scale (e.g. text-[10px]) to compact mode".');
  lines.push('- **Arbitrary spacing** (`mb-[12px]`, `py-[6px]`): bypasses the spacing-class scaling.');
  lines.push('- **Fixed heights** (`h-12`, `min-h-[792px]`, `max-h-screen`): hard pixel/viewport heights that do not shrink with the rest of the layout. `min-h-[792px]` on the outer page sentinel is intentional and can be ignored.');
  lines.push('');
  lines.push('## Per-template findings');
  lines.push('');
  for (const r of reports) {
    const total = r.unscaledVertical.length + r.arbitraryText.length + r.arbitrarySpacing.length + r.fixedHeights.length;
    if (total === 0) {
      lines.push(`### \`${r.file}\` — ✅ all vertical utilities covered`);
      lines.push('');
      continue;
    }
    lines.push(`### \`${r.file}\``);
    lines.push('');
    if (r.unscaledVertical.length) {
      lines.push('**Unscaled vertical utilities** (prevent convergence):');
      for (const f of r.unscaledVertical) lines.push(`- \`${f.className}\` — ${f.reason}`);
      lines.push('');
    }
    if (r.arbitraryText.length) {
      lines.push('**Arbitrary font sizes** (bypass text-* scaling):');
      for (const f of r.arbitraryText) lines.push(`- \`${f.className}\` — ${f.reason}`);
      lines.push('');
    }
    if (r.arbitrarySpacing.length) {
      lines.push('**Arbitrary spacing** (bypass spacing scaling):');
      for (const f of r.arbitrarySpacing) lines.push(`- \`${f.className}\` — ${f.reason}`);
      lines.push('');
    }
    if (r.fixedHeights.length) {
      lines.push('**Fixed heights** (do not shrink):');
      for (const f of r.fixedHeights) lines.push(`- \`${f.className}\` — ${f.reason}`);
      lines.push('');
    }
  }
  lines.push('## Summary');
  lines.push('');
  const totals = reports.reduce(
    (acc, r) => ({
      unscaledVertical: acc.unscaledVertical + r.unscaledVertical.length,
      arbitraryText: acc.arbitraryText + r.arbitraryText.length,
      arbitrarySpacing: acc.arbitrarySpacing + r.arbitrarySpacing.length,
      fixedHeights: acc.fixedHeights + r.fixedHeights.length,
    }),
    { unscaledVertical: 0, arbitraryText: 0, arbitrarySpacing: 0, fixedHeights: 0 },
  );
  lines.push(`- Templates audited: **${reports.length}**`);
  lines.push(`- Unscaled vertical utility occurrences: **${totals.unscaledVertical}**`);
  lines.push(`- Arbitrary font sizes: **${totals.arbitraryText}**`);
  lines.push(`- Arbitrary spacing: **${totals.arbitrarySpacing}**`);
  lines.push(`- Fixed-height utilities: **${totals.fixedHeights}**`);
  lines.push('');
  return lines.join('\n');
}

describe('Auto-fit per-template audit (task #43)', () => {
  const files = listTemplateFiles();
  const reports = files.map(auditTemplate).sort((a, b) => a.file.localeCompare(b.file));

  it('writes a per-template audit report to reports/auto-fit-template-audit.md', () => {
    mkdirSync(dirname(REPORT_PATH), { recursive: true });
    writeFileSync(REPORT_PATH, renderReport(reports), 'utf8');
    expect(reports.length).toBeGreaterThanOrEqual(30);
  });

  it('every template file is recognised', () => {
    const names = reports.map((r) => r.file);
    expect(names.some((n) => n.endsWith('ModernTemplate.tsx'))).toBe(true);
    expect(names.some((n) => n.endsWith('CompactTemplate.tsx'))).toBe(true);
    expect(names.some((n) => n.endsWith('ZenTemplate.tsx'))).toBe(true);
  });

  // Per-template regression guard. Each template has an explicit baseline of
  // ACCEPTED offenders (page sentinels, decorative dividers, the one tracked
  // arbitrary `text-[10px]`). The test fails when a NEW class outside the
  // baseline is introduced, so future template edits cannot silently regress
  // auto-fit coverage. Updating the baseline below is intentional and should
  // be paired with either (a) extending `buildCompactScaleBlock` to scale the
  // new class, or (b) confirming the new class is decorative and cannot
  // affect convergence at target ∈ {1, 2, 3}.

  /** Page-rectangle sentinels and decorative-only height utilities used for
   *  small fixed-size dividers / avatar containers. These do not materially
   *  affect convergence at the page targets we support and are accepted
   *  globally so the baseline stays small. */
  const ACCEPTED_FIXED_HEIGHTS = new Set([
    'min-h-[792px]', 'min-h-[1056px]', 'h-[792px]',
    'min-h-full',
    'h-0.5', 'h-1', 'h-1.5', 'h-2', 'h-4', 'h-16', 'h-20',
  ]);

  /** Per-template accepted arbitrary font sizes / arbitrary spacing /
   *  unscaled-vertical classes. Empty unless explicitly carved out below. */
  const PER_TEMPLATE_BASELINE: Record<string, {
    arbitraryText?: string[];
    arbitrarySpacing?: string[];
    unscaledVertical?: string[];
  }> = {
    'CompactTemplate.tsx': {
      // Tracked by existing follow-up "Add an arbitrary text size scale
      // (e.g. text-[10px]) to compact mode".
      arbitraryText: ['text-[10px]'],
    },
  };

  for (const r of reports) {
    const fname = r.file.split('/').pop()!;
    it(`[${fname}] no new auto-fit-blocking utilities introduced`, () => {
      const accepted = PER_TEMPLATE_BASELINE[fname] ?? {};
      const acceptedArbText = new Set(accepted.arbitraryText ?? []);
      const acceptedArbSpacing = new Set(accepted.arbitrarySpacing ?? []);
      const acceptedUnscaled = new Set(accepted.unscaledVertical ?? []);

      const newUnscaled = r.unscaledVertical
        .map((f) => f.className)
        .filter((c) => !acceptedUnscaled.has(c));
      const newArbText = r.arbitraryText
        .map((f) => f.className)
        .filter((c) => !acceptedArbText.has(c));
      const newArbSpacing = r.arbitrarySpacing
        .map((f) => f.className)
        .filter((c) => !acceptedArbSpacing.has(c));
      const newFixedHeights = r.fixedHeights
        .map((f) => f.className)
        .filter((c) => !ACCEPTED_FIXED_HEIGHTS.has(c));

      // Any new unscaled vertical / arbitrary spacing class is a hard fail —
      // these definitely affect convergence and the fix is to extend
      // buildCompactScaleBlock or the baseline above with justification.
      expect(
        { newUnscaled, newArbText, newArbSpacing, newFixedHeights },
        `New auto-fit-blocking utility class introduced in ${fname}. ` +
          `Either extend buildCompactScaleBlock in src/lib/templateCustomization.ts ` +
          `to scale it, or add it to PER_TEMPLATE_BASELINE / ACCEPTED_FIXED_HEIGHTS ` +
          `with justification (and confirm it cannot affect auto-fit convergence).`,
      ).toEqual({ newUnscaled: [], newArbText: [], newArbSpacing: [], newFixedHeights: [] });
    });
  }
});
