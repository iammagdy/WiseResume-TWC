import { useState, useEffect, lazy, Suspense } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { FileText, Upload, Copy, ArrowRight, GitBranch, Linkedin, Type, Loader2, Check, Clock, Zap } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

const ProfileImportSheet = lazy(() =>
  import('@/components/settings/ProfileImportSheet').then((m) => ({ default: m.ProfileImportSheet })),
);
import { v4 as uuidv4 } from 'uuid';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useResumeMutations, DatabaseResume, dbToResumeData, parseDbResume } from '@/hooks/useResumes';
import haptics from '@/lib/haptics';
import { useResumeStore } from '@/store/resumeStore';
import { supabase } from '@/integrations/supabase/safeClient';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { useAuth } from '@/hooks/useAuth';
import { getUserId } from '@/lib/supabaseBridge';
import { useProfile } from '@/hooks/useProfile';
import { usePlan } from '@/hooks/usePlan';
import { UpgradeWall } from '@/components/plan/UpgradeWall';
import { Json } from '@/integrations/supabase/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { ProfileData } from '@/components/settings/ProfileImportSheet';
import type { Experience, Education, Certification, TemplateId } from '@/types/resume';
import { TemplateThumbnail } from '@/components/editor/TemplateThumbnail';
import { templates, sampleResumeData } from '@/lib/templateData';

function mapProfileDataToResumeFields(data: Partial<ProfileData>): {
  experience: Experience[];
  education: Education[];
  skills: string[];
  certifications: Certification[];
} {
  return {
    experience: (data.experience || []).map((exp, i) => ({
      id: String(i + 1),
      company: exp.company,
      position: exp.title,
      startDate: exp.startDate,
      endDate: exp.endDate,
      current: exp.current,
      description: exp.description,
      achievements: [],
    })),
    education: (data.education || []).map((edu, i) => ({
      id: String(i + 1),
      institution: edu.institution,
      degree: edu.degree,
      field: edu.field || '',
      startDate: edu.startYear || '',
      endDate: edu.endYear || '',
    })),
    skills: data.skills || [],
    certifications: (data.certifications || []).map((c, i) => ({
      id: String(i + 1),
      name: c.name,
      issuer: c.organization || '',
      date: c.date || '',
    })),
  };
}

interface CreateResumeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingResumes?: DatabaseResume[];
  parentResumeId?: string | null;
  defaultTemplateId?: string | null;
  onLinkedInImport?: () => void;
}

type CreateMode = 'blank' | 'upload' | 'duplicate' | 'tailored' | 'paste';
type ExperienceLevel = 'student' | 'early' | 'mid' | 'senior' | 'career-change';

const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string; description: string }[] = [
  { value: 'student', label: 'Student', description: 'Currently in school or recently graduated' },
  { value: 'early', label: 'Early Career', description: '0–3 years of professional experience' },
  { value: 'mid', label: 'Mid-Level', description: '3–8 years of professional experience' },
  { value: 'senior', label: 'Senior', description: '8+ years or leadership/specialist role' },
  { value: 'career-change', label: 'Career Change', description: 'Transitioning to a new field' },
];

export function CreateResumeDialog({
  open,
  onOpenChange,
  existingResumes = [],
  parentResumeId,
  defaultTemplateId,
  onLinkedInImport,
}: CreateResumeDialogProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPro, isLoading: planLoading } = usePlan();
  const { profile } = useProfile(user?.id);
  const { createResume, duplicateResume } = useResumeMutations();
  const { setCurrentResume, setCurrentResumeId } = useResumeStore();
  const queryClient = useQueryClient();

  const [isCreatingTrial, setIsCreatingTrial] = useState(false);
  const [mode, setMode] = useState<CreateMode | null>(null);
  const [showLocalImport, setShowLocalImport] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);

  // Guided intake state for "Start from Scratch"
  const [blankStep, setBlankStep] = useState<'intake' | 'template' | 'title'>('intake');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | ''>('');
  const [intakeJobTitle, setIntakeJobTitle] = useState('');
  const [selectedDialogTemplate, setSelectedDialogTemplate] = useState<TemplateId>((defaultTemplateId as TemplateId) || 'modern');

  // Build-from-text state
  const [pasteText, setPasteText] = useState('');
  const [pasteTitle, setPasteTitle] = useState('My Resume');
  const [pasteError, setPasteError] = useState<string | null>(null);

  // Tailored form extra fields
  const [tailoredJobTitle, setTailoredJobTitle] = useState('');
  const [tailoredCompany, setTailoredCompany] = useState('');
  const [tailoredJobDescription, setTailoredJobDescription] = useState('');

  // Auto-set mode to tailored when parentResumeId is provided
  useEffect(() => {
    if (parentResumeId && open) {
      setMode('tailored');
      const parentResume = existingResumes.find(r => r.id === parentResumeId);
      if (parentResume) {
        setTitle(`${parentResume.title} - Tailored`);
        setTailoredJobTitle(parentResume.target_job_title || '');
        setTailoredCompany(parentResume.target_company || '');
      }
    }
  }, [parentResumeId, open, existingResumes]);

  const handleStartBlank = async () => {
    if (!title.trim()) return;
    
    // Guest fallback: create local-only resume
    if (!user) {
      const guestId = uuidv4();
      setCurrentResumeId(guestId);
      setCurrentResume({
        id: guestId,
        contactInfo: { fullName: '', email: '', phone: '', location: '', linkedin: '' },
        summary: '',
        experience: [],
        education: [],
        skills: [],
        certifications: [],
        templateId: selectedDialogTemplate || defaultTemplateId || 'modern',
      });
      onOpenChange(false);
      // Pass intake params so EditorPage can apply section ordering and queue summary stub
      const guestParams = new URLSearchParams();
      guestParams.set('experienceLevel', experienceLevel || 'mid');
      if (intakeJobTitle.trim()) guestParams.set('intakeJobTitle', intakeJobTitle.trim());
      navigate(`/editor?${guestParams.toString()}`);
      return;
    }

    setIsCreating(true);
    try {
      const newResume = await createResume.mutateAsync({
        resume: {
          contactInfo: { 
            fullName: profile?.fullName || '', 
            email: '', 
            phone: '', 
            location: profile?.location || '',
            linkedin: profile?.linkedinUrl || '',
          },
          summary: '',
          experience: [],
          education: [],
          skills: [],
          certifications: [],
          templateId: selectedDialogTemplate || defaultTemplateId || 'modern',
        },
        title: title.trim(),
      });

      // Persist target job title and experience level via customization JSON column
      if (intakeJobTitle.trim() || experienceLevel) {
        await supabase
          .from('resumes')
          .update({
            target_job_title: intakeJobTitle.trim() || null,
            customization: { experienceLevel: experienceLevel || null },
          })
          .eq('id', newResume.id);
      }
      
      setCurrentResumeId(newResume.id);
      setCurrentResume({
        id: newResume.id,
        contactInfo: newResume.contact_info,
        summary: newResume.summary,
        experience: newResume.experience || [],
        education: newResume.education || [],
        skills: newResume.skills || [],
        certifications: newResume.certifications || [],
        templateId: newResume.template_id,
      });
      
      onOpenChange(false);
      // Navigate with experience level so the editor can reorder sections
      const params = new URLSearchParams();
      params.set('experienceLevel', experienceLevel || 'mid');
      if (intakeJobTitle.trim()) params.set('intakeJobTitle', intakeJobTitle.trim());
      navigate(`/editor?${params.toString()}`);
    } catch (error) {
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpload = () => {
    onOpenChange(false);
    navigate('/upload');
  };

  const handleDuplicate = async () => {
    if (!selectedResumeId) return;
    
    setIsCreating(true);
    try {
      const newResume = await duplicateResume.mutateAsync(selectedResumeId);
      
      setCurrentResumeId(newResume.id);
      setCurrentResume({
        id: newResume.id,
        contactInfo: newResume.contact_info,
        summary: newResume.summary,
        experience: newResume.experience || [],
        education: newResume.education || [],
        skills: newResume.skills || [],
        certifications: newResume.certifications || [],
        templateId: newResume.template_id,
      });
      
      onOpenChange(false);
      navigate('/editor');
    } catch (error) {
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  // Handle creating a tailored version
  const handleCreateTailored = async () => {
    if (!title.trim() || !parentResumeId || !user) return;
    
    const bridgedUserId = getUserId();
    if (!bridgedUserId) {
      toast.error('Authentication not ready. Please try again in a moment.');
      return;
    }
    
    const parentResume = existingResumes.find(r => r.id === parentResumeId);
    if (!parentResume) return;
    
    setIsCreating(true);
    try {
      // Create a copy with parent_resume_id set, including new job-targeting fields
      // Build customization payload storing job description for persistence
      const customizationData: Record<string, unknown> = {};
      if (tailoredJobDescription.trim()) {
        customizationData.jobDescription = tailoredJobDescription.trim();
      }

      const { data: newResume, error } = await supabase
        .from('resumes')
        .insert({
          user_id: bridgedUserId,
          title: title.trim(),
          contact_info: parentResume.contact_info as unknown as Json,
          summary: parentResume.summary,
          experience: parentResume.experience as unknown as Json,
          education: parentResume.education as unknown as Json,
          skills: parentResume.skills as unknown as Json,
          certifications: parentResume.certifications as unknown as Json,
          awards: parentResume.awards as unknown as Json,
          projects: parentResume.projects as unknown as Json,
          languages: parentResume.languages as unknown as Json,
          publications: parentResume.publications as unknown as Json,
          volunteering: parentResume.volunteering as unknown as Json,
          hobbies: parentResume.hobbies as unknown as Json,
          references: parentResume.references as unknown as Json,
          template_id: parentResume.template_id,
          target_job_title: tailoredJobTitle.trim() || parentResume.target_job_title || null,
          target_company: tailoredCompany.trim() || parentResume.target_company || null,
          parent_resume_id: parentResumeId,
          is_primary: false,
          customization: Object.keys(customizationData).length > 0 ? customizationData as unknown as Json : null,
        })
        .select()
        .single();

      if (error) throw error;

      // If a job description was provided, seed the store so TailorSheet has it pre-filled
      if (tailoredJobDescription.trim()) {
        useResumeStore.getState().setJobDescription(tailoredJobDescription.trim());
      }

      setCurrentResumeId(newResume.id);
      setCurrentResume({
        id: newResume.id,
        contactInfo: parentResume.contact_info,
        summary: parentResume.summary,
        experience: parentResume.experience || [],
        education: parentResume.education || [],
        skills: parentResume.skills || [],
        certifications: parentResume.certifications || [],
        awards: parentResume.awards || [],
        projects: parentResume.projects || [],
        languages: parentResume.languages || [],
        publications: parentResume.publications || [],
        volunteering: parentResume.volunteering || [],
        hobbies: parentResume.hobbies || [],
        references: parentResume.references || [],
        templateId: parentResume.template_id,
      });
      
      onOpenChange(false);
      // If job description supplied, open tailor sheet immediately
      navigate(tailoredJobDescription.trim() ? '/editor?openTailor=1' : '/editor');
    } catch (error) {
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  const resetAndClose = () => {
    setMode(null);
    setTitle('');
    setSelectedResumeId('');
    setBlankStep('intake');
    setExperienceLevel('');
    setIntakeJobTitle('');
    setSelectedDialogTemplate((defaultTemplateId as TemplateId) || 'modern');
    setTailoredJobTitle('');
    setTailoredCompany('');
    setTailoredJobDescription('');
    setPasteText('');
    setPasteTitle('My Resume');
    setPasteError(null);
    onOpenChange(false);
  };

  const handleBlankBack = () => {
    if (blankStep === 'title') {
      setBlankStep('template');
    } else if (blankStep === 'template') {
      setBlankStep('intake');
    } else {
      setMode(null);
    }
  };

  const handleIntakeContinue = () => {
    if (!experienceLevel) return;
    setBlankStep('template');
  };

  const handlePasteCreate = async () => {
    if (!pasteText.trim()) {
      setPasteError('Please paste some text about your career before generating.');
      return;
    }
    if (!user) return;
    setIsCreating(true);
    setPasteError(null);
    try {
      const { data, error: fnError } = await edgeFunctions.functions.invoke('parse-job', {
        body: { action: 'linkedin', profileText: pasteText.trim(), platform: 'generic' },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.message || data.error);

      const parsed = data as Partial<ProfileData> & { summary?: string };
      const mapped = mapProfileDataToResumeFields(parsed);

      const newResume = await createResume.mutateAsync({
        resume: {
          contactInfo: {
            fullName: profile?.fullName || '',
            email: '',
            phone: '',
            location: profile?.location || '',
          },
          summary: parsed.summary || '',
          ...mapped,
          templateId: defaultTemplateId || 'modern',
        },
        title: pasteTitle.trim() || 'My Resume',
      });

      setCurrentResumeId(newResume.id);
      setCurrentResume({
        id: newResume.id,
        contactInfo: newResume.contact_info,
        summary: newResume.summary || '',
        experience: newResume.experience || [],
        education: newResume.education || [],
        skills: newResume.skills || [],
        certifications: newResume.certifications || [],
        templateId: newResume.template_id || 'modern',
      });

      onOpenChange(false);
      navigate('/editor');
    } catch (err) {
      console.error('Build-from-text error:', err);
      setPasteError(err instanceof Error ? err.message : 'Failed to process your text. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  // Free-tier gate: trial resumes don't count toward the free-plan quota of 1 resume.
  const nonTrialResumes = existingResumes.filter(r => !r.is_trial);
  // Block a new trial if ANY trial resume exists (active OR in grace period).
  // This prevents users from exploiting the 3-day grace window to chain trials.
  const existingTrial = existingResumes.find(r => r.is_trial);
  const atResumeLimit = !planLoading && !isPro && nonTrialResumes.length >= 1 && !!user;

  const handleCreateTrial = async () => {
    if (!user) return;
    const bridgedUserId = getUserId();
    if (!bridgedUserId) {
      toast.error('Authentication not ready. Please try again.');
      return;
    }
    setIsCreatingTrial(true);
    try {
      // Prefer the specific resume being tailored; fall back to primary, then any.
      const source =
        (parentResumeId ? nonTrialResumes.find(r => r.id === parentResumeId) : undefined) ??
        nonTrialResumes.find(r => r.is_primary) ??
        nonTrialResumes[0];
      const trialExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const insertPayload: Record<string, unknown> = {
        user_id: bridgedUserId,
        title: source ? `${source.title} (Trial)` : 'My Trial Resume',
        is_trial: true,
        trial_expires_at: trialExpiresAt,
        template_id: source?.template_id || 'modern',
        is_primary: false,
      };
      if (source) {
        insertPayload.contact_info = source.contact_info as unknown;
        insertPayload.summary = source.summary;
        insertPayload.experience = source.experience as unknown;
        insertPayload.education = source.education as unknown;
        insertPayload.skills = source.skills as unknown;
        insertPayload.certifications = source.certifications as unknown;
        insertPayload.awards = source.awards as unknown;
        insertPayload.projects = source.projects as unknown;
        insertPayload.publications = source.publications as unknown;
        insertPayload.volunteering = source.volunteering as unknown;
        insertPayload.hobbies = source.hobbies as unknown;
        insertPayload.references = source.references as unknown;
      }
      const { data: rawResume, error } = await supabase
        .from('resumes')
        .insert(insertPayload)
        .select()
        .single();
      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['resumes', user.id] });

      const newResume = parseDbResume(rawResume);
      const newResumeData = dbToResumeData(newResume);
      setCurrentResumeId(newResume.id);
      setCurrentResume(newResumeData);

      toast.success('Trial resume created! It will expire in 24 hours.');
      onOpenChange(false);
      navigate('/editor');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create trial resume.');
    } finally {
      setIsCreatingTrial(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-[90vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Resume</DialogTitle>
          <DialogDescription className="sr-only">Choose how you want to create your new resume</DialogDescription>
        </DialogHeader>

        {atResumeLimit ? (
          <div className="py-4 space-y-4">
            <UpgradeWall
              requiredPlan="pro"
              featureName="Multiple Resumes"
              description="Free plan includes 1 resume. Upgrade to Pro for unlimited resumes, tailored versions, and more."
              features={[
                'Unlimited resumes for every role & industry',
                'AI-tailored resume versions in seconds',
                'Side-by-side resume comparison',
                'Version history & restore',
              ]}
              compact
            />
            {!existingTrial && (
              <div className="border border-dashed border-amber-300 dark:border-amber-700 rounded-xl p-4 space-y-2 bg-amber-50/50 dark:bg-amber-900/10">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Try a second resume free for 24 hours</p>
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Get a full copy of your resume to experiment with — no credit card needed. It auto-deletes after 24 h.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 border-amber-400 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                  onClick={handleCreateTrial}
                  disabled={isCreatingTrial}
                >
                  {isCreatingTrial ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Zap className="w-3.5 h-3.5" />
                  )}
                  Try for 24 h — free
                </Button>
              </div>
            )}
            {existingTrial && (
              <p className="text-xs text-center text-muted-foreground">
                {existingTrial.trial_expires_at && new Date(existingTrial.trial_expires_at) > new Date()
                  ? 'You already have an active 24-hour trial resume on your dashboard.'
                  : 'Your trial resume is still on your dashboard. Upgrade to keep editing it.'}
              </p>
            )}
          </div>
        ) : !mode ? (
          /* Mode Selection */
          <div className="space-y-3 py-4">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => { haptics.light(); setMode('blank'); setBlankStep('intake'); }}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all touch-manipulation"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">Start from Scratch</p>
                <p className="text-sm text-muted-foreground">Build step by step with AI</p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => { haptics.light(); handleUpload(); }}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all touch-manipulation"
            >
              <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center">
                <Upload className="w-6 h-6 text-secondary" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">Upload PDF</p>
                <p className="text-sm text-muted-foreground">Extract and enhance existing resume</p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                haptics.light();
                if (onLinkedInImport) {
                  onOpenChange(false);
                  onLinkedInImport();
                } else {
                  setShowLocalImport(true);
                }
              }}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all touch-manipulation"
            >
              <div className="w-12 h-12 rounded-lg bg-[#0A66C2]/10 flex items-center justify-center">
                <Linkedin className="w-6 h-6 text-[#0A66C2]" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">Import Profile</p>
                <p className="text-sm text-muted-foreground">LinkedIn, Indeed, Xing & more</p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => { haptics.light(); setMode('paste'); }}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all touch-manipulation"
            >
              <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Type className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">Build from Text</p>
                <p className="text-sm text-muted-foreground">Paste any career notes, bio, or freeform text</p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </motion.button>

            {existingResumes.length > 0 && (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => { haptics.light(); setMode('duplicate'); }}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all touch-manipulation"
              >
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Copy className="w-6 h-6 text-accent" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">Duplicate Existing</p>
                  <p className="text-sm text-muted-foreground">Copy and customize a resume</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </motion.button>
            )}
          </div>
        ) : mode === 'blank' && blankStep === 'intake' ? (
          /* Guided Intake Step */
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>What's your experience level?</Label>
              <div className="space-y-2">
                {EXPERIENCE_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    onClick={() => setExperienceLevel(level.value)}
                    className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all touch-manipulation ${
                      experienceLevel === level.value
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border hover:border-primary/40 hover:bg-muted'
                    }`}
                  >
                    <span className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                      experienceLevel === level.value ? 'border-primary' : 'border-muted-foreground/40'
                    }`}>
                      {experienceLevel === level.value && (
                        <span className="w-2 h-2 rounded-full bg-primary block" />
                      )}
                    </span>
                    <div>
                      <p className="font-medium text-sm">{level.label}</p>
                      <p className="text-xs text-muted-foreground">{level.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="intake-job-title">Target job title <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                id="intake-job-title"
                placeholder="e.g., Software Engineer, Product Manager"
                value={intakeJobTitle}
                onChange={(e) => setIntakeJobTitle(e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setMode(null)}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleIntakeContinue}
                disabled={!experienceLevel}
                className="flex-1 gradient-primary"
              >
                Continue
              </Button>
            </div>
          </div>
        ) : mode === 'blank' && blankStep === 'template' ? (
          /* Template Selection Step */
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm font-medium mb-0.5">Pick a template</p>
              <p className="text-xs text-muted-foreground">You can change this any time in the editor</p>
            </div>

            <div className="max-h-[52vh] overflow-y-auto -mx-1 px-1">
              <div className="grid grid-cols-2 gap-2.5">
                {templates
                  .filter(t => ['modern', 'classic', 'minimal', 'professional', 'compact', 'developer', 'elegant', 'executive'].includes(t.id))
                  .map((template) => {
                    const isSelected = selectedDialogTemplate === template.id;
                    return (
                      <button
                        key={template.id}
                        onClick={() => setSelectedDialogTemplate(template.id as TemplateId)}
                        className={`relative rounded-xl border-2 p-1.5 text-left transition-all touch-manipulation active:scale-[0.97] ${
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/40'
                        }`}
                      >
                        <TemplateThumbnail templateId={template.id as TemplateId} resume={sampleResumeData} />
                        <div className="mt-1.5 flex items-center justify-between px-0.5">
                          <span className="text-xs font-medium truncate">{template.name}</span>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                          )}
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                onClick={handleBlankBack}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={() => setBlankStep('title')}
                className="flex-1 gradient-primary"
              >
                Continue
              </Button>
            </div>
          </div>
        ) : mode === 'blank' && blankStep === 'title' ? (
          /* Title Step */
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Resume Title</Label>
              <Input
                id="title"
                placeholder="e.g., Software Engineer Resume"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter' && title.trim()) handleStartBlank(); }}
              />
              <p className="text-xs text-muted-foreground">
                Give your resume a name to identify it later
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleBlankBack}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleStartBlank}
                disabled={!title.trim() || isCreating}
                className="flex-1 gradient-primary"
              >
                {isCreating ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </div>
        ) : mode === 'duplicate' ? (
          /* Duplicate Resume Form */
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Resume to Duplicate</Label>
              <Select
                value={selectedResumeId}
                onValueChange={setSelectedResumeId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a resume" />
                </SelectTrigger>
                <SelectContent>
                  {existingResumes.map((resume) => (
                    <SelectItem key={resume.id} value={resume.id}>
                      {resume.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setMode(null)}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleDuplicate}
                disabled={!selectedResumeId || isCreating}
                className="flex-1 gradient-primary"
              >
                {isCreating ? 'Duplicating...' : 'Duplicate'}
              </Button>
            </div>
          </div>
        ) : mode === 'tailored' ? (
          /* Tailored Version Form */
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
              <GitBranch className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Creating Tailored Version</p>
                <p className="text-xs text-muted-foreground">
                  This will be linked to the master resume
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tailored-title">Version Title</Label>
              <Input
                id="tailored-title"
                placeholder="e.g., Google SWE Application"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Give this tailored version a descriptive name
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tailored-job-title">Target Job Title</Label>
              <Input
                id="tailored-job-title"
                placeholder="e.g., Senior Software Engineer"
                value={tailoredJobTitle}
                onChange={(e) => setTailoredJobTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tailored-company">Target Company</Label>
              <Input
                id="tailored-company"
                placeholder="e.g., Google"
                value={tailoredCompany}
                onChange={(e) => setTailoredCompany(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tailored-jd">
                Job Description <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="tailored-jd"
                placeholder="Paste the job description here to enable AI tailoring..."
                value={tailoredJobDescription}
                onChange={(e) => setTailoredJobDescription(e.target.value)}
                className="min-h-[100px] resize-none text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Adding a job description opens AI tailoring automatically
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={resetAndClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateTailored}
                disabled={!title.trim() || isCreating}
                className="flex-1 gradient-primary"
              >
                {isCreating ? 'Creating...' : 'Create Tailored'}
              </Button>
            </div>
          </div>
        ) : mode === 'paste' ? (
          /* Build from Text Form */
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="paste-text">Your career text</Label>
              <Textarea
                id="paste-text"
                placeholder="Paste anything — job history, a bio, notes, or bullet points. The AI will structure it into a full resume."
                value={pasteText}
                onChange={(e) => { setPasteText(e.target.value); setPasteError(null); }}
                className="min-h-[160px] resize-none text-sm"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Works with rough notes, copy-pasted bios, or any career text you have on hand.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paste-title">Resume title <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                id="paste-title"
                placeholder="e.g., Software Engineer Resume"
                value={pasteTitle}
                onChange={(e) => setPasteTitle(e.target.value)}
              />
            </div>

            {pasteError && (
              <p className="text-sm text-destructive">{pasteError}</p>
            )}

            {isCreating && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Structuring your career history…</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => { setMode(null); setPasteError(null); }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Back
              </button>
              <Button
                onClick={handlePasteCreate}
                disabled={isCreating}
                className="gradient-primary"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating…
                  </>
                ) : 'Generate Resume'}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
      {showLocalImport && (
        <Suspense fallback={null}>
          <ProfileImportSheet
            open={showLocalImport}
            onOpenChange={setShowLocalImport}
            onImport={async (data) => {
              if (!user) return;
              const contactInfo = {
                fullName: profile?.fullName || '',
                email: user.email || '',
                phone: '',
                location: profile?.location || '',
              };
              try {
                const mapped = mapProfileDataToResumeFields(data);
                const newResume = await createResume.mutateAsync({
                  resume: {
                    contactInfo,
                    summary: data.summary || '',
                    ...mapped,
                    certifications: [],
                    templateId: defaultTemplateId || 'modern',
                  },
                  title: 'Imported Resume',
                });
                setCurrentResumeId(newResume.id);
                setCurrentResume({
                  id: newResume.id,
                  contactInfo: newResume.contact_info,
                  summary: newResume.summary || '',
                  experience: newResume.experience || [],
                  education: newResume.education || [],
                  skills: newResume.skills || [],
                  certifications: [],
                  templateId: newResume.template_id || 'modern',
                });
                toast.success('Profile imported — review and edit below');
                onOpenChange(false);
                navigate('/editor');
              } catch (err) {
                console.error('Import error:', err);
                toast.error('Failed to create resume from import');
              }
            }}
          />
        </Suspense>
      )}
    </Dialog>
  );
}
