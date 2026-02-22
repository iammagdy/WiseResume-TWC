import { useState, useRef, useEffect } from 'react';
import { FileText, Copy, Check, Download, Sparkles, History, Edit3, Eye, X, Circle } from 'lucide-react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ResumeData, ContactInfo, CoverLetterHistory } from '@/types/resume';
import { generateCoverLetter } from '@/lib/aiTailor';
import { useResumeStore } from '@/store/resumeStore';
import { generateCoverLetterPDF } from '@/lib/pdfGenerator';
import { downloadFile } from '@/lib/downloadUtils';
import { toast } from 'sonner';
import { CoverLetterHistorySheet } from './CoverLetterHistorySheet';
import { AICostBadge } from '@/components/ai/AICostBadge';
import { useAIAction } from '@/hooks/useAIAction';

interface CoverLetterGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resume: ResumeData | null;
  jobDescription: string;
  jobTitle?: string;
  jobCompany?: string;
}

type Tone = 'professional' | 'enthusiastic' | 'conversational';

/** Replace AI placeholder brackets with real contact info */
function injectContactInfo(letter: string, contactInfo: ContactInfo): string {
  return letter
    .replace(/\[Your Phone Number\]/gi, contactInfo.phone || '')
    .replace(/\[Your Email Address\]/gi, contactInfo.email || '')
    .replace(/\[Your Email\]/gi, contactInfo.email || '')
    .replace(/\[Your LinkedIn Profile URL\]/gi, contactInfo.linkedin || '')
    .replace(/\[Your LinkedIn Profile\]/gi, contactInfo.linkedin || '')
    .replace(/\[Your LinkedIn\]/gi, contactInfo.linkedin || '')
    .replace(/\[Your Name\]/gi, contactInfo.fullName || '')
    .replace(/\[Your Location\]/gi, contactInfo.location || '')
    .replace(/\[Your Address\]/gi, contactInfo.location || '')
    .replace(/\[Phone Number\]/gi, contactInfo.phone || '')
    .replace(/\[Email Address\]/gi, contactInfo.email || '')
    .replace(/\[LinkedIn URL\]/gi, contactInfo.linkedin || '');
}

export function CoverLetterGenerator({
  open,
  onOpenChange,
  resume,
  jobDescription,
  jobTitle,
  jobCompany,
}: CoverLetterGeneratorProps) {
  const [tone, setTone] = useState<Tone>('professional');
  const [isGenerating, setIsGenerating] = useState(false);
  const [coverLetter, setCoverLetter] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [generationElapsed, setGenerationElapsed] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const generationStartRef = useRef(0);
  const { execute: executeAI } = useAIAction({ operation: 'cover-letter' });

  const GENERATION_STEPS = [
    'Analyzing Job Description...',
    'Matching Keywords...',
    'Optimizing Structure...',
    'Finalizing Content...',
  ];

  // Timer for stepped progress + elapsed tracking
  useEffect(() => {
    if (!isGenerating) {
      setGenerationStep(0);
      setGenerationElapsed(0);
      return;
    }
    generationStartRef.current = Date.now();
    const stepInterval = setInterval(() => {
      setGenerationStep(prev => Math.min(prev + 1, GENERATION_STEPS.length - 1));
    }, 2500);
    const elapsedInterval = setInterval(() => {
      setGenerationElapsed(Math.floor((Date.now() - generationStartRef.current) / 1000));
    }, 1000);
    return () => {
      clearInterval(stepInterval);
      clearInterval(elapsedInterval);
    };
  }, [isGenerating]);
  
  const { 
    setGeneratedCoverLetter, 
    addCoverLetterHistory, 
    coverLetterHistory,
    deleteCoverLetterHistoryEntry,
    clearCoverLetterHistory,
  } = useResumeStore();

  const handleGenerate = async () => {
    if (!resume || !jobDescription) {
      toast.error('Resume and job description are required');
      return;
    }

    setIsGenerating(true);
    abortRef.current = new AbortController();
    try {
      const letter = await executeAI(async () => {
        let result = await generateCoverLetter(resume, jobDescription, tone, abortRef.current!.signal);
        result = injectContactInfo(result, resume.contactInfo);
        return result;
      });

      if (!letter) return;
      
      setCoverLetter(letter);
      
      // Save to store for combined PDF export
      setGeneratedCoverLetter(letter, {
        title: jobTitle || 'Position',
        company: jobCompany || 'Company',
      });
      
      // Auto-save to history
      addCoverLetterHistory({
        jobTitle: jobTitle || 'Position',
        company: jobCompany || 'Company',
        tone,
        coverLetter: letter,
      });
    } catch (error) {
      console.error('Cover letter error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate cover letter');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!coverLetter) return;
    await navigator.clipboard.writeText(coverLetter);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = async () => {
    if (!coverLetter || !resume) return;
    setIsDownloading(true);
    try {
      const pdfBlob = await generateCoverLetterPDF(coverLetter, resume.contactInfo);
      await downloadFile({
        blob: pdfBlob,
        fileName: `Cover_Letter_${(jobCompany || 'Company').replace(/\s+/g, '_')}.pdf`,
        mimeType: 'application/pdf',
      });
      toast.success('PDF downloaded!');
    } catch (error) {
      console.error('PDF download error:', error);
      toast.error('Failed to download PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadTXT = () => {
    if (!coverLetter) return;
    const blob = new Blob([coverLetter], { type: 'text/plain' });
    downloadFile({
      blob,
      fileName: `Cover_Letter_${(jobCompany || 'Company').replace(/\s+/g, '_')}.txt`,
      mimeType: 'text/plain',
    });
    toast.success('Text file downloaded!');
  };

  const handleViewHistoryEntry = (entry: CoverLetterHistory) => {
    setCoverLetter(entry.coverLetter);
    setIsEditing(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl">
          <SheetHeader className="pb-4">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Cover Letter
                <AICostBadge operation="cover-letter" />
              </SheetTitle>
              {coverLetterHistory.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowHistory(true)}
                  className="gap-1.5"
                >
                  <History className="w-4 h-4" />
                  <span className="text-xs">{coverLetterHistory.length}</span>
                </Button>
              )}
            </div>
          </SheetHeader>

          <div className="overflow-y-auto h-[calc(90vh-140px)] space-y-4 pb-20">
            {!coverLetter ? (
              <>
                {/* Settings */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <h4 className="font-semibold text-sm">Cover Letter Settings</h4>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4">
                    Generate a tailored cover letter using your resume's contact info, skills, and experience.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Tone</label>
                      <Select value={tone} onValueChange={(v) => setTone(v as Tone)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                          <SelectItem value="conversational">Conversational</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Contact info preview */}
                    {resume?.contactInfo && (
                      <div className="p-3 rounded-lg bg-background/50 border border-border space-y-1">
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">Auto-included contact info:</p>
                        {resume.contactInfo.phone && (
                          <p className="text-xs text-foreground">📱 {resume.contactInfo.phone}</p>
                        )}
                        {resume.contactInfo.email && (
                          <p className="text-xs text-foreground">📧 {resume.contactInfo.email}</p>
                        )}
                        {resume.contactInfo.linkedin && (
                          <p className="text-xs text-foreground">🔗 {resume.contactInfo.linkedin}</p>
                        )}
                        {!resume.contactInfo.phone && !resume.contactInfo.email && !resume.contactInfo.linkedin && (
                          <p className="text-xs text-muted-foreground italic">No contact info found — add it in the Contact section</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {isGenerating ? (
                  <div className="space-y-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
                    {/* Step dots */}
                    <div className="flex items-center justify-center gap-2">
                      {GENERATION_STEPS.map((_, i) => (
                        <div
                          key={i}
                          className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                            i < generationStep ? 'bg-primary' :
                            i === generationStep ? 'bg-primary animate-pulse scale-125' :
                            'bg-muted-foreground/30'
                          }`}
                        />
                      ))}
                    </div>
                    {/* Current step label */}
                    <p className="text-sm font-medium text-center text-foreground animate-fade-in">
                      {GENERATION_STEPS[generationStep]}
                    </p>
                    {/* Cancel button */}
                    {generationElapsed >= 5 && (
                      <div className="flex justify-center">
                        <Button
                          variant={generationElapsed >= 30 ? 'destructive' : 'ghost'}
                          size="sm"
                          onClick={() => {
                            abortRef.current?.abort();
                            setIsGenerating(false);
                            toast.info('Generation cancelled');
                          }}
                          className="min-h-[44px] min-w-[44px] active:scale-95 transition-transform"
                        >
                          <X className="w-4 h-4 mr-1.5" />
                          {generationElapsed >= 30 ? 'Taking too long? Cancel generation' : 'Cancel'}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <Button
                    className="w-full h-12 gradient-primary font-semibold"
                    onClick={handleGenerate}
                    disabled={!resume || !jobDescription}
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    Generate Cover Letter
                  </Button>
                )}

                {(!resume || !jobDescription) && (
                  <p className="text-xs text-center text-muted-foreground">
                    Tailor your resume first to generate a matching cover letter
                  </p>
                )}
              </>
            ) : (
              <div className="space-y-4 animate-fade-in">
                {/* Success header */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-success/10 via-success/5 to-transparent border border-success/20 relative overflow-hidden">
                  <div className="cover-letter-shimmer" />
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                      <Check className="w-5 h-5 text-success" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-sm">Cover Letter Ready</h4>
                      <div className="flex items-center gap-2 mt-1">
                        {jobTitle && (
                          <span className="text-xs text-muted-foreground truncate">
                            {jobTitle}
                          </span>
                        )}
                        {jobCompany && (
                          <span className="text-xs text-muted-foreground truncate">
                            @ {jobCompany}
                          </span>
                        )}
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {tone}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Letter content */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      {isEditing ? 'Editing' : 'Preview'}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditing(!isEditing)}
                      className="h-7 text-xs gap-1"
                    >
                      {isEditing ? (
                        <>
                          <Eye className="w-3 h-3" />
                          View
                        </>
                      ) : (
                        <>
                          <Edit3 className="w-3 h-3" />
                          Edit
                        </>
                      )}
                    </Button>
                  </div>

                  {isEditing ? (
                    <Textarea
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      className="min-h-[400px] text-sm leading-relaxed resize-none font-mono"
                    />
                  ) : (
                    <div className="p-5 rounded-xl bg-card border border-border min-h-[400px] whitespace-pre-wrap text-sm leading-relaxed cover-letter-paper">
                      {coverLetter}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 gradient-primary"
                      onClick={handleCopy}
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handleDownloadPDF}
                      disabled={isDownloading}
                    >
                      {isDownloading ? (
                        <MiniSpinner size={16} className="mr-2" />
                      ) : (
                        <Download className="w-4 h-4 mr-2" />
                      )}
                      PDF
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleDownloadTXT}
                    >
                      TXT
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setCoverLetter(null);
                        setIsEditing(false);
                      }}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Regenerate
                    </Button>
                    {coverLetterHistory.length > 0 && (
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setShowHistory(true)}
                      >
                        <History className="w-4 h-4 mr-2" />
                        History
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <CoverLetterHistorySheet
        open={showHistory}
        onOpenChange={setShowHistory}
        history={coverLetterHistory}
        onView={handleViewHistoryEntry}
        onDelete={deleteCoverLetterHistoryEntry}
        onClear={clearCoverLetterHistory}
      />
    </>
  );
}
