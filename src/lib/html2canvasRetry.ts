import html2canvas from 'html2canvas';
import { Capacitor } from '@capacitor/core';

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
