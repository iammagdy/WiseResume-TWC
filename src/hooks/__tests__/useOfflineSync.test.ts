import { describe, it, expect } from 'vitest';
import { isOfflineSyncConflict } from '../useOfflineSync';

// B6: conflict detection must compare the server $updatedAt against the baseline
// the offline edit started from — NOT the client wall-clock — so device clock
// skew can't silently discard valid offline edits.
describe('isOfflineSyncConflict (B6)', () => {
  const baseUpdatedAt = '2026-06-23T10:00:00.000Z';

  it('flags a real conflict: server advanced past the load baseline', () => {
    const change = { timestamp: 0, baseUpdatedAt };
    expect(isOfflineSyncConflict('2026-06-23T10:05:00.000Z', change)).toBe(true);
  });

  it('does NOT flag a conflict when the server is unchanged since baseline', () => {
    const change = { timestamp: 0, baseUpdatedAt };
    expect(isOfflineSyncConflict(baseUpdatedAt, change)).toBe(false);
  });

  it('does NOT discard a valid offline edit when the client clock is far behind the server (skew)', () => {
    // Client clock is wildly behind → queue timestamp is tiny. Old logic compared
    // serverTime > change.timestamp and would WRONGLY discard. Baseline logic does not.
    const change = { timestamp: 1_000, baseUpdatedAt };
    const serverSameAsBaseline = baseUpdatedAt;
    expect(isOfflineSyncConflict(serverSameAsBaseline, change)).toBe(false);
  });

  it('falls back to queue timestamp for legacy entries without a baseline', () => {
    const change = { timestamp: new Date('2026-06-23T10:00:00.000Z').getTime() };
    expect(isOfflineSyncConflict('2026-06-23T10:05:00.000Z', change)).toBe(true);
    expect(isOfflineSyncConflict('2026-06-23T09:55:00.000Z', change)).toBe(false);
  });
});
