import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  estimatePageCount,
  getTemplateSourceElement,
  calculatePDFDimensions,
  generatePDFPages,
  snapBreaksToContent,
  findWhitespaceBandSnap,
  PdfGenerationError,
} from "./pdfGenerator";
import * as pdfLib from "pdf-lib";
import html2canvas from "html2canvas";
import { TemplateConfig, getTemplateConfig } from "@/lib/templateConfig";

// Mock dependencies
vi.mock("html2canvas", () => ({
  default: vi.fn(),
}));

vi.mock("pdf-lib", async () => {
  const actual = await vi.importActual("pdf-lib");
  return {
    ...actual,
    PDFDocument: {
      create: vi.fn().mockResolvedValue({
        addPage: vi.fn().mockReturnValue({
          drawImage: vi.fn(),
          drawRectangle: vi.fn(),
          drawText: vi.fn(),
        }),
        embedPng: vi.fn().mockResolvedValue("mock-png-image"),
        embedFont: vi.fn().mockResolvedValue({
          widthOfTextAtSize: vi.fn().mockReturnValue(10),
        }),
        save: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
        getPages: vi.fn().mockReturnValue([]),
        copyPages: vi.fn().mockResolvedValue([]),
        getPageIndices: vi.fn().mockReturnValue([]),
      }),
      load: vi.fn().mockResolvedValue({
        getPageIndices: vi.fn().mockReturnValue([0]),
        copyPages: vi.fn().mockResolvedValue([]),
        getPages: vi.fn().mockReturnValue([]),
      }),
    },
  };
});

// Mock template config
vi.mock("@/lib/templateConfig", () => ({
  getTemplateConfig: vi.fn().mockReturnValue({
    id: "modern",
    name: "Modern",
    layout: "linear",
    maxRecommendedPages: 3,
    supportsPhoto: false,
  } as TemplateConfig),
}));

describe("pdfGenerator", () => {
  let mockElement: HTMLElement;
  let mockCanvas: HTMLCanvasElement;
  let mockCtx: CanvasRenderingContext2D;

  beforeEach(() => {
    // Setup DOM mock
    mockElement = document.createElement("div");
    mockElement.setAttribute("data-resume-template", "true");
    mockElement.scrollIntoView = vi.fn();
    document.body.appendChild(mockElement);

    // Setup Canvas mock
    mockCanvas = document.createElement("canvas");
    mockCanvas.width = 800;
    mockCanvas.height = 1000;

    mockCtx = {
      fillStyle: '',
      fillRect: vi.fn(),
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    mockCanvas.getContext = vi.fn().mockReturnValue(mockCtx);
    mockCanvas.toDataURL = vi.fn().mockReturnValue("data:image/png;base64,mock");

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      if (tagName === "canvas") {
        const canvas = originalCreateElement("canvas");
        canvas.getContext = vi.fn().mockReturnValue(mockCtx);
        canvas.toDataURL = vi.fn().mockReturnValue("data:image/png;base64,mock");
        return canvas;
      }
      return originalCreateElement(tagName);
    });

    (html2canvas as any).mockResolvedValue(mockCanvas);

    vi.spyOn(window, "getComputedStyle").mockReturnValue({
      width: "800px",
      marginTop: "0px",
      marginBottom: "0px",
    } as any);

    vi.spyOn(window, "scrollTo").mockImplementation(() => {});

    Object.defineProperty(document, 'fonts', {
      value: { ready: Promise.resolve() },
      writable: true,
      configurable: true
    });
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  describe("estimatePageCount", () => {
    it("should return 1 for short content", () => {
      vi.spyOn(window, "getComputedStyle").mockReturnValue({
        width: "800px",
        height: "400px",
      } as any);
      Object.defineProperty(mockElement, 'scrollHeight', { value: 400, configurable: true });
      Object.defineProperty(mockElement, 'offsetWidth', { value: 800, configurable: true });

      const count = estimatePageCount(mockElement);
      expect(count).toBe(1);
    });
  });

  describe("getTemplateSourceElement", () => {
    it("should return the passed element", () => {
      const el = getTemplateSourceElement(mockElement);
      expect(el).toBe(mockElement);
    });

    it("should find element by selector if not passed", () => {
      const el = getTemplateSourceElement(null);
      expect(el).toBe(mockElement);
    });

    it("should throw if not found", () => {
      document.body.innerHTML = "";
      expect(() => getTemplateSourceElement(null)).toThrow("Resume template not found");
    });
  });

  describe("calculatePDFDimensions", () => {
    it("should return correct dimensions", () => {
      vi.spyOn(window, "getComputedStyle").mockReturnValue({
        width: "612px",
        height: "792px",
      } as any);
      Object.defineProperty(mockElement, 'offsetWidth', { value: 612, configurable: true });
      Object.defineProperty(mockElement, 'scrollHeight', { value: 792, configurable: true });
      Object.defineProperty(mockElement, 'offsetHeight', { value: 792, configurable: true });

      const dims = calculatePDFDimensions(mockElement);

      expect(dims.sourceWidth).toBe(612);
      expect(dims.totalHeight).toBe(792);
      expect(dims.globalScaleFactor).toBe(1);
      expect(dims.sourceHeightPerPage).toBe(792);
    });
  });

  describe("generatePDFPages", () => {
    it("should generate pages with dynamic height based on segment", async () => {
      const pdfDoc = await pdfLib.PDFDocument.create();
      const addPageSpy = vi.spyOn(pdfDoc, 'addPage');

      const canvas = document.createElement('canvas');
      canvas.width = 612 * 2;
      canvas.height = 792 * 2 * 2;

      const smartBreaks = [792];
      const totalHeight = 792 * 2;
      const globalScaleFactor = 1;

      await generatePDFPages(pdfDoc, canvas, smartBreaks, totalHeight, globalScaleFactor);

      expect(addPageSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe("TPL-2 whitespace-band fallback for tall entries", () => {
    function buildTallEntryDOM(): { root: HTMLElement; entryTop: number; entryHeight: number } {
      const root = document.createElement('div');
      Object.defineProperty(root, 'scrollHeight', { value: 2000, configurable: true });
      Object.defineProperty(root, 'offsetWidth', { value: 612, configurable: true });
      // Mock the source rect at (0,0)
      root.getBoundingClientRect = () => ({ top: 0, left: 0, right: 612, bottom: 2000, width: 612, height: 2000, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;

      const section = document.createElement('section');
      section.setAttribute('data-section', 'experience');
      section.getBoundingClientRect = () => ({ top: 0, left: 0, right: 612, bottom: 2000, width: 612, height: 2000, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;

      // One oversized [data-break-avoid] entry covering the whole section.
      // Two child elements at top/bottom only — far from any forced break.
      const entry = document.createElement('div');
      entry.setAttribute('data-break-avoid', 'true');
      const entryTop = 0;
      const entryBottom = 2000;
      entry.getBoundingClientRect = () => ({ top: entryTop, left: 0, right: 612, bottom: entryBottom, width: 612, height: entryBottom - entryTop, x: 0, y: entryTop, toJSON: () => ({}) }) as DOMRect;

      // Add a far-away child so no candidate is within entryMaxShift
      const childNear = document.createElement('p');
      childNear.getBoundingClientRect = () => ({ top: 5, left: 0, right: 612, bottom: 25, width: 612, height: 20, x: 0, y: 5, toJSON: () => ({}) }) as DOMRect;
      entry.appendChild(childNear);
      section.appendChild(entry);
      root.appendChild(section);

      return { root, entryTop, entryHeight: entryBottom - entryTop };
    }

    function makeCanvasWithWhitespaceRow(width: number, height: number, whiteRow: number): HTMLCanvasElement {
      // JSDOM's 2d context can't actually paint, so we hand-roll a minimal
      // mock with a scripted getImageData so findWhitespaceBandSnap sees the
      // synthetic whitespace row at exactly `whiteRow`.
      const canvas = document.createElement('canvas');
      Object.defineProperty(canvas, 'width', { value: width, configurable: true });
      Object.defineProperty(canvas, 'height', { value: height, configurable: true });
      canvas.getContext = vi.fn().mockReturnValue({
        fillStyle: '',
        fillRect: vi.fn(),
        drawImage: vi.fn(),
        getImageData: (_x: number, y: number, _w: number, h: number) => {
          const data = new Uint8ClampedArray(h * 4);
          for (let i = 0; i < h; i++) {
            const v = (y + i) === whiteRow ? 255 : 0;
            data[i * 4] = v;
            data[i * 4 + 1] = v;
            data[i * 4 + 2] = v;
            data[i * 4 + 3] = 255;
          }
          return { data, width: 1, height: h, colorSpace: 'srgb' } as ImageData;
        },
      }) as any;
      canvas.toDataURL = vi.fn().mockReturnValue('data:image/png;base64,a');
      return canvas;
    }

    it("snaps the break to a whitespace row when no [data-break-child] is available", () => {
      const { root } = buildTallEntryDOM();
      // Source-y 700 (canvas row 1400 at scale=2) is the only whitespace row
      // inside the [60, 800] clamp window.
      const canvas = makeCanvasWithWhitespaceRow(612 * 2, 2000 * 2, 1400);
      const breaks = snapBreaksToContent([800], root, 800, canvas, 2);
      expect(breaks.length).toBe(1);
      // Allow ±1 source-px rounding from the row→source-y conversion.
      expect(breaks[0]).toBeGreaterThanOrEqual(699);
      expect(breaks[0]).toBeLessThanOrEqual(701);
    });

    it("throws ENTRY_TOO_TALL when no whitespace band exists in the clamp window", () => {
      const { root } = buildTallEntryDOM();
      // Make the entire canvas inky — no whitespace anywhere.
      const canvas = document.createElement('canvas');
      canvas.width = 1224;
      canvas.height = 4000;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      expect(() => snapBreaksToContent([800], root, 800, canvas, 2)).toThrow(PdfGenerationError);
      try {
        snapBreaksToContent([800], root, 800, canvas, 2);
      } catch (e: any) {
        expect(e.code).toBe('ENTRY_TOO_TALL');
      }
    });

    it("findWhitespaceBandSnap returns null for a fully inky strip", () => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 1000;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#222222';
      ctx.fillRect(0, 0, 100, 1000);
      expect(findWhitespaceBandSnap(canvas, 2, 0, 400, 60)).toBeNull();
    });
  });

});
