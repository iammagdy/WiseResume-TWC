import React, { Suspense } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import templateComponents from '@/components/templates/registry';
import { generateCustomizationCSS } from '@/lib/templateCustomization';
import type { ResumeData, TemplateId } from '@/types/resume';
import type { NativePdfOptions } from '@/lib/nativePdfGenerator';

interface OffscreenMount {
  container: HTMLDivElement;
  template: HTMLDivElement;
  root: Root;
}

function mountOffscreenTemplate(resume: ResumeData, templateId: TemplateId): OffscreenMount {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.width = '816px';
  container.style.pointerEvents = 'none';
  container.style.opacity = '0';
  container.setAttribute('aria-hidden', 'true');
  document.body.appendChild(container);

  const template = document.createElement('div');
  template.setAttribute('data-resume-template', '');
  template.style.width = '816px';
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

async function waitForRender(template: HTMLElement, timeoutMs = 4000): Promise<void> {
  try { await document.fonts.ready; } catch { /* ignore */ }
  const deadline = performance.now() + timeoutMs;
  while (performance.now() < deadline) {
    await new Promise<void>(r => requestAnimationFrame(() => r()));
    if (template.scrollHeight > 100 && template.children.length > 0) break;
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
  options?: NativePdfOptions,
): Promise<Blob> {
  const { generateNativePDF } = await import('@/lib/nativePdfGenerator');
  const mount = mountOffscreenTemplate(resume, templateId);
  try {
    await waitForRender(mount.template);
    const pageFormat = (resume.customization?.pageFormat ?? 'letter') as 'letter' | 'a4';
    return await generateNativePDF(mount.template, { pageFormat, ...options });
  } finally {
    try { mount.root.unmount(); } catch { /* ignore */ }
    if (mount.container.parentNode) mount.container.parentNode.removeChild(mount.container);
  }
}
