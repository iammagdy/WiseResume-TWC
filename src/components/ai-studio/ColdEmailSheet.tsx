import { useState } from 'react';
import { Mail, Loader2, Copy, Check, RefreshCw } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { useAIAction } from '@/hooks/useAIAction';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { useResumeStore } from '@/store/resumeStore';
import { AIProviderVia } from '@/components/editor/ai/AIProviderBadge';
import { AICostBadge } from '@/components/ai/AICostBadge';
import { extractAIContent } from '@/lib/ai/parseAIResponse';
import type { ResumeData } from '@/types/resume';

interface ColdEmailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export function ColdEmailSheet({ open, onOpenChange }: ColdEmailSheetProps) {
  const currentResume = useResumeStore(s => s.currentResume);
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [jobSnippet, setJobSnippet] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const { execute } = useAIAction({ operation: 'cold-email' });

  const handleGenerate = async () => {
    if (!company.trim() || !jobTitle.trim()) {
      toast.error('Please enter the company name and job title');
      return;
    }
    haptics.medium();
    setIsLoading(true);
    try {
      const data = await execute(async () => {
        const resume = currentResume as unknown as ResumeData | null;
        const candidateName = resume?.contactInfo?.fullName ?? 'the candidate';
        const summary = resume?.summary ?? 'Experienced professional';
        const topSkills = getTopSkills(resume);
        const recentExp = getRecentExperience(resume);

        const { data: responseData, error } = await edgeFunctions.functions.invoke('wise-ai-chat', {
          body: {
            messages: [
              {
                role: 'user',
                content: `You are an expert recruiter outreach writer. Write a short, personalized cold email to a recruiter at ${company} for the ${jobTitle} role.

Candidate Name: ${candidateName}
Candidate Summary: ${summary}
Top Skills: ${topSkills}
Recent Experience: ${recentExp}
${jobSnippet ? `Job Description Snippet: ${jobSnippet}` : ''}

Write a compelling cold email that:
- Is short (150-200 words max)
- Has a strong subject line
- Opens with a personalized hook referencing ${company}
- Highlights 2-3 relevant achievements/skills
- Has a clear, low-friction CTA
- Feels human and not template-like

Format:
Subject: [subject line]

[email body]`,
              },
            ],
            resumeContext: currentResume ?? null,
          },
        });
        if (error) throw new Error(error.message);
        const content = extractAIContent(responseData);
        if (!content) throw new Error('Empty response from AI');
        return content;
      });
      if (data) setEmail(data);
    } catch {
      toast.error('Failed to generate email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(email);
    setIsCopied(true);
    haptics.light();
    toast.success('Email copied to clipboard!');
    setTimeout(() => setIsCopied(false), 2000);
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
          {!email ? (
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
              <Button className="w-full gradient-primary" onClick={handleGenerate} disabled={isLoading}>
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating email...</>
                ) : (
                  <><Mail className="w-4 h-4 mr-2" />Generate Cold Email</>
                )}
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={handleCopy}>
                  {isCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy Email
                </Button>
                <Button variant="ghost" size="sm" className="gap-1.5 ml-auto text-xs" onClick={() => { setEmail(''); haptics.light(); }}>
                  <RefreshCw className="w-3.5 h-3.5" />
                  Regenerate
                </Button>
              </div>
              <div className="p-4 rounded-xl bg-card border border-border">
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{email}</p>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
