import { describe, expect, it } from 'vitest';
import { computeDialogPreviewScale, computeSpreadPreviewScale } from './pageBreakPreviewScale';

describe('computeDialogPreviewScale', () => {
  it('fits to container width so a letter-width resume uses full preview width', () => {
    const { scale, visualWidth, visualHeight } = computeDialogPreviewScale(400, 612, 1500);
    expect(scale).toBeCloseTo(400 / 612, 5);
    expect(visualWidth).toBe(400);
    expect(visualHeight).toBeCloseTo(1500 * (400 / 612), 1);
  });
});

describe('computeSpreadPreviewScale', () => {
  it('fits two pages side by side within the container', () => {
    const { scale, visualWidth } = computeSpreadPreviewScale(800, 612, 836, 2, 640, 16);
    expect(scale).toBeLessThan(1);
    expect(visualWidth).toBeLessThanOrEqual(800);
  });
});
