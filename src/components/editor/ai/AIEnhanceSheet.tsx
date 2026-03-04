import { useState, useCallback, useEffect } from 'react';
import { Sparkles, Loader2, Check, X, ArrowRight, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle } from 'lucide-react';
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

const ALL_SECTIONS: { id: SectionType; label: string; key: string }[] = [
  { id: 'summary', label: 'Summary', key: 'summary' },
  { id: 'experience', label: 'Experience', key: 'experience' },
  { id: 'skills', label: 'Skills', key: 'skills' },
  { id: 'education', label: 'Education', key: 'education' },
  { id: 'certifications', label: 'Certifications', key: 'certifications' },
  { id: 'awards', label: 'Awards', key: 'awards' },
  { id: 'projects', label: 'Projects', key: 'projects' },
  { id: 'publications', label: 'Publications', key: 'publications' },
  { id: 'volunteering', label: 'Volunteering', key: 'volunteering' },
  { id: 'languages', label: 'Languages', key: 'languages' },
];

interface SectionResult {
  section: SectionType;
  label: string;
  original: unknown;
  improved: unknown;
  rawImproved: unknown;
  changes: string[];
  suggestions?: string[];
  applied: boolean;
  warning?: string;
}

// --- Section-aware formatting helpers ---

function formatExperiencePreview(entries: unknown[]): string {
  return entries.map((e: any) => {
    const pos = e.position || e.title || 'Untitled Role';
    const comp = e.company || e.account || '';
    const desc = typeof e.description === 'string' ? e.description.slice(0, 80) : '';
    const bullets = Array.isArray(e.achievements) ? e.achievements.length : 0;
    const resp = Array.isArray(e.responsibilities) ? e.responsibilities.length : 0;
    const bulletCount = bullets + resp;
    let line = comp ? `${pos} at ${comp}` : pos;
    if (desc) line += ` — ${desc}${desc.length >= 80 ? '…' : ''}`;
    if (bulletCount > 0) line += ` (${bulletCount} bullet${bulletCount !== 1 ? 's' : ''})`;
    return line;
  }).join('\n\n');
}

function formatEducationPreview(entries: unknown[]): string {
  return entries.map((e: any) => {
    const degree = e.degree || '';
    const field = e.field || '';
    const inst = e.institution || '';
    const parts = [degree, field].filter(Boolean).join(' in ');
    return inst ? `${parts} at ${inst}` : parts || 'Education entry';
  }).join('\n\n');
}

function formatSkillsPreview(skills: unknown[]): string {
  return skills.map((s: any) => typeof s === 'string' ? s : s?.name || String(s)).join(', ');
}

function formatSectionContent(sectionId: SectionType, content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content) || content.length === 0) return '(empty)';
  switch (sectionId) {
    case 'experience': return formatExperiencePreview(content);
    case 'education': return formatEducationPreview(content);
    case 'skills': return formatSkillsPreview(content);
    case 'certifications': return content.map((c: any) => `${c.name || 'Cert'} — ${c.issuer || ''}`).join('\n');
    case 'awards': return content.map((a: any) => `${a.title || 'Award'} — ${a.issuer || ''}`).join('\n');
    case 'projects': return content.map((p: any) => `${p.name || 'Project'} — ${(p.description || '').slice(0, 60)}`).join('\n');
    case 'publications': return content.map((p: any) => `${p.title || 'Publication'} — ${p.publisher || ''}`).join('\n');
    case 'volunteering': return content.map((v: any) => `${v.role || 'Role'} at ${v.organization || ''}`).join('\n');
    case 'languages': return content.map((l: any) => `${l.name || 'Language'} (${l.proficiency || ''})`).join(', ');
    default: return content.map(String).join(', ');
  }
}

// --- Structured diff cards for experience/education ---

function ExperienceCard({ entry, variant }: { entry: any; variant: 'original' | 'enhanced' }) {
  const pos = entry.position || entry.title || 'Untitled';
  const comp = entry.company || entry.account || '';
  const desc = typeof entry.description === 'string' ? entry.description : '';
  const achievements = Array.isArray(entry.achievements) ? entry.achievements : [];
  const responsibilities = Array.isArray(entry.responsibilities) ? entry.responsibilities : [];

  return (
    <div className={cn(
      "p-2.5 rounded-lg text-xs space-y-1",
      variant === 'original' ? "bg-muted/50 opacity-70" : "bg-primary/5 border border-primary/20"
    )}>
      <p className="font-semibold">{pos}{comp ? ` at ${comp}` : ''}</p>
      {desc && <p className="text-muted-foreground line-clamp-2">{desc}</p>}
      {achievements.length > 0 && (
        <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
          {achievements.slice(0, 3).map((a: string, i: number) => (
            <li key={i} className="line-clamp-1">{a}</li>
          ))}
          {achievements.length > 3 && <li className="text-muted-foreground/60">+{achievements.length - 3} more</li>}
        </ul>
      )}
      {responsibilities.length > 0 && (
        <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
          {responsibilities.slice(0, 3).map((r: string, i: number) => (
            <li key={i} className="line-clamp-1">{r}</li>
          ))}
          {responsibilities.length > 3 && <li className="text-muted-foreground/60">+{responsibilities.length - 3} more</li>}
        </ul>
      )}
    </div>
  );
}

function EducationCard({ entry, variant }: { entry: any; variant: 'original' | 'enhanced' }) {
  const degree = entry.degree || '';
  const field = entry.field || '';
  const inst = entry.institution || '';
  return (
    <div className={cn(
      "p-2.5 rounded-lg text-xs space-y-0.5",
      variant === 'original' ? "bg-muted/50 opacity-70" : "bg-primary/5 border border-primary/20"
    )}>
      <p className="font-semibold">{degree}{field ? ` in ${field}` : ''}</p>
      {inst && <p className="text-muted-foreground">{inst}</p>}
    </div>
  );
}

// --- Main helpers ---

function getSectionContent(resume: Record<string, unknown>, sectionId: SectionType): unknown {
  switch (sectionId) {
    case 'summary': return resume.summary || '';
    case 'experience': return resume.experience || [];
    case 'skills': return resume.skills || [];
    case 'education': return resume.education || [];
    case 'certifications': return resume.certifications || [];
    case 'awards': return resume.awards || [];
    case 'projects': return resume.projects || [];
    case 'publications': return resume.publications || [];
    case 'volunteering': return resume.volunteering || [];
    case 'languages': return resume.languages || [];
    default: return '';
  }
}

function sectionHasContent(resume: Record<string, unknown>, sectionId: SectionType): boolean {
  const content = getSectionContent(resume, sectionId);
  if (typeof content === 'string') return content.trim().length > 0;
  if (Array.isArray(content)) return content.length > 0;
  return false;
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

    for (const sectionInfo of ALL_SECTIONS) {
      if (!selectedSections.has(sectionInfo.id)) continue;

      const content = getSectionContent(currentResume as unknown as Record<string, unknown>, sectionInfo.id);

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) throw new Error('No session – please sign in');

        const CLOUD_URL = import.meta.env.VITE_SUPABASE_URL || 'https://hjnnamwgztlhzkeuufln.supabase.co';
        const CLOUD_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhqbm5hbXdnenRsaHprZXV1ZmxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNTE4MTcsImV4cCI6MjA4NTkyNzgxN30.cupd_dz6KHSJaBnUPQzJmQcYc38RTDVIMU5RP25xCso';

        const res = await fetch(`${CLOUD_URL}/functions/v1/enhance-section`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': CLOUD_KEY,
          },
          body: JSON.stringify({
            section: sectionInfo.id,
            action: effectiveAction,
            currentContent: content,
            context: { resume: currentResume },
          }),
        });

        if (!res.ok) throw new Error(`Edge function returned ${res.status}`);
        const data = await res.json();
        if (data?.error) {
          toast.error(data.message || `Failed to enhance ${sectionInfo.label}`);
          continue;
        }

        trackGeminiUsage();
        incrementUsage.mutate();

        // Validate entry count for array sections
        let warning: string | undefined;
        if (['experience', 'education'].includes(sectionInfo.id) && Array.isArray(content) && Array.isArray(data.improved)) {
          if (data.improved.length < (content as unknown[]).length) {
            warning = `AI returned ${data.improved.length} entries but original has ${(content as unknown[]).length}. Some entries may be missing.`;
          }
        }

        newResults.push({
          section: sectionInfo.id,
          label: sectionInfo.label,
          original: content,
          improved: data.improved,
          rawImproved: data.improved,
          changes: data.changes || [],
          suggestions: data.suggestions,
          applied: false,
          warning,
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

      // Warn if entry count mismatch
      if ((data as unknown[]).length < originals.length) {
        toast.warning(`AI returned fewer entries (${(data as unknown[]).length} vs ${originals.length}). Missing entries are preserved from your original.`);
        // Append missing originals
        const aiIds = new Set((data as Record<string, unknown>[]).map(e => e.id));
        const missing = originals.filter(o => !aiIds.has(o.id));
        data = [...(data as Record<string, unknown>[]), ...missing];
      }

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

      if ((data as unknown[]).length < originals.length) {
        toast.warning(`AI returned fewer entries (${(data as unknown[]).length} vs ${originals.length}). Missing entries are preserved.`);
        const aiIds = new Set((data as Record<string, unknown>[]).map(e => e.id));
        const missing = originals.filter(o => !aiIds.has(o.id));
        data = [...(data as Record<string, unknown>[]), ...missing];
      }

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

  const enabledSections = ALL_SECTIONS.filter(s =>
    currentResume && sectionHasContent(currentResume as unknown as Record<string, unknown>, s.id) &&
    !disabledSections?.has(s.id)
  );

  const disabledSectionsList = ALL_SECTIONS.filter(s =>
    currentResume && sectionHasContent(currentResume as unknown as Record<string, unknown>, s.id) &&
    disabledSections?.has(s.id)
  );

  const availableSections = enabledSections;

  const sheetTitle = atsMode ? 'ATS Score Optimization' : 'AI Enhance';

  // Render structured before/after for experience/education, plain text for others
  const renderSectionPreview = (sectionId: SectionType, content: unknown, variant: 'original' | 'enhanced') => {
    if (sectionId === 'experience' && Array.isArray(content)) {
      return (
        <div className="space-y-2">
          {content.map((entry: any, i: number) => (
            <ExperienceCard key={entry?.id || i} entry={entry} variant={variant} />
          ))}
        </div>
      );
    }
    if (sectionId === 'education' && Array.isArray(content)) {
      return (
        <div className="space-y-2">
          {content.map((entry: any, i: number) => (
            <EducationCard key={entry?.id || i} entry={entry} variant={variant} />
          ))}
        </div>
      );
    }
    // For summary/skills: readable text
    const text = formatSectionContent(sectionId, content);
    const maxLen = variant === 'original' ? 300 : 500;
    return (
      <div className={cn(
        "p-2.5 rounded-lg text-xs max-h-32 overflow-y-auto whitespace-pre-wrap",
        variant === 'original' ? "bg-muted/50 line-through opacity-60" : "bg-primary/5 border border-primary/20"
      )}>
        {text.slice(0, maxLen)}{text.length > maxLen ? '…' : ''}
      </div>
    );
  };

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
                            {r.warning && (
                              <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
                            )}
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                          )}
                        </button>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
                          {r.warning && (
                            <div className="flex items-start gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-700 dark:text-yellow-400">
                              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                              <span>{r.warning}</span>
                            </div>
                          )}

                          <div className="space-y-2">
                            <div>
                              <p className="text-[10px] font-medium text-muted-foreground mb-1">Original</p>
                              {renderSectionPreview(r.section, r.original, 'original')}
                            </div>
                            <div className="flex justify-center">
                              <ArrowRight className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <div>
                              <p className="text-[10px] font-medium text-primary mb-1">Enhanced</p>
                              {renderSectionPreview(r.section, r.improved, 'enhanced')}
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
