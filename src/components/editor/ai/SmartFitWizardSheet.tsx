import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  CheckCircle2,
  Scissors,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Layers,
  Wand2,
  Check,
  X,
  Type,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useScrollFade } from '@/hooks/useScrollFade';
import { cn } from '@/lib/utils';
import { useResumeStore } from '@/store/resumeStore';
import { useShallow } from 'zustand/react/shallow';
import { toast } from 'sonner';
import haptics from '@/lib/haptics';
import { useAIAction } from '@/hooks/useAIAction';
import { AIProviderVia } from '@/components/editor/ai/AIProviderBadge';
import { useOnePageExport } from '@/hooks/useOnePageExport';
import { generateCustomizationCSS, getDefaultCustomization } from '@/lib/templateCustomization';
import templateComponents from '@/components/templates/registry';
import type { ResumeData } from '@/types/resume';
import { useResumeVersionMutations } from '@/hooks/useResumeVersions';
import { useAIApplyEffects } from '@/hooks/useAIApplyEffects';
import { runSmartFit, applySmartFitPlan } from '@/lib/smartFit/orchestrator';
import { convergeSmartFitPlan, type ConvergeProgress } from '@/lib/smartFit/converge';
import { buildDiffHighlight, type HighlightSegment } from '@/lib/smartFit/diffHighlight';
import type { SmartFitPlan, SmartFitSelection, LayoutFitProposal } from '@/lib/smartFit/types';
import { edgeFunctions } from '@/lib/edgeFunctions';

interface SmartFitWizardSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Defaults to 1 so existing One-Page Wizard call sites keep working. */
  targetPages?: 1 | 2 | 3;
}

type ViewState = 'intro' | 'analyzing' | 'results';
type AnalyzeStage = 'measuring' | 'scoring' | 'asking-ai' | 'converging' | 'finalising';

const STAGE_LABEL: Record<AnalyzeStage, string> = {
  measuring: 'Measuring your resume…',
  scoring: 'Ranking sentences…',
  'asking-ai': 'Asking AI to shorten the longest ones…',
  converging: 'Trying edits one at a time until we hit your target…',
  finalising: 'Finalising the plan…',
};
const STAGE_PCT: Record<AnalyzeStage, number> = {
  measuring: 10, scoring: 25, 'asking-ai': 55, converging: 85, finalising: 95,
};

function emptySelection(): SmartFitSelection {
  return { rewrites: new Set(), drops: new Set(), collapses: new Set(), layoutFit: false };
}

/**
 * Char-count fallback if the offscreen template hasn't finished mounting
 * by the measure deadline. Mirrors the heuristic used by the
 * `one-page-optimizer` edge function so client + server agree.
 */
function estimatePagesFromContent(resume: ResumeData | null): number {
  if (!resume) return 1;
  let charCount = 0;
  charCount += Object.values(resume.contactInfo ?? {}).filter(Boolean).join(' ').length;
  charCount += resume.summary?.length ?? 0;
  for (const exp of resume.experience ?? []) {
    charCount += (exp.position?.length ?? 0) + (exp.company?.length ?? 0) + 50;
    charCount += exp.description?.length ?? 0;
    for (const a of exp.achievements ?? []) charCount += (a?.length ?? 0) + 5;
  }
  for (const edu of resume.education ?? []) {
    charCount += (edu.degree?.length ?? 0) + (edu.field?.length ?? 0) + (edu.institution?.length ?? 0) + 50;
  }
  for (const proj of resume.projects ?? []) {
    charCount += (proj.description?.length ?? 0) + (proj.name?.length ?? 0) + 30;
  }
  for (const cert of resume.certifications ?? []) {
    charCount += (cert.name?.length ?? 0) + (cert.issuer?.length ?? 0) + 30;
  }
  return Math.max(1, Math.ceil(charCount / 2400));
}

export function SmartFitWizardSheet({
  open,
  onOpenChange,
  targetPages: targetPagesProp,
}: SmartFitWizardSheetProps) {
  const { currentResume, currentResumeId, updateResume, selectedTemplate, jobDescription, setCurrentResume } = useResumeStore(
    useShallow(s => ({
      currentResume: s.currentResume,
      currentResumeId: s.currentResumeId,
      updateResume: s.updateResume,
      selectedTemplate: s.selectedTemplate,
      jobDescription: s.jobDescription,
      setCurrentResume: s.setCurrentResume,
    })),
  );

  const [targetPages, setTargetPages] = useState<1 | 2 | 3>(
    targetPagesProp ?? currentResume?.customization?.targetPageCount ?? 1,
  );
  const [view, setView] = useState<ViewState>('intro');
  const [analyzeStage, setAnalyzeStage] = useState<AnalyzeStage>('measuring');
  const [convergeProgress, setConvergeProgress] = useState<ConvergeProgress | null>(null);
  const [plan, setPlan] = useState<SmartFitPlan | null>(null);
  const [selection, setSelection] = useState<SmartFitSelection>(emptySelection());
  const [isApplying, setIsApplying] = useState(false);
  const previousResumeRef = useRef<ResumeData | null>(null);

  // ── Scratch resume + measurement ────────────────────────────────────
  // We mount a SECOND offscreen template controlled by `scratchResume`.
  // The convergence loop calls `measureScratch(altResume)` to render any
  // hypothetical resume, wait for layout, and read back the page count.
  const [scratchResume, setScratchResume] = useState<ResumeData | null>(null);
  const scratchElRef = useRef<HTMLElement | null>(null);
  const pdfModRef = useRef<typeof import('@/lib/pdfGenerator') | null>(null);

  const exportApi = useOnePageExport({
    resume: currentResume,
    templateId: (currentResume?.templateId || selectedTemplate),
    enabled: open,
  });
  const { saveVersion } = useResumeVersionMutations();
  const { execute: executeAI } = useAIAction({ operation: 'one-page' });
  const scrollRef = useScrollFade<HTMLDivElement>();

  const TemplateComponent = useMemo(() => {
    const tid = (currentResume?.templateId || selectedTemplate) as keyof typeof templateComponents;
    return templateComponents[tid] || templateComponents.modern;
  }, [currentResume?.templateId, selectedTemplate]);

  // Pre-warm pdfGenerator so the very first measureScratch is fast
  useEffect(() => {
    if (!open || pdfModRef.current) return;
    let cancelled = false;
    import('@/lib/pdfGenerator').then(mod => {
      if (!cancelled) pdfModRef.current = mod;
    }).catch(() => { /* non-fatal */ });
    return () => { cancelled = true; };
  }, [open]);

  // Reset state on close
  useEffect(() => {
    if (open) return;
    setView('intro');
    setPlan(null);
    setSelection(emptySelection());
    setScratchResume(null);
    setConvergeProgress(null);
  }, [open]);

  // Sync target pages with prop when it changes
  useEffect(() => {
    if (targetPagesProp) setTargetPages(targetPagesProp);
  }, [targetPagesProp]);

  /**
   * Render `alt` into the scratch container, wait two RAFs + a 60ms layout-
   * settle window, then synchronously measure the rendered height. Falls
   * back to the char-count heuristic only if the DOM isn't reachable.
   */
  const measureScratch = useCallback(async (alt: ResumeData): Promise<number> => {
    setScratchResume(alt);
    // Two RAFs lets React commit AND lets the browser paint the new layout.
    await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    // Small settle window for fonts / async template content.
    await new Promise(r => setTimeout(r, 60));
    const el = scratchElRef.current;
    const mod = pdfModRef.current;
    if (!el || !mod) return estimatePagesFromContent(alt);
    try {
      const fmt = (alt.customization?.pageFormat || 'letter') as 'a4' | 'letter';
      const dims = mod.PAGE_FORMAT_PX[fmt] || mod.PAGE_FORMAT_PX.letter;
      const pages = mod.estimatePageCount(el, dims.width, dims.height - mod.FOOTER_RESERVED_PT);
      return Math.max(1, pages);
    } catch (e) {
      console.warn('[SmartFit] measureScratch failed', e);
      return estimatePagesFromContent(alt);
    }
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!currentResume) {
      toast.error('Please create a resume first');
      return;
    }
    haptics.medium?.();
    setView('analyzing');
    setAnalyzeStage('measuring');
    setConvergeProgress(null);
    const analyzeStart = performance.now();
    try {
      // Wait for the offscreen template to mount + finish layout.
      let liveMeasurement = exportApi.measure();
      const deadline = performance.now() + 5000;
      while (!liveMeasurement && performance.now() < deadline) {
        await new Promise(r => setTimeout(r, 100));
        liveMeasurement = exportApi.measure();
      }
      const currentPages = liveMeasurement?.pages ?? estimatePagesFromContent(currentResume);

      setAnalyzeStage('scoring');
      await new Promise(r => setTimeout(r, 50));

      // Stage 0 is run inside `convergeSmartFitPlan`. We give the
      // orchestrator the *unscaled* current page count so its char-savings
      // heuristic stays pessimistic (better to over-propose edits and
      // let convergence prune than under-propose and miss the target).
      setAnalyzeStage('asking-ai');
      const result = await executeAI(async () => {
        return runSmartFit({
          resume: currentResume,
          jobDescription,
          targetPages,
          currentPages,
          pagesAfterLayout: currentPages,
        });
      });
      if (!result) { setView('intro'); return; }

      // ── Convergence loop ──────────────────────────────────────────
      // Apply edits one at a time, re-measuring after each, until the
      // target page count is reached. This is what makes the headline
      // promise (exact N pages) actually true.
      setAnalyzeStage('converging');
      let convResult;
      try {
        convResult = await convergeSmartFitPlan({
          resume: currentResume,
          plan: result,
          targetPages,
          measure: measureScratch,
          onProgress: setConvergeProgress,
        });
      } catch (e) {
        console.warn('[SmartFit] convergence failed, falling back to default selection', e);
        convResult = null;
      }

      setAnalyzeStage('finalising');
      await new Promise(r => setTimeout(r, 100));

      const finalPlan: SmartFitPlan = {
        ...result,
        layoutFit: convResult?.layoutFit,
        pagesAfterRecommended: convResult?.finalPages,
        recommendedSelection: convResult?.recommended,
        stillOverflowing: convResult?.stillOverflowing ?? result.stillOverflowing,
      };

      // Default selection = convergence recommendation if available; else
      // every validated rewrite + every drop + every collapse.
      const defaultSel: SmartFitSelection = convResult?.recommended ?? {
        rewrites: new Set(result.rewrites.filter(r => r.validated).map(r => r.id)),
        drops: new Set(result.drops.map(d => d.id)),
        collapses: new Set(result.collapses.map(c => c.id)),
        layoutFit: false,
      };
      setSelection(defaultSel);
      setPlan(finalPlan);
      setView('results');

      // Telemetry — fire-and-forget so a slow request never blocks the UX.
      void postTelemetry({
        outcome: 'analyzed',
        targetPages,
        pagesBefore: currentPages,
        pagesAfterRecommended: convResult?.finalPages ?? currentPages,
        rewriteCount: result.rewrites.length,
        dropCount: result.drops.length,
        collapseCount: result.collapses.length,
        recommendedRewrites: defaultSel.rewrites.size,
        recommendedDrops: defaultSel.drops.size,
        recommendedCollapses: defaultSel.collapses.size,
        stillOverflowing: convResult?.stillOverflowing ?? false,
        convergedMs: Math.round(performance.now() - analyzeStart),
      });
    } catch (err: unknown) {
      console.error('[SmartFit] analyze error', err);
      toast.error(err instanceof Error ? err.message : 'Failed to analyze. Please try again.');
      setView('intro');
    }
  }, [currentResume, exportApi, executeAI, jobDescription, measureScratch, targetPages]);

  const { rescoreAfterApply } = useAIApplyEffects(currentResumeId ?? undefined);

  const handleUndo = useCallback(() => {
    const prev = previousResumeRef.current;
    if (!prev) return;
    setCurrentResume(prev);
    previousResumeRef.current = null;
    void postTelemetry({ outcome: 'undone', targetPages });
    toast.success('Reverted to previous version');
  }, [setCurrentResume, targetPages]);

  const handleApply = useCallback(async () => {
    if (!currentResume || !plan) return;
    setIsApplying(true);
    try {
      previousResumeRef.current = currentResume;
      if (currentResumeId) {
        try {
          await saveVersion.mutateAsync({
            resumeId: currentResumeId,
            snapshot: currentResume,
            changeSummary: `Auto-snapshot before Smart Fit (target ${targetPages}p)`,
          });
        } catch (e) {
          console.warn('[SmartFit] snapshot failed (non-blocking)', e);
        }
      }
      let merged = applySmartFitPlan(currentResume, plan, selection);
      // Apply the layout-fit fontScale if accepted.
      if (selection.layoutFit && plan.layoutFit) {
        merged = {
          ...merged,
          customization: {
            ...(merged.customization ?? {}),
            fontScale: plan.layoutFit.fontScaleAfter,
          },
        };
      }
      updateResume(merged);
      haptics.success?.();
      void rescoreAfterApply(merged);

      // Re-measure after apply (gives us the "actually achieved" count).
      const finalPages = await measureScratch(merged);

      void postTelemetry({
        outcome: finalPages <= targetPages ? 'applied' : 'still_overflowing',
        targetPages,
        pagesBefore: plan.pagesBefore,
        pagesAfterApplied: finalPages,
        appliedRewrites: selection.rewrites.size,
        appliedDrops: selection.drops.size,
        appliedCollapses: selection.collapses.size,
        layoutFitApplied: !!selection.layoutFit,
      });

      toast.success(
        finalPages <= targetPages
          ? `Smart Fit applied — now ${finalPages} ${finalPages === 1 ? 'page' : 'pages'}.`
          : `Applied — still ${finalPages} pages. Try selecting more edits.`,
        {
          action: { label: 'Undo', onClick: handleUndo },
          duration: 10_000,
        },
      );
      onOpenChange(false);
    } finally {
      setIsApplying(false);
    }
  }, [currentResume, currentResumeId, handleUndo, measureScratch, onOpenChange, plan, rescoreAfterApply, saveVersion, selection, targetPages, updateResume]);

  const toggleSel = useCallback(<K extends 'rewrites' | 'drops' | 'collapses'>(key: K, id: string) => {
    setSelection(prev => {
      const next = new Set(prev[key]);
      if (next.has(id)) next.delete(id); else next.add(id);
      return { ...prev, [key]: next };
    });
  }, []);

  const toggleLayout = useCallback(() => {
    setSelection(prev => ({ ...prev, layoutFit: !prev.layoutFit }));
  }, []);

  const acceptAll = useCallback(() => {
    if (!plan) return;
    setSelection({
      rewrites: new Set(plan.rewrites.filter(r => r.validated).map(r => r.id)),
      drops: new Set(plan.drops.map(d => d.id)),
      collapses: new Set(plan.collapses.map(c => c.id)),
      layoutFit: !!plan.layoutFit,
    });
  }, [plan]);

  const rejectAll = useCallback(() => {
    setSelection(emptySelection());
  }, []);

  const totalSelected =
    selection.rewrites.size + selection.drops.size + selection.collapses.size + (selection.layoutFit ? 1 : 0);
  const totalAvailable = (plan?.rewrites.filter(r => r.validated).length ?? 0)
    + (plan?.drops.length ?? 0)
    + (plan?.collapses.length ?? 0)
    + (plan?.layoutFit ? 1 : 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92dvh] flex flex-col p-0">
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-border shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            Smart Fit to {targetPages} {targetPages === 1 ? 'Page' : 'Pages'}
          </SheetTitle>
          <AIProviderVia className="mt-0.5" />
        </SheetHeader>

        {/* Hidden offscreen render for the BASELINE measurement (current resume). */}
        {open && currentResume && (
          <div
            aria-hidden
            style={{ position: 'fixed', left: '-99999px', top: 0, width: '612px', pointerEvents: 'none', opacity: 0 }}
          >
            <div
              ref={exportApi.setRef}
              data-resume-template
              className="bg-white text-black mx-auto shadow-2xl relative"
              style={{ width: '612px', minHeight: '792px' }}
            >
              {currentResume.customization && (
                <style>{generateCustomizationCSS(currentResume.customization)}</style>
              )}
              <Suspense fallback={null}>
                <TemplateComponent resume={currentResume} accentColor={currentResume.customization?.accentColor} />
              </Suspense>
            </div>
          </div>
        )}

        {/* Hidden offscreen render for SCRATCH measurement (hypothetical resumes
            tested by the convergence loop). */}
        {open && scratchResume && (
          <div
            aria-hidden
            style={{ position: 'fixed', left: '-99999px', top: 1000, width: '612px', pointerEvents: 'none', opacity: 0 }}
          >
            <div
              ref={el => { scratchElRef.current = el; }}
              data-resume-template
              data-smart-fit-scratch
              className="bg-white text-black mx-auto"
              style={{ width: '612px', minHeight: '792px' }}
            >
              {scratchResume.customization && (
                <style>{generateCustomizationCSS(scratchResume.customization)}</style>
              )}
              <Suspense fallback={null}>
                <TemplateComponent resume={scratchResume} accentColor={scratchResume.customization?.accentColor} />
              </Suspense>
            </div>
          </div>
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 ai-output-scroll-fade">
          <AnimatePresence mode="wait">
            {view === 'intro' && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                className="p-4 space-y-5"
              >
                <div className="text-center pt-2">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Layers className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">Choose your target</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Smart Fit shrinks the layout first, then shortens the longest sentences, drops the lowest-impact bullets, and collapses low-signal sections — never numbers, dates, employer names, or job-description keywords.
                  </p>
                </div>

                {!targetPagesProp && (
                  <div className="flex justify-center">
                    <ToggleGroup type="single" value={String(targetPages)} onValueChange={v => v && setTargetPages(Number(v) as 1 | 2 | 3)}>
                      <ToggleGroupItem value="1">1 page</ToggleGroupItem>
                      <ToggleGroupItem value="2">2 pages</ToggleGroupItem>
                      <ToggleGroupItem value="3">3 pages</ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                )}

                <div className="rounded-xl border border-border bg-muted/40 p-3 flex items-start gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p>
                    AI is only used as a last resort. Every change appears as its own card you can accept or reject — and your numbers, dates, employer names, and job-description keywords are highlighted in green to prove they were preserved.
                  </p>
                </div>

                <Button onClick={handleAnalyze} className="w-full" size="lg">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Run Smart Fit
                </Button>
              </motion.div>
            )}

            {view === 'analyzing' && (
              <motion.div
                key="analyzing"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="p-6 space-y-4 text-center"
              >
                <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
                <p className="text-sm font-medium">{STAGE_LABEL[analyzeStage]}</p>
                {analyzeStage === 'converging' && convergeProgress && (
                  <p className="text-xs text-muted-foreground">
                    {convergeProgress.stage === 'baseline'
                      ? `Currently ${convergeProgress.pages} pages.`
                      : `Tested ${convergeProgress.tested}/${convergeProgress.total} ${convergeProgress.stage}${convergeProgress.tested === 1 ? '' : 's'} — now ${convergeProgress.pages} pages.`}
                  </p>
                )}
                <Progress value={STAGE_PCT[analyzeStage]} className="max-w-sm mx-auto" />
              </motion.div>
            )}

            {view === 'results' && plan && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                className="p-4 space-y-4 pb-32"
              >
                <PlanSummary plan={plan} />

                {totalAvailable > 1 && (
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={acceptAll} className="flex-1">
                      <Check className="w-3.5 h-3.5 mr-1" />Accept all
                    </Button>
                    <Button size="sm" variant="outline" onClick={rejectAll} className="flex-1">
                      <X className="w-3.5 h-3.5 mr-1" />Reject all
                    </Button>
                  </div>
                )}

                {plan.layoutFit && (
                  <Section title="Layout fit" hint="A smaller font size that fits without removing any content." icon={<Type className="w-4 h-4" />}>
                    <LayoutFitCard
                      proposal={plan.layoutFit}
                      selected={!!selection.layoutFit}
                      onToggle={toggleLayout}
                    />
                  </Section>
                )}

                {plan.rewrites.length > 0 && (
                  <Section title="Sentence rewrites" hint="AI-shortened versions of your longest sentences. Green tokens are preserved verbatim." icon={<Wand2 className="w-4 h-4" />}>
                    {plan.rewrites.map(r => (
                      <RewriteCard
                        key={r.id}
                        rewrite={r}
                        selected={selection.rewrites.has(r.id)}
                        onToggle={() => toggleSel('rewrites', r.id)}
                      />
                    ))}
                  </Section>
                )}

                {plan.drops.length > 0 && (
                  <Section title="Bullets to drop" hint="The lowest-impact bullets in older roles." icon={<Scissors className="w-4 h-4" />}>
                    {plan.drops.map(d => (
                      <DropCard
                        key={d.id}
                        drop={d}
                        selected={selection.drops.has(d.id)}
                        onToggle={() => toggleSel('drops', d.id)}
                      />
                    ))}
                  </Section>
                )}

                {plan.collapses.length > 0 && (
                  <Section title="Sections to collapse" hint="Low-signal sections recruiters typically skip." icon={<Layers className="w-4 h-4" />}>
                    {plan.collapses.map(c => (
                      <CollapseCard
                        key={c.id}
                        collapse={c}
                        selected={selection.collapses.has(c.id)}
                        onToggle={() => toggleSel('collapses', c.id)}
                      />
                    ))}
                  </Section>
                )}

                {plan.rewrites.length === 0 && plan.drops.length === 0 && plan.collapses.length === 0 && !plan.layoutFit && (
                  <div className="rounded-xl border border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                    Nothing to change — your resume already fits in {plan.targetPages} {plan.targetPages === 1 ? 'page' : 'pages'}.
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {view === 'results' && plan && totalAvailable > 0 && (
          <div className="border-t border-border bg-background p-3 flex items-center justify-between gap-2 shrink-0">
            <div className="text-xs text-muted-foreground">
              {totalSelected} of {totalAvailable} edit{totalAvailable === 1 ? '' : 's'} selected
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setView('intro')}>Back</Button>
              <Button size="sm" onClick={handleApply} disabled={isApplying || totalSelected === 0}>
                {isApplying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                Apply selected
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── Telemetry ──────────────────────────────────────────────────────────────

interface TelemetryPayload {
  outcome: 'analyzed' | 'applied' | 'undone' | 'still_overflowing';
  targetPages: number;
  pagesBefore?: number;
  pagesAfterRecommended?: number;
  pagesAfterApplied?: number;
  rewriteCount?: number;
  dropCount?: number;
  collapseCount?: number;
  recommendedRewrites?: number;
  recommendedDrops?: number;
  recommendedCollapses?: number;
  appliedRewrites?: number;
  appliedDrops?: number;
  appliedCollapses?: number;
  layoutFitApplied?: boolean;
  stillOverflowing?: boolean;
  convergedMs?: number;
}

async function postTelemetry(payload: TelemetryPayload): Promise<void> {
  try {
    await edgeFunctions.functions.invoke('smart-fit-rewrite', {
      body: { mode: 'telemetry', telemetry: payload },
    });
  } catch (e) {
    // Telemetry MUST never affect user-facing flows — log and forget.
    console.warn('[SmartFit] telemetry failed (non-blocking)', e);
  }
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function PlanSummary({ plan }: { plan: SmartFitPlan }) {
  const willHit = plan.pagesAfterRecommended !== undefined
    && plan.pagesAfterRecommended <= plan.targetPages;
  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Plan summary</span>
        <Badge variant="outline" className="text-xs font-mono">
          {plan.pagesBefore} → {plan.pagesAfterRecommended ?? '?'} (target {plan.targetPages})
        </Badge>
      </div>
      <div className="flex flex-wrap gap-1.5 text-xs">
        {plan.stagesRun.map(s => (
          <Badge key={s} variant="secondary" className="capitalize">{s}</Badge>
        ))}
        {willHit && (
          <Badge variant="default" className="gap-1 bg-emerald-600 hover:bg-emerald-700">
            <CheckCircle2 className="w-3 h-3" />
            Hits target
          </Badge>
        )}
        {plan.stillOverflowing && (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="w-3 h-3" />
            May still overflow
          </Badge>
        )}
      </div>
    </div>
  );
}

function Section({
  title, hint, icon, children,
}: { title: string; hint: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        {icon}
        <h4 className="text-sm font-semibold">{title}</h4>
      </div>
      <p className="text-xs text-muted-foreground px-1">{hint}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function LayoutFitCard({
  proposal, selected, onToggle,
}: { proposal: LayoutFitProposal; selected: boolean; onToggle: () => void }) {
  return (
    <div className={cn(
      'rounded-xl border p-3 space-y-2 transition-colors',
      selected ? 'border-primary bg-primary/5' : 'border-border bg-card',
    )}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-muted-foreground italic">{proposal.reason}</p>
        <Button size="sm" variant={selected ? 'default' : 'outline'} onClick={onToggle} className="shrink-0 h-7 px-2">
          {selected ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
        </Button>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <Badge variant="outline" className="font-mono">
          {Math.round(proposal.fontScaleBefore * 100)}% → {Math.round(proposal.fontScaleAfter * 100)}%
        </Badge>
        <Badge variant="secondary" className="font-mono">
          {proposal.pagesBefore}p → {proposal.pagesAfter}p
        </Badge>
      </div>
    </div>
  );
}

function RewriteCard({
  rewrite, selected, onToggle,
}: { rewrite: SmartFitPlan['rewrites'][number]; selected: boolean; onToggle: () => void }) {
  // Build the protected-token-aware diff once per rewrite.
  const { before: beforeSegs, after: afterSegs } = useMemo(
    () => buildDiffHighlight(rewrite.before, rewrite.after, rewrite.preserved),
    [rewrite.before, rewrite.after, rewrite.preserved],
  );
  return (
    <div className={cn(
      'rounded-xl border p-3 space-y-2 transition-colors',
      selected ? 'border-primary bg-primary/5' : 'border-border bg-card',
      !rewrite.validated && 'opacity-70',
    )}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-muted-foreground italic">{rewrite.reason}</p>
        <Button
          size="sm"
          variant={selected ? 'default' : 'outline'}
          onClick={onToggle}
          disabled={!rewrite.validated}
          className="shrink-0 h-7 px-2"
        >
          {selected ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
        </Button>
      </div>
      <div className="text-xs space-y-1.5">
        <div>
          <span className="font-medium text-muted-foreground">Before:</span>{' '}
          <DiffLine segments={beforeSegs} side="before" />
        </div>
        <div>
          <span className="font-medium text-emerald-700">After:</span>{' '}
          <DiffLine segments={afterSegs} side="after" />
        </div>
      </div>
      {rewrite.preserved.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {rewrite.preserved.slice(0, 8).map((p, i) => (
            <Badge key={`${p.text}-${i}`} variant="outline" className="text-[10px] gap-0.5 bg-emerald-50 text-emerald-700 border-emerald-200">
              <ShieldCheck className="w-2.5 h-2.5" />
              {p.text}
            </Badge>
          ))}
          {rewrite.preserved.length > 8 && (
            <Badge variant="outline" className="text-[10px]">+{rewrite.preserved.length - 8} more</Badge>
          )}
        </div>
      )}
      {!rewrite.validated && (
        <div className="flex items-start gap-1.5 text-[11px] text-amber-700">
          <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
          <span>{rewrite.validationReason}</span>
        </div>
      )}
    </div>
  );
}

function DiffLine({ segments, side }: { segments: HighlightSegment[]; side: 'before' | 'after' }) {
  return (
    <span>
      {segments.map((seg, i) => {
        if (seg.kind === 'protected') {
          return (
            <span
              key={i}
              className="bg-emerald-100 text-emerald-900 rounded px-0.5 font-medium"
              title={`Protected: ${seg.tokenKind}`}
            >
              {seg.text}
            </span>
          );
        }
        if (seg.kind === 'added') {
          return <span key={i} className="bg-emerald-50 text-emerald-800 rounded px-0.5">{seg.text}</span>;
        }
        if (seg.kind === 'removed') {
          return <span key={i} className="bg-rose-50 text-rose-800 line-through rounded px-0.5">{seg.text}</span>;
        }
        return (
          <span key={i} className={side === 'before' ? 'text-muted-foreground' : ''}>{seg.text}</span>
        );
      })}
    </span>
  );
}

function DropCard({
  drop, selected, onToggle,
}: { drop: SmartFitPlan['drops'][number]; selected: boolean; onToggle: () => void }) {
  return (
    <div className={cn(
      'rounded-xl border p-3 space-y-2',
      selected ? 'border-primary bg-primary/5' : 'border-border bg-card',
    )}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-muted-foreground italic">{drop.reason}</p>
        <Button size="sm" variant={selected ? 'default' : 'outline'} onClick={onToggle} className="shrink-0 h-7 px-2">
          {selected ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
        </Button>
      </div>
      <p className="text-xs line-through text-muted-foreground">{drop.text}</p>
    </div>
  );
}

function CollapseCard({
  collapse, selected, onToggle,
}: { collapse: SmartFitPlan['collapses'][number]; selected: boolean; onToggle: () => void }) {
  return (
    <div className={cn(
      'rounded-xl border p-3 space-y-2',
      selected ? 'border-primary bg-primary/5' : 'border-border bg-card',
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-xs font-medium capitalize">{String(collapse.section)}</p>
          <p className="text-xs text-muted-foreground italic">{collapse.reason}</p>
        </div>
        <Button size="sm" variant={selected ? 'default' : 'outline'} onClick={onToggle} className="shrink-0 h-7 px-2">
          {selected ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
        </Button>
      </div>
    </div>
  );
}

export default SmartFitWizardSheet;
