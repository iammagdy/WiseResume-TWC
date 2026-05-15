import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TypewriterHeadlineLine } from '../TypewriterHeadlineLine';

describe('TypewriterHeadlineLine', () => {
  it('keeps the desktop width sentinel hidden on mobile classes', () => {
    const { container } = render(<TypewriterHeadlineLine word="Senior Developer" showCursor />);

    const matches = screen.getAllByText('Senior Developer');
    const sentinel = matches[0];
    const visibleWord = matches[1];
    const cursor = container.querySelector('.lp-cursor');

    expect(sentinel).toHaveClass('hidden');
    expect(sentinel).toHaveClass('sm:block');
    expect(visibleWord).toHaveClass('whitespace-normal');
    expect(visibleWord).toHaveClass('sm:absolute');
    expect(cursor).not.toBeNull();
  });
});
