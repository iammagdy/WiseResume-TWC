import { useState, useEffect } from 'react';
import { FileCheck, Loader2, Copy, Check, Download, RotateCcw } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { useAIAction } from '@/hooks/useAIAction';
import { useAIDraft } from '@/hooks/useAIDraft';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { useResumeStore } from '@/store/resumeStore';
import { AIProviderVia } from '@/components/editor/ai/AIProviderBadge';
import { AICostBadge } from '@/components/ai/AICostBadge';
import { extractAIContent } from '@/lib/ai/parseAIResponse';
import type { ResumeData } from '@/types/resume';

interface ReferenceLetterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getTopExperience(resume: ResumeData | null): string {
  if (!resume?.experience) return '';
  const exp = resume.experience as Array<{ position?: string; company?: string }>;
  return exp
    .slice(0, 2)
    .map(e => `${e.position ?? ''} at ${e.company ?? ''}`.trim())
    .filter(Boolean)
    .join(', ');
}

export function ReferenceLetterSheet({ open, onOpenChange }: ReferenceLetterSheetProps) {
  const currentResume = useResumeStore(s => s.currentResume);
  const resumeId = (currentResume as { id?: string } | null)?.id;
  const [refereeName, setRefereeName] = useState('');
  const [refereeRole, setRefereeRole] = useState('');
  const [relationship, setRelationship] = useState('');
  const [context, setContext] = useState('');
  const [letter, setLetter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const { execute } = useAIAction({ operation: 'reference-letter' });
  const { draft, saveDraft, clearDraft, hasDraft } = useAIDraft<string>('reference-letter', resumeId);

  const resume = currentResume as unknown as ResumeData | null;
  const candidateName = resume?.contactInfo?.fullName ?? 'the candidate';

  useEffect(() => {
    if (open && hasDraft && !letter) {
      setShowDraftBanner(true);
    }
  }, [open, hasDraft, letter]);

  const handleGenerate = async () => {
    if (!refereeName.trim() || !refereeRole.trim() || !relationship.trim()) {
      toast.error('Please fill in the referee name, role, and your relationship');
      return;
    }
    haptics.medium();
    setIsLoading(true);
    setShowDraftBanner(false);
    try {
      const data = await execute(async () => {
        const summary = resume?.summary ?? '';
        const experience = getTopExperience(resume);

        const { data: responseData, error } = await edgeFunctions.functions.invoke('wise-ai-chat', {
          body: {
            messages: [
              {
                role: 'user',
                content: `You are an expert at writing professional reference letters. Generate a formal reference letter template.

Referee Name: ${refereeName}
Referee Role/Title: ${refereeRole}
Relationship to Candidate: ${relationship}
${context ? `Additional Context: ${context}` : ''}
Candidate Name: ${candidateName}
${summary ? `Candidate Summary: ${summary}` : ''}
${experience ? `Candidate Experience: ${experience}` : ''}

Write a complete, professional reference letter that:
1. Is from ${refereeName}'s perspective as a ${refereeRole}
2. Addresses the hiring manager
3. Highlights the candidate's key strengths relevant to their experience
4. Includes specific examples where possible
5. Has a professional closing

Return ONLY the letter text, no JSON, no explanation. Start with "Dear Hiring Manager," and end with a proper signature block for ${refereeName}.`,
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
      if (data) {
        setLetter(data);
        saveDraft(data);
      }
    } catch {
      toast.error('Failed to generate reference letter. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(letter);
    setIsCopied(true);
    haptics.light();
    toast.success('Letter copied to clipboard!');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownload = async () => {
    if (!letter) return;
    haptics.medium();
    setIsDownloading(true);
    try {
      const { Document, Packer, Paragraph, TextRun } = await import('docx');
      const paragraphs = letter.split('\n').map(
        line => new Paragraph({
          children: [new TextRun({ text: line, size: 22 })],
          spacing: { after: line === '' ? 200 : 100 },
        })
      );
      const doc = new Document({ sections: [{ children: paragraphs }] });
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Reference_Letter_${refereeName.replace(/\s+/g, '_')}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Downloaded as Word document!');
    } catch {
      toast.error('Failed to generate Word file.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90dvh] flex flex-col p-0">
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-border shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-sky-500" />
            Reference Letter Generator
          </SheetTitle>
          <div className="flex items-center gap-2">
            <AIProviderVia className="mt-0.5" />
            <AICostBadge operation="reference-letter" />
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4">
          {showDraftBanner && draft && !letter && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-2">
              <p className="text-xs text-amber-700 dark:text-amber-400">Resume from last session?</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setLetter(draft); setShowDraftBanner(false); }}>
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Restore
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { clearDraft(); setShowDraftBanner(false); }}>
                  Dismiss
                </Button>
              </div>
            </div>
          )}

          {!letter ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label>Referee Name *</Label>
                  <Input placeholder="e.g. Jane Smith" value={refereeName} onChange={e => setRefereeName(e.target.value)} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Referee Role/Title *</Label>
                  <Input placeholder="e.g. Engineering Manager at Acme Corp" value={refereeRole} onChange={e => setRefereeRole(e.target.value)} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Your Relationship *</Label>
                  <Input placeholder="e.g. Direct manager for 2 years" value={relationship} onChange={e => setRelationship(e.target.value)} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Additional Context <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Textarea
                    placeholder="Any specific achievements, skills, or qualities to highlight..."
                    value={context}
                    onChange={e => setContext(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>
              <Button className="w-full gradient-primary" onClick={handleGenerate} disabled={isLoading}>
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating letter...</>
                ) : (
                  <><FileCheck className="w-4 h-4 mr-2" />Generate Reference Letter</>
                )}
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={handleCopy}>
                  {isCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDownload} disabled={isDownloading}>
                  {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  Download .docx
                </Button>
                <Button variant="ghost" size="sm" className="gap-1.5 ml-auto text-xs" onClick={() => { setLetter(''); clearDraft(); }}>
                  Regenerate
                </Button>
              </div>
              <div className="p-4 rounded-xl bg-card border border-border">
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{letter}</p>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
