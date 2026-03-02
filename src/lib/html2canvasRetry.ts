import html2canvas from 'html2canvas';
import { Capacitor } from '@capacitor/core';

/**
 * Pre-tags every SVG in a **live** DOM container with its real rendered
 * dimensions as `data-pdf-w` / `data-pdf-h` attributes.  These survive
 * html2canvas's DOM clone, so `convertSvgsToImages` can read accurate sizes
 * even inside the hidden iframe where `getBoundingClientRect()` returns 0.
 *
 * Call this on the live element **before** `captureWithRetry`, then invoke
 * the returned cleanup function after capture completes.
 */
export function tagSvgDimensions(container: HTMLElement): () => void {
  // Detect CSS transform scale on the container so we can compensate
  const containerRect = container.getBoundingClientRect();
  const scaleX = containerRect.width / (container.offsetWidth || 1);
  const scaleY = containerRect.height / (container.offsetHeight || 1);

  const svgs = container.querySelectorAll('svg');
  svgs.forEach((svg) => {
    const rect = svg.getBoundingClientRect();
    // Compensate for CSS transform to get true unscaled dimensions
    const w = rect.width / scaleX;
    const h = rect.height / scaleY;
    if (w > 0) svg.setAttribute('data-pdf-w', String(w));
    if (h > 0) svg.setAttribute('data-pdf-h', String(h));
    const color = getComputedStyle(svg).color;
    if (color) svg.setAttribute('data-pdf-color', color);
  });
  return () => {
    svgs.forEach((svg) => {
      svg.removeAttribute('data-pdf-w');
      svg.removeAttribute('data-pdf-h');
      svg.removeAttribute('data-pdf-color');
    });
  };
}

/**
 * Converts inline SVG elements to <img> tags with data URIs in a cloned DOM.
 * This fixes html2canvas misaligning/mis-sizing inline SVGs (e.g. lucide-react icons).
 * Safe to call on any cloned document — never mutates the live page.
 */
export function convertSvgsToImages(clonedDoc: Document): void {
  clonedDoc.querySelectorAll('svg').forEach((svg) => {
    let w =
      parseFloat(svg.getAttribute('data-pdf-w') || '0') ||
      parseFloat(svg.style.width) ||
      parseFloat(svg.getAttribute('width') || '0');
    let h =
      parseFloat(svg.getAttribute('data-pdf-h') || '0') ||
      parseFloat(svg.style.height) ||
      parseFloat(svg.getAttribute('height') || '0');
    // Additional fallback: try computed style for dimensions
    if (!w || !h) {
      const cs = clonedDoc.defaultView?.getComputedStyle(svg);
      if (cs) {
        if (!w) w = parseFloat(cs.width) || 0;
        if (!h) h = parseFloat(cs.height) || 0;
      }
    }
    // Last resort fallback for Lucide icons: check viewBox
    if (!w || !h) {
      const vb = svg.getAttribute('viewBox');
      if (vb) {
        const parts = vb.split(/\s+/);
        if (parts.length === 4) {
          if (!w) w = parseFloat(parts[2]) || 0;
          if (!h) h = parseFloat(parts[3]) || 0;
        }
      }
    }
    if (!w || !h) return;

    // Ensure viewBox for proper scaling
    if (!svg.getAttribute('viewBox')) {
      svg.setAttribute('viewBox', `0 0 ${svg.getAttribute('width') || w} ${svg.getAttribute('height') || h}`);
    }

    if (!svg.getAttribute('xmlns')) {
      svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }

    svg.setAttribute('width', String(w));
    svg.setAttribute('height', String(h));

    let serialized = new XMLSerializer().serializeToString(svg);

    // Resolve currentColor to actual computed color
    const taggedColor = svg.getAttribute('data-pdf-color');
    if (taggedColor) {
      serialized = serialized.replace(/currentColor/g, taggedColor);
    }

    const dataUri =
      'data:image/svg+xml;base64,' +
      btoa(unescape(encodeURIComponent(serialized)));

    const img = clonedDoc.createElement('img');
    img.src = dataUri;
    img.style.width = `${w}px`;
    img.style.height = `${h}px`;
    img.style.maxWidth = `${w}px`;
    img.style.maxHeight = `${h}px`;
    img.style.flexShrink = '0';
    img.style.display = 'inline-block';
    img.style.verticalAlign = 'middle';
    img.style.margin = '0';
    img.style.padding = '0';

    svg.parentNode?.replaceChild(img, svg);
  });
}

const ATTEMPT_CONFIGS = [
  { scale: 2, useCORS: true, allowTaint: true, foreignObjectRendering: false },
  { scale: 1.5, useCORS: true, allowTaint: false, foreignObjectRendering: false },
  { scale: 1, useCORS: false, allowTaint: false, foreignObjectRendering: false },
];

/**
 * Wraps html2canvas with up to 3 retry attempts using progressive fallback
 * options. Each retry reduces quality/features to maximise success rate,
 * especially on Android WebView where cross-origin and taint issues are common.
 */
export async function captureWithRetry(
  element: HTMLElement,
  baseOptions: Record<string, unknown> = {},
  maxAttempts = 3,
): Promise<HTMLCanvasElement> {
  const isNative = Capacitor.isNativePlatform();
  const timeouts = isNative ? [10_000, 18_000, 28_000] : [8_000, 15_000, 25_000];

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const fallback = ATTEMPT_CONFIGS[Math.min(attempt, ATTEMPT_CONFIGS.length - 1)];

    // Merge base options with the fallback config for this attempt.
    // Caller-provided `scale` takes precedence on the first attempt only.
    const opts: Record<string, unknown> = {
      ...fallback,
      ...baseOptions,
      logging: false,
    };

    // On retries, override scale down for reliability
    if (attempt >= 1) {
      opts.scale = fallback.scale;
      opts.allowTaint = fallback.allowTaint;
      opts.useCORS = fallback.useCORS;
    }

    // On the last attempt, strip external images to avoid taint errors
    if (attempt >= 2) {
      const existingOnClone = opts.onclone as ((doc: Document) => void) | undefined;
      opts.onclone = (doc: Document) => {
        existingOnClone?.(doc);
        doc.querySelectorAll('img').forEach((img) => {
          const src = img.getAttribute('src') || '';
          if (src && !src.startsWith('data:') && !src.startsWith(window.location.origin)) {
            img.style.visibility = 'hidden';
          }
        });
      };
    }

    try {
      const canvas = await Promise.race([
        html2canvas(element, opts as Parameters<typeof html2canvas>[1]),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Canvas capture timed out')), timeouts[attempt]),
        ),
      ]);

      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error('Empty canvas captured');
      }

      return canvas;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`html2canvas attempt ${attempt + 1}/${maxAttempts} failed:`, lastError.message);

      if (attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error('All capture attempts failed');
}
