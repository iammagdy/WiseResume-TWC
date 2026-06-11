import { describe, it, expect } from 'vitest';
import { buildJobApplicationDisplayName, buildJobApplicationFileName, pickLongestJobDescription } from '../tailorJobContext';

describe('buildJobApplicationFileName', () => {
  it('uses job title and company when both are present', () => {
    expect(buildJobApplicationFileName({
      jobTitle: 'Product Manager',
      company: 'Google',
    })).toBe('Product_Manager_-_Google');
  });

  it('falls back to full name when job context is missing', () => {
    expect(buildJobApplicationFileName({
      fullName: 'Magdy Saber',
    })).toBe('Magdy_Saber');
  });
});

describe('pickLongestJobDescription', () => {
  it('prefers the longest non-empty candidate', () => {
    expect(pickLongestJobDescription('short', 'much longer job description text')).toBe(
      'much longer job description text',
    );
  });
});

describe('buildJobApplicationDisplayName', () => {
  it('keeps human-readable spacing for the filename field', () => {
    expect(buildJobApplicationDisplayName({
      jobTitle: 'Team Lead - Customer Care',
      company: 'Tamara',
    })).toBe('Team Lead - Customer Care - Tamara');
  });
});
