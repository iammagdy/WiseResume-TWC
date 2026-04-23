import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ResumeData, TemplateId } from '@/types/resume';
import type { OnProgressCallback } from '@/hooks/useExportProgress';

export interface OnePageMeasurement {
  /** Real rendered page count (>=1) at the active page format. */
  pages: number;
  /** Scale (0–1) needed for the content to fit on a single page. 1 = already fits. */
  fitScale: number;
}

export interface OnePageExportApi {
  /** Callback ref to attach to the offscreen template root element. */
  setRef: (node: HTMLElement | null) => void;
  /** Returns the offscreen template element, or null if not yet mounted. */
  getElement: () => HTMLElement | null;
  /** True once the offscreen render is mounted, fonts ready, and pdfGenerator is loaded. */
  isReady: boolean;
  /** Generates a multi-page PDF Blob from the offscreen template. */
  exportPdf: (opts?: { onProgress?: OnProgressCallback }) => Promise<Blob>;
  /** Generates a one-page PDF Blob (scale-to-fit). */
  exportOnePagePdf: (opts?: { onProgress?: OnProgressCallback }) => Promise<Blob>;
  /** Measures real page count + one-page fit scale; returns null until ready. */
  measure: () => OnePageMeasurement | null;
}

export interface UseOnePageExportArgs {
  resume: ResumeData | null;
  templateId: TemplateId;
  /** When true, the offscreen template is mounted; usually `open` of the sheet. */
  enabled: boolean;
}

type PdfGenModule = typeof import('@/lib/pdfGenerator');

/**
 * Mounts the active resume template offscreen so callers can both *measure*
 * the real rendered page count and *capture* a PDF — without depending on
 * whatever element happens to be visible in the parent page.
 *
 * Used by OnePageWizardSheet so the same flow works identically from
 * Editor, AI Studio, and Preview entry points.
 */
export function useOnePageExport({ resume, templateId, enabled }: UseOnePageExportArgs): OnePageExportApi {
  const elementRef = useRef<HTMLElement | null>(null);
  const pdfModRef = useRef<PdfGenModule | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Reset readiness when toggled off or when the source identity changes
  useEffect(() => {
    if (!enabled) {
      setIsReady(false);
      elementRef.current = null;
    }
  }, [enabled, templateId, resume?.id]);

  // Pre-warm the pdfGenerator module so measure() is synchronous-fast
  useEffect(() => {
    if (!enabled || pdfModRef.current) return;
    let cancelled = false;
    import('@/lib/pdfGenerator').then(mod => {
      if (cancelled) return;
      pdfModRef.current = mod;
    }).catch(e => console.warn('[useOnePageExport] pdfGen preload failed', e));
    return () => { cancelled = true; };
  }, [enabled]);

  const setRef = useCallback((node: HTMLElement | null) => {
    elementRef.current = node;
    if (!node) {
      setIsReady(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try { await document.fonts.ready; } catch { /* ignore */ }
      // Wait for the lazy <Suspense> template to actually paint content into the wrapper.
      // Poll briefly until either real content is in the DOM or we time out.
      const deadline = performance.now() + 2500;
      while (!cancelled && performance.now() < deadline) {
        await new Promise<void>(r => requestAnimationFrame(() => r()));
        if (node.scrollHeight > 100 && node.children.length > 0) break;
      }
      // Two more RAF ticks so layout settles after the first content paint
      await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
      if (!pdfModRef.current) {
        try { pdfModRef.current = await import('@/lib/pdfGenerator'); } catch { /* ignore */ }
      }
      if (cancelled) return;
      setIsReady(true);
    })();
  }, []);

  const getElement = useCallback(() => elementRef.current, []);

  const measure = useCallback((): OnePageMeasurement | null => {
    const el = elementRef.current;
    const mod = pdfModRef.current;
    if (!el || !mod || !resume) return null;
    try {
      const fmt = (resume.customization?.pageFormat || 'letter') as 'a4' | 'letter';
      const dims = mod.PAGE_FORMAT_PX[fmt] || mod.PAGE_FORMAT_PX.letter;
      const pages = mod.estimatePageCount(el, dims.width, dims.height - mod.FOOTER_RESERVED_PT);
      const scale = mod.estimateOnePageScale(el, fmt) / 100;
      return { pages: Math.max(1, pages), fitScale: Math.max(0, Math.min(1, scale)) };
    } catch (e) {
      console.warn('[useOnePageExport] measure failed', e);
      return null;
    }
  }, [resume]);

  const exportPdf = useCallback(async ({ onProgress }: { onProgress?: OnProgressCallback } = {}) => {
    if (!resume) throw new Error('No resume to export');
    const el = elementRef.current;
    if (!el) throw new Error('Offscreen template not ready');
    const { generateNativePDF } = await import('@/lib/nativePdfGenerator');
    const pageFormat = (resume.customization?.pageFormat ?? 'letter') as 'letter' | 'a4';
    return generateNativePDF(el, { pageFormat, onProgress });
  }, [resume]);

  const exportOnePagePdf = useCallback(async ({ onProgress }: { onProgress?: OnProgressCallback } = {}) => {
    if (!resume) throw new Error('No resume to export');
    const el = elementRef.current;
    if (!el) throw new Error('Offscreen template not ready');
    const { generateNativePDF } = await import('@/lib/nativePdfGenerator');
    const pageFormat = (resume.customization?.pageFormat ?? 'letter') as 'letter' | 'a4';
    return generateNativePDF(el, { pageFormat, onePage: true, onProgress });
  }, [resume]);

  // Stable identity so consumers can include the api in effect deps without looping
  return useMemo(
    () => ({ setRef, getElement, isReady, exportPdf, exportOnePagePdf, measure }),
    [setRef, getElement, isReady, exportPdf, exportOnePagePdf, measure],
  );
}
