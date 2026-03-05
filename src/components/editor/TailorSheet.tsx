import { useState, useMemo, useCallback, useRef, useEffect, memo } from 'react';
import { 
  Wand2, Loader2, CheckCircle, ArrowRight, Undo2, GitCompare, 
  History, FileText, Sparkles, ChevronRight, Brain, Target, BarChart3,
  Zap, Gauge, Flame, AlertTriangle, HeartHandshake, Key, RefreshCw, Bug, X, Settings
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useResumeStore } from '@/store/resumeStore';
import { tailorResumeWithProgress, TailorIntensity, TailorError } from '@/lib/aiTailor';
import { toast } from 'sonner';
import { CompareSheet } from './CompareSheet';
import { TailorProgressComponent } from './tailor/TailorProgress';
import { SectionChangeCard } from './tailor/SectionChangeCard';
import { SkillSuggestionList } from './tailor/SkillSuggestionList';
import { ScoreComparison } from './tailor/ScoreComparison';
import { TailorHistorySheet } from './tailor/TailorHistorySheet';
import { CoverLetterGenerator } from './tailor/CoverLetterGenerator';
import { AICostBadge } from '@/components/ai/AICostBadge';
import { JobUrlParser } from './tailor/JobUrlParser';
import { JobIntelligenceCard } from './tailor/JobIntelligenceCard';
import { InterviewPrepCard } from './tailor/InterviewPrepCard';
import { BulletComparison } from './tailor/BulletComparison';
import { SmartSkillSuggestions } from './tailor/SmartSkillSuggestions';
import { MultiJobCompareSheet } from './tailor/MultiJobCompareSheet';
import { KeywordHeatmap } from './tailor/KeywordHeatmap';
import { QuickActions } from './tailor/QuickActions';
import { AISettingsSheet } from '@/components/settings/AISettingsSheet';
import { reportBug } from '@/lib/bugReport';
import { useAIAction } from '@/hooks/useAIAction';
import { activityTracker } from '@/lib/activityTracker';
import haptics from '@/lib/haptics';

import { AITrustBadge } from '@/components/ui/AITrustBadge';
import { AIProviderVia } from '@/components/editor/ai/AIProviderBadge';
import { useResumeMutations, resumeDataToDb, useResumes, dbToResumeData, DatabaseResume } from '@/hooks/useResumes';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/safeClient';
import { 
  EnhancedTailorResult, 
  TailorProgress, 
  TailorSectionId,
  ResumeData,
  SuperTailorResult,
  EnhancedTailorProgress
} from '@/types/resume';
import { cn } from '@/lib/utils';
import { useShallow } from 'zustand/react/shallow';
import { Json } from '@/integrations/supabase/types';

interface TailorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplied?: (info: { title: string; company: string; resumeId?: string; jobUrl?: string }) => void;
}

const SECTION_LABELS: Record<TailorSectionId, string> = {
  summary: 'Summary',
  skills: 'Skills',
  experience: 'Experience',
  education: 'Education',
  projects: 'Projects',
  certifications: 'Certifications',
  awards: 'Awards',
};

const TAB_CONFIG = [
  { id: 'changes', label: 'Changes', icon: CheckCircle },
  { id: 'intelligence', label: 'Intel', icon: Brain },
  { id: 'skills', label: 'Skills', icon: Target },
  { id: 'interview', label: 'Prep', icon: Sparkles },
] as const;

const TAILOR_CACHE_KEY = (id: string) => `wr-tailor-cache-${id}`;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface TailorCache {
  tailorResult: SuperTailorResult;
  originalResume: ResumeData;
  jobDescription: string;
  parsedJobInfo: { title: string; company: string } | null;
  intensity: TailorIntensity;
  jobUrl: string | null;
  timestamp: number;
}

function loadCache(resumeId: string | null): TailorCache | null {
  if (!resumeId) return null;
  try {
    const raw = localStorage.getItem(TAILOR_CACHE_KEY(resumeId));
    if (!raw) return null;
    const cache: TailorCache = JSON.parse(raw);
    if (Date.now() - cache.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(TAILOR_CACHE_KEY(resumeId));
      return null;
    }
    return cache;
  } catch { return null; }
}

function saveCache(resumeId: string | null, data: Omit<TailorCache, 'timestamp'>) {
  if (!resumeId) return;
  try {
    localStorage.setItem(TAILOR_CACHE_KEY(resumeId), JSON.stringify({ ...data, timestamp: Date.now() }));
  } catch { /* quota exceeded – ignore */ }
}

function clearCache(resumeId: string | null) {
  if (!resumeId) return;
  localStorage.removeItem(TAILOR_CACHE_KEY(resumeId));
}

export const TailorSheet = memo(function TailorSheet({ open, onOpenChange, onApplied }: TailorSheetProps) {
  const { user } = useAuth();
  const { 
    currentResume, 
    currentResumeId,
    jobDescription, 
    setJobDescription,
    updateResume,
    tailorHistory,
    addTailorHistory,
    clearTailorHistory,
    restoreTailorVersion,
    currentComparison,
    startNewComparison,
    addJobToComparison,
    setCurrentResumeId,
    setCurrentResume,
    pendingTailorResult,
    pendingTailorOriginal,
    pendingTailorJobInfo,
    pendingTailorSections,
    pendingTailorIntensity,
    pendingTailorJobUrl,
    setPendingTailor,
    clearPendingTailor,
  } = useResumeStore(useShallow(state => ({
    currentResume: state.currentResume,
    currentResumeId: state.currentResumeId,
    jobDescription: state.jobDescription,
    setJobDescription: state.setJobDescription,
    updateResume: state.updateResume,
    tailorHistory: state.tailorHistory,
    addTailorHistory: state.addTailorHistory,
    clearTailorHistory: state.clearTailorHistory,
    restoreTailorVersion: state.restoreTailorVersion,
    currentComparison: state.currentComparison,
    startNewComparison: state.startNewComparison,
    addJobToComparison: state.addJobToComparison,
    setCurrentResumeId: state.setCurrentResumeId,
    setCurrentResume: state.setCurrentResume,
    pendingTailorResult: state.pendingTailorResult,
    pendingTailorOriginal: state.pendingTailorOriginal,
    pendingTailorJobInfo: state.pendingTailorJobInfo,
    pendingTailorSections: state.pendingTailorSections,
    pendingTailorIntensity: state.pendingTailorIntensity,
    pendingTailorJobUrl: state.pendingTailorJobUrl,
    setPendingTailor: state.setPendingTailor,
    clearPendingTailor: state.clearPendingTailor,
  })));

  const { data: allResumes } = useResumes();
  const [tipsDismissed, setTipsDismissed] = useState(() => localStorage.getItem('wr-tailor-tips-seen') === 'true');

  const [isTailoring, setIsTailoring] = useState(false);
  const [tailorResult, setTailorResult] = useState<SuperTailorResult | null>(null);
  const [originalResume, setOriginalResume] = useState<ResumeData | null>(null);
  const [progress, setProgress] = useState<TailorProgress | EnhancedTailorProgress | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showCoverLetter, setShowCoverLetter] = useState(false);
  const [parsedJobInfo, setParsedJobInfo] = useState<{ title: string; company: string } | null>(null);
  const [activeTab, setActiveTab] = useState<string>('changes');
  const [showMultiCompare, setShowMultiCompare] = useState(false);
  const [isAddingToComparison, setIsAddingToComparison] = useState(false);
  const [intensity, setIntensity] = useState<TailorIntensity>('moderate');
  const [isApplying, setIsApplying] = useState(false);
  const [jobUrl, setJobUrl] = useState<string | undefined>(undefined);
  const autoTailorTriggered = useRef(false);

  useEffect(() => {
    if (open) { activityTracker.setActiveFeature('Smart Tailor'); }
    return () => { activityTracker.setActiveFeature(null); };
  }, [open]);
  const abortRef = useRef<AbortController | null>(null);
  const [tailorError, setTailorError] = useState<{ message: string; code?: string } | null>(null);
  const [showAISettings, setShowAISettings] = useState(false);
  const [showCacheRestore, setShowCacheRestore] = useState(false);
  const cachedDataRef = useRef<TailorCache | null>(null);

  // Section toggles
  const [enabledSections, setEnabledSections] = useState<TailorSectionId[]>([
    'summary', 'skills', 'experience', 'education', 'projects', 'certifications', 'awards'
  ]);

  const toggleSection = (sectionId: TailorSectionId) => {
    setEnabledSections(prev => 
      prev.includes(sectionId)
        ? prev.filter(s => s !== sectionId)
        : [...prev, sectionId]
    );
  };

  const { execute: executeAI } = useAIAction({ operation: 'tailor' });

  // Hydrate from Zustand or localStorage on open
  useEffect(() => {
    if (!open) return;
    
    // Priority 1: Zustand pending state
    if (pendingTailorResult && pendingTailorOriginal) {
      setTailorResult(pendingTailorResult);
      setOriginalResume(pendingTailorOriginal);
      setParsedJobInfo(pendingTailorJobInfo);
      setEnabledSections(pendingTailorSections);
      setIntensity(pendingTailorIntensity);
      if (pendingTailorJobUrl) setJobUrl(pendingTailorJobUrl);
      return;
    }
    
    // Priority 2: localStorage cache
    const cache = loadCache(currentResumeId);
    if (cache) {
      cachedDataRef.current = cache;
      setShowCacheRestore(true);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRestoreCache = useCallback(() => {
    const cache = cachedDataRef.current;
    if (!cache) return;
    setTailorResult(cache.tailorResult);
    setOriginalResume(cache.originalResume);
    setJobDescription(cache.jobDescription);
    setParsedJobInfo(cache.parsedJobInfo);
    setIntensity(cache.intensity);
    if (cache.jobUrl) setJobUrl(cache.jobUrl);
    setShowCacheRestore(false);
    cachedDataRef.current = null;
  }, [setJobDescription]);

  const handleTailor = useCallback(async () => {
    if (!jobDescription.trim()) {
      toast.error('Please paste a job description first');
      return;
    }

    if (!currentResume) {
      toast.error('No resume to tailor');
      return;
    }

    setTailorError(null);
    setIsTailoring(true);
    setOriginalResume(currentResume);
    setProgress({ step: 'analyzing', progress: 5, message: 'Starting...' });
    setEnabledSections(['summary', 'skills', 'experience', 'education', 'projects', 'certifications', 'awards']);
    setActiveTab('changes');

    abortRef.current = new AbortController();

    try {
      const result = await executeAI(async () => {
        return await tailorResumeWithProgress(
          currentResume, 
          jobDescription,
          (p) => setProgress(p),
          intensity,
          abortRef.current!.signal
        );
      });

      if (!result) return;

      const superResult = result as SuperTailorResult;
      setTailorResult(superResult);
      
      const jobInfo = superResult.jobParsed ? {
        title: superResult.jobParsed.title,
        company: superResult.jobParsed.company,
      } : null;
      
      if (jobInfo) setParsedJobInfo(jobInfo);

      // Persist to Zustand
      setPendingTailor({
        result: superResult,
        original: currentResume,
        jobInfo,
        sections: ['summary', 'skills', 'experience', 'education', 'projects', 'certifications', 'awards'],
        intensity,
        jobUrl: jobUrl || null,
      });

      // Auto-save to localStorage
      saveCache(currentResumeId, {
        tailorResult: superResult,
        originalResume: currentResume,
        jobDescription,
        parsedJobInfo: jobInfo,
        intensity,
        jobUrl: jobUrl || null,
      });
    } catch (error) {
      console.error('Tailor error:', error);
      const err = error as TailorError;
      const code = err.code || 'generic';
      if (err.message?.includes('Unauthorized') || err.message?.includes('log in')) {
        toast.error(err.message);
      } else {
        setTailorError({ message: err.message || 'Failed to tailor resume', code });
      }
    } finally {
      setIsTailoring(false);
      setProgress(null);
    }
  }, [jobDescription, currentResume, intensity, executeAI, setPendingTailor, currentResumeId, jobUrl]);

  // Auto-tailor when a URL is parsed
  const handleParsedJobInfo = useCallback((info: { title: string; company: string; url?: string } | null) => {
    setParsedJobInfo(info);
    if (info?.url) setJobUrl(info.url);
    if (info && jobDescription.trim() && currentResume && !autoTailorTriggered.current) {
      autoTailorTriggered.current = true;
      toast.info('Auto-tailoring your resume...', { duration: 2000 });
      setTimeout(() => handleTailor(), 500);
    }
  }, [jobDescription, currentResume, handleTailor]);

  useEffect(() => {
    if (open) {
      autoTailorTriggered.current = false;
    }
  }, [open]);

  const resumeText = useMemo(() => {
    if (!currentResume) return '';
    const parts = [
      currentResume.summary,
      ...currentResume.experience.map(e => `${e.position} ${e.company} ${e.description} ${e.achievements.join(' ')}`),
      ...currentResume.education.map(e => `${e.degree} ${e.field} ${e.institution}`),
      ...currentResume.skills,
    ];
    return parts.join(' ');
  }, [currentResume]);

  const handleUpdateTailorResult = useCallback((updated: Partial<SuperTailorResult>) => {
    setTailorResult(prev => {
      if (!prev) return null;
      const next = { ...prev, ...updated };
      // Sync to Zustand + cache
      if (originalResume) {
        setPendingTailor({
          result: next,
          original: originalResume,
          jobInfo: parsedJobInfo,
          sections: enabledSections,
          intensity,
          jobUrl: jobUrl || null,
        });
        saveCache(currentResumeId, {
          tailorResult: next,
          originalResume,
          jobDescription,
          parsedJobInfo,
          intensity,
          jobUrl: jobUrl || null,
        });
      }
      return next;
    });
  }, [originalResume, parsedJobInfo, enabledSections, intensity, jobUrl, currentResumeId, jobDescription, setPendingTailor]);

  const handleEditSection = useCallback((sectionId: TailorSectionId, newValue: string | string[]) => {
    if (!tailorResult) return;
    if (sectionId === 'summary' && typeof newValue === 'string') {
      handleUpdateTailorResult({ summary: newValue });
    } else if (sectionId === 'skills' && Array.isArray(newValue)) {
      handleUpdateTailorResult({ skills: newValue });
    }
    // Note: projects, certifications, and awards are array-based sections
    // and don't support inline text editing via this handler
  }, [tailorResult, handleUpdateTailorResult]);

  // Auto-create tailored CV as new resume in DB
  const handleApplyChanges = useCallback(async () => {
    if (!tailorResult || !currentResume || !user) return;

    setIsApplying(true);

    try {
      const mergedResume: ResumeData = { ...currentResume };
      
      if (enabledSections.includes('summary')) {
        mergedResume.summary = tailorResult.summary;
      }
      if (enabledSections.includes('skills')) {
        mergedResume.skills = tailorResult.skills;
      }
      if (enabledSections.includes('experience')) {
        mergedResume.experience = tailorResult.experience.map((exp, index) => ({
          ...currentResume.experience[index],
          ...exp,
        }));
      }
      if (enabledSections.includes('education')) {
        mergedResume.education = tailorResult.education.map((edu, index) => ({
          ...currentResume.education[index],
          ...edu,
        }));
      }
      if (enabledSections.includes('projects') && tailorResult.projects) {
        mergedResume.projects = tailorResult.projects;
      }
      if (enabledSections.includes('certifications') && tailorResult.certifications) {
        mergedResume.certifications = tailorResult.certifications;
      }
      if (enabledSections.includes('awards') && tailorResult.awards) {
        mergedResume.awards = tailorResult.awards;
      }

      const jobTitle = parsedJobInfo?.title || tailorResult.jobParsed?.title || 'Position';
      const company = parsedJobInfo?.company || tailorResult.jobParsed?.company || 'Company';
      const originalTitle = currentResume.contactInfo.fullName || 'Resume';
      const newTitle = `${originalTitle} - Tailored for ${jobTitle} @ ${company}`;

      const { data: newResume, error } = await supabase
        .from('resumes')
        .insert({
          user_id: user.id,
          title: newTitle,
          contact_info: mergedResume.contactInfo as unknown as Json,
          summary: mergedResume.summary,
          experience: mergedResume.experience as unknown as Json,
          education: mergedResume.education as unknown as Json,
          skills: mergedResume.skills as unknown as Json,
          certifications: mergedResume.certifications as unknown as Json,
          projects: mergedResume.projects as unknown as Json,
          awards: mergedResume.awards as unknown as Json,
          template_id: mergedResume.templateId,
          parent_resume_id: currentResumeId,
          target_job_title: jobTitle,
          target_company: company,
          job_match_score: tailorResult.overallScore?.after ?? 0,
          job_url: jobUrl || null,
        })
        .select()
        .single();

      if (error) throw error;

      addTailorHistory({
        jobTitle,
        company,
        jobDescription,
        tailorResult,
        scoreBeforeAfter: tailorResult.overallScore ?? { before: 0, after: 0 },
        appliedSections: enabledSections,
      }, currentResumeId || undefined);

      toast.success('🎉 Tailored resume created! Original preserved.', { duration: 4000 });

      const jt = parsedJobInfo?.title || tailorResult.jobParsed?.title || 'Position';
      const co = parsedJobInfo?.company || tailorResult.jobParsed?.company || 'Company';
      onApplied?.({ title: jt, company: co, resumeId: newResume?.id, jobUrl });

      setTailorResult(null);
      clearPendingTailor();
      clearCache(currentResumeId);
      onOpenChange(false);
    } catch (error) {
      console.error('Apply error:', error);
      toast.error('Failed to create tailored resume');
    } finally {
      setIsApplying(false);
    }
  }, [tailorResult, currentResume, user, enabledSections, parsedJobInfo, currentResumeId, jobDescription, addTailorHistory, onOpenChange, clearPendingTailor, jobUrl, onApplied]);

  const handleStartComparison = () => {
    if (!tailorResult || !currentResume?.id) return;
    
    startNewComparison(currentResume.id, {
      jobTitle: parsedJobInfo?.title || tailorResult.jobParsed?.title || 'Position',
      company: parsedJobInfo?.company || tailorResult.jobParsed?.company || 'Company',
      jobDescription,
      tailorResult,
    });
    
    setTailorResult(null);
    setJobDescription('');
    setParsedJobInfo(null);
    setIsAddingToComparison(true);
    toast.success('Added to comparison. Now add another job!');
  };

  const handleAddToComparison = () => {
    if (!tailorResult) return;
    
    addJobToComparison({
      jobTitle: parsedJobInfo?.title || tailorResult.jobParsed?.title || 'Position',
      company: parsedJobInfo?.company || tailorResult.jobParsed?.company || 'Company',
      jobDescription,
      tailorResult,
    });
    
    setShowMultiCompare(true);
    setIsAddingToComparison(false);
    setTailorResult(null);
    setJobDescription('');
    setParsedJobInfo(null);
  };

  const handleOpenCompare = () => {
    setShowMultiCompare(true);
  };

  const handleAddJobFromCompare = () => {
    setShowMultiCompare(false);
    setIsAddingToComparison(true);
    setTailorResult(null);
    setJobDescription('');
    setParsedJobInfo(null);
  };

  const handleRevert = () => {
    if (originalResume) {
      updateResume(originalResume);
      toast.info('Reverted to original resume');
    }
    setTailorResult(null);
    setProgress(null);
    clearPendingTailor();
    clearCache(currentResumeId);
  };

  const handleAddSkill = (skill: string) => {
    if (!currentResume) return;
    const newSkills = [...currentResume.skills, skill];
    updateResume({ skills: newSkills });
    toast.success(`Added "${skill}" to your skills`);
  };

  const handleBoostSkill = (skill: string) => {
    if (!currentResume) return;
    const newSkills = [skill, ...currentResume.skills.filter(s => s !== skill)];
    updateResume({ skills: newSkills });
    toast.success(`Moved "${skill}" to the top`);
  };

  const handleAddAllSkills = () => {
    if (!tailorResult || !currentResume) return;
    const newSkills = [
      ...tailorResult.missingSkills.map(s => s.skill),
      ...currentResume.skills,
    ];
    updateResume({ skills: newSkills });
    toast.success(`Added ${tailorResult.missingSkills.length} skills`);
  };

  const handleRestoreVersion = (id: string) => {
    restoreTailorVersion(id);
    toast.success('Restored previous version');
  };

  const effectiveScore = useMemo(() => {
    if (!tailorResult || !tailorResult.overallScore) return null;
    const before = tailorResult.overallScore.before;
    const maxImprovement = tailorResult.overallScore.after - before;
    const totalSections = 7;
    const sectionWeight = enabledSections.length / totalSections;
    return Math.round(before + (maxImprovement * sectionWeight));
  }, [tailorResult, enabledSections]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[92vh] rounded-t-3xl flex flex-col">
        <SheetHeader className="pb-4 shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-primary" />
              AI Resume Tailor
              <AICostBadge operation="tailor" />
            </SheetTitle>
            <div className="flex items-center gap-1 mr-8">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowAISettings(true)}
                className="text-muted-foreground"
              >
                <Settings className="w-4 h-4" />
              </Button>
              {tailorHistory.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowHistory(true)}
                >
                  <History className="w-4 h-4 mr-1" />
                  History
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="overflow-y-auto flex-1 space-y-4 pb-4">
          <AITrustBadge className="mx-0" />

          {/* Cache restore banner */}
          {showCacheRestore && !tailorResult && !isTailoring && (
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-between gap-3 animate-fade-in">
              <p className="text-sm text-foreground">
                ✨ You have unsaved tailor results. Restore?
              </p>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => setShowCacheRestore(false)} className="min-h-[44px] active:scale-95 transition-transform">
                  Dismiss
                </Button>
                <Button size="sm" onClick={handleRestoreCache} className="min-h-[44px] active:scale-95 transition-transform">
                  Restore
                </Button>
              </div>
            </div>
          )}

          {/* Tailoring Progress */}
          {isTailoring && progress && (
            <TailorProgressComponent
              progress={progress}
              projectedScore={tailorResult?.overallScore}
              matchingKeywords={tailorResult?.missingSkills?.length}
              onCancel={() => {
                abortRef.current?.abort();
                setIsTailoring(false);
                setProgress(null);
                toast.info('Generation cancelled');
              }}
            />
          )}

          {/* Inline Error Card */}
          {tailorError && !isTailoring && (
            <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-4 animate-fade-in">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                    <HeartHandshake className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">We've Got Your Back</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {tailorError.code === 'rate_limit'
                        ? 'Our AI servers are experiencing high demand. This is temporary.'
                        : tailorError.code === 'credits_exhausted'
                        ? 'Your daily AI credits have been used up.'
                        : "Something went wrong, but we're on it."}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setTailorError(null)}
                  className="text-muted-foreground hover:text-foreground p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-muted-foreground">
                {tailorError.message}
              </p>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => { setTailorError(null); handleTailor(); }} className="min-h-[44px] active:scale-95 transition-transform">
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                  Try Again
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowAISettings(true)} className="min-h-[44px] active:scale-95 transition-transform">
                  <Key className="w-4 h-4 mr-1.5" />
                  Use Your Own Key
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => reportBug(new Error(tailorError.message), 'Tailor resume failed')}
                  className="min-h-[44px] active:scale-95 transition-transform text-muted-foreground"
                >
                  <Bug className="w-4 h-4 mr-1.5" />
                  Report
                </Button>
              </div>

              <p className="text-xs text-muted-foreground/70 italic">
                💡 Tip: Adding your own Gemini API key gives you unlimited, uninterrupted access
              </p>
            </div>
          )}

          {/* Results */}
          {tailorResult && !isTailoring && (
            <div className="space-y-4 animate-fade-in">
              {/* Success Header with Re-tailor */}
              <div className="p-4 rounded-xl bg-success/10 border border-success/30 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-success/5 via-transparent to-success/5 animate-[shimmer_3s_infinite]" />
                <div className="relative flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-success animate-pulse" />
                    <h4 className="font-semibold">🎉 Resume Tailored!</h4>
                  </div>
                  {/* Quick Re-tailor */}
                  <div className="flex items-center gap-1.5">
                    <ToggleGroup
                      type="single"
                      value={intensity}
                      onValueChange={(val) => { if (val) { setIntensity(val as TailorIntensity); haptics.selection(); } }}
                      className="min-h-[44px]"
                    >
                      <ToggleGroupItem value="light" className="text-[10px] min-h-[44px] px-2.5">
                        <Zap className="w-3 h-3" />
                      </ToggleGroupItem>
                      <ToggleGroupItem value="moderate" className="text-[10px] min-h-[44px] px-2.5">
                        <Gauge className="w-3 h-3" />
                      </ToggleGroupItem>
                      <ToggleGroupItem value="aggressive" className="text-[10px] min-h-[44px] px-2.5">
                        <Flame className="w-3 h-3" />
                      </ToggleGroupItem>
                    </ToggleGroup>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="min-h-[44px] text-xs px-2 active:scale-95 transition-transform"
                      onClick={() => { haptics.light(); handleTailor(); }}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Re-tailor
                    </Button>
                  </div>
                </div>
                <p className="relative text-sm text-muted-foreground">
                  Review changes below. A new tailored copy will be created — your original stays safe.
                </p>
              </div>

              {/* Manual Tabs */}
              <div className="flex rounded-lg bg-muted/50 p-1 gap-1">
                {TAB_CONFIG.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1 py-2 px-2 rounded-md text-xs font-medium transition-all duration-200 min-h-[44px]',
                      activeTab === id
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {activeTab === 'changes' && (
                <div className="space-y-4">
                  {/* Score Comparison */}
                  {tailorResult.overallScore && tailorResult.sectionScores ? (
                    <ScoreComparison
                      beforeScore={tailorResult.overallScore.before}
                      afterScore={tailorResult.overallScore.after}
                      sectionScores={tailorResult.sectionScores}
                      selectedSections={enabledSections}
                    />
                  ) : (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Score couldn't be calculated</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Our servers are experiencing high demand right now. Your tailored content is 100% valid — only the score couldn't be calculated.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="text-xs min-h-[44px] active:scale-95 transition-transform" onClick={handleTailor}>
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Retry Score
                        </Button>
                        <Button size="sm" variant="ghost" className="text-xs min-h-[44px] active:scale-95 transition-transform" onClick={() => setShowAISettings(true)}>
                          <Key className="w-3 h-3 mr-1" />
                          Use Your Own Key
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Section Changes */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      Select Changes to Apply
                    </h4>

                    <SectionChangeCard
                      sectionId="summary"
                      title={SECTION_LABELS.summary}
                      enabled={enabledSections.includes('summary')}
                      onToggle={() => toggleSection('summary')}
                      impactScore={tailorResult.sectionScores ? tailorResult.sectionScores.summary.after - tailorResult.sectionScores.summary.before : 0}
                      changesSummary="Professional summary rewritten"
                      originalText={originalResume?.summary || ''}
                      tailoredText={tailorResult.summary}
                      onEdit={handleEditSection}
                      preview={
                        <p className="text-muted-foreground leading-relaxed">
                          {tailorResult.summary}
                        </p>
                      }
                    />

                    <SectionChangeCard
                      sectionId="skills"
                      title={SECTION_LABELS.skills}
                      enabled={enabledSections.includes('skills')}
                      onToggle={() => toggleSection('skills')}
                      impactScore={tailorResult.sectionScores ? tailorResult.sectionScores.skills.after - tailorResult.sectionScores.skills.before : 0}
                      changesSummary={`${tailorResult.skills.length} skills optimized`}
                      originalSkills={originalResume?.skills || []}
                      tailoredSkills={tailorResult.skills}
                      onEdit={handleEditSection}
                      preview={
                        <div className="flex flex-wrap gap-2">
                          {tailorResult.skills.slice(0, 10).map((skill, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {tailorResult.skills.length > 10 && (
                            <Badge variant="outline" className="text-xs">
                              +{tailorResult.skills.length - 10} more
                            </Badge>
                          )}
                        </div>
                      }
                    />

                    <SectionChangeCard
                      sectionId="experience"
                      title={SECTION_LABELS.experience}
                      enabled={enabledSections.includes('experience')}
                      onToggle={() => toggleSection('experience')}
                      impactScore={tailorResult.sectionScores ? tailorResult.sectionScores.experience.after - tailorResult.sectionScores.experience.before : 0}
                      changesSummary={`${tailorResult.experience.length} positions enhanced`}
                      preview={
                        <ul className="space-y-2">
                          {tailorResult.experience.slice(0, 2).map((exp, i) => (
                            <li key={i} className="text-muted-foreground">
                              <span className="font-medium text-foreground">{exp.position}</span>
                              <span className="text-xs"> @ {exp.company}</span>
                            </li>
                          ))}
                        </ul>
                      }
                    />

                    <SectionChangeCard
                      sectionId="education"
                      title={SECTION_LABELS.education}
                      enabled={enabledSections.includes('education')}
                      onToggle={() => toggleSection('education')}
                      impactScore={tailorResult.sectionScores ? tailorResult.sectionScores.education.after - tailorResult.sectionScores.education.before : 0}
                      changesSummary={`${tailorResult.education.length} entries refined`}
                      preview={
                        <ul className="space-y-1">
                          {tailorResult.education.map((edu, i) => (
                            <li key={i} className="text-muted-foreground text-sm">
                              {edu.degree} in {edu.field} - {edu.institution}
                            </li>
                          ))}
                        </ul>
                      }
                    />

                    {/* Projects section */}
                    {tailorResult.projects && tailorResult.projects.length > 0 && (
                      <SectionChangeCard
                        sectionId="projects"
                        title={SECTION_LABELS.projects}
                        enabled={enabledSections.includes('projects')}
                        onToggle={() => toggleSection('projects')}
                        impactScore={tailorResult.sectionScores && (tailorResult.sectionScores as any).projects ? (tailorResult.sectionScores as any).projects.after - (tailorResult.sectionScores as any).projects.before : 5}
                        changesSummary={`${tailorResult.projects.length} projects optimized`}
                        preview={
                          <ul className="space-y-1">
                            {tailorResult.projects.map((p, i) => (
                              <li key={i} className="text-muted-foreground text-sm">
                                <span className="font-medium text-foreground">{p.name}</span>
                                <span className="text-xs"> — {p.role}</span>
                              </li>
                            ))}
                          </ul>
                        }
                      />
                    )}

                    {/* Certifications section */}
                    {tailorResult.certifications && tailorResult.certifications.length > 0 && (
                      <SectionChangeCard
                        sectionId="certifications"
                        title={SECTION_LABELS.certifications}
                        enabled={enabledSections.includes('certifications')}
                        onToggle={() => toggleSection('certifications')}
                        impactScore={tailorResult.sectionScores && (tailorResult.sectionScores as any).certifications ? (tailorResult.sectionScores as any).certifications.after - (tailorResult.sectionScores as any).certifications.before : 3}
                        changesSummary={`${tailorResult.certifications.length} certifications refined`}
                        preview={
                          <ul className="space-y-1">
                            {tailorResult.certifications.map((c, i) => (
                              <li key={i} className="text-muted-foreground text-sm">
                                {c.name} — {c.issuer}
                              </li>
                            ))}
                          </ul>
                        }
                      />
                    )}

                    {/* Awards section */}
                    {tailorResult.awards && tailorResult.awards.length > 0 && (
                      <SectionChangeCard
                        sectionId="awards"
                        title={SECTION_LABELS.awards}
                        enabled={enabledSections.includes('awards')}
                        onToggle={() => toggleSection('awards')}
                        impactScore={tailorResult.sectionScores && (tailorResult.sectionScores as any).awards ? (tailorResult.sectionScores as any).awards.after - (tailorResult.sectionScores as any).awards.before : 2}
                        changesSummary={`${tailorResult.awards.length} awards enhanced`}
                        preview={
                          <ul className="space-y-1">
                            {tailorResult.awards.map((a, i) => (
                              <li key={i} className="text-muted-foreground text-sm">
                                <span className="font-medium text-foreground">{a.title}</span>
                                <span className="text-xs"> — {a.issuer}</span>
                              </li>
                            ))}
                          </ul>
                        }
                      />
                    )}
                  </div>

                  {/* Bullet Transformations */}
                  {tailorResult.bulletTransformations && tailorResult.bulletTransformations.length > 0 && (
                    <BulletComparison transformations={tailorResult.bulletTransformations} />
                  )}

                  {/* Key Changes */}
                  {tailorResult.keyChanges && tailorResult.keyChanges.length > 0 && (
                    <div className="p-4 rounded-xl bg-card border border-border">
                      <h4 className="font-semibold text-sm mb-3">Key Improvements</h4>
                      <ul className="space-y-2">
                        {tailorResult.keyChanges.slice(0, 5).map((change, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <ChevronRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                            <span className="text-muted-foreground">{change}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'intelligence' && (
                <div className="space-y-4">
                  {tailorResult.jobIntelligence && (
                    <JobIntelligenceCard
                      jobIntelligence={tailorResult.jobIntelligence}
                      atsAnalysis={tailorResult.atsAnalysis}
                      strengthsAnalysis={tailorResult.strengthsAnalysis}
                      jobTitle={parsedJobInfo?.title || tailorResult.jobParsed?.title}
                      company={parsedJobInfo?.company || tailorResult.jobParsed?.company}
                    />
                  )}
                </div>
              )}

              {activeTab === 'skills' && (
                <div className="space-y-4">
                  <SmartSkillSuggestions
                    missingSkills={tailorResult.missingSkills || []}
                    boostableSkills={tailorResult.boostableSkills || []}
                    onAddSkill={handleAddSkill}
                    onBoostSkill={handleBoostSkill}
                    onAddAllCritical={handleAddAllSkills}
                  />
                </div>
              )}

              {activeTab === 'interview' && (
                <div className="space-y-4">
                  {tailorResult.interviewTalkingPoints && tailorResult.interviewTalkingPoints.length > 0 ? (
                    <InterviewPrepCard talkingPoints={tailorResult.interviewTalkingPoints} />
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-50" />
                      <p className="font-medium">Interview prep coming soon</p>
                      <p className="text-sm">Tailored interview questions will appear here</p>
                    </div>
                  )}
                </div>
              )}

              {/* Quick Actions */}
              {currentResume && (
                <QuickActions
                  resume={currentResume}
                  tailorResult={tailorResult}
                  jobDescription={jobDescription}
                  onUpdateResult={handleUpdateTailorResult}
                />
              )}

              {/* Action Buttons (non-sticky secondary actions) */}
              <div className="space-y-3 pt-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowCompare(true)}
                >
                  <GitCompare className="w-4 h-4 mr-2" />
                  Compare Changes
                </Button>

                {!isAddingToComparison && !currentComparison && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleStartComparison}
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Compare to Another Job
                  </Button>
                )}

                {(isAddingToComparison || currentComparison) && (
                  <Button
                    variant="outline"
                    className="w-full bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/30 hover:border-blue-500/50"
                    onClick={handleAddToComparison}
                  >
                    <BarChart3 className="w-4 h-4 mr-2 text-blue-500" />
                    Add to Comparison ({currentComparison ? currentComparison.jobs.length + 1 : 1}/4)
                  </Button>
                )}

                {currentComparison && currentComparison.jobs.length > 0 && (
                  <Button
                    variant="ghost"
                    className="w-full text-sm"
                    onClick={handleOpenCompare}
                  >
                    View Comparison ({currentComparison.jobs.length} jobs)
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}

                <Button
                  variant="outline"
                  className="w-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30 hover:border-purple-500/50"
                  onClick={() => setShowCoverLetter(true)}
                >
                  <FileText className="w-4 h-4 mr-2 text-purple-500" />
                  Generate Matching Cover Letter
                </Button>
              </div>
            </div>
          )}

          {/* Initial State - Job Input */}
          {!tailorResult && !isTailoring && (
            <>
              {/* Resume Picker — shown when no resume is loaded */}
              {!currentResume && (
                <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <h4 className="font-semibold text-sm">Select a resume to tailor</h4>
                  </div>
                  {allResumes && allResumes.length > 0 ? (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {allResumes.map((r: DatabaseResume) => (
                        <button
                          key={r.id}
                          onClick={() => {
                            haptics.light();
                            setCurrentResumeId(r.id);
                            setCurrentResume(dbToResumeData(r));
                          }}
                          className={cn(
                            'w-full text-left p-3 rounded-lg border transition-all active:scale-[0.98]',
                            'min-h-[48px] flex items-center gap-3',
                            'border-border bg-card hover:border-primary/30'
                          )}
                        >
                          <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{r.title}</p>
                            {r.target_job_title && (
                              <p className="text-xs text-muted-foreground truncate">
                                {r.target_job_title}{r.target_company ? ` @ ${r.target_company}` : ''}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No resumes yet. Create one first!</p>
                  )}
                </div>
              )}

              <JobUrlParser
                value={jobDescription}
                onChange={setJobDescription}
                onParsed={handleParsedJobInfo}
              />

              {/* Keyword Heatmap */}
              {jobDescription.trim() && currentResume && (
                <KeywordHeatmap
                  jobDescription={jobDescription}
                  resumeSkills={currentResume.skills}
                  resumeText={resumeText}
                />
              )}

              {/* Intensity Selector */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Tailoring Intensity</h4>
                <ToggleGroup
                  type="single"
                  value={intensity}
                  onValueChange={(val) => val && setIntensity(val as TailorIntensity)}
                  className="w-full grid grid-cols-3"
                >
                  <ToggleGroupItem value="light" className="text-xs gap-1">
                    <Zap className="w-3.5 h-3.5" />
                    Light
                  </ToggleGroupItem>
                  <ToggleGroupItem value="moderate" className="text-xs gap-1">
                    <Gauge className="w-3.5 h-3.5" />
                    Moderate
                  </ToggleGroupItem>
                  <ToggleGroupItem value="aggressive" className="text-xs gap-1">
                    <Flame className="w-3.5 h-3.5" />
                    Aggressive
                  </ToggleGroupItem>
                </ToggleGroup>
                <p className="text-[11px] text-muted-foreground">
                  {intensity === 'light' && 'Minimal keyword tweaks, preserves your voice'}
                  {intensity === 'moderate' && 'Balanced rewrite with keyword optimization'}
                  {intensity === 'aggressive' && 'Maximum ATS compatibility, extensive rewrite'}
                </p>
              </div>

              <Button
                className="w-full h-12 gradient-primary font-semibold"
                onClick={handleTailor}
                disabled={isTailoring || !jobDescription.trim()}
              >
                {isTailoring ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Tailoring Resume...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5 mr-2" />
                    Tailor My Resume
                  </>
                )}
              </Button>

              {/* Tips - only show once per user */}
              {!tipsDismissed && (
                <div className="p-4 rounded-xl bg-muted/50 border border-border relative">
                  <button
                    onClick={() => {
                      localStorage.setItem('wr-tailor-tips-seen', 'true');
                      setTipsDismissed(true);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    What's new in AI Tailor
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-start gap-2">
                      <ArrowRight className="w-3 h-3 mt-1.5 text-primary shrink-0" />
                      <span><strong>Inline diffs</strong> - See exactly what changed word-by-word</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="w-3 h-3 mt-1.5 text-primary shrink-0" />
                      <span><strong>Edit before applying</strong> - Tweak AI output to your voice</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="w-3 h-3 mt-1.5 text-primary shrink-0" />
                      <span><strong>Projects & Certs</strong> - Now tailored alongside your resume</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="w-3 h-3 mt-1.5 text-primary shrink-0" />
                      <span><strong>Quick re-tailor</strong> - Adjust intensity and retry instantly</span>
                    </li>
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        {/* Sticky CTA Footer */}
        {tailorResult && !isTailoring && (
          <div className="shrink-0 border-t border-border bg-background/80 backdrop-blur-md px-4 py-3 pb-safe">
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 min-h-[44px] active:scale-95 transition-transform"
                onClick={() => { haptics.warning(); handleRevert(); }}
              >
                <Undo2 className="w-4 h-4 mr-2" />
                Discard
              </Button>
              <Button
                className="flex-1 gradient-primary min-h-[44px] active:scale-95 transition-transform"
                onClick={() => { haptics.success(); handleApplyChanges(); }}
                disabled={enabledSections.length === 0 || isApplying}
              >
                {isApplying ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                {isApplying ? 'Creating...' : `Apply (${enabledSections.length})`}
              </Button>
            </div>
            {effectiveScore && (
              <p className="text-xs text-center text-muted-foreground mt-2">
                Applying {enabledSections.length} sections → Score: {effectiveScore}% • New tailored copy will be created
              </p>
            )}
          </div>
        )}
      </SheetContent>

      {/* Compare Sheet */}
      <CompareSheet
        open={showCompare}
        onOpenChange={setShowCompare}
        originalResume={originalResume}
        tailorResult={tailorResult}
        onApplyChanges={handleApplyChanges}
      />

      {/* History Sheet */}
      <TailorHistorySheet
        open={showHistory}
        onOpenChange={setShowHistory}
        history={tailorHistory}
        onRestore={handleRestoreVersion}
        onClear={clearTailorHistory}
      />

      {/* Cover Letter Generator */}
      <CoverLetterGenerator
        open={showCoverLetter}
        onOpenChange={setShowCoverLetter}
        resume={currentResume}
        jobDescription={jobDescription}
      />

      {/* Multi-Job Comparison Sheet */}
      <MultiJobCompareSheet
        open={showMultiCompare}
        onOpenChange={setShowMultiCompare}
        onAddJob={handleAddJobFromCompare}
        onViewJobDetails={(jobId) => {
          toast.info('Full details view coming soon');
        }}
      />

      {/* AI Settings Sheet */}
      <AISettingsSheet open={showAISettings} onOpenChange={setShowAISettings} />
    </Sheet>
  );
});
