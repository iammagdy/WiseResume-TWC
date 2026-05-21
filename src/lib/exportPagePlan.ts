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

export interface ExportAvoidBounds {
  top: number;
  bottom: number;
  childTops: number[];
}

export interface BuildAutomaticBreakPositionsOptions {
  totalContentHeightPx: number;
  pageHeightPx: number;
  sections?: ExportSectionBounds[];
  avoidBlocks?: ExportAvoidBounds[];
  minGapPx?: number;
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

export function clampBreakPositions(
  positions: number[] | undefined,
  totalContentHeightPx: number,
  minGapPx: number = DEFAULT_MIN_GAP_PX,
): number[] {
  if (!positions?.length || !Number.isFinite(totalContentHeightPx) || totalContentHeightPx <= minGapPx * 2) {
    return [];
  }

  const minY = minGapPx;
  const maxY = totalContentHeightPx - minGapPx;
  return normalizeBreakPositions(
    positions
      .filter((position) => Number.isFinite(position))
      .map((position) => Math.min(maxY, Math.max(minY, Math.round(position)))),
    totalContentHeightPx,
    minGapPx,
  );
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

export function snapBreakPositionsToAvoidBlocks(
  breaks: number[],
  avoidBlocks: ExportAvoidBounds[],
  pageHeightPx: number,
  totalHeightPx: number,
  minGapPx: number = DEFAULT_MIN_GAP_PX,
): number[] {
  if (!breaks.length || !avoidBlocks.length) return breaks;
  const sorted = [...avoidBlocks].sort((a, b) => a.top - b.top);
  const maxY = Math.max(minGapPx, totalHeightPx - minGapPx);
  const pageHeight = Math.max(1, Math.round(pageHeightPx || totalHeightPx));
  const maxShift = Math.min(pageHeight * 0.5, 350);

  return breaks.map((breakY) => {
    let y = breakY;
    const hit = sorted.find((block) => y > block.top && y < block.bottom);
    if (!hit) return Math.min(Math.max(y, minGapPx), maxY);

    const blockHeight = hit.bottom - hit.top;
    if (hit.bottom - y <= minGapPx) {
      y = hit.bottom;
    } else if (y - hit.top <= minGapPx) {
      y = hit.top;
    } else if (blockHeight < pageHeight) {
      y = hit.top;
    } else if (hit.childTops.length > 0) {
      let best = y;
      let bestDistance = Infinity;
      for (const childTop of hit.childTops) {
        const distance = Math.abs(childTop - y);
        if (distance < bestDistance && distance <= maxShift) {
          best = childTop;
          bestDistance = distance;
        }
      }
      y = best;
    }

    return Math.min(Math.max(y, minGapPx), maxY);
  });
}

export function buildAutomaticBreakPositions({
  totalContentHeightPx,
  pageHeightPx,
  sections = [],
  avoidBlocks = [],
  minGapPx = DEFAULT_MIN_GAP_PX,
}: BuildAutomaticBreakPositionsOptions): number[] {
  const total = Math.max(1, Math.round(totalContentHeightPx || 0));
  const pageHeight = Math.max(1, Math.round(pageHeightPx || total));
  const rawBreaks = Array.from(
    { length: Math.max(0, Math.ceil(total / pageHeight) - 1) },
    (_unused, index) => pageHeight * (index + 1),
  ).filter((position) => position < total);

  if (rawBreaks.length === 0) return [];

  const sectionSnapped = snapBreakPositionsToSectionHeadings(rawBreaks, sections, total, minGapPx);
  const avoidSnapped = snapBreakPositionsToAvoidBlocks(sectionSnapped, avoidBlocks, pageHeight, total, minGapPx);
  const normalized = normalizeBreakPositions(avoidSnapped, total, minGapPx);

  return normalized.length > 0 ? normalized : normalizeBreakPositions(rawBreaks, total, minGapPx);
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
