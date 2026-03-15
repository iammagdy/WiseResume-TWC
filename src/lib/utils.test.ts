import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn utility', () => {
  it('should merge basic classes', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2');
  });

  it('should handle Tailwind conflicting classes', () => {
    // px-4 should override px-2
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('text-sm', 'text-lg')).toBe('text-lg');
  });

  it('should handle falsy values gracefully', () => {
    expect(cn('class1', null, 'class2', undefined, false, '', 0)).toBe('class1 class2');
  });

  it('should handle objects and arrays', () => {
    expect(cn(['class1', 'class2'])).toBe('class1 class2');
    expect(cn({ class1: true, class2: false, class3: true })).toBe('class1 class3');
    expect(cn(['class1'], { class2: true }, 'class3')).toBe('class1 class2 class3');
  });

  it('should merge arrays and resolve Tailwind conflicts', () => {
    expect(cn(['px-2', 'py-1'], 'px-4')).toBe('py-1 px-4');
  });
});
