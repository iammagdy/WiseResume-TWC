import { useState, useMemo, useCallback, useRef, useEffect, type ReactNode } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Wand2, Loader2, CheckCircle, ArrowLeft, Sparkles, Zap, Gauge, Flame,
  Settings, RefreshCw, Copy, Check, ExternalLink, ChevronDown, ChevronUp,
  Key, HeartHandshake, Bug, X, Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Textarea } from '@/components/ui/textarea';
import { useResumeStore } from '@/store/resumeStore';
import { tailorResumeWithProgress, tailorSection, TailorIntensity, TailorError } from '@/lib/aiTailor';
import { toast } from 'sonner';
import { TailorProgressComponent } from '@/components/editor/tailor/TailorProgress';
import { SectionChangeCard } from '@/components/editor/tailor/SectionChangeCard';
import { ScoreComparison } from '@/components/editor/tailor/ScoreComparison';
import { KeywordMatchBar } from '@/components/editor/tailor/KeywordMatchBar';
import { KeywordMatchList } from '@/components/editor/tailor/KeywordMatchList';
import { JobUrlParser } from '@/components/editor/tailor/JobUrlParser';
import { AICostBadge } from '@/components/ai/AICostBadge';
import { AISettingsSheet } from '@/components/settings/AISettingsSheet';
import { reportBug } from '@/lib/bugReport';
import { useAIAction } from '@/hooks/useAIAction';
import { useResumes, dbToResumeData, DatabaseResume } from '@/hooks/useResumes';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/safeClient';
import { useRedactedResume } from '@/hooks/useRedactedResume';
import {
  SuperTailorResult,
  TailorProgress,
  TailorSectionId,
  ResumeData,
  EnhancedTailorProgress,
} from '@/types/resume';
import { cn } from '@/lib/utils';
import { useShallow } from 'zustand/react/shallow';
import { Json } from '@/integrations/supabase/types';
import { activityTracker } from '@/lib/activityTracker';

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
      for (const ach of exp.achievements) {
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
      lines.push('');
    }
  }

  return lines.join('\n').trim();
}

export default function TailorPage() {
  const navigate = useNavigate();
  const { resumeId: paramResumeId } = useParams<{ resumeId?: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const {
    currentResume,
    currentResumeId,
    jobDescription,
    setJobDescription,
    addTailorHistory,
    setPendingTailor,
    clearPendingTailor,
    setCurrentResumeId,
    setCurrentResume,
    pendingTailorResult,
    pendingTailorOriginal,
    pendingTailorJobInfo,
    pendingTailorIntensity,
    pendingTailorJobUrl,
  } = useResumeStore(useShallow(state => ({
    currentResume: state.currentResume,
    currentResumeId: state.currentResumeId,
    jobDescription: state.jobDescription,
    setJobDescription: state.setJobDescription,
    addTailorHistory: state.addTailorHistory,
    setPendingTailor: state.setPendingTailor,
    clearPendingTailor: state.clearPendingTailor,
    setCurrentResumeId: state.setCurrentResumeId,
    setCurrentResume: state.setCurrentResume,
    pendingTailorResult: state.pendingTailorResult,
    pendingTailorOriginal: state.pendingTailorOriginal,
    pendingTailorJobInfo: state.pendingTailorJobInfo,
    pendingTailorIntensity: state.pendingTailorIntensity,
    pendingTailorJobUrl: state.pendingTailorJobUrl,
  })));

  const { data: allResumes } = useResumes();

  const [isTailoring, setIsTailoring] = useState(false);
  const [tailorResult, setTailorResult] = useState<SuperTailorResult | null>(null);
  const [originalResume, setOriginalResume] = useState<ResumeData | null>(null);
  const [progress, setProgress] = useState<TailorProgress | EnhancedTailorProgress | null>(null);
  const [parsedJobInfo, setParsedJobInfo] = useState<{ title: string; company: string } | null>(null);
  const [intensity, setIntensity] = useState<TailorIntensity>('moderate');
  const [isApplying, setIsApplying] = useState(false);
  const [jobUrl, setJobUrl] = useState<string | undefined>(undefined);
  const [tailorError, setTailorError] = useState<{ message: string; code?: string } | null>(null);
  const [showAISettings, setShowAISettings] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [showAppliedCTA, setShowAppliedCTA] = useState(false);
  const [appliedResumeId, setAppliedResumeId] = useState<string | null>(null);

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
  const { execute: executeAI } = useAIAction({ operation: 'tailor' });
  const redactedResume = useRedactedResume(currentResume as ResumeData | null);

  useEffect(() => {
    activityTracker.setActiveFeature('Smart Tailor');
    return () => { activityTracker.setActiveFeature(null); };
  }, []);

  useEffect(() => {
    if (customInstructions) {
      localStorage.setItem(CUSTOM_INSTRUCTIONS_KEY, customInstructions);
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
      setEnabledSections(['summary', 'skills', 'experience', 'education', 'projects', 'certifications', 'awards']);
      setShowAppliedCTA(!!pendingTailorJobUrl);
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
      setCurrentResume(dbToResumeData(found));
    }
  }, [paramResumeId, allResumes, currentResumeId, setCurrentResumeId, setCurrentResume]);

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

    setTailorError(null);
    setIsTailoring(true);
    setOriginalResume(currentResume);
    setProgress({ step: 'analyzing', progress: 5, message: 'Starting...' });
    setEnabledSections(['summary', 'skills', 'experience', 'education', 'projects', 'certifications', 'awards']);
    setShowAppliedCTA(false);

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
        sections: ['summary', 'skills', 'experience', 'education', 'projects', 'certifications', 'awards'],
        intensity,
        jobUrl: jobUrl || null,
      });
    } catch (error) {
      const err = error as TailorError;
      setTailorError({ message: err.message || 'Failed to tailor resume', code: err.code });
    } finally {
      setIsTailoring(false);
      setProgress(null);
    }
  }, [jobDescription, currentResume, intensity, customInstructions, executeAI, setPendingTailor, jobUrl, redactedResume]);

  const handleApplyChanges = useCallback(async () => {
    if (!tailorResult || !currentResume || !user) return;
    if (!currentResumeId) { toast.error('Please select a resume before applying changes.'); return; }

    setIsApplying(true);
    try {
      const mergedResume: ResumeData = { ...currentResume };

      if (enabledSections.includes('summary')) mergedResume.summary = tailorResult.summary;
      if (enabledSections.includes('skills')) mergedResume.skills = tailorResult.skills;
      if (enabledSections.includes('experience')) {
        mergedResume.experience = currentResume.experience.map(orig => {
          const tailored = tailorResult.experience.find(e => e.id === orig.id);
          if (!tailored) return orig;
          const merged = { ...orig, ...tailored };
          if (tailorResult.bulletTransformations && orig.achievements) {
            const mergedAchievements = [...(tailored.achievements ?? orig.achievements)];
            tailorResult.bulletTransformations
              .filter(bt => bt.experienceId === orig.id && rejectedBullets.has(`${bt.experienceId}-${bt.bulletIndex}`))
              .forEach(bt => { mergedAchievements[bt.bulletIndex] = bt.originalBullet; });
            merged.achievements = mergedAchievements;
          }
          return merged;
        });
      }
      if (enabledSections.includes('education')) {
        mergedResume.education = currentResume.education.map(orig => {
          const tailored = tailorResult.education.find(e => e.id === orig.id);
          return tailored ? { ...orig, ...tailored } : orig;
        });
      }
      if (enabledSections.includes('projects') && tailorResult.projects) mergedResume.projects = tailorResult.projects;
      if (enabledSections.includes('certifications') && tailorResult.certifications) mergedResume.certifications = tailorResult.certifications;
      if (enabledSections.includes('awards') && tailorResult.awards) mergedResume.awards = tailorResult.awards;

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
          job_match_score: tailorResult.overallScore?.after ?? null,
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

      setAppliedResumeId(newResume?.id || null);
      setShowAppliedCTA(true);

      toast.success('Tailored resume created! Original preserved.', { duration: 4000 });
      clearPendingTailor();
    } catch (error) {
      console.error('Apply error:', error);
      toast.error('Failed to create tailored resume');
    } finally {
      setIsApplying(false);
    }
  }, [tailorResult, currentResume, user, enabledSections, rejectedBullets, parsedJobInfo, currentResumeId, jobDescription, addTailorHistory, clearPendingTailor, jobUrl, navigate]);

  const handleCopyPlainText = useCallback(async () => {
    if (!currentResume || !tailorResult) return;
    const text = buildPlainText(currentResume, tailorResult, enabledSections);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopiedText(false), 2000);
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
      if (sectionId === 'education') return tailorResult.education.map(e => `${e.degree} ${e.field} ${e.institution}`);
      if (sectionId === 'projects') return (tailorResult.projects ?? []).map(p => p.name);
      if (sectionId === 'certifications') return (tailorResult.certifications ?? []).map(c => c.name);
      return null;
    };

    const currentContent = getCurrentContent();
    if (currentContent === null) return;

    const combinedInstructions = [customInstructions, sectionInstruction].filter(Boolean).join(' | ') || undefined;

    try {
      const result = await tailorSection({
        section: sectionId,
        currentContent,
        jobDescription,
        jobKeywords: tailorResult.atsAnalysis?.criticalKeywords,
        userInstructions: combinedInstructions,
        intensity,
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
        const newDescriptions = result.rewrittenContent as string[];
        setTailorResult(prev => {
          if (!prev) return prev;
          const updatedEducation = prev.education.map((edu, i) => ({
            ...edu,
            description: newDescriptions[i] ?? edu.description,
          }));
          return { ...prev, education: updatedEducation };
        });
      } else if (sectionId === 'projects' && Array.isArray(result.rewrittenContent)) {
        const newNames = result.rewrittenContent as string[];
        setTailorResult(prev => {
          if (!prev) return prev;
          const updatedProjects = (prev.projects ?? []).map((p, i) => ({
            ...p,
            name: newNames[i] ?? p.name,
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
    const jobTitle = parsedJobInfo?.title || tailorResult?.jobParsed?.title || '';
    const company = parsedJobInfo?.company || tailorResult?.jobParsed?.company || '';
    const params = new URLSearchParams();
    params.set('new', '1');
    if (jobTitle) params.set('title', jobTitle);
    if (company) params.set('company', company);
    if (appliedResumeId) params.set('resumeId', appliedResumeId);
    navigate(`/applications?${params.toString()}`);
  }, [navigate, parsedJobInfo, tailorResult, appliedResumeId]);

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
            <Button size="sm" variant="ghost" onClick={() => setShowAISettings(true)}>
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Two-panel layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel: Job input */}
        <div className="w-full lg:w-[420px] lg:border-r border-border overflow-y-auto lg:flex-shrink-0 p-4 space-y-4">
          {/* Resume picker */}
          {!currentResume && (
            <div className="p-4 rounded-xl bg-muted border border-border space-y-3">
              <h4 className="font-semibold text-sm">Select a resume to tailor</h4>
              {allResumes && allResumes.length > 0 ? (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {allResumes.map((r: DatabaseResume) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        setCurrentResumeId(r.id);
                        setCurrentResume(dbToResumeData(r));
                      }}
                      className="w-full text-left p-3 rounded-lg border border-border bg-card hover:border-primary/30 min-h-[48px] flex items-center gap-3 transition-all"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{r.title}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No resumes yet. Create one first!</p>
              )}
            </div>
          )}

          {currentResume && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/20">
              <Wand2 className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm font-medium truncate flex-1">{currentResume.contactInfo.fullName || 'Resume'}</span>
            </div>
          )}

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
              {intensity === 'light' && 'Minimal keyword tweaks, preserves your voice'}
              {intensity === 'moderate' && 'Balanced rewrite with keyword optimization'}
              {intensity === 'aggressive' && 'Maximum ATS compatibility, extensive rewrite'}
            </p>
          </div>

          <Button
            className="w-full h-12 gradient-primary font-semibold"
            onClick={handleTailor}
            disabled={isTailoring || !jobDescription.trim() || !currentResume}
          >
            {isTailoring ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Tailoring Resume...</>
            ) : (
              <><Wand2 className="w-5 h-5 mr-2" />Tailor My Resume</>
            )}
          </Button>

          {/* On mobile, show results inline below the input */}
          <div className="lg:hidden">
            {(isTailoring || tailorResult || tailorError) && (
              <ResultsPanel
                isTailoring={isTailoring}
                progress={progress}
                tailorResult={tailorResult}
                tailorError={tailorError}
                originalResume={originalResume}
                enabledSections={enabledSections}
                toggleSection={toggleSection}
                onApplyChanges={handleApplyChanges}
                isApplying={isApplying}
                onRetry={() => { setTailorError(null); handleTailor(); }}
                onSettings={() => setShowAISettings(true)}
                onRevert={() => setTailorResult(null)}
                abortRef={abortRef}
                setIsTailoring={setIsTailoring}
                setProgress={setProgress}
                showAppliedCTA={showAppliedCTA}
                onTrackApplication={handleTrackApplication}
                copiedText={copiedText}
                onCopyText={handleCopyPlainText}
                onReTailor={handleTailor}
                rejectedBullets={rejectedBullets}
                onBulletReject={setRejectedBullets}
                onRegenerate={handleRegenerateSection}
                revealedSections={revealedSections}
              />
            )}
          </div>
        </div>

        {/* Right panel: Results (desktop only) */}
        <div className="hidden lg:flex flex-1 flex-col min-w-0 overflow-y-auto p-4 space-y-4">
          {(isTailoring || tailorResult || tailorError) ? (
            <ResultsPanel
              isTailoring={isTailoring}
              progress={progress}
              tailorResult={tailorResult}
              tailorError={tailorError}
              originalResume={originalResume}
              enabledSections={enabledSections}
              toggleSection={toggleSection}
              onApplyChanges={handleApplyChanges}
              isApplying={isApplying}
              onRetry={() => { setTailorError(null); handleTailor(); }}
              onSettings={() => setShowAISettings(true)}
              onRevert={() => setTailorResult(null)}
              abortRef={abortRef}
              setIsTailoring={setIsTailoring}
              setProgress={setProgress}
              showAppliedCTA={showAppliedCTA}
              onTrackApplication={handleTrackApplication}
              copiedText={copiedText}
              onCopyText={handleCopyPlainText}
              onReTailor={handleTailor}
              rejectedBullets={rejectedBullets}
              onBulletReject={setRejectedBullets}
              onRegenerate={handleRegenerateSection}
              revealedSections={revealedSections}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-center text-muted-foreground px-8">
              <div>
                <Wand2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="font-medium">Your tailored results will appear here</p>
                <p className="text-sm mt-1">Paste a job description and click "Tailor My Resume"</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <AISettingsSheet open={showAISettings} onOpenChange={setShowAISettings} />
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
  isApplying: boolean;
  onRetry: () => void;
  onSettings: () => void;
  onRevert: () => void;
  abortRef: ReturnType<typeof useRef<AbortController | null>>;
  setIsTailoring: (v: boolean) => void;
  setProgress: (v: TailorProgress | EnhancedTailorProgress | null) => void;
  showAppliedCTA: boolean;
  onTrackApplication: () => void;
  copiedText: boolean;
  onCopyText: () => void;
  onReTailor: () => void;
  onRegenerate: (sectionId: TailorSectionId, instruction?: string) => Promise<void>;
  revealedSections: Set<TailorSectionId>;
}

function ResultsPanel({
  isTailoring, progress, tailorResult, tailorError, originalResume,
  enabledSections, toggleSection, onApplyChanges, isApplying,
  onRetry, onSettings, onRevert, abortRef, setIsTailoring, setProgress,
  showAppliedCTA, onTrackApplication, copiedText, onCopyText, onReTailor,
  rejectedBullets, onBulletReject, onRegenerate, revealedSections,
}: ResultsPanelProps) {
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

          {/* Track Application CTA */}
          {showAppliedCTA && (
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-500" />
                <p className="text-sm font-medium">Track this application?</p>
              </div>
              <Button size="sm" onClick={onTrackApplication} className="gap-1.5 shrink-0">
                <ExternalLink className="w-3.5 h-3.5" />
                Track
              </Button>
            </div>
          )}

          {/* Score */}
          {tailorResult.overallScore && tailorResult.sectionScores && (
            <ScoreComparison
              beforeScore={tailorResult.overallScore.before}
              afterScore={tailorResult.overallScore.after}
              sectionScores={tailorResult.sectionScores}
              selectedSections={enabledSections}
            />
          )}

          {/* Section changes */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary" />
              Select Changes to Apply
            </h4>

            <SectionRevealWrapper revealed={revealedSections.has('summary') || revealedSections.size === 0} title={SECTION_LABELS.summary}>
              <SectionChangeCard
                sectionId="summary"
                title={SECTION_LABELS.summary}
                enabled={enabledSections.includes('summary')}
                onToggle={() => toggleSection('summary')}
                impactScore={tailorResult.sectionScores ? tailorResult.sectionScores.summary.after - tailorResult.sectionScores.summary.before : 0}
                changesSummary="Professional summary rewritten"
                originalText={originalResume?.summary || ''}
                tailoredText={tailorResult.summary}
                onRegenerate={onRegenerate}
                preview={<p className="text-muted-foreground leading-relaxed">{tailorResult.summary}</p>}
              />
            </SectionRevealWrapper>

            <SectionRevealWrapper revealed={revealedSections.has('skills') || revealedSections.size === 0} title={SECTION_LABELS.skills}>
              <SectionChangeCard
                sectionId="skills"
                title={SECTION_LABELS.skills}
                enabled={enabledSections.includes('skills')}
                onToggle={() => toggleSection('skills')}
                impactScore={tailorResult.sectionScores ? tailorResult.sectionScores.skills.after - tailorResult.sectionScores.skills.before : 0}
                changesSummary={`${tailorResult.skills.length} skills optimized`}
                originalSkills={originalResume?.skills || []}
                tailoredSkills={tailorResult.skills}
                onRegenerate={onRegenerate}
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

            <SectionRevealWrapper revealed={revealedSections.has('experience') || revealedSections.size === 0} title={SECTION_LABELS.experience}>
              <SectionChangeCard
                sectionId="experience"
                title={SECTION_LABELS.experience}
                enabled={enabledSections.includes('experience')}
                onToggle={() => toggleSection('experience')}
                impactScore={tailorResult.sectionScores ? tailorResult.sectionScores.experience.after - tailorResult.sectionScores.experience.before : 0}
                changesSummary={`${tailorResult.experience.length} positions enhanced`}
                bulletTransformations={tailorResult.bulletTransformations}
                onBulletReject={onBulletReject}
                onRegenerate={onRegenerate}
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

            <SectionRevealWrapper revealed={revealedSections.has('education') || revealedSections.size === 0} title={SECTION_LABELS.education}>
              <SectionChangeCard
                sectionId="education"
                title={SECTION_LABELS.education}
                enabled={enabledSections.includes('education')}
                onToggle={() => toggleSection('education')}
                impactScore={tailorResult.sectionScores ? tailorResult.sectionScores.education.after - tailorResult.sectionScores.education.before : 0}
                changesSummary={`${tailorResult.education.length} entries refined`}
                onRegenerate={onRegenerate}
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
            </SectionRevealWrapper>

            {tailorResult.projects && tailorResult.projects.length > 0 && (
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
            )}

            {tailorResult.certifications && tailorResult.certifications.length > 0 && (
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

          {/* Apply */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={onRevert}>
              <X className="w-4 h-4 mr-2" /> Discard
            </Button>
            <Button
              className="flex-1 gradient-primary"
              onClick={onApplyChanges}
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
        </div>
      )}
    </div>
  );
}
