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
});
