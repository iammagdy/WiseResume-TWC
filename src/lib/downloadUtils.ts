/**
 * Cross-platform download utility.
 * Handles iOS (navigator.share), Android (window.open), and desktop (anchor click)
 * with proper memory cleanup via URL.revokeObjectURL().
 */

interface DownloadFileOptions {
  blob: Blob;
  fileName: string;
  mimeType?: string;
  /** Max retries for iOS navigator.share failures */
  maxRetries?: number;
}

export interface DownloadResult {
  success: boolean;
  outcome: 'triggered' | 'cancelled' | 'failed';
  cancelled?: boolean;
  method: 'share' | 'open' | 'anchor' | 'data-url';
}

const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);
const isAndroid = () => /Android/i.test(navigator.userAgent);

/**
 * Downloads a file using the best available method for the current platform.
 * - Capacitor native (iOS/Android): navigator.share (presents native share sheet)
 * - iOS browser: navigator.share → window.open → data URL anchor fallback
 * - Android browser: anchor click
 * - Desktop: anchor click with proper cleanup
 */
export async function downloadFile(options: DownloadFileOptions): Promise<DownloadResult> {
  const { blob, fileName, mimeType, maxRetries = 1 } = options;
  if (blob.size === 0) {
    return { success: false, outcome: 'failed', method: 'anchor' };
  }
  const effectiveMimeType = mimeType || blob.type || 'application/octet-stream';

  if (isIOS()) {
    return downloadIOS(blob, fileName, effectiveMimeType, maxRetries);
  }

  if (isAndroid()) {
    return downloadMobile(blob, fileName);
  }

  return downloadDesktop(blob, fileName);
}

async function downloadIOS(
  blob: Blob,
  fileName: string,
  mimeType: string,
  maxRetries: number
): Promise<DownloadResult> {
  const file = new File([blob], fileName, { type: mimeType });

  // Try navigator.share with retry
  if (navigator.canShare?.({ files: [file] })) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await navigator.share({ files: [file], title: fileName });
        return { success: true, outcome: 'triggered', method: 'share' };
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          return { success: false, outcome: 'cancelled', cancelled: true, method: 'share' };
        }
        if (attempt < maxRetries) continue;
        // Fall through to next method
      }
    }
  }

  // Fallback: open blob in new tab
  const url = URL.createObjectURL(blob);
  try {
    const newTab = window.open(url, '_blank');
    if (newTab) {
      // Revoke after a delay to let the tab load — 5 minutes for large PDFs on slow connections
      setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000);
      return { success: true, outcome: 'triggered', method: 'open' };
    }
  } catch {
    // popup blocked
  }

  // Last resort: data URL anchor
  try {
    const dataUrl = await blobToDataUrl(blob);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return { success: true, outcome: 'triggered', method: 'data-url' };
  } catch {
    URL.revokeObjectURL(url);
    return { success: false, outcome: 'failed', method: 'data-url' };
  }
}

function downloadMobile(blob: Blob, fileName: string): DownloadResult {
  // Try anchor download first (works on most Android browsers with correct filename)
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000); // 5 minutes for large PDFs
    return { success: true, outcome: 'triggered', method: 'anchor' };
  } catch {
    // Fallback to window.open if anchor fails
    const opened = window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000); // 5 minutes for large PDFs
    return opened
      ? { success: true, outcome: 'triggered', method: 'open' }
      : { success: false, outcome: 'failed', method: 'open' };
  }
}

function downloadDesktop(blob: Blob, fileName: string): DownloadResult {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  try {
    link.click();
    return { success: true, outcome: 'triggered', method: 'anchor' };
  } catch {
    URL.revokeObjectURL(url);
    return { success: false, outcome: 'failed', method: 'anchor' };
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000);
  }
}

export async function validatePdfBlob(blob: Blob): Promise<void> {
  if (blob.size === 0) throw new Error('PDF artifact is empty.');
  if (blob.size < 64) throw new Error('PDF artifact is too small to be valid.');
  const signature = new TextDecoder().decode(await blob.slice(0, 5).arrayBuffer());
  if (signature !== '%PDF-') throw new Error('PDF artifact has an invalid signature.');
}

export async function validateDocxBlob(blob: Blob): Promise<void> {
  if (blob.size === 0) throw new Error('DOCX artifact is empty.');
  const signature = new Uint8Array(await blob.slice(0, 2).arrayBuffer());
  if (signature[0] !== 0x50 || signature[1] !== 0x4b) {
    throw new Error('DOCX artifact has an invalid ZIP signature.');
  }
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(blob);
  if (!zip.file('[Content_Types].xml') || !zip.file('word/document.xml')) {
    throw new Error('DOCX package is missing required document entries.');
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
