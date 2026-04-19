import { useState, useMemo, useCallback, useRef, useEffect, memo } from 'react';
import { 
  Wand2, Loader2, CheckCircle, ArrowRight, Undo2, GitCompare, 
  History, FileText, Sparkles, ChevronRight, Brain, Target, BarChart3,
  Zap, Gauge, Flame, AlertTriangle, HeartHandshake, Key, RefreshCw, Bug, X, Settings,
  ExternalLink, Copy, Check, ChevronDown, ChevronUp, Briefcase, Download
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useResumeStore } from '@/store/resumeStore';
import { tailorResumeWithProgress, tailorSection, TailorIntensity, TailorError } from '@/lib/aiTailor';
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
import { KeywordMatchBar } from './tailor/KeywordMatchBar';
import { KeywordMatchList } from './tailor/KeywordMatchList';
import { QuickActions } from './tailor/QuickActions';
import { AISettingsSheet } from '@/components/settings/AISettingsSheet';
import { reportBug } from '@/lib/bugReport';
import { useAIAction } from '@/hooks/useAIAction';
import { activityTracker } from '@/lib/activityTracker';
import { useNavigate } from 'react-router-dom';
import haptics from '@/lib/haptics';

import { AITrustBadge } from '@/components/ui/AITrustBadge';
import { AIProviderVia } from '@/components/editor/ai/AIProviderBadge';
import { AISheetErrorBoundary } from '@/components/ai/AISheetErrorBoundary';
import { useResumeMutations, resumeDataToDb, useResumes, dbToResumeData, DatabaseResume } from '@/hooks/useResumes';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/safeClient';
import { useRedactedResume } from '@/hooks/useRedactedResume';
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

const CUSTOM_INSTRUCTIONS_KEY = 'wr-tailor-custom-instructions';

function buildPlainTextFromResume(resume: ResumeData, tailorResult: SuperTailorResult, enabledSections: TailorSectionId[]): string {
  const lines: string[] = [];
  const ci = resume.contactInfo;
  lines.push(ci.fullName || '');
  const contact = [ci.email, ci.phone, ci.location].filter(Boolean).join(' | ');
  if (contact) lines.push(contact);
  lines.push('');
  if (enabledSections.includes('summary') && tailorResult.summary) {
    lines.push('SUMMARY');
    lines.push(tailorResult.summary);
    lines.push('');
  }
  const skills = enabledSections.includes('skills') ? tailorResult.skills : resume.skills;
  if (skills.length > 0) {
    lines.push('SKILLS');
    lines.push(skills.join(', '));
    lines.push('');
  }
  const experiences = enabledSections.includes('experience') ? tailorResult.experience : resume.experience;
  if (experiences.length > 0) {
    lines.push('EXPERIENCE');
    for (const exp of experiences) {
      lines.push(`${exp.position} | ${exp.company}`);
      lines.push(`${exp.startDate} – ${exp.current ? 'Present' : exp.endDate}`);
      if (exp.description) lines.push(exp.description);
      for (const ach of (exp.achievements || [])) {
        lines.push(`• ${ach}`);
      }
      lines.push('');
    }
  }
  const educations = enabledSections.includes('education') ? tailorResult.education : resume.education;
  if (educations.length > 0) {
    lines.push('EDUCATION');
    for (const edu of educations) {
      lines.push(`${edu.degree} in ${edu.field} | ${edu.institution}`);
      lines.push(`${edu.startDate} – ${edu.endDate}`);
      if (edu.description) lines.push(edu.description);
      lines.push('');
    }
  }
  const projects = enabledSections.includes('projects') ? (tailorResult.projects ?? resume.projects) : resume.projects;
  if (projects && projects.length > 0) {
    lines.push('PROJECTS');
    for (const p of projects) {
      lines.push(`${p.name}${p.role ? ` | ${p.role}` : ''}`);
      if (p.technologies?.length) lines.push(`Technologies: ${p.technologies.join(', ')}`);
      if (p.description) lines.push(p.description);
      lines.push('');
    }
  }
  const certifications = enabledSections.includes('certifications') ? (tailorResult.certifications ?? resume.certifications) : resume.certifications;
  if (certifications && certifications.length > 0) {
    lines.push('CERTIFICATIONS');
    for (const c of certifications) {
      lines.push(`${c.name} | ${c.issuer}${c.date ? ` | ${c.date}` : ''}`);
    }
    lines.push('');
  }
  const awards = enabledSections.includes('awards') ? (tailorResult.awards ?? resume.awards) : resume.awards;
  if (awards && awards.length > 0) {
    lines.push('AWARDS');
    for (const a of awards) {
      lines.push(`${a.title} | ${a.issuer}${a.date ? ` | ${a.date}` : ''}`);
      if (a.description) lines.push(a.description);
    }
    lines.push('');
  }
  return lines.join('\n').trim();
}

const SECTION_ATS_WEIGHTS: Record<TailorSectionId, number> = {
  experience: 0.35,
  skills: 0.25,
  summary: 0.20,
  education: 0.10,
  projects: 0.05,
  certifications: 0.03,
  awards: 0.02,
};

export const TailorSheet = memo(function TailorSheet({ open, onOpenChange, onApplied }: TailorSheetProps) {
  const navigate = useNavigate();
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
  const [customInstructions, setCustomInstructions] = useState(
    () => localStorage.getItem(CUSTOM_INSTRUCTIONS_KEY) || ''
  );
  const [showCustomInstructions, setShowCustomInstructions] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [appliedResumeId, setAppliedResumeId] = useState<string | null>(null);
  const [showAppliedCTA, setShowAppliedCTA] = useState(false);
  const [isRetryingScore, setIsRetryingScore] = useState(false);
  const [appliedJobInfo, setAppliedJobInfo] = useState<{ title: string; company: string } | null>(null);
  const [appliedMergedResume, setAppliedMergedResume] = useState<ResumeData | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  useEffect(() => {
    if (open) {
      activityTracker.setActiveFeature('Smart Tailor');
      setShowAppliedCTA(false);
      setAppliedJobInfo(null);
      setAppliedResumeId(null);
      setAppliedMergedResume(null);
    }
    return () => { activityTracker.setActiveFeature(null); };
  }, [open]);

  useEffect(() => {
    localStorage.setItem(CUSTOM_INSTRUCTIONS_KEY, customInstructions);
  }, [customInstructions]);
  const abortRef = useRef<AbortController | null>(null);
  const [tailorError, setTailorError] = useState<{ message: string; code?: string } | null>(null);
  const [showAISettings, setShowAISettings] = useState(false);
  const [showCacheRestore, setShowCacheRestore] = useState(false);
  const cachedDataRef = useRef<TailorCache | null>(null);

  // Section toggles
  const [enabledSections, setEnabledSections] = useState<TailorSectionId[]>([
    'summary', 'skills', 'experience', 'education', 'projects', 'certifications', 'awards'
  ]);
  const [rejectedBullets, setRejectedBullets] = useState<Set<string>>(new Set());

  const toggleSection = (sectionId: TailorSectionId) => {
    setEnabledSections(prev => 
      prev.includes(sectionId)
        ? prev.filter(s => s !== sectionId)
        : [...prev, sectionId]
    );
  };

  const { execute: executeAI } = useAIAction({ operation: 'tailor' });
  const redactedResume = useRedactedResume(currentResume as ResumeData | null);

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
    setActiveTab('changes');

    abortRef.current = new AbortController();

    try {
      const result = await executeAI(async () => {
        return await tailorResumeWithProgress(
          (redactedResume ?? currentResume) as ResumeData,
          jobDescription,
          (p) => setProgress(p),
          intensity,
          abortRef.current!.signal,
          customInstructions || undefined
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
        sections: enabledSections,
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
      // Coerce to a safe string FIRST — some callers surface an error whose
      // `.message` is a non-string (e.g. a parsed JSON object). Running
      // `.includes()` on that would throw TypeError and mask the real issue
      // behind an unhandled exception, which is how the `[object Object]`
      // bug slipped through before.
      const rawMsg = err?.message;
      const safeMsg =
        typeof rawMsg === 'string' && rawMsg.length > 0
          ? rawMsg
          : typeof err === 'string'
            ? err
            : 'Failed to tailor resume';
      if (safeMsg.includes('Unauthorized') || safeMsg.includes('log in')) {
        toast.error(safeMsg);
      } else {
        setTailorError({ message: safeMsg, code });
      }
    } finally {
      setIsTailoring(false);
      setProgress(null);
    }
  }, [jobDescription, currentResume, intensity, customInstructions, executeAI, setPendingTailor, currentResumeId, jobUrl, onOpenChange, navigate]);

  // Auto-tailor when a URL is parsed
  // T009: Reset autoTailorTriggered when a new, different parsedJobInfo is received
  const handleParsedJobInfo = useCallback((info: { title: string; company: string; url?: string } | null) => {
    if (info && (info.title !== parsedJobInfo?.title || info.company !== parsedJobInfo?.company)) {
      autoTailorTriggered.current = false;
    }
    setParsedJobInfo(info);
    if (info?.url) setJobUrl(info.url);
    if (info && jobDescription.trim() && currentResume && !autoTailorTriggered.current) {
      autoTailorTriggered.current = true;
      toast.info('Auto-tailoring your resume...', { duration: 2000 });
      setTimeout(() => handleTailor(), 500);
    }
  }, [jobDescription, currentResume, handleTailor, parsedJobInfo]); // T010: parsedJobInfo added as dependency

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

  const handleRegenerateSection = useCallback(async (sectionId: TailorSectionId, sectionInstruction?: string) => {
    if (!tailorResult || !currentResume) return;

    const getCurrentContent = (): string | string[] | null => {
      if (sectionId === 'summary') return tailorResult.summary;
      if (sectionId === 'skills') return tailorResult.skills;
      if (sectionId === 'experience') return tailorResult.experience.flatMap(e => e.achievements ?? []);
      if (sectionId === 'education') return tailorResult.education.map(e => e.field || `${e.degree} at ${e.institution}`);
      if (sectionId === 'projects') return (tailorResult.projects ?? []).map(p => p.description || '');
      if (sectionId === 'certifications') return (tailorResult.certifications ?? []).map(c => c.name);
      return null;
    };

    const currentContent = getCurrentContent();
    if (currentContent === null) return;

    const combinedInstructions = [customInstructions, sectionInstruction].filter(s => s?.trim()).join(' | ') || undefined;

    const projectItems = sectionId === 'projects' && tailorResult.projects?.length
      ? tailorResult.projects.map(p => ({ name: p.name, description: p.description || '', technologies: p.technologies, role: p.role }))
      : undefined;

    try {
      const result = await tailorSection({
        section: sectionId,
        currentContent,
        jobDescription,
        jobKeywords: tailorResult.atsAnalysis?.criticalKeywords,
        userInstructions: combinedInstructions,
        intensity,
        projectItems,
      });
      if (sectionId === 'summary' && typeof result.rewrittenContent === 'string') {
        handleUpdateTailorResult({ summary: result.rewrittenContent });
      } else if (sectionId === 'skills' && Array.isArray(result.rewrittenContent)) {
        handleUpdateTailorResult({ skills: result.rewrittenContent as string[] });
      } else if (sectionId === 'experience' && Array.isArray(result.rewrittenContent)) {
        const newBullets = result.rewrittenContent as string[];
        let bulletIdx = 0;
        const updatedExperience = tailorResult.experience.map(exp => {
          const count = (exp.achievements ?? []).length;
          const slice = newBullets.slice(bulletIdx, bulletIdx + count);
          bulletIdx += count;
          return { ...exp, achievements: slice.length > 0 ? slice : exp.achievements };
        });
        handleUpdateTailorResult({ experience: updatedExperience, bulletTransformations: [] });
      } else if (sectionId === 'education' && Array.isArray(result.rewrittenContent)) {
        const newFields = result.rewrittenContent as string[];
        const updatedEducation = tailorResult.education.map((edu, i) => ({
          ...edu,
          field: newFields[i] ?? edu.field,
        }));
        handleUpdateTailorResult({ education: updatedEducation });
      } else if (sectionId === 'projects' && Array.isArray(result.rewrittenContent)) {
        const newDescriptions = result.rewrittenContent as string[];
        const updatedProjects = (tailorResult.projects ?? []).map((p, i) => ({
          ...p,
          description: (newDescriptions[i] ?? '').trim() || p.description,
        }));
        handleUpdateTailorResult({ projects: updatedProjects });
      } else if (sectionId === 'certifications' && Array.isArray(result.rewrittenContent)) {
        const newNames = result.rewrittenContent as string[];
        const updatedCertifications = (tailorResult.certifications ?? []).map((c, i) => ({
          ...c,
          name: newNames[i] ?? c.name,
        }));
        handleUpdateTailorResult({ certifications: updatedCertifications });
      }
      toast.success(`${sectionId.charAt(0).toUpperCase() + sectionId.slice(1)} section regenerated`);
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || 'Failed to regenerate section');
    }
  }, [tailorResult, currentResume, jobDescription, customInstructions, intensity, handleUpdateTailorResult]);

  // Auto-create tailored CV as new resume in DB
  const handleApplyChanges = useCallback(async () => {
    if (!tailorResult || !currentResume || !user) return;

    // T007: Guard against null currentResumeId — abort with specific message, keep sheet open
    if (!currentResumeId) {
      toast.error('Please select a resume before applying changes.');
      return;
    }

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
        // ID-based merge — iterate originals as source of truth, look up AI version by id
        // Apply per-bullet rejections from the accept/reject UI
        mergedResume.experience = currentResume.experience.map(orig => {
          const tailored = tailorResult.experience.find(e => e.id === orig.id);
          if (!tailored) return orig;
          const merged = { ...orig, ...tailored };
          // Re-apply original bullets for any rejected ones
          if (tailorResult.bulletTransformations && orig.achievements) {
            const mergedAchievements = [...(tailored.achievements ?? orig.achievements)];
            tailorResult.bulletTransformations
              .filter(bt => bt.experienceId === orig.id && rejectedBullets.has(`${bt.experienceId}-${bt.bulletIndex}`))
              .forEach(bt => {
                mergedAchievements[bt.bulletIndex] = bt.originalBullet;
              });
            merged.achievements = mergedAchievements;
          }
          return merged;
        });
      }
      if (enabledSections.includes('education')) {
        // T006: ID-based merge for education — same pattern as experience
        mergedResume.education = currentResume.education.map(orig => {
          const tailored = tailorResult.education.find(e => e.id === orig.id);
          return tailored ? { ...orig, ...tailored } : orig;
        });
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
          job_match_score: tailorResult.overallScore?.after ?? null, // T008: null not 0 when score absent
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

      const jt = parsedJobInfo?.title || tailorResult.jobParsed?.title || 'Position';
      const co = parsedJobInfo?.company || tailorResult.jobParsed?.company || 'Company';
      const newResumeId = newResume?.id;

      onApplied?.({ title: jt, company: co, resumeId: newResumeId, jobUrl });

      setAppliedResumeId(newResumeId || null);
      setAppliedJobInfo({ title: jt, company: co });
      setAppliedMergedResume(mergedResume);

      setTailorResult(null);
      clearPendingTailor();
      clearCache(currentResumeId);
      setShowAppliedCTA(true);
    } catch (error) {
      console.error('Apply error:', error);
      toast.error('Failed to create tailored resume');
    } finally {
      setIsApplying(false);
    }
  }, [tailorResult, currentResume, user, enabledSections, rejectedBullets, parsedJobInfo, currentResumeId, jobDescription, addTailorHistory, onOpenChange, clearPendingTailor, jobUrl, onApplied, navigate]);

  const handleCopyPlainText = useCallback(async () => {
    if (!currentResume || !tailorResult) return;
    const text = buildPlainTextFromResume(currentResume, tailorResult, enabledSections);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopiedText(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, [currentResume, tailorResult, enabledSections]);

  const handleTrackApplication = useCallback(() => {
    const jobTitle = parsedJobInfo?.title || tailorResult?.jobParsed?.title || '';
    const company = parsedJobInfo?.company || tailorResult?.jobParsed?.company || '';
    const params = new URLSearchParams();
    params.set('new', '1');
    if (jobTitle) params.set('title', jobTitle);
    if (company) params.set('company', company);
    if (appliedResumeId) params.set('resumeId', appliedResumeId);
    onOpenChange(false);
    navigate(`/applications?${params.toString()}`);
  }, [navigate, parsedJobInfo, tailorResult, appliedResumeId, onOpenChange]);

  const handleDownloadPdf = useCallback(async () => {
    if (!appliedMergedResume || isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    try {
      const { generatePDF } = await import('@/lib/pdfGenerator');
      const { downloadFile } = await import('@/lib/downloadUtils');
      const templateId = (appliedMergedResume.templateId || 'modern') as import('@/types/resume').TemplateId;
      const blob = await generatePDF(appliedMergedResume, templateId);
      const name = appliedMergedResume.contactInfo?.fullName || 'Resume';
      const jobSuffix = appliedJobInfo?.title ? `_${appliedJobInfo.title}` : '';
      const fileName = `${name}${jobSuffix}_Tailored.pdf`.replace(/\s+/g, '_');
      await downloadFile({ blob, fileName });
      toast.success('PDF downloaded!');
    } catch {
      toast.error('Failed to download PDF');
    } finally {
      setIsDownloadingPdf(false);
    }
  }, [appliedMergedResume, appliedJobInfo, isDownloadingPdf]);

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

  const handleRetryScore = useCallback(async () => {
    if (!tailorResult || !originalResume || isRetryingScore) return;

    setIsRetryingScore(true);
    try {
      const tailoredResume: ResumeData = {
        ...originalResume,
        summary: tailorResult.summary,
        skills: tailorResult.skills,
        experience: tailorResult.experience,
        education: tailorResult.education,
        ...(tailorResult.projects ? { projects: tailorResult.projects } : {}),
        ...(tailorResult.certifications ? { certifications: tailorResult.certifications } : {}),
        ...(tailorResult.awards ? { awards: tailorResult.awards } : {}),
      };

      const [beforeResult, afterResult] = await Promise.all([
        supabase.functions.invoke('score-resume', {
          body: { resume: originalResume, source: 'background' },
        }),
        supabase.functions.invoke('score-resume', {
          body: { resume: tailoredResume, source: 'background' },
        }),
      ]);

      const beforeScore = beforeResult.data?.overallScore;
      const afterScore = afterResult.data?.overallScore;

      if (typeof beforeScore === 'number' && typeof afterScore === 'number') {
        handleUpdateTailorResult({ overallScore: { before: beforeScore, after: afterScore } });
        toast.success('ATS score calculated.');
      } else {
        toast.error('Could not retrieve score — try re-tailoring.');
      }
    } catch {
      toast.error('Score calculation failed — try re-tailoring.');
    } finally {
      setIsRetryingScore(false);
    }
  }, [tailorResult, originalResume, isRetryingScore, handleUpdateTailorResult]);

  const handleAddSkill = (skill: string) => {
    if (!currentResume) return;
    if (tailorResult) {
      handleUpdateTailorResult({ skills: [...tailorResult.skills, skill] });
    } else {
      updateResume({ skills: [...currentResume.skills, skill] });
    }
    toast.success(`Added "${skill}" to your skills`);
  };

  const handleBoostSkill = (skill: string) => {
    if (!currentResume) return;
    if (tailorResult) {
      const newSkills = [skill, ...tailorResult.skills.filter(s => s !== skill)];
      handleUpdateTailorResult({ skills: newSkills });
    } else {
      const newSkills = [skill, ...currentResume.skills.filter(s => s !== skill)];
      updateResume({ skills: newSkills });
    }
    toast.success(`Moved "${skill}" to the top`);
  };

  const handleAddAllSkills = () => {
    if (!tailorResult || !currentResume) return;
    const newSkills = [
      ...tailorResult.missingSkills.map(s => s.skill),
      ...tailorResult.skills,
    ];
    handleUpdateTailorResult({ skills: newSkills });
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

    const presentSections: TailorSectionId[] = [
      'summary',
      'skills',
      'experience',
      ...(tailorResult.education?.length ? ['education' as TailorSectionId] : []),
      ...(tailorResult.projects?.length ? ['projects' as TailorSectionId] : []),
      ...(tailorResult.certifications?.length ? ['certifications' as TailorSectionId] : []),
      ...(tailorResult.awards?.length ? ['awards' as TailorSectionId] : []),
    ];

    const maxWeight = presentSections.reduce((sum, s) => sum + SECTION_ATS_WEIGHTS[s], 0);
    const appliedWeight = enabledSections
      .filter(s => presentSections.includes(s))
      .reduce((sum, s) => sum + SECTION_ATS_WEIGHTS[s], 0);
    const sectionWeight = maxWeight > 0 ? appliedWeight / maxWeight : 1;

    return Math.round(before + (maxImprovement * sectionWeight));
  }, [tailorResult, enabledSections]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90dvh] rounded-t-3xl flex flex-col">
        <AISheetErrorBoundary key={String(open)} onClose={() => onOpenChange(false)}>
          <SheetHeader className="pb-4 shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-primary" />
              AI Resume Tailor
              <AICostBadge operation="tailor" />
            </SheetTitle>
            <AIProviderVia className="mt-0.5" />
            <div className="flex items-center gap-1 mr-8">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  onOpenChange(false);
                  const params = new URLSearchParams();
                  if (parsedJobInfo?.title) params.set('title', parsedJobInfo.title);
                  if (parsedJobInfo?.company) params.set('company', parsedJobInfo.company);
                  const qs = params.toString();
                  navigate(`/tailor${currentResumeId ? `/${currentResumeId}` : ''}${qs ? `?${qs}` : ''}`);
                }}
                className="text-muted-foreground text-xs gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Full view
              </Button>
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

        <div className="overflow-y-auto flex-1 min-h-0 space-y-4 pb-4 ai-output-scroll-fade">
          <AITrustBadge className="mx-0" />

          {/* Cache restore banner */}
          {showCacheRestore && !tailorResult && !isTailoring && (() => {
            const cached = cachedDataRef.current;
            const jobTitle = cached?.parsedJobInfo?.title || cached?.tailorResult?.jobParsed?.title;
            const company = cached?.parsedJobInfo?.company || cached?.tailorResult?.jobParsed?.company;
            const contextLabel = jobTitle ? `${jobTitle}${company ? ` @ ${company}` : ''}` : null;
            return (
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-between gap-3 animate-fade-in">
                <div>
                  <p className="text-sm text-foreground font-medium">✨ Resume already tailored</p>
                  {contextLabel && (
                    <p className="text-xs text-muted-foreground mt-0.5">For: {contextLabel}</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => setShowCacheRestore(false)} className="min-h-[44px] active:scale-95 transition-transform">
                    Dismiss
                  </Button>
                  <Button size="sm" onClick={handleRestoreCache} className="min-h-[44px] active:scale-95 transition-transform">
                    Restore
                  </Button>
                </div>
              </div>
            );
          })()}

          {/* Tailoring Progress */}
          {isTailoring && progress && (
            <TailorProgressComponent
              progress={progress}
              projectedScore={tailorResult?.overallScore ?? undefined}
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

          {/* Applied Success Card */}
          {showAppliedCTA && !isTailoring && !tailorResult && (
            <div className="flex flex-col items-center justify-center gap-6 py-12 px-6 text-center animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <div>
                <h3 className="font-bold text-xl mb-1">Tailored Resume Created!</h3>
                <p className="text-muted-foreground text-sm">
                  {appliedJobInfo
                    ? `Your resume has been tailored for ${appliedJobInfo.title} at ${appliedJobInfo.company}.`
                    : 'Your tailored resume has been saved.'}
                </p>
              </div>
              <div className="flex flex-col gap-3 w-full max-w-xs">
                {appliedResumeId && (
                  <Button className="gradient-primary min-h-[44px]" onClick={() => { navigate(`/editor/${appliedResumeId}`); onOpenChange(false); }}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open in Editor
                  </Button>
                )}
                {appliedMergedResume && (
                  <Button variant="outline" className="min-h-[44px]" onClick={handleDownloadPdf} disabled={isDownloadingPdf}>
                    {isDownloadingPdf ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                    {isDownloadingPdf ? 'Generating PDF…' : 'Download PDF'}
                  </Button>
                )}
                <Button variant="outline" className="min-h-[44px]" onClick={handleTrackApplication}>
                  <Briefcase className="w-4 h-4 mr-2" />
                  Track Application
                </Button>
                <Button variant="ghost" className="min-h-[44px]" onClick={() => onOpenChange(false)}>
                  Done
                </Button>
              </div>
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
                      <ToggleGroupItem value="light" className="text-[10px] min-h-[44px] px-2.5 gap-1">
                        <Zap className="w-3 h-3" />
                        Light
                      </ToggleGroupItem>
                      <ToggleGroupItem value="moderate" className="text-[10px] min-h-[44px] px-2.5 gap-1">
                        <Gauge className="w-3 h-3" />
                        Moderate
                      </ToggleGroupItem>
                      <ToggleGroupItem value="aggressive" className="text-[10px] min-h-[44px] px-2.5 gap-1">
                        <Flame className="w-3 h-3" />
                        Aggressive
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

              {/* Copy plain text + Track CTA */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyPlainText}
                  className="gap-1.5 text-xs"
                >
                  {copiedText ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedText ? 'Copied!' : 'Copy as plain text'}
                </Button>
              </div>

              {/* Manual Tabs */}
              <div className="flex rounded-lg bg-muted p-1 gap-1">
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
                            The ATS score couldn't be calculated this time. Your tailored content is 100% valid — estimate the score from keyword analysis (free), or re-tailor fully for an AI-computed score.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" variant="outline" className="text-xs min-h-[44px] active:scale-95 transition-transform" onClick={handleRetryScore} disabled={isRetryingScore}>
                          {isRetryingScore ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                          {isRetryingScore ? 'Calculating...' : 'Calculate Score (free)'}
                        </Button>
                        <Button size="sm" variant="ghost" className="text-xs min-h-[44px] active:scale-95 transition-transform" onClick={handleTailor}>
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Re-Tailor
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
                      onRegenerate={handleRegenerateSection}
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
                      onRegenerate={handleRegenerateSection}
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
                      bulletTransformations={tailorResult.bulletTransformations}
                      onBulletReject={setRejectedBullets}
                      onRegenerate={handleRegenerateSection}
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
                      onRegenerate={handleRegenerateSection}
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
                        onRegenerate={handleRegenerateSection}
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
                        onRegenerate={handleRegenerateSection}
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

                  {/* ATS Keyword Match List — deterministic from backend */}
                  {!!(tailorResult.atsAnalysis?.matchedKeywords?.length || tailorResult.atsAnalysis?.unmatchedKeywords?.length || tailorResult.atsAnalysis?.criticalKeywords?.length) && (
                    <KeywordMatchList
                      matchedKeywords={tailorResult.atsAnalysis?.matchedKeywords}
                      unmatchedKeywords={tailorResult.atsAnalysis?.unmatchedKeywords}
                      criticalKeywords={tailorResult.atsAnalysis?.criticalKeywords}
                      missingSkills={tailorResult.missingSkills}
                    />
                  )}

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
                            <span className="text-muted-foreground">
                              {typeof change === 'string' ? change : change.description}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'intelligence' && (
                <div className="space-y-4">
                  {tailorResult.jobIntelligence ? (
                    <JobIntelligenceCard
                      jobIntelligence={tailorResult.jobIntelligence}
                      atsAnalysis={tailorResult.atsAnalysis}
                      strengthsAnalysis={tailorResult.strengthsAnalysis}
                      jobTitle={parsedJobInfo?.title || tailorResult.jobParsed?.title}
                      company={parsedJobInfo?.company || tailorResult.jobParsed?.company}
                    />
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-50" />
                      <p className="font-medium">Job intelligence not available</p>
                      <p className="text-sm">Re-tailor your resume to generate job intelligence insights.</p>
                    </div>
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
                <div className="p-4 rounded-xl bg-muted border border-border space-y-3">
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

              {/* Custom Instructions */}
              <div className="space-y-2">
                <button
                  onClick={() => setShowCustomInstructions(v => !v)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
                >
                  {showCustomInstructions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  Custom instructions
                  {customInstructions && <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-auto">saved</Badge>}
                </button>
                {showCustomInstructions && (
                  <Textarea
                    value={customInstructions}
                    onChange={e => setCustomInstructions(e.target.value)}
                    placeholder="e.g. I'm applying as a senior candidate, emphasize leadership..."
                    className="min-h-[80px] resize-none text-sm"
                  />
                )}
              </div>

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

              {/* Keyword Match Bar — live match preview before tailoring */}
              {jobDescription.trim() && currentResume && (
                <KeywordMatchBar
                  jobDescription={jobDescription}
                  resumeText={resumeText}
                />
              )}

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
                <div className="p-4 rounded-xl bg-muted border border-border relative">
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
          <div className="shrink-0 border-t border-border bg-background/95 backdrop-blur-sm px-4 py-2 pb-safe [@media(max-height:700px)]:py-1.5">
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 min-h-[44px] [@media(max-height:700px)]:min-h-[36px] active:scale-95 transition-transform"
                onClick={() => { haptics.warning(); handleRevert(); }}
              >
                <Undo2 className="w-4 h-4 mr-2" />
                Discard
              </Button>
              <Button
                className="flex-1 gradient-primary min-h-[44px] [@media(max-height:700px)]:min-h-[36px] active:scale-95 transition-transform"
                onClick={() => { haptics.success(); setShowCompare(true); }}
                disabled={enabledSections.length === 0}
              >
                <GitCompare className="w-4 h-4 mr-2" />
                Preview & Apply ({enabledSections.length})
              </Button>
            </div>
            {enabledSections.length === 0 ? (
              <p className="text-xs text-center text-warning mt-1.5">
                Toggle at least one section above to apply
              </p>
            ) : effectiveScore ? (
              <p className="text-xs text-center text-muted-foreground mt-1.5 [@media(max-height:700px)]:hidden">
                Applying {enabledSections.length} sections → Score: {effectiveScore}% • New tailored copy will be created
              </p>
            ) : null}
          </div>
        )}
        </AISheetErrorBoundary>
      </SheetContent>

      {/* AI Settings Sheet */}
      <AISettingsSheet open={showAISettings} onOpenChange={setShowAISettings} />

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
    </Sheet>
  );
});
