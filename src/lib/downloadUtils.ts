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

interface DownloadResult {
  success: boolean;
  cancelled?: boolean;
  method: 'share' | 'open' | 'anchor' | 'data-url';
}

const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);
const isAndroid = () => /Android/i.test(navigator.userAgent);

/**
 * Downloads a file using the best available method for the current platform.
 * - iOS: navigator.share → window.open → data URL anchor fallback
 * - Android: window.open
 * - Desktop: anchor click with proper cleanup
 */
export async function downloadFile(options: DownloadFileOptions): Promise<DownloadResult> {
  const { blob, fileName, mimeType, maxRetries = 1 } = options;
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
        return { success: true, method: 'share' };
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          return { success: false, cancelled: true, method: 'share' };
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
      // Revoke after a delay to let the tab load
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      return { success: true, method: 'open' };
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
    return { success: true, method: 'data-url' };
  } catch {
    URL.revokeObjectURL(url);
    return { success: false, method: 'data-url' };
  }
}

function downloadMobile(blob: Blob, fileName: string): DownloadResult {
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  // Revoke after delay to allow download
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return { success: true, method: 'open' };
}

function downloadDesktop(blob: Blob, fileName: string): DownloadResult {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return { success: true, method: 'anchor' };
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
