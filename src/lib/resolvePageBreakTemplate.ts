import type { RefObject } from 'react';

/** Live resume template node used by page-cut UI (ref + DOM fallback). */
export function resolvePageBreakTemplate(
  resumeRef: RefObject<HTMLElement | null>,
): HTMLElement | null {
  return resumeRef.current ?? document.querySelector<HTMLElement>('[data-resume-template]');
}
