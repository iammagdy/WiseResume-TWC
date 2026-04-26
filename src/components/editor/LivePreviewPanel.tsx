import { memo, useState, useCallback, Suspense, useRef, CSSProperties, useEffect } from 'react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { ZoomIn, ZoomOut, Eye, EyeOff, X, Scissors, SeparatorHorizontal, Sliders, GripVertical, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useResumeStore } from '@/store/resumeStore';
import { applyCustomizationCSS, generateCustomizationCSS } from '@/lib/templateCustomization';
import { StyleCustomizationPanel } from '@/components/editor/StyleCustomizationPanel';
import { SectionOverlayManager } from '@/components/editor/SectionOverlayManager';
import { useFitToPages } from '@/hooks/useFitToPages';
import type { TemplateCustomization } from '@/types/resume';
import { computePreviewBreaks, estimatePageCount, getPageDimensionsForFormat, injectForcedBreaks } from '@/lib/pdfUtils';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { TemplateId, ResumeData } from '@/types/resume';
import haptics from '@/lib/haptics';
import { toast } from 'sonner';

import templateComponents from '@/components/templates/registry';

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25] as const;

export const SECTION_LABELS: Record<string, string> = {
  summary: 'Summary',
  experience: 'Experience',
  education: 'Education',
  skills: 'Skills',
  certifications: 'Certifications',
  awards: 'Awards',
  projects: 'Projects',
  publications: 'Publications',
  volunteering: 'Volunteering',
  hobbies: 'Hobbies',
  references: 'References',
  languages: 'Languages',
};

function PreviewSkeleton() {
  return (
    <div className="p-8 space-y-4">
      <Skeleton className="h-8 w-48 mx-auto" />
      <Skeleton className="h-4 w-64 mx-auto" />
      <Skeleton className="h-20 w-full mt-6" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

/** Filter resume data by hiding toggled-off sections */
function filterResume(resume: ResumeData, hidden: Set<string>): ResumeData {
  if (hidden.size === 0) return resume;
  return {
    ...resume,
    summary: hidden.has('summary') ? '' : resume.summary,
    experience: hidden.has('experience') ? [] : resume.experience,
    education: hidden.has('education') ? [] : resume.education,
    skills: hidden.has('skills') ? [] : resume.skills,
    certifications: hidden.has('certifications') ? [] : resume.certifications,
    awards: hidden.has('awards') ? [] : resume.awards,
    projects: hidden.has('projects') ? [] : resume.projects,
    publications: hidden.has('publications') ? [] : resume.publications,
    volunteering: hidden.has('volunteering') ? [] : resume.volunteering,
    hobbies: hidden.has('hobbies') ? [] : resume.hobbies,
    references: hidden.has('references') ? [] : resume.references,
    languages: hidden.has('languages') ? [] : resume.languages,
  };
}

interface LivePreviewPanelProps {
  onClose?: () => void;
  className?: string;
  highlightSection?: string;
}

export const LivePreviewPanel = memo(function LivePreviewPanel({ onClose, className, highlightSection }: LivePreviewPanelProps) {
  const currentResume = useResumeStore(s => s.currentResume);
  const selectedTemplate = useResumeStore(s => s.selectedTemplate);
  const updateResume = useResumeStore(s => s.updateResume);

  // Debounce the resume passed to the template by ~100ms so bursts of
  // keystrokes coalesce into a single re-render of the (heavy) template tree.
  // On resume *identity* switch we flip immediately to avoid showing stale
  // content from the previous resume during the debounce window.
  const [debouncedResume, setDebouncedResume] = useState(currentResume);
  const lastIdRef = useRef(currentResume?.id);
  const lastPointerTypeRef = useRef<string>('mouse');
  useEffect(() => {
    if (currentResume?.id !== lastIdRef.current) {
      lastIdRef.current = currentResume?.id;
      setDebouncedResume(currentResume);
      return;
    }
    const t = setTimeout(() => setDebouncedResume(currentResume), 100);
    return () => clearTimeout(t);
  }, [currentResume]);

  const [zoom, setZoom] = useState(0.75);

  // Orientation-aware auto-zoom
  useEffect(() => {
    const mql = window.matchMedia('(orientation: landscape)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      setZoom(e.matches ? 1 : 0.75);
    };
    handler(mql); // set initial
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  const [hiddenSections, setHiddenSections] = useState<Set<string>>(new Set());
  const [showSectionToggles, setShowSectionToggles] = useState(false);
  const [showStylePanel, setShowStylePanel] = useState(false);
  const [showPageBreaks, setShowPageBreaks] = useState(true);
  const [pageBreaks, setPageBreaks] = useState<number[]>([]);
  const [pageCount, setPageCount] = useState(1);
  const [domSections, setDomSections] = useState<string[]>([]);
  const resumeRef = useRef<HTMLDivElement>(null);

  const [isBreakEditMode, setIsBreakEditMode] = useState(false);
  const [draggingBreak, setDraggingBreak] = useState<{
    index: number;
    startClientY: number;
    startBreakY: number;
    currentY: number;
  } | null>(null);
  const justDraggedRef = useRef(false);

  const TemplateComponent = templateComponents[selectedTemplate];

  // Resolve the design dimensions matching the user's chosen page format so
  // the live preview lays out at the SAME width Puppeteer will render the
  // PDF at. Letter -> 612 × 792, A4 -> 595 × 842 (CSS px === PDF pt at the
  // design width). See the comment on the template wrapper below for why
  // pinning these dimensions is essential for accurate page-break placement.
  const previewPageFormat = currentResume?.customization?.pageFormat || 'letter';
  const previewDims = getPageDimensionsForFormat(previewPageFormat);

  // Track resume content and compute snap-aware page break positions
  useEffect(() => {
    const el = resumeRef.current;
    if (!el) return;
    const { pageWidth, pageHeight } = previewDims;
    const update = () => {
      const smartBreaks = computePreviewBreaks(el, pageWidth, pageHeight);
      const manualSections = currentResume?.customization?.manualPageBreaks ?? [];
      const totalHeight = el.scrollHeight || el.offsetHeight;
      // Post-snap merge: forced-break positions are inserted after smart-snapping
      // so they always land exactly at the section's offsetTop, overriding any
      // nearby auto-snapped break within MIN_GAP (40px). This is simpler than
      // threading forced positions through snapBreaksToContent and produces the
      // same result since forced positions are already at section boundaries.
      const breaks = injectForcedBreaks(smartBreaks, el, manualSections, totalHeight);
      setPageBreaks(breaks);
      setPageCount(estimatePageCount(el, pageWidth, pageHeight));
      // Derive section list from DOM so order and availability match the actual
      // rendered template (templates may omit or reorder sections dynamically).
      const sectionEls = el.querySelectorAll('[data-section]');
      const seen = new Set<string>();
      const ordered: string[] = [];
      sectionEls.forEach(sEl => {
        const name = sEl.getAttribute('data-section');
        if (name && SECTION_LABELS[name] && !seen.has(name)) {
          seen.add(name);
          ordered.push(name);
        }
      });
      setDomSections(ordered);
    };
    // Delay initial calculation to allow layout to settle after template render
    const timer = setTimeout(update, 150);
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => {
      clearTimeout(timer);
      obs.disconnect();
    };
    // Key off the debounced render snapshot so page-break recalculation
    // happens at the same cadence as the actual template re-render.
    // Also re-run when manualPageBreaks changes so forced breaks update immediately.
  }, [debouncedResume, selectedTemplate, currentResume?.customization?.manualPageBreaks]);

  const toggleSection = useCallback((section: string) => {
    setHiddenSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }, []);

  const toggleBreakBefore = useCallback((section: string) => {
    if (!currentResume) return;
    const current = currentResume.customization?.manualPageBreaks ?? [];
    const next = current.includes(section)
      ? current.filter(s => s !== section)
      : [...current, section];
    updateResume({
      customization: { ...currentResume.customization, manualPageBreaks: next } as typeof currentResume.customization,
    });
  }, [currentResume, updateResume]);

  const sortedCustomBreaks = [...(currentResume?.customization?.customBreakPositions ?? [])].sort((a, b) => a - b);

  const setCustomBreaks = useCallback((positions: number[]) => {
    if (!currentResume) return;
    const sorted = positions.filter(y => isFinite(y) && y > 0).sort((a, b) => a - b);
    updateResume({
      customization: { ...currentResume.customization, customBreakPositions: sorted } as typeof currentResume.customization,
    });
  }, [currentResume, updateResume]);

  const handleResumeClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isBreakEditMode || !resumeRef.current) return;
    if (justDraggedRef.current) return;
    const rect = resumeRef.current.getBoundingClientRect();
    const cssY = Math.round((e.clientY - rect.top) / zoom);
    const totalH = resumeRef.current.scrollHeight;
    const edgeGuard = lastPointerTypeRef.current === 'touch' ? 14 : 5;
    if (cssY <= edgeGuard || cssY >= totalH - edgeGuard) return;
    const existing = currentResume?.customization?.customBreakPositions ?? [];
    if (existing.some(b => Math.abs(b - cssY) < 30)) return;
    setCustomBreaks([...existing, cssY]);
  }, [isBreakEditMode, zoom, currentResume, setCustomBreaks]);

  const handleDragStart = useCallback((e: React.PointerEvent, index: number, breakY: number) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDraggingBreak({ index, startClientY: e.clientY, startBreakY: breakY, currentY: breakY });
  }, []);

  const handleDragMove = useCallback((e: React.PointerEvent, index: number) => {
    if (!draggingBreak || draggingBreak.index !== index || !resumeRef.current) return;
    const delta = (e.clientY - draggingBreak.startClientY) / zoom;
    const totalH = resumeRef.current.scrollHeight;
    const edgeGuard = e.pointerType === 'touch' ? 14 : 5;
    const newY = Math.round(Math.max(edgeGuard, Math.min(totalH - edgeGuard, draggingBreak.startBreakY + delta)));
    setDraggingBreak(prev => prev ? { ...prev, currentY: newY } : null);
  }, [draggingBreak, zoom]);

  const handleDragEnd = useCallback((index: number) => {
    if (!draggingBreak || draggingBreak.index !== index) return;
    justDraggedRef.current = true;
    setTimeout(() => { justDraggedRef.current = false; }, 80);
    const positions = [...(currentResume?.customization?.customBreakPositions ?? [])].sort((a, b) => a - b);
    positions[draggingBreak.index] = draggingBreak.currentY;
    setCustomBreaks(positions);
    setDraggingBreak(null);
  }, [draggingBreak, currentResume, setCustomBreaks]);

  const removeCustomBreak = useCallback((index: number) => {
    const positions = [...(currentResume?.customization?.customBreakPositions ?? [])].sort((a, b) => a - b);
    setCustomBreaks(positions.filter((_, i) => i !== index));
  }, [currentResume, setCustomBreaks]);

  const [isCustomBreakDownloading, setIsCustomBreakDownloading] = useState(false);

  const handleCustomBreakDownload = useCallback(async () => {
    if (!currentResume || !resumeRef.current) return;
    const customBreakPositions = currentResume.customization?.customBreakPositions;
    if (!customBreakPositions?.length) return;
    setIsCustomBreakDownloading(true);
    try {
      const { generateNativePDF } = await import('@/lib/nativePdfGenerator');
      const { downloadFile } = await import('@/lib/downloadUtils');
      const templateEl = resumeRef.current.querySelector('[data-resume-template]') as HTMLElement | null
        ?? resumeRef.current;
      const pageFormat = (currentResume.customization?.pageFormat ?? 'letter') as 'letter' | 'a4';
      const pdfBlob = await generateNativePDF(templateEl, {
        pageFormat,
        showPageNumbers: false,
        showBranding: true,
        customBreakPositions,
      });
      const baseName = currentResume.contactInfo?.fullName?.replace(/\s+/g, '_') || 'Resume';
      await downloadFile({ blob: pdfBlob, fileName: `${baseName}_Resume_CustomBreaks.pdf`, mimeType: 'application/pdf' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Download failed. Please try again.';
      toast.error(msg);
    } finally {
      setIsCustomBreakDownloading(false);
    }
  }, [currentResume]);

  // Auto-fit-to-pages: when customization.targetPageCount is set, this hook
  // measures the rendered preview and patches customization.fontScale so the
  // resume occupies the requested page count. No-op when targetPageCount is
  // undefined (manual mode).
  const handleFitScale = useCallback((scale: number) => {
    if (!currentResume) return;
    const base = (currentResume.customization ?? {}) as TemplateCustomization;
    if (Math.abs((base.fontScale ?? 1) - scale) < 0.005) return;
    updateResume({ customization: { ...base, fontScale: scale } });
  }, [currentResume, updateResume]);
  useFitToPages({
    templateRef: resumeRef,
    resume: currentResume,
    onScaleComputed: handleFitScale,
  });

  if (!currentResume || !TemplateComponent) return null;

  // Use the debounced snapshot for the template render (heavy tree),
  // but keep `currentResume` for toolbar/PDF/style which read non-render fields.
  const renderResume = debouncedResume ?? currentResume;
  const filteredResume = filterResume(renderResume, hiddenSections);
  const customizationStyle = applyCustomizationCSS(currentResume.customization);

  // Use DOM-derived section order (populated by the ResizeObserver update loop).
  // Falls back to static key order on first render before the DOM has settled.
  const activeSections = domSections.length > 0
    ? domSections
    : Object.keys(SECTION_LABELS).filter(key => {
        const val = (currentResume as Record<string, unknown>)[key];
        if (typeof val === 'string') return val.length > 0;
        if (Array.isArray(val)) return val.length > 0;
        return false;
      });

  return (
    <div className={cn('flex flex-col h-full min-h-0 overflow-hidden bg-muted', className)}>
      {/* Toolbar */}
      <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-background backdrop-blur-sm pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-1">
          {/* Zoom controls */}
          {ZOOM_LEVELS.map(level => (
            <button
              key={level}
              onClick={() => { setZoom(level); haptics.light(); }}
              className={cn(
                'px-2 py-1.5 rounded text-xs font-medium transition-colors min-w-[40px] min-h-[40px] touch-manipulation active:scale-95',
                zoom === level ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {Math.round(level * 100)}%
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Page break toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => { setShowPageBreaks(v => !v); haptics.light(); }}
                className={cn(
                  'p-2 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation active:scale-95',
                  showPageBreaks ? 'bg-destructive/10 text-destructive' : 'text-muted-foreground hover:bg-muted'
                )}
                aria-label="Toggle page break indicators"
              >
                <Scissors className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {showPageBreaks ? 'Hide auto page break lines' : 'Show auto page break lines'}
            </TooltipContent>
          </Tooltip>

          {/* Custom break edit mode */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => { setIsBreakEditMode(v => !v); haptics.light(); }}
                className={cn(
                  'p-2 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation active:scale-95',
                  isBreakEditMode ? 'bg-primary/10 text-primary ring-1 ring-primary/30' : 'text-muted-foreground hover:bg-muted'
                )}
                aria-label="Edit custom page breaks"
              >
                <GripVertical className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {isBreakEditMode ? 'Click resume to add breaks · drag to move · × to delete' : 'Place custom page breaks'}
            </TooltipContent>
          </Tooltip>

          {/* Clear custom breaks */}
          {sortedCustomBreaks.length > 0 && (
            <button
              onClick={() => { setCustomBreaks([]); setIsBreakEditMode(false); haptics.light(); }}
              className="px-2 py-1 rounded-lg text-xs transition-colors text-muted-foreground hover:bg-muted hover:text-destructive min-h-[44px] whitespace-nowrap touch-manipulation active:scale-95"
              title="Remove all custom page breaks"
            >
              Clear {sortedCustomBreaks.length} break{sortedCustomBreaks.length > 1 ? 's' : ''}
            </button>
          )}

          {/* Section toggle button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => { setShowSectionToggles(v => !v); haptics.light(); }}
                className={cn(
                  'p-2 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation active:scale-95',
                  showSectionToggles ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
                )}
                aria-label="Toggle section visibility"
              >
                {showSectionToggles ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {showSectionToggles ? 'Hide section toggles' : 'Show/hide sections'}
            </TooltipContent>
          </Tooltip>

          {/* Customize style button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => { setShowStylePanel(true); haptics.light(); }}
                className="p-2 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation active:scale-95 text-muted-foreground hover:bg-muted"
                aria-label="Customize style"
              >
                <Sliders className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Customize style</TooltipContent>
          </Tooltip>

          {/* Live page count badge — green ≤2 / amber 3-4 / red ≥5 */}
          <span className={cn(
            'text-xs font-medium px-2 py-1 rounded-md whitespace-nowrap',
            pageCount <= 2
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : pageCount <= 4
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                : 'bg-destructive/10 text-destructive'
          )}>
            {pageCount} {pageCount === 1 ? 'page' : 'pages'}
          </span>

          {/* Close (desktop) */}
          {onClose && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => { onClose(); haptics.light(); }}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation active:scale-95"
                  aria-label="Close preview"
                >
                  <X className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Close preview</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Section visibility + page-break toggles */}
      {showSectionToggles && activeSections.length > 0 && (
        <div className="shrink-0 flex flex-wrap gap-1.5 px-3 py-2 border-b border-border bg-background/60">
          {activeSections.map(section => {
            const isHidden = hiddenSections.has(section);
            const hasBreak = (currentResume.customization?.manualPageBreaks ?? []).includes(section);
            return (
              <div key={section} className="flex items-center">
                <button
                  onClick={() => { toggleSection(section); haptics.light(); }}
                  className={cn(
                    'px-2.5 py-1 rounded-l-full text-xs font-medium transition-colors touch-manipulation active:scale-95 min-h-[36px]',
                    isHidden
                      ? 'bg-muted text-muted-foreground line-through'
                      : 'bg-primary/10 text-primary'
                  )}
                >
                  {SECTION_LABELS[section]}
                </button>
                <button
                  onClick={() => { toggleBreakBefore(section); haptics.light(); }}
                  title={`${hasBreak ? 'Remove' : 'Force'} page break before ${SECTION_LABELS[section]}`}
                  className={cn(
                    'px-1.5 py-1 rounded-r-full text-xs transition-colors touch-manipulation active:scale-95 min-h-[36px] border-l',
                    hasBreak
                      ? 'bg-destructive/10 text-destructive border-destructive/20'
                      : 'bg-primary/10 text-primary/40 border-primary/20 hover:text-primary hover:bg-primary/20'
                  )}
                >
                  <SeparatorHorizontal className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Resume preview */}
      <div className="flex-1 overflow-auto p-3 flex justify-center">
        <div
          style={{
            transformOrigin: 'top center',
            transform: `scale(${zoom})`,
          }}
        >
          <div
            ref={resumeRef}
            data-resume-template
            className="bg-white text-black mx-auto shadow-2xl relative"
            style={{
              // Pin the template's CSS layout width to the PDF design width
              // for the user's chosen page format (612 px Letter / 595 px
              // A4 — 1 CSS px === 1 PDF pt at the design width). This makes
              // click-Y values and `cleanedContentHeight` live in the SAME
              // coordinate space Puppeteer renders at on the server, so
              // user-placed page breaks land exactly where they clicked.
              // The parent div's `transform: scale(zoom)` shrinks the
              // *visual* size to fit the editor sidebar without affecting
              // layout. Without this pin, a narrower sidebar would force
              // `width: 100%` to fall below the design width and reflow
              // text into more lines, producing a totalContentHeight 15-20
              // % taller than the actual PDF — the source of the
              // misaligned page-break bug.
              width: `${previewDims.pageWidth}px`,
              minHeight: `${previewDims.pageHeight}px`,
              cursor: isBreakEditMode ? 'crosshair' : undefined,
              ...customizationStyle,
              // Re-pin width AFTER the spread so customisation styles can't
              // accidentally override it (e.g. with width: 100%).
              maxWidth: `${previewDims.pageWidth}px`,
              minWidth: `${previewDims.pageWidth}px`,
            } as CSSProperties}
            onPointerDown={(e) => { lastPointerTypeRef.current = e.pointerType; }}
            onClick={handleResumeClick}
          >
            {currentResume.customization && (
              <style>
                {generateCustomizationCSS(currentResume.customization)}
              </style>
            )}
            {highlightSection && (
              <style>
                {`
                  [data-section="${highlightSection}"] {
                    outline: 2px solid hsl(var(--primary) / 0.2);
                    outline-offset: 4px;
                    border-radius: 4px;
                    transition: outline-color 0.3s ease;
                  }
                `}
              </style>
            )}
            <Suspense fallback={<PreviewSkeleton />}>
              <TemplateComponent resume={filteredResume} accentColor={filteredResume?.customization?.accentColor} />
            </Suspense>

            {/* Auto page break indicators (dashed) */}
            {showPageBreaks && pageBreaks.map((breakY, i) => (
              <div
                key={i}
                data-html2canvas-ignore="true"
                className="absolute left-0 w-full z-10 pointer-events-none"
                style={{ top: `${breakY}px` }}
              >
                <div className="border-t border-dashed border-destructive/50 w-full" />
                <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white text-destructive text-[9px] font-medium px-1.5 py-0.5 rounded-full shadow-sm whitespace-nowrap">
                  — Auto break —
                </span>
              </div>
            ))}

            {/* Custom break indicators (solid, draggable) */}
            {sortedCustomBreaks.map((breakY, i) => {
              const visualY = draggingBreak?.index === i ? draggingBreak.currentY : breakY;
              return (
                <div
                  key={`custom-${i}`}
                  data-html2canvas-ignore="true"
                  className="absolute left-0 w-full z-20"
                  style={{ top: `${visualY}px`, touchAction: 'none' }}
                >
                  <div className="border-t-2 border-primary w-full" />
                  <div
                    className="absolute left-0 top-0 -translate-y-1/2 flex items-center bg-primary text-primary-foreground rounded-r px-1 py-0.5 cursor-ns-resize select-none gap-0.5 shadow"
                    style={{ touchAction: 'none' }}
                    onPointerDown={(e) => handleDragStart(e, i, breakY)}
                    onPointerMove={(e) => handleDragMove(e, i)}
                    onPointerUp={() => handleDragEnd(i)}
                  >
                    <GripVertical className="w-3 h-3" />
                    <span className="text-[8px] font-medium leading-none">break {i + 1}</span>
                  </div>
                  <button
                    data-html2canvas-ignore="true"
                    className="absolute right-1 top-0 -translate-y-1/2 bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center text-[9px] leading-none shadow hover:bg-destructive transition-colors"
                    onClick={(e) => { e.stopPropagation(); removeCustomBreak(i); }}
                    title="Remove this break"
                  >
                    ×
                  </button>
                </div>
              );
            })}

            {/* Inline per-section editor overlay (desktop hover-to-reveal
                style/AI buttons). Skipped during break-edit mode so it
                doesn't intercept the click-to-add-break gesture. */}
            <SectionOverlayManager
              resumeRef={resumeRef}
              isBreakEditMode={isBreakEditMode}
            />

            {/* Sticky bottom bar(s): hint + download button stacked in one container */}
            {(isBreakEditMode || sortedCustomBreaks.length > 0) && (
              <div
                data-html2canvas-ignore="true"
                className="sticky bottom-0 left-0 w-full z-editor-shell flex flex-col"
              >
                {isBreakEditMode && (
                  <div className="w-full bg-primary/90 text-primary-foreground text-[10px] text-center py-1 pointer-events-none select-none">
                    Click anywhere to add a break · Drag handle to move · × to delete
                  </div>
                )}
                {sortedCustomBreaks.length > 0 && (
                  <button
                    disabled={isCustomBreakDownloading}
                    onClick={(e) => { e.stopPropagation(); handleCustomBreakDownload(); }}
                    className="w-full flex items-center justify-center gap-1.5 bg-primary text-primary-foreground text-[11px] font-medium py-1.5 hover:bg-primary/90 transition-colors select-none touch-manipulation active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isCustomBreakDownloading
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Download className="w-3 h-3" />
                    }
                    {isCustomBreakDownloading
                      ? 'Generating…'
                      : `Download (${sortedCustomBreaks.length + 1} page${sortedCustomBreaks.length + 1 > 1 ? 's' : ''})`
                    }
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <StyleCustomizationPanel open={showStylePanel} onOpenChange={setShowStylePanel} />
    </div>
  );
});
