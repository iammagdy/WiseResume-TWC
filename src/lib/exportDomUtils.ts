/** UI-only nodes that must not appear in PDF export HTML. */
export function stripPdfExcludedNodes(root: HTMLElement): void {
  root.querySelectorAll('[data-pdf-exclude]').forEach((node) => node.remove());
  root.querySelectorAll('[data-html2canvas-ignore]').forEach((node) => node.remove());
}

/** Clone a live resume template for export or dialog preview (no editor overlays). */
export function cloneResumeTemplateElement(
  templateEl: HTMLElement,
  designWidth?: number,
): HTMLElement {
  const clone = templateEl.cloneNode(true) as HTMLElement;
  stripPdfExcludedNodes(clone);

  const width = designWidth ?? (templateEl.offsetWidth || 612);
  clone.style.width = `${width}px`;
  clone.style.maxWidth = `${width}px`;
  clone.style.minWidth = `${width}px`;
  clone.style.background = '#fff';
  clone.style.boxSizing = 'border-box';

  return clone;
}

/**
 * Creates an off-screen capture host for html2canvas.
 *
 * Important: do not use `visibility:hidden`, `display:none`, or `opacity:0`
 * here. html2canvas respects those styles and can produce an all-white PDF.
 */
export function createPdfCaptureContainer(pageWidthPx: number): HTMLDivElement {
  const container = document.createElement('div');
  container.setAttribute('aria-hidden', 'true');
  container.style.cssText = [
    'position:fixed',
    'left:-10000px',
    'top:0',
    `width:${pageWidthPx}px`,
    'min-height:1px',
    'overflow:visible',
    'pointer-events:none',
    'z-index:-1',
    'background:#fff',
  ].join(';');
  return container;
}
