import { describe, expect, it } from 'vitest';
import { buildExportPageSegments, normalizeBreakPositions } from './exportPagePlan';

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
