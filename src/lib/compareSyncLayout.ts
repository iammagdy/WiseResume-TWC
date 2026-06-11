export interface CompareLayoutSync {
  stageHeight: number;
  beforeExtraScale: number;
  afterExtraScale: number;
}

/**
 * Align before/after compare panels to the same top and bottom edges.
 * The longer side is scaled down so both CVs end on the same line; the shorter
 * side is padded with white via minHeight on the container.
 */
export function computeCompareLayoutSync(
  heightBefore: number,
  heightAfter: number,
): CompareLayoutSync {
  if (heightBefore <= 0 && heightAfter <= 0) {
    return { stageHeight: 0, beforeExtraScale: 1, afterExtraScale: 1 };
  }
  if (heightBefore <= 0 || heightAfter <= 0) {
    return {
      stageHeight: Math.max(heightBefore, heightAfter),
      beforeExtraScale: 1,
      afterExtraScale: 1,
    };
  }

  let beforeExtraScale = 1;
  let afterExtraScale = 1;

  if (heightBefore > heightAfter) {
    beforeExtraScale = heightAfter / heightBefore;
  } else if (heightAfter > heightBefore) {
    afterExtraScale = heightBefore / heightAfter;
  }

  const visualBefore = heightBefore * beforeExtraScale;
  const visualAfter = heightAfter * afterExtraScale;

  return {
    stageHeight: Math.max(visualBefore, visualAfter),
    beforeExtraScale,
    afterExtraScale,
  };
}
