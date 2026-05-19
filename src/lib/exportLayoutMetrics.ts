/**
 * Shared layout metrics for page-break setup and PDF export (template-root coordinates).
 */

export function getOffsetTopRelative(el: HTMLElement, root: HTMLElement): number {
  let top = 0;
  let curr: HTMLElement | null = el;
  while (curr && curr !== root && root.contains(curr)) {
    top += curr.offsetTop;
    curr = curr.offsetParent as HTMLElement | null;
  }
  return top;
}

/** Y coordinate for a page break before section content (prefers section heading). */
export function getSectionHeadingTop(sectionEl: HTMLElement, root: HTMLElement): number {
  const direct = sectionEl.querySelector(':scope > h2, :scope > h3');
  const heading = (direct ?? sectionEl.querySelector('h2, h3')) as HTMLElement | null;
  return getOffsetTopRelative(heading ?? sectionEl, root);
}

export interface SectionLayoutBounds {
  top: number;
  bottom: number;
  headingTop: number;
}

export function collectSectionLayoutBounds(root: HTMLElement): SectionLayoutBounds[] {
  return Array.from(root.querySelectorAll('[data-section]')).map((sec) => {
    const sectionEl = sec as HTMLElement;
    const top = getOffsetTopRelative(sectionEl, root);
    const headingTop = getSectionHeadingTop(sectionEl, root);
    return {
      top,
      bottom: top + sectionEl.offsetHeight,
      headingTop,
    };
  });
}

/**
 * Content height for export/breaks — ignores empty min-h page sentinels when section
 * bounds show substantially less content than scrollHeight.
 */
export function getExportContentHeightPx(root: HTMLElement): number {
  const sections = collectSectionLayoutBounds(root);
  const layoutHeight = Math.max(root.scrollHeight || 0, root.offsetHeight || 0, 1);

  if (sections.length === 0) {
    return layoutHeight;
  }

  const maxSectionBottom = Math.max(...sections.map((s) => s.bottom));
  const contentHeight = maxSectionBottom + 8;

  if (layoutHeight > contentHeight * 1.12 && contentHeight >= 120) {
    return Math.max(Math.round(contentHeight), 1);
  }

  return Math.max(Math.round(layoutHeight), Math.round(contentHeight), 1);
}
