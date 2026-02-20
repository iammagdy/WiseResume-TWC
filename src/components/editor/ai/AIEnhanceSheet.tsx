import { useState, useCallback, useEffect } from 'react';
import { Sparkles, Loader2, Check, X, ArrowRight, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AIProviderVia } from '@/components/editor/ai/AIProviderBadge';
import { useResumeStore } from '@/store/resumeStore';
import { supabase } from '@/integrations/supabase/safeClient';
import { trackGeminiUsage } from '@/lib/aiProvider';
import { useAICreditsMutations } from '@/hooks/useAICredits';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { sanitizeAIContent } from '@/lib/ai/sanitizeContent';
import { AICostBadge } from '@/components/ai/AICostBadge';
import { activityTracker } from '@/lib/activityTracker';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { ActionType, SectionType } from '@/hooks/useAIEnhance';

interface AIEnhanceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnhanced?: (sections?: string[]) => void;
  atsMode?: boolean;
  disabledSections?: Set<string>;
}

const MODES: { id: ActionType; label: string }[] = [
  { id: 'improve', label: 'Improve Writing' },
  { id: 'add_metrics', label: 'Add Metrics' },
  { id: 'generate_bullets', label: 'Power Bullets' },
  { id: 'shorten', label: 'Make Concise' },
  { id: 'expand', label: 'Expand Detail' },
];

const SECTIONS: { id: SectionType; label: string; key: string }[] = [
  { id: 'summary', label: 'Summary', key: 'summary' },
  { id: 'experience', label: 'Experience', key: 'experience' },
  { id: 'skills', label: 'Skills', key: 'skills' },
  { id: 'education', label: 'Education', key: 'education' },
];

interface SectionResult {
  section: SectionType;
  label: string;
  original: string;
  improved: string;
  rawImproved: unknown;
  changes: string[];
  suggestions?: string[];
  applied: boolean;
}

function getSectionContent(resume: Record<string, unknown>, sectionId: SectionType): unknown {
  switch (sectionId) {
    case 'summary': return resume.summary || '';
    case 'experience': return resume.experience || [];
    case 'skills': return resume.skills || [];
    case 'education': return resume.education || [];
    default: return '';
  }
}

function sectionHasContent(resume: Record<string, unknown>, sectionId: SectionType): boolean {
  const content = getSectionContent(resume, sectionId);
  if (typeof content === 'string') return content.trim().length > 0;
  if (Array.isArray(content)) return content.length > 0;
  return false;
}

function contentToPreview(content: unknown, maxLen = 500): string {
  if (typeof content === 'string') return content.slice(0, maxLen);
  if (Array.isArray(content)) return JSON.stringify(content, null, 2).slice(0, maxLen);
  return String(content).slice(0, maxLen);
}

export function AIEnhanceSheet({ open, onOpenChange, onEnhanced, atsMode = false, disabledSections }: AIEnhanceSheetProps) {
  const [mode, setMode] = useState<ActionType>(atsMode ? 'ats_improve' : 'improve');
  const [selectedSections, setSelectedSections] = useState<Set<SectionType>>(new Set());
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [results, setResults] = useState<SectionResult[]>([]);
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set());
  const currentResume = useResumeStore(s => s.currentResume);
  const updateResume = useResumeStore(s => s.updateResume);
  const { incrementUsage, checkCredits } = useAICreditsMutations();

  useEffect(() => {
    if (open) { activityTracker.setActiveFeature('AI Enhance'); }
    return () => { activityTracker.setActiveFeature(null); };
  }, [open]);

  const toggleSection = useCallback((id: SectionType) => {
    haptics.light();
    setSelectedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleResultExpanded = useCallback((index: number) => {
    haptics.light();
    setExpandedResults(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const effectiveAction = atsMode ? 'ats_improve' : mode;

  const handleEnhance = useCallback(async () => {
    if (!currentResume || selectedSections.size === 0) return;
    setIsEnhancing(true);
    setResults([]);
    setExpandedResults(new Set());
    haptics.medium();

    const hasCredits = await checkCredits();
    if (!hasCredits) {
      setIsEnhancing(false);
      return;
    }

    const newResults: SectionResult[] = [];

    for (const sectionInfo of SECTIONS) {
      if (!selectedSections.has(sectionInfo.id)) continue;

      const content = getSectionContent(currentResume as unknown as Record<string, unknown>, sectionInfo.id);

      try {
        const { data, error } = await supabase.functions.invoke('enhance-section', {
          body: {
            section: sectionInfo.id,
            action: effectiveAction,
            currentContent: content,
            context: { resume: currentResume },
          },
        });

        if (error) throw error;
        if (data?.error) {
          toast.error(data.message || `Failed to enhance ${sectionInfo.label}`);
          continue;
        }

        trackGeminiUsage();
        incrementUsage.mutate();

        newResults.push({
          section: sectionInfo.id,
          label: sectionInfo.label,
          original: contentToPreview(content),
          improved: contentToPreview(data.improved),
          rawImproved: data.improved,
          changes: data.changes || [],
          suggestions: data.suggestions,
          applied: false,
        });

        setResults([...newResults]);
      } catch (err) {
        console.error(`Enhancement error for ${sectionInfo.id}:`, err);
        toast.error(`Failed to enhance ${sectionInfo.label}`);
      }
    }

    setIsEnhancing(false);
    if (newResults.length > 0) {
      toast.success(`Enhanced ${newResults.length} section${newResults.length > 1 ? 's' : ''}`);
    }
  }, [currentResume, selectedSections, effectiveAction, checkCredits, incrementUsage]);

  const applyResult = useCallback((index: number) => {
    const result = results[index];
    if (!result || !currentResume) return;
    haptics.medium();

    let data = sanitizeAIContent(result.rawImproved);

    // Repair skills: flatten any objects to strings
    if (result.section === 'skills') {
      if (!Array.isArray(data)) data = currentResume.skills || [];
      data = (data as unknown[]).map((s: unknown) =>
        typeof s === 'string' ? s : (s as Record<string, string>)?.name || String(s)
      );
    }

    // Repair & merge experience: preserve original fields AI may have omitted
    if (result.section === 'experience') {
      if (!Array.isArray(data)) data = [];
      const originals = currentResume.experience || [];
      data = (data as Record<string, unknown>[]).map((aiEntry, i) => {
        const orig = originals.find(o => o.id === (aiEntry.id as string)) || originals[i];
        const base = orig || {} as Record<string, unknown>;
        return {
          ...base,
          ...aiEntry,
          id: (aiEntry.id as string) || (orig?.id) || crypto.randomUUID(),
          current: typeof aiEntry.current === 'boolean' ? aiEntry.current : (orig?.current ?? false),
          description: typeof aiEntry.description === 'string' ? aiEntry.description : (orig?.description || ''),
          achievements: Array.isArray(aiEntry.achievements) ? aiEntry.achievements : (orig?.achievements || []),
          responsibilities: Array.isArray(aiEntry.responsibilities) ? aiEntry.responsibilities : (orig?.responsibilities || []),
        };
      });
    }

    // Repair & merge education: preserve original fields AI may have omitted
    if (result.section === 'education') {
      if (!Array.isArray(data)) data = [];
      const originals = currentResume.education || [];
      data = (data as Record<string, unknown>[]).map((aiEntry, i) => {
        const orig = originals.find(o => o.id === (aiEntry.id as string)) || originals[i];
        const base = orig || {} as Record<string, unknown>;
        return {
          ...base,
          ...aiEntry,
          id: (aiEntry.id as string) || (orig?.id) || crypto.randomUUID(),
          institution: typeof aiEntry.institution === 'string' ? aiEntry.institution : (orig?.institution || ''),
          degree: typeof aiEntry.degree === 'string' ? aiEntry.degree : (orig?.degree || ''),
          field: typeof aiEntry.field === 'string' ? aiEntry.field : (orig?.field || ''),
        };
      });
    }

    updateResume({ [result.section]: data });

    setResults(prev => prev.map((r, i) => i === index ? { ...r, applied: true } : r));
    onEnhanced?.([result.section]);
    toast.success(`${result.label} updated!`);
  }, [results, currentResume, updateResume]);

  const discardResult = useCallback((index: number) => {
    haptics.light();
    setResults(prev => prev.filter((_, i) => i !== index));
  }, []);

  const enabledSections = SECTIONS.filter(s =>
    currentResume && sectionHasContent(currentResume as unknown as Record<string, unknown>, s.id) &&
    !disabledSections?.has(s.id)
  );

  const disabledSectionsList = SECTIONS.filter(s =>
    currentResume && sectionHasContent(currentResume as unknown as Record<string, unknown>, s.id) &&
    disabledSections?.has(s.id)
  );

  const availableSections = enabledSections;

  const sheetTitle = atsMode ? 'ATS Score Optimization' : 'AI Enhance';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col rounded-t-2xl">
        <SheetHeader className="shrink-0 pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-lg flex items-center gap-2">{sheetTitle} <AICostBadge operation="enhance" /></SheetTitle>
              <AIProviderVia className="mt-0.5" />
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-5 py-4">
          {/* Mode Selector - hidden in ATS mode */}
          {!atsMode && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 px-1">Enhancement Mode</p>
              <div className="flex flex-wrap gap-2">
                {MODES.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { haptics.light(); setMode(m.id); }}
                    className={cn(
                      'px-3 py-2 rounded-full text-xs font-medium border transition-all touch-manipulation min-h-[44px]',
                      'active:scale-95',
                      mode === m.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/30 border-border/50 text-muted-foreground hover:border-primary/30'
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {atsMode && (
            <div className="px-1">
              <p className="text-xs text-muted-foreground">
                Optimizing specifically for ATS scoring criteria: completeness, keywords, impact language, and formatting.
              </p>
            </div>
          )}

          {/* Section Selector */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-xs font-medium text-muted-foreground">Sections to Enhance</p>
              {availableSections.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    haptics.light();
                    const allSelected = availableSections.every(s => selectedSections.has(s.id));
                    setSelectedSections(allSelected ? new Set() : new Set(availableSections.map(s => s.id)));
                  }}
                  className="text-xs text-primary font-medium min-h-[44px] min-w-[44px] flex items-center justify-end active:scale-95 transition-transform touch-manipulation"
                >
                  {availableSections.every(s => selectedSections.has(s.id)) ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>
            {availableSections.length === 0 && disabledSectionsList.length === 0 ? (
              <p className="text-sm text-muted-foreground/60 px-1">No sections with content found. Add content to your resume first.</p>
            ) : (
              <div className="space-y-1">
                {availableSections.map(s => (
                  <button
                    key={s.id}
                    onClick={() => toggleSection(s.id)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted/20 transition-colors touch-manipulation min-h-[44px]"
                  >
                    <Checkbox
                      checked={selectedSections.has(s.id)}
                      onCheckedChange={() => toggleSection(s.id)}
                      className="pointer-events-none"
                    />
                    <span className="text-sm font-medium">{s.label}</span>
                  </button>
                ))}
                {disabledSectionsList.map(s => (
                  <div
                    key={s.id}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl opacity-50 cursor-not-allowed min-h-[44px]"
                  >
                    <Checkbox checked={false} disabled className="pointer-events-none" />
                    <span className="text-sm font-medium text-muted-foreground">{s.label}</span>
                    <Badge variant="secondary" className="text-[10px] ml-auto">
                      <CheckCircle2 className="w-3 h-3 mr-0.5" /> Already optimized
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Enhance Button */}
          <Button
            onClick={handleEnhance}
            disabled={selectedSections.size === 0 || isEnhancing}
            className="w-full h-12 gradient-primary text-primary-foreground font-semibold"
          >
            {isEnhancing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {atsMode ? 'Optimizing for ATS…' : 'Enhancing…'}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                {atsMode ? 'Optimize' : 'Enhance'} {selectedSections.size > 0 ? `${selectedSections.size} Section${selectedSections.size > 1 ? 's' : ''}` : ''}
              </>
            )}
          </Button>

          {/* Results - Collapsible */}
          {results.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <p className="text-xs font-medium text-muted-foreground">Results</p>
                {results.some(r => !r.applied) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs min-h-[44px] active:scale-95 transition-transform touch-manipulation"
                    onClick={() => {
                      haptics.medium();
                      results.forEach((r, i) => {
                        if (!r.applied) applyResult(i);
                      });
                    }}
                  >
                    <Check className="w-3.5 h-3.5 mr-1" /> Apply All
                  </Button>
                )}
              </div>
              {results.map((r, i) => {
                const isExpanded = expandedResults.has(i);
                return (
                  <Collapsible key={`${r.section}-${i}`} open={isExpanded} onOpenChange={() => toggleResultExpanded(i)}>
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                      {/* Collapsed header - always visible */}
                      <CollapsibleTrigger asChild>
                        <button className="w-full flex items-center justify-between px-4 py-3 touch-manipulation min-h-[44px] active:scale-[0.98] transition-transform">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-sm">{r.label}</h4>
                            {r.applied ? (
                              <Badge variant="secondary" className="text-[10px] bg-accent/20 text-accent-foreground">
                                <Check className="w-3 h-3 mr-0.5" /> Applied
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px]">
                                {r.changes.length} improvement{r.changes.length !== 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                          )}
                        </button>
                      </CollapsibleTrigger>

                      {/* Expanded content */}
                      <CollapsibleContent>
                        <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
                          <div className="space-y-2">
                            <div>
                              <p className="text-[10px] font-medium text-muted-foreground mb-1">Original</p>
                              <div className="p-2.5 rounded-lg bg-muted/50 text-xs line-through opacity-60 max-h-24 overflow-y-auto">
                                {r.original.slice(0, 300)}{r.original.length > 300 ? '…' : ''}
                              </div>
                            </div>
                            <div className="flex justify-center">
                              <ArrowRight className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <div>
                              <p className="text-[10px] font-medium text-primary mb-1">Enhanced</p>
                              <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-xs max-h-32 overflow-y-auto">
                                {r.improved.slice(0, 500)}{r.improved.length > 500 ? '…' : ''}
                              </div>
                            </div>
                          </div>

                          {r.changes.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {r.changes.map((c, ci) => (
                                <Badge key={ci} variant="secondary" className="text-[10px]">{c}</Badge>
                              ))}
                            </div>
                          )}

                          {r.suggestions && r.suggestions.length > 0 && (
                            <div className="p-2 rounded-lg bg-secondary/10 border border-secondary/20">
                              <p className="text-[10px] font-medium text-secondary mb-1">💡 Tips</p>
                              <ul className="text-[10px] text-muted-foreground space-y-0.5">
                                {r.suggestions.map((s, si) => <li key={si}>• {s}</li>)}
                              </ul>
                            </div>
                          )}

                          {!r.applied && (
                            <div className="flex gap-2 pt-1">
                              <Button variant="outline" size="sm" className="flex-1 min-h-[44px]" onClick={() => discardResult(i)}>
                                <X className="w-4 h-4 mr-1" /> Discard
                              </Button>
                              <Button size="sm" className="flex-1 min-h-[44px] gradient-primary" onClick={() => applyResult(i)}>
                                <Check className="w-4 h-4 mr-1" /> Apply
                              </Button>
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </div>

        {/* Sticky Done button */}
        {results.length > 0 && !isEnhancing && (
          <div className="shrink-0 border-t border-border pt-3 pb-safe">
            <Button
              onClick={() => { haptics.light(); onOpenChange(false); }}
              className="w-full h-12 font-semibold min-h-[48px] active:scale-95 transition-transform touch-manipulation"
              variant="outline"
            >
              Done
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
