import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generatePDF,
  findSmartBreakPositions,
  estimatePageCount,
  getTemplateSourceElement,
  calculatePDFDimensions,
  generatePDFPages
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
    supportsPageBreaks: true,
    supportsManualBreaks: true,
    maxRecommendedPages: 3,
    singlePageOptimized: false,
    breakableSections: ["summary", "experience", "education", "skills", "certifications"],
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

    // Create a mock context object manually
    mockCtx = {
      fillStyle: '',
      fillRect: vi.fn(),
      drawImage: vi.fn(),
      // Add other methods if needed
    } as unknown as CanvasRenderingContext2D;

    // Override getContext on the canvas instance
    mockCanvas.getContext = vi.fn().mockReturnValue(mockCtx);
    mockCanvas.toDataURL = vi.fn().mockReturnValue("data:image/png;base64,mock");

    // Mock document.createElement to return our mocked canvas when 'canvas' is requested
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      if (tagName === "canvas") {
        const canvas = originalCreateElement("canvas");
        // Override getContext immediately
        canvas.getContext = vi.fn().mockReturnValue(mockCtx);
        canvas.toDataURL = vi.fn().mockReturnValue("data:image/png;base64,mock");
        return canvas;
      }
      return originalCreateElement(tagName);
    });

    // Mock html2canvas implementation
    (html2canvas as any).mockResolvedValue(mockCanvas);

    // Mock window.getComputedStyle
    vi.spyOn(window, "getComputedStyle").mockReturnValue({
      width: "800px",
      marginTop: "0px",
      marginBottom: "0px",
    } as any);

    // Mock window.scrollTo
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});

    // Mock document.fonts
    Object.defineProperty(document, 'fonts', {
      value: { ready: Promise.resolve() },
      writable: true,
      configurable: true // Important for cleanup
    });
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  describe("generatePDF", () => {
    it("should generate a PDF blob", async () => {
      const resumeData: any = { contactInfo: {} };
      const blob = await generatePDF(resumeData, "modern", mockElement);

      expect(blob).toBeInstanceOf(Blob);
      expect(html2canvas).toHaveBeenCalledWith(mockElement, expect.any(Object));
      expect(pdfLib.PDFDocument.create).toHaveBeenCalled();
    });

    it("should handle missing template element by throwing error", async () => {
      document.body.innerHTML = ""; // Remove element
      const resumeData: any = { contactInfo: {} };

      await expect(generatePDF(resumeData, "modern", null)).rejects.toThrow("Resume template not found");
    });
  });

  describe("findSmartBreakPositions", () => {
    it("should return empty array for short content", () => {
      const breaks = findSmartBreakPositions(mockElement, 800, 400); // height < perPage
      expect(breaks).toEqual([]);
    });
  });

  describe("estimatePageCount", () => {
    it("should return 1 for short content", () => {
      // Mock dimensions for short content
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
        width: "612px", // DEFAULT_PAGE_WIDTH
        height: "792px", // DEFAULT_PAGE_HEIGHT
      } as any);
      Object.defineProperty(mockElement, 'offsetWidth', { value: 612, configurable: true });
      Object.defineProperty(mockElement, 'scrollHeight', { value: 792, configurable: true });
      Object.defineProperty(mockElement, 'offsetHeight', { value: 792, configurable: true });

      const dims = calculatePDFDimensions(mockElement);

      expect(dims.sourceWidth).toBe(612);
      expect(dims.totalHeight).toBe(792);
      expect(dims.globalScaleFactor).toBe(1);
      // DEFAULT_PAGE_HEIGHT (792) - FOOTER_RESERVED (44) = 748
      expect(dims.sourceHeightPerPage).toBe(748);
    });
  });

  describe("generatePDFPages", () => {
    it("should generate pages based on smart breaks", async () => {
      const pdfDoc = await pdfLib.PDFDocument.create();
      const addPageSpy = vi.spyOn(pdfDoc, 'addPage');

      // Mock canvas
      const canvas = document.createElement('canvas');
      canvas.width = 612 * 2;
      canvas.height = 792 * 2; // 2 pages worth

      // 1 break at 792 (1 page height)
      const smartBreaks = [792];
      const totalHeight = 792 * 2;
      const globalScaleFactor = 1;

      await generatePDFPages(pdfDoc, canvas, smartBreaks, totalHeight, globalScaleFactor);

      // Should add 2 pages
      expect(addPageSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe("fixed-sidebar regression", () => {
    it("should force single page for fixed-sidebar layout", async () => {
      // Setup spy on addPage
      const addPageSpy = vi.fn().mockReturnValue({
          drawImage: vi.fn(),
          drawRectangle: vi.fn(),
          drawText: vi.fn(),
      });

      vi.mocked(pdfLib.PDFDocument.create).mockResolvedValue({
        addPage: addPageSpy,
        embedPng: vi.fn().mockResolvedValue("mock-png-image"),
        embedFont: vi.fn().mockResolvedValue({
          widthOfTextAtSize: vi.fn().mockReturnValue(10),
        }),
        save: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
        getPages: vi.fn().mockReturnValue([]),
        copyPages: vi.fn().mockResolvedValue([]),
        getPageIndices: vi.fn().mockReturnValue([]),
      } as any);

      // Mock template config
      (getTemplateConfig as any).mockReturnValue({
        id: "creative",
        layout: "fixed-sidebar",
        breakableSections: [],
      });

      // Mock huge element
      vi.spyOn(window, "getComputedStyle").mockReturnValue({
        width: "800px",
        height: "5000px",
      } as any);
      Object.defineProperty(mockElement, 'scrollHeight', { value: 5000, configurable: true });
      Object.defineProperty(mockElement, 'offsetHeight', { value: 5000, configurable: true });

      await generatePDF({ contactInfo: {} } as any, "creative", mockElement);

      expect(addPageSpy).toHaveBeenCalledTimes(1);
    });
  });
});
