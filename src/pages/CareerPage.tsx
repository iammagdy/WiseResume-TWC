import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, RefreshCw, MapPin, Briefcase, Clock, TrendingUp } from 'lucide-react';
import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { Skeleton } from '@/components/ui/skeleton';
import { CareerQuizSheet, QuizAnswers } from '@/components/career/CareerQuizSheet';
import { CareerRoadmap } from '@/components/career/CareerRoadmap';
import { SkillGapAnalyzer } from '@/components/career/SkillGapAnalyzer';
import { useCareerAssessment, useCareerMutations } from '@/hooks/useCareerAssessment';
import { useResumes, dbToResumeData } from '@/hooks/useResumes';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/safeClient';
import { trackGeminiUsage } from '@/lib/aiProvider';
import { checkAIRateLimit } from '@/lib/rateLimiter';
import { CareerPathResult } from '@/lib/careerPath';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';

export default function CareerPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: assessment, isLoading, refetch } = useCareerAssessment();
  const { createAssessment } = useCareerMutations();
  const { data: resumes } = useResumes();
  const { toggleMilestone } = useCareerMutations();
  const [showQuiz, setShowQuiz] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Auth guard handled by ProtectedRoute

  const primaryResume = resumes?.find(r => r.is_primary) || resumes?.[0];

  const handleQuizComplete = async (answers: QuizAnswers) => {
    if (!primaryResume) {
      toast.error('Create a resume first to get personalized career advice');
      return;
    }

    const rateCheck = checkAIRateLimit('careerPath');
    if (!rateCheck.allowed) {
      toast.error(`Too many requests. Wait ${rateCheck.waitSeconds}s.`);
      return;
    }

    setIsAnalyzing(true);
    try {
      const resumeData = dbToResumeData(primaryResume);

      const { data, error } = await supabase.functions.invoke('career-assessment', {
        body: { resume: resumeData, quizAnswers: answers },
      });

      if (error) throw new Error(error.message || 'Analysis failed');

      trackGeminiUsage();

      await createAssessment.mutateAsync({
        resumeId: primaryResume.id,
        result: data as CareerPathResult,
        quizAnswers: answers as unknown as Record<string, unknown>,
      });

      setShowQuiz(false);
      haptics.success();
    } catch (err) {
      console.error('Career assessment error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to analyze career path');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleToggleMilestone = (milestoneId: string) => {
    if (!assessment) return;
    toggleMilestone.mutate({
      assessmentId: assessment.id,
      milestoneId,
      completed: assessment.completed_milestones,
    });
  };

  const handleRefresh = async () => {
    await refetch();
    haptics.success();
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <header className="shrink-0 sticky top-0 z-50 glass-header border-b border-border px-4 py-3 pt-safe">
        <div className="flex items-center gap-3">
          <BackButton />
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h1 className="text-page-title">Career Plan</h1>
          </div>
        </div>
      </header>

      <PullToRefresh onRefresh={handleRefresh} className="flex-1">
        <div className="px-4 py-4 pb-safe space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-48 rounded-2xl" />
              <Skeleton className="h-64 rounded-2xl" />
            </div>
          ) : !assessment ? (
            /* Empty state - start assessment */
            <Card className="overflow-hidden">
              <div className="gradient-primary p-6 text-primary-foreground">
                <Sparkles className="w-10 h-10 mb-3" />
                <h2 className="text-xl font-bold mb-1">Discover Your Career Path</h2>
                <p className="text-sm opacity-90">
                  Answer 10 quick questions and let AI analyze your resume to create a personalized career roadmap.
                </p>
              </div>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="w-4 h-4 text-primary shrink-0" />
                    <span>Personalized skill gap analysis</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Briefcase className="w-4 h-4 text-primary shrink-0" />
                    <span>Next role recommendations with match scores</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="w-4 h-4 text-primary shrink-0" />
                    <span>Step-by-step action plan with milestones</span>
                  </div>
                </div>
                <Button
                  onClick={() => { haptics.medium(); setShowQuiz(true); }}
                  className="w-full mt-4 min-h-[48px] active:scale-95"
                  disabled={!primaryResume}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {primaryResume ? 'Start Assessment' : 'Create a Resume First'}
                </Button>
                {!primaryResume && (
                  <Button
                    variant="outline"
                    onClick={() => navigate('/upload')}
                    className="w-full mt-2 min-h-[48px]"
                  >
                    Create Resume
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            /* Assessment results */
            <>
              {/* Summary card */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{assessment.result.primaryField}</h3>
                      <p className="text-sm text-muted-foreground capitalize">
                        {assessment.result.currentLevel} level · {assessment.result.yearsExperience} years
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Roadmap */}
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground mb-3">Your Roadmap</h2>
                <CareerRoadmap
                  result={assessment.result}
                  completedMilestones={assessment.completed_milestones}
                  onToggleMilestone={handleToggleMilestone}
                />
              </div>

              {/* Skill gaps */}
              <SkillGapAnalyzer
                skillGaps={assessment.result.skillGaps}
                currentSkills={primaryResume ? dbToResumeData(primaryResume).skills : []}
              />

              {/* Next roles */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Recommended Next Roles</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {assessment.result.nextRoles.map((role, i) => (
                    <div key={i} className="glass-input rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold">{role.title}</p>
                        <Badge className="text-[10px]">{role.matchScore}%</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{role.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {role.requiredSkills.slice(0, 3).map((s, j) => (
                          <Badge key={j} variant="secondary" className="text-[10px]">{s}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Industry alternatives */}
              {assessment.result.industryAlternatives.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Industry Alternatives</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {assessment.result.industryAlternatives.map((alt, i) => (
                      <div key={i} className="glass-input rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-semibold">{alt.role}</p>
                          <Badge
                            variant={alt.salaryComparison === 'higher' ? 'default' : 'secondary'}
                            className="text-[10px]"
                          >
                            {alt.salaryComparison} pay
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{alt.industry}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Re-analyze */}
              <Button
                variant="outline"
                onClick={() => { haptics.medium(); setShowQuiz(true); }}
                className="w-full min-h-[48px]"
              >
                <RefreshCw className="w-4 h-4 mr-2" /> Re-analyze Career Path
              </Button>
            </>
          )}
        </div>
      </PullToRefresh>

      <CareerQuizSheet
        open={showQuiz}
        onOpenChange={setShowQuiz}
        onComplete={handleQuizComplete}
        isAnalyzing={isAnalyzing}
      />
    </div>
  );
}
