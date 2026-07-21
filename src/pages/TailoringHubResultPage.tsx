import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { migrateTemplateId } from '@/lib/templateMigration';
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Briefcase,
  TrendingUp,
  ExternalLink,
  FileDown,
} from 'lucide-react';
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useResumes, dbToResumeData, type DatabaseResume } from '@/hooks/useResumes';
import { useResumeStore } from '@/store/resumeStore';
import { useShallow } from 'zustand/react/shallow';
import { databases, DATABASE_ID, Query } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useJobApplicationMutations } from '@/hooks/useJobApplications';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { templates } from '@/lib/templateData';
import { TemplateId } from '@/types/resume';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { getDocumentLocale } from '@/i18n/resumeLocale';
import { sanitizeFileName } from '@/lib/sanitizeFileName';
import { getPdfExportErrorMessage } from '@/lib/pdfExportErrors';
import { TailorResumeCompare } from '@/components/job-match/TailorResumeCompare';
import { ScaledResumePage } from '@/components/job-match/ScaledResumePage';
import { TailorResultExportPanel } from '@/components/job-match/TailorResultExportPanel';
import { TailorResultCoverLetterPanel } from '@/components/job-match/TailorResultCoverLetterPanel';
import { TailorQuickPdfExportDialog } from '@/components/job-match/TailorQuickPdfExportDialog';
import { useCoverLetter, parseCoverLetter } from '@/hooks/useCoverLetters';
import {
  buildJobApplicationDisplayName,
  resolveTailorJobContext,
  saveCoverLetterPrefill,
  saveTailorJobDescriptionForResume,
  readLinkedCoverLetterForTailoredResume,
  saveLinkedCoverLetterForTailoredResume,
} from '@/lib/tailorJobContext';
import type { SuperTailorResult, TailorSectionId } from '@/types/resume';
import type { ChangeSummary } from '@/lib/tailorMerge';
import { tailoringMetadataFromResume } from '@/lib/tailoringResumeMetadata';
import type { TailoringResumeMetadata } from '@/types/resume';
import '@/components/job-match/job-match-workspace.css';

interface ResultState {
  jobTitle?: string;
  company?: string;
  jobUrl?: string | null;
  scoreBeforeAfter?: { before: number; after: number };
  appliedSections?: string[];
  intensity?: string;
  coverLetterId?: string;
  changeSummary?: ChangeSummary;
}

type ResultExportKind = 'ats-pdf' | 'docx';

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
  resumeMetadata?: TailoringResumeMetadata | null;
}): ResultState {
  const { locationState, tailorHistory, resumeId, appwriteEntry, resumeMetadata } = params;
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

  if (resumeMetadata) {
    return {
      jobTitle: resumeMetadata.jobTitle,
      company: resumeMetadata.company,
      jobUrl: resumeMetadata.jobUrl,
      scoreBeforeAfter: resumeMetadata.scoreBeforeAfter,
      appliedSections: resumeMetadata.appliedSections,
      intensity: resumeMetadata.intensity,
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
  const resumeMetadata = useMemo(() => tailoringMetadataFromResume(dbResume), [dbResume]);

  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>(
    () => migrateTemplateId(dbResume?.template),
  );
  const [pdfExportOpen, setPdfExportOpen] = useState(false);
  const [resultExportBusy, setResultExportBusy] = useState<ResultExportKind | null>(null);
  const [coverLetterDownloadBusy, setCoverLetterDownloadBusy] = useState(false);
  const hasUserPickedRef = useRef(false);
  const resultExportBusyRef = useRef<ResultExportKind | null>(null);
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
    resumeMetadata,
    appwriteEntry: appwriteEntry as Record<string, unknown> | null,
  }), [appwriteEntry, resultState, resumeId, resumeMetadata]);

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

  const queryClient = useQueryClient();
  const [showAppliedPrompt, setShowAppliedPrompt] = useState(false);
  const { updateApplication } = useJobApplicationMutations();

  const { data: applications = [], refetch: refetchApp } = useQuery({
    queryKey: ['linked-job-application', resumeId],
    queryFn: async () => {
      if (!resumeId) return [];
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.job_applications, [
        Query.equal('resume_id', resumeId),
        Query.limit(1),
      ]);
      return res.documents;
    },
    enabled: !!resumeId,
  });

  const linkedApp = applications?.[0];
  const hasAppReady = !!(linkedApp && (linkedApp.status === 'ready_to_apply' || linkedApp.status === 'tailored'));

  const handleMarkApptrackApplied = async () => {
    if (!linkedApp) return;
    try {
      await updateApplication.mutateAsync({
        id: linkedApp.$id,
        updates: {
          status: 'applied',
          applied_at: new Date().toISOString(),
        },
      });
      // Try to sync with remote jobs user actions too if job_feed_item_id is linked
      if (linkedApp.job_feed_item_id) {
        try {
          const actionKey = `${linkedApp.user_id}:${linkedApp.job_feed_item_id}`;
          const existingRes = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.user_job_actions || 'user_job_actions',
            [Query.equal('action_key', actionKey), Query.limit(1)],
          );
          const existingDoc = existingRes.documents?.[0];
          if (existingDoc) {
            await databases.updateDocument(
              DATABASE_ID,
              COLLECTIONS.user_job_actions || 'user_job_actions',
              existingDoc.$id,
              { status: 'applied', applied_at: new Date().toISOString() }
            );
          }
        } catch (e) {
          console.warn('Sync job action status error:', e);
        }
      }
      void refetchApp();
      queryClient.invalidateQueries({ queryKey: ['job-applications'] });
      toast.success('Application marked as applied!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update application');
    }
  };

  const syncTailoredResumeForExport = useCallback(() => {
    if (!resumeId || !resume) {
      toast.error('Resume is still loading, please try again in a moment.');
      return null;
    }

    const tailoredSnapshot = {
      ...resume,
      id: resumeId,
      templateId: selectedTemplate,
    };

    setCurrentResumeId(resumeId);
    setCurrentResume(tailoredSnapshot);
    setSelectedTemplateStore(selectedTemplate);
    databases.updateDocument(DATABASE_ID, COLLECTIONS.resumes, resumeId, {
      template: selectedTemplate,
    }).catch(() => {});

    return tailoredSnapshot;
  }, [
    resume,
    resumeId,
    selectedTemplate,
    setCurrentResume,
    setCurrentResumeId,
    setSelectedTemplateStore,
  ]);

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
    if (!resumeId) return;
    if (!resume) {
      toast.error('Resume is still loading, please try again in a moment.');
      return;
    }
    setCurrentResumeId(resumeId);
    setCurrentResume(resume);
    setSelectedTemplateStore(selectedTemplate);
    setPdfExportOpen(true);
  };

  const handleAtsPDF = useCallback(async () => {
    if (resultExportBusyRef.current) return;
    const tailoredSnapshot = syncTailoredResumeForExport();
    if (!tailoredSnapshot) return;

    resultExportBusyRef.current = 'ats-pdf';
    setResultExportBusy('ats-pdf');

    try {
      haptics.medium();
      const { exportResumePdfFromData } = await import('@/lib/exportResumePdf');
      const { downloadFile, validatePdfBlob } = await import('@/lib/downloadUtils');

      const pdfBlob = await exportResumePdfFromData(tailoredSnapshot, selectedTemplate, {
        atsMode: true,
        showPageNumbers: false,
        showBranding: true,
        locale: getDocumentLocale(tailoredSnapshot),
        renderTimeoutMs: 8000,
      });
      await validatePdfBlob(pdfBlob);

      const baseName = sanitizeFileName(
        buildJobApplicationDisplayName({
          jobTitle: jobContext.jobTitle,
          company: jobContext.company,
          fullName: tailoredSnapshot.contactInfo?.fullName,
        }),
      );
      const result = await downloadFile({
        blob: pdfBlob,
        fileName: `${baseName}_Resume_ATS.pdf`,
        mimeType: 'application/pdf',
      });

      if (result.cancelled) {
        toast.info('ATS PDF download cancelled. Tap again to save.');
        return;
      }
      if (!result.success) {
        throw new Error('Download failed');
      }

      haptics.success();
      toast.success('ATS PDF download started');
    } catch (err) {
      haptics.error();
      toast.error(getPdfExportErrorMessage(err), { duration: 8000 });
    } finally {
      resultExportBusyRef.current = null;
      setResultExportBusy(null);
    }
  }, [jobContext.company, jobContext.jobTitle, selectedTemplate, syncTailoredResumeForExport]);

  const handleDocx = useCallback(async () => {
    if (resultExportBusyRef.current) return;
    const tailoredSnapshot = syncTailoredResumeForExport();
    if (!tailoredSnapshot) return;

    resultExportBusyRef.current = 'docx';
    setResultExportBusy('docx');

    try {
      haptics.medium();
      const { generateAndDownloadDOCX } = await import('@/lib/docxGenerator');
      const success = await generateAndDownloadDOCX(tailoredSnapshot);
      if (!success) {
        throw new Error('Download failed');
      }

      haptics.success();
      toast.success('Word document download started');
    } catch {
      haptics.error();
      toast.error('Failed to download Word document. Please try again.');
    } finally {
      resultExportBusyRef.current = null;
      setResultExportBusy(null);
    }
  }, [syncTailoredResumeForExport]);

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

  // Prefer the fast local entry, then the durable metadata stored on the tailored
  // resume, with the legacy history document as a read-only fallback.
  const tailorResult = useMemo<SuperTailorResult | undefined>(() => {
    if (tailorHistoryEntry?.tailorResult) {
      return tailorHistoryEntry.tailorResult as SuperTailorResult;
    }
    if (resumeMetadata?.tailorResult) {
      return resumeMetadata.tailorResult as SuperTailorResult;
    }
    const raw = (appwriteEntry as Record<string, unknown> | null)?.tailor_result;
    if (typeof raw === 'string' && raw) {
      try {
        return JSON.parse(raw) as SuperTailorResult;
      } catch {
        return undefined;
      }
    }
    return undefined;
  }, [tailorHistoryEntry, resumeMetadata, appwriteEntry]);
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
            {isLoading ? 'Loading…' : dbResume?.title ?? 'Tailored CV'}
          </h1>
        </div>

        {(effectiveState.jobTitle || effectiveState.scoreBeforeAfter) && (
          <div className="jmw-result-topbar__meta hidden sm:flex">
            {effectiveState.jobTitle && (
              <span className="jmw-result-topbar__job truncate">
                <Briefcase className="w-3.5 h-3.5 shrink-0" aria-hidden />
                {effectiveState.jobTitle}
                {effectiveState.company ? ` · ${effectiveState.company}` : ''}
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

      {hasAppReady && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border-y border-rose-100 dark:border-rose-900/30 px-4 py-3 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            <span>
              <strong>Application Bundle Ready:</strong> Tailored CV and Cover Letter are finalized. Submit your application on the employer's website.
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {jobContext.jobUrl && (
              <a
                href={jobContext.jobUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  setTimeout(() => {
                    setShowAppliedPrompt(true);
                  }, 1500);
                }}
                className="inline-flex items-center justify-center rounded-md text-xs font-semibold h-8 px-3 bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-sm"
              >
                Apply on website
                <ExternalLink className="w-3 h-3 ml-1.5" />
              </a>
            )}
            <Button
              size="xs"
              variant="outline"
              className="text-xs h-8 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/40"
              onClick={handleMarkApptrackApplied}
            >
              Mark as Applied
            </Button>
          </div>
        </div>
      )}

      {(effectiveState.jobTitle || effectiveState.scoreBeforeAfter) && (
        <div className="jmw-result-mobile-meta flex sm:hidden" aria-label="Job match summary">
          {effectiveState.jobTitle && (
            <span className="jmw-result-mobile-meta__job truncate">
              <Briefcase className="w-3.5 h-3.5 shrink-0" aria-hidden />
              {effectiveState.jobTitle}
              {effectiveState.company ? ` · ${effectiveState.company}` : ''}
            </span>
          )}
          {effectiveState.scoreBeforeAfter && (
            <span className="jmw-result-mobile-meta__score">
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
        </div>
      )}

      <div className="jmw-result-body jmw-result-body--compare">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" aria-hidden />
            <p className="text-sm text-muted-foreground">Loading your tailored CV…</p>
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
              atsPdfBusy={resultExportBusy === 'ats-pdf'}
              docxBusy={resultExportBusy === 'docx'}
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

      {!isLoading && resume && (
        <div className="jmw-result-mobile-actions sm:hidden">
          <Button
            type="button"
            variant="outline"
            className="flex-1 min-h-[44px]"
            onClick={() => { haptics.light(); navigate('/tailoring-hub'); }}
          >
            Back to Hub
          </Button>
          <Button
            type="button"
            className="flex-1 min-h-[44px]"
            onClick={() => { haptics.light(); handleDesignedPDF(); }}
          >
            <FileDown className="w-4 h-4 mr-1.5" aria-hidden />
            Export PDF
          </Button>
        </div>
      )}
      <AlertDialog open={showAppliedPrompt} onOpenChange={setShowAppliedPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Did you apply for this job?</AlertDialogTitle>
            <AlertDialogDescription>
              We noticed you clicked to apply on the employer's website. If you submitted your application, we can update your job search tracker to "Applied" to keep your history accurate.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowAppliedPrompt(false)}>
              No, not yet
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setShowAppliedPrompt(false);
                await handleMarkApptrackApplied();
              }}
            >
              Yes, I submitted it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
