import { describe, expect, it } from 'vitest';
import { computeDialogPreviewScale } from './pageBreakPreviewScale';

describe('computeDialogPreviewScale', () => {
  it('fits to container width so a letter-width resume uses full preview width', () => {
    const { scale, visualWidth, visualHeight } = computeDialogPreviewScale(400, 612, 1500);
    expect(scale).toBeCloseTo(400 / 612, 5);
    expect(visualWidth).toBe(400);
    expect(visualHeight).toBeCloseTo(1500 * (400 / 612), 1);
  });
});
