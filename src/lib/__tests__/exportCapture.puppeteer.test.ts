import { describe, it, expect, beforeAll, afterAll } from "vitest";
import puppeteer, { Browser, Page } from "puppeteer";
import { createRequire } from "module";
import { convertSvgsToImages } from "../html2canvasRetry";

declare global {
  interface Window {
    html2canvas: (el: HTMLElement, opts?: Record<string, unknown>) => Promise<HTMLCanvasElement>;
  }
}

const _require = createRequire(import.meta.url);
const HTML2CANVAS_BUNDLE: string = _require.resolve("html2canvas");

const FIXTURE_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; font-family: Arial, sans-serif; font-size: 14px; }
    #resume { width: 612px; position: relative; background: white; padding: 24px; box-sizing: border-box; }
    .contact-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  </style>
</head>
<body>
  <div id="resume" data-resume-template="true">
    <div data-section="contact">
      <span class="contact-row">
        <svg id="email-icon"
             xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16"
             data-pdf-w="16" data-pdf-h="16" data-pdf-color="rgb(0,0,0)"
             style="width:16px;height:16px;flex-shrink:0;display:inline;vertical-align:middle">
          <rect width="24" height="24" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
        </svg>
        <span id="email-label">jane@example.com</span>
      </span>
    </div>
    <div data-section="experience" style="margin-top:16px">
      <p>Senior Engineer at Tech Corp</p>
    </div>
    <div data-html2canvas-ignore="true" id="page-break-overlay"
         style="position:absolute;top:200px;left:0;width:100%;z-index:10">
      <div style="border-top:4px solid red;width:100%"></div>
      <span style="color:red">— Page break —</span>
    </div>
  </div>
</body>
</html>`;

let browser: Browser;
let page: Page;
let chromeMissing = false;

beforeAll(async () => {
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    page = await browser.newPage();
    await page.setViewport({ width: 800, height: 1000, deviceScaleFactor: 1 });
    await page.setContent(FIXTURE_HTML, { waitUntil: "load" });
    await page.addScriptTag({ path: HTML2CANVAS_BUNDLE });
  } catch (err) {
    if (err instanceof Error && (err.message.includes('Could not find Chrome') || err.message.includes('chrome'))) {
      chromeMissing = true;
      return;
    }
    throw err;
  }
}, 30_000);

afterAll(async () => {
  if (browser) await browser.close();
});

// Skip all tests when Chrome is not available (CI environments without puppeteer browsers)
beforeEach(({ skip }) => {
  if (chromeMissing) skip();
});

describe("Export capture — page-break overlay exclusion (headless browser)", () => {
  it("page-break overlay is present in the live fixture DOM", async () => {
    const exists = await page.$eval("[data-html2canvas-ignore='true']", (el) => !!el);
    expect(exists).toBe(true);
  });

  it("html2canvas onclone document contains no page-break text", async () => {
    const capturedText = await page.evaluate(() =>
      new Promise<string>((resolve) => {
        const resume = document.getElementById("resume")!;
        window.html2canvas(resume, {
          logging: false,
          onclone: (doc: Document) => resolve(doc.body.textContent ?? ""),
        });
      })
    );
    expect(capturedText).not.toContain("Page break");
    expect(capturedText).toContain("Senior Engineer at Tech Corp");
  });

  it("exported canvas pixel scan: no red pixels from page-break dashed line", async () => {
    const result = await page.evaluate(async () => {
      const resume = document.getElementById("resume")!;
      const canvas = await window.html2canvas(resume, {
        logging: false,
        backgroundColor: "#ffffff",
        scale: 1,
      });
      const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let redPixelCount = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 200 && data[i + 1] < 80 && data[i + 2] < 80) redPixelCount++;
      }
      return { redPixelCount, width: canvas.width, height: canvas.height };
    });
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
    expect(result.redPixelCount).toBe(0);
  });

  it("exported canvas is not blank (resume content was captured)", async () => {
    const nonWhitePixels = await page.evaluate(async () => {
      const canvas = await window.html2canvas(document.getElementById("resume")!, {
        logging: false,
        backgroundColor: "#ffffff",
        scale: 1,
      });
      const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let count = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) count++;
      }
      return count;
    });
    expect(nonWhitePixels).toBeGreaterThan(100);
  });
});

describe("Export capture — contact icon alignment (headless browser)", () => {
  it("contact icon vertical centre is within 4px of text label (Chrome layout)", async () => {
    const diff = await page.evaluate(() => {
      const ir = document.getElementById("email-icon")!.getBoundingClientRect();
      const lr = document.getElementById("email-label")!.getBoundingClientRect();
      return Math.abs((ir.top + ir.height / 2) - (lr.top + lr.height / 2));
    });
    expect(diff).toBeLessThanOrEqual(4);
  });

  it("production convertSvgsToImages on real-browser DOM produces aligned imgs", async () => {
    const cloneHtml = await page.evaluate(() => {
      const clone = document.getElementById("resume")!.cloneNode(true) as HTMLElement;
      clone.querySelectorAll("[data-html2canvas-ignore='true']").forEach((el) => el.remove());
      return clone.outerHTML;
    });

    const captureDoc = document.implementation.createHTMLDocument("capture");
    captureDoc.body.innerHTML = cloneHtml;
    convertSvgsToImages(captureDoc);

    expect(captureDoc.querySelectorAll("svg").length).toBe(0);
    const imgs = Array.from(captureDoc.querySelectorAll("img")) as HTMLImageElement[];
    expect(imgs.length).toBeGreaterThan(0);
    for (const img of imgs) {
      expect(img.style.verticalAlign).toBe("middle");
      expect(img.style.alignSelf).toBe("center");
      expect(img.style.flexShrink).toBe("0");
      expect(img.src).toMatch(/^data:image\/svg\+xml;base64,/);
    }
  });

  it("exported canvas top rows have content (contact section rendered)", async () => {
    const nonWhiteInTopRows = await page.evaluate(async () => {
      const canvas = await window.html2canvas(document.getElementById("resume")!, {
        logging: false,
        backgroundColor: "#ffffff",
        scale: 1,
      });
      const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
      const sampleH = Math.min(60, canvas.height);
      const { data } = ctx.getImageData(0, 0, canvas.width, sampleH);
      let count = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) count++;
      }
      return count;
    });
    expect(nonWhiteInTopRows).toBeGreaterThan(10);
  });

  it("canvas pixel sampling: icon and label pixels occupy the same vertical band in captured output", async () => {
    // Pixel-level alignment check: capture the canvas, then sample a horizontal
    // strip spanning both the icon and label x-range. Find the top/bottom of
    // non-white pixels in that strip and assert the span covers both elements,
    // confirming they rendered at the same vertical position.
    const result = await page.evaluate(async () => {
      const resume = document.getElementById("resume")!;
      const icon = document.getElementById("email-icon")!;
      const label = document.getElementById("email-label")!;

      const resumeRect = resume.getBoundingClientRect();
      const iconRect = icon.getBoundingClientRect();
      const labelRect = label.getBoundingClientRect();

      const canvas = await window.html2canvas(resume, {
        logging: false,
        backgroundColor: "#ffffff",
        scale: 1,
      });

      const scaleX = canvas.width / resumeRect.width;
      const scaleY = canvas.height / resumeRect.height;
      const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

      // Scan a horizontal strip that spans from icon left to label right,
      // restricted to the contact-row y range (±4px around the icon y centre)
      const rowBand = Math.ceil(Math.max(iconRect.height, labelRect.height) * scaleY) + 8;
      const rowCentre = Math.round((iconRect.top + iconRect.height / 2 - resumeRect.top) * scaleY);
      const rowStart = Math.max(0, rowCentre - rowBand);
      const rowEnd = Math.min(canvas.height, rowCentre + rowBand);

      const xStart = Math.max(0, Math.round((iconRect.left - resumeRect.left) * scaleX));
      const xEnd = Math.min(canvas.width, Math.round((labelRect.right - resumeRect.left) * scaleX));
      const stripW = xEnd - xStart;
      const stripH = rowEnd - rowStart;

      if (stripW <= 0 || stripH <= 0) return { ok: false, reason: "empty strip" };

      const { data } = ctx.getImageData(xStart, rowStart, stripW, stripH);

      // Find first and last rows in the strip that contain non-white pixels
      let firstRow = -1, lastRow = -1;
      for (let row = 0; row < stripH; row++) {
        for (let col = 0; col < stripW; col++) {
          const i = (row * stripW + col) * 4;
          if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) {
            if (firstRow < 0) firstRow = row;
            lastRow = row;
            break;
          }
        }
      }

      if (firstRow < 0) return { ok: false, reason: "no non-white pixels in strip" };

      // The span of content rows (in source px)
      const spanPx = (lastRow - firstRow) / scaleY;
      // Expected: icon + label are small elements; the vertical span must be
      // narrower than the icon height (both are in the same row)
      const maxSpan = Math.max(iconRect.height, labelRect.height) + 4;
      return { ok: spanPx <= maxSpan, spanPx, maxSpan };
    });

    expect(result.ok).toBe(true);
  });
});
