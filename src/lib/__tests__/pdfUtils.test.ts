import { describe, it, expect, afterEach } from 'vitest';
import {
  addBreakBeforeSection,
  computeBreaksForTargetPages,
  computePreviewBreaks,
  estimatePageCount,
  getSectionLabelForBreakY,
  getSectionsWithBreaksBefore,
  injectForcedBreaks,
  resolveExportBreakPositions,
  resolveExportPageCount,
} from '@/lib/pdfUtils';

// ---------------------------------------------------------------------------
// Helpers: jsdom returns 0 for all layout properties (offsetWidth, scrollHeight,
// offsetTop, offsetHeight, offsetParent). We patch them per element so each
// test can define a realistic layout without a real browser engine.
// ---------------------------------------------------------------------------

function setProp<T>(el: HTMLElement, prop: string, value: T) {
  Object.defineProperty(el, prop, { get: () => value, configurable: true });
}

/**
 * Apply a set of layout overrides to an element in one call.
 */
function layout(
  el: HTMLElement,
  opts: {
    offsetTop?: number;
    offsetHeight?: number;
    offsetWidth?: number;
    scrollHeight?: number;
    offsetParent?: HTMLElement | null;
  },
) {
  if (opts.offsetTop !== undefined) setProp(el, 'offsetTop', opts.offsetTop);
  if (opts.offsetHeight !== undefined) setProp(el, 'offsetHeight', opts.offsetHeight);
  if (opts.offsetWidth !== undefined) setProp(el, 'offsetWidth', opts.offsetWidth);
  if (opts.scrollHeight !== undefined) setProp(el, 'scrollHeight', opts.scrollHeight);
  if ('offsetParent' in opts) setProp(el, 'offsetParent', opts.offsetParent);
}

// Page geometry constants (mirror pdfUtils.ts internals)
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const FOOTER_RESERVED = 44;
const PRINTABLE_HEIGHT = PAGE_HEIGHT - FOOTER_RESERVED; // 748
// sourceHeightPerPage when sourceWidth === PAGE_WIDTH (scale = 1): 748

afterEach(() => {
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// estimatePageCount
// ---------------------------------------------------------------------------

describe('estimatePageCount', () => {
  it('returns 1 for content that fits within a single printable page', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    layout(root, { offsetWidth: PAGE_WIDTH, scrollHeight: 600 });

    expect(estimatePageCount(root, PAGE_WIDTH, PAGE_HEIGHT)).toBe(1);
  });

  it('returns 1 when content is within the 5% tolerance of one page', () => {
    // 748 * 1.05 = 785.4 — anything at or below this still returns 1
    const root = document.createElement('div');
    document.body.appendChild(root);
    layout(root, { offsetWidth: PAGE_WIDTH, scrollHeight: 780 });

    expect(estimatePageCount(root, PAGE_WIDTH, PAGE_HEIGHT)).toBe(1);
  });

  it('returns 2 for content that spans two pages', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    // 1200 / 748 = 1.6... → Math.ceil = 2
    layout(root, { offsetWidth: PAGE_WIDTH, scrollHeight: 1200 });

    expect(estimatePageCount(root, PAGE_WIDTH, PAGE_HEIGHT)).toBe(2);
  });

  it('returns 3 for content that spans three pages', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    // 1700 / 748 = 2.27... → Math.ceil = 3
    layout(root, { offsetWidth: PAGE_WIDTH, scrollHeight: 1700 });

    expect(estimatePageCount(root, PAGE_WIDTH, PAGE_HEIGHT)).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// computePreviewBreaks — page count + break positions
// ---------------------------------------------------------------------------

describe('computePreviewBreaks', () => {
  it('returns an empty array for single-page content', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    layout(root, { offsetWidth: PAGE_WIDTH, scrollHeight: 600 });

    const breaks = computePreviewBreaks(root, PAGE_WIDTH, PAGE_HEIGHT);
    expect(breaks).toHaveLength(0);
  });

  it('produces one break for two-page content with no avoid elements', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    // scrollHeight must be > PRINTABLE_HEIGHT (748) but < PRINTABLE_HEIGHT*2 (1496)
    // so that exactly one fixed break is generated at 748.
    layout(root, { offsetWidth: PAGE_WIDTH, scrollHeight: 900 });

    const breaks = computePreviewBreaks(root, PAGE_WIDTH, PAGE_HEIGHT);
    expect(breaks).toHaveLength(1);
    expect(breaks[0]).toBe(PRINTABLE_HEIGHT); // 748
  });

  it('produces two breaks for three-page content with no avoid elements', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    // scrollHeight > PRINTABLE_HEIGHT*2 (1496) but < PRINTABLE_HEIGHT*3 (2244)
    // so exactly two fixed breaks are generated at 748 and 1496.
    layout(root, { offsetWidth: PAGE_WIDTH, scrollHeight: 1700 });

    const breaks = computePreviewBreaks(root, PAGE_WIDTH, PAGE_HEIGHT);
    expect(breaks).toHaveLength(2);
    expect(breaks[0]).toBe(PRINTABLE_HEIGHT);       // 748
    expect(breaks[1]).toBe(PRINTABLE_HEIGHT * 2);   // 1496
  });

  it('integration: estimatePageCount and computePreviewBreaks agree on page count for the same fixture', () => {
    // Use a two-page fixture and a three-page fixture to verify that
    // breaks.length === pageCount - 1 on the same DOM element.
    const check = (scrollHeight: number, expectedPages: number) => {
      const root = document.createElement('div');
      document.body.appendChild(root);
      layout(root, { offsetWidth: PAGE_WIDTH, scrollHeight });

      const pageCount = estimatePageCount(root, PAGE_WIDTH, PAGE_HEIGHT);
      const breaks = computePreviewBreaks(root, PAGE_WIDTH, PAGE_HEIGHT);

      expect(pageCount).toBe(expectedPages);
      expect(breaks).toHaveLength(expectedPages - 1);

      document.body.removeChild(root);
    };

    check(900, 2);   // two-page: 1 break, pageCount=2
    check(1700, 3);  // three-page: 2 breaks, pageCount=3
  });
});

// ---------------------------------------------------------------------------
// snapBreaksToContentLight (exercised through computePreviewBreaks)
// ---------------------------------------------------------------------------

describe('snapBreaksToContentLight — via computePreviewBreaks', () => {
  it('shifts a break that lands inside a [data-break-avoid] element to that element\'s top', () => {
    // Root: 900px tall, 612px wide — gives exactly one fixed break at 748.
    const root = document.createElement('div');
    document.body.appendChild(root);
    layout(root, { offsetWidth: PAGE_WIDTH, scrollHeight: 900 });

    // A [data-break-avoid] entry that straddles the natural break at y=748
    // It sits from y=700 to y=900, so the 748 break falls inside it.
    const entry = document.createElement('div');
    entry.setAttribute('data-break-avoid', 'true');
    root.appendChild(entry);
    // offsetTop relative to root = 700 (offsetParent is root, so one hop)
    layout(entry, { offsetTop: 700, offsetHeight: 200, offsetParent: root });

    const breaks = computePreviewBreaks(root, PAGE_WIDTH, PAGE_HEIGHT);

    // The snap logic should move the break from 748 → 700 (top of the avoid element).
    // hitHeight (200) < sourceHeightPerPage (748), so it snaps to hit.top.
    expect(breaks).toHaveLength(1);
    expect(breaks[0]).toBe(700);
  });

  it('does not shift a break that does not overlap any [data-break-avoid] element', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    layout(root, { offsetWidth: PAGE_WIDTH, scrollHeight: 1500 });

    // Avoid element placed entirely before the break — no overlap
    const entry = document.createElement('div');
    entry.setAttribute('data-break-avoid', 'true');
    root.appendChild(entry);
    layout(entry, { offsetTop: 100, offsetHeight: 200, offsetParent: root });

    const breaks = computePreviewBreaks(root, PAGE_WIDTH, PAGE_HEIGHT);
    // No overlap → break stays at the fixed position
    expect(breaks[0]).toBe(PRINTABLE_HEIGHT);
  });

  it('shifts a break that falls inside a [data-section] heading to the section top', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    // 900px tall → one fixed break at 748, which falls inside section at 700-900.
    layout(root, { offsetWidth: PAGE_WIDTH, scrollHeight: 900 });

    // A section whose heading spans y=700–900, straddling the break at 748.
    // sectionHeight (200) < sourceHeightPerPage (748), so it snaps to section top.
    const section = document.createElement('section');
    section.setAttribute('data-section', 'skills');
    root.appendChild(section);
    layout(section, { offsetTop: 700, offsetHeight: 200, offsetParent: root });

    const breaks = computePreviewBreaks(root, PAGE_WIDTH, PAGE_HEIGHT);
    expect(breaks).toHaveLength(1);
    expect(breaks[0]).toBe(700);
  });
});

// ---------------------------------------------------------------------------
// injectForcedBreaks
// ---------------------------------------------------------------------------

describe('injectForcedBreaks', () => {
  it('inserts a forced break at the section offsetTop', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    layout(root, { offsetWidth: PAGE_WIDTH, scrollHeight: 1500 });

    const section = document.createElement('section');
    section.setAttribute('data-section', 'education');
    root.appendChild(section);
    // Section starts at y=300 relative to root
    layout(section, { offsetTop: 300, offsetHeight: 100, offsetParent: root });

    const smartBreaks = [748];
    const result = injectForcedBreaks(smartBreaks, root, ['education'], 1500);

    expect(result).toContain(300);
  });

  it('uses the earliest boundary before section content when heading is inset', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    layout(root, { offsetWidth: PAGE_WIDTH, scrollHeight: 1500 });

    const section = document.createElement('section');
    section.setAttribute('data-section', 'education');
    root.appendChild(section);
    layout(section, { offsetTop: 280, offsetHeight: 120, offsetParent: root });

    const heading = document.createElement('h2');
    section.appendChild(heading);
    layout(heading, { offsetTop: 20, offsetHeight: 24, offsetParent: section });

    const result = injectForcedBreaks([748], root, ['education'], 1500);
    expect(result).toContain(280);
  });

  it('preserves existing smart breaks that are far enough from the forced break', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    layout(root, { offsetWidth: PAGE_WIDTH, scrollHeight: 1500 });

    const section = document.createElement('section');
    section.setAttribute('data-section', 'skills');
    root.appendChild(section);
    layout(section, { offsetTop: 300, offsetHeight: 100, offsetParent: root });

    // Smart break at 748 is far from the forced break at 300 (diff=448 > MIN_GAP=40)
    const result = injectForcedBreaks([748], root, ['skills'], 1500);

    expect(result).toContain(300);
    expect(result).toContain(748);
    expect(result).toEqual([300, 748]); // sorted
  });

  it('removes a smart break that is too close to the forced break', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    layout(root, { offsetWidth: PAGE_WIDTH, scrollHeight: 1500 });

    const section = document.createElement('section');
    section.setAttribute('data-section', 'certifications');
    root.appendChild(section);
    // Force a break at y=300; smart break at 310 is only 10px away (< MIN_GAP=40)
    layout(section, { offsetTop: 300, offsetHeight: 100, offsetParent: root });

    const result = injectForcedBreaks([310], root, ['certifications'], 1500);

    expect(result).toContain(300);
    expect(result).not.toContain(310);
  });

  it('returns smartBreaks unchanged when manualBreakSections is empty', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);

    const result = injectForcedBreaks([748], root, [], 1500);
    expect(result).toEqual([748]);
  });

  it('ignores a section whose offsetTop is outside the valid range', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    layout(root, { offsetWidth: PAGE_WIDTH, scrollHeight: 1500 });

    // y=10 < MIN_GAP=40 → should be skipped
    const section = document.createElement('section');
    section.setAttribute('data-section', 'header');
    root.appendChild(section);
    layout(section, { offsetTop: 10, offsetHeight: 30, offsetParent: root });

    const result = injectForcedBreaks([748], root, ['header'], 1500);
    // Forced break should not be inserted; smart break preserved
    expect(result).toEqual([748]);
  });

  it('returns breaks in sorted order when multiple forced breaks are injected', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    layout(root, { offsetWidth: PAGE_WIDTH, scrollHeight: 2400 });

    const s1 = document.createElement('section');
    s1.setAttribute('data-section', 'skills');
    root.appendChild(s1);
    layout(s1, { offsetTop: 900, offsetHeight: 100, offsetParent: root });

    const s2 = document.createElement('section');
    s2.setAttribute('data-section', 'education');
    root.appendChild(s2);
    layout(s2, { offsetTop: 400, offsetHeight: 100, offsetParent: root });

    const result = injectForcedBreaks([], root, ['skills', 'education'], 2400);

    expect(result).toEqual([400, 900]);
  });

  it('replaces an existing break inside the target section when forcing a section top', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    layout(root, { offsetWidth: PAGE_WIDTH, scrollHeight: 1500, offsetHeight: 1500 });

    const experience = document.createElement('section');
    experience.setAttribute('data-section', 'experience');
    root.appendChild(experience);
    layout(experience, { offsetTop: 500, offsetHeight: 400, offsetParent: root });

    const result = injectForcedBreaks([700], root, ['experience'], 1500);
    expect(result).toEqual([500]);
  });
});

describe('resolveExportBreakPositions', () => {
  const PAGE_WIDTH = 612;

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('re-measures section-aligned breaks on the export template', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    layout(root, { offsetWidth: PAGE_WIDTH, scrollHeight: 1500, offsetHeight: 1500 });

    const summary = document.createElement('section');
    summary.setAttribute('data-section', 'summary');
    root.appendChild(summary);
    layout(summary, { offsetTop: 0, offsetHeight: 200, offsetParent: root });

    const education = document.createElement('section');
    education.setAttribute('data-section', 'education');
    root.appendChild(education);
    layout(education, { offsetTop: 520, offsetHeight: 300, offsetParent: root });

    const resolved = resolveExportBreakPositions(root, [525], 40);
    expect(resolved).toEqual([520]);
  });
});

describe('getSectionsWithBreaksBefore', () => {
  const PAGE_WIDTH = 612;

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('returns section ids aligned to break boundaries', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    layout(root, { offsetWidth: PAGE_WIDTH, scrollHeight: 1500, offsetHeight: 1500 });

    const education = document.createElement('section');
    education.setAttribute('data-section', 'education');
    root.appendChild(education);
    layout(education, { offsetTop: 500, offsetHeight: 300, offsetParent: root });

    expect(getSectionsWithBreaksBefore(root, [500], 40)).toEqual(['education']);
    expect(getSectionsWithBreaksBefore(root, [700], 40)).toEqual([]);
  });
});

describe('addBreakBeforeSection', () => {
  const PAGE_WIDTH = 612;

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('returns applied false when the section is too close to the top', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    layout(root, { offsetWidth: PAGE_WIDTH, scrollHeight: 800, offsetHeight: 800 });

    const summary = document.createElement('section');
    summary.setAttribute('data-section', 'summary');
    root.appendChild(summary);
    layout(summary, { offsetTop: 10, offsetHeight: 80, offsetParent: root });

    const { breaks, applied } = addBreakBeforeSection([], root, 'summary', 800);
    expect(applied).toBe(false);
    expect(breaks).toEqual([]);
  });

  it('moves the break to the section top when valid', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    layout(root, { offsetWidth: PAGE_WIDTH, scrollHeight: 1500, offsetHeight: 1500 });

    const experience = document.createElement('section');
    experience.setAttribute('data-section', 'experience');
    root.appendChild(experience);
    layout(experience, { offsetTop: 500, offsetHeight: 400, offsetParent: root });

    const { breaks, applied } = addBreakBeforeSection([748], root, 'experience', 1500);
    expect(applied).toBe(true);
    expect(breaks).toEqual([500]);
  });
});

describe('getSectionLabelForBreakY', () => {
  const PAGE_WIDTH = 612;

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('labels a break at a section top as ending before that section', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    layout(root, { offsetWidth: PAGE_WIDTH, scrollHeight: 1500, offsetHeight: 1500 });

    const summary = document.createElement('section');
    summary.setAttribute('data-section', 'summary');
    root.appendChild(summary);
    layout(summary, { offsetTop: 0, offsetHeight: 200, offsetParent: root });

    const education = document.createElement('section');
    education.setAttribute('data-section', 'education');
    root.appendChild(education);
    layout(education, { offsetTop: 500, offsetHeight: 300, offsetParent: root });

    expect(getSectionLabelForBreakY(root, 500).description).toBe('Page ends before Education');
  });

  it('labels distinct breaks in different sections differently', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    layout(root, { offsetWidth: PAGE_WIDTH, scrollHeight: 1500, offsetHeight: 1500 });

    const summary = document.createElement('section');
    summary.setAttribute('data-section', 'summary');
    root.appendChild(summary);
    layout(summary, { offsetTop: 0, offsetHeight: 180, offsetParent: root });

    const experience = document.createElement('section');
    experience.setAttribute('data-section', 'experience');
    root.appendChild(experience);
    layout(experience, { offsetTop: 500, offsetHeight: 400, offsetParent: root });

    const education = document.createElement('section');
    education.setAttribute('data-section', 'education');
    root.appendChild(education);
    layout(education, { offsetTop: 1000, offsetHeight: 200, offsetParent: root });

    const first = getSectionLabelForBreakY(root, 500);
    const second = getSectionLabelForBreakY(root, 1000);
    expect(first.description).toContain('Experience');
    expect(second.description).toContain('Education');
    expect(first.description).not.toEqual(second.description);
  });
});

describe('resolveExportPageCount', () => {
  const PAGE_WIDTH = 612;
  const PAGE_HEIGHT = 792;

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('uses custom break count when positions are saved', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    layout(root, { offsetWidth: PAGE_WIDTH, scrollHeight: 1500 });

    expect(resolveExportPageCount(root, PAGE_WIDTH, PAGE_HEIGHT, [700, 1200])).toBe(3);
  });

  it('falls back to estimatePageCount when no custom breaks', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    layout(root, { offsetWidth: PAGE_WIDTH, scrollHeight: 600 });

    expect(resolveExportPageCount(root, PAGE_WIDTH, PAGE_HEIGHT, [])).toBe(1);
  });
});

describe('computeBreaksForTargetPages', () => {
  const PAGE_WIDTH = 612;
  const PAGE_HEIGHT = 792;

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('returns no breaks for a one-page target', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    layout(root, { offsetWidth: PAGE_WIDTH, scrollHeight: 1500 });

    expect(computeBreaksForTargetPages(root, 1, PAGE_WIDTH, PAGE_HEIGHT)).toEqual([]);
  });

  it('returns one break for a two-page target', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    layout(root, { offsetWidth: PAGE_WIDTH, scrollHeight: 1500 });

    const breaks = computeBreaksForTargetPages(root, 2, PAGE_WIDTH, PAGE_HEIGHT);
    expect(breaks).toHaveLength(1);
    expect(breaks[0]).toBeGreaterThan(40);
    expect(breaks[0]).toBeLessThan(1500 - 40);
  });
});
