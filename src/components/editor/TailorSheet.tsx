import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, Loader2, CheckCircle, ArrowRight, Undo2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useResumeStore } from '@/store/resumeStore';
import { tailorResume, TailorResult } from '@/lib/aiTailor';
import { toast } from 'sonner';

interface TailorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TailorSheet({ open, onOpenChange }: TailorSheetProps) {
  const { 
    currentResume, 
    jobDescription, 
    setJobDescription,
    updateResume 
  } = useResumeStore();

  const [isTailoring, setIsTailoring] = useState(false);
  const [tailorResult, setTailorResult] = useState<TailorResult | null>(null);
  const [originalResume, setOriginalResume] = useState<typeof currentResume>(null);

  const handleTailor = async () => {
    if (!jobDescription.trim()) {
      toast.error('Please paste a job description first');
      return;
    }

    if (!currentResume) {
      toast.error('No resume to tailor');
      return;
    }

    setIsTailoring(true);
    setOriginalResume(currentResume);

    try {
      const result = await tailorResume(currentResume, jobDescription);
      setTailorResult(result);
      toast.success('Resume tailored successfully!');
    } catch (error) {
      console.error('Tailor error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to tailor resume');
    } finally {
      setIsTailoring(false);
    }
  };

  const handleApplyChanges = () => {
    if (!tailorResult || !currentResume) return;

    updateResume({
      summary: tailorResult.summary,
      skills: tailorResult.skills,
      experience: tailorResult.experience.map((exp, index) => ({
        ...currentResume.experience[index],
        ...exp,
      })),
      education: tailorResult.education.map((edu, index) => ({
        ...currentResume.education[index],
        ...edu,
      })),
    });

    toast.success('Changes applied to your resume!');
    setTailorResult(null);
    onOpenChange(false);
  };

  const handleRevert = () => {
    if (originalResume) {
      updateResume(originalResume);
      toast.info('Reverted to original resume');
    }
    setTailorResult(null);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            AI Resume Tailor
          </SheetTitle>
        </SheetHeader>

        <div className="overflow-y-auto h-[calc(90vh-100px)] space-y-4 pb-20">
          {/* Job Description Input */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Target Job Description
            </label>
            <Textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job posting you want to tailor your resume for..."
              className="min-h-[120px] resize-none"
            />
            <p className="text-xs text-muted-foreground mt-2">
              The AI will rewrite your resume to match this job's requirements
            </p>
          </div>

          <Button
            className="w-full h-12 gradient-primary font-semibold"
            onClick={handleTailor}
            disabled={isTailoring || !jobDescription.trim()}
          >
            {isTailoring ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Tailoring Resume...
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5 mr-2" />
                Tailor My Resume
              </>
            )}
          </Button>

          {/* Tailoring Progress */}
          <AnimatePresence>
            {isTailoring && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 rounded-xl bg-primary/10 border border-primary/30"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">AI is working...</p>
                    <p className="text-xs text-muted-foreground">
                      Optimizing your resume for the target role
                    </p>
                  </div>
                </div>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p>• Analyzing job requirements...</p>
                  <p>• Matching your experience...</p>
                  <p>• Rewriting content with keywords...</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results */}
          <AnimatePresence>
            {tailorResult && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Success Header */}
                <div className="p-4 rounded-xl bg-success/10 border border-success/30">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-success" />
                    <h4 className="font-semibold">Resume Tailored!</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Review the changes below and apply them to your resume.
                  </p>
                </div>

                {/* Key Changes */}
                {tailorResult.keyChanges && tailorResult.keyChanges.length > 0 && (
                  <div className="p-4 rounded-xl bg-card border border-border">
                    <h4 className="font-semibold text-sm mb-3">Key Changes Made</h4>
                    <ul className="space-y-2">
                      {tailorResult.keyChanges.map((change, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <ArrowRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                          <span className="text-muted-foreground">{change}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Preview Summary */}
                <div className="p-4 rounded-xl bg-card border border-border">
                  <h4 className="font-semibold text-sm mb-2">New Summary</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {tailorResult.summary}
                  </p>
                </div>

                {/* Skills Preview */}
                <div className="p-4 rounded-xl bg-card border border-border">
                  <h4 className="font-semibold text-sm mb-3">Optimized Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {tailorResult.skills.slice(0, 12).map((skill, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                    {tailorResult.skills.length > 12 && (
                      <Badge variant="outline" className="text-xs">
                        +{tailorResult.skills.length - 12} more
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleRevert}
                  >
                    <Undo2 className="w-4 h-4 mr-2" />
                    Discard
                  </Button>
                  <Button
                    className="flex-1 gradient-primary"
                    onClick={handleApplyChanges}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Apply Changes
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tips */}
          {!tailorResult && !isTailoring && (
            <div className="p-4 rounded-xl bg-muted/50 border border-border">
              <h4 className="font-semibold text-sm mb-2">How it works</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• AI analyzes the job requirements and keywords</li>
                <li>• Your experience is rewritten to highlight relevant skills</li>
                <li>• Summary and bullet points are optimized for ATS</li>
                <li>• You review and approve all changes before applying</li>
              </ul>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
