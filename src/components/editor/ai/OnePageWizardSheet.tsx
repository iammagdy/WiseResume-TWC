import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Loader2,
  CheckCircle2,
  ArrowRight,
  Scissors,
  AlertCircle,
  Sparkles,
  Layout,
  Download,
  Undo2,
  GitCompare,
  ChevronDown,
  Wand2,
  Check,
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
import { Checkbox } from '@/components/ui/checkbox';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useScrollFade } from '@/hooks/useScrollFade';
import { cn } from '@/lib/utils';
import { useResumeStore } from '@/store/resumeStore';
import { useShallow } from 'zustand/react/shallow';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { toast } from 'sonner';
import haptics from '@/lib/haptics';
import { useAIAction } from '@/hooks/useAIAction';
import { AIProviderVia } from '@/components/editor/ai/AIProviderBadge';
import { useOnePageExport, type OnePageMeasurement } from '@/hooks/useOnePageExport';
import { generateCustomizationCSS, getDefaultCustomization } from '@/lib/templateCustomization';
import templateComponents from '@/components/templates/registry';
import { downloadFile } from '@/lib/downloadUtils';
import { CompareSheet } from '@/components/editor/CompareSheet';
import type { ResumeData, TemplateCustomization } from '@/types/resume';
import { useResumeVersionMutations } from '@/hooks/useResumeVersions';

interface OnePageWizardSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** @deprecated kept so older callers still compile — sheet now exports its own PDF. */
  onExportOnePage?: () => void;
}

interface ContentReduction { section: string; original: string; condensed: string; wordsRemoved: number; strategy: string; }
interface RemovedItem { section: string; item: string; reason: string; }
interface CondensedExperience { id: string; description: string; achievements: string[]; }
interface OnePageResult {
  currentEstimatedPages: number;
  optimizedEstimatedPages: number;
  reductions: ContentReduction[];
  removedItems: RemovedItem[];
  condensedSummary?: string;
  condensedExperience: CondensedExperience[];
  layoutSuggestions: string[];
  overallStrategy: string;
  provider?: string | null;
}

type ViewState = 'levers' | 'analyzing' | 'results';
type AnalyzeStage = 'measuring' | 'asking-ai' | 'validating';

interface ChangeSelection {
  summary: boolean;
  experiences: Set<string>; // experience ids whose condensation should be applied
}

/** Compute years of experience from earliest start year of experience entries. */
function computeYearsOfExperience(resume: ResumeData): number | undefined {
  if (!resume.experience?.length) return undefined;
  const years = resume.experience
    .map(e => parseInt((e.startDate || '').slice(0, 4), 10))
    .filter(y => Number.isFinite(y) && y > 1950 && y <= new Date().getFullYear());
  if (!years.length) return undefined;
  return Math.max(0, new Date().getFullYear() - Math.min(...years));
}

/** Extract a target role from the resume (latest position). */
function inferTargetRole(resume: ResumeData, jobDescription: string): string | undefined {
  // Prefer the first line of the JD if present
  const jdLine = jobDescription?.trim().split('\n').find(l => l.trim().length > 0);
  if (jdLine && jdLine.length < 120) return jdLine.trim();
  return resume.experience?.[0]?.position || undefined;
}

/** Apply only the user-selected pieces of the AI plan to a resume. */
function applySelectiveChanges(resume: ResumeData, result: OnePageResult, sel: ChangeSelection): ResumeData {
  const next: ResumeData = { ...resume };
  if (sel.summary && result.condensedSummary) next.summary = result.condensedSummary;
  if (sel.experiences.size > 0) {
    next.experience = resume.experience.map(exp => {
      if (!sel.experiences.has(exp.id)) return exp;
      const c = result.condensedExperience.find(x => x.id === exp.id);
      if (!c) return exp;
      return { ...exp, description: c.description, achievements: c.achievements };
    });
  }
  return next;
}

/**
 * Build a synthetic TailorResult-shape so we can reuse CompareSheet's full-screen diff.
 * Honors the user's current selection so the Compare view doesn't surface changes
 * the user has already de-selected in the wizard.
 */
function toCompareTailorResult(resume: ResumeData, result: OnePageResult, sel: ChangeSelection) {
  return {
    summary: sel.summary && result.condensedSummary ? result.condensedSummary : resume.summary,
    skills: resume.skills,
    experience: resume.experience.map(exp => {
      if (!sel.experiences.has(exp.id)) {
        return { position: exp.position, company: exp.company, description: exp.description, achievements: exp.achievements };
      }
      const c = result.condensedExperience.find(x => x.id === exp.id);
      return c
        ? { position: exp.position, company: exp.company, description: c.description, achievements: c.achievements }
        : { position: exp.position, company: exp.company, description: exp.description, achievements: exp.achievements };
    }),
    education: resume.education,
  };
}

const STAGE_LABEL: Record<AnalyzeStage, string> = {
  measuring: 'Measuring your resume…',
  'asking-ai': 'Asking AI to condense…',
  validating: 'Validating the plan…',
};
const STAGE_PCT: Record<AnalyzeStage, number> = { measuring: 15, 'asking-ai': 65, validating: 92 };

export function OnePageWizardSheet({ open, onOpenChange }: OnePageWizardSheetProps) {
  const { currentResume, currentResumeId, updateResume, selectedTemplate, jobDescription, setCurrentResume } = useResumeStore(
    useShallow(s => ({
      currentResume: s.currentResume,
      currentResumeId: s.currentResumeId,
      updateResume: s.updateResume,
      selectedTemplate: s.selectedTemplate,
      jobDescription: s.jobDescription,
      setCurrentResume: s.setCurrentResume,
    }))
  );

  const exportApi = useOnePageExport({
    resume: currentResume,
    templateId: (currentResume?.templateId || selectedTemplate),
    enabled: open,
  });
  const { saveVersion } = useResumeVersionMutations();

  const [view, setView] = useState<ViewState>('levers');
  const [analyzeStage, setAnalyzeStage] = useState<AnalyzeStage>('measuring');
  const [result, setResult] = useState<OnePageResult | null>(null);
  const [measurement, setMeasurement] = useState<OnePageMeasurement | null>(null);
  const [postApplyMeasurement, setPostApplyMeasurement] = useState<OnePageMeasurement | null>(null);
  const [selection, setSelection] = useState<ChangeSelection>({ summary: true, experiences: new Set() });
  const [isApplying, setIsApplying] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [tightenRequested, setTightenRequested] = useState(false);
  const previousResumeRef = useRef<ResumeData | null>(null);

  const { execute: executeAI } = useAIAction({ operation: 'one-page' });
  const scrollRef = useScrollFade<HTMLDivElement>();

  const TemplateComponent = useMemo(() => {
    const tid = (currentResume?.templateId || selectedTemplate) as keyof typeof templateComponents;
    return templateComponents[tid] || templateComponents.modern;
  }, [currentResume?.templateId, selectedTemplate]);

  // Keep measurement live as the resume / customization changes
  useEffect(() => {
    if (!open || !exportApi.isReady) return;
    const m = exportApi.measure();
    if (m) setMeasurement(m);
  }, [open, exportApi.isReady, exportApi, currentResume]);

  // Reset on close
  useEffect(() => {
    if (open) return;
    setView('levers');
    setResult(null);
    setMeasurement(null);
    setPostApplyMeasurement(null);
    setSelection({ summary: true, experiences: new Set() });
    setTightenRequested(false);
    previousResumeRef.current = null;
  }, [open]);

  const customization = currentResume?.customization || getDefaultCustomization();

  const updateCustomization = useCallback((patch: Partial<TemplateCustomization>) => {
    if (!currentResume) return;
    updateResume({ customization: { ...customization, ...patch } });
    haptics.light?.();
  }, [currentResume, customization, updateResume]);

  const handleAnalyze = useCallback(async (tighten: boolean = false) => {
    if (!currentResume) {
      toast.error('Please create a resume first');
      return;
    }

    haptics.medium?.();
    setView('analyzing');
    setAnalyzeStage('measuring');
    setTightenRequested(tighten);

    try {
      // Stage 1: measure
      // (already measured live; refresh once more for honesty)
      let liveMeasurement = exportApi.measure();
      if (!liveMeasurement) {
        await new Promise(r => setTimeout(r, 200));
        liveMeasurement = exportApi.measure();
      }
      if (liveMeasurement) setMeasurement(liveMeasurement);

      setAnalyzeStage('asking-ai');

      const targetRole = inferTargetRole(currentResume, jobDescription);
      const yearsOfExperience = computeYearsOfExperience(currentResume);

      const data = await executeAI(async () => {
        const { data, error } = await edgeFunctions.functions.invoke('one-page-optimizer', {
          body: {
            resume: currentResume,
            preserveRecent: 2,
            targetRole,
            yearsOfExperience,
            templateId: currentResume.templateId || selectedTemplate,
            currentPagesMeasured: liveMeasurement?.pages,
            tighten,
          },
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Optimization failed');
        return data;
      });

      if (!data) { setView('levers'); return; }

      setAnalyzeStage('validating');
      // brief pause so the user actually sees the validation step
      await new Promise(r => setTimeout(r, 200));

      setResult(data as OnePageResult);
      // Default-select all experience condensations
      setSelection({
        summary: !!data.condensedSummary,
        experiences: new Set((data.condensedExperience || []).map((c: CondensedExperience) => c.id)),
      });
      setView('results');
    } catch (err: unknown) {
      console.error('One-page optimization error:', err);
      const msg = (err instanceof Error && err.message) ? err.message : 'Failed to analyze. Please try again.';
      toast.error(msg);
      setView('levers');
    }
  }, [currentResume, executeAI, exportApi, jobDescription, selectedTemplate]);

  const handleUndo = useCallback(() => {
    const prev = previousResumeRef.current;
    if (!prev) return;
    setCurrentResume(prev);
    previousResumeRef.current = null;
    setPostApplyMeasurement(null);
    toast.success('Reverted to previous version');
  }, [setCurrentResume]);

  const applySelected = useCallback(async (download: boolean) => {
    if (!currentResume || !result) return;
    setIsApplying(true);
    try {
      // 1) snapshot for undo (in-memory) and persisted (DB), best-effort
      previousResumeRef.current = currentResume;
      if (currentResumeId) {
        try {
          await saveVersion.mutateAsync({
            resumeId: currentResumeId,
            snapshot: currentResume,
            changeSummary: 'Auto-snapshot before One-Page Wizard apply',
          });
        } catch (e) {
          console.warn('[OnePageWizard] snapshot failed (non-blocking)', e);
        }
      }

      // 2) Apply the selected changes
      const merged = applySelectiveChanges(currentResume, result, selection);
      updateResume(merged);
      haptics.success?.();

      // 3) Re-measure after the offscreen template repaints
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const m = exportApi.measure();
        if (m) {
          setPostApplyMeasurement(m);
          if (m.pages > 1) {
            toast.warning(`Still ~${m.pages} pages — try Tighten or adjust layout levers.`);
          } else {
            toast.success('Resume condensed to one page!', {
              action: { label: 'Undo', onClick: handleUndo },
              duration: 8000,
            });
          }
        } else {
          toast.success('Changes applied', {
            action: { label: 'Undo', onClick: handleUndo },
            duration: 8000,
          });
        }
      }));

      // 4) Optional immediate download
      if (download) {
        try {
          // small delay so the offscreen template paints the merged content
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
          const blob = await exportApi.exportOnePagePdf();
          const baseName = (merged.contactInfo.fullName || 'Resume').replace(/\s+/g, '_');
          await downloadFile({ blob, fileName: `${baseName}_OnePage.pdf` });
        } catch (e) {
          console.error('[OnePageWizard] one-page export failed', e);
          toast.error('Apply succeeded but PDF export failed. Try Download from the Export menu.');
        }
      }

      onOpenChange(false);
    } finally {
      setIsApplying(false);
    }
  }, [currentResume, currentResumeId, exportApi, handleUndo, onOpenChange, result, saveVersion, selection, updateResume]);

  const handleSelectAll = () => {
    if (!result) return;
    setSelection({
      summary: !!result.condensedSummary,
      experiences: new Set(result.condensedExperience.map(c => c.id)),
    });
  };
  const handleSelectNone = () => setSelection({ summary: false, experiences: new Set() });

  const toggleExpSelection = (id: string) => {
    setSelection(prev => {
      const next = new Set(prev.experiences);
      if (next.has(id)) next.delete(id); else next.add(id);
      return { ...prev, experiences: next };
    });
  };

  const selectedCount = (selection.summary ? 1 : 0) + selection.experiences.size;

  const totalWordsRemoved = useMemo(() => {
    if (!result) return 0;
    return (result.reductions || []).reduce((sum, r) => sum + (r.wordsRemoved || 0), 0);
  }, [result]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92dvh] flex flex-col p-0">
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-border shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            One-Page Wizard
            {measurement && (
              <Badge variant="outline" className="ml-2 text-xs font-mono">
                {measurement.pages} {measurement.pages === 1 ? 'page' : 'pages'} now
              </Badge>
            )}
          </SheetTitle>
          <AIProviderVia className="mt-0.5" />
        </SheetHeader>

        {/* Hidden offscreen full-size render — used for measurement + capture. */}
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

        <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 ai-output-scroll-fade">
          <AnimatePresence mode="wait">
            {/* ── Levers / Analyze entry ─────────────────────────────────── */}
            {view === 'levers' && (
              <motion.div
                key="levers"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-4 space-y-5"
              >
                <div className="text-center pt-2 pb-1">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Scissors className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">Get to one page</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    {measurement?.pages && measurement.pages > 1
                      ? `Your resume currently fills about ${measurement.pages} pages. Try a quick layout tweak first — many resumes fit by adjusting margins or font size alone.`
                      : 'Your resume already fits on one page. You can still re-tighten or use AI to trim further.'}
                  </p>
                </div>

                {/* Layout levers panel */}
                <LeversPanel customization={customization} onChange={updateCustomization} />

                {measurement && (
                  <FitMeter measurement={measurement} />
                )}

                <div className="p-3 rounded-xl bg-warning/10 border border-warning/30">
                  <p className="text-sm text-warning-foreground flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    Heavier reductions (rewriting summary / older roles) require AI. You'll review every change before applying.
                  </p>
                </div>
              </motion.div>
            )}

            {/* ── Analyzing — 3-stage progress ───────────────────────────── */}
            {view === 'analyzing' && (
              <motion.div
                key="analyzing"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="p-8 flex-1 flex flex-col items-center justify-center text-center"
              >
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Scissors className="w-10 h-10 text-primary animate-pulse" />
                </div>
                <h3 className="text-lg font-semibold mb-1">{STAGE_LABEL[analyzeStage]}</h3>
                <p className="text-sm text-muted-foreground max-w-xs mb-5">
                  Step {analyzeStage === 'measuring' ? 1 : analyzeStage === 'asking-ai' ? 2 : 3} of 3
                </p>
                <div className="w-full max-w-xs">
                  <Progress value={STAGE_PCT[analyzeStage]} className="h-2" />
                  <div className="flex justify-between mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <span className={cn(analyzeStage === 'measuring' && 'text-primary font-semibold')}>Measure</span>
                    <span className={cn(analyzeStage === 'asking-ai' && 'text-primary font-semibold')}>AI</span>
                    <span className={cn(analyzeStage === 'validating' && 'text-primary font-semibold')}>Validate</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Results — diff cards, mini preview, etc. ───────────────── */}
            {view === 'results' && result && currentResume && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-4 space-y-5"
              >
                {/* Honest reduction visualization */}
                <ReductionViz
                  current={measurement?.pages ?? result.currentEstimatedPages}
                  postApply={postApplyMeasurement?.pages}
                  wordsRemoved={totalWordsRemoved}
                  removedItems={result.removedItems?.length || 0}
                />

                {/* Mini live preview */}
                {currentResume && (
                  <MiniPreview resume={currentResume} TemplateComponent={TemplateComponent} />
                )}

                {/* Strategy */}
                <div className="p-4 rounded-xl bg-muted border border-border">
                  <p className="text-sm font-medium mb-1 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    AI Strategy
                  </p>
                  <p className="text-sm text-muted-foreground">{result.overallStrategy}</p>
                </div>

                {/* Selection toolbar */}
                <div className="flex items-center justify-between pt-1">
                  <p className="text-sm font-semibold">
                    Per-section changes
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {selectedCount} selected
                    </span>
                  </p>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleSelectAll}>All</Button>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleSelectNone}>None</Button>
                  </div>
                </div>

                {/* Summary diff card */}
                {result.condensedSummary && result.condensedSummary !== currentResume.summary && (
                  <SectionDiffCard
                    title="Summary"
                    selected={selection.summary}
                    onToggle={() => setSelection(prev => ({ ...prev, summary: !prev.summary }))}
                    before={currentResume.summary}
                    after={result.condensedSummary}
                  />
                )}

                {/* Experience diff cards */}
                {result.condensedExperience.map(c => {
                  const orig = currentResume.experience.find(e => e.id === c.id);
                  if (!orig) return null;
                  if (orig.description === c.description &&
                      orig.achievements.join('\n') === c.achievements.join('\n')) return null;
                  return (
                    <ExperienceDiffCard
                      key={c.id}
                      title={`${orig.position} · ${orig.company}`}
                      selected={selection.experiences.has(c.id)}
                      onToggle={() => toggleExpSelection(c.id)}
                      origDescription={orig.description}
                      newDescription={c.description}
                      origAchievements={orig.achievements}
                      newAchievements={c.achievements}
                    />
                  );
                })}

                {/* Removed items (advisory only) */}
                {result.removedItems && result.removedItems.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-warning" />
                      AI Suggests Removing
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      These are advisory — the wizard does not delete sections automatically. Use the editor to drop them.
                    </p>
                    {result.removedItems.map((item, i) => (
                      <div key={i} className="p-3 rounded-xl bg-warning/5 border border-warning/20">
                        <Badge variant="outline" className="capitalize text-[10px] mb-1">{item.section}</Badge>
                        <p className="text-sm font-medium truncate" title={item.item}>{item.item}</p>
                        <p className="text-xs text-muted-foreground mt-1">{item.reason}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Layout suggestions */}
                {result.layoutSuggestions && result.layoutSuggestions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Layout className="w-4 h-4 text-primary" />
                      Layout Tips
                    </h4>
                    {result.layoutSuggestions.map((tip, i) => (
                      <div key={i} className="p-3 rounded-xl bg-primary/5 border border-primary/10 text-sm">
                        {tip}
                      </div>
                    ))}
                  </div>
                )}

                {/* Compare full-screen handoff */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowCompare(true)}
                >
                  <GitCompare className="w-4 h-4 mr-2" />
                  Open full-screen Compare
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <div className="p-4 border-t border-border shrink-0 space-y-2">
          {view === 'levers' && (
            <>
              <Button
                className="w-full"
                onClick={() => handleAnalyze(false)}
                disabled={!currentResume || !exportApi.isReady}
              >
                <Scissors className="w-4 h-4 mr-2" />
                Analyze with AI
              </Button>
              <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </>
          )}

          {view === 'results' && result && (
            <>
              <Button
                className="w-full"
                onClick={() => applySelected(true)}
                disabled={isApplying}
              >
                {isApplying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                {selectedCount > 0
                  ? `Apply ${selectedCount} & Download One-Page PDF`
                  : 'Download One-Page PDF (layout only)'}
              </Button>
              {selectedCount > 0 && (
                <Button variant="outline" className="w-full" onClick={() => applySelected(false)} disabled={isApplying}>
                  {isApplying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                  Apply Only
                </Button>
              )}
              {!tightenRequested && (
                <Button variant="ghost" className="w-full" onClick={() => handleAnalyze(true)} disabled={isApplying}>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Tighten further
                </Button>
              )}
              {previousResumeRef.current && (
                <Button variant="ghost" className="w-full" onClick={handleUndo} disabled={isApplying}>
                  <Undo2 className="w-4 h-4 mr-2" />
                  Undo last apply
                </Button>
              )}
              <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)} disabled={isApplying}>
                Close
              </Button>
            </>
          )}
        </div>
      </SheetContent>

      {/* Full-screen compare hand-off (reuses existing CompareSheet) */}
      {showCompare && result && currentResume && (
        <CompareSheet
          open={showCompare}
          onOpenChange={setShowCompare}
          originalResume={currentResume}
          tailorResult={toCompareTailorResult(currentResume, result, selection)}
          onApplyChanges={() => applySelected(false)}
        />
      )}
    </Sheet>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function LeversPanel({
  customization,
  onChange,
}: {
  customization: TemplateCustomization;
  onChange: (patch: Partial<TemplateCustomization>) => void;
}) {
  return (
    <div className="p-4 rounded-xl border border-border bg-muted/40 space-y-4">
      <div className="flex items-center gap-2">
        <Layout className="w-4 h-4 text-primary" />
        <p className="text-sm font-semibold">Quick layout levers</p>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        These apply instantly to your resume — no AI required. The page count badge above updates as you change them.
      </p>

      <Lever label="Margins">
        <ToggleGroup
          type="single"
          value={customization.margins}
          onValueChange={(v) => v && onChange({ margins: v as TemplateCustomization['margins'] })}
          className="justify-start"
        >
          <ToggleGroupItem value="narrow" className="text-xs h-8 px-3">Narrow</ToggleGroupItem>
          <ToggleGroupItem value="normal" className="text-xs h-8 px-3">Normal</ToggleGroupItem>
          <ToggleGroupItem value="wide" className="text-xs h-8 px-3">Wide</ToggleGroupItem>
        </ToggleGroup>
      </Lever>

      <Lever label="Spacing">
        <ToggleGroup
          type="single"
          value={customization.spacing}
          onValueChange={(v) => v && onChange({ spacing: v as TemplateCustomization['spacing'] })}
          className="justify-start"
        >
          <ToggleGroupItem value="compact" className="text-xs h-8 px-3">Compact</ToggleGroupItem>
          <ToggleGroupItem value="normal" className="text-xs h-8 px-3">Normal</ToggleGroupItem>
          <ToggleGroupItem value="spacious" className="text-xs h-8 px-3">Spacious</ToggleGroupItem>
        </ToggleGroup>
      </Lever>

      <Lever label="Font size">
        <ToggleGroup
          type="single"
          value={customization.fontSize}
          onValueChange={(v) => v && onChange({ fontSize: v as TemplateCustomization['fontSize'] })}
          className="justify-start"
        >
          <ToggleGroupItem value="small" className="text-xs h-8 px-3">S</ToggleGroupItem>
          <ToggleGroupItem value="medium" className="text-xs h-8 px-3">M</ToggleGroupItem>
          <ToggleGroupItem value="large" className="text-xs h-8 px-3">L</ToggleGroupItem>
        </ToggleGroup>
      </Lever>

      <Lever label="Line height">
        <ToggleGroup
          type="single"
          value={customization.lineHeight}
          onValueChange={(v) => v && onChange({ lineHeight: v as TemplateCustomization['lineHeight'] })}
          className="justify-start"
        >
          <ToggleGroupItem value="single" className="text-xs h-8 px-3">1.0</ToggleGroupItem>
          <ToggleGroupItem value="1.15" className="text-xs h-8 px-3">1.15</ToggleGroupItem>
          <ToggleGroupItem value="1.5" className="text-xs h-8 px-3">1.5</ToggleGroupItem>
        </ToggleGroup>
      </Lever>
    </div>
  );
}

function Lever({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-medium text-muted-foreground w-20 shrink-0">{label}</span>
      <div className="flex-1 overflow-x-auto">{children}</div>
    </div>
  );
}

function FitMeter({ measurement }: { measurement: OnePageMeasurement }) {
  const fitPct = Math.round(measurement.fitScale * 100);
  const fits = measurement.pages === 1;
  return (
    <div className={cn(
      'p-3 rounded-xl border text-sm',
      fits ? 'bg-success/10 border-success/30' : 'bg-warning/10 border-warning/30'
    )}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium">{fits ? 'Fits on one page ✓' : `Currently ${measurement.pages} pages`}</span>
        {!fits && (
          <Badge variant="outline" className="text-[10px] font-mono">
            need to shrink to {fitPct}%
          </Badge>
        )}
      </div>
      <Progress value={fits ? 100 : Math.max(5, fitPct)} className="h-1.5" />
    </div>
  );
}

function ReductionViz({
  current, postApply, wordsRemoved, removedItems,
}: {
  current: number;
  postApply?: number;
  wordsRemoved: number;
  removedItems: number;
}) {
  return (
    <div className="p-4 rounded-2xl bg-success/5 border border-success/20 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Projected reduction</span>
        <Badge variant="outline" className="font-mono text-xs">
          {current} → {postApply ?? 1} {(postApply ?? 1) === 1 ? 'page' : 'pages'}
        </Badge>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Words trimmed" value={wordsRemoved.toString()} />
        <Stat label="Items flagged" value={removedItems.toString()} />
        <Stat label="Pages now" value={String(postApply ?? current)} accent={postApply != null} />
      </div>
      {postApply != null && postApply > 1 && (
        <p className="text-xs text-warning-foreground flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          Still {postApply} pages after apply. Try Tighten further or adjust the layout levers.
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-card rounded-lg p-2 border border-border">
      <div className={cn('text-lg font-bold leading-none', accent && 'text-success')}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function MiniPreview({
  resume, TemplateComponent,
}: {
  resume: ResumeData;
  TemplateComponent: React.ComponentType<{ resume: ResumeData; accentColor?: string }>;
}) {
  const SCALE = 0.32;
  return (
    <div className="rounded-xl border border-border bg-muted overflow-hidden">
      <div className="px-3 py-1.5 flex items-center justify-between border-b border-border bg-card">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Live preview</span>
        <span className="text-[10px] text-muted-foreground">scale {Math.round(SCALE * 100)}%</span>
      </div>
      <div
        className="overflow-hidden bg-white mx-auto"
        style={{ width: `${612 * SCALE}px`, height: `${792 * SCALE}px` }}
      >
        <div
          className="origin-top-left bg-white"
          style={{ transform: `scale(${SCALE})`, width: '612px', minHeight: '792px' }}
        >
          {resume.customization && <style>{generateCustomizationCSS(resume.customization)}</style>}
          <Suspense fallback={null}>
            <TemplateComponent resume={resume} accentColor={resume.customization?.accentColor} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

function SectionDiffCard({
  title, selected, onToggle, before, after,
}: {
  title: string; selected: boolean; onToggle: () => void; before: string; after: string;
}) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div className={cn('rounded-xl border', selected ? 'border-primary/40 bg-primary/5' : 'border-border bg-card')}>
      <div className="flex items-center gap-2 p-3">
        <Checkbox checked={selected} onCheckedChange={onToggle} />
        <button onClick={() => setExpanded(e => !e)} className="flex-1 flex items-center justify-between text-left">
          <span className="text-sm font-medium">{title}</span>
          <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', expanded && 'rotate-180')} />
        </button>
      </div>
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-2">
            <p className="text-[10px] uppercase tracking-wider text-destructive mb-1">Before</p>
            <p className="text-xs text-destructive line-through">{before}</p>
          </div>
          <div className="rounded-md bg-success/10 border border-success/20 p-2">
            <p className="text-[10px] uppercase tracking-wider text-success mb-1">After</p>
            <p className="text-xs">{after}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ExperienceDiffCard({
  title, selected, onToggle, origDescription, newDescription, origAchievements, newAchievements,
}: {
  title: string;
  selected: boolean;
  onToggle: () => void;
  origDescription: string;
  newDescription: string;
  origAchievements: string[];
  newAchievements: string[];
}) {
  const [expanded, setExpanded] = useState(false);
  const removedAchievements = origAchievements.filter(a => !newAchievements.includes(a));
  return (
    <div className={cn('rounded-xl border', selected ? 'border-primary/40 bg-primary/5' : 'border-border bg-card')}>
      <div className="flex items-center gap-2 p-3">
        <Checkbox checked={selected} onCheckedChange={onToggle} />
        <button onClick={() => setExpanded(e => !e)} className="flex-1 flex items-center justify-between text-left">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{title}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {removedAchievements.length > 0
                ? `${removedAchievements.length} bullet${removedAchievements.length === 1 ? '' : 's'} removed`
                : 'description rewritten'}
            </p>
          </div>
          <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform shrink-0 ml-2', expanded && 'rotate-180')} />
        </button>
      </div>
      {expanded && (
        <div className="px-3 pb-3 space-y-3">
          {origDescription !== newDescription && (
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Description</p>
              <div className="rounded-md bg-destructive/5 border border-destructive/20 p-2">
                <p className="text-xs text-destructive line-through">{origDescription}</p>
              </div>
              <div className="rounded-md bg-success/5 border border-success/20 p-2">
                <p className="text-xs">{newDescription}</p>
              </div>
            </div>
          )}
          {removedAchievements.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Removed bullets</p>
              <ul className="space-y-1">
                {removedAchievements.map((a, i) => (
                  <li key={i} className="text-xs text-destructive line-through pl-2 border-l-2 border-destructive/30">{a}</li>
                ))}
              </ul>
            </div>
          )}
          {newAchievements.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Final bullets</p>
              <ul className="space-y-1">
                {newAchievements.map((a, i) => (
                  <li key={i} className="text-xs pl-2 border-l-2 border-success/40">{a}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
