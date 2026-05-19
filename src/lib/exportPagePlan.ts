export interface ExportPageSegment {
  index: number;
  startPx: number;
  heightPx: number;
  isLast: boolean;
}

export interface BuildExportPageSegmentsOptions {
  totalContentHeightPx: number;
  pageHeightPx: number;
  customBreakPositions?: number[];
  minGapPx?: number;
}

/** Section geometry measured in Puppeteer (template-root coordinates). */
export interface ExportSectionBounds {
  top: number;
  bottom: number;
  headingTop: number;
}

const DEFAULT_MIN_GAP_PX = 40;
const SECTION_HEADING_GUARD_PX = 80;
const NEAR_SECTION_TOP_PX = 24;

export function normalizeBreakPositions(
  positions: number[] | undefined,
  totalContentHeightPx: number,
  minGapPx: number = DEFAULT_MIN_GAP_PX,
): number[] {
  if (!positions?.length || !Number.isFinite(totalContentHeightPx) || totalContentHeightPx <= 0) {
    return [];
  }

  const sorted = positions
    .filter((position) => Number.isFinite(position))
    .map((position) => Math.round(position))
    .filter((position) => position >= minGapPx && position <= totalContentHeightPx - minGapPx)
    .sort((a, b) => a - b);

  const normalized: number[] = [];
  for (const position of sorted) {
    const previous = normalized[normalized.length - 1];
    if (previous === undefined || position - previous >= minGapPx) {
      normalized.push(position);
    }
  }
  return normalized;
}

/** Remap client-measured break Y values when Puppeteer layout height differs. */
export function scaleBreakPositionsToMeasuredHeight(
  positions: number[] | undefined,
  clientHeightPx: number,
  measuredHeightPx: number,
): number[] {
  if (!positions?.length) return [];
  const client = Math.max(1, Math.round(clientHeightPx));
  const measured = Math.max(1, Math.round(measuredHeightPx));
  if (client === measured) {
    return positions.filter(Number.isFinite).map((p) => Math.round(p));
  }
  const scale = measured / client;
  return positions.filter(Number.isFinite).map((p) => Math.round(p * scale));
}

/**
 * Snaps breaks that landed inside a section heading band (common when client vs
 * export layout heights differ) so the full section starts on the next page.
 */
export function snapBreakPositionsToSectionHeadings(
  breaks: number[],
  sections: ExportSectionBounds[],
  totalHeightPx: number,
  minGapPx: number = DEFAULT_MIN_GAP_PX,
): number[] {
  if (!breaks.length || !sections.length) return breaks;
  const sorted = [...sections].sort((a, b) => a.top - b.top);
  const maxY = Math.max(minGapPx, totalHeightPx - minGapPx);

  return breaks.map((breakY) => {
    let y = breakY;
    for (const section of sorted) {
      const headTop = section.headingTop ?? section.top;
      const inSection = y > section.top && y < section.bottom;
      const nearSectionTop =
        y >= section.top - NEAR_SECTION_TOP_PX && y <= headTop + SECTION_HEADING_GUARD_PX;

      if (inSection) {
        const fromSectionStart = y - section.top;
        if (fromSectionStart <= SECTION_HEADING_GUARD_PX || y <= headTop + SECTION_HEADING_GUARD_PX) {
          y = Math.max(minGapPx, headTop);
          break;
        }
      } else if (nearSectionTop) {
        y = Math.max(minGapPx, headTop);
        break;
      }
    }
    return Math.min(y, maxY);
  });
}

export function buildExportPageSegments({
  totalContentHeightPx,
  pageHeightPx,
  customBreakPositions,
  minGapPx = DEFAULT_MIN_GAP_PX,
}: BuildExportPageSegmentsOptions): ExportPageSegment[] {
  const total = Math.max(1, Math.round(totalContentHeightPx || 0));
  const pageHeight = Math.max(1, Math.round(pageHeightPx || total));
  const customBreaks = normalizeBreakPositions(customBreakPositions, total, minGapPx);
  const breaks = customBreaks.length > 0
    ? customBreaks
    : Array.from(
        { length: Math.max(0, Math.ceil(total / pageHeight) - 1) },
        (_unused, index) => pageHeight * (index + 1),
      ).filter((position) => position < total);

  const points = [0, ...breaks, total];
  const segments: ExportPageSegment[] = [];
  for (let index = 0; index < points.length - 1; index++) {
    const startPx = points[index];
    const endPx = points[index + 1];
    const heightPx = Math.max(1, endPx - startPx);
    segments.push({
      index,
      startPx,
      heightPx,
      isLast: index === points.length - 2,
    });
  }

  return segments;
}
