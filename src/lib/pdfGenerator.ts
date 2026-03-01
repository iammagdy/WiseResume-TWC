import { captureWithRetry } from '@/lib/html2canvasRetry';
import { PDFDocument, StandardFonts, rgb, PDFFont } from 'pdf-lib';
import { ResumeData, TemplateId, ContactInfo, PDFOptions, SectionId } from '@/types/resume';
import { TemplateConfig, getTemplateConfig } from '@/lib/templateConfig';
import { PAGE_FORMAT_PX, generateCustomizationCSS } from '@/lib/templateCustomization';
import type { OnProgressCallback } from '@/hooks/useExportProgress';

/** Typed error class for programmatic handling of PDF generation failures. */
export class PdfGenerationError extends Error {
  code: 'EMPTY_CANVAS' | 'MISSING_ELEMENT' | 'CAPTURE_FAILED' | 'UNKNOWN';
  constructor(message: string, code: PdfGenerationError['code'] = 'UNKNOWN') {
    super(message);
    this.name = 'PdfGenerationError';
    this.code = code;
  }
}

// PDF dimensions defaults (Letter size in points)
const DEFAULT_PAGE_WIDTH = 612;
const DEFAULT_PAGE_HEIGHT = 792;
const FOOTER_RESERVED_PT = 44; // Space for page numbers + branding
const SCALE = 2; // Higher scale for better quality
const MARGIN = 72; // 1 inch margins for cover letter

/**
 * Resolves page dimensions from resume customization, defaulting to Letter.
 */
function getPageDimensions(resume?: ResumeData): { pageWidth: number; pageHeight: number; printableHeight: number } {
  const format = resume?.customization?.pageFormat || 'letter';
  const dims = PAGE_FORMAT_PX[format] || PAGE_FORMAT_PX['letter'];
  const pageWidth = dims?.width || DEFAULT_PAGE_WIDTH;
  const pageHeight = dims?.height || DEFAULT_PAGE_HEIGHT;
  return { pageWidth, pageHeight, printableHeight: pageHeight - FOOTER_RESERVED_PT };
}

interface ContentBlock {
  top: number;
  bottom: number;
  sectionId?: string; // For section blocks
  isHeader?: boolean; // For orphan protection synthetic blocks
}

interface SectionInfo {
  id: SectionId;
  top: number;
  bottom: number;
  element: HTMLElement;
}

/**
 * Gets element's top position relative to container using layout-based offsets.
 * Transform-agnostic - not affected by CSS transforms/animations.
 */
function getRelativeTop(element: HTMLElement, container: HTMLElement): number {
  let top = 0;
  let curr: HTMLElement | null = element;
  
  while (curr && curr !== container && container.contains(curr)) {
    top += curr.offsetTop;
    curr = curr.offsetParent as HTMLElement | null;
  }
  
  return top;
}

/**
 * Gets element bounds relative to container using layout offsets.
 * Includes margins for accurate layout-aware measurements.
 */
function getBlockBounds(element: HTMLElement, container: HTMLElement): ContentBlock {
  const top = getRelativeTop(element, container);
  const style = window.getComputedStyle(element);
  const marginTop = parseFloat(style.marginTop) || 0;
  const marginBottom = parseFloat(style.marginBottom) || 0;
  
  return {
    top: top - marginTop,
    bottom: top + element.offsetHeight + marginBottom
  };
}

/**
 * Gets section bounds with margin-aware measurements.
 */
function getSectionBounds(element: HTMLElement, container: HTMLElement): ContentBlock {
  const top = getRelativeTop(element, container);
  const style = window.getComputedStyle(element);
  const marginTop = parseFloat(style.marginTop) || 0;
  const marginBottom = parseFloat(style.marginBottom) || 0;
  
  return {
    top: top - marginTop,
    bottom: top + element.offsetHeight + marginBottom,
    sectionId: element.getAttribute('data-section') || undefined
  };
}

/**
 * Scans the DOM for all sections and flow blocks (content that shouldn't be cut).
 * Returns sections in their actual DOM order.
 */
function scanLayoutBlocks(sourceElement: HTMLElement): {
  sections: SectionInfo[];
  flowBlocks: ContentBlock[];
} {
  // Get all sections in DOM order
  const sectionElements = sourceElement.querySelectorAll('[data-section]');
  const sections: SectionInfo[] = [];
  
  sectionElements.forEach(el => {
    const htmlEl = el as HTMLElement;
    const bounds = getSectionBounds(htmlEl, sourceElement);
    sections.push({
      id: htmlEl.getAttribute('data-section') as SectionId,
      top: bounds.top,
      bottom: bounds.bottom,
      element: htmlEl
    });
  });
  
  // Get all flow blocks (sections + break-avoid elements)
  const flowBlocks: ContentBlock[] = [];
  
  // Add all sections as flow blocks
  sections.forEach(section => {
    flowBlocks.push({
      top: section.top,
      bottom: section.bottom,
      sectionId: section.id
    });
  });
  
  // Add all break-avoid blocks
  const breakAvoidElements = sourceElement.querySelectorAll('[data-break-avoid]');
  breakAvoidElements.forEach(el => {
    const htmlEl = el as HTMLElement;
    flowBlocks.push(getBlockBounds(htmlEl, sourceElement));
  });
  
  return { sections, flowBlocks };
}

/**
 * Creates synthetic "keep-with-next" blocks to prevent section header orphaning.
 * Combines section header with first content item into single unbreakable unit.
 */
function createHeaderProtectionBlocks(sourceElement: HTMLElement, sections: SectionInfo[]): ContentBlock[] {
  const protectedBlocks: ContentBlock[] = [];
  
  sections.forEach(section => {
    // Find the header element (first h2 or h3 inside the section)
    const header = section.element.querySelector('h2, h3') as HTMLElement | null;
    if (!header) return;
    
    // Find the first content element after the header
    const firstContent = section.element.querySelector('[data-break-avoid]') as HTMLElement | null;
    const firstMeaningfulChild = section.element.querySelector('p, ul, div:not(:first-child)') as HTMLElement | null;
    
    const contentElement = firstContent || firstMeaningfulChild;
    if (!contentElement) return;
    
    // Create a synthetic block that spans from header to first content end
    const headerBounds = getBlockBounds(header, sourceElement);
    const contentBounds = getBlockBounds(contentElement, sourceElement);
    
    protectedBlocks.push({
      top: headerBounds.top,
      bottom: contentBounds.bottom,
      isHeader: true
    });
  });
  
  return protectedBlocks;
}

/**
 * Finds child element boundaries within an oversized block for sub-block breaking.
 * Returns sorted array of top positions (relative to container) where a break is safe.
 */
function findChildBreakPoints(
  sourceElement: HTMLElement,
  blockTop: number,
  blockBottom: number
): number[] {
  // Query elements marked as break-child, or common block children
  const candidates = sourceElement.querySelectorAll(
    '[data-break-child], [data-break-avoid] > p, [data-break-avoid] > div, [data-break-avoid] > ul, [data-break-avoid] > li, [data-break-avoid] > h3, [data-break-avoid] > h4'
  );
  
  const points: number[] = [];
  
  candidates.forEach(el => {
    const htmlEl = el as HTMLElement;
    const top = getRelativeTop(htmlEl, sourceElement);
    // Only include points within the oversized block's range
    if (top > blockTop + 20 && top < blockBottom - 20) {
      points.push(top);
    }
  });
  
  // Deduplicate and sort
  return [...new Set(points)].sort((a, b) => a - b);
}

/**
 * Computes auto breaks within a segment, avoiding cutting blocks.
 * STRICT MODE: Never split a data-break-avoid block that can fit on a page.
 * For oversized blocks, breaks at child element boundaries instead of arbitrary positions.
 */
function computeAutoBreaksInSegment(
  segmentStart: number,
  segmentEnd: number,
  sourceHeightPerPage: number,
  blocks: ContentBlock[],
  sourceElement?: HTMLElement
): number[] {
  const breaks: number[] = [];
  let currentPos = segmentStart;
  
  while (currentPos + sourceHeightPerPage < segmentEnd) {
    const naturalBreak = currentPos + sourceHeightPerPage;
    
    // Find block being cut by this break
    const cuttingBlock = blocks.find(
      b => b.top < naturalBreak && b.bottom > naturalBreak && b.top >= currentPos
    );
    
    if (cuttingBlock) {
      const blockHeight = cuttingBlock.bottom - cuttingBlock.top;
      
      // STRICT: If block fits on a single page, NEVER split it - always move to next page
      if (blockHeight <= sourceHeightPerPage) {
        // Break before the block - move it entirely to next page
        const breakBefore = cuttingBlock.top - 8;
        
        // Ensure we don't create empty pages
        const minPageContent = sourceHeightPerPage * 0.10;
        if (breakBefore - currentPos >= minPageContent) {
          breaks.push(breakBefore);
          currentPos = breakBefore;
          continue;
        }
      }
      
      // Block is too large to fit on a single page - try to find child boundaries
      if (sourceElement) {
        const childBreaks = findChildBreakPoints(sourceElement, cuttingBlock.top, cuttingBlock.bottom);
        // Find the child boundary closest to but before naturalBreak
        const bestChild = childBreaks.reverse().find(bp => bp <= naturalBreak && bp > currentPos + sourceHeightPerPage * 0.15);
        if (bestChild) {
          breaks.push(bestChild - 4); // Small padding before child
          currentPos = bestChild - 4;
          continue;
        }
      }
      
      // Fallback: use the original logic to minimize waste
      const breakBefore = cuttingBlock.top - 8;
      const wastedSpaceBefore = naturalBreak - breakBefore;
      
      const breakAfter = cuttingBlock.bottom + 8;
      const extraContentAfter = breakAfter - naturalBreak;
      
      const maxWaste = sourceHeightPerPage * 0.35;
      const minPageContent = sourceHeightPerPage * 0.15;
      
      if (wastedSpaceBefore <= extraContentAfter && wastedSpaceBefore < maxWaste) {
        if (breakBefore - currentPos >= minPageContent) {
          breaks.push(breakBefore);
          currentPos = breakBefore;
        } else if (breakAfter < segmentEnd) {
          breaks.push(breakAfter);
          currentPos = breakAfter;
        } else {
          break;
        }
      } else if (extraContentAfter < maxWaste && breakAfter < segmentEnd) {
        breaks.push(breakAfter);
        currentPos = breakAfter;
      } else {
        // Must cut through oversized block — force break at max allowed height
        const maxSegment = sourceHeightPerPage * 1.2;
        const forceBreak = currentPos + maxSegment;
        breaks.push(Math.min(forceBreak, naturalBreak));
        currentPos = Math.min(forceBreak, naturalBreak);
      }
    } else {
      breaks.push(naturalBreak);
      currentPos = naturalBreak;
    }
  }
  
  return breaks;
}

/**
 * Finds smart page break positions that avoid cutting through content blocks.
 * Supports both automatic detection and manual section-based breaks.
 * Uses transform-agnostic layout measurements for consistency.
 * 
 * LAYOUT-AWARE: For manual breaks, calculates safe Y-position that doesn't
 * slice through parallel columns in multi-column layouts.
 * 
 * TEMPLATE-AWARE: For fixed-sidebar templates, returns empty array (no breaks).
 * For linear-grid templates, treats grid sections as unbreakable units.
 */
export function findSmartBreakPositions(
  sourceElement: HTMLElement,
  sourceHeightPerPage: number,
  totalHeight: number,
  manualBreakSections?: string[],
  templateConfig?: TemplateConfig
): number[] {
  // Note: fixed-sidebar layout type is no longer used by any template
  
  // Scan DOM for all sections and flow blocks
  const { sections, flowBlocks } = scanLayoutBlocks(sourceElement);
  
  // Add section header protection blocks
  const headerBlocks = createHeaderProtectionBlocks(sourceElement, sections);
  
  // Combine all blocks for break avoidance
  const allBlocks: ContentBlock[] = [...flowBlocks, ...headerBlocks];
  
  // For linear-grid templates (Executive), mark grid sections as unbreakable
  if (templateConfig?.layout === 'linear-grid') {
    // Find sections that are NOT in the breakable list - these are grid sections
    const breakableSectionIds = templateConfig.breakableSections;
    sections.forEach(section => {
      if (!breakableSectionIds.includes(section.id)) {
        // This section is part of the grid - mark entire grid area as unbreakable
        // Find all grid sibling sections and create a mega-block
        const gridSections = sections.filter(s => !breakableSectionIds.includes(s.id));
        if (gridSections.length > 0) {
          const gridTop = Math.min(...gridSections.map(s => s.top));
          const gridBottom = Math.max(...gridSections.map(s => s.bottom));
          allBlocks.push({
            top: gridTop,
            bottom: gridBottom,
            sectionId: 'grid-block'
          });
        }
      }
    });
  }
  
  // Sort blocks by top position
  allBlocks.sort((a, b) => a.top - b.top);

  // If manual sections specified, use hybrid mode with layout-aware breaks
  if (manualBreakSections && manualBreakSections.length > 0) {
    // Filter manual sections to only those allowed by template config
    const allowedSections = templateConfig?.breakableSections || manualBreakSections;
    const validManualSections = manualBreakSections.filter(s => 
      allowedSections.includes(s as SectionId)
    );
    
    // Get forced break positions from manual sections
    const forcedBreaks: number[] = [];
    
    validManualSections.forEach(sectionId => {
      const targetSection = sections.find(s => s.id === sectionId);
      if (!targetSection) return;
      
      // Use exact section bottom — all templates are now linear, no parallel columns
      forcedBreaks.push(targetSection.bottom + 4);
    });
    
    // Sort and filter forced breaks
    const sortedForcedBreaks = forcedBreaks
      .filter(b => b < totalHeight && b > 0)
      .sort((a, b) => a - b);
    
    // Build segments between forced breaks
    const allBreaks: number[] = [];
    let segmentStart = 0;
    
    for (const forcedBreak of sortedForcedBreaks) {
      // Add auto breaks within this segment
      const autoBreaks = computeAutoBreaksInSegment(
        segmentStart,
        forcedBreak,
        sourceHeightPerPage,
        allBlocks,
        sourceElement
      );
      allBreaks.push(...autoBreaks);
      
      // Add the forced break itself
      allBreaks.push(forcedBreak);
      segmentStart = forcedBreak;
    }
    
    // Handle remaining content after last forced break
    if (segmentStart < totalHeight) {
      const autoBreaks = computeAutoBreaksInSegment(
        segmentStart,
        totalHeight,
        sourceHeightPerPage,
        allBlocks,
        sourceElement
      );
      allBreaks.push(...autoBreaks);
    }
    
    // Remove duplicates and sort
    return [...new Set(allBreaks)]
      .filter(b => b < totalHeight && b > 0)
      .sort((a, b) => a - b);
  }

  // Pure auto mode - compute breaks for entire document using all blocks
  return computeAutoBreaksInSegment(0, totalHeight, sourceHeightPerPage, allBlocks, sourceElement);
}

/** Tagged break position for UI differentiation */
export interface TaggedBreakPosition {
  position: number;
  type: 'manual' | 'auto';
}

/**
 * Returns break positions tagged as 'manual' (user-chosen) or 'auto' (system-generated).
 * Used by PageBreakIndicator to visually distinguish forced vs auto-fill breaks.
 */
export function findSmartBreakPositionsTagged(
  sourceElement: HTMLElement,
  sourceHeightPerPage: number,
  totalHeight: number,
  manualBreakSections?: string[],
  templateConfig?: TemplateConfig
): TaggedBreakPosition[] {
  // Note: fixed-sidebar layout type is no longer used by any template

  const { sections, flowBlocks } = scanLayoutBlocks(sourceElement);
  const headerBlocks = createHeaderProtectionBlocks(sourceElement, sections);
  const allBlocks: ContentBlock[] = [...flowBlocks, ...headerBlocks];

  if (templateConfig?.layout === 'linear-grid') {
    const breakableSectionIds = templateConfig.breakableSections;
    sections.forEach(section => {
      if (!breakableSectionIds.includes(section.id)) {
        const gridSections = sections.filter(s => !breakableSectionIds.includes(s.id));
        if (gridSections.length > 0) {
          allBlocks.push({
            top: Math.min(...gridSections.map(s => s.top)),
            bottom: Math.max(...gridSections.map(s => s.bottom)),
            sectionId: 'grid-block'
          });
        }
      }
    });
  }

  allBlocks.sort((a, b) => a.top - b.top);

  if (manualBreakSections && manualBreakSections.length > 0) {
    const allowedSections = templateConfig?.breakableSections || manualBreakSections;
    const validManualSections = manualBreakSections.filter(s =>
      allowedSections.includes(s as SectionId)
    );

    const forcedBreakSet = new Set<number>();
    const forcedBreaks: number[] = [];

    validManualSections.forEach(sectionId => {
      const targetSection = sections.find(s => s.id === sectionId);
      if (!targetSection) return;
      // Use exact section bottom — all templates are now linear
      const pos = targetSection.bottom + 4;
      forcedBreaks.push(pos);
      forcedBreakSet.add(pos);
    });

    const sortedForcedBreaks = forcedBreaks
      .filter(b => b < totalHeight && b > 0)
      .sort((a, b) => a - b);

    const tagged: TaggedBreakPosition[] = [];
    let segmentStart = 0;

    for (const fb of sortedForcedBreaks) {
      const autoBreaks = computeAutoBreaksInSegment(segmentStart, fb, sourceHeightPerPage, allBlocks, sourceElement);
      autoBreaks.forEach(b => tagged.push({ position: b, type: 'auto' }));
      tagged.push({ position: fb, type: 'manual' });
      segmentStart = fb;
    }

    if (segmentStart < totalHeight) {
      const autoBreaks = computeAutoBreaksInSegment(segmentStart, totalHeight, sourceHeightPerPage, allBlocks, sourceElement);
      autoBreaks.forEach(b => tagged.push({ position: b, type: 'auto' }));
    }

    // Deduplicate by position, preferring 'manual'
    const posMap = new Map<number, TaggedBreakPosition>();
    tagged.forEach(t => {
      if (t.position > 0 && t.position < totalHeight) {
        const existing = posMap.get(t.position);
        if (!existing || t.type === 'manual') posMap.set(t.position, t);
      }
    });

    return [...posMap.values()].sort((a, b) => a.position - b.position);
  }

  // Pure auto mode
  return computeAutoBreaksInSegment(0, totalHeight, sourceHeightPerPage, allBlocks, sourceElement)
    .map(b => ({ position: b, type: 'auto' as const }));
}

/**
 * Estimates the number of pages for a resume based on content and break settings.
 * Useful for UI display and single-page detection.
 */
export function estimatePageCount(
  sourceElement: HTMLElement,
  manualBreakSections?: string[],
  templateConfig?: TemplateConfig
): number {
  // For fixed-sidebar templates, always return 1
  if (templateConfig?.layout === 'fixed-sidebar') {
    return 1;
  }
  
  const { sourceHeightPerPage, totalHeight } = calculatePDFDimensions(sourceElement);
  
  // Single-page check with 5% buffer
  if (totalHeight <= sourceHeightPerPage * 1.05 && !manualBreakSections?.length) {
    return 1;
  }
  
  // Calculate breaks to determine page count
  const breaks = findSmartBreakPositions(
    sourceElement,
    sourceHeightPerPage,
    totalHeight,
    manualBreakSections,
    templateConfig
  );
  
  return breaks.length + 1;
}

/**
 * Gets sections in their actual DOM order (for UI ordering).
 * Returns section IDs based on visual layout position.
 */
export function getSectionsInDOMOrder(sourceElement: HTMLElement): SectionId[] {
  const { sections } = scanLayoutBlocks(sourceElement);
  
  // Sort by top position (visual order)
  sections.sort((a, b) => a.top - b.top);
  
  return sections.map(s => s.id);
}

/**
 * Wraps text to fit within a maximum width, returning an array of lines.
 */
function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
): string[] {
  const paragraphs = text.split('\n');
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    if (paragraph.trim() === '') {
      lines.push(''); // Preserve empty lines for paragraph breaks
      continue;
    }

    const words = paragraph.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);

      if (width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) lines.push(currentLine);
  }

  return lines;
}

/**
 * Adds page footer with page numbers and optional branding badge.
 */
async function addPageFooter(
  pdfDoc: PDFDocument,
  options: PDFOptions = {},
  pageWidth: number = DEFAULT_PAGE_WIDTH
): Promise<void> {
  const { 
    showPageNumbers = true, 
    pageNumberFormat = 'full',
    showBranding = true 
  } = options;
  
  // Skip if nothing to render
  if (!showPageNumbers && !showBranding) return;

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const numPages = pages.length;

  for (let i = 0; i < numPages; i++) {
    const page = pages[i];
    
    // Page numbers (positioned higher to make room for branding)
    if (showPageNumbers) {
      const pageText = pageNumberFormat === 'simple' 
        ? `${i + 1}` 
        : `Page ${i + 1} of ${numPages}`;
      const textWidth = font.widthOfTextAtSize(pageText, 9);

      page.drawText(pageText, {
        x: (pageWidth - textWidth) / 2,
        y: showBranding ? 28 : 20, // Move up if branding shown
        size: 9,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
    }
    
    // Professional branding badge
    if (showBranding) {
      const brandingText = '• Created with WiseResume · part of WiseUniverse';
      const brandingWidth = font.widthOfTextAtSize(brandingText, 7);

      page.drawText(brandingText, {
        x: (pageWidth - brandingWidth) / 2,
        y: 12,
        size: 7,
        font,
        color: rgb(0.55, 0.55, 0.55), // Lighter than page number
      });
    }
  }
}

/**
 * Prepares the resume element for PDF capture on mobile/iOS.
 * Forces exact 612px width, removes CSS transforms, ensures all content visible.
 * Returns a cleanup function to restore original styles.
 */
function prepareForCapture(sourceElement: HTMLElement, pageWidth: number = DEFAULT_PAGE_WIDTH): () => void {
  const originalStyles = {
    width: sourceElement.style.width,
    maxWidth: sourceElement.style.maxWidth,
    transform: sourceElement.style.transform,
    minHeight: sourceElement.style.minHeight,
  };

  // Inject customization CSS for PDF capture
  const customizationStyle = document.createElement('style');
  customizationStyle.setAttribute('data-pdf-customization', 'true');
  const resumeData = (sourceElement as any).__resumeData as import('@/types/resume').ResumeData | undefined;
  // Try to find customization from the style tag already in the element
  const existingStyle = sourceElement.querySelector('style');
  if (existingStyle) {
    customizationStyle.textContent = existingStyle.textContent;
  }
  sourceElement.appendChild(customizationStyle);

  // Force exact PDF-width layout (prevents mobile reflow at smaller widths)
  sourceElement.style.width = `${pageWidth}px`;
  sourceElement.style.maxWidth = `${pageWidth}px`;
  // Remove any framer-motion transforms that affect getBoundingClientRect
  sourceElement.style.transform = 'none';

  // Ensure parent scroll containers show all content (iOS Safari viewport clipping fix)
  const parentOverflows: { el: HTMLElement; overflow: string }[] = [];
  let parent = sourceElement.parentElement;
  while (parent) {
    parentOverflows.push({ el: parent, overflow: parent.style.overflow });
    parent.style.overflow = 'visible';
    parent = parent.parentElement;
  }

  // Scroll to top so iOS Safari renders all content
  sourceElement.scrollIntoView({ block: 'start' });
  window.scrollTo(0, 0);

  // Force layout recalculation
  sourceElement.offsetHeight;

  return () => {
    sourceElement.style.width = originalStyles.width;
    sourceElement.style.maxWidth = originalStyles.maxWidth;
    sourceElement.style.transform = originalStyles.transform;
    sourceElement.style.minHeight = originalStyles.minHeight;
    parentOverflows.forEach(({ el, overflow }) => {
      el.style.overflow = overflow;
    });
    // Remove injected customization style
    const injectedStyle = sourceElement.querySelector('[data-pdf-customization]');
    if (injectedStyle) injectedStyle.remove();
  };
}

/**
 * Locates the template element in the DOM.
 */
export function getTemplateSourceElement(templateElement?: HTMLElement | null): HTMLElement {
  let sourceElement = templateElement;

  if (!sourceElement) {
    sourceElement = document.querySelector('[data-resume-template]') as HTMLElement;
  }

  if (!sourceElement) {
    sourceElement = document.querySelector('.bg-white.text-black.mx-auto.shadow-2xl') as HTMLElement;
  }

  if (!sourceElement) {
    console.error('PDF Generator: No template element found');
    throw new Error('Resume template not found. Please ensure the preview is visible.');
  }

  return sourceElement;
}

export interface PDFDimensions {
  sourceWidth: number;
  totalHeight: number;
  globalScaleFactor: number;
  sourceHeightPerPage: number;
}

/**
 * Calculates layout dimensions for PDF generation.
 * Uses offsetWidth/scrollHeight which are NOT affected by CSS transforms (unlike getBoundingClientRect).
 */
/**
 * Estimates the scale percentage for one-page PDF export without generating a PDF.
 * Returns a number 1-100 representing the percentage (e.g., 67 means 67% scale).
 */
export function estimateOnePageScale(templateElement: HTMLElement, pageFormat?: 'a4' | 'letter'): number {
  const format = pageFormat || 'letter';
  const dims = PAGE_FORMAT_PX[format] || PAGE_FORMAT_PX['letter'];
  const pw = dims?.width || DEFAULT_PAGE_WIDTH;
  const ph = dims?.height || DEFAULT_PAGE_HEIGHT;
  const printable = ph - FOOTER_RESERVED_PT;

  const cleanup = prepareForCapture(templateElement, pw);
  try {
    const { totalHeight, globalScaleFactor } = calculatePDFDimensions(templateElement, pw, ph);
    const pdfContentHeight = totalHeight * globalScaleFactor;
    const fitScale = pdfContentHeight > printable
      ? printable / pdfContentHeight
      : 1;
    return Math.round(fitScale * 100);
  } finally {
    cleanup();
  }
}

export function calculatePDFDimensions(
  sourceElement: HTMLElement,
  pageWidth: number = DEFAULT_PAGE_WIDTH,
  pageHeight: number = DEFAULT_PAGE_HEIGHT
): PDFDimensions {
  const printableHeight = pageHeight - FOOTER_RESERVED_PT;
  // Use offsetWidth (transform-agnostic) instead of getBoundingClientRect which returns scaled values on iOS
  const sourceWidth = Math.max(
    sourceElement.offsetWidth || pageWidth,
    pageWidth / 2 // Minimum sensible width
  );
  const totalHeight = Math.max(
    sourceElement.scrollHeight || sourceElement.offsetHeight || pageHeight,
    pageHeight / 2 // Minimum sensible height
  );

  // GLOBAL scale factor - used consistently for ALL pages
  const globalScaleFactor = pageWidth / sourceWidth;

  // How much source height fits on one PDF page
  // Footer is added as extra space outside the content area (dynamic page height),
  // so we use the full pageHeight — not printableHeight — for break intervals.
  const sourceHeightPerPage = pageHeight / globalScaleFactor;

  return {
    sourceWidth,
    totalHeight,
    globalScaleFactor,
    sourceHeightPerPage
  };
}

/**
 * Captures the template element as a canvas.
 */
export async function captureTemplateAsCanvas(
  sourceElement: HTMLElement,
  width: number,
  height: number,
  scale: number = SCALE
): Promise<HTMLCanvasElement> {
  // Capture with retry logic for WebView reliability
  const canvas = await captureWithRetry(sourceElement, {
    scale,
    backgroundColor: '#ffffff',
    width,
    height,
    scrollX: 0,
    scrollY: 0,
    windowWidth: width,
    windowHeight: height,
  });

  // Safety check: warn if captured canvas height is suspiciously small
  const expectedHeight = sourceElement.scrollHeight * scale;
  if (canvas.height < expectedHeight * 0.5) {
    console.warn(
      `[PDF] Canvas height (${canvas.height}px) is much smaller than expected (${expectedHeight}px). ` +
      `Source element scrollHeight: ${sourceElement.scrollHeight}px. This may cause truncated pages.`
    );
  }

  return canvas;
}

/**
 * Processes the captured canvas and generates PDF pages based on smart breaks.
 */
export async function generatePDFPages(
  pdfDoc: PDFDocument,
  canvas: HTMLCanvasElement,
  smartBreaks: number[],
  totalHeight: number,
  globalScaleFactor: number,
  pageWidth: number = DEFAULT_PAGE_WIDTH,
  pageHeight: number = DEFAULT_PAGE_HEIGHT
): Promise<void> {
  // Pure image cropping: treat the canvas as one long photo and slice at exact break positions
  const numPages = smartBreaks.length + 1;

  for (let pageNum = 0; pageNum < numPages; pageNum++) {
    const pageStart = pageNum === 0 ? 0 : smartBreaks[pageNum - 1];
    const pageEnd = pageNum === numPages - 1 ? totalHeight : smartBreaks[pageNum];
    const pageContentHeight = pageEnd - pageStart;

    // Source coordinates in hi-res canvas pixels
    const sourceY = Math.round(pageStart * SCALE);
    const sourceH = Math.min(
      Math.round(pageContentHeight * SCALE),
      canvas.height - sourceY
    );

    if (sourceH <= 0) continue;

    // Create a crop canvas at the exact slice size
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = canvas.width;
    cropCanvas.height = sourceH;
    const ctx = cropCanvas.getContext('2d');
    if (!ctx) continue;

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);

    // Direct crop from the source canvas — no rescaling, no distortion
    ctx.drawImage(
      canvas,
      0, sourceY, canvas.width, sourceH,   // source rect
      0, 0, canvas.width, sourceH          // dest rect (1:1 copy)
    );

    // Convert to PNG and embed
    const imgData = cropCanvas.toDataURL('image/png');
    const pngImage = await pdfDoc.embedPng(imgData);

    // Calculate dynamic page height based on this segment's actual content
    const segmentPdfHeight = pageWidth * (cropCanvas.height / cropCanvas.width);
    const actualPageHeight = segmentPdfHeight + FOOTER_RESERVED_PT;

    // Create page sized to fit this exact crop — no scaling, no distortion
    const page = pdfDoc.addPage([pageWidth, actualPageHeight]);

    // Draw at full size, positioned above the footer strip
    page.drawImage(pngImage, {
      x: 0,
      y: FOOTER_RESERVED_PT,
      width: pageWidth,
      height: segmentPdfHeight,
    });
  }
}

/**
 * Generates a PDF from the resume by capturing the rendered React template.
 * This ensures WYSIWYG - what you see in preview is what you get in PDF.
 * 
 * TEMPLATE-AWARE: Uses template configuration to determine pagination strategy.
 * - fixed-sidebar templates: Single page capture (no pagination)
 * - linear-grid templates: Respects grid boundaries
 * - linear templates: Full smart pagination
 */
export async function generatePDF(
  resume: ResumeData,
  templateId: TemplateId,
  templateElement?: HTMLElement | null,
  manualBreakSections?: string[],
  options?: PDFOptions,
  onProgress?: OnProgressCallback,
  customBreakPositions?: number[]
): Promise<Blob> {
  // Get template configuration
  const templateConfig = getTemplateConfig(templateId);
  
  // Find the template element
  const sourceElement = getTemplateSourceElement(templateElement);

  onProgress?.('preparing', 5);

  // Wait for fonts and images to load
  await document.fonts.ready;
  await new Promise(resolve => setTimeout(resolve, 300));

  onProgress?.('preparing', 10);

  // Resolve dynamic page dimensions
  const { pageWidth, pageHeight, printableHeight } = getPageDimensions(resume);

  // Prepare element for capture: fix width, remove transforms, ensure visibility
  const cleanup = prepareForCapture(sourceElement, pageWidth);

  try {
    // Calculate dimensions (after prepareForCapture so we get correct width)
    const {
      sourceWidth,
      totalHeight,
      globalScaleFactor,
      sourceHeightPerPage
    } = calculatePDFDimensions(sourceElement, pageWidth, pageHeight);

    // Calculate smart break positions
    let smartBreaks: number[];
    
    // STRICT MODE: If user provided custom break positions, use ONLY those — no auto-fill
    if (customBreakPositions && customBreakPositions.length > 0) {
      smartBreaks = [...customBreakPositions].sort((a, b) => a - b);
    } else {
      smartBreaks = findSmartBreakPositions(
        sourceElement, 
        sourceHeightPerPage, 
        totalHeight,
        manualBreakSections,
        templateConfig
      );
    }
    
    // Note: fixed-sidebar layout type is no longer used by any template

    // Create PDF document
    const pdfDoc = await PDFDocument.create();

    onProgress?.('capturing', 20);

    // Capture the element directly
    const canvas = await captureTemplateAsCanvas(sourceElement, sourceWidth, totalHeight);

    onProgress?.('paginating', 40);

    // Generate pages
    await generatePDFPages(pdfDoc, canvas, smartBreaks, totalHeight, globalScaleFactor, pageWidth, pageHeight);

    onProgress?.('finalizing', 80);

    // Add page footer (numbers + branding)
    await addPageFooter(pdfDoc, options, pageWidth);

    onProgress?.('finalizing', 90);

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();
    const buffer = pdfBytes.buffer as ArrayBuffer;
    
    onProgress?.('downloading', 100);
    return new Blob([buffer], { type: 'application/pdf' });
  } catch (error) {
    if (error instanceof PdfGenerationError) throw error;
    throw new PdfGenerationError('Failed to capture resume template. Please try again.', 'CAPTURE_FAILED');
  } finally {
    // Always restore original styles
    cleanup();
  }
}

/**
 * Generates a single-page PDF by scaling all content to fit on one page.
 * Used by the One-Page Wizard and one-page export option.
 */
export async function generateOnePagePDF(
  resume: ResumeData,
  templateId: TemplateId,
  templateElement?: HTMLElement | null,
  options?: PDFOptions,
  onProgress?: OnProgressCallback
): Promise<Blob> {
  const templateConfig = getTemplateConfig(templateId);
  const sourceElement = getTemplateSourceElement(templateElement);

  onProgress?.('preparing', 5);
  await document.fonts.ready;
  await new Promise(resolve => setTimeout(resolve, 300));
  onProgress?.('preparing', 10);

  const { pageWidth, pageHeight, printableHeight } = getPageDimensions(resume);
  const cleanup = prepareForCapture(sourceElement, pageWidth);

  try {
    const { sourceWidth, totalHeight, globalScaleFactor } = calculatePDFDimensions(sourceElement, pageWidth, pageHeight);

    // Calculate the full content height in PDF points
    const pdfContentHeight = totalHeight * globalScaleFactor;

    // Calculate scale factor to fit everything on one page
    const fitScale = pdfContentHeight > printableHeight
      ? printableHeight / pdfContentHeight
      : 1;

    // Dynamically increase capture scale if we need to shrink significantly
    // This ensures high resolution even when content is scaled down
    const dynamicScale = fitScale < 1
      ? Math.min(5, SCALE / fitScale)
      : SCALE;

    onProgress?.('capturing', 20);
    const canvas = await captureTemplateAsCanvas(sourceElement, sourceWidth, totalHeight, dynamicScale);

    const pdfDoc = await PDFDocument.create();

    // Always fill full page width; scale height to maintain aspect ratio
    const aspectRatio = totalHeight / sourceWidth;
    const naturalHeight = pageWidth * aspectRatio;
    const pageFit = naturalHeight > printableHeight ? printableHeight / naturalHeight : 1;
    const finalWidth = pageWidth * pageFit;
    const finalHeight = naturalHeight * pageFit;
    const offsetX = (pageWidth - finalWidth) / 2;

    onProgress?.('embedding', 50);
    const imgData = canvas.toDataURL('image/png');
    const pngImage = await pdfDoc.embedPng(imgData);

    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    // Position at top of page, centered horizontally
    page.drawImage(pngImage, {
      x: offsetX,
      y: pageHeight - finalHeight,
      width: finalWidth,
      height: finalHeight,
    });

    // White-fill below content
    const contentBottomY = pageHeight - finalHeight;
    if (contentBottomY > FOOTER_RESERVED_PT) {
      page.drawRectangle({
        x: 0,
        y: FOOTER_RESERVED_PT,
        width: pageWidth,
        height: contentBottomY - FOOTER_RESERVED_PT,
        color: rgb(1, 1, 1),
      });
    }

    onProgress?.('finalizing', 85);
    await addPageFooter(pdfDoc, options, pageWidth);

    const pdfBytes = await pdfDoc.save();
    onProgress?.('downloading', 100);
    return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  } catch (error) {
    if (error instanceof PdfGenerationError) throw error;
    throw new PdfGenerationError('Failed to generate one-page PDF. Please try again.', 'CAPTURE_FAILED');
  } finally {
    cleanup();
  }
}

export async function generateCoverLetterPDF(
  coverLetter: string,
  contactInfo: ContactInfo,
  options?: PDFOptions
): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  const contentWidth = DEFAULT_PAGE_WIDTH - (MARGIN * 2);
  const lines = wrapText(coverLetter, font, 11, contentWidth);

  let page = pdfDoc.addPage([DEFAULT_PAGE_WIDTH, DEFAULT_PAGE_HEIGHT]);
  let y = DEFAULT_PAGE_HEIGHT - MARGIN;

  // Add header with contact info
  if (contactInfo.fullName) {
    page.drawText(contactInfo.fullName, {
      x: MARGIN,
      y,
      size: 16,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    y -= 20;
  }

  // Contact details line
  const contactDetails = [contactInfo.email, contactInfo.phone, contactInfo.location]
    .filter(Boolean)
    .join(' | ');
  if (contactDetails) {
    page.drawText(contactDetails, {
      x: MARGIN,
      y,
      size: 10,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
    y -= 30;
  }

  // Add date
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  page.drawText(today, {
    x: MARGIN,
    y,
    size: 11,
    font,
    color: rgb(0, 0, 0),
  });
  y -= 30;

  // Draw cover letter content
  const lineHeight = 16;
  for (const line of lines) {
    if (y < MARGIN + 30) {
      // New page needed
      page = pdfDoc.addPage([DEFAULT_PAGE_WIDTH, DEFAULT_PAGE_HEIGHT]);
      y = DEFAULT_PAGE_HEIGHT - MARGIN;
    }

    if (line === '') {
      y -= lineHeight; // Paragraph break
    } else {
      page.drawText(line, {
        x: MARGIN,
        y,
        size: 11,
        font,
        color: rgb(0, 0, 0),
      });
      y -= lineHeight;
    }
  }

  // Add page footer (numbers + branding)
  await addPageFooter(pdfDoc, options);

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}

/**
 * Generates a combined PDF with cover letter followed by resume.
 */
export async function generateCombinedPDF(
  resume: ResumeData,
  templateId: TemplateId,
  coverLetter: string,
  templateElement?: HTMLElement | null,
  manualBreakSections?: string[],
  options?: PDFOptions,
  onProgress?: OnProgressCallback,
  customBreakPositions?: number[]
): Promise<Blob> {
  // Generate cover letter PDF first
  const coverLetterBlob = await generateCoverLetterPDF(
    coverLetter,
    resume.contactInfo,
    { showPageNumbers: false } // We'll add page numbers to the combined doc
  );
  const coverLetterBytes = await coverLetterBlob.arrayBuffer();
  const coverLetterDoc = await PDFDocument.load(coverLetterBytes);

  // Generate resume PDF
  const resumeBlob = await generatePDF(
    resume,
    templateId,
    templateElement,
    manualBreakSections,
    { showPageNumbers: false },
    undefined,
    customBreakPositions
  );
  const resumeBytes = await resumeBlob.arrayBuffer();
  const resumeDoc = await PDFDocument.load(resumeBytes);

  // Create combined document
  const combinedDoc = await PDFDocument.create();

  // Copy cover letter pages
  const coverLetterPages = await combinedDoc.copyPages(
    coverLetterDoc,
    coverLetterDoc.getPageIndices()
  );
  coverLetterPages.forEach(page => combinedDoc.addPage(page));

  // Copy resume pages
  const resumePages = await combinedDoc.copyPages(
    resumeDoc,
    resumeDoc.getPageIndices()
  );
  resumePages.forEach(page => combinedDoc.addPage(page));

  // Add page footer to the combined document
  await addPageFooter(combinedDoc, options);

  const pdfBytes = await combinedDoc.save();
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}
