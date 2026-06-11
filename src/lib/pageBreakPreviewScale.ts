/** Fit-to-width scale for the page-cut dialog miniature preview. */
export function computeDialogPreviewScale(
  containerWidth: number,
  designWidth: number,
  contentHeight: number,
): { scale: number; visualWidth: number; visualHeight: number } {
  const safeWidth = Math.max(containerWidth, 1);
  const safeDesign = Math.max(designWidth, 1);
  const safeHeight = Math.max(contentHeight, 1);
  const scale = safeWidth / safeDesign;
  return {
    scale,
    visualWidth: safeWidth,
    visualHeight: safeHeight * scale,
  };
}

/** Scale pages in a horizontal spread so all pages fit within the viewport. */
export function computeSpreadPreviewScale(
  containerWidth: number,
  designWidth: number,
  pageHeightPx: number,
  pageCount: number,
  maxPreviewHeight: number,
  gapPx: number = 16,
): { scale: number; visualWidth: number; visualHeight: number } {
  const safeWidth = Math.max(containerWidth, 1);
  const safeDesign = Math.max(designWidth, 1);
  const safePages = Math.max(pageCount, 1);
  const gaps = Math.max(0, safePages - 1) * gapPx;
  const scaleByWidth = (safeWidth - gaps) / (safeDesign * safePages);
  const scaleByHeight = maxPreviewHeight / Math.max(pageHeightPx, 1);
  const scale = Math.min(scaleByWidth, scaleByHeight, 1);
  const visualWidth = safeDesign * scale * safePages + gaps;
  const visualHeight = pageHeightPx * scale;
  return { scale, visualWidth, visualHeight };
}
