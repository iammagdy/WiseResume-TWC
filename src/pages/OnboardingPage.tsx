import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Sparkles, Target, Briefcase, BookOpen,
  Linkedin, ChevronRight, Pencil, Upload, FileText, Loader2, Check,
  Wand2, Copy, Link2, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppIcon } from '@/components/brand/AppIcon';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { useMe } from '@/hooks/useMe';
import { toast } from 'sonner';
import { parseResumePDF, parseResumePDFWithOCR, parseTextWithAI } from '@/lib/pdfParser';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { databases, DATABASE_ID, Query } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';
import {
  fromResumeData, fromProfileData, saveOnboardingProfile,
  probeLinkedInUrl, emptyProfile, reconcileOnboardingCompletion,
  type ExtractedProfile,
} from '@/lib/onboardingProfile';
import { OnboardingProfileReviewSheet } from '@/components/onboarding/OnboardingProfileReviewSheet';
import type { ProfileData } from '@/components/settings/ProfileImportSheet';
import { logAudit } from '@/lib/auditLogger';
import { cn } from '@/lib/utils';

type OnboardingMethod =
  | 'cv'
  | 'linkedin-url'
  | 'linkedin-paste'
  | 'linkedin-wizard'
  | 'linkedin-pdf'
  | 'manual';

const ProfileImportSheet = lazy(() =>
  import('@/components/settings/ProfileImportSheet').then((m) => ({ default: m.ProfileImportSheet })),
);

/**
 * Per-user onboarding-complete key. Scoped by Kinde user id so a shared
 * browser doesn't carry one account's "completed" flag into another
 * account's session (architect feedback on Task #24).
 */
function onboardingKey(userId: string): string {
  return `wr-onboarding-completed-${userId}`;
}

interface AcceptanceCounts {
  experienceKept: number; experienceTotal: number;
  educationKept: number; educationTotal: number;
  skillsKept: number; skillsTotal: number;
  certificationsKept: number; certificationsTotal: number;
  languagesKept: number; languagesTotal: number;
  projectsKept: number; projectsTotal: number;
  volunteeringKept: number; volunteeringTotal: number;
  // personal-info keep flags (1=kept, 0=dropped); only meaningful when the
  // corresponding *Total below is 1.
  fullNameKept: number; fullNameTotal: number;
  emailKept: number; emailTotal: number;
  phoneKept: number; phoneTotal: number;
  locationKept: number; locationTotal: number;
  linkedinUrlKept: number; linkedinUrlTotal: number;
  jobTitleKept: number; jobTitleTotal: number;
  summaryKept: number; summaryTotal: number;
}

function computeAcceptanceCounts(
  total: ExtractedProfile | null,
  kept: ExtractedProfile,
): AcceptanceCounts {
  const t = total ?? kept;
  const f = (v: unknown): number => (v ? 1 : 0);
  return {
    experienceKept: kept.experience.length, experienceTotal: t.experience.length,
    educationKept: kept.education.length, educationTotal: t.education.length,
    skillsKept: kept.skills.length, skillsTotal: t.skills.length,
    certificationsKept: kept.certifications.length, certificationsTotal: t.certifications.length,
    languagesKept: kept.languages.length, languagesTotal: t.languages.length,
    projectsKept: kept.projects.length, projectsTotal: t.projects.length,
    volunteeringKept: kept.volunteering.length, volunteeringTotal: t.volunteering.length,
    fullNameKept: f(kept.fullName), fullNameTotal: f(t.fullName),
    emailKept: f(kept.email), emailTotal: f(t.email),
    phoneKept: f(kept.phone), phoneTotal: f(t.phone),
    locationKept: f(kept.location), locationTotal: f(t.location),
    linkedinUrlKept: f(kept.linkedinUrl), linkedinUrlTotal: f(t.linkedinUrl),
    jobTitleKept: f(kept.jobTitle), jobTitleTotal: f(t.jobTitle),
    summaryKept: f(kept.summary), summaryTotal: f(t.summary),
  };
}

/**
 * Return the names of *list* sections where the user dropped most of what we
 * extracted. Only flags sections with at least 3 extracted items, so trivial
 * cases (e.g. one skill that the user removed) don't generate noise.
 */
function findLowAcceptanceSections(c: AcceptanceCounts): string[] {
  const sections: { name: string; kept: number; total: number }[] = [
    { name: 'experience', kept: c.experienceKept, total: c.experienceTotal },
    { name: 'education', kept: c.educationKept, total: c.educationTotal },
    { name: 'skills', kept: c.skillsKept, total: c.skillsTotal },
    { name: 'certifications', kept: c.certificationsKept, total: c.certificationsTotal },
    { name: 'languages', kept: c.languagesKept, total: c.languagesTotal },
    { name: 'projects', kept: c.projectsKept, total: c.projectsTotal },
    { name: 'volunteering', kept: c.volunteeringKept, total: c.volunteeringTotal },
  ];
  return sections
    .filter((s) => s.total >= 3 && s.kept / s.total < 0.5)
    .map((s) => s.name);
}

type Step = 'welcome' | 'choice' | 'cv' | 'linkedin' | 'manual' | 'celebration' | 'whatsnext';
type LinkedInOption = null | 'paste' | 'wizard' | 'pdf' | 'url';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: meData } = useMe();

  const [step, setStep] = useState<Step>('welcome');
  // Track which onboarding path the user is on, so completion / save-failed
  // events can be correlated with the chosen method.
  const methodRef = useRef<OnboardingMethod | null>(null);

  // Log entry into the onboarding flow once.
  useEffect(() => {
    logAudit('onboarding', 'started', {});
  }, []);

  // Manual path
  const [manualName, setManualName] = useState('');
  const [manualJobTitle, setManualJobTitle] = useState('');
  const [isSavingManual, setIsSavingManual] = useState(false);

  // CV path
  const cvInputRef = useRef<HTMLInputElement>(null);
  const [cvProcessing, setCvProcessing] = useState(false);
  const [cvError, setCvError] = useState<string | null>(null);

  // LinkedIn path
  const [liOption, setLiOption] = useState<LinkedInOption>(null);
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [linkedinUrlError, setLinkedinUrlError] = useState('');
  const [linkedinUrlProcessing, setLinkedinUrlProcessing] = useState(false);
  const [showProfileImportSheet, setShowProfileImportSheet] = useState(false);
  const [profileImportInitial, setProfileImportInitial] = useState<'paste' | 'wizard' | 'pdf' | undefined>(undefined);

  // Review & confirm
  const [pendingProfile, setPendingProfile] = useState<ExtractedProfile | null>(null);
  const [partialNotice, setPartialNotice] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Final celebration uses this name
  const [finalName, setFinalName] = useState('');

  // Redirect if already completed.
  // Also reconcile half-completed onboarding state: if the local flag is
  // missing (e.g. user cleared cache, or a previous save died after the
  // resume insert) but the user already has a resume, flip the DB flag
  // and redirect — don't make them redo onboarding.
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
        // non-critical — fall through to normal onboarding flow
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, user]);

  // ─── Save flows ─────────────────────────────────────────────────────────
  const completeWith = useCallback(async (filtered: ExtractedProfile) => {
    setIsSaving(true);
    try {
      const result = await saveOnboardingProfile({
        selectedProfile: filtered,
        fallbackUserId: user?.id ?? null,
        fallbackUserEmail: user?.email ?? null,
        resumeTitle: filtered.fullName ? `${filtered.fullName} – Resume` : 'My Resume',
      });
      // Only mark complete and advance after a confirmed save.
      // Per-user key prevents shared-browser bleed across accounts.
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

      // Compare what was extracted vs what the user actually kept, so we can
      // see which fields are most often unchecked (a signal that our
      // extraction is producing low-quality output for that section).
      const counts = computeAcceptanceCounts(pendingProfile, filtered);
      logAudit('onboarding', 'completed', {
        method: methodRef.current,
        hasResume: result.hasResume,
        ...counts,
      });
      // Surface a separate event for any section where the user dropped
      // most of the items — easier to alert on than scanning ratios.
      const lowAcceptance = findLowAcceptanceSections(counts);
      if (lowAcceptance.length) {
        logAudit('onboarding', 'low_acceptance', {
          method: methodRef.current,
          sections: lowAcceptance,
        });
      }

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
      // Keep the review sheet open so the user can retry.
    } finally {
      setIsSaving(false);
    }
  }, [queryClient, user, pendingProfile]);

  // ─── CV path ────────────────────────────────────────────────────────────
  const handleCvFile = useCallback(async (file: File) => {
    setCvError(null);
    setCvProcessing(true);
    try {
      let resumeData;
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const result = await parseResumePDF(file);
        resumeData = result.data;
        if (result.needsOCR || !resumeData) {
          const ocr = await parseResumePDFWithOCR(file);
          resumeData = ocr.data;
        }
      } else if (
        file.type === 'application/msword' ||
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        /\.(docx?|txt)$/i.test(file.name)
      ) {
        // Word fallback: extract text via mammoth, then AI-parse
        const mammoth = await import('mammoth/mammoth.browser');
        const arrayBuffer = await file.arrayBuffer();
        const { value } = await mammoth.extractRawText({ arrayBuffer });
        resumeData = await parseTextWithAI(value);
      } else if (file.type.startsWith('image/')) {
        const { extractTextFromImage } = await import('@/lib/pdf/ocrExtractor');
        const text = await extractTextFromImage(file);
        resumeData = await parseTextWithAI(text);
      } else {
        throw new Error('Unsupported file type. Please upload a PDF, Word, or image file.');
      }
      if (!resumeData) throw new Error('We couldn\'t read this file. Please try a different one.');

      const profile = fromResumeData(resumeData);
      const anything = profile.fullName || profile.email || profile.summary ||
        profile.experience.length || profile.education.length || profile.skills.length;
      if (!anything) {
        throw new Error('We couldn\'t find any profile data in this file. Please try a different one.');
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
  }, []);

  // ─── LinkedIn URL path ──────────────────────────────────────────────────
  const handleLinkedInUrlSubmit = useCallback(async () => {
    const v = linkedinUrl.trim();
    if (!v) {
      setLinkedinUrlError('Please paste your LinkedIn profile URL.');
      return;
    }
    // Strict hostname validation — must be the actual linkedin.com domain.
    const candidate = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    let parsed: URL;
    try {
      parsed = new URL(candidate);
    } catch {
      setLinkedinUrlError('That doesn\'t look like a valid URL.');
      return;
    }
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const isLinkedIn = host === 'linkedin.com' || host.endsWith('.linkedin.com');
    if (!isLinkedIn || !/\/in\//i.test(parsed.pathname)) {
      setLinkedinUrlError('Please paste a valid LinkedIn profile URL like linkedin.com/in/yourname');
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
        // Server-side importer (Proxycurl) returned structured data — skip
        // the AI parse step entirely and use the rich extraction directly.
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
          extracted = fromProfileData(data as Partial<ProfileData>, {
            fullName: probe.derivedName ?? undefined,
            linkedinUrl: linkedinUrlNormalized,
          });
        } catch {
          // AI failed — fall back to derived metadata only
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
          notice = 'You\'ve hit this month\'s LinkedIn import limit. We saved the basics — copy-paste your profile or upload a PDF for richer data.';
        } else if (probe.notConfigured) {
          notice = 'Rich LinkedIn import isn\'t enabled on this server, so we only fetched public meta. For full data, copy-paste your profile or upload a PDF.';
        } else {
          notice = 'LinkedIn limits what we can fetch from a public URL. We saved the basics — for richer data, copy-paste your profile or upload a PDF on the previous screen.';
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
      toast.error('Couldn\'t reach that LinkedIn URL. Try copy-paste or PDF instead.');
    } finally {
      setLinkedinUrlProcessing(false);
    }
  }, [linkedinUrl]);

  const handleProfileImportSheetImport = useCallback((data: Partial<ProfileData>) => {
    const extracted = fromProfileData(data);
    setPendingProfile(extracted);
    setPartialNotice(null);
    setShowProfileImportSheet(false);
    setShowReview(true);
    logAudit('onboarding', 'review_opened', { method: methodRef.current });
  }, []);

  // ─── Manual path ────────────────────────────────────────────────────────
  // Manual flow funnels through the same Review & Confirm sheet as every
  // other path so the persistence pipeline (and error handling) is identical.
  const handleManualContinue = useCallback(() => {
    if (!manualName.trim()) return;
    setIsSavingManual(true);
    const profile = emptyProfile();
    profile.fullName = manualName.trim();
    if (manualJobTitle.trim()) profile.jobTitle = manualJobTitle.trim();
    setPendingProfile(profile);
    setPartialNotice(null);
    setShowReview(true);
    setIsSavingManual(false);
    logAudit('onboarding', 'review_opened', { method: methodRef.current });
  }, [manualName, manualJobTitle]);

  // ─── Skip ───────────────────────────────────────────────────────────────
  const handleSkip = useCallback(async () => {
    logAudit('onboarding', 'skipped', { step, method: methodRef.current });
    if (user?.id) {
      try {
        const profileRes = await databases.listDocuments(DATABASE_ID, COLLECTIONS.profiles, [
          Query.equal('user_id', user.id),
          Query.select(['$id']),
          Query.limit(1),
        ]);
        if (profileRes.documents.length > 0) {
          await databases.updateDocument(DATABASE_ID, COLLECTIONS.profiles, profileRes.documents[0].$id, {
            onboarding_completed: true,
          });
        }
        queryClient.invalidateQueries({ queryKey: ['profile'] });
      } catch {
        // non-critical — onboarding flag update failure does not block skip
      }
    }
    if (user?.id) {
      localStorage.setItem(onboardingKey(user.id), 'true');
    }
    navigate('/dashboard', { replace: true });
  }, [navigate, user, queryClient]);

  const handleBack = () => {
    if (step === 'choice') setStep('welcome');
    else if (step === 'cv' || step === 'linkedin' || step === 'manual') {
      // Reset path-specific state — including the tracked method, so a later
      // 'skipped' or 'completed' event isn't attributed to a stale path.
      methodRef.current = null;
      setLiOption(null);
      setCvError(null);
      setLinkedinUrl('');
      setLinkedinUrlError('');
      setStep('choice');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex flex-col h-[100dvh] overflow-hidden bg-background"
    >
      {/* Header */}
      <div className="shrink-0 px-4 sm:px-6 pt-safe">
        <div className="flex items-center justify-between h-14">
          {(step === 'cv' || step === 'linkedin' || step === 'manual' || step === 'choice') ? (
            <Button variant="ghost" size="sm" onClick={handleBack} className="text-muted-foreground hover:text-foreground -ml-2">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          ) : <div />}
          {step !== 'celebration' && step !== 'whatsnext' && (
            <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted-foreground hover:text-foreground">
              Skip
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-start px-4 sm:px-6 pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.22 }}
            className="w-full max-w-md flex-1 flex flex-col"
          >
            {step === 'welcome' && <WelcomeStep />}
            {step === 'choice' && (
              <ChoiceStep
                onPick={(p) => {
                  // We log the *committed* method when a sub-option is picked
                  // (LinkedIn has 4 sub-options). For 'cv' and 'manual' the
                  // landing card itself is the method, so log immediately.
                  if (p === 'cv') {
                    methodRef.current = 'cv';
                    logAudit('onboarding', 'path_selected', { method: 'cv' });
                    setStep('cv');
                  } else if (p === 'linkedin') {
                    setStep('linkedin');
                  } else {
                    methodRef.current = 'manual';
                    logAudit('onboarding', 'path_selected', { method: 'manual' });
                    setStep('manual');
                  }
                }}
              />
            )}
            {step === 'cv' && (
              <CvStep
                processing={cvProcessing}
                error={cvError}
                inputRef={cvInputRef}
                onFile={handleCvFile}
              />
            )}
            {step === 'linkedin' && (
              <LinkedInStep
                option={liOption}
                onPickOption={(o) => {
                  setLiOption(o);
                  if (o === 'paste') { methodRef.current = 'linkedin-paste'; logAudit('onboarding', 'path_selected', { method: 'linkedin-paste' }); setProfileImportInitial('paste'); setShowProfileImportSheet(true); }
                  if (o === 'wizard') { methodRef.current = 'linkedin-wizard'; logAudit('onboarding', 'path_selected', { method: 'linkedin-wizard' }); setProfileImportInitial('wizard'); setShowProfileImportSheet(true); }
                  if (o === 'pdf') { methodRef.current = 'linkedin-pdf'; logAudit('onboarding', 'path_selected', { method: 'linkedin-pdf' }); setProfileImportInitial('pdf'); setShowProfileImportSheet(true); }
                  if (o === 'url') { methodRef.current = 'linkedin-url'; logAudit('onboarding', 'path_selected', { method: 'linkedin-url' }); }
                }}
                url={linkedinUrl}
                setUrl={(v) => { setLinkedinUrl(v); if (linkedinUrlError) setLinkedinUrlError(''); }}
                urlError={linkedinUrlError}
                urlProcessing={linkedinUrlProcessing}
                onSubmitUrl={handleLinkedInUrlSubmit}
              />
            )}
            {step === 'manual' && (
              <ManualStep
                name={manualName}
                setName={setManualName}
                jobTitle={manualJobTitle}
                setJobTitle={setManualJobTitle}
                saving={isSavingManual}
                onContinue={handleManualContinue}
              />
            )}
            {step === 'celebration' && <CelebrationStep name={finalName} onNext={() => setStep('whatsnext')} />}
            {step === 'whatsnext' && (
              <WhatsNextStep
                meData={meData}
                onAction={(path) => navigate(path)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Sticky footer */}
      <div className="shrink-0 px-4 sm:px-6 pt-4 border-t border-border bg-background pb-safe">
        <div className="flex gap-3 max-w-md mx-auto">
          {step === 'welcome' && (
            <Button onClick={() => setStep('choice')} className="flex-1 h-12 text-base rounded-xl">
              Get started <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          )}
          {step === 'celebration' && (
            <Button onClick={() => setStep('whatsnext')} className="flex-1 h-12 text-base rounded-xl">
              Continue <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          )}
          {step === 'whatsnext' && (
            <Button onClick={() => navigate('/dashboard', { replace: true })} className="flex-1 h-12 text-base rounded-xl">
              Go to Dashboard
            </Button>
          )}
        </div>
      </div>

      {/* Per-item review sheet */}
      <OnboardingProfileReviewSheet
        open={showReview}
        onClose={() => {
          setShowReview(false);
          // Only treat as a dismissal when the user closes the sheet without
          // a save in flight — successful saves close the sheet via completeWith.
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

      {/* LinkedIn paste/wizard/PDF sheet */}
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
/* Welcome                                                                  */
/* ──────────────────────────────────────────────────────────────────────── */
function WelcomeStep() {
  return (
    <div className="flex flex-col items-center text-center py-8 flex-1 justify-center">
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 220, damping: 14 }}
        className="mb-8 relative"
      >
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/30 to-primary/5 blur-xl scale-125" />
        <div className="relative">
          <AppIcon size={100} />
        </div>
      </motion.div>
      <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3 tracking-tight">
        Welcome to WiseResume
      </h1>
      <p className="text-muted-foreground text-base leading-relaxed max-w-xs">
        Your AI-powered career companion. Let's get your profile set up{' '}
        <span className="text-foreground font-medium">in seconds</span>.
      </p>
      <div className="mt-10 w-full space-y-3 text-left">
        {[
          { icon: Target, text: 'Build a standout resume with AI' },
          { icon: Briefcase, text: 'Practice interviews and get feedback' },
          { icon: Sparkles, text: 'Create a public portfolio in one click' },
        ].map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-card border border-border shadow-soft-sm">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Choice (3 cards)                                                         */
/* ──────────────────────────────────────────────────────────────────────── */
function MultiColorSparkle({ className }: { className?: string }) {
  // Google-style multi-color sparkle (blue/red/yellow/green)
  return (
    <svg viewBox="0 0 32 32" className={cn('w-7 h-7', className)} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M16 3l2.4 6.8L25 12l-6.6 2.2L16 21l-2.4-6.8L7 12l6.6-2.2L16 3z" fill="#4285F4" />
      <path d="M25 18l1.2 3 3 1-3 1-1.2 3-1.2-3-3-1 3-1L25 18z" fill="#EA4335" />
      <path d="M7 22l1 2.5 2.5 1-2.5 1L7 29l-1-2.5-2.5-1 2.5-1L7 22z" fill="#FBBC04" />
      <path d="M24 5l.8 2 2 .7-2 .7L24 10.4l-.8-2-2-.7 2-.7L24 5z" fill="#34A853" />
    </svg>
  );
}

function ChoiceStep({ onPick }: { onPick: (path: 'cv' | 'linkedin' | 'manual') => void }) {
  return (
    <div className="py-4">
      <div className="mb-6 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2 tracking-tight">
          Setup Your Profile
        </h2>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          Set up instantly with one click — or customize manually for full control.
        </p>
      </div>

      <div className="space-y-3">
        {/* Card 1 — One-click (AI hero) */}
        <motion.button
          whileTap={{ scale: 0.985 }}
          onClick={() => onPick('cv')}
          className="relative w-full text-left rounded-2xl p-[2px] bg-[conic-gradient(from_180deg_at_50%_50%,#4285F4_0deg,#EA4335_90deg,#FBBC04_200deg,#34A853_300deg,#4285F4_360deg)] shadow-soft-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <div className="rounded-[14px] bg-card p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 via-white to-yellow-50 dark:from-blue-950 dark:via-card dark:to-yellow-950 flex items-center justify-center shrink-0 border border-border">
              <MultiColorSparkle />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground">Setup your profile by one click</p>
              <p className="text-xs text-muted-foreground mt-0.5">AI fills your profile from your CV in seconds</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
          </div>
        </motion.button>

        {/* Card 2 — LinkedIn */}
        <motion.button
          whileTap={{ scale: 0.985 }}
          onClick={() => onPick('linkedin')}
          className="w-full text-left rounded-2xl p-4 border-2 border-[#0A66C2]/70 bg-card hover:bg-[#0A66C2]/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A66C2] flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-md bg-[#0A66C2] flex items-center justify-center shrink-0">
            <Linkedin className="w-6 h-6 text-white" fill="currentColor" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground">Setup your profile by LinkedIn</p>
            <p className="text-xs text-muted-foreground mt-0.5">Paste, upload PDF, or share your URL</p>
          </div>
          <ChevronRight className="w-5 h-5 text-[#0A66C2] shrink-0" />
        </motion.button>

        {/* Card 3 — Manual (understated) */}
        <motion.button
          whileTap={{ scale: 0.985 }}
          onClick={() => onPick('manual')}
          className="w-full text-left rounded-2xl p-4 border border-border bg-muted/40 hover:bg-muted/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <Pencil className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground">Setup your profile manually</p>
            <p className="text-xs text-muted-foreground mt-0.5">Just your name to get started</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
        </motion.button>
      </div>

      <p className="text-xs text-muted-foreground text-center mt-6">
        You can always edit details like industry, experience level, and location later in your profile.
      </p>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* CV one-click upload                                                      */
/* ──────────────────────────────────────────────────────────────────────── */
function CvStep({
  processing, error, inputRef, onFile,
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
    <div className="py-4">
      <div className="mb-6 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2 tracking-tight">
          Click to upload your CV
        </h2>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          Our AI will extract your experience, skills, and education in seconds.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={onChange}
        className="hidden"
        disabled={processing}
      />

      <button
        type="button"
        onClick={handleClick}
        disabled={processing}
        className="w-full rounded-2xl p-[2px] bg-[conic-gradient(from_180deg_at_50%_50%,#4285F4_0deg,#EA4335_90deg,#FBBC04_200deg,#34A853_300deg,#4285F4_360deg)] shadow-soft-md disabled:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div className="rounded-[14px] bg-card px-6 py-12 flex flex-col items-center justify-center text-center">
          {processing ? (
            <>
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <p className="font-semibold text-foreground">Reading your CV…</p>
              <p className="text-xs text-muted-foreground mt-1">This usually takes a few seconds.</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-50 via-white to-yellow-50 dark:from-blue-950 dark:via-card dark:to-yellow-950 flex items-center justify-center mb-4 border border-border">
                <Upload className="w-7 h-7 text-foreground" />
              </div>
              <p className="font-semibold text-foreground">Click to upload your CV</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, or image • Up to 10 MB</p>
              <div className="mt-4 inline-flex items-center gap-1.5 text-xs text-primary font-medium">
                <MultiColorSparkle className="w-4 h-4" />
                AI fills your profile in seconds
              </div>
            </>
          )}
        </div>
      </button>

      {error && (
        <div className="mt-4 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-sm text-destructive flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* LinkedIn options                                                         */
/* ──────────────────────────────────────────────────────────────────────── */
function LinkedInOptionRow({
  icon, label, sublabel, onClick, accent,
}: { icon: React.ReactNode; label: string; sublabel: string; onClick: () => void; accent?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-4 p-4 rounded-2xl border bg-card transition-all text-left active:scale-[0.99]',
        accent ? 'border-[#0A66C2]/50 hover:bg-[#0A66C2]/5' : 'border-border hover:border-primary/40 hover:bg-primary/5',
      )}
    >
      <div className={cn(
        'w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
        accent ? 'bg-[#0A66C2]/10 text-[#0A66C2]' : 'bg-muted text-foreground',
      )}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{sublabel}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
    </button>
  );
}

function LinkedInStep({
  option, onPickOption, url, setUrl, urlError, urlProcessing, onSubmitUrl,
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
    <div className="py-4">
      <div className="mb-6 text-center">
        <div className="w-14 h-14 rounded-xl bg-[#0A66C2] flex items-center justify-center mx-auto mb-3">
          <Linkedin className="w-7 h-7 text-white" fill="currentColor" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2 tracking-tight">
          Import from LinkedIn
        </h2>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          Pick the method that's easiest for you.
        </p>
      </div>

      <div className="space-y-2.5">
        <LinkedInOptionRow
          icon={<Link2 className="w-5 h-5" />}
          label="Paste LinkedIn URL"
          sublabel="Quickest — basic public data only"
          onClick={() => onPickOption('url')}
          accent
        />
        {option === 'url' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="px-1 pt-1 pb-2 space-y-2"
          >
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://linkedin.com/in/yourname"
              type="url"
              className={cn('h-12 rounded-xl', urlError && 'border-destructive focus-visible:ring-destructive')}
              autoFocus
              disabled={urlProcessing}
            />
            {urlError && <p className="text-xs text-destructive">{urlError}</p>}
            <Button
              onClick={onSubmitUrl}
              disabled={urlProcessing}
              className="w-full h-11 rounded-xl"
            >
              {urlProcessing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Fetching…</>
              ) : (
                <>Continue with URL <ArrowRight className="w-4 h-4 ml-1.5" /></>
              )}
            </Button>
            <p className="text-[11px] text-muted-foreground">
              LinkedIn limits public access — for the richest profile, use Paste text or PDF below.
            </p>
          </motion.div>
        )}

        <LinkedInOptionRow
          icon={<Copy className="w-5 h-5" />}
          label="Paste profile text"
          sublabel="Copy-paste your whole LinkedIn page"
          onClick={() => onPickOption('paste')}
        />
        <LinkedInOptionRow
          icon={<Wand2 className="w-5 h-5" />}
          label="Smart wizard"
          sublabel="Guided step-by-step paste"
          onClick={() => onPickOption('wizard')}
        />
        <LinkedInOptionRow
          icon={<FileText className="w-5 h-5" />}
          label="Upload LinkedIn PDF"
          sublabel="From LinkedIn's “Save to PDF”"
          onClick={() => onPickOption('pdf')}
        />
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Manual                                                                   */
/* ──────────────────────────────────────────────────────────────────────── */
function ManualStep({
  name, setName, jobTitle, setJobTitle, saving, onContinue,
}: {
  name: string;
  setName: (v: string) => void;
  jobTitle: string;
  setJobTitle: (v: string) => void;
  saving: boolean;
  onContinue: () => void;
}) {
  return (
    <div className="py-4">
      <div className="mb-6 text-center">
        <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
          <Pencil className="w-6 h-6 text-muted-foreground" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2 tracking-tight">
          Set up manually
        </h2>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          Just the basics. You can fill the rest in later from your profile.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-foreground">
            Full name <span className="text-primary">*</span>
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
            autoFocus
            className="h-12 rounded-xl"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-foreground">
            Job title <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <Input
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="e.g. Frontend Engineer"
            className="h-12 rounded-xl"
          />
        </div>
      </div>

      <Button
        onClick={onContinue}
        disabled={!name.trim() || saving}
        className="w-full h-12 mt-6 rounded-xl text-base"
      >
        {saving ? 'Saving…' : (<>Continue <ArrowRight className="w-4 h-4 ml-1.5" /></>)}
      </Button>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Celebration & What's next                                                */
/* ──────────────────────────────────────────────────────────────────────── */
function CelebrationStep({ name, onNext: _onNext }: { name: string; onNext: () => void }) {
  return (
    <div className="flex flex-col items-center text-center py-8 flex-1 justify-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 16, delay: 0.05 }}
        className="mb-6"
      >
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
          <Sparkles className="w-12 h-12 text-primary" />
        </div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-3xl font-bold text-foreground mb-3 tracking-tight">
          You're all set{name ? `, ${name.split(' ')[0]}` : ''}!
        </h2>
        <p className="text-muted-foreground max-w-xs mx-auto">
          Your profile is ready. Here's what you can do next.
        </p>
      </motion.div>
    </div>
  );
}

function WhatsNextStep({
  meData, onAction,
}: {
  meData: ReturnType<typeof useMe>['data'];
  onAction: (path: string) => void;
}) {
  const effectivePlan = meData?.subscription?.effective_plan ?? 'free';
  const trialPlan = meData?.subscription?.trial_plan ?? null;
  const trialExpiresAt = meData?.subscription?.trial_expires_at ?? null;
  const isActiveTrial = !!trialPlan && !!trialExpiresAt && new Date(trialExpiresAt) > new Date();
  const isFreeUser = effectivePlan === 'free' && !isActiveTrial;

  const items = [
    {
      icon: Target,
      title: 'Build your resume',
      description: 'Polish or extend your AI-generated resume.',
      action: () => onAction('/dashboard'),
      gated: false,
    },
    {
      icon: BookOpen,
      title: 'Practice interviews',
      description: 'Answer questions with our AI coach and get instant scoring.',
      action: isFreeUser
        ? () => toast.info('Interview Coach is available on Pro and Premium plans.')
        : () => onAction('/interview'),
      gated: isFreeUser,
    },
    {
      icon: Sparkles,
      title: 'Launch your portfolio',
      description: 'Turn your resume into a shareable web portfolio.',
      action: () => onAction('/portfolio'),
      gated: false,
    },
  ];

  return (
    <div className="py-4">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2 tracking-tight">
          Start strong
        </h2>
        <p className="text-muted-foreground text-sm">Pick where you want to begin.</p>
      </div>
      <div className="space-y-3">
        {items.map(({ icon: Icon, title, description, action, gated }) => (
          <button
            key={title}
            onClick={action}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl border bg-card transition-all text-left group ${
              gated ? 'border-border opacity-60 cursor-default' : 'border-border hover:border-primary/40 hover:bg-primary/5'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 ${gated ? '' : 'group-hover:bg-primary/15 transition-colors'}`}>
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              {gated && <p className="text-xs text-primary mt-0.5">Pro &amp; Premium only</p>}
            </div>
            <ChevronRight className={`w-4 h-4 shrink-0 ${gated ? 'text-muted-foreground/40' : 'text-muted-foreground group-hover:text-primary transition-colors'}`} />
          </button>
        ))}
      </div>
    </div>
  );
}
