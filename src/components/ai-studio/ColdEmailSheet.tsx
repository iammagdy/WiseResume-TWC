import { useState, useEffect } from 'react';
import { Mail, Loader2, Copy, Check, RefreshCw, RotateCcw, AlertTriangle } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { useAIAction } from '@/hooks/useAIAction';
import { useAIDraft } from '@/hooks/useAIDraft';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { useResumeStore } from '@/store/resumeStore';
import { AIProviderVia } from '@/components/editor/ai/AIProviderBadge';
import { AICostBadge } from '@/components/ai/AICostBadge';
import { extractAIContent } from '@/lib/ai/parseAIResponse';
import { useRedactedResume } from '@/hooks/useRedactedResume';
import type { ResumeData } from '@/types/resume';

interface ColdEmailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EmailVariants {
  formal: string;
  conversational: string;
}

function getTopSkills(resume: ResumeData | null): string {
  if (!resume?.skills) return '';
  const skills = resume.skills as unknown[];
  return skills
    .slice(0, 5)
    .map(s => (typeof s === 'string' ? s : (s as Record<string, string>)?.name ?? ''))
    .filter(Boolean)
    .join(', ');
}

function getRecentExperience(resume: ResumeData | null): string {
  if (!resume?.experience) return '';
  const exp = resume.experience as Array<{ position?: string; company?: string }>;
  return exp
    .slice(0, 2)
    .map(e => `${e.position ?? ''} at ${e.company ?? ''}`.trim())
    .filter(Boolean)
    .join(', ');
}

function hasEnoughResumeContent(resume: ResumeData | null): boolean {
  if (!resume) return false;
  const hasSummary = typeof resume.summary === 'string' && resume.summary.trim().length > 20;
  const expArray = resume.experience as Array<unknown> | undefined;
  const hasExperience = Array.isArray(expArray) && expArray.length >= 2;
  return hasSummary || hasExperience;
}

function parseEmailVariants(content: string): EmailVariants | null {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    if (typeof parsed?.formal === 'string' && typeof parsed?.conversational === 'string') {
      return { formal: parsed.formal, conversational: parsed.conversational };
    }
    return null;
  } catch {
    return null;
  }
}

export function ColdEmailSheet({ open, onOpenChange }: ColdEmailSheetProps) {
  const currentResume = useResumeStore(s => s.currentResume);
  const resumeId = (currentResume as { id?: string } | null)?.id;
  const redactedResume = useRedactedResume(currentResume as ResumeData | null);
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [jobSnippet, setJobSnippet] = useState('');
  const [variants, setVariants] = useState<EmailVariants | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [showContentWarning, setShowContentWarning] = useState(false);
  const { execute } = useAIAction({ operation: 'cold-email' });
  const { draft, saveDraft, clearDraft, hasDraft } = useAIDraft<EmailVariants>('cold-email', resumeId);

  useEffect(() => {
    if (open && hasDraft && !variants) {
      setShowDraftBanner(true);
    }
  }, [open, hasDraft, variants]);

  const handleGenerate = async (force = false) => {
    if (!company.trim() || !jobTitle.trim()) {
      toast.error('Please enter the company name and job title');
      return;
    }
    if (!force && !hasEnoughResumeContent(currentResume as unknown as ResumeData | null)) {
      setShowContentWarning(true);
      return;
    }
    setShowContentWarning(false);
    haptics.medium();
    setIsLoading(true);
    setShowDraftBanner(false);
    try {
      const data = await execute(async () => {
        const resume = currentResume as unknown as ResumeData | null;
        const candidateName = resume?.contactInfo?.fullName ?? 'the candidate';
        const summary = resume?.summary ?? 'Experienced professional';
        const topSkills = getTopSkills(resume);
        const recentExp = getRecentExperience(resume);

        const { data: responseData, error } = await edgeFunctions.functions.invoke('wise-ai-chat', {
          body: {
            type: 'cold_email',
            payload: {
              company,
              jobTitle,
              candidateName,
              summary,
              topSkills,
              recentExperience: recentExp,
              jobSnippet: jobSnippet || undefined,
              resumeContext: redactedResume ?? null,
            },
          },
        });
        if (error) throw new Error(error.message);
        const content = extractAIContent(responseData);
        if (!content) throw new Error('Empty response from AI');
        const parsed = parseEmailVariants(content);
        if (!parsed) {
          return { formal: content, conversational: content };
        }
        return parsed;
      });
      if (data) {
        setVariants(data);
        saveDraft(data);
      }
    } catch {
      toast.error('Failed to generate email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    haptics.light();
    toast.success('Email copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRegenerate = () => {
    setVariants(null);
    clearDraft();
    setShowDraftBanner(false);
    haptics.light();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90dvh] flex flex-col p-0">
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-border shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-rose-500" />
            Cold Email to Recruiter
          </SheetTitle>
          <div className="flex items-center gap-2">
            <AIProviderVia className="mt-0.5" />
            <AICostBadge operation="cold-email" />
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4">
          {showDraftBanner && draft && !variants && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-2">
              <p className="text-xs text-amber-700 dark:text-amber-400">Resume from last session?</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setVariants(draft); setShowDraftBanner(false); }}>
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Restore
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { clearDraft(); setShowDraftBanner(false); }}>
                  Dismiss
                </Button>
              </div>
            </div>
          )}

          {!variants ? (
            <>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Target Company *</Label>
                  <Input placeholder="e.g. Google" value={company} onChange={e => setCompany(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Job Title / Role *</Label>
                  <Input placeholder="e.g. Senior Product Manager" value={jobTitle} onChange={e => setJobTitle(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Job Description Snippet <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Textarea
                    placeholder="Paste key requirements or the job description for a more personalized email..."
                    value={jobSnippet}
                    onChange={e => setJobSnippet(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>
              {showContentWarning && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      Your resume may not have enough content for a personalized email. Add a summary or at least two work experiences for best results.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => setShowContentWarning(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" className="flex-1 text-xs gradient-primary" onClick={() => handleGenerate(true)}>
                      Generate Anyway
                    </Button>
                  </div>
                </div>
              )}
              <Button className="w-full gradient-primary" onClick={() => handleGenerate()} disabled={isLoading}>
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating emails...</>
                ) : (
                  <><Mail className="w-4 h-4 mr-2" />Generate Cold Email</>
                )}
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 ml-auto text-xs"
                  onClick={() => {
                    handleRegenerate();
                    setShowContentWarning(false);
                  }}
                  disabled={isLoading}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  Regenerate
                </Button>
              </div>

              <Tabs defaultValue="formal" className="w-full">
                <TabsList className="w-full grid grid-cols-2 mb-3">
                  <TabsTrigger value="formal" className="text-xs">Original</TabsTrigger>
                  <TabsTrigger value="conversational" className="text-xs">Alternate Style</TabsTrigger>
                </TabsList>

                <TabsContent value="formal" className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground flex-1">Formal, professional tone</span>
                    <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => handleCopy(variants.formal, 'formal')}>
                      {copiedId === 'formal' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      Copy
                    </Button>
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-border">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{variants.formal}</p>
                  </div>
                </TabsContent>

                <TabsContent value="conversational" className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground flex-1">Warm, conversational tone</span>
                    <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => handleCopy(variants.conversational, 'conversational')}>
                      {copiedId === 'conversational' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      Copy
                    </Button>
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-border">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{variants.conversational}</p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
