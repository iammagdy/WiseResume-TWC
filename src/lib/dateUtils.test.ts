import { describe, it, expect } from 'vitest';
import { compareDates, parseResumeDate, ParsedDate } from './dateUtils';

describe('compareDates', () => {
  it('should return 0 for the same year and month', () => {
    const date1: ParsedDate = { month: 5, year: 2023 };
    const date2: ParsedDate = { month: 5, year: 2023 };
    expect(compareDates(date1, date2)).toBe(0);
  });

  it('should return a negative number when the first date is earlier in the same year', () => {
    const date1: ParsedDate = { month: 4, year: 2023 };
    const date2: ParsedDate = { month: 5, year: 2023 };
    expect(compareDates(date1, date2)).toBeLessThan(0);
  });

  it('should return a positive number when the first date is later in the same year', () => {
    const date1: ParsedDate = { month: 6, year: 2023 };
    const date2: ParsedDate = { month: 5, year: 2023 };
    expect(compareDates(date1, date2)).toBeGreaterThan(0);
  });

  it('should return a negative number when the first date has an earlier year', () => {
    const date1: ParsedDate = { month: 11, year: 2022 };
    const date2: ParsedDate = { month: 0, year: 2023 };
    expect(compareDates(date1, date2)).toBeLessThan(0);
  });

  it('should return a positive number when the first date has a later year', () => {
    const date1: ParsedDate = { month: 0, year: 2024 };
    const date2: ParsedDate = { month: 11, year: 2023 };
    expect(compareDates(date1, date2)).toBeGreaterThan(0);
  });

  it('should correctly sort an array of dates in ascending order', () => {
    const dates: ParsedDate[] = [
      { month: 5, year: 2023 },
      { month: 0, year: 2023 },
      { month: 11, year: 2022 },
      { month: 5, year: 2022 },
    ];
    const sorted = [...dates].sort(compareDates);
    expect(sorted).toEqual([
      { month: 5, year: 2022 },
      { month: 11, year: 2022 },
      { month: 0, year: 2023 },
      { month: 5, year: 2023 },
    ]);
  });

  it('should handle "Present" dates based on their month and year', () => {
    const now = new Date();
    const present: ParsedDate = {
      month: now.getMonth(),
      year: now.getFullYear(),
      isPresent: true
    };
    const past: ParsedDate = { month: 0, year: 2020 };

    expect(compareDates(past, present)).toBeLessThan(0);
    expect(compareDates(present, past)).toBeGreaterThan(0);

    const alsoPresent: ParsedDate = {
      month: now.getMonth(),
      year: now.getFullYear(),
      isPresent: true
    };
    expect(compareDates(present, alsoPresent)).toBe(0);
  });
});

describe('parseResumeDate', () => {
  it('should return null for empty or non-string inputs', () => {
    expect(parseResumeDate('')).toBeNull();
    // @ts-ignore
    expect(parseResumeDate(null)).toBeNull();
    // @ts-ignore
    expect(parseResumeDate(undefined)).toBeNull();
    // @ts-ignore
    expect(parseResumeDate(123)).toBeNull();
  });

  it('should parse "Present", "Current", or "Now" correctly', () => {
    const now = new Date();
    const expected = { month: now.getMonth(), year: now.getFullYear(), isPresent: true };

    expect(parseResumeDate('Present')).toEqual(expected);
    expect(parseResumeDate('Current')).toEqual(expected);
    expect(parseResumeDate('Now')).toEqual(expected);
    expect(parseResumeDate('present')).toEqual(expected); // Case insensitive
  });

  it('should parse "Month Year" format', () => {
    expect(parseResumeDate('Jan 2020')).toEqual({ month: 0, year: 2020 });
    expect(parseResumeDate('January 2020')).toEqual({ month: 0, year: 2020 });
    expect(parseResumeDate('Feb 2021')).toEqual({ month: 1, year: 2021 });
    expect(parseResumeDate('Dec 1999')).toEqual({ month: 11, year: 1999 });
  });

  it('should parse "Month, Year" or "Month. Year" format', () => {
    expect(parseResumeDate('Jan, 2020')).toEqual({ month: 0, year: 2020 });
    expect(parseResumeDate('Jan. 2020')).toEqual({ month: 0, year: 2020 });
  });

  it('should parse "MM/YYYY" format', () => {
    expect(parseResumeDate('01/2020')).toEqual({ month: 0, year: 2020 });
    expect(parseResumeDate('1/2020')).toEqual({ month: 0, year: 2020 });
    expect(parseResumeDate('12/2020')).toEqual({ month: 11, year: 2020 });
    expect(parseResumeDate('05/2020')).toEqual({ month: 4, year: 2020 });
  });

  it('should parse "YYYY-MM" format', () => {
    expect(parseResumeDate('2020-01')).toEqual({ month: 0, year: 2020 });
    expect(parseResumeDate('2020-12')).toEqual({ month: 11, year: 2020 });
  });

  it('should parse "YYYY" format (default to January)', () => {
    expect(parseResumeDate('2020')).toEqual({ month: 0, year: 2020 });
    expect(parseResumeDate('1990')).toEqual({ month: 0, year: 1990 });
  });

  it('should return null for invalid date formats', () => {
    expect(parseResumeDate('Invalid Date')).toBeNull();
    expect(parseResumeDate('2020/01')).toBeNull(); // Currently not supported based on implementation
    expect(parseResumeDate('Jan/2020')).toBeNull();
  });

  it('should handle extra spaces', () => {
    expect(parseResumeDate('  Jan 2020  ')).toEqual({ month: 0, year: 2020 });
  });
});
