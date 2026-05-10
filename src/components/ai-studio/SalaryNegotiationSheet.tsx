import { useState, useEffect } from 'react';
import { DollarSign, Loader2, Copy, Check, RefreshCw, RotateCcw } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { useAIAction } from '@/hooks/useAIAction';
import { useAIDraft } from '@/hooks/useAIDraft';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { useResumeStore } from '@/store/resumeStore';
import { AIProviderVia } from '@/components/editor/ai/AIProviderBadge';
import { AICostBadge } from '@/components/ai/AICostBadge';
import { extractAIContent, parseAIJson } from '@/lib/ai/parseAIResponse';
import { useRedactedResume } from '@/hooks/useRedactedResume';
import type { ResumeData } from '@/types/resume';

interface SalaryNegotiationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface NegotiationResult {
  openingLine: string;
  justifications: string[];
  counterOffer: string;
  emailTemplate: string;
  callScript: string;
}

function isNegotiationResult(value: unknown): value is NegotiationResult {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.openingLine === 'string' &&
    Array.isArray(v.justifications) &&
    typeof v.counterOffer === 'string' &&
    typeof v.emailTemplate === 'string' &&
    typeof v.callScript === 'string'
  );
}

function isNumericValue(value: string): boolean {
  return value.trim() !== '' && /^\d{1,20}([.,]\d{1,3})?$/.test(value.trim().replace(/\s/g, ''));
}

export function SalaryNegotiationSheet({ open, onOpenChange }: SalaryNegotiationSheetProps) {
  const currentResume = useResumeStore(s => s.currentResume);
  const resumeId = (currentResume as { id?: string } | null)?.id;
  const redactedResume = useRedactedResume(currentResume as ResumeData | null);
  const [jobTitle, setJobTitle] = useState('');
  const [offeredSalary, setOfferedSalary] = useState('');
  const [targetSalary, setTargetSalary] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [result, setResult] = useState<NegotiationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [salaryErrors, setSalaryErrors] = useState<{ offered?: string; target?: string }>({});
  const { execute } = useAIAction({ operation: 'salary-negotiation' });
  const { draft, saveDraft, clearDraft, hasDraft } = useAIDraft<NegotiationResult>('salary-negotiation', resumeId);

  useEffect(() => {
    if (open && hasDraft && !result) {
      setShowDraftBanner(true);
    }
  }, [open, hasDraft, result]);

  const handleGenerate = async () => {
    if (!jobTitle.trim() || !offeredSalary.trim() || !targetSalary.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    const errors: { offered?: string; target?: string } = {};
    if (!isNumericValue(offeredSalary)) {
      errors.offered = 'Please enter a numeric value (e.g. 90000)';
    }
    if (!isNumericValue(targetSalary)) {
      errors.target = 'Please enter a numeric value (e.g. 110000)';
    }
    if (errors.offered || errors.target) {
      setSalaryErrors(errors);
      return;
    }
    setSalaryErrors({});
    haptics.medium();
    setIsLoading(true);
    setShowDraftBanner(false);
    try {
      const data = await execute(async () => {
        const candidateName = currentResume?.contactInfo?.fullName ?? 'Candidate';
        const summary = currentResume?.summary ?? '';
        const { data: responseData, error } = await appwriteFunctions.invoke('wise-ai-chat', {
          body: {
            type: 'salary_negotiation',
            payload: {
              jobTitle,
              offeredSalary,
              targetSalary,
              currency,
              candidateName,
              summary,
              resumeContext: redactedResume ?? null,
            },
          },
        });
        if (error) throw new Error(error.message);
        const content = extractAIContent(responseData);
        return parseAIJson(content, isNegotiationResult);
      });
      if (data) {
        setResult(data);
        saveDraft(data);
      }
    } catch {
      toast.error('Failed to generate negotiation script. Please try again.');
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

  const handleNew = () => {
    setResult(null);
    clearDraft();
    setShowDraftBanner(false);
  };

  const CopyButton = ({ text, id }: { text: string; id: string }) => (
    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => handleCopy(text, id)}>
      {copiedId === id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
    </Button>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90dvh] flex flex-col p-0">
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-border shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            Salary Negotiation Coach
          </SheetTitle>
          <div className="flex items-center gap-2">
            <AIProviderVia className="mt-0.5" />
            <AICostBadge operation="salary-negotiation" />
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
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label>Job Title *</Label>
                  <Input
                    placeholder="e.g. Senior Software Engineer"
                    value={jobTitle}
                    onChange={e => setJobTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Offered Salary *</Label>
                  <Input
                    placeholder="e.g. 90000"
                    value={offeredSalary}
                    onChange={e => { setOfferedSalary(e.target.value); if (salaryErrors.offered) setSalaryErrors(prev => ({ ...prev, offered: undefined })); }}
                    className={salaryErrors.offered ? 'border-destructive' : ''}
                    inputMode="numeric"
                  />
                  {salaryErrors.offered && (
                    <p className="text-xs text-destructive">{salaryErrors.offered}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Target Salary *</Label>
                  <Input
                    placeholder="e.g. 110000"
                    value={targetSalary}
                    onChange={e => { setTargetSalary(e.target.value); if (salaryErrors.target) setSalaryErrors(prev => ({ ...prev, target: undefined })); }}
                    className={salaryErrors.target ? 'border-destructive' : ''}
                    inputMode="numeric"
                  />
                  {salaryErrors.target && (
                    <p className="text-xs text-destructive">{salaryErrors.target}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Currency</Label>
                  <Input
                    placeholder="USD"
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                  />
                </div>
              </div>
              <Button
                className="w-full gradient-primary"
                onClick={handleGenerate}
                disabled={isLoading}
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating script...</>
                ) : (
                  <><DollarSign className="w-4 h-4 mr-2" />Generate Negotiation Script</>
                )}
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Your Negotiation Script</h3>
                <Button variant="ghost" size="sm" onClick={handleNew} className="gap-1 text-xs">
                  <RefreshCw className="w-3.5 h-3.5" />
                  New
                </Button>
              </div>

              <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-green-600 dark:text-green-400">Opening Line</p>
                  <CopyButton text={result.openingLine} id="opening" />
                </div>
                <p className="text-sm">{result.openingLine}</p>
              </div>

              <div className="p-3 rounded-xl bg-card border border-border space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Justifications</p>
                <ul className="space-y-1.5">
                  {result.justifications.map((j, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-green-500 mt-0.5">•</span>
                      {j}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3 rounded-xl bg-card border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Counter-Offer</p>
                  <CopyButton text={result.counterOffer} id="counter" />
                </div>
                <p className="text-sm">{result.counterOffer}</p>
              </div>

              <div className="p-3 rounded-xl bg-card border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Email Template</p>
                  <CopyButton text={result.emailTemplate} id="email" />
                </div>
                <p className="text-sm whitespace-pre-wrap">{result.emailTemplate}</p>
              </div>

              <div className="p-3 rounded-xl bg-card border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Call Script</p>
                  <CopyButton text={result.callScript} id="call" />
                </div>
                <p className="text-sm whitespace-pre-wrap">{result.callScript}</p>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
