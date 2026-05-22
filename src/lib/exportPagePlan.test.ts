import { describe, expect, it } from 'vitest';
import {
  buildAutomaticBreakPositions,
  buildExportPageSegments,
  clampBreakPositions,
  normalizeBreakPositions,
  scaleBreakPositionsToMeasuredHeight,
  snapBreakPositionsToAvoidBlocks,
  snapBreakPositionsToSectionHeadings,
} from './exportPagePlan';

describe('exportPagePlan', () => {
  it('normalizes user break positions by sorting, removing invalid values, and enforcing minimum gaps', () => {
    expect(normalizeBreakPositions([740, 12, 500, 510, 1600, -5, Number.NaN], 1500, 40))
      .toEqual([500, 740]);
  });

  it('clamps saved custom breaks instead of dropping them into automatic fallback', () => {
    expect(clampBreakPositions([12, 1185], 1200, 40)).toEqual([40, 1160]);
  });

  it('uses exact user break positions and crops the final page to the remaining content height', () => {
    const segments = buildExportPageSegments({
      totalContentHeightPx: 1650,
      pageHeightPx: 748,
      customBreakPositions: [700, 1225],
    });

    expect(segments).toEqual([
      { index: 0, startPx: 0, heightPx: 700, isLast: false },
      { index: 1, startPx: 700, heightPx: 525, isLast: false },
      { index: 2, startPx: 1225, heightPx: 425, isLast: true },
    ]);
  });

  it('scales break positions when measured export height differs from the client', () => {
    expect(scaleBreakPositionsToMeasuredHeight([800], 1600, 1680)).toEqual([840]);
    expect(scaleBreakPositionsToMeasuredHeight([700, 1225], 1650, 1650)).toEqual([700, 1225]);
  });

  it('snaps breaks in the section heading band to headingTop', () => {
    const sections = [
      { top: 500, bottom: 1200, headingTop: 500 },
      { top: 1200, bottom: 1400, headingTop: 1200 },
    ];
    // Break drifted 30px into Education (after heading)
    expect(
      snapBreakPositionsToSectionHeadings([1230], sections, 1500),
    ).toEqual([1200]);
    // Break just above section due to scale drift
    expect(
      snapBreakPositionsToSectionHeadings([1185], sections, 1500),
    ).toEqual([1200]);
  });

  it('does not snap breaks deep inside a tall section', () => {
    const sections = [{ top: 100, bottom: 2000, headingTop: 100 }];
    expect(
      snapBreakPositionsToSectionHeadings([900], sections, 2100),
    ).toEqual([900]);
  });

  it('does not relocate a saved custom cut that intentionally lands inside an entry', () => {
    const segments = buildExportPageSegments({
      totalContentHeightPx: 1200,
      pageHeightPx: 748,
      customBreakPositions: [748],
    });

    expect(segments[0]).toMatchObject({ startPx: 0, heightPx: 748 });
    expect(segments[1]).toMatchObject({ startPx: 748, heightPx: 452 });
  });

  it('keeps a saved section-boundary cut exactly at the requested coordinate', () => {
    const educationTop = 900;
    const segments = buildExportPageSegments({
      totalContentHeightPx: 1400,
      pageHeightPx: 748,
      customBreakPositions: [educationTop],
    });

    expect(segments).toEqual([
      { index: 0, startPx: 0, heightPx: educationTop, isLast: false },
      { index: 1, startPx: educationTop, heightPx: 500, isLast: true },
    ]);
  });

  it('snaps automatic breaks inside keep-together blocks to the block top', () => {
    const avoidBlocks = [
      { top: 700, bottom: 900, childTops: [700, 730, 770] },
    ];

    expect(
      snapBreakPositionsToAvoidBlocks([748], avoidBlocks, 748, 1200),
    ).toEqual([700]);
  });

  it('snaps a section-boundary cut forward to the end of the previous entry', () => {
    const avoidBlocks = [
      { top: 700, bottom: 900, childTops: [700, 730, 770] },
    ];

    expect(
      snapBreakPositionsToAvoidBlocks([895], avoidBlocks, 748, 1200),
    ).toEqual([900]);
  });

  it('snaps inside oversized keep-together blocks to the nearest child boundary', () => {
    const avoidBlocks = [
      { top: 100, bottom: 1200, childTops: [100, 420, 760, 980] },
    ];

    expect(
      snapBreakPositionsToAvoidBlocks([748], avoidBlocks, 748, 1400),
    ).toEqual([760]);
  });

  it('creates standard suggested segments while still cropping the final page when no custom breaks exist', () => {
    const segments = buildExportPageSegments({
      totalContentHeightPx: 1700,
      pageHeightPx: 748,
      customBreakPositions: [],
    });

    expect(segments).toEqual([
      { index: 0, startPx: 0, heightPx: 748, isLast: false },
      { index: 1, startPx: 748, heightPx: 748, isLast: false },
      { index: 2, startPx: 1496, heightPx: 204, isLast: true },
    ]);
  });

  it('builds automatic breaks that avoid splitting an experience item', () => {
    const avoidBlocks = [
      { top: 700, bottom: 900, childTops: [700, 730, 770] },
    ];

    const automaticBreaks = buildAutomaticBreakPositions({
      totalContentHeightPx: 1200,
      pageHeightPx: 748,
      avoidBlocks,
    });
    const segments = buildExportPageSegments({
      totalContentHeightPx: 1200,
      pageHeightPx: 748,
      customBreakPositions: automaticBreaks,
    });

    expect(automaticBreaks).toEqual([700]);
    expect(segments).toEqual([
      { index: 0, startPx: 0, heightPx: 700, isLast: false },
      { index: 1, startPx: 700, heightPx: 500, isLast: true },
    ]);
  });

  // ── Custom-break validation height tests ───────────────────────────────────
  // The real bug scenario:
  //   - UI measured live layout at 1 080 px. User placed a cut at Y = 1 000 px.
  //   - getExportContentHeightPx trimmed trailing whitespace → trimmedH = 1 020 px.
  //   - clampBreakPositions clamps positions to [minGap, totalH - minGap].
  //   - OLD: clampBreakPositions(1000, 1020, 40) clamps to max = 980 → cut MOVED to 980 (wrong).
  //   - FIX: validationH = max(1020, 1080, 1000+40) = 1080.
  //         clampBreakPositions(1000, 1080, 40) → 1000 <= 1040 → kept at 1000 (correct).

  it('keeps a near-bottom break at its exact position when validating against the safe height', () => {
    const trimmedH = 1020;
    const liveH = 1080;
    const breakY = 1000;
    const minGap = 40;
    const safeValidationH = Math.max(trimmedH, liveH, breakY + minGap); // 1080

    // Old (buggy) clamping — break is silently moved from 1000 to 980
    expect(clampBreakPositions([breakY], trimmedH, minGap)).toEqual([980]);
    // New (safe) clamping — break is preserved at user's intended position
    expect(clampBreakPositions([breakY], safeValidationH, minGap)).toEqual([breakY]);
  });

  it('final-page cropping still works when breaks are validated against the safe height', () => {
    const trimmedH = 1020;
    const liveH = 1080;
    const breakY = 1000;
    const minGap = 40;
    const safeH = Math.max(trimmedH, liveH, breakY + minGap); // 1080

    // Clamp with safe height so the break is not moved from 1000 → 980
    const clampedBreaks = clampBreakPositions([breakY], safeH, minGap);

    // Build segments: use trimmedH as totalContentHeightPx (crop height) +
    // safeH as breakValidationHeightPx so the break survives internal
    // normalizeBreakPositions which would otherwise filter it against trimmedH.
    const segments = buildExportPageSegments({
      totalContentHeightPx: trimmedH, // crop height preserves last-page trimming
      pageHeightPx: 748,
      customBreakPositions: clampedBreaks,
      breakValidationHeightPx: safeH,  // keeps break valid inside segment builder
    });

    // Break is at the user-intended position (1000), not the corrupted position (980)
    expect(clampedBreaks).toEqual([1000]);
    expect(segments).toEqual([
      { index: 0, startPx: 0,    heightPx: 1000, isLast: false },
      // last page = 1020 - 1000 = 20px (trimmed, not blank white space)
      { index: 1, startPx: 1000, heightPx: 20,   isLast: true },
    ]);
  });

  it('does not corrupt a break placed at exactly (liveHeight - minGap)', () => {
    const liveH = 1000;
    const minGap = 40;
    const breakY = liveH - minGap; // 960 — bottom of valid UI range
    const safeH = Math.max(liveH, breakY + minGap); // 1000
    // Break is kept at exact position with safe height
    expect(clampBreakPositions([breakY], safeH, minGap)).toEqual([breakY]);
  });

  it('2-page resume with manual cut: last page is trimmed not blank', () => {
    const trimmedH = 1490;
    const liveH = 1580;
    const breakY = 748;
    const minGap = 40;
    const safeH = Math.max(trimmedH, liveH, breakY + minGap); // 1580

    const clampedBreaks = clampBreakPositions([breakY], safeH, minGap);
    const segments = buildExportPageSegments({
      totalContentHeightPx: trimmedH,   // trimmed crop height
      pageHeightPx: 748,
      customBreakPositions: clampedBreaks,
    });

    expect(clampedBreaks).toEqual([748]);
    expect(segments).toEqual([
      { index: 0, startPx: 0,   heightPx: 748, isLast: false },
      { index: 1, startPx: 748, heightPx: 742, isLast: true }, // 1490-748=742 cropped
    ]);
  });

  it('clampBreakPositions clamps (not drops) breaks that are slightly outside the trimmed range', () => {
    // clampBreakPositions moves the break to the nearest valid boundary
    // A break just below minGap is clamped up to minGap
    expect(clampBreakPositions([10], 1000, 40)).toEqual([40]);
    // A break just above trimmedH-minGap is clamped down
    expect(clampBreakPositions([1000], 1035, 40)).toEqual([995]); // max = 1035-40=995
    // A break within range is kept exactly
    expect(clampBreakPositions([960], 1035, 40)).toEqual([960]);
  });

  it('prevents avoid-block snapping from shifting a cut forward past a section heading or section top', () => {
    const sections = [{ top: 800, bottom: 1200, headingTop: 836 }];
    const avoidBlocks = [{ top: 700, bottom: 810, childTops: [] }]; // previous block overlaps slightly

    // Section snaps should snap Y=840 back to the section boundary (800)
    const sectionSnapped = snapBreakPositionsToSectionHeadings([840], sections, 1500, 40);
    expect(sectionSnapped).toEqual([800]);

    // Avoid block snaps should keep it at 800 instead of snapping to bottom of avoid block (810)
    const avoidSnapped = snapBreakPositionsToAvoidBlocks(sectionSnapped, avoidBlocks, 748, 1500, 40, sections);
    expect(avoidSnapped).toEqual([800]);
  });

  it('prevents avoid-block snapping from shifting a cut forward past a negative-margin heading top', () => {
    const sections = [{ top: 800, bottom: 1200, headingTop: 790 }];
    const avoidBlocks = [{ top: 700, bottom: 810, childTops: [] }]; // previous block overlaps slightly

    // Section snaps should snap Y=800 to the minimum of section top and heading top (790)
    const sectionSnapped = snapBreakPositionsToSectionHeadings([800], sections, 1500, 40);
    expect(sectionSnapped).toEqual([790]);

    // Avoid block snaps should keep it at 790 instead of snapping to bottom of avoid block (810)
    const avoidSnapped = snapBreakPositionsToAvoidBlocks(sectionSnapped, avoidBlocks, 748, 1500, 40, sections);
    expect(avoidSnapped).toEqual([790]);
  });

  it('snaps custom breaks to section headings under non-linear shifts using client-intent alignment', () => {
    // Client height = 1000, client break Y = 800, client section heading top = 805 (cut was before section heading).
    // Server height = 920, server section heading top = 740.
    // Proportional scale factor = 920 / 1000 = 0.92.
    // Proportional scaled break Y = 800 * 0.92 = 736.
    const sections = [{ top: 740, bottom: 900, headingTop: 740 }];
    const snapped = snapBreakPositionsToSectionHeadings([736], sections, 920, 40, 1000);
    expect(snapped).toEqual([740]);
  });
});
