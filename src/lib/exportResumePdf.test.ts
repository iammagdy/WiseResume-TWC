import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/nativePdfGenerator', () => ({
  generateNativePDF: vi.fn(async () => new Blob(['pdf'], { type: 'application/pdf' })),
}));

vi.mock('@/components/templates/registry', () => ({
  default: {
    modern: () => null,
  },
}));

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
});
