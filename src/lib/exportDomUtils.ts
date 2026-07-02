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
  const sourceWidth = templateEl.offsetWidth || width;
  if (sourceWidth > width + 1) {
    const sourceNodes = Array.from(templateEl.querySelectorAll<HTMLElement>('*'));
    const cloneNodes = Array.from(clone.querySelectorAll<HTMLElement>('*'));
    sourceNodes.forEach((sourceNode, index) => {
      if (Math.abs(sourceNode.offsetWidth - sourceWidth) > 1) return;
      const cloneNode = cloneNodes[index];
      if (!cloneNode) return;
      cloneNode.style.width = `${width}px`;
      cloneNode.style.maxWidth = `${width}px`;
      cloneNode.style.minWidth = `${width}px`;
      cloneNode.style.boxSizing = 'border-box';
    });
  }
  clone.style.width = `${width}px`;
  clone.style.maxWidth = `${width}px`;
  clone.style.minWidth = `${width}px`;
  clone.style.background = '#fff';
  clone.style.boxSizing = 'border-box';
  clone.style.display = 'block';

  return clone;
}
