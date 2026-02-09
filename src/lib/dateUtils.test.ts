import { describe, it, expect } from 'vitest';
import { compareDates, ParsedDate } from './dateUtils';

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
