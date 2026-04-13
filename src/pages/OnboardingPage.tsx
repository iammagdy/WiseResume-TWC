import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Sparkles, Target, Briefcase, BookOpen,
  MapPin, Linkedin, CheckCircle2, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { AppIcon } from '@/components/brand/AppIcon';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/safeClient';
import { getUserId } from '@/lib/supabaseBridge';
import { useQueryClient } from '@tanstack/react-query';
import { INDUSTRY_OPTIONS } from '@/hooks/useProfile';
import { useMe } from '@/hooks/useMe';
import { toast } from 'sonner';

const ONBOARDING_KEY = 'wr-onboarding-completed';
const ONBOARDING_DRAFT_KEY = 'wr-onboarding-draft';
const TOTAL_STEPS = 6;

// Career level options matching the DB enum exactly
const CAREER_LEVELS = [
  { value: 'Entry', label: 'Entry Level', years: '0–2 years' },
  { value: 'Mid', label: 'Mid Level', years: '3–5 years' },
  { value: 'Senior', label: 'Senior', years: '6–10 years' },
  { value: 'Lead', label: 'Lead / Manager', years: '8–12 years' },
  { value: 'Executive', label: 'Executive', years: '10+ years' },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: meData } = useMe();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [industry, setIndustry] = useState<string | null>(null);
  const [careerLevel, setCareerLevel] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [linkedinError, setLinkedinError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect completed users
  useEffect(() => {
    if (localStorage.getItem(ONBOARDING_KEY) === 'true') {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  // Restore draft on mount
  useEffect(() => {
    if (localStorage.getItem(ONBOARDING_KEY) === 'true') return;
    try {
      const raw = localStorage.getItem(ONBOARDING_DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft.full_name !== undefined) setName(draft.full_name);
      if (draft.job_title !== undefined) setJobTitle(draft.job_title);
      if (draft.industry !== undefined) setIndustry(draft.industry);
      if (draft.career_level !== undefined) setCareerLevel(draft.career_level);
      if (draft.location !== undefined) setLocation(draft.location);
      if (draft.linkedin_url !== undefined) setLinkedinUrl(draft.linkedin_url);
      if (draft.currentStep !== undefined) setStep(draft.currentStep);
    } catch {
      // Invalid draft — ignore
    }
  }, []);

  // Persist draft on every step or field change
  useEffect(() => {
    if (localStorage.getItem(ONBOARDING_KEY) === 'true') return;
    const draft = {
      full_name: name,
      job_title: jobTitle,
      industry,
      career_level: careerLevel,
      location,
      linkedin_url: linkedinUrl,
      currentStep: step,
    };
    localStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(draft));
  }, [name, jobTitle, industry, careerLevel, location, linkedinUrl, step]);

  const markCompleted = async (skip: boolean = false) => {
    setIsSubmitting(true);

    // Use the Supabase bridge UUID — falls back to user.id only if it's already a UUID
    const effectiveId = getUserId() || user?.id;

    let saveSucceeded = !effectiveId; // if no user id, treat as success (anonymous/edge case)

    if (effectiveId) {
      try {
        const payload: Record<string, unknown> = {
          user_id: effectiveId,
          onboarding_completed: !skip,
        };

        if (!skip) {
          if (name) payload.full_name = name;
          if (jobTitle) payload.job_title = jobTitle;
          if (industry) payload.industry = industry;
          if (careerLevel) payload.career_level = careerLevel; // already capitalized to match DB enum
          if (location) payload.location = location;
          if (linkedinUrl) payload.linkedin_url = linkedinUrl;
        }

        const { error } = await supabase
          .from('profiles')
          .upsert(payload as never, { onConflict: 'user_id' });

        if (error) {
          console.error('[Onboarding] Failed to save profile data:', error);
          saveSucceeded = false;
        } else {
          saveSucceeded = true;
          queryClient.invalidateQueries({ queryKey: ['profile'] });
        }
      } catch (err) {
        console.error('[Onboarding] Unexpected error saving onboarding status:', err);
        saveSucceeded = false;
      }
    }

    if (!skip) {
      localStorage.setItem(ONBOARDING_KEY, 'true');
    }

    // Only clear the draft once the profile has been persisted successfully
    if (saveSucceeded) {
      localStorage.removeItem(ONBOARDING_DRAFT_KEY);
    }

    setIsSubmitting(false);
    navigate('/dashboard', { replace: true });
  };

  const validateLinkedin = (value: string) => {
    if (!value.trim()) {
      setLinkedinError('');
      return true;
    }
    if (!value.includes('linkedin.com/in/')) {
      setLinkedinError('Please enter a valid LinkedIn profile URL, e.g. linkedin.com/in/yourname');
      return false;
    }
    setLinkedinError('');
    return true;
  };

  const handleSkip = () => markCompleted(true);
  const handleNext = () => {
    if (step === 3 && !validateLinkedin(linkedinUrl)) return;
    if (step === TOTAL_STEPS - 1) {
      markCompleted(false);
      return;
    }
    setStep(s => s + 1);
  };
  const handleBack = () => {
    if (step > 0) setStep(s => s - 1);
  };

  // Steps 0–3 count for user-facing progress; 4 & 5 are completion screens
  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  const canProceed =
    step === 0 ||
    step === 4 ||
    step === 5 ||
    (step === 1 && name.trim().length > 0) ||
    step === 2 ||
    (step === 3 && !linkedinError);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex flex-col h-[100dvh] overflow-hidden bg-background"
    >
      {/* ── Header ── */}
      <div className="shrink-0 px-4 sm:px-6 pt-safe">
        <div className="flex items-center justify-end h-14">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="text-muted-foreground hover:text-foreground"
            disabled={isSubmitting}
          >
            Skip
          </Button>
        </div>

        {/* Progress bar + step label */}
        <div className="space-y-1.5 mb-4">
          <Progress value={progress} className="h-1.5" />
          {step > 0 && step < 4 && (
            <p className="text-xs text-muted-foreground text-right">
              Step {step} of 3
            </p>
          )}
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-start px-4 sm:px-6 pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.22 }}
            className="w-full max-w-md flex-1 flex flex-col"
          >
            {/* ── Step 0: Welcome ── */}
            {step === 0 && (
              <div className="flex flex-col items-center text-center py-8 flex-1 justify-center">
                <motion.div
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 220, damping: 14 }}
                  className="mb-8 relative"
                >
                  {/* Gradient ring */}
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/30 to-primary/5 blur-xl scale-125" />
                  <div className="relative">
                    <AppIcon size={100} />
                  </div>
                </motion.div>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3 tracking-tight">
                  Welcome to WiseResume
                </h1>
                <p className="text-muted-foreground text-base leading-relaxed max-w-xs">
                  Your AI-powered career companion. Let's set up your profile in&nbsp;
                  <span className="text-foreground font-medium">3 quick steps</span>.
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
            )}

            {/* ── Step 1: Professional Identity ── */}
            {step === 1 && (
              <div className="py-4">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-foreground mb-2 tracking-tight">
                    Who are you professionally?
                  </h2>
                  <p className="text-muted-foreground">
                    This goes straight into your profile and resume.
                  </p>
                </div>

                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground">
                      Full Name <span className="text-primary">*</span>
                    </label>
                    <Input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Jane Doe"
                      autoFocus
                      className="h-12 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground">
                      Job Title <span className="text-muted-foreground font-normal">(optional)</span>
                    </label>
                    <Input
                      value={jobTitle}
                      onChange={e => setJobTitle(e.target.value)}
                      placeholder="e.g. Frontend Engineer, Product Manager"
                      className="h-12 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 2: Background ── */}
            {step === 2 && (
              <div className="py-4 pb-6">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-foreground mb-2 tracking-tight">
                    Your background
                  </h2>
                  <p className="text-muted-foreground">
                    Helps us tailor job matches and AI suggestions.
                  </p>
                </div>

                {/* Industry pills */}
                <div className="space-y-3 mb-6">
                  <label className="text-sm font-semibold text-foreground">Industry</label>
                  <div className="flex flex-wrap gap-2">
                    {INDUSTRY_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        onClick={() => setIndustry(industry === opt ? null : opt)}
                        className={`px-3.5 py-2 rounded-full border text-sm font-medium transition-all ${
                          industry === opt
                            ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                            : 'border-border bg-card hover:border-primary/50 text-foreground'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Career level cards */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-foreground">Experience Level</label>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                    {CAREER_LEVELS.map(lvl => (
                      <button
                        key={lvl.value}
                        onClick={() => setCareerLevel(careerLevel === lvl.value ? null : lvl.value)}
                        className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border transition-all text-left ${
                          careerLevel === lvl.value
                            ? 'border-primary bg-primary/10'
                            : 'border-border bg-card hover:border-primary/40'
                        }`}
                      >
                        <div>
                          <p className="font-semibold text-sm text-foreground">{lvl.label}</p>
                          <p className="text-xs text-muted-foreground">{lvl.years}</p>
                        </div>
                        {careerLevel === lvl.value && (
                          <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 3: Find You Online ── */}
            {step === 3 && (
              <div className="py-4">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-foreground mb-2 tracking-tight">
                    Where are you based?
                  </h2>
                  <p className="text-muted-foreground">
                    Optional — shown on your portfolio and used for local job filters.
                  </p>
                </div>

                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground" /> Location
                    </label>
                    <Input
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      placeholder="e.g. San Francisco, CA"
                      className="h-12 rounded-xl"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Linkedin className="w-3.5 h-3.5 text-muted-foreground" /> LinkedIn URL
                    </label>
                    <Input
                      value={linkedinUrl}
                      onChange={e => { setLinkedinUrl(e.target.value); if (linkedinError) setLinkedinError(''); }}
                      onBlur={e => validateLinkedin(e.target.value)}
                      placeholder="https://linkedin.com/in/yourname"
                      type="url"
                      className={`h-12 rounded-xl ${linkedinError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    />
                    {linkedinError && (
                      <p className="text-xs text-destructive">{linkedinError}</p>
                    )}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mt-5 text-center">
                  You can always update these in Settings.
                </p>
              </div>
            )}

            {/* ── Step 4: Celebration ── */}
            {step === 4 && (
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
            )}

            {/* ── Step 5: What's Next ── */}
            {step === 5 && (
              <div className="py-4">
                <div className="mb-6 text-center">
                  <h2 className="text-2xl font-bold text-foreground mb-2 tracking-tight">
                    Start strong
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Pick where you want to begin.
                  </p>
                </div>

                <div className="space-y-3">
                  {(() => {
                    const effectivePlan = meData?.subscription?.effective_plan ?? 'free';
                    const trialPlan = meData?.subscription?.trial_plan ?? null;
                    const trialExpiresAt = meData?.subscription?.trial_expires_at ?? null;
                    const isActiveTrial = !!trialPlan && !!trialExpiresAt && new Date(trialExpiresAt) > new Date();
                    const isFreeUser = effectivePlan === 'free' && !isActiveTrial;

                    const items = [
                      {
                        icon: Target,
                        title: 'Build your resume',
                        description: 'Import or create an AI-polished resume in minutes.',
                        action: () => { markCompleted(false); navigate('/dashboard'); },
                        gated: false,
                      },
                      {
                        icon: BookOpen,
                        title: 'Practice interviews',
                        description: 'Answer questions with our AI coach and get instant scoring.',
                        action: isFreeUser
                          ? () => toast.info('Interview Coach is available on Pro and Premium plans — you can upgrade anytime from Settings.')
                          : () => { markCompleted(false); navigate('/interview'); },
                        gated: isFreeUser,
                      },
                      {
                        icon: Sparkles,
                        title: 'Launch your portfolio',
                        description: 'Turn your resume into a shareable web portfolio in one click.',
                        action: () => { markCompleted(false); navigate('/portfolio'); },
                        gated: false,
                      },
                    ];

                    return items.map(({ icon: Icon, title, description, action, gated }) => (
                      <button
                        key={title}
                        onClick={action}
                        disabled={isSubmitting}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl border bg-card transition-all text-left group ${
                          gated
                            ? 'border-border opacity-60 cursor-default'
                            : 'border-border hover:border-primary/40 hover:bg-primary/5'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 ${gated ? '' : 'group-hover:bg-primary/15 transition-colors'}`}>
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground">{title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                          {gated && (
                            <p className="text-xs text-primary mt-0.5">Pro & Premium only</p>
                          )}
                        </div>
                        <ChevronRight className={`w-4 h-4 shrink-0 ${gated ? 'text-muted-foreground/40' : 'text-muted-foreground group-hover:text-primary transition-colors'}`} />
                      </button>
                    ));
                  })()}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Sticky footer with Back + Next ── */}
      <div className="shrink-0 px-4 sm:px-6 pt-4 border-t border-border bg-background pb-safe">
        <div className="flex gap-3 max-w-md mx-auto">
          {step > 0 && step < TOTAL_STEPS - 1 && (
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={isSubmitting}
              className="flex-1 h-12 rounded-xl"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back
            </Button>
          )}
          {step < TOTAL_STEPS - 1 ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed || isSubmitting}
              className="flex-[2] h-12 text-base rounded-xl"
            >
              {isSubmitting ? 'Saving…' : 'Continue'}
              {!isSubmitting && <ArrowRight className="w-4 h-4 ml-1.5" />}
            </Button>
          ) : (
            <Button
              onClick={() => markCompleted(false)}
              disabled={isSubmitting}
              className="flex-1 h-12 text-base rounded-xl"
            >
              {isSubmitting ? 'Saving…' : 'Go to Dashboard'}
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
