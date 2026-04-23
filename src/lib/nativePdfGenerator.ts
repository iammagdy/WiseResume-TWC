/**
 * Native PDF generator — serialises the live resume DOM and delegates
 * rendering to the Express server (Puppeteer), producing a text-selectable
 * PDF without a hidden white-text ATS layer.
 */
import { PDFDocument } from 'pdf-lib';
import { getToken } from '@/lib/supabaseBridge';
import type { OnProgressCallback } from '@/hooks/useExportProgress';

export interface NativePdfOptions {
  pageFormat?: 'letter' | 'a4';
  onePage?: boolean;
  showPageNumbers?: boolean;
  showBranding?: boolean;
  onProgress?: OnProgressCallback;
}

/**
 * Serialises the live resume DOM element into a self-contained HTML document,
 * POSTs it to /api/export/pdf-native for Puppeteer rendering, and returns the
 * resulting PDF Blob.
 */
export async function generateNativePDF(
  element: HTMLElement,
  options: NativePdfOptions = {},
): Promise<Blob> {
  const {
    pageFormat = 'letter',
    onePage = false,
    showPageNumbers = true,
    showBranding = true,
    onProgress,
  } = options;

  onProgress?.('preparing', 5);
  await document.fonts.ready;
  await new Promise<void>(r => setTimeout(r, 200));
  onProgress?.('capturing', 15);

  // 1. Gather all CSS rules from the document (inline + linked sheets).
  const cssChunks: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const rules = Array.from(sheet.cssRules ?? []);
      cssChunks.push(rules.map(r => r.cssText).join('\n'));
    } catch {
      if (sheet.href) {
        cssChunks.push(`@import url("${sheet.href}");`);
      }
    }
  }

  // 2. Clone the element and fix relative asset URLs so the headless browser
  //    can fetch them from the running dev/prod server.
  const clone = element.cloneNode(true) as HTMLElement;
  const origin = window.location.origin;

  // Compress large base64-encoded images to JPEG before serialisation so the
  // HTML payload stays well within the server's size limit even when the resume
  // contains a high-resolution profile photo or other inline raster assets.
  const MAX_IMG_BYTES = 200_000; // images larger than ~200 KB get recompressed
  const JPEG_QUALITY = 0.82;
  const MAX_DIMENSION = 800; // cap width/height to avoid enormous canvases

  const compressDataUri = (dataUri: string): Promise<string> =>
    new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          const scale = MAX_DIMENSION / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(dataUri); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
      };
      img.onerror = () => resolve(dataUri);
      img.src = dataUri;
    });

  // Process all inline base64 images in the cloned DOM.
  // Only compress raster photo formats (JPEG, PNG, WebP, BMP, TIFF).
  // SVG, GIF, and other formats are left untouched to preserve vector
  // fidelity, animation, and alpha transparency.
  const PHOTO_MIME_RE = /^data:image\/(jpeg|jpg|png|webp|bmp|tiff)/i;
  const imgCompressPromises: Promise<void>[] = [];
  clone.querySelectorAll<HTMLImageElement>('img[src]').forEach(img => {
    const src = img.getAttribute('src') ?? '';
    if (PHOTO_MIME_RE.test(src) && src.length > MAX_IMG_BYTES) {
      imgCompressPromises.push(
        compressDataUri(src).then(compressed => { img.setAttribute('src', compressed); }),
      );
    } else if (src && !src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('//')) {
      img.setAttribute('src', new URL(src, origin).href);
    }
  });
  await Promise.all(imgCompressPromises);

  // Fix remaining relative URLs (non-data-uri images).
  clone.querySelectorAll<HTMLImageElement>('img[src]').forEach(img => {
    const src = img.getAttribute('src') ?? '';
    if (src && !src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('//')) {
      img.setAttribute('src', new URL(src, origin).href);
    }
  });

  clone.querySelectorAll<HTMLElement>('[style*="url("]').forEach(el => {
    const style = el.getAttribute('style') ?? '';
    const fixed = style.replace(
      /url\(['"]?((?!https?:|data:|\/\/)[^'"()]+)['"]?\)/g,
      (_match, p1: string) => `url("${new URL(p1, origin).href}")`,
    );
    if (fixed !== style) el.setAttribute('style', fixed);
  });

  // 3. Compute fit-scale for one-page exports.
  let fitScale = 1;
  if (onePage) {
    const pageHeightPx = pageFormat === 'a4' ? 842 : 792;
    const totalHeight = element.scrollHeight || element.getBoundingClientRect().height;
    if (totalHeight > pageHeightPx) {
      fitScale = pageHeightPx / totalHeight;
    }
  }

  // 4. Build a self-contained HTML document.
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
${cssChunks.join('\n')}
</style>
</head>
<body style="margin:0;padding:0;background:#fff;">
${clone.outerHTML}
</body>
</html>`;

  onProgress?.('paginating', 35);

  // 5. POST to the server for Puppeteer rendering.
  const token = getToken();
  const response = await fetch('/api/export/pdf-native', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      html,
      pageFormat,
      onePage,
      fitScale,
      showPageNumbers,
      showBranding,
    }),
  });

  if (!response.ok) {
    let errMsg = `Server error ${response.status}`;
    try {
      const errBody = await response.json() as { error?: string };
      if (errBody.error) errMsg = errBody.error;
    } catch { /* ignore */ }
    throw new Error(errMsg);
  }

  onProgress?.('finalizing', 85);
  const blob = await response.blob();
  onProgress?.('downloading', 100);
  return blob;
}

/**
 * Merges a cover letter PDF Blob and a resume PDF Blob into a single combined
 * PDF Blob using pdf-lib. Pages are ordered: cover letter pages first, then
 * resume pages.
 */
export async function mergePDFBlobs(
  coverLetterBlob: Blob,
  resumeBlob: Blob,
): Promise<Blob> {
  const [coverBytes, resumeBytes] = await Promise.all([
    coverLetterBlob.arrayBuffer(),
    resumeBlob.arrayBuffer(),
  ]);

  const [coverDoc, resumeDoc] = await Promise.all([
    PDFDocument.load(coverBytes),
    PDFDocument.load(resumeBytes),
  ]);

  const combined = await PDFDocument.create();

  const coverPages = await combined.copyPages(coverDoc, coverDoc.getPageIndices());
  coverPages.forEach(p => combined.addPage(p));

  const resumePages = await combined.copyPages(resumeDoc, resumeDoc.getPageIndices());
  resumePages.forEach(p => combined.addPage(p));

  const bytes = await combined.save();
  return new Blob([bytes as ArrayBuffer], { type: 'application/pdf' });
}
