import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Wand2, ArrowLeft, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';

import { useResumeStore } from '@/store/resumeStore';
import { useResumes, dbToResumeData, type DatabaseResume } from '@/hooks/useResumes';
import { useJob } from '@/hooks/useJobs';
import { useAuth } from '@/hooks/useAuth';
import { useAIAction } from '@/hooks/useAIAction';
import { useImportJob } from '@/hooks/useImportJob';
import { useRedactedResume } from '@/hooks/useRedactedResume';
import { useQueryClient } from '@tanstack/react-query';
import { tailorResumeWithProgress, type TailorIntensity } from '@/lib/aiTailor';
import { buildMergedResume } from '@/lib/tailorMerge';
import { databases, DATABASE_ID, ID } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';
import { invalidateAiCreditQueries } from '@/lib/invalidate-ai-credit-queries';
import { activityTracker } from '@/lib/activityTracker';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';

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
import '@/components/job-match/job-match-workspace.css';

type AnyTailorProgress = TailorProgress | EnhancedTailorProgress;

const DEFAULT_SECTIONS: TailorSectionId[] = [
  'summary', 'skills', 'experience', 'education', 'projects', 'certifications', 'awards',
];

export default function JobMatchWorkspacePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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

  const { data: preloadedJob } = useJob(jobIdParam);

  const [jobUrl, setJobUrl] = useState('');
  const [parsedJobInfo, setParsedJobInfo] = useState<{ title: string; company: string } | null>(null);
  const [intensity, setIntensity] = useState<TailorIntensity>('moderate');
  const [enabledSections, setEnabledSections] = useState<TailorSectionId[]>(DEFAULT_SECTIONS);
  const [isTailoring, setIsTailoring] = useState(false);
  const [progress, setProgress] = useState<TailorProgress | EnhancedTailorProgress | null>(null);
  const [tailorError, setTailorError] = useState<string | null>(null);
  const [showResumePicker, setShowResumePicker] = useState(false);
  const [jobInputActiveTab, setJobInputActiveTab] = useState<'paste' | 'url'>('paste');

  const abortRef = useRef<AbortController | null>(null);
  const { execute: executeAI } = useAIAction({ operation: 'tailor' });
  const importJob = useImportJob();
  const redactedResume = useRedactedResume(currentResume as ResumeData | null);

  // Auto-select a MASTER resume on load.
  // "Tailored" is detected via Zustand tailorHistory (Appwrite schema has no parent_resume_id).
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
    const tailoredIds = new Set(
      useResumeStore.getState().tailorHistory
        .map((h) => h.tailoredResumeId)
        .filter(Boolean) as string[],
    );
    const currentDb = allResumes.find((r: DatabaseResume) => r.$id === currentResumeId);
    const isTailored = tailoredIds.has(currentDb?.$id ?? '') || !!currentDb?.parent_resume_id;
    if (currentDb && !isTailored) return; // already a master — done
    const masters = allResumes.filter((r: DatabaseResume) => !tailoredIds.has(r.$id) && !r.parent_resume_id);
    const target = sortByRecent(masters)[0] ?? sortByRecent(allResumes)[0];
    if (target) setCurrentResumeId(target.$id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allResumes]);

  // Pre-fill job description/info from query params
  useEffect(() => {
    if (preloadedDesc && !jobDescription) setJobDescription(preloadedDesc);
    if (preloadedTitle && preloadedCompany) {
      setParsedJobInfo({ title: preloadedTitle, company: preloadedCompany });
    }
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

  const handleFetchUrl = useCallback(async (url: string) => {
    if (!user) {
      toast.error('Still signing you in — please try again in a moment.');
      return;
    }
    try {
      const result = await importJob.mutateAsync(url);
      const { job } = result;
      if (job.description) {
        const desc = [job.description, job.requirements].filter(Boolean).join('\n\n');
        setJobDescription(desc);
      }
      setParsedJobInfo({ title: job.title, company: job.company });
      setJobInputActiveTab('paste');
      toast.success('Job details loaded — review the description below.');
    } catch (err) {
      const msg =
        err instanceof Error && err.message && err.message.length < 150 && err.message !== 'Import failed'
          ? err.message
          : 'Could not fetch job details — paste the description manually.';
      toast.error(msg);
    }
  }, [importJob, setJobDescription, setJobInputActiveTab]);

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
    setProgress(null);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      let tailorResult: SuperTailorResult | null = null;
      const originalResume = currentResume;

      await executeAI(async () => {
        tailorResult = await tailorResumeWithProgress(
          redactedResume ?? currentResume,
          jobDescription,
          (p: AnyTailorProgress) => setProgress(p),
          intensity,
          abort.signal,
          localStorage.getItem('wr-tailor-custom-instructions') || undefined,
        );
      });

      if (!tailorResult || !originalResume || abort.signal.aborted) return;

      // Compute keyword-overlap score BEFORE merging (used as fallback when AI returns overallScore: null)
      const resumeTextBefore = [
        originalResume.summary,
        ...originalResume.experience.map(
          (e) => `${e.position} ${e.company} ${e.description} ${e.achievements.join(' ')}`,
        ),
        ...originalResume.education.map((e) => `${e.degree} ${e.field} ${e.institution}`),
        ...originalResume.skills,
      ].filter(Boolean).join(' ');
      const scoreBefore = computeMatch(jobDescription, resumeTextBefore).score;

      // Build merged resume
      const merged = buildMergedResume(originalResume, tailorResult as SuperTailorResult, enabledSections);
      const resumeTextAfter = [
        merged.summary,
        ...merged.experience.map(
          (e) => `${e.position} ${e.company} ${e.description} ${e.achievements.join(' ')}`,
        ),
        ...merged.education.map((e) => `${e.degree} ${e.field} ${e.institution}`),
        ...merged.skills,
      ].filter(Boolean).join(' ');
      const scoreAfter = computeMatch(jobDescription, resumeTextAfter).score;
      const jobTitle = parsedJobInfo?.title ?? 'Job';
      const company = parsedJobInfo?.company ?? '';

      // Save as new resume document
      const newTitle = `${originalResume.contactInfo.fullName || 'Resume'} — ${jobTitle}${company ? ` @ ${company}` : ''} (Tailored)`;
      const doc = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.resumes,
        ID.unique(),
        {
          user_id: user.id,
          title: newTitle,
          contact_info: JSON.stringify(merged.contactInfo),
          summary: merged.summary,
          experience: JSON.stringify(merged.experience),
          education: JSON.stringify(merged.education),
          skills: JSON.stringify(merged.skills),
          certifications: JSON.stringify(merged.certifications ?? []),
          projects: JSON.stringify(merged.projects ?? []),
          awards: JSON.stringify(merged.awards ?? []),
          template: merged.templateId || 'modern',
        },
      );
      const newResumeId = (doc as { $id: string }).$id;

      // Persist tailor history
      // Prefer AI-computed overallScore; fall back to keyword-overlap scores if null.
      const resultScore = (tailorResult as SuperTailorResult).overallScore;
      const scoreBeforeAfter = {
        before: resultScore?.before ?? scoreBefore,
        after: resultScore?.after ?? scoreAfter,
      };
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
        },
      });

      // Clear persisted job description so workspace starts fresh next session
      setJobDescription('');

      // E-6: Persist to Appwrite tailor_history (fire-and-forget, non-blocking)
      databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.tailor_history,
        ID.unique(),
        {
          user_id: user.id,
          job_title: jobTitle,
          company: company || '',
          job_url: jobUrl || null,
          tailored_resume_id: newResumeId,
          source_resume_id: currentResumeId ?? null,
          score_before: scoreBeforeAfter.before,
          score_after: scoreBeforeAfter.after,
          applied_sections: JSON.stringify(enabledSections),
          intensity,
          status: 'completed',
          job_description: jobDescription.slice(0, 5000),
        },
      ).catch((err: unknown) => {
        console.warn('[TailoringHub] tailor_history write failed (non-blocking):', err);
      });
    } catch (err: unknown) {
      if (abort.signal.aborted) return;
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setTailorError(msg);
      haptics.error();
      toast.error(msg);
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
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-9 h-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors shrink-0"
            aria-label="Go back"
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
                Tailoring Hub
              </h1>
            </div>
          </div>
          {parsedJobInfo && (
            <div className="hidden sm:flex items-center gap-1.5 shrink-0 max-w-[12rem]">
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
          onCancel={handleAbort}
        />
      )}

      {/* Scrollable body */}
      <div className="jmw-body">
        <div className="jmw-content">
          {/* Resume selector */}
          {showResumePicker ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                Select resume
              </p>
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
            />
          )}

          {/* Job input */}
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
          />

          {/* Parsed job preview */}
          {parsedJobInfo && (
            <JobPreviewCard
              title={parsedJobInfo.title}
              company={parsedJobInfo.company}
              jobUrl={jobUrl || undefined}
              description={jobDescription || undefined}
              skills={jobSkills.length > 0 ? jobSkills : undefined}
            />
          )}

          {/* Match analysis */}
          {jobDescription.trim().length > 50 && currentResume && (
            <MatchAnalysisSummary
              jobDescription={jobDescription}
              resumeText={resumeText}
            />
          )}

          {/* Advanced options */}
          <JobMatchAdvancedOptions
            intensity={intensity}
            onIntensityChange={setIntensity}
            enabledSections={enabledSections}
            onSectionsChange={setEnabledSections}
          />

          {/* Error state */}
          {tailorError && (
            <div className={cn(
              'flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3',
            )}>
              <div>
                <p className="text-sm font-medium text-destructive">Tailoring failed</p>
                <p className="text-xs text-destructive/80 mt-0.5 leading-relaxed">{tailorError}</p>
              </div>
            </div>
          )}

          {/* History list */}
          <JobMatchHistoryList />

          {/* Spacer for sticky footer */}
          <div className="h-2" aria-hidden />
        </div>
      </div>

      {/* Sticky footer */}
      {!isTailoring && (
        <JobMatchStickyFooter
          canTailor={canTailor}
          isTailoring={isTailoring}
          onTailor={handleTailor}
        />
      )}
    </div>
  );
}
