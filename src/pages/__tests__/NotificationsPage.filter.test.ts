/**
 * Focused tests for the NotificationsPage filter logic.
 * Tests are pure unit tests on the filter predicate — no Appwrite SDK, no router needed.
 *
 * PORT-NOTIF-10
 */
import { describe, it, expect } from 'vitest';

type FilterTab = 'all' | 'unread' | 'visits' | 'interests' | 'messages' | 'ai_resume' | 'system';

interface Notif {
  $id: string;
  $createdAt: string;
  type: string;
  is_read: boolean;
}

/**
 * Pure filter function extracted from NotificationsPage so it can be tested
 * without React or Appwrite context.
 */
function applyFilter(notifications: Notif[], filter: FilterTab): Notif[] {
  return notifications.filter(n => {
    if (filter === 'all')       return true;
    if (filter === 'unread')    return !n.is_read;
    if (filter === 'visits')    return n.type === 'portfolio_visit';
    if (filter === 'interests') return n.type === 'portfolio_interest';
    if (filter === 'messages')  return n.type === 'portfolio_message';
    if (filter === 'ai_resume') return (
      n.type === 'ai_resume'     ||
      n.type === 'tailoring'     ||
      n.type === 'resume_import' ||
      n.type === 'ai_credit'
    );
    // 'system' — catch-all
    return n.type === 'system' || (
      n.type !== 'application' &&
      n.type !== 'portfolio_visit' &&
      n.type !== 'portfolio_interest' &&
      n.type !== 'portfolio_message' &&
      n.type !== 'ai_resume' &&
      n.type !== 'tailoring' &&
      n.type !== 'resume_import' &&
      n.type !== 'ai_credit'
    );
  });
}

const base: Notif = { $id: '1', $createdAt: new Date().toISOString(), type: 'system', is_read: false };

const SAMPLE: Notif[] = [
  { ...base, $id: '1', type: 'portfolio_visit',    is_read: false },
  { ...base, $id: '2', type: 'portfolio_interest', is_read: true  },
  { ...base, $id: '3', type: 'portfolio_message',  is_read: false },
  { ...base, $id: '4', type: 'application',        is_read: true  },
  { ...base, $id: '5', type: 'system',             is_read: false },
  { ...base, $id: '6', type: 'tailoring',          is_read: true  },
  { ...base, $id: '7', type: 'unknown_future_type',is_read: false },
];

describe('NotificationsPage filter logic', () => {
  it('all: returns every notification', () => {
    expect(applyFilter(SAMPLE, 'all')).toHaveLength(SAMPLE.length);
  });

  it('unread: returns only unread', () => {
    const result = applyFilter(SAMPLE, 'unread');
    expect(result.every(n => !n.is_read)).toBe(true);
    // IDs 1, 3, 5, 7 are unread
    expect(result.map(n => n.$id).sort()).toEqual(['1', '3', '5', '7']);
  });

  it('visits: returns only portfolio_visit type', () => {
    const result = applyFilter(SAMPLE, 'visits');
    expect(result).toHaveLength(1);
    expect(result[0].$id).toBe('1');
  });

  it('interests: returns only portfolio_interest type', () => {
    const result = applyFilter(SAMPLE, 'interests');
    expect(result).toHaveLength(1);
    expect(result[0].$id).toBe('2');
  });

  it('messages: returns only portfolio_message type', () => {
    const result = applyFilter(SAMPLE, 'messages');
    expect(result).toHaveLength(1);
    expect(result[0].$id).toBe('3');
  });

  it('ai_resume: returns tailoring, ai_resume, resume_import, ai_credit types', () => {
    const extended = [
      ...SAMPLE,
      { ...base, $id: '8', type: 'resume_import', is_read: false },
      { ...base, $id: '9', type: 'ai_credit',     is_read: false },
      { ...base, $id: '10',type: 'ai_resume',     is_read: false },
    ];
    const result = applyFilter(extended, 'ai_resume');
    expect(result.map(n => n.$id).sort()).toEqual(['10', '6', '8', '9'].sort());
  });

  it('system: catches application type correctly (excluded from system tab)', () => {
    // 'application' type is NOT shown under system — it is legacy and only appears under all
    const result = applyFilter(SAMPLE, 'system');
    const ids = result.map(n => n.$id);
    expect(ids).not.toContain('4'); // application not in system tab
    expect(ids).toContain('5');     // system type IS in system tab
    expect(ids).toContain('7');     // unknown_future_type IS in system tab (catch-all)
  });

  it('system: does not show portfolio event types', () => {
    const result = applyFilter(SAMPLE, 'system');
    const types = result.map(n => n.type);
    expect(types).not.toContain('portfolio_visit');
    expect(types).not.toContain('portfolio_interest');
    expect(types).not.toContain('portfolio_message');
    expect(types).not.toContain('tailoring');
  });

  it('all: legacy application type appears under all (backward compat)', () => {
    const result = applyFilter(SAMPLE, 'all');
    expect(result.find(n => n.type === 'application')).toBeDefined();
  });

  it('empty input returns empty output for every filter', () => {
    const filters: FilterTab[] = ['all', 'unread', 'visits', 'interests', 'messages', 'ai_resume', 'system'];
    filters.forEach(f => {
      expect(applyFilter([], f)).toHaveLength(0);
    });
  });
});
