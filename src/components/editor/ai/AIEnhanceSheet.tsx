import { useState, useCallback, useEffect, useRef } from 'react';
import { useScrollFade } from '@/hooks/useScrollFade';
import { Sparkles, Loader2, Check, X, ArrowRight, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AIProviderVia } from '@/components/editor/ai/AIProviderBadge';
import { useResumeStore } from '@/store/resumeStore';
import { getSupabaseToken } from '@/lib/supabaseAuth';
import { useAICreditsMutations } from '@/hooks/useAICredits';
import { toast } from 'sonner';
import editorLogger from '@/lib/editorLogger';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { sanitizeAIContent } from '@/lib/ai/sanitizeContent';
import { AICostBadge } from '@/components/ai/AICostBadge';
import { AISheetErrorBoundary } from '@/components/ai/AISheetErrorBoundary';
import { activityTracker } from '@/lib/activityTracker';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { ActionType, SectionType } from '@/hooks/useAIEnhance';
import { useAIAction } from '@/hooks/useAIAction';
import { apiFnUrl } from '@/lib/apiFnUrl';
import { formatDegreeAndField } from '@/lib/educationFormat';
import { AIError, parseAIErrorResponse, parseAIErrorBody, type AIErrorCode } from '@/lib/aiErrorParser';
import {
  mergeAIArrayResult,
  EXPERIENCE_FINGERPRINT,
  EDUCATION_FINGERPRINT,
  PROJECT_FINGERPRINT,
  GENERIC_NAME_FINGERPRINT,
  experienceDefaults,
  educationDefaults,
} from '@/lib/applyAIResult';
import { useAIApplyEffects } from '@/hooks/useAIApplyEffects';

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
  variants?: Array<{ improved: unknown; label: string }>;
  selectedVariantIndex?: number;
  error?: string;
  retrying?: boolean;
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
    const parts = formatDegreeAndField(degree, field);
    return inst ? `${parts || 'Education entry'} at ${inst}` : parts || 'Education entry';
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
      variant === 'original' ? "bg-muted opacity-70" : "bg-primary/5 border border-primary/20"
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
      variant === 'original' ? "bg-muted opacity-70" : "bg-primary/5 border border-primary/20"
    )}>
      <p className="font-semibold">{formatDegreeAndField(degree, field)}</p>
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
  const [variantsMode, setVariantsMode] = useState(false);
  const [selectedSections, setSelectedSections] = useState<Set<SectionType>>(new Set());
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [results, setResults] = useState<SectionResult[]>([]);
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set());
  const [expandedDiffText, setExpandedDiffText] = useState<Set<string>>(new Set());
  const scrollRef = useScrollFade<HTMLDivElement>();
  const currentResume = useResumeStore(s => s.currentResume);
  const updateResume = useResumeStore(s => s.updateResume);
  const { incrementUsage, checkCredits } = useAICreditsMutations();
  const { execute: executeAI } = useAIAction({ operation: 'enhance' });
  const abortRef = useRef(false);

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

  const callEnhanceForSection = useCallback(async (sectionInfo: { id: SectionType; label: string }, content: unknown) => {
    // Use silent mode so per-section errors are re-thrown for the batch
    // classifier (no global "AI temporarily unavailable" toast for transient
    // section failures). Privacy gate + credit cache invalidation still run.
    return executeAI(async () => {
      const token = await getSupabaseToken();
      if (!token) {
        throw new AIError({ code: 'unauthorized', status: 401, message: 'No session' });
      }

      const res = await fetch(apiFnUrl(`enhance-section`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          section: sectionInfo.id,
          action: effectiveAction,
          currentContent: content,
          context: { resume: currentResume },
          ...(variantsMode && !atsMode ? { variants: true } : {}),
        }),
      });

      if (!res.ok) {
        const info = await parseAIErrorResponse(res);
        throw new AIError(info);
      }

      const respData = await res.json();
      if (respData?.error) {
        const info = parseAIErrorBody(respData, 500);
        throw new AIError(info);
      }

      incrementUsage.mutate();
      return respData;
    }, { silent: true });
  }, [executeAI, effectiveAction, currentResume, variantsMode, atsMode, incrementUsage]);

  const buildResultFromData = useCallback((sectionInfo: { id: SectionType; label: string }, content: unknown, data: any): SectionResult => {
    if (data.variants && Array.isArray(data.variants) && data.variants.length > 0) {
      const firstVariant = data.variants[0];
      return {
        section: sectionInfo.id,
        label: sectionInfo.label,
        original: content,
        improved: firstVariant.improved,
        rawImproved: firstVariant.improved,
        changes: data.changes || [],
        suggestions: data.suggestions,
        applied: false,
        variants: data.variants,
        selectedVariantIndex: 0,
      };
    }
    let warning: string | undefined;
    if (['experience', 'education', 'certifications', 'awards', 'projects', 'publications', 'volunteering', 'languages'].includes(sectionInfo.id) && Array.isArray(content) && Array.isArray(data.improved)) {
      if (data.improved.length < (content as unknown[]).length) {
        warning = `AI returned ${data.improved.length} entries but original has ${(content as unknown[]).length}. Some entries may be missing.`;
      }
    }
    return {
      section: sectionInfo.id,
      label: sectionInfo.label,
      original: content,
      improved: sanitizeAIContent(data.improved),
      rawImproved: data.improved,
      changes: data.changes || [],
      suggestions: data.suggestions,
      applied: false,
      warning,
    };
  }, []);

  /** Classify a structured error as fatal (abort batch) or transient (retry / inline error). */
  const classifyError = useCallback((err: unknown): { fatal: boolean; retryable: boolean; userMsg: string; errMsg: string } => {
    if (!navigator.onLine) {
      return { fatal: true, retryable: false, userMsg: "You're offline — AI features need an internet connection.", errMsg: 'offline' };
    }

    // Pull a structured code off the error when possible. Fallback to a coarse
    // string match only when the error is not an AIError (e.g. a thrown
    // network error / TypeError).
    let code: AIErrorCode | 'unknown' = 'unknown';
    let errMsg = '';
    if (err instanceof AIError) {
      code = err.code;
      errMsg = err.message || err.code;
    } else if (err instanceof Error) {
      errMsg = err.message;
      const m = errMsg.toLowerCase();
      if (/timeout|abort/.test(m)) code = 'timeout';
      else if (/network|fetch failed|failed to fetch/.test(m)) code = 'upstream_5xx';
    } else {
      errMsg = String(err ?? '');
    }

    switch (code) {
      case 'unauthorized':
        return { fatal: true, retryable: false, userMsg: 'Session expired — please sign in again to use AI features.', errMsg };
      case 'payment_required':
        return { fatal: true, retryable: false, userMsg: 'AI credits exhausted. Please check your account.', errMsg };
      case 'invalid_key':
        return { fatal: true, retryable: false, userMsg: 'Invalid API key — please check your AI settings.', errMsg };
      case 'not_configured':
        return { fatal: true, retryable: false, userMsg: 'AI is not configured — go to Settings → AI Provider.', errMsg };
      case 'quota_exceeded':
        return { fatal: true, retryable: false, userMsg: 'Daily AI quota exceeded. Try again tomorrow or add your own API key in Settings.', errMsg };
      case 'rate_limit':
        return { fatal: false, retryable: true, userMsg: 'Rate limited — tap Retry in a moment.', errMsg };
      case 'timeout':
      case 'provider_busy':
      case 'upstream_5xx':
      case 'enhancement_failed':
        return { fatal: false, retryable: true, userMsg: 'AI service is temporarily unavailable. Tap Retry.', errMsg };
      default:
        return { fatal: false, retryable: true, userMsg: 'Failed to enhance this section. Tap Retry.', errMsg };
    }
  }, []);

  const tryEnhanceWithRetry = useCallback(async (
    sectionInfo: { id: SectionType; label: string },
    content: unknown,
    maxAttempts = 2
  ): Promise<{ ok: true; data: any } | { ok: false; errMsg: string; classification: ReturnType<typeof classifyError> }> => {
    let lastErr: unknown;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const data = await callEnhanceForSection(sectionInfo, content);
        // null only happens when the privacy disclosure was rejected; treat as
        // a fatal cancellation so the batch stops cleanly without a toast.
        if (!data) {
          const cancellation = { fatal: true, retryable: false, userMsg: 'AI request cancelled.', errMsg: 'cancelled' as string };
          return { ok: false, errMsg: 'cancelled', classification: cancellation };
        }
        return { ok: true, data };
      } catch (err) {
        lastErr = err;
        const classification = classifyError(err);
        // Stop early on fatal or non-retryable errors
        if (classification.fatal || !classification.retryable) {
          return { ok: false, errMsg: classification.errMsg, classification };
        }
        // Backoff before retry (200ms, 800ms)
        if (attempt < maxAttempts - 1) {
          await new Promise(r => setTimeout(r, 200 * Math.pow(4, attempt)));
        }
      }
    }
    const classification = classifyError(lastErr);
    return { ok: false, errMsg: classification.errMsg, classification };
  }, [callEnhanceForSection, classifyError]);

  const retryFailedSection = useCallback(async (index: number) => {
    const target = results[index];
    if (!target || !currentResume) return;
    haptics.light();
    setResults(prev => prev.map((r, i) => i === index ? { ...r, retrying: true, error: undefined } : r));
    const sectionInfo = ALL_SECTIONS.find(s => s.id === target.section)!;
    const content = getSectionContent(currentResume as unknown as Record<string, unknown>, target.section);
    const outcome = await tryEnhanceWithRetry(sectionInfo, content, 2);
    if (outcome.ok) {
      const built = buildResultFromData(sectionInfo, content, outcome.data);
      setResults(prev => prev.map((r, i) => i === index ? built : r));
      toast.success(`${sectionInfo.label} re-enhanced.`);
    } else {
      setResults(prev => prev.map((r, i) => i === index ? { ...r, retrying: false, error: outcome.classification.userMsg } : r));
      if (outcome.classification.fatal) toast.error(outcome.classification.userMsg);
    }
  }, [results, currentResume, tryEnhanceWithRetry, buildResultFromData]);

  const handleEnhance = useCallback(async () => {
    if (!currentResume || selectedSections.size === 0) return;
    setIsEnhancing(true);
    setResults([]);
    setExpandedResults(new Set());
    abortRef.current = false;
    haptics.medium();

    const hasCredits = await checkCredits();
    if (!hasCredits) {
      setIsEnhancing(false);
      return;
    }

    const newResults: SectionResult[] = [];
    let successCount = 0;
    let failCount = 0;

    for (const sectionInfo of ALL_SECTIONS) {
      if (!selectedSections.has(sectionInfo.id)) continue;
      if (abortRef.current) break;

      const content = getSectionContent(currentResume as unknown as Record<string, unknown>, sectionInfo.id);
      const outcome = await tryEnhanceWithRetry(sectionInfo, content, 2);

      if (outcome.ok) {
        newResults.push(buildResultFromData(sectionInfo, content, outcome.data));
        successCount++;
      } else {
        editorLogger.error(`Enhancement error for ${sectionInfo.id}:`, outcome.errMsg);
        if (outcome.classification.fatal) {
          // Show a single fatal toast and stop the batch
          toast.error(outcome.classification.userMsg);
          abortRef.current = true;
          // Still record the failed section as an inline error result so the user can retry later.
          newResults.push({
            section: sectionInfo.id,
            label: sectionInfo.label,
            original: content,
            improved: content,
            rawImproved: content,
            changes: [],
            applied: false,
            error: outcome.classification.userMsg,
          });
          failCount++;
        } else {
          // Transient — keep going, surface inline retry button (no toast spam).
          newResults.push({
            section: sectionInfo.id,
            label: sectionInfo.label,
            original: content,
            improved: content,
            rawImproved: content,
            changes: [],
            applied: false,
            error: outcome.classification.userMsg,
          });
          failCount++;
        }
      }

      setResults([...newResults]);
    }

    setIsEnhancing(false);

    if (successCount > 0 && failCount === 0) {
      toast.success(`Enhanced ${successCount} section${successCount > 1 ? 's' : ''}`);
    } else if (successCount > 0 && failCount > 0) {
      toast.message(`Enhanced ${successCount} of ${successCount + failCount} sections — ${failCount} failed. Tap Retry on the failed ones.`);
    }
  }, [currentResume, selectedSections, checkCredits, tryEnhanceWithRetry, buildResultFromData]);

  const selectVariant = useCallback((resultIndex: number, variantIndex: number) => {
    haptics.light();
    setResults(prev => prev.map((r, i) => {
      if (i !== resultIndex || !r.variants) return r;
      const chosen = r.variants[variantIndex];
      return { ...r, improved: chosen.improved, rawImproved: chosen.improved, selectedVariantIndex: variantIndex };
    }));
  }, []);

  const { rescoreAfterApply } = useAIApplyEffects((currentResume as { id?: string } | null)?.id);

  /**
   * Apply an AI result onto the resume.
   *
   * Three-arg shape:
   *   - `silent` skips the success toast (used by batch flows that want a
   *     single roll-up confirmation).
   *   - `bypassConfirm` is set by the "Apply anyway" toast action so a
   *     second invocation doesn't re-prompt for the same destructive merge.
   *
   * The merge logic itself lives in `mergeAIArrayResult` so every AI sheet
   * uses identical id-preserving / fingerprint-fallback semantics. When the
   * merge would drop originals (`requiresConfirm`), we surface a toast with
   * an explicit "Apply anyway" affordance instead of silently committing.
   */
  // Returns `true` when the section was actually committed onto the
  // resume, `false` when the apply was deferred (e.g. destructive merge
  // awaiting explicit user confirmation) or the call was a no-op. The
  // boolean is what "Apply All" uses to count *successful* applies — a
  // confirmation-gated entry must not be counted as applied.
  const applyResult = useCallback((index: number, silent = false, bypassConfirm = false): boolean => {
    const result = results[index];
    if (!result || !currentResume) return false;
    haptics.medium();

    let data = sanitizeAIContent(result.rawImproved);

    // Skills is a flat string[] — no merge contract to enforce.
    if (result.section === 'skills') {
      if (!Array.isArray(data)) data = currentResume.skills || [];
      data = (data as unknown[]).map((s: unknown) =>
        typeof s === 'string' ? s : (s as Record<string, string>)?.name || String(s),
      );
      updateResume({ [result.section]: data });
      setResults(prev => prev.map((r, i) => (i === index ? { ...r, applied: true } : r)));
      onEnhanced?.([result.section]);
      if (!silent) toast.success(`${result.label} updated!`);
      void rescoreAfterApply({ ...currentResume, [result.section]: data });
      return true;
    }

    // Pick the right fingerprint + defaults for the section.
    type SectionKey = 'experience' | 'education' | 'certifications' | 'awards' | 'projects' | 'publications' | 'volunteering' | 'languages';
    const sectionKey = result.section as SectionKey;
    const arraySections: SectionKey[] = ['experience', 'education', 'certifications', 'awards', 'projects', 'publications', 'volunteering', 'languages'];
    if (arraySections.includes(sectionKey)) {
      const originals = ((currentResume as unknown as Record<string, unknown>)[sectionKey] as Record<string, unknown>[]) || [];
      const fingerprint =
        sectionKey === 'experience' ? EXPERIENCE_FINGERPRINT :
        sectionKey === 'education' ? EDUCATION_FINGERPRINT :
        sectionKey === 'projects' ? PROJECT_FINGERPRINT :
        GENERIC_NAME_FINGERPRINT;
      const fieldDefaults =
        sectionKey === 'experience' ? experienceDefaults :
        sectionKey === 'education' ? educationDefaults :
        undefined;

      const merge = mergeAIArrayResult<Record<string, unknown>>({
        originals,
        aiEntries: data,
        fingerprint,
        fieldDefaults,
      });

      // Destructive case: AI returned fewer entries than the original. Don't
      // commit silently — give the user a one-click "Apply anyway" so they
      // see what's about to change. We *intentionally ignore* the `silent`
      // flag here because "Apply All" sets silent=true and we still want
      // the user to confirm any destructive merge before mutating.
      if (merge.requiresConfirm && !bypassConfirm) {
        toast.warning(
          `AI returned ${merge.aiCount} of ${merge.originalCount} entries for ${result.label}. Review before applying.`,
          {
            duration: 10000,
            action: {
              label: 'Apply anyway',
              onClick: () => { applyResult(index, false, true); },
            },
          },
        );
        return false;
      }

      data = merge.merged;
      if (merge.droppedCount > 0 && !silent) {
        toast.info(`Preserved ${merge.droppedCount} original entr${merge.droppedCount === 1 ? 'y' : 'ies'} that the AI omitted.`);
      }
    }

    updateResume({ [result.section]: data });
    setResults(prev => prev.map((r, i) => (i === index ? { ...r, applied: true } : r)));
    onEnhanced?.([result.section]);
    if (!silent) toast.success(`${result.label} updated!`);
    void rescoreAfterApply({ ...currentResume, [result.section]: data });
    return true;
  }, [results, currentResume, updateResume, onEnhanced, rescoreAfterApply]);

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

  const sheetTitle = atsMode ? 'ATS Keyword Optimization' : 'AI Enhance';

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
    // For summary/skills: readable text with expand toggle
    const text = formatSectionContent(sectionId, content);
    const key = `${sectionId}-${variant}`;
    const isExpanded = expandedDiffText.has(key);
    const PREVIEW_LEN = 280;
    const isLong = text.length > PREVIEW_LEN;
    const displayText = isLong && !isExpanded ? text.slice(0, PREVIEW_LEN) + '…' : text;
    return (
      <div className={cn(
        "p-2.5 rounded-lg text-xs whitespace-pre-wrap break-words",
        variant === 'original' ? "bg-muted opacity-60" : "bg-primary/5 border border-primary/20"
      )}>
        <span className={cn(variant === 'original' && 'line-through')}>{displayText}</span>
        {isLong && (
          <button
            className="block mt-1 text-primary/80 hover:text-primary underline font-medium no-underline-on-strike"
            style={{ textDecoration: 'underline' }}
            onClick={(e) => {
              e.stopPropagation();
              setExpandedDiffText(prev => {
                const next = new Set(prev);
                if (next.has(key)) next.delete(key); else next.add(key);
                return next;
              });
            }}
          >
            {isExpanded ? 'Show less' : 'Show full'}
          </button>
        )}
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90dvh] flex flex-col rounded-t-2xl">
        <AISheetErrorBoundary key={String(open)} onClose={() => onOpenChange(false)}>
        <SheetHeader className="shrink-0 pb-3 border-b border-border">
          {/* pr-12 reserves room for the absolute-positioned Sheet Close
              button so a long resume / section title never collides with
              it. min-w-0 + truncate guarantees the title row never blows
              out the flex container on small viewports. */}
          <div className="flex items-center gap-3 pr-12 min-w-0">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-lg flex items-center gap-2 min-w-0">
                <span className="truncate">{sheetTitle}</span>
                <AICostBadge operation="enhance" />
              </SheetTitle>
              <AIProviderVia className="mt-0.5" />
            </div>
          </div>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto space-y-5 py-4 ai-output-scroll-fade">
          {/* Mode Selector - hidden in ATS mode */}
          {!atsMode && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 px-1">Enhancement Mode</p>
              <div className="flex flex-wrap gap-2">
                {MODES.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { haptics.light(); setMode(m.id); setVariantsMode(false); }}
                    className={cn(
                      'px-3 py-2 rounded-full text-xs font-medium border transition-all touch-manipulation min-h-[44px]',
                      'active:scale-95',
                      mode === m.id && !variantsMode
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted border-border text-muted-foreground hover:border-primary/30'
                    )}
                  >
                    {m.label}
                  </button>
                ))}
                <button
                  onClick={() => { haptics.light(); setVariantsMode(v => !v); }}
                  className={cn(
                    'px-3 py-2 rounded-full text-xs font-medium border transition-all touch-manipulation min-h-[44px] flex items-center gap-1.5',
                    'active:scale-95',
                    variantsMode
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-muted border-border text-muted-foreground hover:border-purple-400/50'
                  )}
                >
                  <Layers className="w-3 h-3" />
                  3 Variants
                </button>
              </div>
              {variantsMode && (
                <p className="text-[11px] text-muted-foreground mt-2 px-1">
                  The AI will generate 3 versions — Concise, Balanced, and Expanded — so you can pick your favorite.
                </p>
              )}
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
            className={cn(
              'w-full h-12 font-semibold',
              variantsMode ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'gradient-primary text-primary-foreground'
            )}
          >
            {isEnhancing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {variantsMode ? 'Generating 3 variants…' : atsMode ? 'Optimizing for ATS…' : 'Enhancing…'}
              </>
            ) : (
              <>
                {variantsMode ? <Layers className="w-4 h-4 mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                {variantsMode ? 'Generate 3 Variants' : atsMode ? 'Optimize' : 'Enhance'} {selectedSections.size > 0 ? `${selectedSections.size} Section${selectedSections.size > 1 ? 's' : ''}` : ''}
              </>
            )}
          </Button>

          {/* Results - Collapsible */}
          {results.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <p className="text-xs font-medium text-muted-foreground">Results</p>
                {results.some(r => !r.applied && !r.error) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs min-h-[44px] active:scale-95 transition-transform touch-manipulation"
                    onClick={() => {
                      haptics.medium();
                      // Count *actual* commits, not attempts. A
                      // confirmation-gated section returns false from
                      // applyResult and surfaces its own warning toast,
                      // so we shouldn't include it in the success count.
                      let applied = 0;
                      let deferred = 0;
                      results.forEach((r, i) => {
                        if (r.applied || r.error) return;
                        if (applyResult(i, true)) applied++;
                        else deferred++;
                      });
                      if (applied > 0) {
                        toast.success(`${applied} section${applied !== 1 ? 's' : ''} applied to your resume.`);
                      }
                      if (deferred > 0 && applied === 0) {
                        // All-deferred edge case: tell the user nothing
                        // committed yet so they don't assume "Apply All"
                        // silently failed.
                        toast.info(
                          `${deferred} section${deferred !== 1 ? 's' : ''} need review before applying.`,
                        );
                      }
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
                            {r.error ? (
                              <Badge variant="outline" className="text-[10px] border-destructive/40 text-destructive">
                                <AlertTriangle className="w-3 h-3 mr-0.5" /> Failed
                              </Badge>
                            ) : r.applied ? (
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
                        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                          {r.error && (
                            <div className="flex items-start gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive">
                              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                              <span>{r.error}</span>
                            </div>
                          )}
                          {r.error && (
                            <div className="flex gap-2 pt-1">
                              <Button variant="outline" size="sm" className="flex-1 min-h-[44px]" onClick={() => discardResult(i)}>
                                <X className="w-4 h-4 mr-1" /> Skip
                              </Button>
                              <Button
                                size="sm"
                                className="flex-1 min-h-[44px] gradient-primary"
                                disabled={r.retrying}
                                onClick={() => retryFailedSection(i)}
                              >
                                {r.retrying ? (
                                  <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Retrying…</>
                                ) : (
                                  <><Sparkles className="w-4 h-4 mr-1" /> Retry</>
                                )}
                              </Button>
                            </div>
                          )}
                          {r.warning && (
                            <div className="flex items-start gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-700 dark:text-yellow-400">
                              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                              <span>{r.warning}</span>
                            </div>
                          )}

                          {r.variants && r.variants.length > 0 ? (
                            <div className="space-y-2">
                              <p className="text-[10px] font-medium text-muted-foreground">Pick a version to apply:</p>
                              {r.variants.map((v, vi) => {
                                const isSelected = r.selectedVariantIndex === vi;
                                return (
                                  <button
                                    key={vi}
                                    onClick={() => !r.applied && selectVariant(i, vi)}
                                    disabled={r.applied}
                                    className={cn(
                                      'w-full text-left rounded-lg border p-3 transition-all touch-manipulation',
                                      isSelected
                                        ? 'border-purple-500 bg-purple-500/10 ring-1 ring-purple-500/30'
                                        : 'border-border bg-card hover:border-purple-400/40'
                                    )}
                                  >
                                    <div className="flex items-center justify-between mb-1.5">
                                      <Badge
                                        variant="secondary"
                                        className={cn('text-[10px]', isSelected && 'bg-purple-500/20 text-purple-700 dark:text-purple-300')}
                                      >
                                        {v.label}
                                      </Badge>
                                      {isSelected && <Check className="w-3.5 h-3.5 text-purple-500" />}
                                    </div>
                                    {renderSectionPreview(r.section, v.improved, 'enhanced')}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
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
                          )}

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

                          {!r.applied && !r.error && (
                            <div className="flex gap-2 pt-1">
                              <Button variant="outline" size="sm" className="flex-1 min-h-[44px]" onClick={() => discardResult(i)}>
                                <X className="w-4 h-4 mr-1" /> Discard
                              </Button>
                              <Button
                                size="sm"
                                className={cn('flex-1 min-h-[44px]', r.variants ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'gradient-primary')}
                                onClick={() => applyResult(i)}
                              >
                                <Check className="w-4 h-4 mr-1" /> {r.variants ? 'Apply Selected' : 'Apply'}
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
        </AISheetErrorBoundary>
      </SheetContent>
    </Sheet>
  );
}
