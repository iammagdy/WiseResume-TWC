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
  /** When true, injects ATS-clean CSS overrides (black text, white bg, Arial,
   *  no decorative images) so the PDF is maximally machine-readable. */
  atsMode?: boolean;
  /**
   * User-placed exact page break Y positions in CSS pixels (at 612 px design
   * width). When provided the server renders one PDF slice per segment so each
   * page is exactly as tall as the content — the last page is never padded to
   * A4/Letter size. Mutually exclusive with onePage.
   */
  customBreakPositions?: number[];
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
    atsMode = false,
    customBreakPositions,
  } = options;

  const hasCustomBreaks = !onePage && Array.isArray(customBreakPositions) && customBreakPositions.length > 0;

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

  // 1a. Explicitly pick up any inline <style> tags inside the resume element
  //     (notably the per-resume customization CSS injected by LivePreviewPanel).
  //     document.styleSheets sometimes fails to expose cssRules for these
  //     React-rendered inline style nodes; appending their textContent at the
  //     end of cssChunks guarantees customization (accent colour, fonts,
  //     font-scale, gaps, header alignment) ends up in the head of the
  //     Puppeteer document and wins ordering ties against template CSS.
  element.querySelectorAll('style').forEach(s => {
    const text = s.textContent?.trim();
    if (text) cssChunks.push(text);
  });

  // 2. Clone the element and fix relative asset URLs so the headless browser
  //    can fetch them from the running dev/prod server.
  const clone = element.cloneNode(true) as HTMLElement;
  const origin = window.location.origin;

  // Strip editor-only overlays (page-break indicators etc.) that get rendered
  // alongside the resume template in the live preview. They carry
  // data-html2canvas-ignore as a hint from the previous html2canvas pipeline;
  // Puppeteer doesn't honour that attribute on its own, so we remove them
  // from the clone explicitly.
  clone.querySelectorAll('[data-html2canvas-ignore]').forEach(el => el.remove());

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
  // ATS mode: inject overriding CSS that strips all decorative styling so the
  // resulting PDF is maximally machine-readable (black text, white bg, Arial).
  const atsCssBlock = atsMode ? `
<style>
/* ATS-clean overrides — force plain black-on-white, Arial, single-column.
   Applied after all template CSS so !important wins universally. */
* {
  color: #000 !important;
  background: #fff !important;
  background-color: #fff !important;
  background-image: none !important;
  border-color: #ccc !important;
  box-shadow: none !important;
  text-shadow: none !important;
  font-family: Arial, Helvetica, sans-serif !important;
  column-count: 1 !important;
  column-gap: 0 !important;
  float: none !important;
}
/* Collapse flex/grid containers to vertical block flow so two-column
   template layouts linearise into a single-column reading order. */
div, section, aside, main, header, footer, article, nav {
  display: block !important;
  width: 100% !important;
  max-width: 100% !important;
}
/* Restore inline behaviour for text-level elements so words don't stack. */
span, a, strong, em, b, i, u, s, code, mark, sub, sup, small, abbr,
cite, q, time, label, output {
  display: inline !important;
  width: auto !important;
}
/* Hide profile photos and any decorative images. */
img { display: none !important; }
</style>` : '';

  // Map the existing [data-break-avoid] markers used throughout the templates
  // (experience, education, project, certification, award, etc. entries) onto
  // native CSS pagination so Puppeteer keeps each entry on a single page.
  // The markers were originally only consumed by the html2canvas paginator.
  const paginationCss = `
<style>
[data-break-avoid] { break-inside: avoid; page-break-inside: avoid; }
</style>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
${cssChunks.join('\n')}
</style>
${paginationCss}
${atsCssBlock}
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
      ...(hasCustomBreaks && {
        customBreakPositions,
        totalContentHeightPx: element.scrollHeight,
      }),
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

/** Escapes a plain string for safe insertion as HTML text content. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Generates a cover letter PDF via Puppeteer by building a clean HTML document
 * from the cover letter text and sending it to the server for rendering.
 * Produces a visually consistent, text-selectable PDF whose sans-serif styling
 * complements the Puppeteer-rendered resume.
 *
 * All user-supplied values are HTML-escaped before insertion to prevent
 * script/markup injection into the headless browser context.
 */
export async function generateCoverLetterNativePDF(
  coverLetter: string,
  contactInfo: {
    fullName?: string;
    email?: string;
    phone?: string;
    location?: string;
  },
  options: NativePdfOptions = {},
): Promise<Blob> {
  const {
    pageFormat = 'letter',
    showPageNumbers = true,
    showBranding = true,
    onProgress,
  } = options;

  onProgress?.('preparing', 5);

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const contactParts = [contactInfo.email, contactInfo.phone, contactInfo.location]
    .filter(Boolean)
    .map(s => escapeHtml(s as string));

  // Escape then convert plain-text newlines to HTML paragraphs.
  const paragraphs = coverLetter
    .split(/\n\n+/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('');

  const safeName = contactInfo.fullName ? escapeHtml(contactInfo.fullName) : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11pt;
    line-height: 1.6;
    color: #111;
  }
  .page {
    max-width: 612px;
    padding: 72px;
    box-sizing: border-box;
  }
  .name {
    font-size: 18pt;
    font-weight: bold;
    margin: 0 0 4px 0;
    letter-spacing: -0.3px;
  }
  .contact {
    font-size: 10pt;
    color: #555;
    margin: 0 0 6px 0;
  }
  .divider {
    border: none;
    border-top: 1px solid #d0d0d0;
    margin: 12px 0 20px 0;
  }
  .date {
    font-size: 11pt;
    color: #333;
    margin-bottom: 24px;
  }
  .body p {
    margin: 0 0 14px 0;
  }
</style>
</head>
<body>
<div class="page">
  ${safeName ? `<div class="name">${safeName}</div>` : ''}
  ${contactParts.length ? `<div class="contact">${contactParts.join(' \u00b7 ')}</div>` : ''}
  <hr class="divider">
  <div class="date">${today}</div>
  <div class="body">${paragraphs}</div>
</div>
</body>
</html>`;

  onProgress?.('capturing', 20);

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
