import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Loader2, Copy, Check, Download, Sparkles } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ResumeData } from '@/types/resume';
import { generateCoverLetter } from '@/lib/aiTailor';
import { useResumeStore } from '@/store/resumeStore';
import { toast } from 'sonner';

interface CoverLetterGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resume: ResumeData | null;
  jobDescription: string;
  jobTitle?: string;
  jobCompany?: string;
}

type Tone = 'professional' | 'enthusiastic' | 'conversational';

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
  
  const { setGeneratedCoverLetter } = useResumeStore();

  const handleGenerate = async () => {
    if (!resume || !jobDescription) {
      toast.error('Resume and job description are required');
      return;
    }

    setIsGenerating(true);
    try {
      const letter = await generateCoverLetter(resume, jobDescription, tone);
      setCoverLetter(letter);
      
      // Save to store for combined PDF export
      setGeneratedCoverLetter(letter, {
        title: jobTitle || 'Position',
        company: jobCompany || 'Company',
      });
      
      toast.success('Cover letter generated!');
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

  const handleDownload = () => {
    if (!coverLetter) return;
    const blob = new Blob([coverLetter], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cover-letter.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Cover letter downloaded!');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Generate Cover Letter
          </SheetTitle>
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
                  Based on your tailored resume, generate a matching cover letter for this position.
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
                </div>
              </div>

              <Button
                className="w-full h-12 gradient-primary font-semibold"
                onClick={handleGenerate}
                disabled={isGenerating || !resume || !jobDescription}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5 mr-2" />
                    Generate Cover Letter
                  </>
                )}
              </Button>

              {(!resume || !jobDescription) && (
                <p className="text-xs text-center text-muted-foreground">
                  Tailor your resume first to generate a matching cover letter
                </p>
              )}
            </>
          ) : (
            <>
              {/* Generated Letter */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Check className="w-4 h-4 text-success" />
                    Your Cover Letter
                  </h4>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleCopy}>
                      {copied ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleDownload}>
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <Textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  className="min-h-[400px] text-sm leading-relaxed resize-none"
                />

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setCoverLetter(null)}
                  >
                    Regenerate
                  </Button>
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
                        Copy to Clipboard
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
