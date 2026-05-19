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
