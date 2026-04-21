/**
 * Integration tests for the text-layer failure surface in pdfGenerator.
 * Verifies that any failure in the hidden ATS text layer aborts the export
 * with PdfGenerationError(TEXT_LAYER_FAILED) instead of silently shipping an
 * image-only PDF.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { TextLayerError } from '@/lib/pdfTextLayer';

vi.mock('@/lib/pdfTextLayer', async () => {
  const actual: any = await vi.importActual('@/lib/pdfTextLayer');
  return {
    ...actual,
    walkTemplateDOM: vi.fn(),
    renderDOMTextLayerForPage: vi.fn(),
    chunksForPage: vi.fn(),
  };
});

import {
  generatePDFPages,
  PdfGenerationError,
} from '@/lib/pdfGenerator';
import * as textLayer from '@/lib/pdfTextLayer';

function makeStubCanvas(width = 600, height = 800): HTMLCanvasElement {
  // jsdom has no real canvas; stub the few methods generatePDFPages uses.
  const c = document.createElement('canvas');
  Object.defineProperty(c, 'width', { value: width, configurable: true });
  Object.defineProperty(c, 'height', { value: height, configurable: true });
  // Stub a 2D context with the methods generatePDFPages calls.
  Object.defineProperty(c, 'getContext', {
    value: () => ({
      fillStyle: '',
      fillRect: () => {},
      drawImage: () => {},
    }),
    configurable: true,
  });
  // Return a minimal 1x1 PNG data-URL (pdf-lib will accept this).
  c.toDataURL = () =>
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  return c;
}

describe('generatePDFPages — text-layer failure handling', () => {
  let restoreCtx: () => void;
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    // jsdom has no canvas backend; stub the prototype so the cropCanvas
    // pdfGenerator creates internally has a usable 2D context.
    const proto = HTMLCanvasElement.prototype as any;
    const origGet = proto.getContext;
    const origToData = proto.toDataURL;
    proto.getContext = function () {
      return { fillStyle: '', fillRect: () => {}, drawImage: () => {} };
    };
    proto.toDataURL = function () {
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    };
    restoreCtx = () => {
      proto.getContext = origGet;
      proto.toDataURL = origToData;
    };
  });
  afterEach(() => {
    restoreCtx?.();
    document.body.innerHTML = '';
  });

  it('aborts with PdfGenerationError(TEXT_LAYER_FAILED) when the text layer throws', async () => {
    const sourceElement = document.createElement('div');
    sourceElement.setAttribute('data-resume-template', 'true');
    document.body.appendChild(sourceElement);

    // walker returns one chunk so the render path is exercised
    (textLayer.walkTemplateDOM as any).mockReturnValue([
      { text: 'Hello world', y: 0, bottom: 20 },
    ]);
    (textLayer.chunksForPage as any).mockReturnValue([
      { text: 'Hello world', y: 0, bottom: 20 },
    ]);
    (textLayer.renderDOMTextLayerForPage as any).mockImplementation(() => {
      throw new TextLayerError('synthetic overflow');
    });

    const pdfDoc = await PDFDocument.create();
    const canvas = makeStubCanvas();

    let caught: unknown = null;
    try {
      await generatePDFPages(
        pdfDoc,
        canvas,
        [],            // smartBreaks — single page
        800,           // totalHeight
        1,             // globalScaleFactor
        612, 792,
        undefined,     // resume
        sourceElement, // <- enables text-layer path
      );
    } catch (e) {
      caught = e;
    }

    expect(textLayer.walkTemplateDOM).toHaveBeenCalledTimes(1);
    expect(textLayer.renderDOMTextLayerForPage).toHaveBeenCalledTimes(1);
    expect(caught).toBeInstanceOf(PdfGenerationError);
    expect((caught as PdfGenerationError).code).toBe('TEXT_LAYER_FAILED');
    expect((caught as PdfGenerationError).message).toMatch(/synthetic overflow/);
    expect((caught as PdfGenerationError).message).toMatch(/invisible to applicant tracking/i);
  });

  it('does not invoke the text-layer path when no sourceElement is provided', async () => {
    const pdfDoc = await PDFDocument.create();
    const canvas = makeStubCanvas();

    await generatePDFPages(pdfDoc, canvas, [], 800, 1, 612, 792);

    expect(textLayer.walkTemplateDOM).not.toHaveBeenCalled();
    expect(textLayer.renderDOMTextLayerForPage).not.toHaveBeenCalled();
  });
});
