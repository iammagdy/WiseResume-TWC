import { describe, expect, it } from 'vitest';
import {
  sanitizeVisibleBroadcast,
  selectVisibleBroadcasts,
} from '../../../server/broadcastsFetch';

const NOW = Date.parse('2026-07-24T12:00:00.000Z');

function document(overrides: Record<string, unknown> = {}) {
  return {
    $id: 'broadcast-1',
    title: 'Product update',
    body: 'A workspace announcement.',
    severity: 'info',
    active: true,
    expires_at: null,
    ...overrides,
  };
}

describe('broadcast visibility', () => {
  it('returns active, non-expired broadcasts', () => {
    expect(sanitizeVisibleBroadcast(document(), NOW)).toEqual({
      id: 'broadcast-1',
      title: 'Product update',
      body: 'A workspace announcement.',
      severity: 'info',
    });
    expect(sanitizeVisibleBroadcast(document({
      expires_at: '2026-07-24T13:00:00.000Z',
    }), NOW)).not.toBeNull();
  });

  it('excludes inactive and expired broadcasts', () => {
    expect(sanitizeVisibleBroadcast(document({ active: false }), NOW)).toBeNull();
    expect(sanitizeVisibleBroadcast(document({
      expires_at: '2026-07-24T11:59:59.000Z',
    }), NOW)).toBeNull();
  });

  it('fails closed for malformed optional expiry values', () => {
    expect(sanitizeVisibleBroadcast(document({ expires_at: 'not-a-date' }), NOW)).toBeNull();
    expect(sanitizeVisibleBroadcast(document({ expires_at: 123 }), NOW)).toBeNull();
  });

  it('excludes malformed records and handles an empty collection', () => {
    expect(sanitizeVisibleBroadcast(document({ title: '' }), NOW)).toBeNull();
    expect(sanitizeVisibleBroadcast(document({ body: null }), NOW)).toBeNull();
    expect(selectVisibleBroadcasts([], NOW)).toEqual([]);
  });

  it('normalizes unknown severity without exposing extra fields', () => {
    expect(sanitizeVisibleBroadcast(document({
      severity: 'other',
      created_by: 'private-admin-id',
    }), NOW)).toEqual({
      id: 'broadcast-1',
      title: 'Product update',
      body: 'A workspace announcement.',
      severity: 'info',
    });
  });

  it('returns visible broadcasts newest first', () => {
    expect(selectVisibleBroadcasts([
      document({ $id: 'older', created_at: '2026-07-24T09:00:00.000Z' }),
      document({ $id: 'newer', created_at: '2026-07-24T11:00:00.000Z' }),
    ], NOW).map((broadcast) => broadcast.id)).toEqual(['newer', 'older']);
  });
});
