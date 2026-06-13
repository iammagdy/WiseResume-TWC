import { describe, expect, it, vi } from 'vitest';
import { appendImageWatermark } from './exportWatermark';

describe('appendImageWatermark', () => {
  it('returns a taller canvas with room for the Wise Resume link footer', () => {
    const source = document.createElement('canvas');
    source.width = 1200;
    source.height = 1600;
    const drawImage = vi.fn();
    const fillText = vi.fn();

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const el = document.createElementNS('http://www.w3.org/1999/xhtml', tagName) as HTMLElement;
      if (tagName === 'canvas') {
        Object.defineProperty(el, 'getContext', {
          value: () => ({
            fillStyle: '',
            strokeStyle: '',
            font: '',
            textAlign: '',
            textBaseline: '',
            fillRect: vi.fn(),
            drawImage,
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            stroke: vi.fn(),
            fillText,
          }),
        });
      }
      return el;
    });

    const watermarked = appendImageWatermark(source);

    expect(watermarked.height).toBeGreaterThan(source.height);
    expect(fillText).toHaveBeenCalledWith('Wise Resume', expect.any(Number), expect.any(Number));
    expect(fillText).toHaveBeenCalledWith('https://wiseresume.app', expect.any(Number), expect.any(Number));
    expect(drawImage).toHaveBeenCalledWith(source, 0, 0);
  });
});
