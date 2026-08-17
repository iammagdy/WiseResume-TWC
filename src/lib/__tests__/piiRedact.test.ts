import { describe, expect, it } from 'vitest';
import { redactResumeTextForAI, restoreResumeContactPlaceholders } from '@/lib/piiRedact';

describe('redactResumeTextForAI', () => {
  const contact = {
    fullName: 'Jane Q. Doe',
    email: 'jane.private@example.com',
    phone: '+1 (415) 555-0199',
    location: 'San Francisco, CA',
    linkedin: 'https://www.linkedin.com/in/jane-private',
    github: 'https://github.com/janedoe',
    portfolio: 'https://jane.example.dev',
  };

  it('replaces parsed contact fields and generic contact patterns without changing resume content', () => {
    const source = [
      contact.fullName,
      `${contact.email} | ${contact.phone} | ${contact.location}`,
      `${contact.linkedin} | ${contact.github} | ${contact.portfolio}`,
      'Senior Engineer — improved release reliability.',
    ].join('\n');

    const result = redactResumeTextForAI(source, contact, true);

    for (const value of Object.values(contact)) {
      expect(result.toLowerCase()).not.toContain(value.toLowerCase());
    }
    expect(result).toContain('[Name]');
    expect(result).toContain('[email@example.com]');
    expect(result).toContain('[Phone]');
    expect(result).toContain('[Location]');
    expect(result).toContain('Senior Engineer — improved release reliability.');
  });

  it('redacts contact patterns that the local parser did not identify', () => {
    const source = [
      'Reach me at hidden.person@sample.co.uk',
      'linkedin.com/in/hidden-person',
      'github.com/hidden-person',
      '+20 10 1234 5678',
    ].join('\n');

    const result = redactResumeTextForAI(source, undefined, true);

    expect(result).not.toMatch(/hidden\.person|sample\.co\.uk|1234 5678/i);
    expect(result).toContain('[email@example.com]');
    expect(result).toContain('[LinkedIn]');
    expect(result).toContain('[GitHub]');
    expect(result).toContain('[Phone]');
  });

  it('returns the original text when privacy redaction is disabled', () => {
    const source = 'Jane Doe — jane@example.com';
    expect(redactResumeTextForAI(source, contact, false)).toBe(source);
  });

  it('restores contact placeholders recursively only after generation', () => {
    const generated = {
      email: 'Hello from [Name]',
      variants: ['Call [Phone]', 'Based in [Location]'],
    };

    expect(restoreResumeContactPlaceholders(generated, contact)).toEqual({
      email: 'Hello from Jane Q. Doe',
      variants: ['Call +1 (415) 555-0199', 'Based in San Francisco, CA'],
    });
  });
});
