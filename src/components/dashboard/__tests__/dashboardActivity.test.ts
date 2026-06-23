import { describe, it, expect } from 'vitest';
import { mergeActivityItems, type ActivityFeedItem } from '../dashboardActivityLabels';

const mk = (over: Partial<ActivityFeedItem>): ActivityFeedItem => ({
  id: 'x', label: 'L', detail: undefined, time: 't', sortKey: 0, ...over,
});

describe('mergeActivityItems (B3)', () => {
  it('dedupes a local optimistic item that the server already records', () => {
    const server = [mk({ id: 's1', label: 'Resume created', resumeId: 'r1', sortKey: 100 })];
    const local = [mk({ id: 'l1', label: 'Resume created', resumeId: 'r1', sortKey: 101 })];
    const merged = mergeActivityItems(server, local, 6);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe('s1'); // server wins
  });

  it('keeps a local-only event type the server cannot represent', () => {
    const server = [mk({ id: 's1', label: 'Resume created', resumeId: 'r1', sortKey: 100 })];
    const local = [mk({ id: 'l1', label: 'Resume renamed', resumeId: 'r1', sortKey: 200 })];
    const merged = mergeActivityItems(server, local, 6);
    expect(merged.map((m) => m.id)).toEqual(['l1', 's1']); // newest first
  });

  it('sorts by recency and respects the limit', () => {
    const server = [
      mk({ id: 's1', label: 'A', resumeId: 'a', sortKey: 1 }),
      mk({ id: 's2', label: 'B', resumeId: 'b', sortKey: 3 }),
    ];
    const local = [mk({ id: 'l1', label: 'C', resumeId: 'c', sortKey: 2 })];
    const merged = mergeActivityItems(server, local, 2);
    expect(merged.map((m) => m.id)).toEqual(['s2', 'l1']);
  });

  it('returns an empty array when there is no activity (honest empty state)', () => {
    expect(mergeActivityItems([], [], 6)).toEqual([]);
  });
});
