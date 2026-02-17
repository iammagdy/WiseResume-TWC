import { useState, useRef, useCallback, lazy, Suspense } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Edit2, Eye, Download, Share2, Copy, Trash2, Loader2, GitBranch, Crown, CheckCircle2, FileText, Zap, BarChart3, RefreshCw } from 'lucide-react';
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
import { formatDistanceToNow, format } from 'date-fns';
import { downloadFile } from '@/lib/downloadUtils';
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
  const navigate = useNavigate();
  const { data: dbResume, isLoading } = useResume(id || null);
  const { data: allResumes = [] } = useResumes();
  const { deleteResume, duplicateResume } = useResumeMutations();
  const { setCurrentResume, setCurrentResumeId, setSelectedTemplate } = useResumeStore();
  const { getCachedScore, scoreResume, scoringId } = useResumeScore();
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

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
  const healthScore = getCachedScore(dbResume.id, dbResume.updated_at);
  
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

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const { generatePDF } = await import('@/lib/pdfGenerator');
      const pdfBlob = await generatePDF(resumeData, dbResume.template_id as TemplateId, hiddenTemplateRef.current, undefined, { showPageNumbers: true });
      const fileName = `${resumeData.contactInfo.fullName?.replace(/\s+/g, '_') || 'Resume'}.pdf`;
      await downloadFile({ blob: pdfBlob, fileName });
      toast.success('PDF downloaded!');
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setIsDownloading(false);
    }
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

  const actions = [
    { icon: Edit2, label: 'Edit', onClick: handleEdit },
    { icon: Eye, label: 'Preview', onClick: handlePreview },
    { icon: Download, label: 'Download', onClick: handleDownload, loading: isDownloading },
    { icon: Share2, label: 'Share', onClick: () => {
      createShare.mutate({ resumeId: dbResume.id }, {
        onSuccess: (data) => {
          const url = `${window.location.origin}/share/${data.token}`;
          navigator.clipboard.writeText(url);
          toast.success('Share link copied to clipboard!');
        },
      });
    }},
    { icon: Copy, label: 'Duplicate', onClick: handleDuplicate },
    { icon: Trash2, label: 'Delete', onClick: () => setDeleteOpen(true), destructive: true },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 h-14 border-b border-border glass-elevated backdrop-blur-md">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="w-12 h-12" aria-label="Go back">
          <ArrowLeft className="w-5 h-5" />
        </Button>
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
      </div>

      {/* Sticky Action Bar */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-2 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <Button size="sm" className="flex-1 gap-2 min-h-[44px] active:scale-95 transition-transform" onClick={handleEdit}>
          <Edit2 className="w-4 h-4" /> Edit
        </Button>
        <Button variant="outline" size="sm" className="flex-1 gap-2 min-h-[44px] active:scale-95 transition-transform" onClick={handlePreview}>
          <Eye className="w-4 h-4" /> Preview
        </Button>
        <Button variant="outline" size="sm" className="flex-1 gap-2 min-h-[44px] active:scale-95 transition-transform" onClick={handleDownload} disabled={isDownloading}>
          {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} PDF
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 max-w-3xl mx-auto w-full">
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

        {/* Template Preview */}
        <div className="max-w-xs mx-auto rounded-2xl overflow-hidden border border-border shadow-lg">
          <TemplateThumbnail templateId={dbResume.template_id as TemplateId} resume={resumeData} />
        </div>

        {/* ATS Score Section */}
        <div className="flex flex-col items-center gap-3">
          {healthScore ? (
            <>
              <ScoreRing score={healthScore.overallScore} size={80} />
              <p className="text-sm font-semibold text-muted-foreground tracking-wide">ATS Score</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 min-h-[44px] active:scale-95 transition-transform"
                  disabled={scoringId === dbResume.id}
                  onClick={() => {
                    clearCachedScore(dbResume.id, dbResume.updated_at);
                    scoreResume(dbResume.id, resumeData, dbResume.updated_at);
                  }}
                >
                  {scoringId === dbResume.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Re-score
                </Button>
                <Button
                  size="sm"
                  className="gap-2 min-h-[44px] active:scale-95 transition-transform"
                  onClick={() => {
                    setCurrentResume(resumeData);
                    setCurrentResumeId(dbResume.id);
                    setSelectedTemplate(dbResume.template_id as TemplateId);
                    setShowEnhance(true);
                  }}
                >
                  <Zap className="w-4 h-4" />
                  Improve Score
                </Button>
              </div>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={scoringId === dbResume.id}
              onClick={() => scoreResume(dbResume.id, resumeData, dbResume.updated_at)}
            >
              {scoringId === dbResume.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <BarChart3 className="w-4 h-4" />
              )}
              {scoringId === dbResume.id ? 'Scoring…' : 'Score Resume'}
            </Button>
          )}

          {/* Score Trend Chart */}
          {scoreHistory.length >= 2 && (
            <Collapsible defaultOpen>
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
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-elevated rounded-2xl p-3 text-center">
            <p className="text-xl font-bold text-foreground">{completedSections}/{totalSections}</p>
            <p className="text-[11px] text-muted-foreground">Sections</p>
          </div>
          <div className="glass-elevated rounded-2xl p-3 text-center">
            <p className="text-xl font-bold text-foreground">{tailoredCount}</p>
            <p className="text-[11px] text-muted-foreground">Tailored</p>
          </div>
        </div>

        {/* Progress Bar */}
        <ProgressBar resume={resumeData} />

        {/* Metadata */}
        <div className="glass-elevated rounded-2xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Template</span>
            <Badge variant="secondary" className="text-xs">{templateInfo?.name || dbResume.template_id}</Badge>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Created</span>
            <span className="text-foreground">{format(new Date(dbResume.created_at), 'MMM d, yyyy')}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Last edited</span>
            <span className="text-foreground">{formatDistanceToNow(new Date(dbResume.updated_at), { addSuffix: true })}</span>
          </div>
        </div>

        {/* More Actions */}
        <p className="text-xs font-medium text-muted-foreground">More Actions</p>
        <div className="grid grid-cols-3 gap-3">
          {actions.filter(a => !['Edit', 'Preview', 'Download'].includes(a.label)).map(action => (
            <button
              key={action.label}
              onClick={action.onClick}
              disabled={action.loading}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl glass-elevated hover:scale-[1.02] transition-all touch-manipulation active:scale-[0.98] min-h-[80px] ${
                action.destructive ? 'text-destructive' : 'text-foreground'
              }`}
              aria-label={action.label}
            >
              {action.loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <action.icon className="w-6 h-6" />
              )}
              <span className="text-xs font-medium">{action.label}</span>
            </button>
          ))}
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
                  prevScoreRef.current = getCachedScore(dbResume.id, dbResume.updated_at);
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
              height: '792px',
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
