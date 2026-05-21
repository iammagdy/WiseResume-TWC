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
  clone.style.transform = 'none';
  clone.style.transformOrigin = 'top left';

  return clone;
}
