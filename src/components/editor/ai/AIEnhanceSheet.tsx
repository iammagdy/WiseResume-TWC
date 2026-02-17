import { useState, useCallback } from 'react';
import { Sparkles, Loader2, Check, X, ArrowRight } from 'lucide-react';
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
import type { ActionType, SectionType } from '@/hooks/useAIEnhance';

interface AIEnhanceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnhanced?: () => void;
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

function contentToString(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return JSON.stringify(content, null, 2).slice(0, 500);
  return String(content);
}

export function AIEnhanceSheet({ open, onOpenChange, onEnhanced }: AIEnhanceSheetProps) {
  const [mode, setMode] = useState<ActionType>('improve');
  const [selectedSections, setSelectedSections] = useState<Set<SectionType>>(new Set());
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [results, setResults] = useState<SectionResult[]>([]);
  const currentResume = useResumeStore(s => s.currentResume);
  const updateResume = useResumeStore(s => s.updateResume);
  const { incrementUsage, checkCredits } = useAICreditsMutations();

  const toggleSection = useCallback((id: SectionType) => {
    haptics.light();
    setSelectedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleEnhance = useCallback(async () => {
    if (!currentResume || selectedSections.size === 0) return;
    setIsEnhancing(true);
    setResults([]);
    haptics.medium();

    const hasCredits = await checkCredits();
    if (!hasCredits) {
      setIsEnhancing(false);
      return;
    }

    const newResults: SectionResult[] = [];

    // Process sections sequentially to respect rate limits
    for (const sectionInfo of SECTIONS) {
      if (!selectedSections.has(sectionInfo.id)) continue;

      const content = getSectionContent(currentResume as unknown as Record<string, unknown>, sectionInfo.id);

      try {
        const { data, error } = await supabase.functions.invoke('enhance-section', {
          body: {
            section: sectionInfo.id,
            action: mode,
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
          original: contentToString(content),
          improved: contentToString(data.improved),
          changes: data.changes || [],
          suggestions: data.suggestions,
          applied: false,
        });

        // Update results progressively
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
  }, [currentResume, selectedSections, mode, checkCredits, incrementUsage]);

  const applyResult = useCallback((index: number) => {
    const result = results[index];
    if (!result || !currentResume) return;
    haptics.medium();

    try {
      let parsed = sanitizeAIContent(JSON.parse(contentToString(results[index].improved)));
      // Sanitize: ensure skills remain string[]
      if (result.section === 'skills' && Array.isArray(parsed)) {
        parsed = parsed.map((s: unknown) => typeof s === 'string' ? s : (s as Record<string, string>)?.name || String(s));
      }
      // Sanitize: ensure experience/education remain arrays
      if ((result.section === 'experience' || result.section === 'education') && !Array.isArray(parsed)) {
        parsed = [];
      }
      updateResume({ [result.section]: parsed });
    } catch {
      // For string sections like summary
      updateResume({ [result.section]: results[index].improved });
    }

    setResults(prev => prev.map((r, i) => i === index ? { ...r, applied: true } : r));
    onEnhanced?.();
    toast.success(`${result.label} updated!`);
  }, [results, currentResume, updateResume]);

  const discardResult = useCallback((index: number) => {
    haptics.light();
    setResults(prev => prev.filter((_, i) => i !== index));
  }, []);

  const availableSections = SECTIONS.filter(s =>
    currentResume && sectionHasContent(currentResume as unknown as Record<string, unknown>, s.id)
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col rounded-t-2xl">
        <SheetHeader className="shrink-0 pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-lg">AI Enhance</SheetTitle>
              <AIProviderVia className="mt-0.5" />
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-5 py-4">
          {/* Mode Selector */}
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
            {availableSections.length === 0 ? (
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
                Enhancing…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Enhance {selectedSections.size > 0 ? `${selectedSections.size} Section${selectedSections.size > 1 ? 's' : ''}` : ''}
              </>
            )}
          </Button>

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-4">
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
              {results.map((r, i) => (
                <div key={`${r.section}-${i}`} className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">{r.label}</h4>
                    {r.applied && (
                      <Badge variant="secondary" className="text-xs bg-accent/20 text-accent-foreground">
                        <Check className="w-3 h-3 mr-1" /> Applied
                      </Badge>
                    )}
                  </div>

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
              ))}
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
