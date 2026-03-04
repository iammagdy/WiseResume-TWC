import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Edit2, Eye, Download, Share2, Copy, Trash2, GitBranch, Crown, Zap, BarChart3, RefreshCw, Mic, MoreVertical, Sparkles } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { BackButton } from '@/components/ui/BackButton';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { TemplateThumbnail } from '@/components/editor/TemplateThumbnail';
import { templateComponents } from '@/components/editor/TemplateThumbnail';
import { ScoreRing } from '@/components/dashboard/ScoreRing';
import { useResume, useResumes, useResumeMutations, dbToResumeData } from '@/hooks/useResumes';
import { useResumeScore, clearCachedScore } from '@/hooks/useResumeScore';
import { useResumeStore } from '@/store/resumeStore';
import { templates } from '@/lib/templateData';
import { formatDistanceToNow } from 'date-fns';
import { useResumeShareMutations } from '@/hooks/useResumeShares';
import { toast } from 'sonner';
import { TemplateId } from '@/types/resume';
import { calcOverallScore, calcContactScore, calcSummaryScore, calcExperienceScore, calcEducationScore, calcSkillsScore, getSectionStatus } from '@/lib/resumeCompletionRules';
import { ProgressBar } from '@/components/editor/ProgressBar';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useATSScoreHistoryStore } from '@/store/atsScoreHistoryStore';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Card, CardContent } from '@/components/ui/card';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { ChevronDown } from 'lucide-react';

const ATSScoreTrendChart = lazyWithRetry(() => import('@/components/dashboard/ATSScoreTrendChart').then(m => ({ default: m.ATSScoreTrendChart })));

const AIEnhanceSheet = lazy(() => import('@/components/editor/ai/AIEnhanceSheet').then(m => ({ default: m.AIEnhanceSheet })));

export default function ResumeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data: dbResume, isLoading } = useResume(id || null);
  const { data: allResumes = [] } = useResumes();
  const { deleteResume, duplicateResume } = useResumeMutations();
  const { setCurrentResume, setCurrentResumeId, setSelectedTemplate } = useResumeStore();
  const { getCachedScore, getLatestCachedScore, scoreResume, scoringId } = useResumeScore();
  const { createShare } = useResumeShareMutations();
  const { updateResume } = useResumeMutations();
  const queryClient = useQueryClient();
  const scoreHistory = useATSScoreHistoryStore(s => id ? s.getHistory(id) : []);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showEnhance, setShowEnhance] = useState(false);
  const [improvedSections, setImprovedSections] = useState<Set<string>>(new Set());
  const enhancedRef = useRef(false);
  const enhancedSectionsRef = useRef<string[]>([]);
  const prevScoreRef = useRef<ReturnType<typeof getCachedScore>>(null);
  const hiddenTemplateRef = useRef<HTMLDivElement>(null);

  // Redirect download action to Preview page for proper page break handling
  useEffect(() => {
    if (searchParams.get('action') !== 'download' || !dbResume || isLoading) return;
    searchParams.delete('action');
    setSearchParams(searchParams, { replace: true });
    // Load resume into store and redirect to preview
    const rd = dbToResumeData(dbResume);
    setCurrentResume(rd);
    setCurrentResumeId(dbResume.id);
    setSelectedTemplate(dbResume.template_id as TemplateId);
    navigate('/preview?action=download', { replace: true });
  }, [dbResume, isLoading]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <MiniSpinner size={32} className="text-primary" />
      </div>
    );
  }

  if (!dbResume) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <h2 className="text-xl font-bold text-foreground mb-2">Resume not found</h2>
        <p className="text-muted-foreground mb-4">This resume may have been deleted.</p>
        <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
      </div>
    );
  }

  const resumeData = dbToResumeData(dbResume);
  const templateInfo = templates.find(t => t.id === dbResume.template_id);
  const healthScore = getCachedScore(dbResume.id, dbResume.updated_at) ?? getLatestCachedScore(dbResume.id);
  
  const isTailored = !!dbResume.parent_resume_id;
  const isMaster = !!dbResume.is_primary;

  // Quick stats
  const completionScore = calcOverallScore(resumeData);
  const sectionScores = [
    calcContactScore(resumeData.contactInfo),
    calcSummaryScore(resumeData.summary),
    calcExperienceScore(resumeData.experience),
    calcEducationScore(resumeData.education),
    calcSkillsScore(resumeData.skills),
  ];
  const completedSections = sectionScores.filter(s => getSectionStatus(s) === 'complete').length;
  const totalSections = sectionScores.length;
  const tailoredCount = allResumes.filter(r => r.parent_resume_id === dbResume.id).length;

  const handleEdit = () => {
    setCurrentResume(resumeData);
    setCurrentResumeId(dbResume.id);
    setSelectedTemplate(dbResume.template_id as TemplateId);
    navigate('/editor');
  };

  const handlePreview = () => {
    setCurrentResume(resumeData);
    setCurrentResumeId(dbResume.id);
    setSelectedTemplate(dbResume.template_id as TemplateId);
    navigate('/preview');
  };

  const handleDownload = () => {
    // Redirect all downloads to Preview page for proper page break handling
    setCurrentResume(resumeData);
    setCurrentResumeId(dbResume.id);
    setSelectedTemplate(dbResume.template_id as TemplateId);
    navigate('/preview?action=download');
  };



  const handleDuplicate = () => {
    duplicateResume.mutate(dbResume.id, {
      onSuccess: () => navigate('/dashboard'),
    });
  };

  const handleDelete = () => {
    deleteResume.mutate(dbResume.id, {
      onSuccess: () => navigate('/dashboard'),
    });
  };

  const handleTailor = () => {
    setCurrentResume(resumeData);
    setCurrentResumeId(dbResume.id);
    setSelectedTemplate(dbResume.template_id as TemplateId);
    navigate('/editor?openTailor=1');
  };

  const handleInterview = () => {
    setCurrentResume(resumeData);
    setCurrentResumeId(dbResume.id);
    navigate('/interview');
  };



  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header with overflow menu */}
      <div className="shrink-0 flex items-center gap-3 px-4 h-14 border-b border-border glass-elevated backdrop-blur-md">
        <BackButton />
        <h1 className="text-lg font-bold text-foreground truncate flex-1">{dbResume.title}</h1>
        {isMaster && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 gap-1 border-primary/30 text-primary shrink-0">
            <Crown className="w-3 h-3" />
            Master
          </Badge>
        )}
        {isTailored && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 gap-1 shrink-0">
            <GitBranch className="w-3 h-3" />
            Tailored
          </Badge>
        )}
        {tailoredCount > 0 && !isTailored && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 shrink-0">
            {tailoredCount} tailored
          </Badge>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 -mr-2 rounded-xl hover:bg-muted/50 min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="More options">
              <MoreVertical className="w-5 h-5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleDuplicate}>
              <Copy className="w-4 h-4 mr-2" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              createShare.mutate({ resumeId: dbResume.id }, {
                onSuccess: (data) => {
                  const url = `${window.location.origin}/share/${data.token}`;
                  navigator.clipboard.writeText(url);
                  toast.success('Share link copied!');
                },
              });
            }}>
              <Share2 className="w-4 h-4 mr-2" /> Share Link
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeleteOpen(true)} className="text-destructive focus:text-destructive">
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 max-w-3xl mx-auto w-full">
        {/* Tailored Context */}
        {isTailored && (dbResume.target_job_title || dbResume.target_company) && (
          <div className="glass-elevated rounded-2xl p-4 border border-primary/20">
            <p className="text-xs font-medium text-muted-foreground mb-1">Tailored for</p>
            <p className="text-sm font-semibold text-foreground">
              {dbResume.target_job_title}
              {dbResume.target_company ? ` @ ${dbResume.target_company}` : ''}
            </p>
            <button
              onClick={() => navigate(`/resume/${dbResume.parent_resume_id}`)}
              className="text-xs text-primary mt-2 hover:underline"
            >
              ← View Original Resume
            </button>
          </div>
        )}

        {/* Hero Card: Thumbnail + ATS + Meta + Progress + Actions */}
        <div className="glass-elevated rounded-2xl p-4 border border-border/20 space-y-4">
          {/* Top row: thumbnail + score + meta */}
          <div className="flex gap-4">
            <div className="w-[100px] shrink-0 rounded-xl overflow-hidden border border-border/50 shadow-sm">
              <TemplateThumbnail templateId={dbResume.template_id as TemplateId} resume={resumeData} />
            </div>

            <div className="flex-1 min-w-0 flex flex-col justify-between">
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center gap-1">
                  {healthScore ? (
                    <>
                      <ScoreRing score={healthScore.overallScore} size={56} strokeWidth={4} />
                      <span className="text-[10px] font-semibold text-muted-foreground">ATS</span>
                    </>
                  ) : (
                    <button
                      onClick={() => scoreResume(dbResume.id, resumeData, dbResume.updated_at)}
                      disabled={scoringId === dbResume.id}
                      className="flex flex-col items-center gap-1"
                      aria-label="Score resume"
                    >
                      <div className="w-14 h-14 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                        {scoringId === dbResume.id ? <MiniSpinner size={20} /> : <BarChart3 className="w-5 h-5 text-muted-foreground/50" />}
                      </div>
                      <span className="text-[10px] text-muted-foreground">Score</span>
                    </button>
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">{templateInfo?.name || dbResume.template_id}</Badge>
                  <p className="text-xs text-muted-foreground">
                    {completedSections}/{totalSections} sections · {completionScore}%
                  </p>
                  <p className="text-[11px] text-muted-foreground/70">
                    Edited {formatDistanceToNow(new Date(dbResume.updated_at), { addSuffix: true })}
                  </p>
                </div>
              </div>

              {healthScore && (
                <div className="flex gap-2 mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2.5 text-xs gap-1.5"
                    disabled={scoringId === dbResume.id}
                    onClick={() => {
                      clearCachedScore(dbResume.id, dbResume.updated_at);
                      scoreResume(dbResume.id, resumeData, dbResume.updated_at);
                    }}
                  >
                    {scoringId === dbResume.id ? <MiniSpinner size={14} /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Re-score
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 px-2.5 text-xs gap-1.5"
                    onClick={() => {
                      setCurrentResume(resumeData);
                      setCurrentResumeId(dbResume.id);
                      setSelectedTemplate(dbResume.template_id as TemplateId);
                      prevScoreRef.current = getCachedScore(dbResume.id, dbResume.updated_at);
                      enhancedRef.current = false;
                      enhancedSectionsRef.current = [];
                      setShowEnhance(true);
                    }}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Improve
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Inline Progress */}
          <ProgressBar resume={resumeData} compact />

          {/* Primary CTA */}
          <Button className="w-full gap-2 min-h-[48px] active:scale-[0.98] transition-transform text-base" onClick={handleEdit}>
            <Edit2 className="w-4.5 h-4.5" /> Edit Resume
          </Button>

          {/* Secondary actions */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 gap-2 min-h-[44px] active:scale-[0.98] transition-transform" onClick={handlePreview}>
              <Eye className="w-4 h-4" /> Preview & Export
            </Button>
            <Button variant="outline" className="flex-1 gap-2 min-h-[44px] active:scale-[0.98] transition-transform" onClick={handleDownload} disabled={isDownloading}>
              {isDownloading ? <MiniSpinner size={16} /> : <Download className="w-4 h-4" />} Download PDF
            </Button>
          </div>
        </div>

        {/* Score History (collapsible) */}
        {scoreHistory.length >= 2 && (
          <Collapsible>
            <Card>
              <CollapsibleTrigger className="w-full flex items-center justify-between p-4">
                <span className="text-sm font-semibold text-foreground">Score History</span>
                <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform [[data-state=open]>svg&]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <Suspense fallback={<div className="h-[200px] bg-muted animate-pulse rounded-xl" />}>
                    <ATSScoreTrendChart history={scoreHistory} mode="full" />
                  </Suspense>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {/* AI Tools */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground px-1">AI Tools</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleTailor}
              className="flex items-center gap-3 p-3.5 rounded-2xl glass-elevated hover:border-primary/30 border border-border/20 transition-all touch-manipulation active:scale-[0.98] min-h-[56px]"
              aria-label="Tailor resume"
            >
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="w-4.5 h-4.5 text-primary" />
              </div>
              <div className="text-left min-w-0">
                <p className="text-sm font-medium text-foreground">Tailor</p>
                <p className="text-[11px] text-muted-foreground truncate">Customize for a job</p>
              </div>
            </button>

            <button
              onClick={handleInterview}
              className="flex items-center gap-3 p-3.5 rounded-2xl glass-elevated hover:border-primary/30 border border-border/20 transition-all touch-manipulation active:scale-[0.98] min-h-[56px]"
              aria-label="Interview prep"
            >
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Mic className="w-4.5 h-4.5 text-primary" />
              </div>
              <div className="text-left min-w-0">
                <p className="text-sm font-medium text-foreground">Interview</p>
                <p className="text-[11px] text-muted-foreground truncate">Practice questions</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resume</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{dbResume.title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AI Enhance Sheet (inline, no navigation) */}
      <ErrorBoundary>
        <Suspense fallback={null}>
          {showEnhance && (
            <AIEnhanceSheet
              open={showEnhance}
              atsMode
              disabledSections={improvedSections}
              onEnhanced={(sections) => {
                enhancedRef.current = true;
                if (sections) {
                  enhancedSectionsRef.current = [
                    ...enhancedSectionsRef.current,
                    ...sections,
                  ];
                }
              }}
              onOpenChange={(open) => {
                if (open) {
                  enhancedRef.current = false;
                  enhancedSectionsRef.current = [];
                  setCurrentResume(resumeData);
                  setCurrentResumeId(dbResume.id);
                  setSelectedTemplate(dbResume.template_id as TemplateId);
                  prevScoreRef.current = getCachedScore(dbResume.id, dbResume.updated_at);
                }

                if (!open && !enhancedRef.current) {
                  // Closed without changes — just close, zero API calls
                  setShowEnhance(false);
                  return;
                }

                setShowEnhance(open);

                if (!open && enhancedRef.current) {
                  // Track which sections were improved to block re-optimization
                  setImprovedSections(prev => {
                    const next = new Set(prev);
                    enhancedSectionsRef.current.forEach(s => next.add(s));
                    return next;
                  });

                  // Save enhanced data to the database
                  const updatedResume = useResumeStore.getState().currentResume;
                  if (updatedResume) {
                    updateResume.mutate(
                      { resumeId: dbResume.id, updates: updatedResume },
                      {
                        onSuccess: () => {
                          queryClient.invalidateQueries({ queryKey: ['resume', id] });
                          // Re-score with force flag — old score stays visible until new one arrives
                          scoreResume(dbResume.id, updatedResume, dbResume.updated_at, true);
                        },
                      }
                    );
                  }
                }
              }}
            />
          )}
        </Suspense>
      </ErrorBoundary>

      {/* Hidden off-screen template for PDF generation */}
      {(() => {
        const TemplateComponent = templateComponents[dbResume.template_id as TemplateId];
        return TemplateComponent ? (
          <div
            ref={hiddenTemplateRef}
            data-resume-template
            style={{
              position: 'fixed',
              left: '-9999px',
              top: 0,
            width: '612px',
            minHeight: '792px',
            transform: 'scale(1)',
            transformOrigin: 'top left',
            overflow: 'visible',
            }}
          >
            <Suspense fallback={null}>
              <TemplateComponent resume={resumeData} />
            </Suspense>
          </div>
        ) : null;
      })()}
    </div>
  );
}
