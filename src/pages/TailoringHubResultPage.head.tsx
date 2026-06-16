import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Briefcase,
  TrendingUp,
  ExternalLink,
} from 'lucide-react';
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useResumes, dbToResumeData, type DatabaseResume } from '@/hooks/useResumes';
import { useResumeStore } from '@/store/resumeStore';
import { useShallow } from 'zustand/react/shallow';
import { databases, DATABASE_ID, Query } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';
import { useQuery } from '@tanstack/react-query';
import { templates } from '@/lib/templateData';
import { TemplateId } from '@/types/resume';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { TailorResumeCompare } from '@/components/job-match/TailorResumeCompare';
import { ScaledResumePage } from '@/components/job-match/ScaledResumePage';
import { TailorResultExportPanel } from '@/components/job-match/TailorResultExportPanel';
import { TailorResultCoverLetterPanel } from '@/components/job-match/TailorResultCoverLetterPanel';
import { TailorQuickPdfExportDialog } from '@/components/job-match/TailorQuickPdfExportDialog';
import { useCoverLetter, parseCoverLetter } from '@/hooks/useCoverLetters';
import {
  resolveTailorJobContext,
  saveCoverLetterPrefill,
  saveTailorJobDescriptionForResume,
  readLinkedCoverLetterForTailoredResume,
  saveLinkedCoverLetterForTailoredResume,
} from '@/lib/tailorJobContext';
import type { SuperTailorResult, TailorSectionId } from '@/types/resume';
import '@/components/job-match/job-match-workspace.css';

interface ResultState {
  jobTitle?: string;
  company?: string;
  jobUrl?: string | null;
  scoreBeforeAfter?: { before: number; after: number };
  appliedSections?: string[];
  intensity?: string;
  coverLetterId?: string;
}

export function resolveTailoringResultState(params: {
  locationState?: ResultState | null;
  tailorHistory: Array<{
    tailoredResumeId?: string | null;
    jobTitle: string;
    company: string;
    jobUrl?: string | null;
    scoreBeforeAfter?: { before: number; after: number };
    appliedSections?: string[];
  }>;
  resumeId?: string;
  appwriteEntry?: Record<string, unknown> | null;
}): ResultState {
  const { locationState, tailorHistory, resumeId, appwriteEntry } = params;
  if (
    locationState &&
    (
      !!locationState.jobTitle ||
      !!locationState.company ||
      !!locationState.jobUrl ||
      !!locationState.scoreBeforeAfter ||
      (locationState.appliedSections?.length ?? 0) > 0
    )
  ) {
    return locationState;
  }

  const entry = tailorHistory.find((item) => item.tailoredResumeId === resumeId);
  if (entry) {
    return {
      jobTitle: entry.jobTitle,
      company: entry.company,
      jobUrl: entry.jobUrl,
      scoreBeforeAfter: entry.scoreBeforeAfter,
      appliedSections: entry.appliedSections,
    };
  }

  if (appwriteEntry) {
    return {
      jobTitle: appwriteEntry.job_title as string | undefined,
      company: appwriteEntry.company as string | undefined,
      jobUrl: appwriteEntry.job_url as string | undefined,
      scoreBeforeAfter: (appwriteEntry.score_before != null && appwriteEntry.score_after != null)
        ? { before: appwriteEntry.score_before as number, after: appwriteEntry.score_after as number }
        : undefined,
      appliedSections: (() => {
        try {
          return appwriteEntry.applied_sections
            ? (JSON.parse(appwriteEntry.applied_sections as string) as string[])
            : undefined;
        } catch {
          console.warn('[TailoringHub] applied_sections parse failed');
          return undefined;
        }
      })(),
    };
  }

  return {};
}

export default function JobMatchResultPage() {
  const { resumeId } = useParams<{ resumeId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: allResumes, isLoading } = useResumes();
  const {
    setCurrentResumeId,
    setCurrentResume,
    setSelectedTemplate: setSelectedTemplateStore,
    tailorHistory,
  } = useResumeStore(
    useShallow((s) => ({
      setCurrentResumeId: s.setCurrentResumeId,
      setCurrentResume: s.setCurrentResume,
      setSelectedTemplate: s.setSelectedTemplate,
      tailorHistory: s.tailorHistory,
    })),
  );

  const dbResume = useMemo(
    () => allResumes?.find((r: DatabaseResume) => r.$id === resumeId) ?? null,
    [allResumes, resumeId],
  );
  const resume = useMemo(
    () => (dbResume ? dbToResumeData(dbResume) : null),
    [dbResume],
  );

  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>(
    () => (dbResume?.template as TemplateId) ?? 'modern',
  );
  const [pdfExportOpen, setPdfExportOpen] = useState(false);
  const [coverLetterDownloadBusy, setCoverLetterDownloadBusy] = useState(false);
  const hasUserPickedRef = useRef(false);
  const handlePickTemplate = useCallback((id: TemplateId) => {
    hasUserPickedRef.current = true;
    setSelectedTemplate(id);
  }, []);

  useEffect(() => {
    if (!dbResume?.template) return;
    if (hasUserPickedRef.current) return;
    const tpl = dbResume.template as TemplateId;
    if (!templates.some((t) => t.id === tpl)) return;
    setSelectedTemplate(tpl);
  }, [dbResume?.template]);

  const tailorHistoryEntry = useMemo(
    () => tailorHistory.find((item) => item.tailoredResumeId === resumeId) ?? null,
    [tailorHistory, resumeId],
  );

  const resultState: ResultState = useMemo(() => resolveTailoringResultState({
    locationState: location.state as ResultState | null,
    tailorHistory,
    resumeId,
  }), [location.state, tailorHistory, resumeId]);

  const { data: appwriteEntry } = useQuery({
    queryKey: ['tailor-history-by-resume', resumeId],
    queryFn: async () => {
      try {
        const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.tailor_history, [
          Query.equal('tailored_resume_id', [resumeId!]),
          Query.limit(1),
        ]);
        return res.documents[0] ?? null;
      } catch {
        return null;
      }
    },
    enabled: !!resumeId,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const effectiveState: ResultState = useMemo(() => resolveTailoringResultState({
    locationState: Object.keys(resultState).length ? resultState : null,
    tailorHistory: [],
    resumeId,
    appwriteEntry: appwriteEntry as Record<string, unknown> | null,
  }), [appwriteEntry, resultState, resumeId]);

  const jobContext = useMemo(
    () => resolveTailorJobContext({
      jobTitle: effectiveState.jobTitle ?? tailorHistoryEntry?.jobTitle,
      company: effectiveState.company ?? tailorHistoryEntry?.company,
      jobDescription: tailorHistoryEntry?.jobDescription,
      jobUrl: effectiveState.jobUrl ?? tailorHistoryEntry?.jobUrl,
      tailoredResumeId: resumeId,
      appwriteDoc: appwriteEntry as Record<string, unknown> | null,
    }),
    [appwriteEntry, effectiveState, resumeId, tailorHistoryEntry],
  );

  const navigateWithTemplate = (path: string, newTab = false) => {
    if (!resumeId) return;
    if (!newTab) {
      setCurrentResumeId(resumeId);
      if (resume) setCurrentResume(resume);
    }
    setSelectedTemplateStore(selectedTemplate);
    databases.updateDocument(DATABASE_ID, COLLECTIONS.resumes, resumeId, {
      template: selectedTemplate,
    }).catch(() => {});
    if (newTab) {
      window.open(path, '_blank', 'noopener,noreferrer');
    } else {
      navigate(path);
    }
  };

  const handleDesignedPDF = () => {
    if (!resumeId || !resume) return;
    setCurrentResumeId(resumeId);
    setCurrentResume(resume);
    setSelectedTemplateStore(selectedTemplate);
    setPdfExportOpen(true);
  };
  const handleAtsPDF = () => navigateWithTemplate(`/preview?id=${resumeId}&action=ats-pdf`, true);
  const handleDocx = () => navigateWithTemplate(`/preview?id=${resumeId}&action=docx`, true);

  const handleOpenEditor = () => {
    if (!resumeId) return;
    setCurrentResumeId(resumeId);
    if (resume) setCurrentResume(resume);
    navigate(`/editor?id=${resumeId}`);
  };

  const handleCoverLetter = () => {
    if (!resumeId) return;
    setCurrentResumeId(resumeId);
    if (resume) setCurrentResume(resume);
    saveTailorJobDescriptionForResume(resumeId, jobContext.jobDescription);
    saveCoverLetterPrefill({
      resumeId,
      jobTitle: jobContext.jobTitle,
      company: jobContext.company,
      jobDescription: jobContext.jobDescription,
      jobUrl: jobContext.jobUrl,
    });
    navigate(
      `/cover-letter/new?resumeId=${encodeURIComponent(resumeId)}&source=tailor-result`,
      {
        state: {
          resumeId,
          fromTailorResult: true,
          returnTo: `/tailoring-hub/result/${resumeId}`,
          jobTitle: jobContext.jobTitle,
          company: jobContext.company,
          jobDescription: jobContext.jobDescription,
        },
      },
    );
  };

  const scoreDelta = effectiveState.scoreBeforeAfter
    ? Math.max(0, effectiveState.scoreBeforeAfter.after - effectiveState.scoreBeforeAfter.before)
    : 0;

  const sourceResume = useMemo(() => {
    const parentId = dbResume?.parent_resume_id;
    if (!parentId || !allResumes) return null;
    const parent = allResumes.find((r: DatabaseResume) => r.$id === parentId);
    return parent ? dbToResumeData(parent) : null;
  }, [allResumes, dbResume?.parent_resume_id]);

  const tailorResult = tailorHistoryEntry?.tailorResult as SuperTailorResult | undefined;
  const canCompare = !!(resume && sourceResume);

  const appliedSections = useMemo((): TailorSectionId[] => {
    const fromState = effectiveState.appliedSections;
    if (fromState?.length) {
      return fromState as TailorSectionId[];
    }
    return ['summary', 'skills', 'experience', 'education', 'projects', 'certifications', 'awards'];
  }, [effectiveState.appliedSections]);

  const linkedCoverLetterIdFromNav = (location.state as ResultState | null)?.coverLetterId;
  const linkedCoverLetterId = useMemo(() => (
    linkedCoverLetterIdFromNav
    ?? (resumeId ? readLinkedCoverLetterForTailoredResume(resumeId) : null)
  ), [linkedCoverLetterIdFromNav, resumeId]);

  useEffect(() => {
    if (!resumeId || !linkedCoverLetterIdFromNav) return;
    saveLinkedCoverLetterForTailoredResume(resumeId, linkedCoverLetterIdFromNav);
  }, [linkedCoverLetterIdFromNav, resumeId]);

  const { data: linkedCoverLetterById } = useCoverLetter(linkedCoverLetterId);

  const { data: linkedCoverLetterByResume } = useQuery({
    queryKey: ['cover-letter-by-tailored-resume', resumeId],
    queryFn: async () => {
      if (!resumeId) return null;
      try {
        const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.cover_letters, [
          Query.equal('resume_id', [resumeId]),
          Query.orderDesc('$createdAt'),
          Query.limit(1),
        ]);
        const doc = res.documents[0];
        return doc ? parseCoverLetter(doc as Record<string, unknown>) : null;
      } catch {
        return null;
      }
    },
    enabled: !!resumeId && !linkedCoverLetterId,
    staleTime: 60 * 1000,
    retry: false,
  });

  const linkedCoverLetter = linkedCoverLetterById ?? linkedCoverLetterByResume ?? null;
  const hasApplicationBundle = !!linkedCoverLetter;

  const handleDownloadCoverLetterPdf = useCallback(async () => {
    if (!linkedCoverLetter || coverLetterDownloadBusy) return;
    setCoverLetterDownloadBusy(true);
    try {
      const { downloadCoverLetterPDF } = await import('@/lib/coverLetterPdfGenerator');
      await downloadCoverLetterPDF({
        job_title: linkedCoverLetter.job_title || jobContext.jobTitle || 'Cover Letter',
        company: linkedCoverLetter.company ?? jobContext.company ?? null,
        content: linkedCoverLetter.content,
        title: linkedCoverLetter.title,
        tone: linkedCoverLetter.tone ?? undefined,
        template_style: linkedCoverLetter.template_style ?? undefined,
      });
      toast.success('Cover letter PDF downloaded');
    } catch {
      toast.error('Failed to download cover letter PDF');
    } finally {
      setCoverLetterDownloadBusy(false);
    }
  }, [coverLetterDownloadBusy, jobContext.company, jobContext.jobTitle, linkedCoverLetter]);

  const handleDownloadBoth = useCallback(() => {
    if (linkedCoverLetter) {
      void handleDownloadCoverLetterPdf();
    }
    handleDesignedPDF();
    toast.message('Download your tailored CV, then grab the cover letter PDF from the bundle panel.');
  }, [handleDownloadCoverLetterPdf, linkedCoverLetter]);

  return (
    <div className="jmw-result-page jmw-result-page--compare">
      <header className="jmw-result-topbar">
        <button
          type="button"
          onClick={() => navigate('/tailoring-hub')}
          className="jmw-result-topbar__back"
          aria-label="Back to Tailoring Hub"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
        </button>

        <div className="jmw-result-topbar__title-block min-w-0">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" aria-hidden />
            <span className="jmw-result-topbar__eyebrow">Tailored CV ready</span>
          </div>
          <h1 className="jmw-result-topbar__title truncate">
            {isLoading ? 'LoadingΓÇª' : dbResume?.title ?? 'Tailored CV'}
          </h1>
        </div>

        {(effectiveState.jobTitle || effectiveState.scoreBeforeAfter) && (
          <div className="jmw-result-topbar__meta hidden sm:flex">
            {effectiveState.jobTitle && (
              <span className="jmw-result-topbar__job truncate">
                <Briefcase className="w-3.5 h-3.5 shrink-0" aria-hidden />
                {effectiveState.jobTitle}
                {effectiveState.company ? ` ┬╖ ${effectiveState.company}` : ''}
              </span>
            )}
            {effectiveState.scoreBeforeAfter && (
              <span className="jmw-result-topbar__score">
                <span className="text-muted-foreground">{effectiveState.scoreBeforeAfter.before}</span>
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" aria-hidden />
                <span className={cn(
                  'font-bold',
                  effectiveState.scoreBeforeAfter.after >= 70 ? 'text-emerald-500' : 'text-foreground',
                )}>
                  {effectiveState.scoreBeforeAfter.after}
                </span>
                {scoreDelta > 0 && (
                  <span className="jmw-score-delta jmw-score-delta--compact">+{scoreDelta}</span>
                )}
              </span>
            )}
            {effectiveState.jobUrl && (
              <a
                href={effectiveState.jobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="jmw-result-topbar__job-link"
                aria-label="Open job posting"
              >
                <ExternalLink className="w-3.5 h-3.5" aria-hidden />
              </a>
            )}
          </div>
        )}
      </header>

      <div className="jmw-result-body jmw-result-body--compare">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" aria-hidden />
            <p className="text-sm text-muted-foreground">Loading your tailored CVΓÇª</p>
          </div>
        ) : !resume ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <p className="text-sm text-muted-foreground">Resume not found.</p>
            <Button variant="outline" onClick={() => navigate('/tailoring-hub')}>
              Back to Tailoring Hub
            </Button>
          </div>
        ) : (
          <div className={cn(
            'jmw-result-compare-layout',
            hasApplicationBundle && 'jmw-result-compare-layout--bundle',
          )}>
            <main className={cn(
              'jmw-result-compare-main',
              hasApplicationBundle && 'jmw-result-bundle-main',
            )}>
              {hasApplicationBundle ? (
                <div className="jmw-result-bundle-grid">
                  <div className="jmw-result-bundle-cv">
                    <p className="jmw-result-bundle-label">Tailored CV</p>
                    <ScaledResumePage resume={resume} templateId={selectedTemplate} />
                  </div>
                  <TailorResultCoverLetterPanel
                    coverLetter={linkedCoverLetter}
                    onEdit={() => navigate(`/cover-letter/edit/${linkedCoverLetter.id}`)}
                  />
                </div>
              ) : canCompare ? (
                <TailorResumeCompare
                  beforeResume={sourceResume!}
                  afterResume={resume}
                  templateId={selectedTemplate}
                  appliedSections={appliedSections}
                  tailorResult={tailorResult}
                />
              ) : (
                <div className="jmw-compare jmw-compare--single">
                  <ScaledResumePage resume={resume} templateId={selectedTemplate} />
                </div>
              )}
            </main>

            <TailorResultExportPanel
              selectedTemplate={selectedTemplate}
              onTemplateChange={handlePickTemplate}
              onDesignedPdf={handleDesignedPDF}
              onAtsPdf={handleAtsPDF}
              onDocx={handleDocx}
              onPreview={() => navigateWithTemplate(`/preview?id=${resumeId}`)}
              onEditor={handleOpenEditor}
              onCoverLetter={handleCoverLetter}
              resumeTitle={dbResume?.title}
              hasCoverLetter={hasApplicationBundle}
              onDownloadCoverLetter={handleDownloadCoverLetterPdf}
              onDownloadBoth={handleDownloadBoth}
              coverLetterBusy={coverLetterDownloadBusy}
            />

            <TailorQuickPdfExportDialog
              open={pdfExportOpen}
              onOpenChange={setPdfExportOpen}
              resume={resume}
              templateId={selectedTemplate}
              resumeDocId={resumeId}
              jobTitle={jobContext.jobTitle}
              company={jobContext.company}
            />
          </div>
        )}
      </div>
    </div>
  );
}
