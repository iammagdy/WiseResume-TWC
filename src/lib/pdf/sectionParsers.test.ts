import { describe, it, expect, beforeAll } from 'vitest';
import { extractDateRange } from './sectionParsers';

describe('extractDateRange', () => {
  it('should extract date range correctly', () => {
    const text = 'Software Engineer at Tech Corp (Jan 2020 - Dec 2022)';
    const result = extractDateRange(text);
    expect(result).toEqual({
      startDate: 'Jan 2020',
      endDate: 'Dec 2022',
      current: false,
    });
  });

  it('should handle "Present" correctly', () => {
    const text = 'Senior Developer at StartUp (Mar 2023 - Present)';
    const result = extractDateRange(text);
    expect(result).toEqual({
      startDate: 'Mar 2023',
      endDate: '',
      current: true,
    });
  });

  it('should return empty strings if no match found', () => {
    const text = 'Just some text with no dates';
    const result = extractDateRange(text);
    expect(result).toEqual({
      startDate: '',
      endDate: '',
      current: false,
    });
  });

  it('benchmark performance', () => {
    const iterations = 10000;
    const testStrings = [
      'Jan 2020 - Dec 2022',
      'March 2019 - Present',
      'Software Engineer at Tech Corp (Jan 2020 - Dec 2022)',
      'Senior Developer at StartUp (Mar 2023 - Present)',
      'No dates here',
      'Just a single date like Jan 2020',
      'Complex string with multiple potential matches: Feb 2018 - May 2019 and June 2019 - Aug 2020',
    ];

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      for (const str of testStrings) {
        extractDateRange(str);
      }
    }
    const end = performance.now();
    const duration = end - start;

    console.log(`\nBenchmark Results:\nIterations: ${iterations} x ${testStrings.length} calls\nTotal Time: ${duration.toFixed(2)}ms\nAverage per call: ${(duration / (iterations * testStrings.length)).toFixed(4)}ms\n`);
  });
});
