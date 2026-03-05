import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Sparkles, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useResumeStore } from '@/store/resumeStore';
import { analyzeResume } from '@/lib/aiAnalysis';
import { useAIAction } from '@/hooks/useAIAction';
import { toast } from 'sonner';
import { activityTracker } from '@/lib/activityTracker';
import { AIProviderVia } from '@/components/editor/ai/AIProviderBadge';

interface JobAnalysisSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JobAnalysisSheet({ open, onOpenChange }: JobAnalysisSheetProps) {
  const { execute } = useAIAction({ operation: 'analyze' });

  useEffect(() => {
    if (open) { activityTracker.setActiveFeature('Job Match Analysis'); }
    return () => { activityTracker.setActiveFeature(null); };
  }, [open]);

  const { 
    currentResume, 
    jobDescription, 
    setJobDescription, 
    matchScore, 
    setMatchScore,
    gapAnalysis,
    setGapAnalysis,
    isAnalyzing,
    setIsAnalyzing 
  } = useResumeStore();

  // Clear stale results when sheet closes
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setMatchScore(null);
      setGapAnalysis(null);
    }
    onOpenChange(isOpen);
  };

  const handleAnalyze = async () => {
    if (!jobDescription.trim()) {
      toast.error('Please paste a job description');
      return;
    }

    if (!currentResume) {
      toast.error('No resume to analyze');
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await execute(async () => {
        return await analyzeResume(currentResume, jobDescription);
      });
      
      if (result) {
        setMatchScore(result.score);
        setGapAnalysis(result.gaps);
        toast.success('Analysis complete!');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Failed to analyze. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="h-[90vh]">
        <SheetHeader className="pb-4 shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Job Match Analysis
          </SheetTitle>
          <AIProviderVia className="mt-0.5" />
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pb-20">
          {/* Job Description Input */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Paste Job Description
            </label>
            <Textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job posting here..."
              className="min-h-[140px] resize-none text-base"
            />
          </div>

          <Button
            className="w-full h-12 gradient-primary font-semibold"
            onClick={handleAnalyze}
            disabled={isAnalyzing || !jobDescription.trim()}
          >
            {isAnalyzing ? (
              <>
                <MiniSpinner size={20} className="mr-2" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Analyze Match
              </>
            )}
          </Button>

          {/* Results */}
          {matchScore && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Overall Score */}
              <div className="p-6 rounded-2xl bg-card border border-border text-center">
                <p className="text-sm text-muted-foreground mb-2">Match Score</p>
                <p className={`text-5xl font-display font-bold ${getScoreColor(matchScore.overallScore)}`}>
                  {matchScore.overallScore}%
                </p>
              </div>

              {/* Breakdown */}
              <div className="grid grid-cols-2 gap-3">
                <ScoreCard label="Skills Match" value={matchScore.skillsMatch} />
                <ScoreCard label="Experience" value={matchScore.experienceRelevance} />
                <ScoreCard label="Keywords" value={matchScore.keywordAlignment} />
                <ScoreCard label="ATS Score" value={matchScore.atsCompatibility} />
              </div>

              {/* Strengths */}
              {matchScore.strengths.length > 0 && (
                <div className="p-4 rounded-xl bg-success/10 border border-success/30">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <h4 className="font-semibold text-sm">Strengths</h4>
                  </div>
                  <ul className="space-y-1">
                    {matchScore.strengths.map((item, i) => (
                      <li key={i} className="text-xs text-muted-foreground">• {item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Gap Analysis */}
              {gapAnalysis && (
                <>
                  {gapAnalysis.missingKeywords.length > 0 && (
                    <div className="p-4 rounded-xl bg-warning/10 border border-warning/30">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertCircle className="w-4 h-4 text-warning" />
                        <h4 className="font-semibold text-sm">Missing Keywords</h4>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {gapAnalysis.missingKeywords.slice(0, 8).map((keyword, i) => (
                          <Badge key={i} variant="outline" className="text-xs border-warning text-warning">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {gapAnalysis.priorityImprovements.length > 0 && (
                    <div className="p-4 rounded-xl bg-primary/10 border border-primary/30">
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        <h4 className="font-semibold text-sm">Priority Improvements</h4>
                      </div>
                      <ul className="space-y-2">
                        {gapAnalysis.priorityImprovements.slice(0, 5).map((item, i) => (
                          <li key={i} className="text-xs">
                            <span className={`inline-block w-12 px-1 py-0.5 rounded text-center mr-2 ${
                              item.priority === 'high' ? 'bg-destructive/20 text-destructive' :
                              item.priority === 'medium' ? 'bg-warning/20 text-warning' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              {item.priority}
                            </span>
                            {item.suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-3 rounded-xl bg-card border border-border">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <Progress value={value} className="flex-1 h-2" />
        <span className="text-sm font-semibold">{value}%</span>
      </div>
    </div>
  );
}
