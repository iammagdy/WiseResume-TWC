import { describe, it, expect, afterEach } from "vitest";
import { tagSvgDimensions, convertSvgsToImages } from "../html2canvasRetry";

function makeSvg(w = 16, h = 16): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", String(w));
  svg.setAttribute("height", String(h));
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  return svg;
}

function buildResumeContainer(): HTMLElement {
  const container = document.createElement("div");
  container.setAttribute("data-resume-template", "true");
  container.style.width = "612px";

  const header = document.createElement("div");
  header.setAttribute("data-section", "contact");
  const iconRow = document.createElement("span");
  iconRow.className = "flex items-center gap-1";
  const emailIcon = makeSvg(16, 16);
  emailIcon.setAttribute("data-pdf-w", "16");
  emailIcon.setAttribute("data-pdf-h", "16");
  emailIcon.setAttribute("data-pdf-color", "rgb(0, 0, 0)");
  iconRow.appendChild(emailIcon);
  const emailLabel = document.createElement("span");
  emailLabel.textContent = "jane@example.com";
  iconRow.appendChild(emailLabel);
  header.appendChild(iconRow);
  container.appendChild(header);

  const experience = document.createElement("div");
  experience.setAttribute("data-section", "experience");
  experience.textContent = "Experience content";
  container.appendChild(experience);

  const overlay = document.createElement("div");
  overlay.setAttribute("data-html2canvas-ignore", "true");
  overlay.style.position = "absolute";
  overlay.style.top = "700px";
  const label = document.createElement("span");
  label.textContent = "— Page break —";
  overlay.appendChild(label);
  container.appendChild(overlay);

  return container;
}

describe("Page-break overlay — html2canvas exclusion attribute", () => {
  it("page-break indicators carry data-html2canvas-ignore='true'", () => {
    const container = buildResumeContainer();
    const overlays = container.querySelectorAll("[data-html2canvas-ignore='true']");
    expect(overlays.length).toBeGreaterThan(0);
    overlays.forEach((el) =>
      expect(el.getAttribute("data-html2canvas-ignore")).toBe("true")
    );
  });

  it("resume content nodes without the ignore attribute are captured", () => {
    const container = buildResumeContainer();
    const captured = Array.from(container.querySelectorAll("[data-section]")).filter(
      (el) => el.getAttribute("data-html2canvas-ignore") !== "true"
    );
    expect(captured.map((el) => el.getAttribute("data-section"))).toContain("experience");
  });
});

describe("convertSvgsToImages — icon alignment styles", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  function attachSvg(w: number, h: number) {
    const container = document.createElement("div");
    const svg = makeSvg(w, h);
    svg.setAttribute("data-pdf-w", String(w));
    svg.setAttribute("data-pdf-h", String(h));
    container.appendChild(svg);
    document.body.appendChild(container);
    return container;
  }

  it("replacement <img> has verticalAlign: middle", () => {
    const c = attachSvg(16, 16);
    convertSvgsToImages(document);
    expect((c.querySelector("img") as HTMLImageElement).style.verticalAlign).toBe("middle");
  });

  it("replacement <img> has alignSelf: center", () => {
    const c = attachSvg(16, 16);
    convertSvgsToImages(document);
    expect((c.querySelector("img") as HTMLImageElement).style.alignSelf).toBe("center");
  });

  it("replacement <img> has flexShrink: 0", () => {
    const c = attachSvg(16, 16);
    convertSvgsToImages(document);
    expect((c.querySelector("img") as HTMLImageElement).style.flexShrink).toBe("0");
  });

  it("replacement <img> dimensions match the source SVG", () => {
    const c = attachSvg(20, 20);
    convertSvgsToImages(document);
    const img = c.querySelector("img") as HTMLImageElement;
    expect(img.style.width).toBe("20px");
    expect(img.style.height).toBe("20px");
  });

  it("replacement <img> src is a SVG data-URI", () => {
    const c = attachSvg(16, 16);
    convertSvgsToImages(document);
    expect((c.querySelector("img") as HTMLImageElement).src).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  it("skips SVGs with no usable dimensions", () => {
    const container = document.createElement("div");
    container.appendChild(makeSvg(0, 0));
    document.body.appendChild(container);
    convertSvgsToImages(document);
    expect(container.querySelectorAll("svg").length).toBe(1);
    expect(container.querySelectorAll("img").length).toBe(0);
  });
});

describe("tagSvgDimensions — SVG measurement", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("stamps data-pdf-color on each SVG", () => {
    const container = document.createElement("div");
    const svg = makeSvg();
    container.appendChild(svg);
    document.body.appendChild(container);
    const cleanup = tagSvgDimensions(container);
    expect(svg.getAttribute("data-pdf-color")).toBeTruthy();
    cleanup();
  });

  it("cleanup removes all data-pdf-* attributes", () => {
    const container = document.createElement("div");
    const svg = makeSvg();
    container.appendChild(svg);
    document.body.appendChild(container);
    const cleanup = tagSvgDimensions(container);
    cleanup();
    expect(svg.getAttribute("data-pdf-w")).toBeNull();
    expect(svg.getAttribute("data-pdf-h")).toBeNull();
    expect(svg.getAttribute("data-pdf-color")).toBeNull();
  });

  it("does not throw when there are no SVGs", () => {
    const container = document.createElement("div");
    container.innerHTML = "<p>text</p>";
    document.body.appendChild(container);
    expect(() => { const c = tagSvgDimensions(container); c(); }).not.toThrow();
  });
});

// Integration: simulate the tag → clone → onclone pipeline from pdfGenerator.ts
describe("Export pipeline integration — DOM-clone simulation", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("page-break overlay text is absent from the simulated capture document", () => {
    const live = buildResumeContainer();
    document.body.appendChild(live);

    const captureDoc = document.implementation.createHTMLDocument("capture");
    captureDoc.body.appendChild(live.cloneNode(true));

    // html2canvas removes data-html2canvas-ignore elements before rendering
    captureDoc.querySelectorAll("[data-html2canvas-ignore='true']").forEach((el) =>
      el.remove()
    );

    convertSvgsToImages(captureDoc);

    expect(captureDoc.body.textContent).not.toContain("Page break");
    expect(captureDoc.body.textContent).toContain("Experience content");
  });

  it("contact icon SVGs become aligned <img> elements in the capture document", () => {
    const live = buildResumeContainer();
    document.body.appendChild(live);

    const captureDoc = document.implementation.createHTMLDocument("capture");
    captureDoc.body.appendChild(live.cloneNode(true));

    convertSvgsToImages(captureDoc);

    expect(captureDoc.querySelectorAll("svg").length).toBe(0);
    const imgs = captureDoc.querySelectorAll("img");
    expect(imgs.length).toBeGreaterThan(0);
    imgs.forEach((img) => {
      const el = img as HTMLImageElement;
      expect(el.style.verticalAlign).toBe("middle");
      expect(el.style.alignSelf).toBe("center");
      expect(el.style.flexShrink).toBe("0");
    });
  });

  it("page-break overlays are present in live DOM but gone after html2canvas exclusion", () => {
    const live = buildResumeContainer();
    document.body.appendChild(live);

    expect(live.querySelectorAll("[data-html2canvas-ignore='true']").length).toBeGreaterThan(0);

    const captureDoc = document.implementation.createHTMLDocument("capture");
    captureDoc.body.appendChild(live.cloneNode(true));
    captureDoc.querySelectorAll("[data-html2canvas-ignore='true']").forEach((el) =>
      el.remove()
    );

    expect(captureDoc.querySelectorAll("[data-html2canvas-ignore='true']").length).toBe(0);
  });

  it("tagSvgDimensions cleanup leaves no stale attributes on live DOM after capture", () => {
    const live = buildResumeContainer();
    document.body.appendChild(live);

    const cleanup = tagSvgDimensions(live);
    const captureDoc = document.implementation.createHTMLDocument("capture");
    captureDoc.body.appendChild(live.cloneNode(true));
    cleanup();

    live.querySelectorAll("svg").forEach((svg) => {
      expect(svg.getAttribute("data-pdf-w")).toBeNull();
      expect(svg.getAttribute("data-pdf-h")).toBeNull();
      expect(svg.getAttribute("data-pdf-color")).toBeNull();
    });
  });

  it("capture document DOM snapshot — regression guard for page-break and icon output", () => {
    const live = buildResumeContainer();
    document.body.appendChild(live);

    const captureDoc = document.implementation.createHTMLDocument("capture");
    captureDoc.body.appendChild(live.cloneNode(true));
    captureDoc.querySelectorAll("[data-html2canvas-ignore='true']").forEach((el) =>
      el.remove()
    );
    convertSvgsToImages(captureDoc);

    // Snapshot the serialized capture DOM — any regression (page-break bleed,
    // lost alignment styles, etc.) will produce a diff on the next run.
    expect(captureDoc.body.innerHTML).toMatchSnapshot();
  });
});
