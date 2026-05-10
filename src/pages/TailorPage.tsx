import { useState, useMemo, useCallback, useRef, useEffect, Fragment, type ReactNode } from 'react';
import { formatDegreeAndField } from '@/lib/educationFormat';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Wand2, Loader2, CheckCircle, ArrowLeft, Sparkles, Zap, Gauge, Flame,
  Settings, RefreshCw, Copy, Check, ExternalLink, ChevronDown, ChevronUp,
  Key, HeartHandshake, Bug, X, Briefcase, Eye, Globe, TrendingUp,
  Shield, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useResumeStore } from '@/store/resumeStore';
import { tailorResumeWithProgress, tailorSection, TailorIntensity, TailorError } from '@/lib/aiTailor';
import { toast } from 'sonner';
import { TailorProgressComponent } from '@/components/editor/tailor/TailorProgress';
import { SectionChangeCard } from '@/components/editor/tailor/SectionChangeCard';
import { ScoreComparison } from '@/components/editor/tailor/ScoreComparison';
import { KeywordMatchBar } from '@/components/editor/tailor/KeywordMatchBar';
import { KeywordMatchList } from '@/components/editor/tailor/KeywordMatchList';
import { JobUrlParser } from '@/components/editor/tailor/JobUrlParser';
import { TailorDemoPanel } from '@/components/editor/tailor/TailorDemoPanel';
import { TailorPreviewSheet } from '@/components/editor/tailor/TailorPreviewSheet';
import { buildMergedResume, applyFixesOnTop } from '@/lib/tailorMerge';
import { compareSkills, diffText } from '@/lib/diffUtils';
import { AICostBadge } from '@/components/ai/AICostBadge';
import { reportBug } from '@/lib/bugReport';
import { useAIAction } from '@/hooks/useAIAction';
import { useResumes, dbToResumeData, DatabaseResume } from '@/hooks/useResumes';
import { useAuth } from '@/hooks/useAuth';
import { databases, DATABASE_ID, ID } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';
import { useRedactedResume } from '@/hooks/useRedactedResume';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import {
  SuperTailorResult,
  TailorProgress,
  TailorSectionId,
  ResumeData,
  EnhancedTailorProgress,
  ValidatorResult,
  FixSuggestion,
} from '@/types/resume';
import { cn } from '@/lib/utils';
import { useShallow } from 'zustand/react/shallow';
import { activityTracker } from '@/lib/activityTracker';

function logTailorEvent(event: string, detail?: Record<string, unknown>) {
  console.log(`[TailorPage] ${event}`, detail ?? '');
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

const CUSTOM_INSTRUCTIONS_KEY = 'wr-tailor-custom-instructions';
const MAX_APPLIED_FIXES = 10;

function buildPlainText(resume: ResumeData, tailorResult: SuperTailorResult, enabledSections: TailorSectionId[]): string {
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
      lines.push(`${formatDegreeAndField(edu.degree, edu.field)} | ${edu.institution}`);
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

export default function TailorPage() {
  const navigate = useNavigate();
  const { resumeId: paramResumeId } = useParams<{ resumeId?: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const {
    currentResumeId,
    jobDescription,
    setJobDescription,
    addTailorHistory,
    setPendingTailor,
    clearPendingTailor,
    setCurrentResumeId,
    pendingTailorResult,
    pendingTailorOriginal,
    pendingTailorJobInfo,
    pendingTailorIntensity,
    pendingTailorJobUrl,
    pendingTailorSections,
  } = useResumeStore(useShallow(state => ({
    currentResumeId: state.currentResumeId,
    jobDescription: state.jobDescription,
    setJobDescription: state.setJobDescription,
    addTailorHistory: state.addTailorHistory,
    setPendingTailor: state.setPendingTailor,
    clearPendingTailor: state.clearPendingTailor,
    setCurrentResumeId: state.setCurrentResumeId,
    pendingTailorResult: state.pendingTailorResult,
    pendingTailorOriginal: state.pendingTailorOriginal,
    pendingTailorJobInfo: state.pendingTailorJobInfo,
    pendingTailorIntensity: state.pendingTailorIntensity,
    pendingTailorJobUrl: state.pendingTailorJobUrl,
    pendingTailorSections: state.pendingTailorSections,
  })));

  const { data: allResumes } = useResumes();

  const currentResume = useMemo(() => {
    const found = allResumes?.find((r: DatabaseResume) => r.id === currentResumeId);
    return found ? dbToResumeData(found) : null;
  }, [allResumes, currentResumeId]);

  const [isTailoring, setIsTailoring] = useState(false);
  const [tailorResult, setTailorResult] = useState<SuperTailorResult | null>(null);
  const [originalResume, setOriginalResume] = useState<ResumeData | null>(null);
  const [progress, setProgress] = useState<TailorProgress | EnhancedTailorProgress | null>(null);
  const [parsedJobInfo, setParsedJobInfo] = useState<{ title: string; company: string } | null>(null);
  const [intensity, setIntensity] = useState<TailorIntensity>('moderate');
  const [isApplying, setIsApplying] = useState(false);
  const [jobUrl, setJobUrl] = useState<string | undefined>(undefined);
  const [tailorError, setTailorError] = useState<{ message: string; code?: string } | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [showAppliedCTA, setShowAppliedCTA] = useState(false);
  const [showTailorPreview, setShowTailorPreview] = useState(false);
  const [appliedResumeId, setAppliedResumeId] = useState<string | null>(null);
  const [appliedResumeTitle, setAppliedResumeTitle] = useState<string | null>(null);
  const [appliedJobInfo, setAppliedJobInfo] = useState<{ title: string; company: string } | null>(null);
  const [appliedScore, setAppliedScore] = useState<{ before: number; after: number } | null>(null);
  const [appliedKeywordCount, setAppliedKeywordCount] = useState<number | null>(null);
  const [appliedValidatorResult, setAppliedValidatorResult] = useState<ValidatorResult | null>(null);

  const [preValidatorResult, setPreValidatorResult] = useState<ValidatorResult | null>(null);
  const [isPreValidating, setIsPreValidating] = useState(false);
  const [dismissedIssueIndices, setDismissedIssueIndices] = useState<Set<number>>(new Set());
  const [fixSuggestions, setFixSuggestions] = useState<FixSuggestion[] | null>(null);
  const [isGeneratingFixes, setIsGeneratingFixes] = useState(false);
  const [appliedFixes, setAppliedFixes] = useState<FixSuggestion[]>([]);

  const [customInstructions, setCustomInstructions] = useState(
    () => localStorage.getItem(CUSTOM_INSTRUCTIONS_KEY) || ''
  );
  const [showCustomInstructions, setShowCustomInstructions] = useState(false);

  const [enabledSections, setEnabledSections] = useState<TailorSectionId[]>([
    'summary', 'skills', 'experience', 'education', 'projects', 'certifications', 'awards'
  ]);
  const [revealedSections, setRevealedSections] = useState<Set<TailorSectionId>>(new Set());
  const [rejectedBullets, setRejectedBullets] = useState<Set<string>>(new Set());

  const abortRef = useRef<AbortController | null>(null);
  const preValidateAbortRef = useRef<AbortController | null>(null);
  const fixGenerateAbortRef = useRef<AbortController | null>(null);
  const preValidateMergedRef = useRef<ResumeData | null>(null);
  const copiedTextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumeIdRef = useRef<string | null>(currentResumeId);
  const { execute: executeAI } = useAIAction({ operation: 'tailor' });
  const redactedResume = useRedactedResume(currentResume as ResumeData | null);

  useEffect(() => {
    activityTracker.setActiveFeature('Smart Tailor');
    return () => {
      activityTracker.setActiveFeature(null);
      if (copiedTextTimerRef.current) clearTimeout(copiedTextTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (customInstructions) {
      localStorage.setItem(CUSTOM_INSTRUCTIONS_KEY, customInstructions);
    } else {
      localStorage.removeItem(CUSTOM_INSTRUCTIONS_KEY);
    }
  }, [customInstructions]);

  const preloadedJob = searchParams.get('job') || '';
  const preloadedTitle = searchParams.get('title') || '';
  const preloadedCompany = searchParams.get('company') || '';

  useEffect(() => {
    if (preloadedJob && !jobDescription) {
      setJobDescription(preloadedJob);
    }
    if (preloadedTitle && preloadedCompany) {
      setParsedJobInfo({ title: preloadedTitle, company: preloadedCompany });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Hydrate from Zustand pendingTailor when navigated from TailorSheet
  useEffect(() => {
    if (pendingTailorResult && !tailorResult) {
      setTailorResult(pendingTailorResult);
      if (pendingTailorOriginal) setOriginalResume(pendingTailorOriginal);
      if (pendingTailorJobInfo) setParsedJobInfo(pendingTailorJobInfo);
      if (pendingTailorIntensity) setIntensity(pendingTailorIntensity);
      if (pendingTailorJobUrl) setJobUrl(pendingTailorJobUrl);
      if (pendingTailorSections?.length) {
        setEnabledSections(pendingTailorSections);
      } else {
        setEnabledSections(['summary', 'skills', 'experience', 'education', 'projects', 'certifications', 'awards']);
      }
      setRevealedSections(new Set(['summary', 'skills', 'experience', 'education', 'projects', 'certifications'] as TailorSectionId[]));
    }
  // Only run once on mount — tailorResult starting null triggers hydration
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingTailorResult]);

  useEffect(() => {
    if (!paramResumeId || !allResumes) return;
    if (currentResumeId === paramResumeId) return;
    const found = allResumes.find((r: DatabaseResume) => r.id === paramResumeId);
    if (found) {
      setCurrentResumeId(paramResumeId);
    }
  }, [paramResumeId, allResumes, currentResumeId, setCurrentResumeId]);

  // Auto-select the most recently updated resume when the user lands on
  // /tailor without an explicit resumeId param and nothing is loaded yet.
  // Prevents the page from rendering a "Select a resume" picker that the
  // user has to manually click through every visit when they only have
  // one (or one favourite) resume.
  useEffect(() => {
    if (paramResumeId) return;
    if (currentResume) return;
    if (!allResumes || allResumes.length === 0) return;
    const mostRecent = [...allResumes].sort((a: DatabaseResume, b: DatabaseResume) => {
      const at = new Date(a.updated_at ?? a.created_at ?? 0).getTime();
      const bt = new Date(b.updated_at ?? b.created_at ?? 0).getTime();
      return bt - at;
    })[0];
    if (mostRecent) {
      setCurrentResumeId(mostRecent.id);
    }
  }, [paramResumeId, currentResume, allResumes, setCurrentResumeId]);

  useEffect(() => {
    resumeIdRef.current = currentResumeId;
  }, [currentResumeId]);

  useEffect(() => {
    if (!allResumes) return;
    if (currentResumeId && !allResumes.find((r: DatabaseResume) => r.id === currentResumeId)) {
      setCurrentResumeId(null);
    }
  }, [allResumes, currentResumeId, setCurrentResumeId]);

  const handleResumeSwitch = useCallback((resumeId: string) => {
    if (!allResumes || allResumes.length === 0) return;
    const found = allResumes.find((r: DatabaseResume) => r.id === resumeId);
    if (!found) return;
    if (resumeId === currentResumeId) return;
    fixGenerateAbortRef.current?.abort();
    fixGenerateAbortRef.current = null;
    preValidateAbortRef.current?.abort();
    preValidateAbortRef.current = null;
    preValidateMergedRef.current = null;
    setCurrentResumeId(resumeId);
    setTailorResult(null);
    setOriginalResume(null);
    setTailorError(null);
    setPreValidatorResult(null);
    setIsPreValidating(false);
    setFixSuggestions(null);
    setIsGeneratingFixes(false);
    setAppliedFixes([]);
    setRejectedBullets(new Set());
    setDismissedIssueIndices(new Set());
    setParsedJobInfo(null);
    toast.dismiss();
    toast.success('Resume switched — ready to tailor');
  }, [allResumes, currentResumeId]);

  const toggleSection = (sectionId: TailorSectionId) => {
    setEnabledSections(prev =>
      prev.includes(sectionId) ? prev.filter(s => s !== sectionId) : [...prev, sectionId]
    );
  };

  const resumeText = useMemo(() => {
    if (!currentResume) return '';
    return [
      currentResume.summary,
      ...currentResume.experience.map(e => `${e.position} ${e.company} ${e.description} ${e.achievements.join(' ')}`),
      ...currentResume.education.map(e => `${e.degree} ${e.field} ${e.institution}`),
      ...currentResume.skills,
    ].join(' ');
  }, [currentResume]);

  const handleTailor = useCallback(async () => {
    if (!jobDescription.trim()) { toast.error('Please paste a job description first'); return; }
    if (!currentResume) { toast.error('No resume to tailor'); return; }

    logTailorEvent('optimize-clicked', { resumeId: currentResumeId });
    setTailorError(null);
    setIsTailoring(true);
    setOriginalResume(currentResume);
    setProgress({ step: 'analyzing', progress: 5, message: 'Starting...' });
    setShowAppliedCTA(false);
    setAppliedResumeId(null);
    setAppliedResumeTitle(null);
    setAppliedJobInfo(null);
    setPreValidatorResult(null);
    setIsPreValidating(false);
    setDismissedIssueIndices(new Set());
    setFixSuggestions(null);
    setIsGeneratingFixes(false);
    setAppliedFixes([]);
    fixGenerateAbortRef.current?.abort();
    fixGenerateAbortRef.current = null;
    preValidateMergedRef.current = null;

    // Cancel any in-flight pre-validation from a previous tailor run
    preValidateAbortRef.current?.abort();
    preValidateAbortRef.current = null;

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
      setRevealedSections(new Set());

      // Progressive section reveal: sections populate one-by-one after result arrives
      const sectionOrder: TailorSectionId[] = ['summary', 'skills', 'experience', 'education', 'projects', 'certifications'];
      sectionOrder.forEach((sectionId, idx) => {
        setTimeout(() => {
          setRevealedSections(prev => new Set([...prev, sectionId]));
        }, idx * 180);
      });

      const jobInfo = superResult.jobParsed
        ? { title: superResult.jobParsed.title, company: superResult.jobParsed.company }
        : null;
      if (jobInfo) setParsedJobInfo(jobInfo);

      setPendingTailor({
        result: superResult,
        original: currentResume,
        jobInfo,
        sections: enabledSections,
        intensity,
        jobUrl: jobUrl || null,
      });

      // Fire-and-forget pre-validate: runs in background after result arrives
      setIsPreValidating(true);
      (async () => {
        const capturedResumeId = resumeIdRef.current;
        try {
          const mergedForValidation = buildMergedResume(currentResume, superResult, enabledSections, new Set());
          preValidateMergedRef.current = mergedForValidation;
          const thisAbort = new AbortController();
          preValidateAbortRef.current = thisAbort;
          try {
            const { data: vResult, error: vError } = await appwriteFunctions.invoke<ValidatorResult>('validate-tailor', {
              body: {
                originalResume: currentResume,
                jobDescription,
                finalResume: mergedForValidation,
                mustHaveKeywords: superResult.atsAnalysis?.criticalKeywords ?? [],
              },
            });
            // Only apply result if this is still the current pre-validate request and same resume
            if (!vError && vResult && preValidateAbortRef.current === thisAbort) {
              if (resumeIdRef.current !== capturedResumeId) return;
              setPreValidatorResult(vResult);
            }
          } finally {
            /* no-op: invoke does not use AbortController */
          }
        } catch {
          // Non-fatal — pre-validation is advisory only
        } finally {
          if (resumeIdRef.current !== capturedResumeId) return;
          setIsPreValidating(false);
        }
      })();
    } catch (error) {
      const err = error as TailorError;
      const rawMsg = err?.message;
      const safeMsg =
        typeof rawMsg === 'string' && rawMsg.length > 0
          ? rawMsg
          : typeof err === 'string'
            ? err
            : 'Failed to tailor resume';
      setTailorError({ message: safeMsg, code: err?.code });
    } finally {
      setIsTailoring(false);
      setProgress(null);
    }
  }, [jobDescription, currentResume, currentResumeId, intensity, customInstructions, executeAI, setPendingTailor, jobUrl, redactedResume, enabledSections]);

  const handleDismissIssue = useCallback((index: number) => {
    setDismissedIssueIndices(prev => new Set([...prev, index]));
  }, []);

  // Fire generate-fix-suggestions whenever pre-validation result arrives
  useEffect(() => {
    if (!preValidatorResult) {
      fixGenerateAbortRef.current?.abort();
      fixGenerateAbortRef.current = null;
      setFixSuggestions(null);
      setIsGeneratingFixes(false);
      return;
    }
    if (preValidatorResult.missing_keywords.length === 0 && preValidatorResult.issues.length === 0) {
      fixGenerateAbortRef.current?.abort();
      fixGenerateAbortRef.current = null;
      setIsGeneratingFixes(false);
      setFixSuggestions([]);
      return;
    }
    fixGenerateAbortRef.current?.abort();
    setIsGeneratingFixes(true);
    setFixSuggestions(null);
    (async () => {
      const thisAbort = new AbortController();
      fixGenerateAbortRef.current = thisAbort;
      const capturedResumeId = resumeIdRef.current;
      if (!preValidateMergedRef.current) {
        if (resumeIdRef.current !== capturedResumeId) return;
        setFixSuggestions([]);
        setIsGeneratingFixes(false);
        return;
      }
      try {
        const { data: fixes, error: fixError } = await appwriteFunctions.invoke<FixSuggestion[]>('generate-fix-suggestions', {
          body: {
            finalResume: preValidateMergedRef.current,
            jobDescription,
            missing_keywords: preValidatorResult.missing_keywords,
            issues: preValidatorResult.issues,
          },
        });
        if (fixGenerateAbortRef.current !== thisAbort) return;
        if (resumeIdRef.current !== capturedResumeId) return;
        if (!fixError && fixes) {
          setFixSuggestions(fixes.slice(0, 5));
        } else {
          setFixSuggestions([]);
        }
      } catch {
        if (fixGenerateAbortRef.current === thisAbort && resumeIdRef.current === capturedResumeId) setFixSuggestions([]);
      } finally {
        if (fixGenerateAbortRef.current === thisAbort && resumeIdRef.current === capturedResumeId) setIsGeneratingFixes(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preValidatorResult, jobDescription]);

  const handleApplyFix = useCallback((targetFix: FixSuggestion) => {
    setFixSuggestions(prev => {
      if (!prev) return prev;
      const idx = prev.findIndex(f =>
        f.type === targetFix.type &&
        f.after === targetFix.after &&
        f.target_id === targetFix.target_id
      );
      if (idx === -1) return prev;
      setAppliedFixes(current => {
        if (current.length >= MAX_APPLIED_FIXES) return current;
        const exists = current.some(f =>
          f.type === targetFix.type &&
          f.after === targetFix.after &&
          f.target_id === targetFix.target_id
        );
        if (exists) return current;
        return [...current, targetFix];
      });
      return prev.filter((_, i) => i !== idx);
    });
  }, []);

  const handleApplyChanges = useCallback(async () => {
    if (!tailorResult || !currentResume || !user) return;
    if (!currentResumeId) { toast.error('Please select a resume before applying changes.'); return; }

    logTailorEvent('apply-changes-clicked', { resumeId: currentResumeId });
    setIsApplying(true);
    try {
      const mergedResume = applyFixesOnTop(
        buildMergedResume(currentResume, tailorResult, enabledSections, rejectedBullets),
        appliedFixes,
        enabledSections,
      );

      const jobTitle = parsedJobInfo?.title || tailorResult.jobParsed?.title || 'Position';
      const company = parsedJobInfo?.company || tailorResult.jobParsed?.company || 'Company';
      const originalTitle = currentResume.contactInfo.fullName || 'Resume';
      const newTitle = `${originalTitle} - Tailored for ${jobTitle} @ ${company}`;

      // Phase: validate the final merged resume before saving.
      // The validator score is the single source of truth for job_match_score.
      // On timeout or error we fall back to the generator's estimated score.
      let validatorResult: ValidatorResult | null = null;
      try {
        const { data: vResult, error: vError } = await appwriteFunctions.invoke<ValidatorResult>('validate-tailor', {
          body: {
            originalResume: currentResume,
            jobDescription,
            finalResume: mergedResume,
            mustHaveKeywords: tailorResult.atsAnalysis?.criticalKeywords ?? [],
          },
        });
        if (!vError && vResult) {
          validatorResult = vResult;
        }
      } catch {
        // Non-fatal: validator error — fall back to generator score
      }

      const finalMatchScore =
        validatorResult !== null
          ? validatorResult.score
          : (tailorResult.overallScore?.after ?? null);

      const newDoc = await databases.createDocument(DATABASE_ID, COLLECTIONS.resumes, ID.unique(), {
        user_id: user.id,
        title: newTitle,
        contact_info: JSON.stringify(mergedResume.contactInfo),
        summary: mergedResume.summary,
        experience: JSON.stringify(mergedResume.experience),
        education: JSON.stringify(mergedResume.education),
        skills: JSON.stringify(mergedResume.skills),
        certifications: JSON.stringify(mergedResume.certifications),
        projects: JSON.stringify(mergedResume.projects),
        awards: JSON.stringify(mergedResume.awards),
        template: mergedResume.templateId || 'modern',
      });

      addTailorHistory({
        jobTitle,
        company,
        jobDescription,
        tailorResult,
        scoreBeforeAfter: tailorResult.overallScore ?? { before: 0, after: 0 },
        verifiedScore: finalMatchScore,
        appliedSections: enabledSections,
      }, currentResumeId || undefined);

      const matchedCount = validatorResult?.matched_keywords?.length ?? tailorResult.atsAnalysis?.matchedKeywords?.length ?? 0;
      setAppliedResumeId(newDoc.$id);
      setAppliedResumeTitle(newTitle);
      setAppliedJobInfo({ title: jobTitle, company });
      setAppliedScore(tailorResult.overallScore ?? null);
      setAppliedKeywordCount(matchedCount > 0 ? matchedCount : null);
      setAppliedValidatorResult(validatorResult);
      logTailorEvent('success-screen-shown', {
        score: tailorResult.overallScore,
        validatedScore: validatorResult?.score ?? null,
        keywordsMatched: matchedCount,
      });
      setShowAppliedCTA(true);
      setTailorResult(null);

      clearPendingTailor();
    } catch {
      toast.error('Failed to create tailored resume');
    } finally {
      setIsApplying(false);
    }
  }, [tailorResult, currentResume, user, enabledSections, rejectedBullets, appliedFixes, parsedJobInfo, currentResumeId, jobDescription, addTailorHistory, clearPendingTailor, jobUrl, navigate]);

  const handleCopyPlainText = useCallback(async () => {
    if (!currentResume || !tailorResult) return;
    const text = buildPlainText(currentResume, tailorResult, enabledSections);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(true);
      toast.success('Copied to clipboard!');
      if (copiedTextTimerRef.current) clearTimeout(copiedTextTimerRef.current);
      copiedTextTimerRef.current = setTimeout(() => setCopiedText(false), 2000);
    } catch {
      toast.error('Failed to copy — try again');
    }
  }, [currentResume, tailorResult, enabledSections]);

  const handleRegenerateSection = useCallback(async (sectionId: TailorSectionId, sectionInstruction?: string) => {
    if (!tailorResult) return;

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
        setTailorResult(prev => prev ? { ...prev, summary: result.rewrittenContent as string } : prev);
      } else if (sectionId === 'skills' && Array.isArray(result.rewrittenContent)) {
        setTailorResult(prev => prev ? { ...prev, skills: result.rewrittenContent as string[] } : prev);
      } else if (sectionId === 'experience' && Array.isArray(result.rewrittenContent)) {
        const newBullets = result.rewrittenContent as string[];
        setTailorResult(prev => {
          if (!prev) return prev;
          let bulletIdx = 0;
          const updatedExperience = prev.experience.map(exp => {
            const count = (exp.achievements ?? []).length;
            const slice = newBullets.slice(bulletIdx, bulletIdx + count);
            bulletIdx += count;
            return { ...exp, achievements: slice.length > 0 ? slice : exp.achievements };
          });
          return { ...prev, experience: updatedExperience, bulletTransformations: [] };
        });
      } else if (sectionId === 'education' && Array.isArray(result.rewrittenContent)) {
        const newFields = result.rewrittenContent as string[];
        setTailorResult(prev => {
          if (!prev) return prev;
          const updatedEducation = prev.education.map((edu, i) => ({
            ...edu,
            field: newFields[i] ?? edu.field,
          }));
          return { ...prev, education: updatedEducation };
        });
      } else if (sectionId === 'projects' && Array.isArray(result.rewrittenContent)) {
        const newDescriptions = result.rewrittenContent as string[];
        setTailorResult(prev => {
          if (!prev) return prev;
          const updatedProjects = (prev.projects ?? []).map((p, i) => ({
            ...p,
            description: (newDescriptions[i] ?? '').trim() || p.description,
          }));
          return { ...prev, projects: updatedProjects };
        });
      } else if (sectionId === 'certifications' && Array.isArray(result.rewrittenContent)) {
        const newNames = result.rewrittenContent as string[];
        setTailorResult(prev => {
          if (!prev) return prev;
          const updatedCertifications = (prev.certifications ?? []).map((c, i) => ({
            ...c,
            name: newNames[i] ?? c.name,
          }));
          return { ...prev, certifications: updatedCertifications };
        });
      }
      toast.success(`${sectionId.charAt(0).toUpperCase() + sectionId.slice(1)} section regenerated`);
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || 'Failed to regenerate section');
    }
  }, [tailorResult, jobDescription, customInstructions, intensity]);

  const handleTrackApplication = useCallback(() => {
    const jobTitle = appliedJobInfo?.title || parsedJobInfo?.title || tailorResult?.jobParsed?.title || '';
    const company = appliedJobInfo?.company || parsedJobInfo?.company || tailorResult?.jobParsed?.company || '';
    const params = new URLSearchParams();
    params.set('new', '1');
    if (jobTitle) params.set('title', jobTitle);
    if (company) params.set('company', company);
    if (appliedResumeId) params.set('resumeId', appliedResumeId);
    navigate(`/applications?${params.toString()}`);
  }, [navigate, parsedJobInfo, tailorResult, appliedResumeId, appliedJobInfo]);

  const handleViewResume = useCallback(() => {
    if (appliedResumeId) navigate(`/editor?id=${appliedResumeId}`);
  }, [navigate, appliedResumeId]);

  const handleCloseSuccess = useCallback(() => {
    setShowAppliedCTA(false);
    setAppliedResumeId(null);
    setAppliedResumeTitle(null);
    setAppliedJobInfo(null);
    setAppliedScore(null);
    setAppliedKeywordCount(null);
    setAppliedValidatorResult(null);
    navigate(-1);
  }, [navigate]);

  const handleGoToPortfolio = useCallback(() => {
    logTailorEvent('portfolio-cta-clicked', { resumeId: appliedResumeId });
    navigate('/portfolio');
  }, [navigate, appliedResumeId]);

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full">
      {/* Header */}
      <header className="shrink-0 sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Wand2 className="w-5 h-5 text-primary" />
            <h1 className="font-semibold text-sm">AI Resume Tailor</h1>
            <AICostBadge operation="tailor" />
          </div>
          <div className="flex items-center gap-2">
            {tailorResult && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopyPlainText}
                className="text-xs gap-1.5"
              >
                {copiedText ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedText ? 'Copied!' : 'Copy text'}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Two-panel layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel: Job input */}
        <div className="w-full lg:w-[420px] lg:border-r border-border overflow-y-auto lg:flex-shrink-0 p-4 space-y-4">
          {/* Resume Selector */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Tailoring resume</p>
            {allResumes === undefined ? (
              <div className="animate-pulse h-9 rounded-lg bg-muted w-full" />
            ) : allResumes.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  You don't have a resume yet. Upload your existing CV (PDF or DOCX) and
                  we'll tailor it for this job in seconds.
                </p>
                <Button
                  className="w-full"
                  onClick={() => navigate('/upload?next=/tailor')}
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  Upload your resume
                </Button>
              </div>
            ) : (
              <Select
                value={allResumes.some(r => r.id === currentResumeId) ? (currentResumeId ?? undefined) : undefined}
                onValueChange={handleResumeSwitch}
                disabled={isTailoring || isApplying}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a resume" />
                </SelectTrigger>
                <SelectContent>
                  {allResumes.map((r: DatabaseResume) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <JobUrlParser
            value={jobDescription}
            onChange={setJobDescription}
            onParsed={(info) => {
              setParsedJobInfo(info);
              if (info?.url) setJobUrl(info.url);
            }}
          />

          {/* Keyword Match Bar */}
          {jobDescription.trim() && currentResume && (
            <KeywordMatchBar jobDescription={jobDescription} resumeText={resumeText} />
          )}

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

          {/* Intensity */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Tailoring Intensity</h4>
            <ToggleGroup
              type="single"
              value={intensity}
              onValueChange={(val) => val && setIntensity(val as TailorIntensity)}
              className="w-full grid grid-cols-3"
            >
              <ToggleGroupItem value="light" className="text-xs gap-1">
                <Zap className="w-3.5 h-3.5" /> Light
              </ToggleGroupItem>
              <ToggleGroupItem value="moderate" className="text-xs gap-1">
                <Gauge className="w-3.5 h-3.5" /> Moderate
              </ToggleGroupItem>
              <ToggleGroupItem value="aggressive" className="text-xs gap-1">
                <Flame className="w-3.5 h-3.5" /> Aggressive
              </ToggleGroupItem>
            </ToggleGroup>
            <p className="text-[11px] text-muted-foreground">
              {intensity === 'light' && 'Minor keyword improvements'}
              {intensity === 'moderate' && 'Balanced rewrite with keyword optimization'}
              {intensity === 'aggressive' && 'Strong rewrite for maximum job match'}
            </p>
          </div>

          <Button
            className="w-full h-12 gradient-primary font-semibold"
            onClick={handleTailor}
            disabled={isTailoring || !jobDescription.trim() || !currentResume}
          >
            {isTailoring ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Optimizing...</>
            ) : (
              <><Wand2 className="w-5 h-5 mr-2" />Optimize Resume</>
            )}
          </Button>

          {!isTailoring && (
            <p className="text-xs text-center text-muted-foreground">
              AI will rewrite your resume to better match this job • Takes ~10–20 seconds
            </p>
          )}

          {/* On mobile, show results inline below the input */}
          <div className="lg:hidden">
            {(isTailoring || tailorResult || tailorError || showAppliedCTA) && (
              <ResultsPanel
                isTailoring={isTailoring}
                progress={progress}
                tailorResult={tailorResult}
                tailorError={tailorError}
                originalResume={originalResume}
                enabledSections={enabledSections}
                toggleSection={toggleSection}
                onApplyChanges={handleApplyChanges}
                onPreview={() => setShowTailorPreview(true)}
                isApplying={isApplying}
                onRetry={() => { setTailorError(null); handleTailor(); }}
                onSettings={() => {}}
                onRevert={() => { setTailorResult(null); setAppliedFixes([]); }}
                abortRef={abortRef}
                setIsTailoring={setIsTailoring}
                setProgress={setProgress}
                showAppliedCTA={showAppliedCTA}
                appliedResumeId={appliedResumeId}
                appliedResumeTitle={appliedResumeTitle}
                appliedJobInfo={appliedJobInfo}
                onViewResume={handleViewResume}
                onTrackApplication={handleTrackApplication}
                onCloseSuccess={handleCloseSuccess}
                onGoToPortfolio={handleGoToPortfolio}
                appliedScore={appliedScore}
                appliedKeywordCount={appliedKeywordCount}
                appliedValidatorResult={appliedValidatorResult}
                copiedText={copiedText}
                onCopyText={handleCopyPlainText}
                onReTailor={handleTailor}
                rejectedBullets={rejectedBullets}
                onBulletReject={setRejectedBullets}
                onRegenerate={handleRegenerateSection}
                revealedSections={revealedSections}
                preValidatorResult={preValidatorResult}
                isPreValidating={isPreValidating}
                dismissedIssueIndices={dismissedIssueIndices}
                onDismissIssue={handleDismissIssue}
                fixSuggestions={fixSuggestions}
                isGeneratingFixes={isGeneratingFixes}
                appliedFixes={appliedFixes}
                onApplyFix={handleApplyFix}
              />
            )}
          </div>
        </div>

        {/* Right panel: Results (desktop only) */}
        <div className="hidden lg:flex flex-1 flex-col min-w-0 overflow-y-auto p-4 space-y-4">
          {(isTailoring || tailorResult || tailorError || showAppliedCTA) ? (
            <ResultsPanel
              isTailoring={isTailoring}
              progress={progress}
              tailorResult={tailorResult}
              tailorError={tailorError}
              originalResume={originalResume}
              enabledSections={enabledSections}
              toggleSection={toggleSection}
              onApplyChanges={handleApplyChanges}
              onPreview={() => setShowTailorPreview(true)}
              isApplying={isApplying}
              onRetry={() => { setTailorError(null); handleTailor(); }}
              onSettings={() => {}}
              onRevert={() => { setTailorResult(null); setAppliedFixes([]); }}
              abortRef={abortRef}
              setIsTailoring={setIsTailoring}
              setProgress={setProgress}
              showAppliedCTA={showAppliedCTA}
              appliedResumeId={appliedResumeId}
              appliedResumeTitle={appliedResumeTitle}
              appliedJobInfo={appliedJobInfo}
              onViewResume={handleViewResume}
              onTrackApplication={handleTrackApplication}
              onCloseSuccess={handleCloseSuccess}
              onGoToPortfolio={handleGoToPortfolio}
              appliedScore={appliedScore}
              appliedKeywordCount={appliedKeywordCount}
              appliedValidatorResult={appliedValidatorResult}
              copiedText={copiedText}
              onCopyText={handleCopyPlainText}
              onReTailor={handleTailor}
              rejectedBullets={rejectedBullets}
              onBulletReject={setRejectedBullets}
              onRegenerate={handleRegenerateSection}
              revealedSections={revealedSections}
              preValidatorResult={preValidatorResult}
              isPreValidating={isPreValidating}
              dismissedIssueIndices={dismissedIssueIndices}
              onDismissIssue={handleDismissIssue}
              fixSuggestions={fixSuggestions}
              isGeneratingFixes={isGeneratingFixes}
              appliedFixes={appliedFixes}
              onApplyFix={handleApplyFix}
            />
          ) : (
            <TailorDemoPanel />
          )}
        </div>
      </div>


      {/* Tailored Resume Preview Sheet — ephemeral render of merged result */}
      <TailorPreviewSheet
        open={showTailorPreview}
        onOpenChange={setShowTailorPreview}
        resume={
          tailorResult && currentResume
            ? applyFixesOnTop(
                buildMergedResume(currentResume, tailorResult, enabledSections, rejectedBullets),
                appliedFixes,
                enabledSections,
              )
            : null
        }
        onApply={() => {
          setShowTailorPreview(false);
          handleApplyChanges();
        }}
        isApplying={isApplying}
        applyLabel={preValidatorResult ? `Apply (${preValidatorResult.score}% → Verified)` : `Apply (${enabledSections.length})`}
        jobTitle={parsedJobInfo?.title || tailorResult?.jobParsed?.title}
      />
    </div>
  );
}

function SectionRevealWrapper({ revealed, title, children }: { revealed: boolean; title: string; children: ReactNode }) {
  if (revealed) return <>{children}</>;
  return (
    <div className="rounded-xl border-2 border-l-4 border-primary/20 border-l-primary/40 bg-primary/5 p-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary/60" />
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
        </div>
        <div className="h-5 rounded w-12 bg-primary/20" />
      </div>
      <div className="mt-3 space-y-1.5">
        <div className="h-2 rounded bg-muted w-full" />
        <div className="h-2 rounded bg-muted w-4/5" />
      </div>
    </div>
  );
}

interface ResultsPanelProps {
  isTailoring: boolean;
  progress: TailorProgress | EnhancedTailorProgress | null;
  rejectedBullets: Set<string>;
  onBulletReject: (keys: Set<string>) => void;
  tailorResult: SuperTailorResult | null;
  tailorError: { message: string; code?: string } | null;
  originalResume: ResumeData | null;
  enabledSections: TailorSectionId[];
  toggleSection: (s: TailorSectionId) => void;
  onApplyChanges: () => void;
  onPreview: () => void;
  isApplying: boolean;
  onRetry: () => void;
  onSettings: () => void;
  onRevert: () => void;
  abortRef: ReturnType<typeof useRef<AbortController | null>>;
  setIsTailoring: (v: boolean) => void;
  setProgress: (v: TailorProgress | EnhancedTailorProgress | null) => void;
  showAppliedCTA: boolean;
  appliedResumeId: string | null;
  appliedResumeTitle: string | null;
  appliedJobInfo: { title: string; company: string } | null;
  onViewResume: () => void;
  onTrackApplication: () => void;
  onCloseSuccess: () => void;
  onGoToPortfolio: () => void;
  appliedScore: { before: number; after: number } | null;
  appliedKeywordCount: number | null;
  appliedValidatorResult: ValidatorResult | null;
  copiedText: boolean;
  onCopyText: () => void;
  onReTailor: () => void;
  onRegenerate: (sectionId: TailorSectionId, instruction?: string) => Promise<void>;
  revealedSections: Set<TailorSectionId>;
  preValidatorResult: ValidatorResult | null;
  isPreValidating: boolean;
  dismissedIssueIndices: Set<number>;
  onDismissIssue: (index: number) => void;
  fixSuggestions: FixSuggestion[] | null;
  isGeneratingFixes: boolean;
  appliedFixes: FixSuggestion[];
  onApplyFix: (fix: FixSuggestion) => void;
}

function ScoreLabel({ score }: { score: number }) {
  const color = score >= 85 ? 'text-success' : score >= 70 ? 'text-amber-500' : 'text-destructive';
  return <span className={cn('text-2xl font-bold tabular-nums', color)}>{score}%</span>;
}

/** Maps each issue index to the most relevant section (or 'global' for catch-all). */
function mapIssuesToSections(issues: string[]): Map<TailorSectionId | 'global', number[]> {
  const priorityMap: Array<{ sectionId: TailorSectionId | 'global'; keywords: string[] }> = [
    { sectionId: 'summary', keywords: ['summary', 'objective'] },
    { sectionId: 'education', keywords: ['education', 'degree', 'university', 'college', 'gpa', 'coursework'] },
    { sectionId: 'projects', keywords: ['project'] },
    { sectionId: 'certifications', keywords: ['certification', 'certificate', 'credential', 'licensed'] },
    // awards intentionally omitted — no callout render path in ResultsPanel; falls to 'global'
    { sectionId: 'skills', keywords: ['skill', 'technology', 'tool', 'hallucinated', 'fabricated', 'invented'] },
    { sectionId: 'experience', keywords: ['bullet', 'achievement', 'experience', 'position', 'responsible for', 'generic phrasing', 'vague', 'weak phrasing'] },
  ];

  const result = new Map<TailorSectionId | 'global', number[]>();
  issues.forEach((issue, i) => {
    const lower = issue.toLowerCase();
    let assigned = false;
    for (const { sectionId, keywords } of priorityMap) {
      if (keywords.some(kw => lower.includes(kw))) {
        if (!result.has(sectionId)) result.set(sectionId, []);
        result.get(sectionId)!.push(i);
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      if (!result.has('global')) result.set('global', []);
      result.get('global')!.push(i);
    }
  });
  return result;
}

interface SectionIssueCalloutsProps {
  sectionId: TailorSectionId;
  issueIndices: number[];
  issues: string[];
  dismissedIssueIndices: Set<number>;
  onDismissIssue: (index: number) => void;
}

function FixSuggestionCard({ fix, onApply }: { fix: FixSuggestion; onApply: () => void }) {
  const typeLabel =
    fix.type === 'add_skill'
      ? 'Add skill'
      : fix.type === 'improve_bullet'
        ? 'Improve bullet'
        : 'Enhance summary';

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-primary/70">
          {typeLabel}
        </span>
        <Button
          size="sm"
          variant="outline"
          className="h-6 px-2 text-[10px] shrink-0 border-primary/30 text-primary hover:bg-primary/10"
          onClick={onApply}
        >
          <CheckCircle className="w-3 h-3 mr-1" />
          Apply
        </Button>
      </div>
      {fix.before && (
        <p className="text-xs text-muted-foreground line-through leading-snug">{fix.before}</p>
      )}
      <p className="text-xs font-medium leading-snug line-clamp-6">{fix.after}</p>
      <p className="text-[11px] text-muted-foreground leading-snug">{fix.reason}</p>
    </div>
  );
}

function SectionIssueCallouts({ sectionId: _sectionId, issueIndices, issues, dismissedIssueIndices, onDismissIssue }: SectionIssueCalloutsProps) {
  const visible = issueIndices.filter(i => !dismissedIssueIndices.has(i));
  if (visible.length === 0) return null;
  return (
    <div className="space-y-1.5 -mt-1">
      {visible.map(i => (
        <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-foreground flex-1 leading-snug">{issues[i]}</p>
          <button
            onClick={() => onDismissIssue(i)}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

function ResultsPanel({
  isTailoring, progress, tailorResult, tailorError, originalResume,
  enabledSections, toggleSection, onApplyChanges, onPreview, isApplying,
  onRetry, onSettings, onRevert, abortRef, setIsTailoring, setProgress,
  showAppliedCTA, appliedResumeId, appliedResumeTitle, appliedJobInfo,
  onViewResume, onTrackApplication, onCloseSuccess, onGoToPortfolio, appliedScore,
  appliedKeywordCount, appliedValidatorResult,
  copiedText, onCopyText, onReTailor,
  rejectedBullets, onBulletReject, onRegenerate, revealedSections,
  preValidatorResult, isPreValidating, dismissedIssueIndices, onDismissIssue,
  fixSuggestions, isGeneratingFixes, appliedFixes, onApplyFix,
}: ResultsPanelProps) {
  const issueMap = useMemo(
    () => preValidatorResult ? mapIssuesToSections(preValidatorResult.issues) : new Map<TailorSectionId | 'global', number[]>(),
    [preValidatorResult]
  );

  const [discardConfirm, setDiscardConfirm] = useState(false);
  const discardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (discardTimerRef.current) clearTimeout(discardTimerRef.current); }, []);
  const handleDiscardClick = useCallback(() => {
    if (discardConfirm) {
      if (discardTimerRef.current) clearTimeout(discardTimerRef.current);
      setDiscardConfirm(false);
      onRevert();
    } else {
      if (discardTimerRef.current) clearTimeout(discardTimerRef.current);
      setDiscardConfirm(true);
      discardTimerRef.current = setTimeout(() => setDiscardConfirm(false), 3000);
    }
  }, [discardConfirm, onRevert]);

  const sectionDelta = useMemo<Record<'summary' | 'skills' | 'experience' | 'education', number>>(() => {
    if (!tailorResult?.sectionScores) return { summary: 0, skills: 0, experience: 0, education: 0 };
    const scores = tailorResult.sectionScores as unknown as Record<string, { before: number; after: number }>;
    return {
      summary: scores.summary ? scores.summary.after - scores.summary.before : 0,
      skills: scores.skills ? scores.skills.after - scores.skills.before : 0,
      experience: scores.experience ? scores.experience.after - scores.experience.before : 0,
      education: scores.education ? scores.education.after - scores.education.before : 0,
    };
  }, [tailorResult?.sectionScores]);

  const sortedCoreSections = useMemo(
    () =>
      (['summary', 'skills', 'experience', 'education'] as const)
        .slice()
        .sort((a, b) => sectionDelta[b] - sectionDelta[a]),
    [sectionDelta]
  );

  const topSectionId: 'summary' | 'skills' | 'experience' | 'education' = sortedCoreSections[0];

  const skillsChangesSummary = useMemo(() => {
    if (!tailorResult?.skills) return '0 skills optimized';
    if (!originalResume?.skills) return `${tailorResult.skills.length} skills optimized`;
    const diff = compareSkills(originalResume.skills, tailorResult.skills);
    return `Added ${diff.added.length} · Removed ${diff.removed.length} · Kept ${diff.unchanged.length}`;
  }, [originalResume?.skills, tailorResult?.skills]);

  const experienceChangesSummary = useMemo(() => {
    const bts = tailorResult?.bulletTransformations;
    if (!bts || bts.length === 0) return `${tailorResult?.experience?.length ?? 0} positions enhanced`;
    const uniqueCount = new Set(bts.map(bt => bt.experienceId)).size;
    return `${bts.length} bullet${bts.length !== 1 ? 's' : ''} optimized across ${uniqueCount} position${uniqueCount !== 1 ? 's' : ''}`;
  }, [tailorResult?.bulletTransformations, tailorResult?.experience?.length]);

  const summaryChangesSummary = useMemo(() => {
    if (!originalResume?.summary || !tailorResult?.summary) return 'Professional summary rewritten';
    const diffs = diffText(originalResume.summary, tailorResult.summary);
    const wordCount = diffs
      .filter(d => d.type !== 'unchanged')
      .reduce((acc, d) => acc + d.text.split(/\s+/).filter(Boolean).length, 0);
    if (wordCount === 0) return 'Professional summary rewritten';
    return `~${wordCount} word${wordCount !== 1 ? 's' : ''} changed`;
  }, [originalResume?.summary, tailorResult?.summary]);

  if (showAppliedCTA && !isTailoring && !tailorResult) {
    const validatedAfterScore = appliedValidatorResult?.score ?? appliedScore?.after ?? 0;
    const improvement = appliedScore ? validatedAfterScore - appliedScore.before : 0;
    const isVerified = appliedValidatorResult !== null;
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-12 px-6 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-success" />
        </div>
        <div className="space-y-2">
          <h3 className="font-bold text-xl">Your resume is now stronger for this job</h3>
          {appliedResumeTitle && (
            <p className="text-sm font-medium text-foreground break-words px-2">
              {appliedResumeTitle}
            </p>
          )}
          {appliedJobInfo && (
            <p className="text-muted-foreground text-xs">
              Tailored for {appliedJobInfo.title} at {appliedJobInfo.company}
            </p>
          )}
        </div>

        {appliedScore && (
          <div className="w-full max-w-xs rounded-2xl bg-card border border-border px-5 py-4">
            <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center justify-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              Match Score
            </p>
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <span className="text-2xl font-bold tabular-nums text-muted-foreground">{appliedScore.before}%</span>
                <p className="text-[10px] text-muted-foreground mt-0.5">Before</p>
              </div>
              <span className="text-muted-foreground text-lg">→</span>
              <div className="text-center">
                <ScoreLabel score={validatedAfterScore} />
                <p className="text-[10px] text-muted-foreground mt-0.5">After</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
              {improvement > 0 ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-success bg-success/10 px-2.5 py-0.5 rounded-full">
                  +{improvement} improvement
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Your resume has been refined and aligned with this role</span>
              )}
              <span className={cn(
                'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
                isVerified
                  ? 'bg-success/10 text-success'
                  : 'bg-muted text-muted-foreground'
              )}>
                {isVerified ? '✓ Verified' : '~ Estimated'}
              </span>
            </div>
            {appliedValidatorResult?.verdict && (
              <div className="mt-2 flex justify-center">
                <span className={cn(
                  'text-xs font-medium px-2.5 py-0.5 rounded-full',
                  appliedValidatorResult.verdict === 'strong'
                    ? 'bg-success/10 text-success'
                    : appliedValidatorResult.verdict === 'average'
                      ? 'bg-amber-500/10 text-amber-600'
                      : 'bg-destructive/10 text-destructive'
                )}>
                  {appliedValidatorResult.verdict === 'strong'
                    ? 'Strong match'
                    : appliedValidatorResult.verdict === 'average'
                      ? 'Average match'
                      : 'Weak match'}
                </span>
              </div>
            )}
            {appliedKeywordCount !== null && appliedKeywordCount > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                +{appliedKeywordCount} keywords matched
              </p>
            )}
            {appliedValidatorResult?.missing_keywords && appliedValidatorResult.missing_keywords.length > 0 && (
              <div className="mt-2 text-left">
                <p className="text-[10px] font-medium text-muted-foreground mb-1">Still missing:</p>
                <div className="flex flex-wrap gap-1">
                  {appliedValidatorResult.missing_keywords.slice(0, 5).map((kw, i) => (
                    <span key={i} className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">{kw}</span>
                  ))}
                  {appliedValidatorResult.missing_keywords.length > 5 && (
                    <span className="text-[10px] text-muted-foreground">+{appliedValidatorResult.missing_keywords.length - 5} more</span>
                  )}
                </div>
              </div>
            )}
            {appliedValidatorResult?.issues && appliedValidatorResult.issues.length > 0 && (
              <details className="mt-2 text-left">
                <summary className="text-[10px] font-medium text-muted-foreground cursor-pointer hover:text-foreground">
                  Review notes ({appliedValidatorResult.issues.length})
                </summary>
                <ul className="mt-1 space-y-0.5">
                  {appliedValidatorResult.issues.map((issue, i) => (
                    <li key={i} className="text-[10px] text-muted-foreground">• {issue}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 w-full max-w-xs">
          {appliedResumeId && (
            <Button className="gradient-primary min-h-[44px]" onClick={onViewResume}>
              <ExternalLink className="w-4 h-4 mr-2" />
              View Resume
            </Button>
          )}
          <Button variant="outline" className="min-h-[44px]" onClick={onTrackApplication}>
            <Briefcase className="w-4 h-4 mr-2" />
            Track Application
          </Button>
          <Button variant="outline" className="min-h-[44px]" onClick={onGoToPortfolio}>
            <Globe className="w-4 h-4 mr-2" />
            Turn this into a portfolio
          </Button>
          <Button variant="ghost" className="min-h-[44px]" onClick={onCloseSuccess}>
            Close
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {isTailoring && progress && (
        <TailorProgressComponent
          progress={progress}
          onCancel={() => {
            abortRef.current?.abort();
            setIsTailoring(false);
            setProgress(null);
            toast.info('Generation cancelled');
          }}
        />
      )}

      {isTailoring && progress && (() => {
        const pct = 'progress' in progress ? (progress as EnhancedTailorProgress).progress : 0;
        const step = 'step' in progress ? (progress as EnhancedTailorProgress).step : '';
        const sectionsReady: Record<string, boolean> = {
          summary: pct >= 35 || step === 'rewriting_summary' || step === 'optimizing_skills' || step === 'transforming_bullets' || step === 'calculating_ats' || step === 'finalizing',
          skills: pct >= 50 || step === 'optimizing_skills' || step === 'transforming_bullets' || step === 'calculating_ats' || step === 'finalizing',
          experience: pct >= 60 || step === 'transforming_bullets' || step === 'calculating_ats' || step === 'finalizing',
          education: pct >= 70 || step === 'calculating_ats' || step === 'finalizing',
        };
        return (
          <div className="space-y-3 animate-pulse">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Preparing changes...</span>
            </h4>
            {(['summary', 'skills', 'experience', 'education'] as TailorSectionId[]).map(s => (
              <div key={s} className={cn('rounded-xl border-2 border-l-4 p-4 transition-all',
                sectionsReady[s] ? 'border-primary/30 border-l-primary bg-primary/5' : 'border-border border-l-muted-foreground/20 bg-muted/30'
              )}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-4 h-4 rounded', sectionsReady[s] ? 'bg-primary/30' : 'bg-muted-foreground/20')} />
                    <div className={cn('h-3 rounded w-24', sectionsReady[s] ? 'bg-primary/30' : 'bg-muted-foreground/20')} />
                    {sectionsReady[s] && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                  </div>
                  <div className={cn('h-5 rounded w-12', sectionsReady[s] ? 'bg-primary/20' : 'bg-muted-foreground/10')} />
                </div>
                {sectionsReady[s] && (
                  <div className="mt-3 space-y-1.5">
                    <div className="h-2 rounded bg-muted w-full" />
                    <div className="h-2 rounded bg-muted w-5/6" />
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })()}

      {tailorError && !isTailoring && (
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-4">
          <div className="flex items-start gap-3">
            <HeartHandshake className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm">Something went wrong</h4>
              <p className="text-sm text-muted-foreground mt-1">{tailorError.message}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={onRetry} className="min-h-[44px]">
              <RefreshCw className="w-4 h-4 mr-1.5" /> Try Again
            </Button>
            <Button size="sm" variant="outline" onClick={onSettings} className="min-h-[44px]">
              <Key className="w-4 h-4 mr-1.5" /> Use Your Key
            </Button>
            <Button size="sm" variant="ghost" onClick={() => reportBug(new Error(tailorError.message), 'Tailor failed')} className="min-h-[44px] text-muted-foreground">
              <Bug className="w-4 h-4 mr-1.5" /> Report
            </Button>
          </div>
        </div>
      )}

      {tailorResult && !isTailoring && (
        <div className="space-y-4">
          {/* Success banner */}
          <div className="p-4 rounded-xl bg-success/10 border border-success/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-success" />
                <h4 className="font-semibold">Resume Tailored!</h4>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={onCopyText} className="text-xs gap-1.5">
                  {copiedText ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedText ? 'Copied!' : 'Copy text'}
                </Button>
                <Button size="sm" variant="ghost" onClick={onReTailor} className="text-xs gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5" /> Re-tailor
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Review changes below. A new tailored copy will be created — your original stays safe.
            </p>
          </div>

          {/* Score */}
          {tailorResult.overallScore && tailorResult.sectionScores && (
            <ScoreComparison
              beforeScore={tailorResult.overallScore.before}
              afterScore={tailorResult.overallScore.after}
              sectionScores={tailorResult.sectionScores}
              selectedSections={enabledSections}
            />
          )}

          {/* Confidence indicators — static trust signals */}
          <div className="flex flex-col gap-1.5 px-1">
            {[
              { icon: <Check className="w-3.5 h-3.5 text-success shrink-0" />, label: 'Keywords matched from job description' },
              { icon: <Shield className="w-3.5 h-3.5 text-primary shrink-0" />, label: 'ATS-friendly improvements applied' },
              { icon: <TrendingUp className="w-3.5 h-3.5 text-amber-500 shrink-0" />, label: 'Bullet points optimized for impact' },
            ].map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-xs text-muted-foreground">
                {icon}
                <span>{label}</span>
              </div>
            ))}
          </div>

          {/* Section changes — sorted by impact delta */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary" />
              Select Changes to Apply
            </h4>

            {sortedCoreSections.map(id => {
              const autoExpand = id === topSectionId && sectionDelta[id] > 0;
              if (id === 'summary') return (
                <Fragment key="summary">
                  <SectionRevealWrapper revealed={revealedSections.has('summary') || revealedSections.size === 0} title={SECTION_LABELS.summary}>
                    <SectionChangeCard
                      sectionId="summary"
                      title={SECTION_LABELS.summary}
                      enabled={enabledSections.includes('summary')}
                      onToggle={() => toggleSection('summary')}
                      impactScore={sectionDelta.summary}
                      changesSummary={summaryChangesSummary}
                      originalText={originalResume?.summary || ''}
                      tailoredText={tailorResult.summary}
                      onRegenerate={onRegenerate}
                      defaultExpanded={autoExpand}
                      preview={<p className="text-muted-foreground leading-relaxed">{tailorResult.summary}</p>}
                    />
                  </SectionRevealWrapper>
                  {preValidatorResult && issueMap.get('summary') && (
                    <SectionIssueCallouts sectionId="summary" issueIndices={issueMap.get('summary')!} issues={preValidatorResult.issues} dismissedIssueIndices={dismissedIssueIndices} onDismissIssue={onDismissIssue} />
                  )}
                </Fragment>
              );
              if (id === 'skills') return (
                <Fragment key="skills">
                  <SectionRevealWrapper revealed={revealedSections.has('skills') || revealedSections.size === 0} title={SECTION_LABELS.skills}>
                    <SectionChangeCard
                      sectionId="skills"
                      title={SECTION_LABELS.skills}
                      enabled={enabledSections.includes('skills')}
                      onToggle={() => toggleSection('skills')}
                      impactScore={sectionDelta.skills}
                      changesSummary={skillsChangesSummary}
                      originalSkills={originalResume?.skills || []}
                      tailoredSkills={tailorResult.skills}
                      onRegenerate={onRegenerate}
                      defaultExpanded={autoExpand}
                      preview={
                        <div className="flex flex-wrap gap-2">
                          {tailorResult.skills.slice(0, 10).map((skill, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">{skill}</Badge>
                          ))}
                          {tailorResult.skills.length > 10 && (
                            <Badge variant="outline" className="text-xs">+{tailorResult.skills.length - 10} more</Badge>
                          )}
                        </div>
                      }
                    />
                  </SectionRevealWrapper>
                  {preValidatorResult && issueMap.get('skills') && (
                    <SectionIssueCallouts sectionId="skills" issueIndices={issueMap.get('skills')!} issues={preValidatorResult.issues} dismissedIssueIndices={dismissedIssueIndices} onDismissIssue={onDismissIssue} />
                  )}
                </Fragment>
              );
              if (id === 'experience') return (
                <Fragment key="experience">
                  <SectionRevealWrapper revealed={revealedSections.has('experience') || revealedSections.size === 0} title={SECTION_LABELS.experience}>
                    <SectionChangeCard
                      sectionId="experience"
                      title={SECTION_LABELS.experience}
                      enabled={enabledSections.includes('experience')}
                      onToggle={() => toggleSection('experience')}
                      impactScore={sectionDelta.experience}
                      changesSummary={experienceChangesSummary}
                      bulletTransformations={tailorResult.bulletTransformations}
                      onBulletReject={onBulletReject}
                      onRegenerate={onRegenerate}
                      defaultExpanded={autoExpand}
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
                  </SectionRevealWrapper>
                  {preValidatorResult && issueMap.get('experience') && (
                    <SectionIssueCallouts sectionId="experience" issueIndices={issueMap.get('experience')!} issues={preValidatorResult.issues} dismissedIssueIndices={dismissedIssueIndices} onDismissIssue={onDismissIssue} />
                  )}
                </Fragment>
              );
              if (id === 'education') return (
                <Fragment key="education">
                  <SectionRevealWrapper revealed={revealedSections.has('education') || revealedSections.size === 0} title={SECTION_LABELS.education}>
                    <SectionChangeCard
                      sectionId="education"
                      title={SECTION_LABELS.education}
                      enabled={enabledSections.includes('education')}
                      onToggle={() => toggleSection('education')}
                      impactScore={sectionDelta.education}
                      changesSummary={`${tailorResult.education.length} entries refined`}
                      onRegenerate={onRegenerate}
                      defaultExpanded={autoExpand}
                      preview={
                        <ul className="space-y-1">
                          {tailorResult.education.map((edu, i) => (
                            <li key={i} className="text-muted-foreground text-sm">
                              {formatDegreeAndField(edu.degree, edu.field)}{edu.institution ? ` - ${edu.institution}` : ''}
                            </li>
                          ))}
                        </ul>
                      }
                    />
                  </SectionRevealWrapper>
                  {preValidatorResult && issueMap.get('education') && (
                    <SectionIssueCallouts sectionId="education" issueIndices={issueMap.get('education')!} issues={preValidatorResult.issues} dismissedIssueIndices={dismissedIssueIndices} onDismissIssue={onDismissIssue} />
                  )}
                </Fragment>
              );
              return null;
            })}

            {tailorResult.projects && tailorResult.projects.length > 0 && (
              <>
                <SectionRevealWrapper revealed={revealedSections.has('projects') || revealedSections.size === 0} title={SECTION_LABELS.projects}>
                  <SectionChangeCard
                    sectionId="projects"
                    title={SECTION_LABELS.projects}
                    enabled={enabledSections.includes('projects')}
                    onToggle={() => toggleSection('projects')}
                    impactScore={5}
                    changesSummary={`${tailorResult.projects.length} projects optimized`}
                    onRegenerate={onRegenerate}
                    preview={
                      <ul className="space-y-1">
                        {tailorResult.projects.map((p, i) => (
                          <li key={i} className="text-muted-foreground text-sm">
                            <span className="font-medium text-foreground">{p.name}</span>
                          </li>
                        ))}
                      </ul>
                    }
                  />
                </SectionRevealWrapper>
                {preValidatorResult && issueMap.get('projects') && (
                  <SectionIssueCallouts sectionId="projects" issueIndices={issueMap.get('projects')!} issues={preValidatorResult.issues} dismissedIssueIndices={dismissedIssueIndices} onDismissIssue={onDismissIssue} />
                )}
              </>
            )}

            {tailorResult.certifications && tailorResult.certifications.length > 0 && (
              <>
                <SectionRevealWrapper revealed={revealedSections.has('certifications') || revealedSections.size === 0} title={SECTION_LABELS.certifications}>
                  <SectionChangeCard
                    sectionId="certifications"
                    title={SECTION_LABELS.certifications}
                    enabled={enabledSections.includes('certifications')}
                    onToggle={() => toggleSection('certifications')}
                    impactScore={3}
                    changesSummary={`${tailorResult.certifications.length} certifications refined`}
                    onRegenerate={onRegenerate}
                    preview={
                      <ul className="space-y-1">
                        {tailorResult.certifications.map((c, i) => (
                          <li key={i} className="text-muted-foreground text-sm">{c.name} — {c.issuer}</li>
                        ))}
                      </ul>
                    }
                  />
                </SectionRevealWrapper>
                {preValidatorResult && issueMap.get('certifications') && (
                  <SectionIssueCallouts sectionId="certifications" issueIndices={issueMap.get('certifications')!} issues={preValidatorResult.issues} dismissedIssueIndices={dismissedIssueIndices} onDismissIssue={onDismissIssue} />
                )}
              </>
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

          {/* Pre-validation feedback — shown while loading or once result arrives */}
          {(isPreValidating || preValidatorResult) && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary shrink-0" />
                <h4 className="font-semibold text-sm flex-1">Validator Check</h4>
                {isPreValidating && !preValidatorResult && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Checking…
                  </span>
                )}
              </div>

              {preValidatorResult && (
                <>
                  {/* Score + verdict row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn(
                      'text-xs font-semibold px-2.5 py-0.5 rounded-full',
                      preValidatorResult.verdict === 'strong'
                        ? 'bg-success/10 text-success'
                        : preValidatorResult.verdict === 'average'
                          ? 'bg-amber-500/10 text-amber-600'
                          : 'bg-destructive/10 text-destructive'
                    )}>
                      {preValidatorResult.verdict === 'strong'
                        ? 'Strong'
                        : preValidatorResult.verdict === 'average'
                          ? 'Average'
                          : 'Weak'}
                    </span>
                    <span className="text-sm font-bold tabular-nums">{preValidatorResult.score}%</span>
                    <span className="text-xs text-muted-foreground">keyword match · Verified</span>
                  </div>

                  {/* Missing keywords */}
                  {preValidatorResult.missing_keywords.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">
                        Missing keywords — consider adding these before applying:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {preValidatorResult.missing_keywords.map((kw, i) => (
                          <span
                            key={i}
                            className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full border border-destructive/20 font-medium"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fix suggestions — shown between missing keywords and global issues */}
                  {(isGeneratingFixes || fixSuggestions !== null) && (
                    <div className="space-y-2 pt-1">
                      <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                        AI suggestions to improve your match
                        {isGeneratingFixes && (
                          <Loader2 className="w-3 h-3 animate-spin ml-1 text-muted-foreground" />
                        )}
                      </p>
                      {!isGeneratingFixes && fixSuggestions !== null && fixSuggestions.length === 0 && (
                        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-success/10 border border-success/20">
                          <CheckCircle className="w-4 h-4 text-success shrink-0" />
                          <p className="text-xs text-success font-medium">No critical issues found — your resume is well optimized for this role</p>
                        </div>
                      )}
                      {fixSuggestions?.map((fix) => (
                        <FixSuggestionCard
                          key={`${fix.type}-${fix.after}-${fix.target_id ?? ''}`}
                          fix={fix}
                          onApply={() => onApplyFix(fix)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Score-awareness note */}
                  {appliedFixes.length > 0 && (
                    <p className="text-[11px] text-muted-foreground bg-muted/60 rounded-md px-2.5 py-1.5 leading-snug">
                      Applied improvements will be reflected in your final score after you click Apply.
                    </p>
                  )}

                  {/* Global issues (not tied to any specific section) */}
                  {(issueMap.get('global') ?? []).length > 0 && (
                    <SectionIssueCallouts
                      sectionId="summary"
                      issueIndices={issueMap.get('global')!}
                      issues={preValidatorResult.issues}
                      dismissedIssueIndices={dismissedIssueIndices}
                      onDismissIssue={onDismissIssue}
                    />
                  )}
                </>
              )}
            </div>
          )}

          {/* Apply */}
          <div className="flex flex-col gap-2 pt-2">
            {tailorResult?.overallScore && tailorResult.overallScore.after > tailorResult.overallScore.before && (
              <p className="text-xs text-muted-foreground text-center">
                Your score will improve from {tailorResult.overallScore.before}%{' '}
                <span aria-hidden="true">→</span>{' '}
                {tailorResult.overallScore.after}%
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={discardConfirm ? 'destructive' : 'outline'}
                className="flex-1 min-w-[110px]"
                onClick={handleDiscardClick}
              >
                <X className="w-4 h-4 mr-2" />
                {discardConfirm ? 'Confirm discard?' : 'Discard'}
              </Button>
              <Button
                variant="outline"
                className="flex-1 min-w-[110px]"
                onClick={onPreview}
                disabled={enabledSections.length === 0}
              >
                <Eye className="w-4 h-4 mr-2" /> Preview
              </Button>
              <Button
                className="flex-1 min-w-[140px] gradient-primary"
                onClick={onApplyChanges}
                disabled={enabledSections.length === 0 || isApplying}
              >
                {isApplying ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                {isApplying ? 'Saving...' : 'Apply Improvements'}
              </Button>
            </div>
            <div className="flex flex-col gap-0.5 items-center">
              <p className="text-xs text-muted-foreground text-center">This will save an optimized copy — your original is always kept safe</p>
              <p className="text-[11px] text-muted-foreground/70 text-center">You can always edit your resume later</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
