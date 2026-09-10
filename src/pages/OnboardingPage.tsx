import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Target,
  FileText,
  Upload,
  Linkedin,
  ChevronRight,
  Pencil,
  Copy,
  Wand2,
  Link2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { useResumes } from '@/hooks/useResumes';
import { toast } from 'sonner';
import { parseOnboardingCvFile } from '@/lib/onboardingCvFile';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { invalidateAiCreditQueries } from '@/lib/invalidate-ai-credit-queries';
import { databases, DATABASE_ID, Query } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';
import { upsertProfileIdentity } from '@/lib/profileSeed';
import {
  fromResumeData,
  fromProfileData,
  saveOnboardingProfile,
  probeLinkedInUrl,
  emptyProfile,
  reconcileOnboardingCompletion,
  type ExtractedProfile,
} from '@/lib/onboardingProfile';
import { OnboardingProfileReviewSheet } from '@/components/onboarding/OnboardingProfileReviewSheet';
import type { ProfileData } from '@/components/settings/ProfileImportSheet';
import { logAudit } from '@/lib/auditLogger';
import { cn } from '@/lib/utils';
import { hasAcceptedAIPrivacy } from '@/components/ai/AIPrivacyDisclosure';
import { useAIPrivacyDisclosure } from '@/components/ai/AIPrivacyDisclosureProvider';

export type OnboardingGoal = 'create' | 'upload' | 'tailor';

export type Step =
  | 'goal'
  | 'create'
  | 'upload_choice'
  | 'cv'
  | 'linkedin'
  | 'manual'
  | 'tailor_prereq'
  | 'celebration';

type OnboardingMethod =
  | 'cv'
  | 'linkedin-url'
  | 'linkedin-paste'
  | 'linkedin-wizard'
  | 'linkedin-pdf'
  | 'manual'
  | 'create-direct';

const ProfileImportSheet = lazyWithRetry(() =>
  import('@/components/settings/ProfileImportSheet').then((m) => ({ default: m.ProfileImportSheet })),
);

export function onboardingKey(userId: string): string {
  return `wr-onboarding-completed-${userId}`;
}

type LinkedInOption = null | 'paste' | 'wizard' | 'pdf' | 'url';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: resumes = [] } = useResumes();
  const { requestDisclosure } = useAIPrivacyDisclosure();

  const ensureAIPrivacy = useCallback(async () => {
    if (hasAcceptedAIPrivacy()) return true;
    return requestDisclosure();
  }, [requestDisclosure]);

  const [step, setStep] = useState<Step>('goal');
  const [goal, setGoal] = useState<OnboardingGoal | null>(null);
  const [postAction, setPostAction] = useState<'editor' | 'tailor' | 'dashboard'>('editor');
  const methodRef = useRef<OnboardingMethod | null>(null);

  // Log entry into the onboarding flow once.
  useEffect(() => {
    logAudit('onboarding', 'started', {});
  }, []);

  // Creation / manual path state
  const [manualName, setManualName] = useState('');
  const [manualJobTitle, setManualJobTitle] = useState('');
  const [manualResumeTitle, setManualResumeTitle] = useState('');
  const [isSavingManual, setIsSavingManual] = useState(false);

  useEffect(() => {
    if (manualName.trim() || !user?.name?.trim()) return;
    setManualName(user.name.trim());
  }, [user?.name, manualName]);

  // CV path state
  const cvInputRef = useRef<HTMLInputElement>(null);
  const [cvProcessing, setCvProcessing] = useState(false);
  const [cvError, setCvError] = useState<string | null>(null);

  // LinkedIn path state
  const [liOption, setLiOption] = useState<LinkedInOption>(null);
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [linkedinUrlError, setLinkedinUrlError] = useState('');
  const [linkedinUrlProcessing, setLinkedinUrlProcessing] = useState(false);
  const [showProfileImportSheet, setShowProfileImportSheet] = useState(false);
  const [profileImportInitial, setProfileImportInitial] = useState<'paste' | 'wizard' | 'pdf' | undefined>(undefined);

  // Review & confirm state
  const [pendingProfile, setPendingProfile] = useState<ExtractedProfile | null>(null);
  const [partialNotice, setPartialNotice] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [finalName, setFinalName] = useState('');

  // Auto-redirect if already completed or user already has resumes
  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;

    if (localStorage.getItem(onboardingKey(userId)) === 'true') {
      navigate('/dashboard', { replace: true });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const profileRes = await databases.listDocuments(DATABASE_ID, COLLECTIONS.profiles, [
          Query.equal('user_id', userId),
          Query.select(['$id', 'onboarding_completed']),
          Query.limit(1),
        ]);
        if (cancelled) return;
        const profileDoc = profileRes.documents[0] as { $id: string; onboarding_completed?: boolean } | undefined;
        if (profileDoc?.onboarding_completed) {
          localStorage.setItem(onboardingKey(userId), 'true');
          navigate('/dashboard', { replace: true });
          return;
        }
        const fixed = await reconcileOnboardingCompletion(userId);
        if (cancelled) return;
        if (fixed) {
          localStorage.setItem(onboardingKey(userId), 'true');
          navigate('/dashboard', { replace: true });
        }
      } catch {
        // non-critical
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, user]);

  // Save profile and mark completion
  const completeWith = useCallback(
    async (filtered: ExtractedProfile) => {
      setIsSaving(true);
      try {
        const result = await saveOnboardingProfile({
          selectedProfile: filtered,
          fallbackUserId: user?.id ?? null,
          fallbackUserEmail: user?.email ?? null,
          resumeTitle: filtered.fullName ? `${filtered.fullName} – Resume` : 'My Resume',
        });

        const completedUserId = user?.id;
        if (completedUserId) {
          localStorage.setItem(onboardingKey(completedUserId), 'true');
        }
        queryClient.invalidateQueries({ queryKey: ['profile'] });
        queryClient.invalidateQueries({ queryKey: ['me'] });
        queryClient.invalidateQueries({ queryKey: ['resumes'] });
        setFinalName(filtered.fullName || '');
        setShowReview(false);
        setStep('celebration');

        logAudit('onboarding', 'completed', {
          method: methodRef.current,
          hasResume: result.hasResume,
        });

        if (result.hasResume) {
          toast.success('Profile and resume created');
        } else {
          toast.success('Profile saved');
        }
      } catch (err) {
        console.error('Onboarding save failed:', err);
        logAudit('onboarding', 'save_failed', {
          method: methodRef.current,
          message: err instanceof Error ? err.message : String(err),
        });
        toast.error(err instanceof Error ? err.message : 'Failed to save. Please try again.');
      } finally {
        setIsSaving(false);
      }
    },
    [queryClient, user],
  );

  // CV Upload Handler
  const handleCvFile = useCallback(
    async (file: File) => {
      setCvError(null);
      if (!(await ensureAIPrivacy())) {
        setCvError('CV import was cancelled before any resume content was sent for AI processing.');
        if (cvInputRef.current) cvInputRef.current.value = '';
        return;
      }
      setCvProcessing(true);
      try {
        const resumeData = await parseOnboardingCvFile(file);
        if (!resumeData) throw new Error("We couldn't read this file. Please try a different one.");

        const profile = fromResumeData(resumeData);
        const anything =
          profile.fullName ||
          profile.email ||
          profile.summary ||
          profile.experience.length ||
          profile.education.length ||
          profile.skills.length;
        if (!anything) {
          throw new Error("We couldn't find any profile data in this file. Please try a different one.");
        }
        setPendingProfile(profile);
        setPartialNotice(null);
        setShowReview(true);
        logAudit('onboarding', 'review_opened', { method: methodRef.current });
      } catch (err) {
        console.error('CV parse error:', err);
        setCvError(err instanceof Error ? err.message : 'Failed to read your CV.');
      } finally {
        setCvProcessing(false);
        if (cvInputRef.current) cvInputRef.current.value = '';
      }
    },
    [ensureAIPrivacy],
  );

  // LinkedIn URL Handler
  const handleLinkedInUrlSubmit = useCallback(async () => {
    const v = linkedinUrl.trim();
    if (!v) {
      setLinkedinUrlError('Please paste your LinkedIn profile URL.');
      return;
    }
    const candidate = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    let parsed: URL;
    try {
      parsed = new URL(candidate);
    } catch {
      setLinkedinUrlError("That doesn't look like a valid URL.");
      return;
    }
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const isLinkedIn = host === 'linkedin.com' || host.endsWith('.linkedin.com');
    if (!isLinkedIn || !/\/in\//i.test(parsed.pathname)) {
      setLinkedinUrlError('Please paste a valid LinkedIn profile URL like linkedin.com/in/yourname');
      return;
    }
    if (!(await ensureAIPrivacy())) {
      setLinkedinUrlError('LinkedIn import was cancelled before profile data was sent for processing.');
      return;
    }
    setLinkedinUrlError('');
    setLinkedinUrlProcessing(true);
    try {
      const probe = await probeLinkedInUrl(v);
      let extracted: ExtractedProfile;
      let notice: string | null = null;
      const linkedinUrlNormalized = /^https?:\/\//i.test(v) ? v : `https://${v}`;

      if (probe.structured) {
        extracted = fromProfileData(probe.structured as Partial<ProfileData>, {
          fullName: probe.structured.fullName || probe.derivedName || undefined,
          linkedinUrl: linkedinUrlNormalized,
        });
        if (probe.structured.location && !extracted.location) {
          extracted.location = probe.structured.location;
        }
      } else if (probe.profileText.trim().length > 50) {
        try {
          const { data, error: fnError } = await appwriteFunctions.invoke('parse-job', {
            body: { action: 'linkedin', profileText: probe.profileText, platform: 'linkedin' },
          });
          if (fnError) throw fnError;
          if (data?.error) throw new Error(data.message || data.error);
          invalidateAiCreditQueries(queryClient);
          extracted = fromProfileData(data as Partial<ProfileData>, {
            fullName: probe.derivedName ?? undefined,
            linkedinUrl: linkedinUrlNormalized,
          });
        } catch {
          extracted = fromProfileData({}, {
            fullName: probe.derivedName ?? undefined,
            linkedinUrl: linkedinUrlNormalized,
          });
          if (probe.derivedHeadline) extracted.summary = probe.derivedHeadline;
        }
      } else {
        extracted = fromProfileData({}, {
          fullName: probe.derivedName ?? undefined,
          linkedinUrl: linkedinUrlNormalized,
        });
      }

      const richness =
        (extracted.experience.length || 0) +
        (extracted.education.length || 0) +
        (extracted.skills.length || 0);
      if (richness === 0) {
        if (probe.quotaExhausted) {
          notice = "You've hit this month's LinkedIn import limit. We saved the basics — copy-paste your profile or upload a PDF for richer data.";
        } else if (probe.notConfigured) {
          notice = "Rich LinkedIn import isn't enabled on this server, so we only fetched public meta. For full data, copy-paste your profile or upload a PDF.";
        } else {
          notice = 'LinkedIn limits what we can fetch from a public URL. We saved the basics — for richer data, copy-paste your profile or upload a PDF.';
        }
      }

      setPendingProfile(extracted);
      setPartialNotice(notice);
      setShowReview(true);
      logAudit('onboarding', 'review_opened', {
        method: methodRef.current,
        partial: notice ? true : false,
      });
    } catch (err) {
      console.error('LinkedIn URL probe failed:', err);
      toast.error("Couldn't reach that LinkedIn URL. Try copy-paste or PDF instead.");
    } finally {
      setLinkedinUrlProcessing(false);
    }
  }, [ensureAIPrivacy, linkedinUrl, queryClient]);

  const handleProfileImportSheetImport = useCallback((data: Partial<ProfileData>) => {
    const extracted = fromProfileData(data);
    setPendingProfile(extracted);
    setPartialNotice(null);
    setShowProfileImportSheet(false);
    setShowReview(true);
    logAudit('onboarding', 'review_opened', { method: methodRef.current });
  }, []);

  // Direct Create / Manual Handler
  const handleManualCreate = useCallback(async () => {
    if (!manualName.trim()) return;
    setIsSavingManual(true);
    try {
      const profile = emptyProfile();
      profile.fullName = manualName.trim();
      if (manualJobTitle.trim()) profile.jobTitle = manualJobTitle.trim();

      const result = await saveOnboardingProfile({
        selectedProfile: profile,
        fallbackUserId: user?.id ?? null,
        fallbackUserEmail: user?.email ?? null,
        resumeTitle: manualResumeTitle.trim() || (profile.jobTitle ? `${profile.jobTitle} Resume` : 'My Resume'),
      });

      if (user?.id) {
        localStorage.setItem(onboardingKey(user.id), 'true');
      }
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['resumes'] });

      setFinalName(profile.fullName);
      setStep('celebration');

      logAudit('onboarding', 'completed', {
        method: 'create-direct',
        hasResume: result.hasResume,
      });
      toast.success('Your resume workspace is ready!');
    } catch (err) {
      console.error('Failed to create starter resume:', err);
      toast.error('Failed to create resume. Please try again.');
    } finally {
      setIsSavingManual(false);
    }
  }, [manualName, manualJobTitle, manualResumeTitle, queryClient, user]);

  // Skip flow — intentionally marks completed in DB and localStorage, lands on Dashboard
  const handleSkip = useCallback(async () => {
    logAudit('onboarding', 'skipped', { step, method: methodRef.current });
    if (user?.id) {
      try {
        await upsertProfileIdentity({
          userId: user.id,
          email: user.email,
          fullName: user.name,
        });
        const profileRes = await databases.listDocuments(DATABASE_ID, COLLECTIONS.profiles, [
          Query.equal('user_id', user.id),
          Query.select(['$id']),
          Query.limit(1),
        ]);
        if (profileRes.documents.length > 0) {
          await databases.updateDocument(DATABASE_ID, COLLECTIONS.profiles, profileRes.documents[0].$id, {
            onboarding_completed: true,
            profile_completed: true,
          });
        }
        queryClient.invalidateQueries({ queryKey: ['profile'] });
        queryClient.invalidateQueries({ queryKey: ['me'] });
      } catch {
        // non-critical
      }
      localStorage.setItem(onboardingKey(user.id), 'true');
    }
    navigate('/dashboard', { replace: true });
  }, [step, user?.id, user?.email, user?.name, navigate, queryClient]);

  // Back button handler
  const handleBack = () => {
    if (step === 'create' || step === 'upload_choice' || step === 'tailor_prereq') {
      setStep('goal');
      setGoal(null);
    } else if (step === 'cv' || step === 'linkedin' || step === 'manual') {
      methodRef.current = null;
      setLiOption(null);
      setCvError(null);
      setLinkedinUrl('');
      setLinkedinUrlError('');
      if (goal === 'upload') {
        setStep('upload_choice');
      } else if (goal === 'tailor') {
        setStep('tailor_prereq');
      } else {
        setStep('create');
      }
    }
  };

  // Goal Picker Handler
  const handleSelectGoal = (selectedGoal: OnboardingGoal) => {
    setGoal(selectedGoal);
    logAudit('onboarding', 'goal_selected', { goal: selectedGoal });

    if (selectedGoal === 'create') {
      setPostAction('editor');
      methodRef.current = 'create-direct';
      setStep('create');
    } else if (selectedGoal === 'upload') {
      setPostAction('editor');
      setStep('upload_choice');
    } else if (selectedGoal === 'tailor') {
      setPostAction('tailor');
      if (resumes.length > 0) {
        // If user already has a resume, go straight to tailoring hub!
        navigate('/tailoring-hub');
      } else {
        // User needs a base resume first
        setStep('tailor_prereq');
      }
    }
  };

  // Progress dot indicator (3 milestones: Goal -> Setup -> Ready)
  const getProgressMilestone = (s: Step): number => {
    if (s === 'goal') return 1;
    if (s === 'celebration') return 3;
    return 2;
  };

  const currentMilestone = getProgressMilestone(step);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.99 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col h-[100dvh] overflow-hidden bg-background"
    >
      {/* Top Header */}
      <div className="shrink-0 px-4 sm:px-6 pt-safe">
        <div className="flex items-center justify-between h-14">
          {step !== 'goal' && step !== 'celebration' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="text-muted-foreground hover:text-foreground -ml-2 text-xs"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          ) : (
            <div />
          )}

          {/* Skip for now — STRICTLY NOT available on step === 'goal', available from step 2 onwards */}
          {step !== 'goal' && step !== 'celebration' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              Skip for now
            </Button>
          )}
        </div>

        {/* 3-Step Milestone Indicator */}
        {step !== 'celebration' && (
          <div className="flex items-center justify-center gap-2 pb-3" aria-label="Onboarding progress">
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  n === currentMilestone
                    ? 'w-8 bg-primary'
                    : n < currentMilestone
                    ? 'w-4 bg-primary/40'
                    : 'w-4 bg-muted',
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Main Viewport Content Area */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-4 sm:px-6 pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md flex flex-col justify-center my-auto"
          >
            {/* Screen 1: Goal-First Selection */}
            {step === 'goal' && <GoalSelectionStep onSelectGoal={handleSelectGoal} />}

            {/* Screen 2A: Create New Resume */}
            {step === 'create' && (
              <CreateResumeStep
                name={manualName}
                setName={setManualName}
                jobTitle={manualJobTitle}
                setJobTitle={setManualJobTitle}
                resumeTitle={manualResumeTitle}
                setResumeTitle={setManualResumeTitle}
                saving={isSavingManual}
                onCreate={handleManualCreate}
                onSwitchToUpload={() => {
                  setGoal('upload');
                  setStep('upload_choice');
                }}
              />
            )}

            {/* Screen 2B: Upload / Import Choice */}
            {step === 'upload_choice' && (
              <UploadChoiceStep
                onPickMethod={(method) => {
                  if (method === 'cv') {
                    methodRef.current = 'cv';
                    setStep('cv');
                  } else if (method === 'linkedin') {
                    setStep('linkedin');
                  } else {
                    methodRef.current = 'manual';
                    setStep('manual');
                  }
                }}
              />
            )}

            {/* Screen 2C: Tailor Prerequisite Notice */}
            {step === 'tailor_prereq' && (
              <TailorPrereqStep
                onUpload={() => {
                  methodRef.current = 'cv';
                  setStep('cv');
                }}
                onCreateManual={() => {
                  methodRef.current = 'create-direct';
                  setStep('create');
                }}
              />
            )}

            {/* Screen 2D: CV Dropzone */}
            {step === 'cv' && (
              <CvStep
                processing={cvProcessing}
                error={cvError}
                inputRef={cvInputRef}
                onFile={handleCvFile}
              />
            )}

            {/* Screen 2E: LinkedIn Import */}
            {step === 'linkedin' && (
              <LinkedInStep
                option={liOption}
                onPickOption={(o) => {
                  setLiOption(o);
                  if (o === 'paste') {
                    methodRef.current = 'linkedin-paste';
                    setProfileImportInitial('paste');
                    setShowProfileImportSheet(true);
                  } else if (o === 'wizard') {
                    methodRef.current = 'linkedin-wizard';
                    setProfileImportInitial('wizard');
                    setShowProfileImportSheet(true);
                  } else if (o === 'pdf') {
                    methodRef.current = 'linkedin-pdf';
                    setProfileImportInitial('pdf');
                    setShowProfileImportSheet(true);
                  } else if (o === 'url') {
                    methodRef.current = 'linkedin-url';
                  }
                }}
                url={linkedinUrl}
                setUrl={(v) => {
                  setLinkedinUrl(v);
                  if (linkedinUrlError) setLinkedinUrlError('');
                }}
                urlError={linkedinUrlError}
                urlProcessing={linkedinUrlProcessing}
                onSubmitUrl={handleLinkedInUrlSubmit}
              />
            )}

            {/* Screen 2F: Manual Fallback */}
            {step === 'manual' && (
              <CreateResumeStep
                name={manualName}
                setName={setManualName}
                jobTitle={manualJobTitle}
                setJobTitle={setManualJobTitle}
                resumeTitle={manualResumeTitle}
                setResumeTitle={setManualResumeTitle}
                saving={isSavingManual}
                onCreate={handleManualCreate}
                onSwitchToUpload={() => setStep('upload_choice')}
              />
            )}

            {/* Screen 3: Celebration & Primary Next Job */}
            {step === 'celebration' && (
              <CelebrationStep
                name={finalName}
                postAction={postAction}
                onGoEditor={() => navigate('/editor', { replace: true })}
                onGoTailoring={() => navigate('/tailoring-hub', { replace: true })}
                onGoDashboard={() => navigate('/dashboard', { replace: true })}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Review sheet modal */}
      <OnboardingProfileReviewSheet
        open={showReview}
        onClose={() => {
          setShowReview(false);
          if (!isSaving) {
            logAudit('onboarding', 'review_dismissed', { method: methodRef.current });
          }
        }}
        profile={pendingProfile}
        onConfirm={completeWith}
        isSaving={isSaving}
      />

      {partialNotice && showReview && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100vw-2rem)] px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-100 flex items-start gap-2 shadow-lg">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{partialNotice}</span>
        </div>
      )}

      {/* LinkedIn Import Sheet */}
      {showProfileImportSheet && (
        <Suspense fallback={null}>
          <ProfileImportSheet
            open={showProfileImportSheet}
            onOpenChange={(o) => setShowProfileImportSheet(o)}
            onImport={handleProfileImportSheetImport}
            defaultPlatform="linkedin"
            initialMethod={profileImportInitial}
          />
        </Suspense>
      )}
    </motion.div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Step 1: Goal Selection Step                                              */
/* ──────────────────────────────────────────────────────────────────────── */
function GoalSelectionStep({ onSelectGoal }: { onSelectGoal: (g: OnboardingGoal) => void }) {
  return (
    <div className="py-2 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 text-primary mb-4">
        <Sparkles className="w-6 h-6" />
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight mb-2">
        What is your main goal today?
      </h1>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
        Choose how you'd like to get started with WiseResume.
      </p>

      <div className="space-y-3 text-left">
        {/* Goal 1: Build New */}
        <motion.button
          whileTap={{ scale: 0.985 }}
          onClick={() => onSelectGoal('create')}
          className="w-full rounded-2xl p-4 border border-border bg-card hover:border-primary/40 hover:bg-muted/40 transition-all flex items-center gap-4 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground">Build a new resume</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Start from scratch with ATS-ready templates and AI assistance
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
        </motion.button>

        {/* Goal 2: Upload / Improve */}
        <motion.button
          whileTap={{ scale: 0.985 }}
          onClick={() => onSelectGoal('upload')}
          className="w-full rounded-2xl p-4 border border-border bg-card hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all flex items-center gap-4 group focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Upload className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground">Upload or improve existing CV</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Import a PDF, DOCX, or LinkedIn profile to enhance it
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-emerald-500 transition-colors shrink-0" />
        </motion.button>

        {/* Goal 3: Tailor for Job */}
        <motion.button
          whileTap={{ scale: 0.985 }}
          onClick={() => onSelectGoal('tailor')}
          className="w-full rounded-2xl p-4 border border-border bg-card hover:border-amber-500/40 hover:bg-amber-500/5 transition-all flex items-center gap-4 group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Target className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground">Tailor for a specific job</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Match keywords and bullets to pass ATS screenings
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-amber-500 transition-colors shrink-0" />
        </motion.button>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Step 2A: Create New Resume Step                                          */
/* ──────────────────────────────────────────────────────────────────────── */
function CreateResumeStep({
  name,
  setName,
  jobTitle,
  setJobTitle,
  resumeTitle,
  setResumeTitle,
  saving,
  onCreate,
  onSwitchToUpload,
}: {
  name: string;
  setName: (v: string) => void;
  jobTitle: string;
  setJobTitle: (v: string) => void;
  resumeTitle: string;
  setResumeTitle: (v: string) => void;
  saving: boolean;
  onCreate: () => void;
  onSwitchToUpload: () => void;
}) {
  return (
    <div className="py-2">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-foreground mb-1.5 tracking-tight">
          Build your starter resume
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
          Enter your name and target job title to initialize your workspace.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Full Name <span className="text-primary">*</span>
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alex Morgan"
            autoFocus
            className="h-11 rounded-xl bg-background"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Target Job Title <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <Input
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="e.g. Senior Frontend Engineer"
            className="h-11 rounded-xl bg-background"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Resume Name <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <Input
            value={resumeTitle}
            onChange={(e) => setResumeTitle(e.target.value)}
            placeholder="e.g. Tech Lead 2026"
            className="h-11 rounded-xl bg-background"
          />
        </div>
      </div>

      <Button
        onClick={onCreate}
        disabled={!name.trim() || saving}
        className="w-full h-11 mt-6 rounded-xl font-semibold text-sm"
      >
        {saving ? (
          <>
            <MiniSpinner size={16} className="mr-2" /> Initializing resume…
          </>
        ) : (
          <>
            Create &amp; Continue <ArrowRight className="w-4 h-4 ml-1.5" />
          </>
        )}
      </Button>

      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={onSwitchToUpload}
          className="text-xs text-muted-foreground hover:text-primary transition-colors underline underline-offset-4"
        >
          Have an existing CV? Upload it instead
        </button>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Step 2B: Upload Choice Step                                              */
/* ──────────────────────────────────────────────────────────────────────── */
function UploadChoiceStep({ onPickMethod }: { onPickMethod: (m: 'cv' | 'linkedin' | 'manual') => void }) {
  return (
    <div className="py-2">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-foreground mb-1.5 tracking-tight">
          Import your profile
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
          Choose the import method that works best for you.
        </p>
      </div>

      <div className="space-y-3">
        {/* CV Upload */}
        <motion.button
          whileTap={{ scale: 0.985 }}
          onClick={() => onPickMethod('cv')}
          className="w-full text-left rounded-2xl p-4 border border-border bg-card hover:border-primary/40 hover:bg-muted/40 transition-colors flex items-center gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Upload className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground">Upload CV file</p>
            <p className="text-xs text-muted-foreground mt-0.5">PDF, DOCX, TXT, or image</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
        </motion.button>

        {/* LinkedIn */}
        <motion.button
          whileTap={{ scale: 0.985 }}
          onClick={() => onPickMethod('linkedin')}
          className="w-full text-left rounded-2xl p-4 border border-[#0A66C2]/40 bg-card hover:bg-[#0A66C2]/5 transition-colors flex items-center gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A66C2]"
        >
          <div className="w-11 h-11 rounded-xl bg-[#0A66C2]/10 text-[#0A66C2] flex items-center justify-center shrink-0">
            <Linkedin className="w-5 h-5" fill="currentColor" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground">LinkedIn Profile</p>
            <p className="text-xs text-muted-foreground mt-0.5">Paste URL, paste text, or upload PDF</p>
          </div>
          <ChevronRight className="w-5 h-5 text-[#0A66C2] shrink-0" />
        </motion.button>

        {/* Manual */}
        <motion.button
          whileTap={{ scale: 0.985 }}
          onClick={() => onPickMethod('manual')}
          className="w-full text-left rounded-2xl p-4 border border-border bg-muted/40 hover:bg-muted/60 transition-colors flex items-center gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="w-11 h-11 rounded-xl bg-muted text-muted-foreground flex items-center justify-center shrink-0">
            <Pencil className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground">Manual Setup</p>
            <p className="text-xs text-muted-foreground mt-0.5">Fill out your basics directly</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
        </motion.button>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Step 2C: Tailor Prerequisite Step                                        */
/* ──────────────────────────────────────────────────────────────────────── */
function TailorPrereqStep({ onUpload, onCreateManual }: { onUpload: () => void; onCreateManual: () => void }) {
  return (
    <div className="py-2 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-4">
        <Target className="w-6 h-6" />
      </div>
      <h2 className="text-2xl font-bold text-foreground mb-1.5 tracking-tight">
        First, set up your base resume
      </h2>
      <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto mb-6">
        To tailor your resume for a job posting, WiseResume needs your base experience. How would you like to start?
      </p>

      <div className="space-y-3 text-left">
        <button
          type="button"
          onClick={onUpload}
          className="w-full rounded-2xl p-4 border-2 border-primary/30 bg-card hover:bg-primary/5 transition-colors flex items-center gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Upload className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm text-foreground">Upload existing CV</p>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                Recommended
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Quickest — we'll extract your work history automatically
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
        </button>

        <button
          type="button"
          onClick={onCreateManual}
          className="w-full rounded-2xl p-4 border border-border bg-card hover:bg-muted/40 transition-colors flex items-center gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="w-11 h-11 rounded-xl bg-muted text-muted-foreground flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground">Create a starter resume</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Enter your basic info to create a foundation
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
        </button>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Step 2D: CV Dropzone Step                                                */
/* ──────────────────────────────────────────────────────────────────────── */
function CvStep({
  processing,
  error,
  inputRef,
  onFile,
}: {
  processing: boolean;
  error: string | null;
  inputRef: React.RefObject<HTMLInputElement>;
  onFile: (file: File) => void;
}) {
  const handleClick = () => inputRef.current?.click();
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onFile(f);
  };

  return (
    <div className="py-2">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-foreground mb-1.5 tracking-tight">
          Upload your CV
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
          Our AI will extract your experience, skills, and education into your profile.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt,image/*,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={onChange}
        className="hidden"
        disabled={processing}
      />

      <button
        type="button"
        onClick={handleClick}
        disabled={processing}
        className="w-full rounded-2xl border-2 border-dashed border-border hover:border-primary/50 bg-card/60 p-8 flex flex-col items-center justify-center text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {processing ? (
          <>
            <MiniSpinner size={40} className="text-primary mb-3" />
            <p className="font-semibold text-sm text-foreground">Analyzing your CV…</p>
            <p className="text-xs text-muted-foreground mt-1">This takes only a few seconds.</p>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <p className="font-semibold text-sm text-foreground">Click to select file</p>
            <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, TXT, or image (up to 10 MB)</p>
          </>
        )}
      </button>

      {error && (
        <div className="mt-4 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Step 2E: LinkedIn Options Step                                           */
/* ──────────────────────────────────────────────────────────────────────── */
function LinkedInStep({
  option,
  onPickOption,
  url,
  setUrl,
  urlError,
  urlProcessing,
  onSubmitUrl,
}: {
  option: LinkedInOption;
  onPickOption: (o: 'paste' | 'wizard' | 'pdf' | 'url') => void;
  url: string;
  setUrl: (v: string) => void;
  urlError: string;
  urlProcessing: boolean;
  onSubmitUrl: () => void;
}) {
  return (
    <div className="py-2">
      <div className="mb-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-[#0A66C2] text-white flex items-center justify-center mx-auto mb-3">
          <Linkedin className="w-6 h-6" fill="currentColor" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-1.5 tracking-tight">
          Import from LinkedIn
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
          Choose the LinkedIn method you prefer.
        </p>
      </div>

      <div className="space-y-2.5">
        <button
          type="button"
          onClick={() => onPickOption('url')}
          className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-[#0A66C2]/40 bg-card hover:bg-[#0A66C2]/5 transition-colors text-left"
        >
          <div className="w-9 h-9 rounded-lg bg-[#0A66C2]/10 text-[#0A66C2] flex items-center justify-center shrink-0">
            <Link2 className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-xs sm:text-sm text-foreground">Paste LinkedIn URL</p>
            <p className="text-[11px] text-muted-foreground">Quickest public import</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>

        {option === 'url' && (
          <div className="p-3 bg-muted/30 rounded-xl space-y-2">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://linkedin.com/in/yourname"
              type="url"
              className={cn('h-10 text-xs rounded-lg', urlError && 'border-destructive')}
              autoFocus
              disabled={urlProcessing}
            />
            {urlError && <p className="text-xs text-destructive">{urlError}</p>}
            <Button
              onClick={onSubmitUrl}
              disabled={urlProcessing}
              className="w-full h-9 rounded-lg text-xs font-semibold"
            >
              {urlProcessing ? (
                <>
                  <MiniSpinner size={14} className="mr-2" /> Fetching…
                </>
              ) : (
                'Import Profile'
              )}
            </Button>
          </div>
        )}

        <button
          type="button"
          onClick={() => onPickOption('paste')}
          className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card hover:bg-muted/40 transition-colors text-left"
        >
          <div className="w-9 h-9 rounded-lg bg-muted text-foreground flex items-center justify-center shrink-0">
            <Copy className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-xs sm:text-sm text-foreground">Paste profile text</p>
            <p className="text-[11px] text-muted-foreground">Copy-paste text from your LinkedIn page</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => onPickOption('wizard')}
          className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card hover:bg-muted/40 transition-colors text-left"
        >
          <div className="w-9 h-9 rounded-lg bg-muted text-foreground flex items-center justify-center shrink-0">
            <Wand2 className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-xs sm:text-sm text-foreground">Smart wizard</p>
            <p className="text-[11px] text-muted-foreground">Guided step-by-step section paste</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => onPickOption('pdf')}
          className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card hover:bg-muted/40 transition-colors text-left"
        >
          <div className="w-9 h-9 rounded-lg bg-muted text-foreground flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-xs sm:text-sm text-foreground">Upload LinkedIn PDF</p>
            <p className="text-[11px] text-muted-foreground">Exported via LinkedIn's “Save to PDF”</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Step 3: Celebration Step                                                 */
/* ──────────────────────────────────────────────────────────────────────── */
function CelebrationStep({
  name,
  postAction,
  onGoEditor,
  onGoTailoring,
  onGoDashboard,
}: {
  name: string;
  postAction: 'editor' | 'tailor' | 'dashboard';
  onGoEditor: () => void;
  onGoTailoring: () => void;
  onGoDashboard: () => void;
}) {
  return (
    <div className="py-4 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4"
      >
        <CheckCircle2 className="w-8 h-8" />
      </motion.div>

      <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2 tracking-tight">
        You're all set{name ? `, ${name.split(' ')[0]}` : ''}!
      </h2>
      <p className="text-xs sm:text-sm text-muted-foreground max-w-xs mx-auto mb-6">
        Your profile and base resume have been saved and are ready to use.
      </p>

      <div className="space-y-3 max-w-xs mx-auto">
        {postAction === 'tailor' ? (
          <Button onClick={onGoTailoring} className="w-full h-11 rounded-xl font-semibold text-sm">
            Continue to Tailoring Hub <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        ) : (
          <Button onClick={onGoEditor} className="w-full h-11 rounded-xl font-semibold text-sm">
            Open Resume in Editor <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        )}

        <Button
          variant="outline"
          onClick={onGoDashboard}
          className="w-full h-11 rounded-xl text-xs text-muted-foreground"
        >
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
