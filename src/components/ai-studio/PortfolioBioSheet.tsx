import { useState } from 'react';
import { BookOpen, Loader2, Copy, Check, RefreshCw, ExternalLink } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { useAIAction } from '@/hooks/useAIAction';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { useResumeStore } from '@/store/resumeStore';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { AIProviderVia } from '@/components/editor/ai/AIProviderBadge';
import { AICostBadge } from '@/components/ai/AICostBadge';
import { extractAIContent, parseAIJson } from '@/lib/ai/parseAIResponse';
import { useRedactedResume } from '@/hooks/useRedactedResume';
import type { ResumeData } from '@/types/resume';

interface PortfolioBioSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface BioResult {
  short: string;
  medium: string;
  full: string;
}

function isBioResult(v: unknown): v is BioResult {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.short === 'string' &&
    typeof r.medium === 'string' &&
    typeof r.full === 'string'
  );
}

const BIO_VARIANTS: Array<{
  key: keyof BioResult;
  label: string;
  desc: string;
  color: string;
  bg: string;
}> = [
  { key: 'short', label: 'Short', desc: '1 sentence', color: 'text-sky-500', bg: 'bg-sky-500/10 border-sky-500/20' },
  { key: 'medium', label: 'Medium', desc: '2-3 sentences', color: 'text-rose-500', bg: 'bg-rose-500/10 border-rose-500/20' },
  { key: 'full', label: 'Full Paragraph', desc: '4-5 sentences', color: 'text-violet-500', bg: 'bg-violet-500/10 border-violet-500/20' },
];

function getTopSkills(resume: ResumeData | null): string {
  if (!resume?.skills) return '';
  const skills = resume.skills as unknown[];
  return skills
    .slice(0, 6)
    .map(s => (typeof s === 'string' ? s : (s as Record<string, string>)?.name ?? ''))
    .filter(Boolean)
    .join(', ');
}

function getRecentExperience(resume: ResumeData | null): string {
  if (!resume?.experience) return '';
  const exp = resume.experience as Array<{ position?: string; company?: string }>;
  return exp
    .slice(0, 3)
    .map(e => `${e.position ?? ''} at ${e.company ?? ''}`.trim())
    .filter(Boolean)
    .join(', ');
}

export function PortfolioBioSheet({ open, onOpenChange }: PortfolioBioSheetProps) {
  const currentResume = useResumeStore(s => s.currentResume);
  const redactedResume = useRedactedResume(currentResume as ResumeData | null);
  const { user } = useAuth();
  const { updateProfile } = useProfile(user?.id, user);
  const [result, setResult] = useState<BioResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selected, setSelected] = useState<keyof BioResult | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { execute } = useAIAction({ operation: 'portfolio-bio' });

  const handleGenerate = async () => {
    if (!currentResume) {
      toast.error('Please select a resume first');
      return;
    }
    haptics.medium();
    setIsLoading(true);
    setResult(null);
    try {
      const data = await execute(async () => {
        const resume = currentResume as unknown as ResumeData;
        const name = resume.contactInfo?.fullName ?? 'Professional';
        const summary = resume.summary ?? '';
        const topSkills = getTopSkills(resume);
        const experience = getRecentExperience(resume);

        const { data: responseData, error } = await edgeFunctions.functions.invoke('wise-ai-chat', {
          body: {
            messages: [
              {
                role: 'user',
                content: `You are a portfolio bio writer. Generate 3 bio variants for a portfolio "About" section based on this resume.

Name: ${name}
Summary: ${summary}
Top Skills: ${topSkills}
Experience: ${experience}

Generate 3 bio variants optimized for a portfolio About section:
1. Short: 1 compelling sentence that captures who they are and what they do
2. Medium: 2-3 sentences expanding on their expertise and value
3. Full: A complete paragraph (4-5 sentences) covering background, expertise, passion, and what they bring

Respond ONLY with valid JSON:
{
  "short": "string - 1 sentence bio",
  "medium": "string - 2-3 sentence bio",
  "full": "string - full paragraph bio"
}`,
              },
            ],
            resumeContext: redactedResume,
          },
        });
        if (error) throw new Error(error.message);
        const content = extractAIContent(responseData);
        return parseAIJson(content, isBioResult);
      });
      if (data) setResult(data);
    } catch {
      toast.error('Failed to generate bio. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    haptics.light();
    toast.success('Copied!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUseInPortfolio = async () => {
    if (!selected || !result) return;
    const bio = result[selected];
    haptics.medium();
    setIsSaving(true);
    try {
      await updateProfile({ portfolioBio: bio });
      toast.success('Bio saved to your portfolio!');
    } catch {
      toast.error('Failed to save bio. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90dvh] flex flex-col p-0">
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-border shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-violet-500" />
            Portfolio Bio Generator
          </SheetTitle>
          <div className="flex items-center gap-2">
            <AIProviderVia className="mt-0.5" />
            <AICostBadge operation="portfolio-bio" />
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4">
          {!result ? (
            <>
              <div className="text-center py-6 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto">
                  <BookOpen className="w-7 h-7 text-violet-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Generate Your Portfolio Bio</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    AI reads your resume and creates 3 bio variants — short, medium, and full paragraph — ready for your portfolio About section.
                  </p>
                </div>
              </div>
              <Button className="w-full gradient-primary" onClick={handleGenerate} disabled={isLoading || !currentResume}>
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                ) : (
                  <><BookOpen className="w-4 h-4 mr-2" />Generate Portfolio Bio</>
                )}
              </Button>
              {!currentResume && (
                <p className="text-xs text-center text-muted-foreground">Select a resume to use this tool</p>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Your Portfolio Bios</h3>
                <Button variant="ghost" size="sm" onClick={handleGenerate} disabled={isLoading} className="gap-1 text-xs">
                  <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
                  Regenerate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Tap a bio to select it, then copy or use it in your portfolio.</p>

              {BIO_VARIANTS.map(({ key, label, desc, color, bg }) => {
                const isSelected = selected === key;
                return (
                  <button
                    key={key}
                    onClick={() => { setSelected(key); haptics.light(); }}
                    className={cn(
                      'w-full text-left p-3 rounded-xl border transition-all',
                      isSelected ? bg : 'bg-card border-border hover:border-primary/20'
                    )}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={cn('text-xs font-semibold', color)}>{label}</span>
                        <span className="text-xs text-muted-foreground">{desc}</span>
                      </div>
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

              {selected && (
                <Button
                  className="w-full gradient-primary"
                  onClick={handleUseInPortfolio}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                  ) : (
                    <><ExternalLink className="w-4 h-4 mr-2" />Use in Portfolio</>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
