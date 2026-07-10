import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { migrateTemplateId } from '@/lib/templateMigration';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Wand2, ArrowLeft, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';

import { useResumeStore } from '@/store/resumeStore';
import { useResumes, dbToResumeData, type DatabaseResume } from '@/hooks/useResumes';
import { useJob, type Job } from '@/hooks/useJobs';
import { ImportJobSheet } from '@/components/jobs/ImportJobSheet';
import { useAuth } from '@/hooks/useAuth';
import { useAIAction } from '@/hooks/useAIAction';
import { useImportJob } from '@/hooks/useImportJob';
import { useRedactedResume } from '@/hooks/useRedactedResume';
import { useAppwriteTailoredIds } from '@/hooks/useTailorHistory';
import { isTailoredResume } from '@/lib/resumeLineage';
import { useQueryClient } from '@tanstack/react-query';
import { tailorResumeWithProgress, type TailorIntensity } from '@/lib/aiTailor';
import { buildMergedResume, hasMeaningfulChanges, type ChangeSummary } from '@/lib/tailorMerge';
import { databases, DATABASE_ID, ID } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';
import { invalidateAiCreditQueries } from '@/lib/invalidate-ai-credit-queries';
import { aiErrorToastMessage, isAIError } from '@/lib/aiErrorParser';
import { activityTracker } from '@/lib/activityTracker';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { buildTailoringCustomization } from '@/lib/tailoringResumeMetadata';

import {
  type SuperTailorResult,
  type TailorProgress,
  type EnhancedTailorProgress,
  type TailorSectionId,
  type ResumeData,
} from '@/types/resume';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

import { ResumeChip } from '@/components/job-match/ResumeChip';
import { JobInputArea } from '@/components/job-match/JobInputArea';
import { JobPreviewCard } from '@/components/job-match/JobPreviewCard';
import { MatchAnalysisSummary, extractKeywords, computeMatch } from '@/components/job-match/MatchAnalysisSummary';
import { JobMatchAdvancedOptions } from '@/components/job-match/JobMatchAdvancedOptions';
import { JobMatchStickyFooter } from '@/components/job-match/JobMatchStickyFooter';
import { JobMatchProgressStage } from '@/components/job-match/JobMatchProgressStage';
import { JobMatchHistoryList } from '@/components/job-match/JobMatchHistoryList';
import { JobMatchSavedJobsList } from '@/components/job-match/JobMatchSavedJobsList';
import { TailoringHubLanding } from '@/components/tailoring-hub/TailoringHubLanding';
import { isSyntheticSavedJobId } from '@/hooks/useSavedJobPostings';
import '@/components/job-match/job-match-workspace.css';
import { saveTailorJobDescriptionForResume } from '@/lib/tailorJobContext';

type AnyTailorProgress = TailorProgress | EnhancedTailorProgress;

const DEFAULT_SECTIONS: TailorSectionId[] = [
  'summary', 'skills', 'experience', 'education', 'projects', 'certifications', 'awards',
];

type HubView = 'hub' | 'workspace';

function shouldOpenWorkspaceDirectly(params: URLSearchParams, preloadedDesc: string): boolean {
  return Boolean(
    params.get('jobId') ||
      params.get('mode') === 'workspace' ||
      params.get('tailor') === '1' ||
      (preloadedDesc && preloadedDesc.trim().length > 0),
  );
}

export default function JobMatchWorkspacePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    currentResumeId,
    jobDescription,
    setJobDescription,
    addTailorHistory,
    setCurrentResumeId,
  } = useResumeStore(
    useShallow((state) => ({
      currentResumeId: state.currentResumeId,
      jobDescription: state.jobDescription,
      setJobDescription: state.setJobDescription,
      addTailorHistory: state.addTailorHistory,
      setCurrentResumeId: state.setCurrentResumeId,
    })),
  );

  const { data: allResumes, isLoading: resumesLoading } = useResumes();
  const { data: persistedTailoredIds = new Set<string>() } = useAppwriteTailoredIds();

  const isLikelyTailoredResume = useCallback((resume: DatabaseResume, tailoredIds: Set<string>) => (
    isTailoredResume(resume, tailoredIds)
  ), []);

  const currentResume = useMemo(() => {
    const found = allResumes?.find((r: DatabaseResume) => r.$id === currentResumeId);
    return found ? dbToResumeData(found) : null;
  }, [allResumes, currentResumeId]);

  const selectedResumeTitle = useMemo(() => {
    const found = allResumes?.find((r: DatabaseResume) => r.$id === currentResumeId);
    return found?.title ?? null;
  }, [allResumes, currentResumeId]);

  // Pre-fill from query params
  const jobIdParam = searchParams.get('jobId');
  const preloadedDesc = searchParams.get('job') || '';
  const preloadedTitle = searchParams.get('title') || '';
  const preloadedCompany = searchParams.get('company') || '';
  const preloadedUrl = searchParams.get('url') || '';

  const [hubView, setHubView] = useState<HubView>(() =>
    shouldOpenWorkspaceDirectly(searchParams, preloadedDesc) ? 'workspace' : 'hub',
  );

  const { data: preloadedJob } = useJob(jobIdParam);

  const [jobUrl, setJobUrl] = useState('');
  const [parsedJobInfo, setParsedJobInfo] = useState<{ title: string; company: string } | null>(null);
  const [intensity, setIntensity] = useState<TailorIntensity>('moderate');
  const [enabledSections, setEnabledSections] = useState<TailorSectionId[]>(DEFAULT_SECTIONS);
  const [isTailoring, setIsTailoring] = useState(false);
  const [progress, setProgress] = useState<TailorProgress | EnhancedTailorProgress | null>(null);
  const [tailorError, setTailorError] = useState<string | null>(null);
  // Distinguishes the "no meaningful changes" guardrail (a recoverable warning)
  // from a genuine tailoring failure, so the UI can frame it correctly.
  const [tailorWarning, setTailorWarning] = useState(false);
  const [showResumePicker, setShowResumePicker] = useState(false);
  const [jobInputActiveTab, setJobInputActiveTab] = useState<'paste' | 'url'>('paste');
  const [importJobOpen, setImportJobOpen] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const { execute: executeAI } = useAIAction({ operation: 'tailor' });
  const importJob = useImportJob();
  const redactedResume = useRedactedResume(currentResume as ResumeData | null);

  // Auto-select a MASTER resume on load.
  // Tailored copies are detected via persisted tailor_history, schema-backed metadata
  // when present, and a title suffix heuristic as a last resort.
  // If the current selection is already a known master resume, leave it alone.
  // Otherwise (unset or is a tailored copy), find the source resume or most-recent master.
  useEffect(() => {
    if (!allResumes || allResumes.length === 0) return;
    const sortByRecent = (arr: DatabaseResume[]) =>
      [...arr].sort(
        (a, b) =>
          new Date(b.$updatedAt ?? b.$createdAt ?? 0).getTime() -
          new Date(a.$updatedAt ?? a.$createdAt ?? 0).getTime(),
      );
    const tailoredIds = new Set<string>([
      ...(
        useResumeStore.getState().tailorHistory
          .map((h) => h.tailoredResumeId)
          .filter(Boolean) as string[]
      ),
      ...persistedTailoredIds,
    ]);
    const currentDb = allResumes.find((r: DatabaseResume) => r.$id === currentResumeId);
    const isTailored = currentDb ? isLikelyTailoredResume(currentDb, tailoredIds) : false;
    if (currentDb && !isTailored) return; // already a master — done
    const masters = allResumes.filter((r: DatabaseResume) => !isLikelyTailoredResume(r, tailoredIds));
    const target = sortByRecent(masters)[0] ?? sortByRecent(allResumes)[0];
    if (target) setCurrentResumeId(target.$id);

  }, [allResumes, currentResumeId, isLikelyTailoredResume, persistedTailoredIds, setCurrentResumeId]);

  // Clear stale persisted JD from a previous browser session.
  // sessionStorage is wiped when the tab/browser closes, so absence of the
  // marker means this is a fresh session — any JD in localStorage is stale.
  useEffect(() => {
    const SESSION_MARKER = 'wr_tailoring_session';
    const isNewSession = !sessionStorage.getItem(SESSION_MARKER);
    if (isNewSession) {
      sessionStorage.setItem(SESSION_MARKER, '1');
      if (!preloadedDesc && !jobIdParam) {
        setJobDescription('');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pre-fill job description/info from query params
  useEffect(() => {
    if (preloadedDesc && !jobDescription) setJobDescription(preloadedDesc);
    if (preloadedTitle && preloadedCompany) {
      setParsedJobInfo({ title: preloadedTitle, company: preloadedCompany });
    }
    if (preloadedUrl && !jobUrl) setJobUrl(preloadedUrl);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pre-fill from saved job
  useEffect(() => {
    if (!preloadedJob) return;
    const desc = [preloadedJob.description, preloadedJob.requirements].filter(Boolean).join('\n\n');
    if (desc && !jobDescription) setJobDescription(desc);
    if (preloadedJob.source_url) setJobUrl(preloadedJob.source_url);
    setParsedJobInfo({ title: preloadedJob.title, company: preloadedJob.company });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preloadedJob]);

  useEffect(() => {
    activityTracker.setActiveFeature('Tailoring Hub');
    return () => activityTracker.setActiveFeature(null);
  }, []);

  const resumeText = useMemo(() => {
    if (!currentResume) return '';
    return [
      currentResume.summary,
      ...currentResume.experience.map(
        (e) => `${e.position} ${e.company} ${e.description} ${e.achievements.join(' ')}`,
      ),
      ...currentResume.education.map((e) => `${e.degree} ${e.field} ${e.institution}`),
      ...currentResume.skills,
    ]
      .filter(Boolean)
      .join(' ');
  }, [currentResume]);

  const canTailor = Boolean(currentResumeId && jobDescription.trim().length > 50);

  const jobSkills = useMemo(
    () => (jobDescription.trim().length > 50 ? extractKeywords(jobDescription, 15) : []),
    [jobDescription],
  );

  const matchScoreBefore = useMemo(() => {
    if (!jobDescription.trim() || !resumeText.trim()) return undefined;
    return computeMatch(jobDescription, resumeText).score;
  }, [jobDescription, resumeText]);

  const enterWorkspace = useCallback((nextParams?: Record<string, string>) => {
    setHubView('workspace');
    const merged = new URLSearchParams(searchParams);
    merged.set('mode', 'workspace');
    if (nextParams) {
      Object.entries(nextParams).forEach(([key, value]) => merged.set(key, value));
    }
    setSearchParams(merged, { replace: true });
  }, [searchParams, setSearchParams]);

  const exitToHub = useCallback(() => {
    setHubView('hub');
    const merged = new URLSearchParams(searchParams);
    merged.delete('mode');
    merged.delete('tailor');
    merged.delete('jobId');
    merged.delete('job');
    merged.delete('title');
    merged.delete('company');
    setSearchParams(merged, { replace: true });
  }, [searchParams, setSearchParams]);

  const applyImportedJob = useCallback((job: {
    title: string;
    company: string;
    description?: string;
    requirements?: string;
    source_url?: string | null;
  }, jobId?: string) => {
    const desc = [job.description, job.requirements].filter(Boolean).join('\n\n');
    if (desc) setJobDescription(desc);
    setParsedJobInfo({ title: job.title, company: job.company });
    if (job.source_url) setJobUrl(job.source_url);
    setJobInputActiveTab('paste');
    enterWorkspace(jobId ? { jobId } : undefined);
  }, [enterWorkspace, setJobDescription]);

  const handleSelectSavedJob = useCallback((job: Job) => {
    haptics.selection();
    applyImportedJob(
      {
        title: job.title,
        company: job.company,
        description: job.description,
        requirements: job.requirements,
        source_url: job.source_url,
      },
      isSyntheticSavedJobId(job.id) ? undefined : job.id,
    );
    toast.success('Job loaded — review the description and tailor when ready.');
  }, [applyImportedJob]);

  const handleStartTailoring = useCallback(() => {
    enterWorkspace();
  }, [enterWorkspace]);

  const handleFetchUrl = useCallback(async (url: string) => {
    if (!user) {
      toast.error('Still signing you in — please try again in a moment.');
      return;
    }
    try {
      const result = await importJob.mutateAsync(url);
      const { job } = result;
      applyImportedJob(
        {
          title: job.title,
          company: job.company,
          description: job.description,
          requirements: job.requirements,
          source_url: url,
        },
        result.id,
      );
      toast.success('Job saved — review the description below.');
    } catch (err) {
      const msg =
        err instanceof Error && err.message && err.message.length < 150 && err.message !== 'Import failed'
          ? err.message
          : 'Could not fetch job details — paste the description manually.';
      toast.error(msg);
    }
  }, [applyImportedJob, importJob, user]);

  const handleTailor = useCallback(async () => {
    if (!currentResume || !jobDescription.trim() || !user) {
      toast.error('Select a resume and add a job description to continue.');
      return;
    }
    if (jobDescription.trim().length < 50) {
      toast.error('Job description is too short — paste the full job posting for best results.');
      return;
    }

    haptics.medium();
    setIsTailoring(true);
    setTailorError(null);
    setTailorWarning(false);
    setProgress(null);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      let tailorResult: SuperTailorResult | null = null;
      const originalResume = currentResume;

      const aiRan = await executeAI(async () => {
        tailorResult = await tailorResumeWithProgress(
          redactedResume ?? currentResume,
          jobDescription,
          (p: AnyTailorProgress) => setProgress(p),
          intensity,
          abort.signal,
          localStorage.getItem('wr-tailor-custom-instructions') || undefined,
        );
        return tailorResult;
      }, { silent: true });

      if (abort.signal.aborted) return;
      if (!aiRan || !tailorResult || !originalResume) {
        setTailorError('Tailoring could not complete. Please try again.');
        return;
      }

      // Compute keyword-overlap score BEFORE merging (used as fallback when AI returns overallScore: null)
      const resumeTextBefore = [
        originalResume.summary,
        ...originalResume.experience.map(
          (e) => `${e.position} ${e.company} ${e.description} ${e.achievements.join(' ')}`,
        ),
        ...originalResume.education.map((e) => `${e.degree} ${e.field} ${e.institution}`),
        ...originalResume.skills,
      ].filter(Boolean).join(' ');

      // Build merged resume
      const merged = buildMergedResume(originalResume, tailorResult as SuperTailorResult, enabledSections);

      // Validate that tailoring produced meaningful changes (F-1: guardrail against unchanged AI output)
      const changeSummary = hasMeaningfulChanges(originalResume, merged, enabledSections);
      const aiReturnedScore = (tailorResult as SuperTailorResult).overallScore;
      const computedScoreBefore = computeMatch(jobDescription, resumeTextBefore).score;
      const scoreBefore = aiReturnedScore?.before ?? computedScoreBefore;
      const scoreAfter = aiReturnedScore?.after ?? computeMatch(jobDescription, [
        merged.summary,
        ...merged.experience.map(
          (e) => `${e.position} ${e.company} ${e.description} ${e.achievements.join(' ')}`,
        ),
        ...merged.education.map((e) => `${e.degree} ${e.field} ${e.institution}`),
        ...merged.skills,
      ].filter(Boolean).join(' ')).score;

      // Detect zero-change scenarios: both AI output validation and score validation
      const hasZeroScore = scoreBefore === 0 && scoreAfter === 0;
      const hasEqualScoreWithNoContentChanges = scoreBefore === scoreAfter && !changeSummary.hasChanges;
      const appearsUnchanged = !changeSummary.hasChanges || hasZeroScore || hasEqualScoreWithNoContentChanges;

      if (appearsUnchanged) {
        setIsTailoring(false);
        setProgress(null);
        // Recoverable guardrail, NOT a hard failure: the AI ran but produced no
        // meaningful diff (usually a too-generic job description). Frame it as a
        // warning with an inline retry instead of "Tailoring failed".
        setTailorWarning(true);
        setTailorError('No meaningful changes were detected — the job description may be too generic. Add the specific responsibilities and required skills, then tailor again.');
        haptics.error();
        toast.warning('No meaningful changes detected', {
          description: 'Add more detail to the job description, then retry.',
          duration: 6000,
        });
        return; // Do not navigate, do not save, do not show false success
      }

      const jobTitle = parsedJobInfo?.title ?? 'Job';
      const company = parsedJobInfo?.company ?? '';
      const scoreBeforeAfter = { before: scoreBefore, after: scoreAfter };
      const tr = tailorResult as SuperTailorResult;
      const compactDiff = {
        keyChanges: Array.isArray(tr?.keyChanges) ? tr.keyChanges.slice(0, 24) : [],
        bulletTransformations: Array.isArray(tr?.bulletTransformations) ? tr.bulletTransformations.slice(0, 30) : [],
        changedSections: changeSummary?.changedSections ?? [],
        missingSkills: Array.isArray(tr?.missingSkills) ? tr.missingSkills.slice(0, 24) : [],
      };
      if (JSON.stringify(compactDiff).length > 60000) compactDiff.bulletTransformations = [];
      const createdAt = new Date().toISOString();

      // Save as new resume document
      const newTitle = `${originalResume.contactInfo.fullName || 'Resume'} — ${jobTitle}${company ? ` @ ${company}` : ''} (Tailored)`;
      const doc = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.resumes,
        ID.unique(),
        {
          user_id: user.id,
          title: newTitle,
          parent_resume_id: currentResumeId ?? undefined,
          contact_info: JSON.stringify(merged.contactInfo),
          summary: merged.summary,
          experience: JSON.stringify(merged.experience),
          education: JSON.stringify(merged.education),
          skills: JSON.stringify(merged.skills),
          certifications: JSON.stringify(merged.certifications ?? []),
          projects: JSON.stringify(merged.projects ?? []),
          awards: JSON.stringify(merged.awards ?? []),
          template: migrateTemplateId(merged.templateId),
          customization: JSON.stringify(buildTailoringCustomization(merged.customization, {
            sourceResumeId: currentResumeId ?? undefined,
            jobTitle,
            company,
            jobUrl: jobUrl || null,
            scoreBeforeAfter,
            appliedSections: enabledSections,
            intensity,
            createdAt,
            tailorResult: compactDiff,
          })),
        },
      );
      const newResumeId = (doc as { $id: string }).$id;

      // Persist tailor history with validated change data
      addTailorHistory(
        {
          jobTitle,
          company,
          jobDescription,
          jobUrl: jobUrl || undefined,
          tailoredResumeId: newResumeId,
          tailorResult: tailorResult as SuperTailorResult,
          scoreBeforeAfter,
          appliedSections: enabledSections,
        },
        currentResumeId ?? undefined,
      );

      // Invalidate credits and resumes cache
      await invalidateAiCreditQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
      queryClient.invalidateQueries({ queryKey: ['saved-job-postings'] });
      queryClient.invalidateQueries({ queryKey: ['tailor-history-list'] });

      haptics.success();
      toast.success('Tailored CV created!');

      // Navigate first, then fire-and-forget Appwrite history write (E-7: pass enrichment state)
      navigate(`/tailoring-hub/result/${newResumeId}`, {
        state: {
          jobTitle,
          company,
          jobUrl: jobUrl || null,
          scoreBeforeAfter,
          appliedSections: enabledSections,
          intensity,
          changeSummary,
        },
      });

      saveTailorJobDescriptionForResume(newResumeId, jobDescription);

      // Clear persisted job description so workspace starts fresh next session
      setJobDescription('');

    } catch (err: unknown) {
      if (abort.signal.aborted) return;
      const msg = isAIError(err)
        ? aiErrorToastMessage({ code: err.code, message: err.message, status: err.status })
        : (err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setTailorError(msg);
      haptics.error();
      console.error('[TailoringHub] AI tailoring failed:', err);
    } finally {
      if (!abort.signal.aborted) {
        setIsTailoring(false);
        setProgress(null);
      }
    }
  }, [
    currentResume,
    jobDescription,
    user,
    enabledSections,
    intensity,
    parsedJobInfo,
    jobUrl,
    executeAI,
    redactedResume,
    addTailorHistory,
    currentResumeId,
    queryClient,
    navigate,
  ]);

  const handleAbort = () => {
    abortRef.current?.abort();
    setIsTailoring(false);
    setProgress(null);
    toast.info('Tailoring cancelled.');
  };

  return (
    <div className="jmw-page">
      {/* Header */}
      <div className="jmw-header">
        <div className="jmw-header__glow" aria-hidden />
        <div className="jmw-header__inner">
          <button
            type="button"
            onClick={() => (hubView === 'workspace' ? exitToHub() : navigate(-1))}
            className="flex items-center justify-center w-9 h-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors shrink-0"
            aria-label={hubView === 'workspace' ? 'Back to hub overview' : 'Go back'}
          >
            <ArrowLeft className="w-4 h-4" aria-hidden />
          </button>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary/12 border border-primary/20 shrink-0">
              <Wand2 className="w-4 h-4 text-primary" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/80 leading-none">
                AI Tailoring
              </p>
              <h1 className="text-sm font-bold text-foreground leading-snug truncate">
                {hubView === 'hub' ? 'Tailoring Hub' : 'New tailoring session'}
              </h1>
            </div>
          </div>
          {hubView === 'workspace' && parsedJobInfo && (
            <div className="flex items-center gap-1.5 shrink-0 max-w-[40vw] sm:max-w-[12rem]">
              <Briefcase className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden />
              <span className="text-xs text-muted-foreground truncate">
                {parsedJobInfo.title}
                {parsedJobInfo.company ? ` @ ${parsedJobInfo.company}` : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Progress overlay */}
      {isTailoring && (
        <JobMatchProgressStage
          progress={progress}
          jobTitle={parsedJobInfo?.title}
          company={parsedJobInfo?.company}
          resumeTitle={selectedResumeTitle ?? undefined}
          matchScoreBefore={matchScoreBefore}
          onCancel={handleAbort}
        />
      )}

      {/* Scrollable body */}
      <div className="jmw-body">
        {hubView === 'hub' ? (
          <TailoringHubLanding
            persistedTailoredIds={persistedTailoredIds}
            onStartTailoring={handleStartTailoring}
            onImportJob={() => setImportJobOpen(true)}
            onSelectSavedJob={handleSelectSavedJob}
          />
        ) : (
        <div className="jmw-content">
          <div className="jmw-workflow-steps" aria-label="Tailoring steps">
            <div className="jmw-workflow-step" data-done={currentResumeId ? 'true' : 'false'}>
              <span className="jmw-workflow-step__num">1</span>
              <span className="jmw-workflow-step__label">Pick resume</span>
            </div>
            <div className="jmw-workflow-step" data-done={jobDescription.trim().length > 50 ? 'true' : 'false'}>
              <span className="jmw-workflow-step__num">2</span>
              <span className="jmw-workflow-step__label">Add job details</span>
            </div>
            <div className="jmw-workflow-step" data-done={canTailor ? 'true' : 'false'}>
              <span className="jmw-workflow-step__num">3</span>
              <span className="jmw-workflow-step__label">Tune & create</span>
            </div>
          </div>

          <div className="jmw-content__left">
            <div className="jmw-panel shrink-0">
              <div className="jmw-panel__head">
                <p className="jmw-panel__title">Source resume</p>
              </div>
              <div className="p-3">
                {showResumePicker ? (
                  <div className="flex flex-col gap-2">
                    <Select
                      value={currentResumeId ?? ''}
                      onValueChange={(val) => {
                        setCurrentResumeId(val);
                        setShowResumePicker(false);
                        haptics.selection();
                      }}
                    >
                      <SelectTrigger className="h-11 rounded-xl text-sm">
                        <SelectValue placeholder="Choose a resume…" />
                      </SelectTrigger>
                      <SelectContent>
                        {allResumes?.map((r: DatabaseResume) => (
                          <SelectItem key={r.$id} value={r.$id}>
                            {r.title || 'Untitled Resume'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="self-start text-xs"
                      onClick={() => setShowResumePicker(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <ResumeChip
                    title={selectedResumeTitle}
                    isLoading={resumesLoading}
                    onClick={() => setShowResumePicker(true)}
                    className="border-0 bg-transparent p-0 shadow-none hover:shadow-none min-h-0"
                  />
                )}
              </div>
            </div>

            <JobInputArea
              jobDescription={jobDescription}
              jobUrl={jobUrl}
              onJobDescriptionChange={setJobDescription}
              onJobUrlChange={setJobUrl}
              onFetchUrl={handleFetchUrl}
              isFetchingUrl={importJob.isPending}
              initialTab="paste"
              activeTab={jobInputActiveTab}
              onActiveTabChange={setJobInputActiveTab}
              fillHeight
            />

            {parsedJobInfo && (
              <JobPreviewCard
                title={parsedJobInfo.title}
                company={parsedJobInfo.company}
                jobUrl={jobUrl || undefined}
                description={jobDescription || undefined}
                skills={jobSkills.length > 0 ? jobSkills : undefined}
              />
            )}

            {tailorError && (
              <div className={cn(
                'flex flex-col gap-2.5 rounded-xl border px-4 py-3 shrink-0',
                tailorWarning
                  ? 'border-warning/40 bg-warning/10'
                  : 'border-destructive/30 bg-destructive/8',
              )}>
                <div>
                  <p className={cn('text-sm font-medium', tailorWarning ? 'text-warning' : 'text-destructive')}>
                    {tailorWarning ? 'No changes detected' : 'Tailoring failed'}
                  </p>
                  <p className={cn('text-xs mt-0.5 leading-relaxed', tailorWarning ? 'text-warning/90' : 'text-destructive/80')}>
                    {tailorError}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleTailor}>
                    Retry tailoring
                  </Button>
                  {tailorWarning && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs"
                      onClick={() => { setTailorError(null); setTailorWarning(false); setJobInputActiveTab('paste'); }}
                    >
                      Edit job description
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="jmw-content__right">
            <div className="jmw-content__right-scroll">
              {jobDescription.trim().length > 50 && currentResume && (
                <MatchAnalysisSummary
                  jobDescription={jobDescription}
                  resumeText={resumeText}
                />
              )}

              <JobMatchAdvancedOptions
                intensity={intensity}
                onIntensityChange={setIntensity}
                enabledSections={enabledSections}
                onSectionsChange={setEnabledSections}
              />

              <JobMatchSavedJobsList
                selectedJobId={jobIdParam}
                onSelectJob={handleSelectSavedJob}
                onImportJob={() => setImportJobOpen(true)}
              />

              <JobMatchHistoryList />
            </div>
          </div>

          {!isTailoring && (
            <JobMatchStickyFooter
              className="jmw-content__footer"
              canTailor={canTailor}
              isTailoring={isTailoring}
              onTailor={handleTailor}
            />
          )}
        </div>
        )}
      </div>
      <ImportJobSheet open={importJobOpen} onOpenChange={setImportJobOpen} />
    </div>
  );
}
