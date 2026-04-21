import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  walkTemplateDOM,
  chunksForPage,
  renderDOMTextLayerForPage,
  TextLayerError,
} from '@/lib/pdfTextLayer';

/**
 * The walker reads getBoundingClientRect on every block to record y-offsets.
 * jsdom returns all-zero rects by default, so we monkey-patch the prototype
 * to assign each block a unique top/bottom based on the order it was attached.
 */
function installRectStub() {
  const elTops = new WeakMap<Element, { top: number; bottom: number }>();
  let counter = 0;
  const original = Element.prototype.getBoundingClientRect;

  Element.prototype.getBoundingClientRect = function (this: Element): DOMRect {
    let m = elTops.get(this);
    if (!m) {
      m = { top: counter * 50, bottom: counter * 50 + 40 };
      counter++;
      elTops.set(this, m);
    }
    return {
      top: m.top,
      bottom: m.bottom,
      left: 0,
      right: 600,
      width: 600,
      height: m.bottom - m.top,
      x: 0,
      y: m.top,
      toJSON: () => ({}),
    } as DOMRect;
  };

  return {
    setRect(el: Element, top: number, height = 30) {
      elTops.set(el, { top, bottom: top + height });
    },
    restore() {
      Element.prototype.getBoundingClientRect = original;
    },
  };
}

describe('walkTemplateDOM', () => {
  let stub: ReturnType<typeof installRectStub>;

  beforeEach(() => {
    stub = installRectStub();
  });
  afterEach(() => {
    stub.restore();
    document.body.innerHTML = '';
  });

  it('emits text chunks in document order with y-offsets', () => {
    const root = document.createElement('div');
    root.setAttribute('data-resume-template', 'true');
    root.innerHTML = `
      <header><h1>Jane Doe</h1><p>jane@example.com</p></header>
      <section data-section="experience">
        <h2>Experience</h2>
        <div><p>Senior Engineer at Acme</p><p>2020 – Present</p></div>
      </section>
      <section data-section="education">
        <h2>Education</h2>
        <div><p>BS Computer Science, MIT</p></div>
      </section>
    `;
    document.body.appendChild(root);

    // Force template root rect to top:0
    stub.setRect(root, 0, 1000);

    const chunks = walkTemplateDOM(root);
    const texts = chunks.map((c) => c.text);

    expect(texts).toContain('Jane Doe');
    expect(texts).toContain('jane@example.com');
    expect(texts).toContain('Experience');
    expect(texts).toContain('Senior Engineer at Acme');
    expect(texts).toContain('Education');
    expect(texts).toContain('BS Computer Science, MIT');

    // Document order is preserved
    const idx = (s: string) => texts.indexOf(s);
    expect(idx('Jane Doe')).toBeLessThan(idx('Experience'));
    expect(idx('Experience')).toBeLessThan(idx('Education'));
  });

  it('skips hidden subtrees', () => {
    const root = document.createElement('div');
    root.setAttribute('data-resume-template', 'true');
    root.innerHTML = `
      <p>Visible</p>
      <p style="display:none">Hidden</p>
    `;
    document.body.appendChild(root);
    stub.setRect(root, 0, 200);

    const texts = walkTemplateDOM(root).map((c) => c.text);
    expect(texts).toContain('Visible');
    expect(texts).not.toContain('Hidden');
  });

  it('reflects DOM-driven visual order even when sections are reordered', () => {
    // Healthcare-style template: Certifications above Experience
    const root = document.createElement('div');
    root.setAttribute('data-resume-template', 'true');
    root.innerHTML = `
      <section data-section="certifications">
        <h2>Certifications</h2>
        <p>RN License – State Board</p>
      </section>
      <section data-section="experience">
        <h2>Experience</h2>
        <p>Charge Nurse at General Hospital</p>
      </section>
    `;
    document.body.appendChild(root);
    stub.setRect(root, 0, 500);

    const texts = walkTemplateDOM(root).map((c) => c.text);
    const certIdx = texts.indexOf('Certifications');
    const expIdx = texts.indexOf('Experience');
    expect(certIdx).toBeGreaterThanOrEqual(0);
    expect(expIdx).toBeGreaterThan(certIdx);
  });
});

describe('chunksForPage', () => {
  it('places each chunk on the page whose strip contains its top edge', () => {
    const chunks = [
      { text: 'A', y: 0, bottom: 50 },
      { text: 'B', y: 100, bottom: 150 },
      { text: 'C', y: 800, bottom: 850 },
      { text: 'D', y: 1600, bottom: 1650 },
    ];
    const breaks = [750, 1500];
    const total = 2000;

    expect(chunksForPage(chunks, 0, breaks, total).map((c) => c.text)).toEqual(['A', 'B']);
    expect(chunksForPage(chunks, 1, breaks, total).map((c) => c.text)).toEqual(['C']);
    expect(chunksForPage(chunks, 2, breaks, total).map((c) => c.text)).toEqual(['D']);
  });

  it('integration: page-2 walker text matches page-2 image slice for a tall multi-page reordered template', () => {
    const stub = installRectStub();
    try {
      const root = document.createElement('div');
      root.setAttribute('data-resume-template', 'true');

      // Healthcare-style: Certifications above Experience.
      // Build a tall template that breaks across 3 pages at y=750 and y=1500.
      root.innerHTML = `
        <header><h1>Jane Doe RN</h1></header>
        <section data-section="certifications">
          <h2>Certifications</h2>
          <p data-id="cert1">RN License</p>
          <p data-id="cert2">BLS Certification</p>
        </section>
        <section data-section="experience">
          <h2>Experience</h2>
          <div data-id="exp1">Charge Nurse at Mercy Hospital, 2018 – Present</div>
          <div data-id="exp2">RN at City Clinic, 2014 – 2018</div>
          <div data-id="exp3">RN Intern at County General, 2013 – 2014</div>
        </section>
        <section data-section="education">
          <h2>Education</h2>
          <p>BSN, State University</p>
        </section>
      `;
      document.body.appendChild(root);

      stub.setRect(root, 0, 2000);
      stub.setRect(root.querySelector('header')!, 0, 60);
      stub.setRect(root.querySelector('header h1')!, 0, 60);
      stub.setRect(root.querySelector('[data-section="certifications"]')!, 100, 200);
      stub.setRect(root.querySelector('[data-section="certifications"] h2')!, 100, 30);
      stub.setRect(root.querySelector('[data-id="cert1"]')!, 140, 30);
      stub.setRect(root.querySelector('[data-id="cert2"]')!, 180, 30);
      stub.setRect(root.querySelector('[data-section="experience"]')!, 350, 1000);
      stub.setRect(root.querySelector('[data-section="experience"] h2')!, 350, 30);
      stub.setRect(root.querySelector('[data-id="exp1"]')!, 400, 200);
      stub.setRect(root.querySelector('[data-id="exp2"]')!, 800, 200);
      stub.setRect(root.querySelector('[data-id="exp3"]')!, 1200, 200);
      stub.setRect(root.querySelector('[data-section="education"]')!, 1600, 100);
      stub.setRect(root.querySelector('[data-section="education"] h2')!, 1600, 30);
      stub.setRect(root.querySelector('[data-section="education"] p')!, 1640, 30);

      const chunks = walkTemplateDOM(root);
      const breaks = [750, 1500];
      const total = 2000;

      const page2 = chunksForPage(chunks, 1, breaks, total);
      const page2Texts = page2.map((c) => c.text);

      // Page 2's image strip covers y in [750, 1500). exp2 (y=800) lives there;
      // exp1 (y=400) is on page 1; exp3 (y=1200) is also on page 2; education (y=1600) is on page 3.
      expect(page2Texts).toContain('RN at City Clinic, 2014 – 2018');
      expect(page2Texts).toContain('RN Intern at County General, 2013 – 2014');
      expect(page2Texts).not.toContain('Charge Nurse at Mercy Hospital, 2018 – Present');
      expect(page2Texts).not.toContain('BSN, State University');
    } finally {
      stub.restore();
      document.body.innerHTML = '';
    }
  });
});

describe('renderDOMTextLayerForPage', () => {
  function makeStubFont() {
    return {
      // Roughly 6pt per character at size 4pt — close enough to exercise wrapping
      widthOfTextAtSize: (text: string, size: number) => text.length * size * 0.6,
      encodeText: () => new Uint8Array(),
    } as any;
  }

  function makeStubPage(opts?: { failDraw?: boolean }) {
    const calls: string[] = [];
    return {
      calls,
      page: {
        drawText: (text: string, _opts: any) => {
          if (opts?.failDraw) throw new Error('encoding failure');
          calls.push(text);
        },
      } as any,
    };
  }

  it('renders all wrapped lines without silently dropping overflow', () => {
    const { page, calls } = makeStubPage();
    const font = makeStubFont();
    const chunks = Array.from({ length: 30 }, (_, i) => ({
      text: `Line ${i} with some content to wrap`,
      y: i * 20,
      bottom: i * 20 + 18,
    }));
    renderDOMTextLayerForPage(page, font, chunks, 612, 792);
    // All input lines should be drawn
    expect(calls.length).toBeGreaterThanOrEqual(30);
  });

  it('throws TextLayerError when content cannot fit at the minimum font size', () => {
    const { page } = makeStubPage();
    const font = makeStubFont();
    // Build a massive payload that cannot fit even at 2.5pt
    const chunks = Array.from({ length: 5000 }, (_, i) => ({
      text: `bullet point number ${i} with a moderate amount of text`,
      y: i * 5,
      bottom: i * 5 + 4,
    }));
    expect(() => renderDOMTextLayerForPage(page, font, chunks, 612, 792)).toThrow(
      TextLayerError,
    );
  });
});
