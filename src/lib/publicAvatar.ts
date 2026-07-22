const APPWRITE_STORAGE_VIEW_PATH = /\/storage\/buckets\/[^/]+\/files\/[^/]+\/view$/;

export interface PublicAvatarSources {
  src: string;
  srcSet?: string;
  sizes?: string;
}

function isAppwriteCloudHost(hostname: string): boolean {
  return hostname === 'cloud.appwrite.io' || hostname.endsWith('.cloud.appwrite.io');
}

export function buildAppwriteAvatarPreviewUrl(
  avatarUrl: string,
  width: number,
  quality = 82,
): string | null {
  try {
    const url = new URL(avatarUrl);
    if (!isAppwriteCloudHost(url.hostname) || !APPWRITE_STORAGE_VIEW_PATH.test(url.pathname)) {
      return null;
    }

    const boundedWidth = Math.max(1, Math.min(4000, Math.round(width)));
    const boundedQuality = Math.max(1, Math.min(100, Math.round(quality)));
    url.pathname = url.pathname.replace(/\/view$/, '/preview');
    url.searchParams.set('width', String(boundedWidth));
    url.searchParams.set('height', String(boundedWidth));
    url.searchParams.set('quality', String(boundedQuality));
    url.searchParams.set('output', 'webp');
    return url.toString();
  } catch {
    return null;
  }
}

export function getPublicAvatarSources(
  avatarUrl: string,
  widths: number[],
  sizes: string,
): PublicAvatarSources {
  const normalizedWidths = [...new Set(widths)]
    .map((width) => Math.max(1, Math.round(width)))
    .sort((a, b) => a - b);
  const previews = normalizedWidths
    .map((width) => ({ width, url: buildAppwriteAvatarPreviewUrl(avatarUrl, width) }))
    .filter((item): item is { width: number; url: string } => item.url !== null);

  if (previews.length === 0) {
    return { src: avatarUrl };
  }

  const fallback = previews[Math.max(0, previews.length - 2)] ?? previews[0];
  return {
    src: fallback.url,
    srcSet: previews.map(({ width, url }) => `${url} ${width}w`).join(', '),
    sizes,
  };
}
