export type ParserAssetKind = 'pdf' | 'ocr';

export class ParserAssetError extends Error {
  constructor(
    message: string,
    public readonly kind: ParserAssetKind,
    public readonly missingUrl: string,
  ) {
    super(message);
    this.name = 'ParserAssetError';
  }
}

const assetCache = new Map<string, Promise<void>>();

async function assertAsset(url: string, label: string): Promise<void> {
  const response = await fetch(url, { method: 'HEAD' });
  if (!response.ok) {
    throw new Error(`${label} missing at ${url} (${response.status})`);
  }
}

function once(key: string, task: () => Promise<void>): Promise<void> {
  const cached = assetCache.get(key);
  if (cached) return cached;
  const next = task().catch((error) => {
    assetCache.delete(key);
    throw error;
  });
  assetCache.set(key, next);
  return next;
}

export function resetParserAssetCache(): void {
  assetCache.clear();
}

export async function ensurePdfRuntimeAssets(): Promise<void> {
  if (typeof window === 'undefined' || typeof fetch !== 'function') return;
  return once('pdf-assets', async () => {
    try {
      await Promise.all([
        assertAsset('/pdfjs/cmaps/Adobe-Japan1-1.bcmap', 'PDF cmap asset'),
        assertAsset('/pdfjs/standard_fonts/FoxitFixed.pfb', 'PDF font asset'),
      ]);
    } catch (error) {
      throw new ParserAssetError(
        'PDF upload tools are missing on this environment. Refresh setup and try again.',
        'pdf',
        error instanceof Error ? error.message : '/pdfjs/*',
      );
    }
  });
}

export async function ensureOcrRuntimeAssets(): Promise<void> {
  if (typeof window === 'undefined' || typeof fetch !== 'function') return;
  return once('ocr-assets', async () => {
    try {
      await Promise.all([
        assertAsset('/tesseract/worker.min.js', 'OCR worker asset'),
        assertAsset('/tesseract/core/tesseract-core.wasm.js', 'OCR core asset'),
        assertAsset('/tesseract/lang/eng.traineddata.gz', 'OCR language asset'),
      ]);
    } catch (error) {
      throw new ParserAssetError(
        'OCR upload tools are missing on this environment. Refresh setup and try again.',
        'ocr',
        error instanceof Error ? error.message : '/tesseract/*',
      );
    }
  });
}
