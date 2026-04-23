import { PDFPage, PDFFont, rgb } from 'pdf-lib';
import type { ResumeData } from '@/types/resume';
import { formatDegreeAndField } from '@/lib/educationFormat';

/**
 * Builds the hidden ATS / Ctrl-F text layer for a rasterised resume PDF.
 *
 * The layer is sourced from the *rendered DOM*, in visual reading order, so
 * templates that reorder sections (Healthcare puts Cert before Experience,
 * Cyber puts Skills before Experience, etc.) serialise the same way the user
 * sees them. Each chunk records the y-offset of its containing block relative
 * to the source element top, so the caller can slice the chunks by the same
 * `smartBreaks` array used to slice the visible image — page N's hidden text
 * is exactly the text that lives in the image strip rendered on page N.
 */

/** A single visual block of text in the rendered template. */
export interface TextChunk {
  /** Collapsed, trimmed text content of the block. */
  text: string;
  /** Top of the block in source-element pixels (relative to template top). */
  y: number;
  /** Bottom of the block in source-element pixels. */
  bottom: number;
}

/** Thrown when the text layer cannot be rendered (overflow, font failure …). */
export class TextLayerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TextLayerError';
  }
}

/**
 * Walks the rendered template DOM in document order and emits one TextChunk
 * per block-level container that contains text.
 *
 * @param sourceElement The same element passed to html2canvas, with its
 *  PDF-capture sizing already applied (so getBoundingClientRect matches the
 *  captured layout).
 */
export function walkTemplateDOM(sourceElement: HTMLElement): TextChunk[] {
  const sourceRect = sourceElement.getBoundingClientRect();

  const isBlockDisplay = (cs: CSSStyleDeclaration): boolean => {
    const d = cs.display;
    if (!d || d === 'inline') return false;
    return (
      d.includes('block') ||
      d.includes('grid') ||
      d.includes('flex') ||
      d === 'list-item' ||
      d === 'table' ||
      d === 'table-row' ||
      d === 'table-cell' ||
      d === 'table-caption'
    );
  };

  const findBlockAncestor = (el: Element): Element => {
    let cur: Element | null = el;
    while (cur && cur !== sourceElement) {
      try {
        const cs = window.getComputedStyle(cur);
        if (isBlockDisplay(cs)) return cur;
      } catch {
        // getComputedStyle can throw in detached jsdom trees — fall through
      }
      cur = cur.parentElement;
    }
    return sourceElement;
  };

  const isVisible = (el: Element): boolean => {
    try {
      const cs = window.getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      // Treat opacity 0 as hidden — used by some accessibility helpers
      const op = parseFloat(cs.opacity || '1');
      if (!Number.isNaN(op) && op === 0) return false;
    } catch {
      // ignore
    }
    return true;
  };

  const walker = document.createTreeWalker(
    sourceElement,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node: Node) {
        const text = (node.nodeValue || '').replace(/\s+/g, ' ').trim();
        if (!text) return NodeFilter.FILTER_REJECT;
        const parent = (node as Text).parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName;
        if (tag === 'STYLE' || tag === 'SCRIPT' || tag === 'NOSCRIPT') {
          return NodeFilter.FILTER_REJECT;
        }
        // Walk up checking visibility — any hidden ancestor disqualifies
        let cur: Element | null = parent;
        while (cur && cur !== sourceElement) {
          if (!isVisible(cur)) return NodeFilter.FILTER_REJECT;
          cur = cur.parentElement;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    },
  );

  const chunks: TextChunk[] = [];
  let node: Node | null;
  let lastBlock: Element | null = null;
  let buffer: string[] = [];
  let bufferTop = 0;
  let bufferBottom = 0;

  const flush = () => {
    if (!buffer.length) return;
    const text = buffer.join(' ').replace(/\s+/g, ' ').trim();
    if (text) chunks.push({ text, y: bufferTop, bottom: bufferBottom });
    buffer = [];
  };

  while ((node = walker.nextNode())) {
    const text = (node.nodeValue || '').replace(/\s+/g, ' ').trim();
    if (!text) continue;
    const parent = (node as Text).parentElement!;
    const block = findBlockAncestor(parent);
    if (block !== lastBlock) {
      flush();
      lastBlock = block;
      const r = block.getBoundingClientRect();
      bufferTop = r.top - sourceRect.top;
      bufferBottom = r.bottom - sourceRect.top;
    }
    buffer.push(text);
  }
  flush();

  return chunks;
}

/**
 * Slices walker output for a given page using smart-break y-offsets.
 *
 * @param chunks Walker output for the whole template.
 * @param pageNum Zero-based page index.
 * @param smartBreaks The same break array used to slice the visible image —
 *  break[i] is the y-offset where page i ends and page i+1 begins.
 * @param totalHeight The full template content height in source pixels.
 */
export function chunksForPage(
  chunks: TextChunk[],
  pageNum: number,
  smartBreaks: number[],
  totalHeight: number,
): TextChunk[] {
  const start = pageNum === 0 ? 0 : smartBreaks[pageNum - 1];
  const end =
    pageNum >= smartBreaks.length ? totalHeight : smartBreaks[pageNum];
  // A chunk belongs to the page whose strip contains its top edge. This
  // matches the visible image: the row of pixels at the top of the block
  // determines which page the block "starts" on.
  return chunks.filter((c) => c.y >= start && c.y < end);
}

/**
 * Word-wraps a single text string to fit within maxWidth.
 * Returns an array of lines preserving the full content — no truncation.
 */
function wrapChunkText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    let testWidth: number;
    try {
      testWidth = font.widthOfTextAtSize(test, fontSize);
    } catch {
      testWidth = maxWidth + 1;
    }
    if (testWidth > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Renders the hidden text layer for one page of a multi-page PDF.
 *
 * When page coordinate info is provided (pageStart, globalScaleFactor,
 * footerReservedPt), each chunk is word-wrapped and drawn at its correct
 * vertical position using white text — invisible on the white background but
 * fully present for ATS scanners and Ctrl+F / copy-paste in PDF readers.
 * Text is never truncated; multi-line chunks occupy successive lines below
 * the chunk's visual top, bounded by both chunk.bottom and the footer zone.
 *
 * Falls back to the legacy pack-at-top approach when coordinate info is absent.
 *
 * Throws TextLayerError only on the legacy fallback path — the positioned
 * path is best-effort per chunk so a single draw failure never aborts the export.
 */
export function renderDOMTextLayerForPage(
  page: PDFPage,
  font: PDFFont,
  chunks: TextChunk[],
  pageWidth: number,
  pageHeight: number,
  pageStart?: number,
  globalScaleFactor?: number,
  footerReservedPt?: number,
): void {
  if (chunks.length === 0) return;

  const hasCoords =
    pageStart !== undefined &&
    globalScaleFactor !== undefined &&
    globalScaleFactor > 0;

  if (!hasCoords) {
    const lines = chunks.map((c) => c.text).filter((s) => s.trim().length > 0);
    if (lines.length === 0) return;
    renderTextLines(page, font, lines, pageWidth, pageHeight);
    return;
  }

  const margin = 8;
  const fontSize = 8;
  const lineHeight = fontSize + 2;
  const maxWidth = pageWidth - margin * 2;
  const safeBottom = (footerReservedPt ?? 44) + 4;
  const whiteColor = rgb(1, 1, 1);
  const sf = globalScaleFactor!;
  const ps = pageStart!;

  for (const chunk of chunks) {
    const text = chunk.text.trim();
    if (!text) continue;

    const chunkTopY    = pageHeight - (chunk.y      - ps) * sf;
    const chunkBottomY = pageHeight - (chunk.bottom - ps) * sf;

    const startY = chunkTopY - fontSize;
    if (startY < safeBottom || startY > pageHeight - 2) continue;

    const lines = wrapChunkText(text, font, fontSize, maxWidth);

    for (let li = 0; li < lines.length; li++) {
      const lineY = startY - li * lineHeight;
      if (lineY < safeBottom || lineY < chunkBottomY) break;

      try {
        page.drawText(lines[li], {
          x: margin,
          y: lineY,
          size: fontSize,
          font,
          color: whiteColor,
          opacity: 1,
        });
      } catch {
        // Best-effort — skip this line, continue with remaining chunks
      }
    }
  }
}

/**
 * Renders an invisible text layer for a specific page using a flat list
 * of input strings. Distributes evenly across pages as a fallback for
 * callers that have not yet adopted the DOM-driven path.
 *
 * @deprecated Prefer walkTemplateDOM + chunksForPage + renderDOMTextLayerForPage.
 */
export function renderTextLayerForPage(
  page: PDFPage,
  font: PDFFont,
  textLines: string[],
  pageNum: number,
  totalPages: number,
  pageWidth: number,
  pageHeight: number,
): void {
  const linesPerPage = Math.ceil(textLines.length / totalPages);
  const startLine = pageNum * linesPerPage;
  const endLine = Math.min(startLine + linesPerPage, textLines.length);
  const pageLines = textLines.slice(startLine, endLine);
  if (pageLines.length === 0) return;
  renderTextLines(page, font, pageLines, pageWidth, pageHeight);
}

/**
 * @deprecated Use renderDOMTextLayerForPage.
 * Renders ALL text on a single page (causes duplication on multi-page PDFs).
 */
export function renderTextLayer(
  page: PDFPage,
  font: PDFFont,
  textLines: string[],
  pageWidth: number,
  pageHeight: number,
): void {
  renderTextLines(page, font, textLines, pageWidth, pageHeight);
}

/**
 * Wrap-then-fit renderer.
 *
 * Steps:
 *  1. Wrap every input line at the page's max width using the current font.
 *  2. Count the wrapped-line budget; if it overflows the page height,
 *     shrink fontSize / lineHeight and rewrap.
 *  3. If the minimum fontSize still overflows, throw — the caller must
 *     surface this rather than ship a silently-truncated PDF.
 */
function renderTextLines(
  page: PDFPage,
  font: PDFFont,
  textLines: string[],
  pageWidth: number,
  pageHeight: number,
): void {
  const margin = 10;
  const maxWidth = pageWidth - margin * 2;
  const availableHeight = pageHeight - margin * 2;

  const wrapAll = (size: number): string[] => {
    const out: string[] = [];
    for (const line of textLines) {
      if (!line || !line.trim()) continue;
      const words = line.split(/\s+/);
      let current = '';
      for (const word of words) {
        const test = current ? `${current} ${word}` : word;
        let width: number;
        try {
          width = font.widthOfTextAtSize(test, size);
        } catch (err) {
          // Font cannot measure this run — refuse to silently undercount.
          throw new TextLayerError(
            `Hidden text layer failed to measure "${test.slice(0, 40)}…" at ${size}pt: ` +
              `${(err as Error).message}`,
          );
        }
        if (width > maxWidth && current) {
          out.push(current);
          current = word;
        } else {
          current = test;
        }
      }
      if (current) out.push(current);
    }
    return out;
  };

  // Try sizes from the comfortable default down to the legibility floor.
  // Below ~2.5pt characters can't be reliably parsed by ATS OCR, but at
  // 2.5pt + 3.1pt line-height we fit ~245 wrapped lines on a Letter page,
  // which covers any realistic single-page resume content.
  const candidates: { size: number; lineHeight: number }[] = [
    { size: 4, lineHeight: 5 },
    { size: 3.5, lineHeight: 4.4 },
    { size: 3, lineHeight: 3.8 },
    { size: 2.75, lineHeight: 3.4 },
    { size: 2.5, lineHeight: 3.1 },
  ];

  let chosen: { size: number; lineHeight: number } | null = null;
  let wrapped: string[] = [];
  for (const cand of candidates) {
    const w = wrapAll(cand.size);
    if (w.length * cand.lineHeight <= availableHeight) {
      chosen = cand;
      wrapped = w;
      break;
    }
  }

  if (!chosen) {
    const wAtMin = wrapAll(candidates[candidates.length - 1].size);
    throw new TextLayerError(
      `Hidden text layer cannot fit on page: ${wAtMin.length} wrapped lines ` +
        `exceed available height ${availableHeight}pt at minimum font size ` +
        `${candidates[candidates.length - 1].size}pt. Reduce content or ` +
        `split this section across more pages.`,
    );
  }

  let y = pageHeight - margin;
  const transparentColor = rgb(0, 0, 0);

  for (const line of wrapped) {
    if (y < margin) {
      throw new TextLayerError(
        `Hidden text layer overflowed page after fit (line "${line.slice(0, 40)}…")`,
      );
    }
    try {
      page.drawText(line, {
        x: margin,
        y,
        size: chosen.size,
        font,
        color: transparentColor,
        opacity: 0.01,
      });
    } catch (err) {
      // Any draw failure (encoding, font, pdf-lib state) aborts the export.
      // Silent skipping would ship an ATS-degraded PDF the user cannot see.
      throw new TextLayerError(
        `Hidden text layer failed to draw "${line.slice(0, 40)}…": ` +
          `${(err as Error).message}`,
      );
    }
    y -= chosen.lineHeight;
  }
}

/**
 * Legacy data-order text extractor.
 *
 * Retained for callers that don't yet have access to a rendered DOM (e.g.
 * server-side previews) and as a deterministic fallback when the walker
 * returns nothing. Prefer walkTemplateDOM for any path that has access
 * to the rendered template.
 */
export function extractResumeText(resume: ResumeData): string[] {
  const lines: string[] = [];

  if (resume.contactInfo.fullName) lines.push(resume.contactInfo.fullName);
  const contactParts = [
    resume.contactInfo.email,
    resume.contactInfo.email2,
    resume.contactInfo.phone,
    resume.contactInfo.location,
    resume.contactInfo.linkedin,
    resume.contactInfo.github,
    resume.contactInfo.portfolio,
  ].filter(Boolean) as string[];
  if (contactParts.length) lines.push(contactParts.join(' | '));

  if (resume.summary) {
    lines.push('Summary');
    lines.push(resume.summary);
  }

  if (resume.experience?.length) {
    lines.push('Experience');
    for (const exp of resume.experience) {
      lines.push(`${exp.position} at ${exp.company}`);
      if (exp.account) lines.push(`Account: ${exp.account}`);
      const dates = [exp.startDate, exp.current ? 'Present' : exp.endDate]
        .filter(Boolean)
        .join(' – ');
      if (dates) lines.push(dates);
      if (exp.description) lines.push(exp.description);
      exp.achievements?.forEach((a) => {
        if (a) lines.push(a);
      });
      exp.responsibilities?.forEach((r) => {
        if (r) lines.push(r);
      });
    }
  }

  if (resume.education?.length) {
    lines.push('Education');
    for (const edu of resume.education) {
      lines.push(formatDegreeAndField(edu.degree, edu.field));
      lines.push(edu.institution);
      const dates = [edu.startDate, edu.endDate].filter(Boolean).join(' – ');
      if (dates) lines.push(dates);
      if (edu.gpa) lines.push(`GPA: ${edu.gpa}`);
      if (edu.description) lines.push(edu.description);
    }
  }

  if (resume.skills?.length) {
    lines.push('Skills');
    lines.push(resume.skills.join(', '));
  }

  if (resume.certifications?.length) {
    lines.push('Certifications');
    for (const cert of resume.certifications) {
      lines.push(`${cert.name} – ${cert.issuer}`);
      if (cert.date) lines.push(cert.date);
      if (cert.credentialId) lines.push(`Credential: ${cert.credentialId}`);
    }
  }

  if (resume.awards?.length) {
    lines.push('Awards');
    for (const award of resume.awards) {
      lines.push(`${award.title} – ${award.issuer}`);
      if (award.date) lines.push(award.date);
      if (award.description) lines.push(award.description);
    }
  }

  if (resume.projects?.length) {
    lines.push('Projects');
    for (const proj of resume.projects) {
      lines.push(proj.name);
      if (proj.role) lines.push(proj.role);
      if (proj.technologies?.length) lines.push(proj.technologies.join(', '));
      if (proj.description) lines.push(proj.description);
      if (proj.url) lines.push(proj.url);
    }
  }

  if (resume.publications?.length) {
    lines.push('Publications');
    for (const pub of resume.publications) {
      lines.push(`${pub.title} – ${pub.publisher}`);
      if (pub.date) lines.push(pub.date);
      if (pub.coAuthors) lines.push(pub.coAuthors);
      if (pub.description) lines.push(pub.description);
    }
  }

  if (resume.volunteering?.length) {
    lines.push('Volunteering');
    for (const vol of resume.volunteering) {
      lines.push(`${vol.role} at ${vol.organization}`);
      const dates = [vol.startDate, vol.endDate].filter(Boolean).join(' – ');
      if (dates) lines.push(dates);
      if (vol.description) lines.push(vol.description);
    }
  }

  if (resume.languages?.length) {
    lines.push('Languages');
    lines.push(
      resume.languages.map((l) => `${l.name} (${l.proficiency})`).join(', '),
    );
  }

  const visibleHobbies = resume.hobbies?.filter((h) => h.visible);
  if (visibleHobbies?.length) {
    lines.push('Hobbies');
    lines.push(visibleHobbies.map((h) => h.name).join(', '));
  }

  if (resume.references?.length) {
    lines.push('References');
    for (const ref of resume.references) {
      if (ref.availableOnRequest) {
        lines.push('Available on request');
      } else {
        lines.push(`${ref.name}, ${ref.title} at ${ref.company}`);
        const contact = [ref.email, ref.phone].filter(Boolean).join(' | ');
        if (contact) lines.push(contact);
      }
    }
  }

  return lines;
}
