import { describe, expect, it } from 'vitest';
import { normalizeCssColor, safeCssColor } from './cssColor';

describe('normalizeCssColor', () => {
  it.each([
    '#abc',
    '#abcd',
    '#aabbcc',
    '#aabbccdd',
    'rgb(0, 128, 255)',
    'rgba(255,255,255,0.05)',
    'rgba(1, 2, 3, 1)',
  ])('accepts a complete safe color token: %s', value => {
    expect(normalizeCssColor(value)).toBe(value);
  });

  it.each([
    'rgba(0,0,0,0.5);}</style><script>alert(1)</script>',
    'rgb(0,0,0)/*',
    'rgba(0,0,0,2)',
    'rgb(256,0,0)',
    'rgb(0,0,0,0.5)',
    'rgba(0,0,0)',
    'var(--accent)',
    'url(javascript:alert(1))',
    '#fff\ncolor:red',
    '#12',
  ])('rejects malformed or style-breaking input: %s', value => {
    expect(normalizeCssColor(value)).toBeNull();
  });

  it('uses the supplied fallback for rejected input', () => {
    expect(safeCssColor('red; background:url(x)', '#000000')).toBe('#000000');
  });
});
