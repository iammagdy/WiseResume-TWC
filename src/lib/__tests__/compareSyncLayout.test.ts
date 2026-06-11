import { describe, expect, it } from 'vitest';
import { computeCompareLayoutSync } from '@/lib/compareSyncLayout';

describe('computeCompareLayoutSync', () => {
  it('scales down the longer CV so both sides share the same stage height', () => {
    const sync = computeCompareLayoutSync(1500, 1000);
    expect(sync.beforeExtraScale).toBeCloseTo(1000 / 1500, 4);
    expect(sync.afterExtraScale).toBe(1);
    expect(sync.stageHeight).toBe(1000);
  });

  it('scales down the after side when it is taller', () => {
    const sync = computeCompareLayoutSync(1000, 1400);
    expect(sync.beforeExtraScale).toBe(1);
    expect(sync.afterExtraScale).toBeCloseTo(1000 / 1400, 4);
    expect(sync.stageHeight).toBe(1000);
  });
});
