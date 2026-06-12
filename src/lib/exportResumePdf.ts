import React, { Suspense } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import templateComponents from '@/components/templates/registry';
import { generateCustomizationCSS } from '@/lib/templateCustomization';
import { getTemplateDesignDimensions } from '@/lib/templateDimensions';
import type { ResumeData, TemplateId } from '@/types/resume';
import type { NativePdfOptions } from '@/lib/nativePdfGenerator';

const PAGE_WIDTHS = {
  letter: 612,
  a4: 595,
} as const;

interface OffscreenMount {
  container: HTMLDivElement;
  template: HTMLDivElement;
  root: Root;
}

function mountOffscreenTemplate(resume: ResumeData, templateId: TemplateId, pageWidth: number): OffscreenMount {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.width = `${pageWidth}px`;
  container.style.pointerEvents = 'none';
  container.style.opacity = '0';
  container.setAttribute('aria-hidden', 'true');
  document.body.appendChild(container);

  const template = document.createElement('div');
  template.setAttribute('data-resume-template', '');
  template.style.width = `${pageWidth}px`;
  container.appendChild(template);

  const TemplateComponent =
    (templateComponents as Record<string, React.LazyExoticComponent<React.ComponentType<{ resume: ResumeData }>>>)[
      templateId
    ] ?? templateComponents.modern;

  const root = createRoot(template);
  root.render(
    React.createElement(
      Suspense,
      { fallback: null },
      resume.customization
        ? React.createElement('style', null, generateCustomizationCSS(resume.customization))
        : null,
      React.createElement(TemplateComponent, { resume }),
    ),
  );

  return { container, template, root };
}

export class OffscreenRenderTimeoutError extends Error {
  readonly code = 'OFFSCREEN_RENDER_TIMEOUT';
  constructor(message: string) {
    super(message);
    this.name = 'OffscreenRenderTimeoutError';
  }
}

async function waitForRender(template: HTMLElement, timeoutMs = 4000): Promise<void> {
  try { await document.fonts.ready; } catch { /* ignore */ }
  const deadline = performance.now() + timeoutMs;
  let painted = false;
  while (performance.now() < deadline) {
    await new Promise<void>(r => requestAnimationFrame(() => r()));
    if (template.scrollHeight > 100 && template.children.length > 0) {
      painted = true;
      break;
    }
  }
  if (!painted) {
    throw new OffscreenRenderTimeoutError(
      `Resume template did not render within ${timeoutMs}ms (scrollHeight=${template.scrollHeight}, children=${template.children.length}). ` +
        `The lazy template chunk may have failed to load.`,
    );
  }
  // Two extra RAF ticks so layout settles after the first content paint
  await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

/**
 * Renders a resume offscreen with the requested template, generates a
 * text-selectable PDF via the Puppeteer-backed native pipeline, and cleans
 * up. Used for headless exports (e.g. dashboard list rows) where there is
 * no live `[data-resume-template]` element in the page.
 */
export async function exportResumePdfFromData(
  resume: ResumeData,
  templateId: TemplateId,
  options?: NativePdfOptions & { renderTimeoutMs?: number },
): Promise<Blob> {
  const { generateNativePDF } = await import('@/lib/nativePdfGenerator');
  const pageFormat = (resume.customization?.pageFormat ?? 'letter') as 'letter' | 'a4';
  const pageWidth = getTemplateDesignDimensions(templateId, pageFormat).pageWidth || PAGE_WIDTHS[pageFormat];
  const mount = mountOffscreenTemplate(resume, templateId, pageWidth);
  try {
    await waitForRender(mount.template, options?.renderTimeoutMs ?? 4000);
    const { renderTimeoutMs: _renderTimeoutMs, ...nativeOpts } = options ?? {};
    const savedBreaks =
      nativeOpts.customBreakPositions ?? resume.customization?.customBreakPositions;
    const { resolveExportBreakPositions } = await import('@/lib/pdfUtils');
    const customBreakPositions = resolveExportBreakPositions(mount.template, savedBreaks);
    return await generateNativePDF(mount.template, {
      pageFormat,
      ...nativeOpts,
      ...(customBreakPositions.length ? { customBreakPositions } : {}),
    });
  } finally {
    try { mount.root.unmount(); } catch { /* ignore */ }
    if (mount.container.parentNode) mount.container.parentNode.removeChild(mount.container);
  }
}
