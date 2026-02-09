import { describe, it, expect } from 'vitest';
import {
  parseResumeDate,
  getMonthsDifference,
  formatDuration,
  formatDateRange,
  calculateDuration,
  compareDates,
  detectGaps,
  getTotalGapMonths,
  ParsedDate,
} from './dateUtils';

describe('dateUtils', () => {
  describe('parseResumeDate', () => {
    // Happy paths - Existing formats
    it('parses "Month Year" format correctly', () => {
      expect(parseResumeDate('Jan 2020')).toEqual({ month: 0, year: 2020 });
      expect(parseResumeDate('January 2020')).toEqual({ month: 0, year: 2020 });
      expect(parseResumeDate('Dec 2021')).toEqual({ month: 11, year: 2021 });
    });

    it('parses "Year-Month" (ISO) format correctly', () => {
      expect(parseResumeDate('2020-01')).toEqual({ month: 0, year: 2020 });
      expect(parseResumeDate('2021-12')).toEqual({ month: 11, year: 2021 });
    });

    it('parses "Year" only format correctly (defaults to January)', () => {
      expect(parseResumeDate('2020')).toEqual({ month: 0, year: 2020 });
      expect(parseResumeDate('1999')).toEqual({ month: 0, year: 1999 });
    });

    it('parses "Present", "Current", "Now" correctly', () => {
      const now = new Date();
      const expected = {
        month: now.getMonth(),
        year: now.getFullYear(),
        isPresent: true,
      };
      expect(parseResumeDate('Present')).toEqual(expected);
      expect(parseResumeDate('Current')).toEqual(expected);
      expect(parseResumeDate('Now')).toEqual(expected);
    });

    // New formats requested
    it('parses "MM/YYYY" format correctly', () => {
      expect(parseResumeDate('01/2020')).toEqual({ month: 0, year: 2020 });
      expect(parseResumeDate('12/2021')).toEqual({ month: 11, year: 2021 });
      expect(parseResumeDate('5/2022')).toEqual({ month: 4, year: 2022 }); // Single digit month
    });

    it('parses "Month, Year" format correctly', () => {
      expect(parseResumeDate('Jan, 2020')).toEqual({ month: 0, year: 2020 });
      expect(parseResumeDate('January, 2020')).toEqual({ month: 0, year: 2020 });
    });

    it('parses "Month. Year" format correctly', () => {
      expect(parseResumeDate('Jan. 2020')).toEqual({ month: 0, year: 2020 });
      expect(parseResumeDate('Dec. 2021')).toEqual({ month: 11, year: 2021 });
    });

    // Edge cases
    it('returns null for invalid inputs', () => {
      expect(parseResumeDate('')).toBeNull();
      // @ts-ignore
      expect(parseResumeDate(null)).toBeNull();
      // @ts-ignore
      expect(parseResumeDate(undefined)).toBeNull();
      expect(parseResumeDate('Not a date')).toBeNull();
      expect(parseResumeDate('2020-13')).toBeNull(); // Invalid month
      expect(parseResumeDate('00/2020')).toBeNull(); // Invalid month
    });

    it('handles case insensitivity', () => {
      expect(parseResumeDate('jan 2020')).toEqual({ month: 0, year: 2020 });
      expect(parseResumeDate('JAN 2020')).toEqual({ month: 0, year: 2020 });
    });
  });

  describe('getMonthsDifference', () => {
    it('calculates difference correctly within same year', () => {
      const start: ParsedDate = { month: 0, year: 2020 }; // Jan 2020
      const end: ParsedDate = { month: 5, year: 2020 };   // Jun 2020
      expect(getMonthsDifference(start, end)).toBe(5);
    });

    it('calculates difference correctly across years', () => {
      const start: ParsedDate = { month: 0, year: 2020 }; // Jan 2020
      const end: ParsedDate = { month: 0, year: 2021 };   // Jan 2021
      expect(getMonthsDifference(start, end)).toBe(12);
    });

    it('handles start after end (negative difference)', () => {
      const start: ParsedDate = { month: 5, year: 2020 };
      const end: ParsedDate = { month: 0, year: 2020 };
      expect(getMonthsDifference(start, end)).toBe(-5);
    });
  });

  describe('formatDuration', () => {
    it('formats 0 months correctly', () => {
      expect(formatDuration(0)).toBe('< 1 mo');
    });

    it('formats months less than a year', () => {
      expect(formatDuration(5)).toBe('5 mo');
      expect(formatDuration(11)).toBe('11 mo');
    });

    it('formats exactly one year', () => {
      expect(formatDuration(12)).toBe('1 yr');
    });

    it('formats years and months', () => {
      expect(formatDuration(13)).toBe('1 yr 1 mo');
      expect(formatDuration(24)).toBe('2 yrs');
      expect(formatDuration(26)).toBe('2 yrs 2 mo');
    });

    it('handles negative durations', () => {
      expect(formatDuration(-5)).toBe('');
    });
  });

  describe('compareDates', () => {
    it('correctly compares dates', () => {
      const date1: ParsedDate = { month: 0, year: 2020 };
      const date2: ParsedDate = { month: 5, year: 2020 };
      const date3: ParsedDate = { month: 0, year: 2021 };

      expect(compareDates(date1, date2)).toBeLessThan(0);
      expect(compareDates(date2, date1)).toBeGreaterThan(0);
      expect(compareDates(date1, date3)).toBeLessThan(0);
      expect(compareDates(date1, date1)).toBe(0);
    });
  });

  describe('detectGaps', () => {
    it('detects no gaps for continuous employment', () => {
      const experiences = [
        { startDate: 'Jan 2022', endDate: 'Present', current: true },
        { startDate: 'Jan 2020', endDate: 'Jan 2022', current: false },
      ];
      const gaps = detectGaps(experiences);
      expect(gaps).toHaveLength(0);
    });

    it('detects a gap between jobs', () => {
      const experiences = [
        { startDate: 'Jan 2022', endDate: 'Present', current: true },
        // Gap here: Jan 2021 to Jan 2022 is 12 months gap? No, prev job ended Jan 2021. Next starts Jan 2022.
        { startDate: 'Jan 2019', endDate: 'Jan 2021', current: false },
      ];
      const gaps = detectGaps(experiences);
      expect(gaps).toHaveLength(1);
      expect(gaps[0].months).toBe(12);
      expect(gaps[0].startDate).toEqual({ month: 0, year: 2021 });
      expect(gaps[0].endDate).toEqual({ month: 0, year: 2022 });
    });

    it('ignores small gaps (< 1 month)', () => {
       const experiences = [
        { startDate: 'Feb 2020', endDate: 'Present', current: true },
        { startDate: 'Jan 2019', endDate: 'Jan 2020', current: false },
      ];
      // Jan 2020 to Feb 2020 is 1 month. detectGaps logic allows >= 1 month.
      // Same month (Jan 2020 to Jan 2020) would be 0 months gap.
      const experiences2 = [
        { startDate: 'Jan 2020', endDate: 'Present', current: true },
        { startDate: 'Jan 2019', endDate: 'Jan 2020', current: false },
      ];
      const gaps2 = detectGaps(experiences2);
      expect(gaps2).toHaveLength(0);
    });
  });

  describe('formatDateRange', () => {
    it('formats a completed date range', () => {
      expect(formatDateRange('Jan 2020', 'Dec 2020', false)).toBe('Jan 2020 – Dec 2020');
    });

    it('formats a current date range', () => {
      expect(formatDateRange('Jan 2020', '', true)).toBe('Jan 2020 – Present');
    });

    it('returns empty string if start date is invalid', () => {
      expect(formatDateRange('', 'Dec 2020', false)).toBe('');
    });
  });

  describe('calculateDuration', () => {
    it('calculates duration for completed job', () => {
      // Jan 2020 to Dec 2020 = 11 months
      expect(calculateDuration('Jan 2020', 'Dec 2020', false)).toBe('11 mo');
    });

    it('calculates duration for current job', () => {
      // Mocking Present is tricky because it depends on new Date().
      // However, parseResumeDate('Present') uses new Date().
      // Let's rely on relative difference or mock Date if needed.
      // Actually, calculateDuration calls parseResumeDate internally.
      // If we use 'Present', it gets current date.
      // If we use 'Jan 2000', we can expect a huge duration.
      const duration = calculateDuration('Jan 2000', '', true);
      expect(duration).toContain('yr');
    });

    it('returns empty string for invalid inputs', () => {
      expect(calculateDuration('', '', false)).toBe('');
    });
  });

  describe('getTotalGapMonths', () => {
    it('sums up gap months', () => {
      const gaps = [
        { startDate: { month: 0, year: 2020 }, endDate: { month: 5, year: 2020 }, months: 5 },
        { startDate: { month: 0, year: 2021 }, endDate: { month: 2, year: 2021 }, months: 2 },
      ];
      expect(getTotalGapMonths(gaps)).toBe(7);
    });

    it('returns 0 for empty gaps', () => {
      expect(getTotalGapMonths([])).toBe(0);
    });
  });
});
