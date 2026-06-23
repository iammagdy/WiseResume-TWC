import { describe, it, expect } from 'vitest';
import { isReversedDateRange } from '../dateUtils';

describe('isReversedDateRange (B14)', () => {
  it('flags an end date before the start date', () => {
    expect(isReversedDateRange('Jan 2022', 'Jan 2020', false)).toBe(true);
    expect(isReversedDateRange('2022-05', '2021-05', false)).toBe(true);
  });

  it('does not flag a valid forward range', () => {
    expect(isReversedDateRange('Jan 2020', 'Jan 2022', false)).toBe(false);
    expect(isReversedDateRange('Jan 2020', 'Jan 2020', false)).toBe(false);
  });

  it('never flags a current/ongoing entry', () => {
    expect(isReversedDateRange('Jan 2022', '', true)).toBe(false);
    expect(isReversedDateRange('Jan 2022', 'Jan 2020', true)).toBe(false);
  });

  it('is lenient with missing or unparseable dates', () => {
    expect(isReversedDateRange('', 'Jan 2020', false)).toBe(false);
    expect(isReversedDateRange('Jan 2020', '', false)).toBe(false);
    expect(isReversedDateRange('garbage', 'also garbage', false)).toBe(false);
  });
});
