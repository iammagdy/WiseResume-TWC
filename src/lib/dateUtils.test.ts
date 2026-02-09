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
  });
});
