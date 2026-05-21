import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/nativePdfGenerator', () => ({
  generateNativePDF: vi.fn(async () => new Blob(['pdf'], { type: 'application/pdf' })),
}));

vi.mock('@/components/templates/registry', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  return {
    default: {
      modern: ({ resume }: { resume: ResumeData }) =>
        resume.summary === 'paint'
          ? React.createElement('section', { 'data-section': 'summary' }, 'painted')
          : null,
    },
  };
});

vi.mock('@/lib/templateCustomization', () => ({
  generateCustomizationCSS: () => '',
}));

import { exportResumePdfFromData, OffscreenRenderTimeoutError } from './exportResumePdf';
import { generateNativePDF } from '@/lib/nativePdfGenerator';
import type { ResumeData } from '@/types/resume';

const minimalResume = {
  contactInfo: { fullName: 'Test User' },
  summary: '',
  skills: [],
  experience: [],
  education: [],
} as unknown as ResumeData;

const paintedResume = {
  ...minimalResume,
  summary: 'paint',
  customization: {
    pageFormat: 'letter',
    customBreakPositions: [900],
  },
} as unknown as ResumeData;

describe('exportResumePdfFromData', () => {
  beforeEach(() => {
    Object.defineProperty(document, 'fonts', {
      value: { ready: Promise.resolve() },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
    (generateNativePDF as ReturnType<typeof vi.fn>).mockClear();
  });

  it('throws OffscreenRenderTimeoutError when the template never paints, does not call the native generator, and still cleans up the offscreen container', async () => {
    await expect(
      exportResumePdfFromData(minimalResume, 'modern', { renderTimeoutMs: 50 }),
    ).rejects.toBeInstanceOf(OffscreenRenderTimeoutError);
    expect(generateNativePDF).not.toHaveBeenCalled();
    expect(document.querySelectorAll('[data-resume-template]').length).toBe(0);
  });

  it('passes saved custom page cuts for offscreen data-based downloads', async () => {
    const scrollHeightDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollHeight');
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get() {
        return this instanceof HTMLElement && this.hasAttribute('data-resume-template') ? 200 : 0;
      },
    });
    try {
      await exportResumePdfFromData(paintedResume, 'modern', { renderTimeoutMs: 200 });
    } finally {
      if (scrollHeightDescriptor) {
        Object.defineProperty(HTMLElement.prototype, 'scrollHeight', scrollHeightDescriptor);
      } else {
        delete (HTMLElement.prototype as Partial<HTMLElement>).scrollHeight;
      }
    }

    expect(generateNativePDF).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({
        pageFormat: 'letter',
        customBreakPositions: [900],
      }),
    );
  });
});
