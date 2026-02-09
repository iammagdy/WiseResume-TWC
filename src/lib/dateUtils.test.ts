import { describe, it, expect } from 'vitest';
import { formatDuration } from './dateUtils';

describe('formatDuration', () => {
  it('should return empty string for negative months', () => {
    expect(formatDuration(-1)).toBe('');
  });

  it('should format 0 months as "Less than 1 month"', () => {
    expect(formatDuration(0)).toBe('Less than 1 month');
  });

  it('should handle small fractional months (0.4) by rounding down to 0 ("Less than 1 month")', () => {
    expect(formatDuration(0.4)).toBe('Less than 1 month');
  });

  it('should handle fractional months (0.6) by rounding up to 1 ("1 month")', () => {
    expect(formatDuration(0.6)).toBe('1 month');
  });

  it('should format 1 month correctly (singular)', () => {
    expect(formatDuration(1)).toBe('1 month');
  });

  it('should format multiple months correctly (plural)', () => {
    expect(formatDuration(2)).toBe('2 months');
    expect(formatDuration(11)).toBe('11 months');
  });

  it('should format 12 months as "1 year"', () => {
    expect(formatDuration(12)).toBe('1 year');
  });

  it('should format 13 months as "1 year 1 month"', () => {
    expect(formatDuration(13)).toBe('1 year 1 month');
  });

  it('should format 14 months as "1 year 2 months"', () => {
    expect(formatDuration(14)).toBe('1 year 2 months');
  });

  it('should format 24 months as "2 years"', () => {
    expect(formatDuration(24)).toBe('2 years');
  });

  it('should format 26 months as "2 years 2 months"', () => {
    expect(formatDuration(26)).toBe('2 years 2 months');
  });

  it('should handle fractional months near year boundary (11.9 -> 12 -> "1 year")', () => {
    expect(formatDuration(11.9)).toBe('1 year');
  });

  it('should handle fractional months just over year boundary (12.1 -> 12 -> "1 year")', () => {
    expect(formatDuration(12.1)).toBe('1 year');
import {
  getTotalGapMonths,
  detectGaps,
  getMonthsDifference,
  parseResumeDate,
  ParsedDate,
  GapInfo,
  formatDuration,
  formatDateRange,
  calculateDuration,
  compareDates
} from './dateUtils';

describe('dateUtils', () => {
  describe('getTotalGapMonths', () => {
    it('should return 0 for an empty array', () => {
      expect(getTotalGapMonths([])).toBe(0);
    });

    it('should return the sum of months for multiple gaps', () => {
      const gaps: GapInfo[] = [
        { startDate: { month: 0, year: 2020 }, endDate: { month: 2, year: 2020 }, months: 2 },
        { startDate: { month: 5, year: 2021 }, endDate: { month: 8, year: 2021 }, months: 3 },
      ];
      expect(getTotalGapMonths(gaps)).toBe(5);
    });

    it('should handle a single gap correctly', () => {
      const gaps: GapInfo[] = [
        { startDate: { month: 0, year: 2020 }, endDate: { month: 5, year: 2020 }, months: 5 },
      ];
      expect(getTotalGapMonths(gaps)).toBe(5);
    });

    // robust handling for negative gaps
    it('should treat negative gap months as 0', () => {
      const gaps: GapInfo[] = [
        { startDate: { month: 0, year: 2020 }, endDate: { month: 0, year: 2020 }, months: -2 }, // negative gap
        { startDate: { month: 5, year: 2021 }, endDate: { month: 8, year: 2021 }, months: 3 },
      ];
      // Expectation: -2 treated as 0, so 0 + 3 = 3
      expect(getTotalGapMonths(gaps)).toBe(3);
    });

    // robust handling for undefined/null input (simulated via casting)
    it('should return 0 for undefined or null input', () => {
        // @ts-ignore
        expect(getTotalGapMonths(undefined)).toBe(0);
        // @ts-ignore
        expect(getTotalGapMonths(null)).toBe(0);
    });

    it('should handle decimal gap months consistently', () => {
      const gaps: GapInfo[] = [
        { startDate: { month: 0, year: 2020 }, endDate: { month: 0, year: 2020 }, months: 0.5 },
        { startDate: { month: 5, year: 2021 }, endDate: { month: 8, year: 2021 }, months: 2.5 },
      ];
      // 0.5 + 2.5 = 3
      expect(getTotalGapMonths(gaps)).toBe(3);
    });
  });

  describe('detectGaps', () => {
    it('should return no gaps for continuous employment', () => {
      const experiences = [
        { startDate: 'Jan 2020', endDate: 'Dec 2020', current: false },
        { startDate: 'Jan 2021', endDate: 'Present', current: true }, // Starts immediately after
      ];
      const gaps = detectGaps(experiences);
      expect(gaps).toHaveLength(0);
    });

    it('should detect a single gap between jobs', () => {
      const experiences = [
        { startDate: 'Jan 2020', endDate: 'Jun 2020', current: false },
        // Gap: Jul, Aug (2 months)
        { startDate: 'Sep 2020', endDate: 'Dec 2020', current: false },
      ];
      const gaps = detectGaps(experiences);
      expect(gaps).toHaveLength(1);
      expect(gaps[0].months).toBe(2);
      expect(gaps[0].startDate).toEqual({ month: 5, year: 2020 }); // Jun (index 5)
      expect(gaps[0].endDate).toEqual({ month: 8, year: 2020 });   // Sep (index 8)
    });

    it('should detect multiple gaps', () => {
      const experiences = [
        { startDate: 'Jan 2020', endDate: 'Mar 2020', current: false },
        // Gap 1: Apr, May (2 months)
        { startDate: 'Jun 2020', endDate: 'Aug 2020', current: false },
        // Gap 2: Sep (1 month)
        { startDate: 'Oct 2020', endDate: 'Dec 2020', current: false },
      ];
      const gaps = detectGaps(experiences);
      expect(gaps).toHaveLength(2);
      expect(gaps[0].months).toBe(1); // The second gap (Sep) - detected in reverse order but pushed? Wait, implementation pushes in loop.
      // Let's verify order. Implementation sorts descending (most recent first).
      // Sorted: Oct-Dec, Jun-Aug, Jan-Mar
      // Loop 0: Current=Oct-Dec, Prev=Jun-Aug. Gap between Aug and Oct -> 1 month.
      // Loop 1: Current=Jun-Aug, Prev=Jan-Mar. Gap between Mar and Jun -> 2 months.
      // So gaps array will have [1 month gap, 2 month gap]

      expect(gaps[0].months).toBe(1);
      expect(gaps[1].months).toBe(2);
    });

    it('should ignore gaps smaller than 1 month', () => {
       const experiences = [
        { startDate: 'Jan 2020', endDate: 'Jan 2020', current: false },
        { startDate: 'Feb 2020', endDate: 'Mar 2020', current: false },
      ];
      // Gap between Jan and Feb is 1 month difference?
      // getMonthsDifference(Jan, Feb) = 1. So it is >= 1.

      // Try same month
      const experiences2 = [
        { startDate: 'Jan 2020', endDate: 'Jan 2020', current: false },
        { startDate: 'Jan 2020', endDate: 'Feb 2020', current: false },
      ];
       // Gap between Jan and Jan is 0. Should be ignored.
      const gaps = detectGaps(experiences2);
      expect(gaps).toHaveLength(0);
    });

    it('should handle overlapping jobs (negative gap)', () => {
      const experiences = [
        { startDate: 'Jan 2020', endDate: 'Dec 2020', current: false },
        { startDate: 'Jun 2020', endDate: 'Present', current: true }, // Overlap
      ];
      // Sorted: Jun-Present, Jan-Dec
      // Gap between Dec 2020 and Jun 2020 -> -6 months
      // Should be ignored
      const gaps = detectGaps(experiences);
      expect(gaps).toHaveLength(0);
    });
  });

  describe('getMonthsDifference', () => {
    it('should calculate difference correctly within the same year', () => {
      const start: ParsedDate = { month: 0, year: 2020 }; // Jan
      const end: ParsedDate = { month: 5, year: 2020 };   // Jun
      expect(getMonthsDifference(start, end)).toBe(5);
    });

    it('should calculate difference across years', () => {
      const start: ParsedDate = { month: 10, year: 2020 }; // Nov
      const end: ParsedDate = { month: 1, year: 2021 };    // Feb
      // Nov -> Dec (1) -> Jan (2) -> Feb (3)
      // (2021 - 2020)*12 + (1 - 10) = 12 - 9 = 3
      expect(getMonthsDifference(start, end)).toBe(3);
    });

    it('should return negative if end is before start', () => {
       const start: ParsedDate = { month: 5, year: 2020 };
       const end: ParsedDate = { month: 0, year: 2020 };
       expect(getMonthsDifference(start, end)).toBe(-5);
    });
  });

  describe('parseResumeDate', () => {
    it('should parse "Month Year" format', () => {
      expect(parseResumeDate('Jan 2020')).toEqual({ month: 0, year: 2020 });
      expect(parseResumeDate('January 2020')).toEqual({ month: 0, year: 2020 });
    });

    it('should parse "Year-Month" format', () => {
      expect(parseResumeDate('2020-01')).toEqual({ month: 0, year: 2020 });
      expect(parseResumeDate('2020-12')).toEqual({ month: 11, year: 2020 });
    });

    it('should parse "Present"', () => {
      const now = new Date();
      const parsed = parseResumeDate('Present');
      expect(parsed).not.toBeNull();
      expect(parsed?.year).toBe(now.getFullYear());
      expect(parsed?.month).toBe(now.getMonth());
      expect(parsed?.isPresent).toBe(true);
    });

    it('should parse just "Year" (defaulting to Jan)', () => {
        expect(parseResumeDate('2020')).toEqual({ month: 0, year: 2020 });
    });

    it('should return null for invalid strings', () => {
      expect(parseResumeDate('')).toBeNull();
      expect(parseResumeDate('Invalid Date')).toBeNull();
    });
  });

  describe('formatDuration', () => {
      it('should format months < 1 correctly', () => {
          expect(formatDuration(0)).toBe('< 1 mo');
      });
      it('should format exact months', () => {
          expect(formatDuration(5)).toBe('5 mo');
      });
      it('should format years and months', () => {
          expect(formatDuration(14)).toBe('1 yr 2 mo');
      });
      it('should format exact years', () => {
          expect(formatDuration(24)).toBe('2 yrs');
      });
  });

  describe('formatDateRange', () => {
    it('should format date range correctly', () => {
      expect(formatDateRange('Jan 2020', 'Dec 2020', false)).toBe('Jan 2020 – Dec 2020');
    });

    it('should handle "Present" correctly', () => {
      expect(formatDateRange('Jan 2020', '', true)).toBe('Jan 2020 – Present');
    });
  });

  describe('calculateDuration', () => {
    it('should calculate duration correctly', () => {
      expect(calculateDuration('Jan 2020', 'Jun 2020', false)).toBe('5 mo');
    });
  });

  describe('compareDates', () => {
    it('should compare dates correctly', () => {
      const date1 = { month: 0, year: 2020 };
      const date2 = { month: 5, year: 2020 };
      expect(compareDates(date1, date2)).toBeLessThan(0);
      expect(compareDates(date2, date1)).toBeGreaterThan(0);
      expect(compareDates(date1, date1)).toBe(0);
    });
  });
});
