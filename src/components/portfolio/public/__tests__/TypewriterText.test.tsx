import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TypewriterText } from '../TypewriterText';

describe('TypewriterText layout stability', () => {
  it('reserves one overlapping grid cell for every possible phrase', () => {
    const phrases = ['Short phrase', 'A much longer phrase that can wrap on mobile'];
    render(<TypewriterText phrases={phrases} accentColor="#e84545" />);

    const reserve = screen.getByTestId('typewriter-reserve');
    expect(reserve.children).toHaveLength(phrases.length);
    expect(reserve.children[0]).toHaveClass('[grid-area:1/1]');
    expect(reserve.children[1]).toHaveClass('[grid-area:1/1]');
    expect(screen.getByLabelText(phrases[0])).toBeInTheDocument();
  });
});
