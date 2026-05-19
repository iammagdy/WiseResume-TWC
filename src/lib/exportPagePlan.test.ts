import { describe, expect, it } from 'vitest';
import {
  buildExportPageSegments,
  normalizeBreakPositions,
  scaleBreakPositionsToMeasuredHeight,
  snapBreakPositionsToSectionHeadings,
} from './exportPagePlan';

describe('exportPagePlan', () => {
  it('normalizes user break positions by sorting, removing invalid values, and enforcing minimum gaps', () => {
    expect(normalizeBreakPositions([740, 12, 500, 510, 1600, -5, Number.NaN], 1500, 40))
      .toEqual([500, 740]);
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
});
