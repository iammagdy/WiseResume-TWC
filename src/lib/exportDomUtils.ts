/** UI-only nodes that must not appear in PDF export HTML. */
export function stripPdfExcludedNodes(root: HTMLElement): void {
  root.querySelectorAll('[data-pdf-exclude]').forEach((node) => node.remove());
  root.querySelectorAll('[data-html2canvas-ignore]').forEach((node) => node.remove());
}

function forcePdfVisible(el: HTMLElement): void {
  el.style.opacity = '1';
  el.style.visibility = 'visible';
  el.style.transform = 'none';
  el.style.transformOrigin = 'top left';
}

/** Clone a live resume template for export or dialog preview (no editor overlays). */
export function cloneResumeTemplateElement(
  templateEl: HTMLElement,
  designWidth?: number,
): HTMLElement {
  const clone = templateEl.cloneNode(true) as HTMLElement;
  stripPdfExcludedNodes(clone);
  forcePdfVisible(clone);
  clone.querySelectorAll<HTMLElement>('[style*="opacity"], [style*="visibility"], [style*="transform"]').forEach(forcePdfVisible);

  const width = designWidth ?? (templateEl.offsetWidth || 612);
  clone.style.width = `${width}px`;
  clone.style.maxWidth = `${width}px`;
  clone.style.minWidth = `${width}px`;
  clone.style.background = '#fff';
  clone.style.boxSizing = 'border-box';
  clone.style.display = 'block';

  return clone;
}
