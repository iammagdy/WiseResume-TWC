import { useState, useEffect } from 'react';
import { Star, Loader2, Copy, Check, RefreshCw, RotateCcw } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { useAIAction } from '@/hooks/useAIAction';
import { useAIDraft } from '@/hooks/useAIDraft';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { useResumeStore } from '@/store/resumeStore';
import { AIProviderVia } from '@/components/editor/ai/AIProviderBadge';
import { AICostBadge } from '@/components/ai/AICostBadge';
import { extractAIContent, parseAIJson } from '@/lib/ai/parseAIResponse';
import { useRedactedResume } from '@/hooks/useRedactedResume';
import type { ResumeData } from '@/types/resume';

interface PersonalBrandingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface BrandingResult {
  formal: string;
  casual: string;
  bold: string;
}

function isBrandingResult(v: unknown): v is BrandingResult {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.formal === 'string' &&
    typeof r.casual === 'string' &&
    typeof r.bold === 'string'
  );
}

const VARIANT_STYLES: Record<keyof BrandingResult, { label: string; color: string; bg: string }> = {
  formal: { label: 'Formal', color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20' },
  casual: { label: 'Casual', color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  bold: { label: 'Bold', color: 'text-violet-500', bg: 'bg-violet-500/10 border-violet-500/20' },
};

function getTopSkills(resume: ResumeData | null): string {
  if (!resume?.skills) return '';
  const skills = resume.skills as unknown[];
  return skills
    .slice(0, 5)
    .map(s => (typeof s === 'string' ? s : (s as Record<string, string>)?.name ?? ''))
    .filter(Boolean)
    .join(', ');
}

function getExperienceSummary(resume: ResumeData | null): string {
  if (!resume?.experience) return '';
  const exp = resume.experience as Array<{ position?: string; company?: string }>;
  return exp
    .slice(0, 2)
    .map(e => `${e.position ?? ''} at ${e.company ?? ''}`.trim())
    .filter(Boolean)
    .join(', ');
}

export function PersonalBrandingSheet({ open, onOpenChange }: PersonalBrandingSheetProps) {
  const currentResume = useResumeStore(s => s.currentResume);
  const resumeId = (currentResume as { id?: string } | null)?.id;
  const redactedResume = useRedactedResume(currentResume as ResumeData | null);
  const [result, setResult] = useState<BrandingResult | null>(null);
  const [targetRole, setTargetRole] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<keyof BrandingResult | null>(null);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const { execute } = useAIAction({ operation: 'personal-branding' });
  const { draft, saveDraft, clearDraft, hasDraft } = useAIDraft<BrandingResult>('personal-branding', resumeId);

  useEffect(() => {
    if (open && hasDraft && !result) {
      setShowDraftBanner(true);
    }
  }, [open, hasDraft, result]);

  const handleGenerate = async () => {
    if (!currentResume) {
      toast.error('Please select a resume first');
      return;
    }
    haptics.medium();
    setIsLoading(true);
    setResult(null);
    setShowDraftBanner(false);
    try {
      const data = await execute(async () => {
        const name = currentResume.contactInfo?.fullName ?? 'Professional';
        const summary = currentResume.summary ?? '';
        const topSkills = getTopSkills(currentResume as unknown as ResumeData);
        const experience = getExperienceSummary(currentResume as unknown as ResumeData);

        const { data: responseData, error } = await edgeFunctions.functions.invoke('wise-ai-chat', {
          body: {
            type: 'personal_branding',
            payload: {
              name,
              summary,
              topSkills,
              experience,
              resumeContext: redactedResume,
              targetRole: targetRole.trim() || undefined,
            },
          },
        });
        if (error) throw new Error(error.message);
        const content = extractAIContent(responseData);
        return parseAIJson(content, isBrandingResult);
      });
      if (data) {
        setResult(data);
        saveDraft(data);
      }
    } catch {
      toast.error('Failed to generate branding statements. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    haptics.light();
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90dvh] flex flex-col p-0">
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-border shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />
            Personal Branding Statement
          </SheetTitle>
          <div className="flex items-center gap-2">
            <AIProviderVia className="mt-0.5" />
            <AICostBadge operation="personal-branding" />
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4">
          {showDraftBanner && draft && !result && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-2">
              <p className="text-xs text-amber-700 dark:text-amber-400">Resume from last session?</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setResult(draft); setShowDraftBanner(false); }}>
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Restore
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { clearDraft(); setShowDraftBanner(false); }}>
                  Dismiss
                </Button>
              </div>
            </div>
          )}

          {!result ? (
            <>
              <div className="text-center py-6 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto">
                  <Star className="w-7 h-7 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Generate Your Brand Statement</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    AI reads your resume and creates 3 versions — formal, casual, and bold — perfect for LinkedIn, signatures, or your portfolio.
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Target role or audience (optional)</Label>
                <Input
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Senior Engineer, LinkedIn, portfolio..."
                  disabled={isLoading}
                />
              </div>
              <Button className="w-full gradient-primary" onClick={handleGenerate} disabled={isLoading || !currentResume}>
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                ) : (
                  <><Star className="w-4 h-4 mr-2" />Generate My Brand Statement</>
                )}
              </Button>
              {!currentResume && (
                <p className="text-xs text-center text-muted-foreground">Select a resume to use this tool</p>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Your Brand Statements</h3>
                <Button variant="ghost" size="sm" onClick={handleGenerate} disabled={isLoading} className="gap-1 text-xs">
                  <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
                  Regenerate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Tap a card to select it, then copy your chosen statement.</p>

              {(Object.keys(VARIANT_STYLES) as Array<keyof BrandingResult>).map(key => {
                const style = VARIANT_STYLES[key];
                const isSelected = selected === key;
                return (
                  <button
                    key={key}
                    onClick={() => { setSelected(key); haptics.light(); }}
                    className={cn(
                      'w-full text-left p-3 rounded-xl border transition-all',
                      isSelected ? style.bg : 'bg-card border-border hover:border-primary/20'
                    )}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={cn('text-xs font-semibold', style.color)}>{style.label}</span>
                      {isSelected && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 gap-1 text-xs"
                          onClick={e => { e.stopPropagation(); handleCopy(result[key], key); }}
                        >
                          {copiedId === key ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                          Copy
                        </Button>
                      )}
                    </div>
                    <p className="text-sm">{result[key]}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
