import { memo, useState, useCallback, Suspense, useRef, CSSProperties, useEffect, useMemo } from 'react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { ZoomIn, ZoomOut, Eye, EyeOff, X, Sliders } from 'lucide-react';
import { useResumeStore } from '@/store/resumeStore';
import { applyCustomizationCSS, generateCustomizationCSS } from '@/lib/templateCustomization';
import { StyleCustomizationPanel } from '@/components/editor/StyleCustomizationPanel';
import { SectionOverlayManager } from '@/components/editor/SectionOverlayManager';
import { useFitToPages } from '@/hooks/useFitToPages';
import type { TemplateCustomization } from '@/types/resume';
import { estimatePageCount, getPageDimensionsForFormat, resolveExportPageCount } from '@/lib/pdfUtils';
import { normalizeBreakPositions } from '@/lib/exportPagePlan';
import { PageCountBadge } from '@/components/editor/export/PageCountBadge';
import { PageBreakSetupDialog } from '@/components/editor/export/PageBreakSetupDialog';
import { PageCutHint, usePageCutHintPulse } from '@/components/editor/export/PageCutHint';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { ResumeData } from '@/types/resume';
import haptics from '@/lib/haptics';

import templateComponents from '@/components/templates/registry';
import { migrateTemplateId } from '@/lib/templateMigration';

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25] as const;

import { SECTION_LABELS } from '@/lib/sectionLabels';
import { resolvePageBreakTemplate } from '@/lib/resolvePageBreakTemplate';
export { SECTION_LABELS };

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
  const [pageCount, setPageCount] = useState(1);
  const [pageBreakOpen, setPageBreakOpen] = useState(false);
  const [pageBreakTemplateEl, setPageBreakTemplateEl] = useState<HTMLElement | null>(null);
  const [domSections, setDomSections] = useState<string[]>([]);
  const resumeRef = useRef<HTMLDivElement>(null);
  const pageCountBadgeRef = useRef<HTMLSpanElement>(null);
  const showPageCutHintPulse = usePageCutHintPulse();
  const customBreakPositions = currentResume?.customization?.customBreakPositions;

  const safeTemplateId = migrateTemplateId(selectedTemplate);
  const TemplateComponent =
    templateComponents[safeTemplateId] ?? templateComponents.modern;

  // Resolve the design dimensions matching the user's chosen page format so
  // the live preview lays out at the SAME width Puppeteer will render the
  // PDF at. Letter -> 612 × 792, A4 -> 595 × 842 (CSS px === PDF pt at the
  // design width). See the comment on the template wrapper below for why
  // pinning these dimensions is essential for accurate page-break placement.
  const previewPageFormat = currentResume?.customization?.pageFormat || 'letter';
  const previewDims = useMemo(() => getPageDimensionsForFormat(previewPageFormat), [previewPageFormat]);

  // Track resume content and compute snap-aware page break positions
  useEffect(() => {
    const el = resumeRef.current;
    if (!el) return;
    const { pageWidth, pageHeight } = previewDims;
    const update = () => {
      setPageCount(
        resolveExportPageCount(el, pageWidth, pageHeight, customBreakPositions),
      );
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
  }, [debouncedResume, selectedTemplate, previewDims, customBreakPositions]);

  const toggleSection = useCallback((section: string) => {
    setHiddenSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }, []);


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

  if (!currentResume) return null;

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

          <span ref={pageCountBadgeRef} className="inline-flex">
            <PageCountBadge
              pageCount={pageCount}
              showPulse={showPageCutHintPulse}
              onClick={() => {
                setPageBreakTemplateEl(resolvePageBreakTemplate(resumeRef));
                setPageBreakOpen(true);
              }}
            />
          </span>
          <PageCutHint anchorRef={pageCountBadgeRef} />

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

      {/* Section visibility toggles */}
      {showSectionToggles && activeSections.length > 0 && (
        <div className="shrink-0 flex flex-wrap gap-1.5 px-3 py-2 border-b border-border bg-background/60">
          {activeSections.map(section => {
            const isHidden = hiddenSections.has(section);
            return (
              <button
                key={section}
                onClick={() => { toggleSection(section); haptics.light(); }}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-medium transition-colors touch-manipulation active:scale-95 min-h-[36px]',
                  isHidden
                    ? 'bg-muted text-muted-foreground line-through'
                    : 'bg-primary/10 text-primary'
                )}
              >
                {SECTION_LABELS[section]}
              </button>
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
              ...customizationStyle,
              // Re-pin width AFTER the spread so customisation styles can't
              // accidentally override it (e.g. with width: 100%).
              maxWidth: `${previewDims.pageWidth}px`,
              minWidth: `${previewDims.pageWidth}px`,
            } as CSSProperties}
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

            {customBreakPositions && customBreakPositions.length > 0 && (
              <div className="pointer-events-none absolute inset-0 z-20" aria-hidden data-pdf-exclude>
                {normalizeBreakPositions(
                  customBreakPositions,
                  resumeRef.current?.scrollHeight ?? 0,
                ).map((breakY, index) => (
                  <div
                    key={`preview-break-${breakY}-${index}`}
                    className="absolute inset-x-0 border-t-2 border-dashed border-primary/70"
                    style={{ top: `${breakY}px` }}
                  />
                ))}
              </div>
            )}

            {/* Inline per-section editor overlay (desktop hover-to-reveal style/AI buttons). */}
            <SectionOverlayManager
              resumeRef={resumeRef}
              isBreakEditMode={false}
            />
          </div>
          </div>
        </div>

      <StyleCustomizationPanel open={showStylePanel} onOpenChange={setShowStylePanel} />

      <PageBreakSetupDialog
        open={pageBreakOpen}
        onOpenChange={(open) => {
          if (open) {
            setPageBreakTemplateEl(resolvePageBreakTemplate(resumeRef));
          }
          setPageBreakOpen(open);
        }}
        templateElement={pageBreakTemplateEl}
        resumeData={currentResume}
      />
    </div>
  );
});





