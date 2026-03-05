import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, RefreshCw, MapPin, Briefcase, Clock, TrendingUp, Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { Skeleton } from '@/components/ui/skeleton';
import { CareerQuizSheet, QuizAnswers } from '@/components/career/CareerQuizSheet';
import { CareerRoadmap } from '@/components/career/CareerRoadmap';
import { CareerMindmap } from '@/components/career/CareerMindmap';
import { SkillCourseCard } from '@/components/career/SkillCourseCard';
import { useCareerAssessment, useCareerMutations } from '@/hooks/useCareerAssessment';
import { useResumes, dbToResumeData } from '@/hooks/useResumes';
import { useAuth } from '@/hooks/useAuth';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { useAIAction } from '@/hooks/useAIAction';
import { checkAIRateLimit } from '@/lib/rateLimiter';
import { CareerPathResult } from '@/lib/careerPath';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';

export default function CareerPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: assessment, isLoading, refetch } = useCareerAssessment();
  const { createAssessment, toggleMilestone } = useCareerMutations();
  const { data: resumes } = useResumes();
  const [showQuiz, setShowQuiz] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { execute: executeAI } = useAIAction({ operation: 'career-assessment' });

  const primaryResume = resumes?.find(r => r.is_primary) || resumes?.[0];

  // Compute skill completion progress
  const skillProgress = useMemo(() => {
    if (!assessment?.result?.skillGaps) return { completed: 0, total: 0, percent: 0 };
    const total = assessment.result.skillGaps.length;
    const completed = assessment.completed_milestones.filter(m => m.startsWith('skill:')).length;
    return { completed, total, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [assessment]);

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

      const result = await executeAI(async () => {
        const { data, error } = await edgeFunctions.functions.invoke('career-assessment', {
          body: { resume: resumeData, quizAnswers: answers },
        });

        if (error) throw new Error(error.message || 'Analysis failed');
        return data;
      });

      if (!result) { setIsAnalyzing(false); return; }

      await createAssessment.mutateAsync({
        resumeId: primaryResume.id,
        result: result as CareerPathResult,
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

  const handleToggleSkill = (skillName: string) => {
    handleToggleMilestone(`skill:${skillName}`);
  };

  const handleRefresh = async () => {
    await refetch();
    haptics.success();
  };

  const r = assessment?.result;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <header className="shrink-0 sticky top-0 z-50 glass-header border-b border-border px-4 py-3 pt-safe">
        <div className="flex items-center gap-3">
          <BackButton />
          <div className="flex items-center gap-2 flex-1">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h1 className="text-page-title">Career Plan</h1>
          </div>
          {assessment && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { haptics.medium(); setShowQuiz(true); }}
              className="h-8 gap-1 text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Re-analyze
            </Button>
          )}
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
            /* Empty state */
            <Card className="overflow-hidden">
              <div className="gradient-primary p-6 text-primary-foreground">
                <Sparkles className="w-10 h-10 mb-3" />
                <h2 className="text-xl font-bold mb-1">Discover Your Career Path</h2>
                <p className="text-sm opacity-90">
                  AI will deeply analyze your resume to create a personalized career roadmap with real course recommendations.
                </p>
              </div>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="w-4 h-4 text-primary shrink-0" />
                    <span>Interactive career mindmap visualization</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Briefcase className="w-4 h-4 text-primary shrink-0" />
                    <span>Real YouTube courses for skill gaps</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="w-4 h-4 text-primary shrink-0" />
                    <span>Progress tracking & reminders</span>
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
          ) : r && (
            <>
              {/* Summary Card */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                      <TrendingUp className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{r.primaryField}</h3>
                      <p className="text-sm text-muted-foreground capitalize">
                        {r.currentLevel} · {r.yearsExperience}yr exp
                      </p>
                    </div>
                  </div>

                  {r.strengthSummary && (
                    <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Shield className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                        <p className="text-xs font-semibold text-green-700 dark:text-green-400">Your Strengths</p>
                      </div>
                      <p className="text-xs text-green-800 dark:text-green-300">{r.strengthSummary}</p>
                    </div>
                  )}

                  {r.riskFactors && r.riskFactors.length > 0 && (
                    <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Watch Out</p>
                      </div>
                      <ul className="space-y-1">
                        {r.riskFactors.map((risk, i) => (
                          <li key={i} className="text-xs text-amber-800 dark:text-amber-300">• {risk}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Skill progress */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">Skill Progress</p>
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-primary" />
                        <span className="text-xs font-semibold">{skillProgress.completed}/{skillProgress.total}</span>
                      </div>
                    </div>
                    <Progress value={skillProgress.percent} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              {/* Tabs */}
              <Tabs defaultValue="overview" className="space-y-3">
                <TabsList className="w-full grid grid-cols-4 h-10">
                  <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                  <TabsTrigger value="mindmap" className="text-xs">Mindmap</TabsTrigger>
                  <TabsTrigger value="skills" className="text-xs">Skills</TabsTrigger>
                  <TabsTrigger value="roles" className="text-xs">Roles</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4 mt-0">
                  <CareerRoadmap
                    result={r}
                    completedMilestones={assessment.completed_milestones}
                    onToggleMilestone={handleToggleMilestone}
                  />
                </TabsContent>

                {/* Mindmap Tab */}
                <TabsContent value="mindmap" className="mt-0">
                  {r.careerMap ? (
                    <CareerMindmap careerMap={r.careerMap} />
                  ) : (
                    <Card>
                      <CardContent className="p-6 text-center text-muted-foreground">
                        <p className="text-sm">Re-analyze to generate your career mindmap</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { haptics.medium(); setShowQuiz(true); }}
                          className="mt-3"
                        >
                          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Re-analyze
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Skills Tab */}
                <TabsContent value="skills" className="space-y-3 mt-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Skill Gaps & Courses</h3>
                    <Badge variant="outline" className="text-xs">{skillProgress.percent}% complete</Badge>
                  </div>
                  {r.skillGaps.map((gap, i) => (
                    <SkillCourseCard
                      key={i}
                      gap={gap}
                      isCompleted={assessment.completed_milestones.includes(`skill:${gap.skill}`)}
                      onToggleComplete={() => handleToggleSkill(gap.skill)}
                    />
                  ))}
                </TabsContent>

                {/* Roles Tab */}
                <TabsContent value="roles" className="space-y-4 mt-0">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Recommended Next Roles</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {r.nextRoles.map((role, i) => (
                        <div key={i} className="glass-input rounded-xl p-3">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-semibold">{role.title}</p>
                            <Badge className="text-[10px]">{role.matchScore}%</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{role.description}</p>
                          <p className="text-[11px] text-muted-foreground/70 mt-1">Ready in: {role.timeToReady}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {role.requiredSkills.slice(0, 4).map((s, j) => (
                              <Badge key={j} variant="secondary" className="text-[10px]">{s}</Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {r.industryAlternatives.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Industry Alternatives</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {r.industryAlternatives.map((alt, i) => (
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
                            <div className="flex flex-wrap gap-1 mt-2">
                              {alt.transferableSkills.slice(0, 3).map((s, j) => (
                                <Badge key={j} variant="outline" className="text-[10px]">✓ {s}</Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
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
