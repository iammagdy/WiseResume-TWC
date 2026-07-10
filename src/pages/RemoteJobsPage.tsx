import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Briefcase,
  Search,
  ExternalLink,
  Wand2,
  Bookmark,
  CheckCircle2,
  Building2,
  MapPin,
  Calendar,
  DollarSign,
  Tag,
  RefreshCw,
  Clock,
  Sparkles,
  Layers,
  Sparkle,
  Loader2,
  FileText,
} from 'lucide-react';
import { useRemoteJobs } from '@/hooks/useRemoteJobs';
import { useAuth } from '@/hooks/useAuth';
import { useResumes, useSetMasterCV, dbToResumeData, type DatabaseResume } from '@/hooks/useResumes';
import { useJobApplicationMutations } from '@/hooks/useJobApplications';
import { useAICreditsMutations } from '@/hooks/useAICredits';
import { tailorResumeWithProgress, generateCoverLetter } from '@/lib/aiTailor';
import { buildMergedResume, hasMeaningfulChanges } from '@/lib/tailorMerge';
import { buildTailoringCustomization } from '@/lib/tailoringResumeMetadata';
import { databases, DATABASE_ID, ID, Query, Permission, Role } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';
import { invalidateAiCreditQueries } from '@/lib/invalidate-ai-credit-queries';
import { useResumeStore } from '@/store/resumeStore';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  type NormalizedRemoteJob,
  type JobSource,
  type RoleGroup,
  ROLE_GROUPS,
} from '@/lib/remoteJobsFeed';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';

const STOP_WORDS = new Set([
  'and','the','our','you','your','we','are','for','with','this','that','from','will','have','has',
  'work','team','experience','skills','role','company','position','required','etc'
]);

function extractKeywords(text: string, limit = 40): string[] {
  const words = text.toLowerCase().replace(/[^a-z0-9\s\-+#.]/g, ' ').split(/\s+/);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of words) {
    if (w.length >= 3 && !STOP_WORDS.has(w) && !seen.has(w)) {
      seen.add(w);
      out.push(w);
      if (out.length >= limit) break;
    }
  }
  return out;
}

function computeMatchScore(jobDesc: string, resumeText: string): number {
  if (!jobDesc.trim() || !resumeText.trim()) return 0;
  const jobKws = extractKeywords(jobDesc, 40);
  if (jobKws.length === 0) return 0;
  const lower = resumeText.toLowerCase();
  const matched = jobKws.filter((kw) => lower.includes(kw));
  return Math.round((matched.length / jobKws.length) * 100);
}

export default function RemoteJobsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isRtl = i18n.language === 'ar';
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();

  // Basic Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<JobSource | 'all'>('all');
  const [selectedRoleGroup, setSelectedRoleGroup] = useState<RoleGroup | 'all'>('all');
  const [confirmingAppliedJobId, setConfirmingAppliedJobId] = useState<string | null>(null);

  // Advanced Filter States
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string | 'all'>('all');
  const [selectedSeniority, setSelectedSeniority] = useState<string | 'all'>('all');
  const [hasSalaryOnly, setHasSalaryOnly] = useState(false);
  const [minSalary, setMinSalary] = useState<number | undefined>(undefined);
  const [salaryPeriod, setSalaryPeriod] = useState<string | 'all'>('all');
  const [showOlder, setShowOlder] = useState(false);

  // Fast Tailor States
  const [activeJobForTailoring, setActiveJobForTailoring] = useState<NormalizedRemoteJob | null>(null);
  const [showResumePickerDialog, setShowResumePickerDialog] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [makeDefaultResume, setMakeDefaultResume] = useState(false);
  const [isTailoring, setIsTailoring] = useState(false);
  const [tailorProgress, setTailorProgress] = useState<string>('');
  const isTailoringRef = useRef(false);
  const { checkCredits } = useAICreditsMutations();

  // Resumes and mutations
  const { data: resumes = [] } = useResumes();
  const setMasterCV = useSetMasterCV();
  const addTailorHistory = useResumeStore(state => state.addTailorHistory);

  const {
    jobs,
    userActions,
    total,
    isLoading,
    isSynced,
    lastSyncedAt,
    refetch,
    trackAction,
  } = useRemoteJobs({
    source: selectedSource,
    roleGroup: selectedRoleGroup,
    query: searchQuery,
    limit: 50,
    region_fit: selectedRegion,
    seniority: selectedSeniority,
    has_salary: hasSalaryOnly,
    min_salary: minSalary,
    salary_period: salaryPeriod,
    show_older: showOlder,
  });

  const handleApplyClick = (job: NormalizedRemoteJob) => {
    if (job.apply_url) {
      window.open(job.apply_url, '_blank', 'noopener,noreferrer');
      setConfirmingAppliedJobId(job.$id || job.dedupe_key);
    }
  };

  const handleMarkApplied = async (job: NormalizedRemoteJob) => {
    const res = await trackAction(job, 'mark_applied');
    setConfirmingAppliedJobId(null);
    if (res.ok) {
      toast.success(t('remoteJobs.alreadyApplied', 'Marked as applied!'));
    } else {
      toast.error(res.error || 'Failed to update status');
    }
  };

  const handleToggleSave = async (job: NormalizedRemoteJob, isCurrentlySaved: boolean) => {
    const action = isCurrentlySaved ? 'undo' : 'save';
    const res = await trackAction(job, action);
    if (res.ok) {
      toast.success(isCurrentlySaved ? 'Removed from saved jobs' : 'Job saved!');
    } else {
      toast.error(res.error || 'Failed to update save status');
    }
  };

  const handleTailorClick = (job: NormalizedRemoteJob) => {
    const desc = job.description_html || job.description_excerpt || `${job.title} at ${job.company}`;
    const targetUrl = `/tailoring-hub?job=${encodeURIComponent(desc)}&title=${encodeURIComponent(job.title)}&company=${encodeURIComponent(job.company)}&url=${encodeURIComponent(job.apply_url)}`;
    navigate(targetUrl);
  };

  const handleFastTailor = useCallback((job: NormalizedRemoteJob) => {
    if (isTailoringRef.current) return;
    if (!isAuthenticated) {
      toast.error('Authentication required to tailor resumes.');
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    if (resumes.length === 0) {
      toast.error('Please upload or create a resume first.');
      navigate('/');
      return;
    }

    const master = resumes.find(r => r.is_master);
    if (master) {
      void executeFastTailorFlow(master, job);
    } else if (resumes.length === 1) {
      void executeFastTailorFlow(resumes[0], job);
    } else {
      // Prompt user to select one
      setActiveJobForTailoring(job);
      setSelectedResumeId(resumes[0].$id);
      setShowResumePickerDialog(true);
    }
  }, [isAuthenticated, resumes, navigate]);

  const executeFastTailorFlow = async (selectedDbResume: DatabaseResume, job: NormalizedRemoteJob) => {
    if (!user?.id) {
      toast.error('Authentication required to tailor resumes.');
      return;
    }
    if (isTailoringRef.current) return;
    isTailoringRef.current = true;
    setIsTailoring(true);
    setTailorProgress('Initializing tailoring...');
    haptics.medium();
    
    // Close dialog immediately if open
    setShowResumePickerDialog(false);

    try {
      const hasCredits = await checkCredits();
      if (!hasCredits) {
        toast.error("You've reached your daily AI credit limit. Upgrade your plan to get more credits!");
        setIsTailoring(false);
        isTailoringRef.current = false;
        return;
      }

      if (makeDefaultResume) {
        await setMasterCV.mutateAsync(selectedDbResume.$id);
      }

      const originalResume = dbToResumeData(selectedDbResume);
      const jobDescription = job.description_html || job.description_excerpt || `${job.title} at ${job.company}`;

      // Step 1: Tailor Resume
      setTailorProgress('Analyzing job and tailoring CV...');
      const tailorResult = await tailorResumeWithProgress(
        originalResume,
        jobDescription,
        (p) => {
          setTailorProgress(`Tailoring CV... ${Math.round(p.progress)}%`);
        },
        'aggressive'
      );

      // Step 2: Generate Cover Letter
      setTailorProgress('Generating personalized cover letter...');
      let coverLetterText = '';
      try {
        coverLetterText = await generateCoverLetter(originalResume, jobDescription, 'professional');
      } catch (clErr) {
        console.error('Failed to generate cover letter:', clErr);
        toast.warning('Cover letter generation failed, but tailoring resume succeeded.');
      }

      const merged = buildMergedResume(originalResume, tailorResult, ['summary', 'skills', 'experience']);

      // Validate that tailoring produced meaningful changes (guardrail against unchanged AI output)
      const changeSummary = hasMeaningfulChanges(originalResume, merged, ['summary', 'skills', 'experience']);
      
      const resumeTextBefore = [
        originalResume.summary,
        ...originalResume.experience.map(
          (e) => `${e.position} ${e.company} ${e.description} ${e.achievements.join(' ')}`,
        ),
        ...originalResume.education.map((e) => `${e.degree} ${e.field} ${e.institution}`),
        ...originalResume.skills,
      ].filter(Boolean).join(' ');

      const aiReturnedScore = tailorResult.overallScore;
      const computedScoreBefore = computeMatchScore(jobDescription, resumeTextBefore);
      const scoreBefore = aiReturnedScore?.before ?? computedScoreBefore;
      const scoreAfter = aiReturnedScore?.after ?? computeMatchScore(jobDescription, [
        merged.summary,
        ...merged.experience.map(
          (e) => `${e.position} ${e.company} ${e.description} ${e.achievements.join(' ')}`,
        ),
        ...merged.education.map((e) => `${e.degree} ${e.field} ${e.institution}`),
        ...merged.skills,
      ].filter(Boolean).join(' '));

      const hasZeroScore = scoreBefore === 0 && scoreAfter === 0;
      const hasEqualScoreWithNoContentChanges = scoreBefore === scoreAfter && !changeSummary.hasChanges;
      const appearsUnchanged = !changeSummary.hasChanges || hasZeroScore || hasEqualScoreWithNoContentChanges;

      if (appearsUnchanged) {
        setIsTailoring(false);
        isTailoringRef.current = false;
        toast.warning('No meaningful changes detected', {
          description: 'Add more detail to the job description, then retry.',
          duration: 6000,
        });
        return;
      }

      // Step 3: Save Tailored Resume
      setTailorProgress('Saving tailored resume...');
      const newTitle = `${job.company} - ${job.title} - Tailored CV`;
      const doc = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.resumes,
        ID.unique(),
        {
          user_id: user?.id,
          title: newTitle,
          parent_resume_id: selectedDbResume.$id,
          contact_info: JSON.stringify(merged.contactInfo),
          summary: merged.summary,
          experience: JSON.stringify(merged.experience),
          education: JSON.stringify(merged.education),
          skills: JSON.stringify(merged.skills),
          certifications: JSON.stringify(merged.certifications ?? []),
          projects: JSON.stringify(merged.projects ?? []),
          awards: JSON.stringify(merged.awards ?? []),
          template: selectedDbResume.template || 'classic',
          customization: JSON.stringify(buildTailoringCustomization(merged.customization, {
            sourceResumeId: selectedDbResume.$id,
            jobTitle: job.title,
            company: job.company,
            jobUrl: job.apply_url || null,
            scoreBeforeAfter: { before: tailorResult.overallScore?.before || 50, after: tailorResult.overallScore?.after || 85 },
            appliedSections: ['summary', 'skills', 'experience'],
            intensity: 'aggressive',
            createdAt: new Date().toISOString(),
            tailorResult: {
              keyChanges: tailorResult.keyChanges || [],
              bulletTransformations: tailorResult.bulletTransformations || [],
              changedSections: ['summary', 'skills', 'experience'],
              missingSkills: tailorResult.missingSkills || [],
            },
          })),
        }
      );

      const tailoredResumeId = doc.$id;

      // Save Cover Letter if generated
      let generatedCoverLetterId = '';
      if (coverLetterText) {
        setTailorProgress('Saving cover letter...');
        const clDoc = await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.cover_letters,
          ID.unique(),
          {
            user_id: user.id,
            title: `${job.company} - ${job.title} - Cover Letter`,
            job_title: job.title,
            company: job.company,
            content: coverLetterText,
            tone: 'professional',
            resume_id: tailoredResumeId,
          },
          [
            Permission.read(Role.user(user.id)),
            Permission.update(Role.user(user.id)),
            Permission.delete(Role.user(user.id)),
          ]
        );
        generatedCoverLetterId = clDoc.$id;
      }

      // Step 4: Track in Application Tracker (job_applications)
      setTailorProgress('Tracking application...');
      await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.job_applications,
        ID.unique(),
        {
          user_id: user?.id,
          job_title: job.title,
          company: job.company,
          status: 'ready_to_apply',
          url: job.apply_url || null,
          resume_id: tailoredResumeId,
          cover_letter_id: generatedCoverLetterId || null,
          generated_resume_id: tailoredResumeId,
          generated_cover_letter_id: generatedCoverLetterId || null,
          job_feed_item_id: job.$id || null,
          source_job_id: job.source_job_id || null,
          applied_at: null,
        }
      );

      // Track in remote job feed specific actions (user_job_actions)
      await trackAction(job, 'mark_ready_to_apply', undefined, selectedDbResume.$id, tailoredResumeId, generatedCoverLetterId);

      // Add to store history
      addTailorHistory(
        {
          jobTitle: job.title,
          company: job.company,
          jobDescription,
          jobUrl: job.apply_url || undefined,
          tailoredResumeId,
          tailorResult,
          scoreBeforeAfter: { before: tailorResult.overallScore?.before || 50, after: tailorResult.overallScore?.after || 85 },
          appliedSections: ['summary', 'skills', 'experience'],
        },
        selectedDbResume.$id
      );

      // Invalidate queries
      await invalidateAiCreditQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
      queryClient.invalidateQueries({ queryKey: ['cover-letters'] });
      queryClient.invalidateQueries({ queryKey: ['job-applications'] });
      queryClient.invalidateQueries({ queryKey: ['tailor-history-list'] });

      haptics.success();
      toast.success('Fast Tailor complete!');
      // Navigate to results page
      navigate(`/tailoring-hub/result/${tailoredResumeId}`);
    } catch (err: any) {
      console.error(err);
      haptics.error();
      toast.error(err.message || 'Fast Tailor failed.');
    } finally {
      isTailoringRef.current = false;
      setIsTailoring(false);
      setShowResumePickerDialog(false);
      setActiveJobForTailoring(null);
    }
  };

  const formatSourceBadge = (source: JobSource) => {
    switch (source) {
      case 'remotive':
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium">Remotive</Badge>;
      case 'weworkremotely':
        return <Badge variant="outline" className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 font-medium">We Work Remotely</Badge>;
      case 'jobicy':
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 font-medium">Jobicy</Badge>;
      case 'remoteok':
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-medium">Remote OK</Badge>;
      case 'arbeitnow':
        return <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 font-medium">Arbeitnow</Badge>;
      case 'himalayas':
        return <Badge variant="outline" className="bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20 font-medium">Himalayas</Badge>;
      case 'greenhouse':
        return <Badge variant="outline" className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 font-medium">Greenhouse</Badge>;
      case 'lever':
        return <Badge variant="outline" className="bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20 font-medium">Lever</Badge>;
      default:
        return <Badge variant="outline">{source}</Badge>;
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return null;
    }
  };

  const formatLastSynced = (dateStr?: string | null) => {
    if (!dateStr) return 'Not yet synced';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString(isRtl ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' }) + ', ' +
        d.toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' });
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div className="min-h-full bg-background/50 p-4 md:p-8 space-y-6 max-w-7xl mx-auto" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Briefcase className="w-6 h-6 text-[#9E1B22]" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              {t('remoteJobs.title', 'Remote Jobs Feed')}
            </h1>
            <Badge variant="secondary" className="text-xs font-semibold px-2 py-0.5 bg-primary/10 text-[#9E1B22] border-none">
              MVP
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            {t('remoteJobs.subtitle', 'Discover entry-level, customer support, data entry, marketing, sales, writing, and tech opportunities from verified remote sources.')}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          disabled={isLoading}
          className="self-start md:self-auto gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          {t('common.refresh', 'Refresh')}
        </Button>
      </div>

      {/* Freshness & Sources Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/5 dark:bg-slate-100/5 border border-border/60 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <Clock className="w-3.5 h-3.5 text-[#9E1B22]" />
            Last updated: {formatLastSynced(lastSyncedAt)}
          </span>
          <span className="hidden md:inline text-border">•</span>
          <span>New jobs are synced every 6 hours</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium">
          <span className="text-muted-foreground">Sources:</span>
          <span className="font-semibold text-foreground">Remotive, WWR, Jobicy, Remote OK, Arbeitnow, Himalayas, Greenhouse, Lever</span>
        </div>
      </div>

      {/* Role Group Pills Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#9E1B22]" />
            Role Categories ({total} remote jobs available)
          </span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          {ROLE_GROUPS.map(group => {
            const isSelected = selectedRoleGroup === group.id;

            return (
              <button
                key={group.id}
                onClick={() => setSelectedRoleGroup(group.id as RoleGroup | 'all')}
                className={`flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-[#9E1B22] text-white shadow-sm'
                    : 'bg-secondary/70 hover:bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                {group.id === 'easy_entry_level' && <Sparkle className="w-3 h-3 text-amber-300 fill-amber-300" />}
                <span>{group.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 bg-card/40 p-4 rounded-xl border border-border/60">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('remoteJobs.searchPlaceholder', 'Search by job title, company, or keywords...')}
              className="pl-9 bg-background"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedSource}
              onChange={e => setSelectedSource(e.target.value as JobSource | 'all')}
              className="h-10 px-3 rounded-md border border-input bg-background text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">All Sources</option>
              <option value="remotive">Remotive</option>
              <option value="weworkremotely">We Work Remotely</option>
              <option value="jobicy">Jobicy</option>
              <option value="remoteok">Remote OK</option>
              <option value="arbeitnow">Arbeitnow</option>
              <option value="himalayas">Himalayas</option>
              <option value="greenhouse">Greenhouse</option>
              <option value="lever">Lever</option>
            </select>

            <Button
              variant="outline"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="gap-2 shrink-0"
            >
              <span>Filters</span>
              <span className="text-[10px]">{showAdvanced ? '▲' : '▼'}</span>
            </Button>
          </div>
        </div>

        {/* Freshness Switch - Main Row */}
        <div className="flex items-center justify-between border-t border-border/40 pt-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="freshness-toggle"
              checked={!showOlder}
              onChange={e => setShowOlder(!e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary border-border"
            />
            <label htmlFor="freshness-toggle" className="text-xs font-semibold text-foreground select-none cursor-pointer flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#9E1B22]" />
              Fresh jobs only (≤ 3 days old)
            </label>
          </div>

          {/* Quick reset */}
          {(searchQuery || selectedSource !== 'all' || selectedRoleGroup !== 'all' || selectedRegion !== 'all' || selectedSeniority !== 'all' || hasSalaryOnly || minSalary || salaryPeriod !== 'all' || showOlder) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedSource('all');
                setSelectedRoleGroup('all');
                setSelectedRegion('all');
                setSelectedSeniority('all');
                setHasSalaryOnly(false);
                setMinSalary(undefined);
                setSalaryPeriod('all');
                setShowOlder(false);
              }}
              className="text-xs font-bold text-[#9E1B22] hover:underline"
            >
              Reset all filters
            </button>
          )}
        </div>

        {/* Advanced Filters Expandable panel */}
        {showAdvanced && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-border/40 animate-in fade-in duration-200">
            {/* Region Fit */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Region Fit</label>
              <select
                value={selectedRegion}
                onChange={e => setSelectedRegion(e.target.value)}
                className="w-full h-9 px-2 rounded-md border border-input bg-background text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="all">All Regions</option>
                <option value="worldwide">Worldwide / Global</option>
                <option value="egypt_friendly">Egypt-Friendly</option>
                <option value="gulf_friendly">Gulf-Friendly</option>
                <option value="mena">MENA Region</option>
                <option value="emea">EMEA Region</option>
                <option value="europe">Europe Friendly</option>
                <option value="us_only">US Only</option>
                <option value="timezone_flexible">Timezone Flexible</option>
              </select>
            </div>

            {/* Seniority */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Seniority Level</label>
              <select
                value={selectedSeniority}
                onChange={e => setSelectedSeniority(e.target.value)}
                className="w-full h-9 px-2 rounded-md border border-input bg-background text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="all">All Seniorities</option>
                <option value="entry_level">Entry Level / Grad</option>
                <option value="junior">Junior</option>
                <option value="mid">Mid Level</option>
                <option value="senior">Senior</option>
                <option value="lead">Lead / Manager</option>
                <option value="internship">Internship</option>
              </select>
            </div>

            {/* Salary Filters */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Salary Period</label>
              <select
                value={salaryPeriod}
                onChange={e => setSalaryPeriod(e.target.value)}
                className="w-full h-9 px-2 rounded-md border border-input bg-background text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="all">All Periods</option>
                <option value="hourly">Hourly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            {/* Min Salary Rate & Has Salary checkbox */}
            <div className="space-y-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Min Salary Rate</label>
                <Input
                  type="number"
                  placeholder="Min amount"
                  value={minSalary || ''}
                  onChange={e => setMinSalary(e.target.value ? Number(e.target.value) : undefined)}
                  className="h-9 text-xs bg-background"
                />
              </div>
              <div className="flex items-center gap-1.5 pt-1">
                <input
                  type="checkbox"
                  id="salary-checkbox"
                  checked={hasSalaryOnly}
                  onChange={e => setHasSalaryOnly(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-primary focus:ring-primary border-border"
                />
                <label htmlFor="salary-checkbox" className="text-[11px] font-medium text-muted-foreground select-none cursor-pointer">
                  Has trusted/parsed salary
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content State Handling */}
      {!isSynced && !isLoading && (
        <div className="p-8 text-center rounded-2xl border border-dashed border-border/80 bg-card space-y-3">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            {t('remoteJobs.unsyncedTitle', 'Jobs feed is not synced yet')}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {t('remoteJobs.unsyncedDesc', 'The Appwrite serverless job ingestion engine is setting up. Jobs will appear automatically after the initial feed sync.')}
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-card border border-border/60 animate-pulse p-5 space-y-4">
              <div className="h-6 w-3/4 bg-muted rounded" />
              <div className="h-4 w-1/2 bg-muted rounded" />
              <div className="h-12 w-full bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : jobs.length === 0 && isSynced ? (
        <div className="p-12 text-center rounded-2xl border border-border/60 bg-card space-y-3">
          <Briefcase className="w-8 h-8 text-muted-foreground mx-auto" />
          <h3 className="text-base font-semibold text-foreground">
            {t('remoteJobs.noJobsFound', 'No remote jobs found matching your filters')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t('remoteJobs.tryChangingFilters', 'Try selecting another role category or clearing your search query.')}
          </p>
          <Button variant="outline" size="sm" onClick={() => { setSearchQuery(''); setSelectedSource('all'); setSelectedRoleGroup('all'); }}>
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs.map(job => {
            const itemId = job.$id || job.dedupe_key;
            const action = userActions.get(itemId);
            const isSaved = action?.status === 'saved';
            const isApplied = action?.status === 'applied';
            const isTailored = action?.status === 'tailored' || action?.status === 'ready_to_apply';
            const formattedDate = formatDate(job.published_at);
            const isConfirming = confirmingAppliedJobId === itemId;

            return (
              <div
                key={itemId}
                className={`group relative flex flex-col justify-between rounded-xl border p-5 transition-all hover:shadow-md ${
                  isApplied
                    ? 'bg-emerald-500/5 border-emerald-500/30'
                    : isTailored
                    ? 'bg-amber-500/5 border-amber-500/30'
                    : 'bg-card border-border/60 hover:border-primary/40'
                }`}
              >
                <div className="space-y-3">
                  {/* Top line: Source badge, Role Group & Date */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {formatSourceBadge(job.source)}
                      {job.role_group === 'easy_entry_level' && (
                        <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 font-medium">
                          Easy / Entry Level
                        </Badge>
                      )}
                      {job.seniority_level && job.seniority_level !== 'all' && (
                        <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-border bg-slate-900/5 dark:bg-slate-100/5">
                          {job.seniority_level.replace('_', ' ')}
                        </Badge>
                      )}
                      {isTailored && (
                        <Badge variant="secondary" className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20 font-semibold text-[10px] py-0.5">
                          Tailored
                        </Badge>
                      )}
                      {job.category && (
                        <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {job.category}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {formattedDate && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formattedDate}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-7 w-7 ${isSaved ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground'}`}
                        onClick={() => void handleToggleSave(job, isSaved)}
                        title={isSaved ? 'Remove from saved' : 'Save job'}
                      >
                        <Bookmark className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Job title & company */}
                  <div>
                    <h2 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {job.title}
                    </h2>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                      {job.company}
                    </p>
                  </div>

                  {/* Location & Salary Info */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-medium pt-1">
                    <span className="flex items-center gap-1 bg-secondary/60 px-2 py-1 rounded-md">
                      <MapPin className="w-3 h-3 text-primary shrink-0" />
                      {job.location || job.remote_region || 'Remote'}
                    </span>

                    <span className={`flex items-center gap-1 px-2 py-1 rounded-md ${
                      job.salary_display && job.salary_display !== 'Salary not listed'
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold'
                        : 'bg-secondary/60 text-muted-foreground'
                    }`}>
                      <DollarSign className="w-3 h-3 shrink-0" />
                      {job.salary_display || 'Salary not listed'}
                    </span>
                  </div>

                  {/* Description Excerpt */}
                  {job.description_excerpt && (
                    <p className="text-xs text-muted-foreground/90 line-clamp-3 leading-relaxed border-t border-border/40 pt-2.5">
                      {job.description_excerpt}
                    </p>
                  )}
                </div>

                {/* Actions Bar */}
                <div className="pt-4 mt-4 border-t border-border/60 space-y-2">
                  {/* Inline Confirmation Prompt if applied link was clicked */}
                  {isConfirming && (
                    <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between gap-2 animate-in fade-in slide-in-from-bottom-1">
                      <span className="text-xs font-semibold text-[#9E1B22] flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        Did you apply on their site?
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          className="h-7 px-2.5 text-xs bg-[#9E1B22] text-white hover:bg-[#80141a]"
                          onClick={() => void handleMarkApplied(job)}
                        >
                          Yes, mark applied
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => setConfirmingAppliedJobId(null)}
                        >
                          Not yet
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleApplyClick(job)}
                      className="bg-[#9E1B22] hover:bg-[#80141a] text-white gap-1.5 text-xs font-medium"
                    >
                      {isApplied ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Already applied
                        </>
                      ) : (
                        <>
                          Apply on website
                          <ExternalLink className="w-3.5 h-3.5" />
                        </>
                      )}
                    </Button>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleFastTailor(job)}
                        className="bg-amber-500 hover:bg-amber-600 text-slate-950 gap-1.5 text-xs font-bold shadow-sm"
                        disabled={isTailoring}
                      >
                        <Wand2 className="w-3.5 h-3.5 text-slate-950 animate-pulse" />
                        Fast Tailor
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTailorClick(job)}
                        className="gap-1 px-2.5 text-xs font-medium text-foreground hover:border-primary/50"
                        title="Configure tailoring options"
                        disabled={isTailoring}
                      >
                        Configure Hub
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tailoring Progress Overlay */}
      {isTailoring && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border/80 p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="relative w-16 h-16 mx-auto">
              <Loader2 className="w-16 h-16 animate-spin text-primary" />
              <Wand2 className="w-6 h-6 text-[#9E1B22] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-bounce" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Generating Tailoring Package</h3>
            <p className="text-sm text-[#9E1B22] font-semibold animate-pulse">{tailorProgress}</p>
            <div className="pt-2">
              <p className="text-xs text-muted-foreground italic">
                Our AI agents are analyzing the remote job description, aligning your achievements, and generating a customized cover letter...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Resume Picker Dialog */}
      <Dialog open={showResumePickerDialog} onOpenChange={setShowResumePickerDialog}>
        <DialogContent className="max-w-md p-6 bg-card border border-border/80 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">Select Resume for Fast Tailoring</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Select which resume to use as the base for aggressive tailoring.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 mt-4 max-h-[300px] overflow-y-auto">
            {resumes.map(r => {
              const isSelected = selectedResumeId === r.$id;
              return (
                <button
                  key={r.$id}
                  onClick={() => setSelectedResumeId(r.$id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-[#9E1B22] bg-[#9E1B22]/5 text-foreground font-semibold'
                      : 'border-border hover:border-primary/50 text-muted-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#9E1B22]" />
                    <span className="text-sm truncate">{r.title}</span>
                  </div>
                  {r.is_master && (
                    <Badge variant="outline" className="bg-[#9E1B22]/10 text-[#9E1B22] border-none text-[10px] py-0">
                      Master CV
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 pt-4 border-t border-border/40 mt-4">
            <input
              type="checkbox"
              id="make-default-cv"
              checked={makeDefaultResume}
              onChange={e => setMakeDefaultResume(e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary border-border"
            />
            <label htmlFor="make-default-cv" className="text-xs font-semibold text-foreground select-none cursor-pointer">
              Make this my default resume for Fast Tailor
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 mt-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowResumePickerDialog(false);
                setActiveJobForTailoring(null);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-[#9E1B22] hover:bg-[#80141a] text-white font-bold"
              disabled={!selectedResumeId}
              onClick={() => {
                const r = resumes.find(res => res.$id === selectedResumeId);
                if (r && activeJobForTailoring) {
                  void executeFastTailorFlow(r, activeJobForTailoring);
                }
              }}
            >
              Confirm & Tailor
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
