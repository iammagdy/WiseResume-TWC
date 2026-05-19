import { describe, expect, it } from 'vitest';
import {
  collectSectionLayoutBounds,
  getExportContentHeightPx,
  getSectionHeadingTop,
} from '../exportLayoutMetrics';

function setProp<T>(el: HTMLElement, prop: string, value: T) {
  Object.defineProperty(el, prop, { get: () => value, configurable: true });
}

function layout(
  el: HTMLElement,
  opts: {
    offsetTop?: number;
    offsetHeight?: number;
    offsetWidth?: number;
    scrollHeight?: number;
    offsetParent?: HTMLElement | null;
  },
) {
  if (opts.offsetTop !== undefined) setProp(el, 'offsetTop', opts.offsetTop);
  if (opts.offsetHeight !== undefined) setProp(el, 'offsetHeight', opts.offsetHeight);
  if (opts.offsetWidth !== undefined) setProp(el, 'offsetWidth', opts.offsetWidth);
  if (opts.scrollHeight !== undefined) setProp(el, 'scrollHeight', opts.scrollHeight);
  if (opts.offsetParent !== undefined) setProp(el, 'offsetParent', opts.offsetParent);
}

describe('exportLayoutMetrics', () => {
  it('finds nested section headings (Swiss-style grid)', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    layout(root, { offsetWidth: 612, scrollHeight: 900 });

    const section = document.createElement('section');
    section.setAttribute('data-section', 'summary');
    root.appendChild(section);
    layout(section, { offsetTop: 100, offsetHeight: 80, offsetParent: root });

    const grid = document.createElement('div');
    section.appendChild(grid);
    layout(grid, { offsetTop: 0, offsetParent: section });

    const h2 = document.createElement('h2');
    h2.textContent = 'Summary';
    grid.appendChild(h2);
    layout(h2, { offsetTop: 0, offsetHeight: 20, offsetParent: grid });

    expect(getSectionHeadingTop(section, root)).toBe(100);
    document.body.removeChild(root);
  });

  it('prefers section bounds over inflated min-height scrollHeight', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    layout(root, { offsetWidth: 612, scrollHeight: 792, offsetHeight: 792 });

    const section = document.createElement('section');
    section.setAttribute('data-section', 'experience');
    root.appendChild(section);
    layout(section, { offsetTop: 120, offsetHeight: 400, offsetParent: root });

    const h2 = document.createElement('h2');
    section.appendChild(h2);
    layout(h2, { offsetTop: 0, offsetHeight: 24, offsetParent: section });

    const height = getExportContentHeightPx(root);
    expect(height).toBeLessThan(792);
    expect(height).toBeGreaterThan(500);
    document.body.removeChild(root);
  });

  it('collectSectionLayoutBounds returns headingTop per section', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    layout(root, { offsetWidth: 612 });

    const section = document.createElement('section');
    section.setAttribute('data-section', 'education');
    root.appendChild(section);
    layout(section, { offsetTop: 500, offsetHeight: 100, offsetParent: root });

    const h2 = document.createElement('h2');
    section.appendChild(h2);
    layout(h2, { offsetTop: 8, offsetHeight: 20, offsetParent: section });

    const bounds = collectSectionLayoutBounds(root);
    expect(bounds[0].top).toBe(500);
    expect(bounds[0].headingTop).toBe(508);
    document.body.removeChild(root);
  });
});
