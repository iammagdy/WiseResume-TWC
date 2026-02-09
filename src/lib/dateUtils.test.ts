import { describe, it, expect } from 'vitest';
import { formatDateRange } from './dateUtils';

describe('formatDateRange', () => {
  it('should format a valid date range', () => {
    expect(formatDateRange('Jan 2020', 'Dec 2020', false)).toBe('Jan 2020 – Dec 2020');
  });

  it('should format a current position', () => {
    expect(formatDateRange('Jan 2020', '', true)).toBe('Jan 2020 – Present');
  });

  it('should handle missing end date without a trailing hyphen', () => {
    // This test case exposes the current bug where "Jan 2020 – " is returned.
    // I expect this test to fail initially.
    expect(formatDateRange('Jan 2020', '', false)).toBe('Jan 2020');
  });

  it('should handle "Month Year" format', () => {
    expect(formatDateRange('January 2020', 'December 2020', false)).toBe('Jan 2020 – Dec 2020');
  });

  it('should handle "YYYY-MM" format', () => {
    expect(formatDateRange('2020-01', '2020-12', false)).toBe('Jan 2020 – Dec 2020');
  });

  it('should handle "YYYY" format', () => {
    // Default to Jan if only year is provided
    expect(formatDateRange('2020', '2021', false)).toBe('Jan 2020 – Jan 2021');
  });

  it('should return empty string if start date is invalid', () => {
    expect(formatDateRange('', 'Dec 2020', false)).toBe('');
    expect(formatDateRange('Invalid Date', 'Dec 2020', false)).toBe('');
  });

  it('should handle missing end date with valid start date (edge case)', () => {
     expect(formatDateRange('Jan 2020', 'Invalid Date', false)).toBe('Jan 2020');
  });
});
