import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Sparkles, Target, Briefcase, BookOpen, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AppIcon } from '@/components/brand/AppIcon';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/safeClient';
import { Input } from '@/components/ui/input';
import { useQueryClient } from '@tanstack/react-query';

const ONBOARDING_KEY = 'wr-onboarding-completed';
const TOTAL_STEPS = 6;

const REFERRAL_OPTIONS = ['Word of Mouth', 'Social Media', 'AI Search', 'Other'];

const ROLE_OPTIONS = [
  { id: 'job-seeker', label: 'Job Seeker', icon: Target, description: 'Actively looking for new opportunities', level: 'mid' },
  { id: 'hr', label: 'HR / Recruiter', icon: Briefcase, description: 'Hiring or reviewing candidates', level: 'senior' },
  { id: 'student', label: 'Student', icon: BookOpen, description: 'Preparing for internships or graduation', level: 'entry' },
  { id: 'exploring', label: 'Just Exploring', icon: Compass, description: 'Checking out what WiseResume can do', level: 'mid' }
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [referral, setReferral] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Fast path: localStorage already marked complete
    if (localStorage.getItem(ONBOARDING_KEY) === 'true') {
      navigate('/dashboard', { replace: true });
      return;
    }
  }, [navigate]);

  const markCompleted = async (skip: boolean = false) => {
    setIsSubmitting(true);
    
    if (user?.id) {
      try {
        const payload: Record<string, unknown> = {
          user_id: user.id,
          onboarding_completed: !skip,
        };
        
        if (!skip) {
          if (name) payload.full_name = name;
          if (dob) payload.date_of_birth = dob;
          if (phone) payload.phone_number = phone;
          if (referral) payload.referral_source = referral;
          if (role) {
            const selectedRole = ROLE_OPTIONS.find(r => r.id === role);
            if (selectedRole) payload.career_level = selectedRole.level;
          }
        }
        
        // upsert instead of update: creates the row if it doesn't exist yet
        // (new users may not have a profile row when they first hit onboarding)
        const { error } = await supabase
          .from('profiles')
          .upsert(payload as never, { onConflict: 'user_id' });

        if (error) {
          console.error('[Onboarding] Failed to save profile data:', error);
        } else {
          // Invalidate profile cache so dashboard/profile show fresh data
          queryClient.invalidateQueries({ queryKey: ['profile'] });
        }
      } catch (err) {
        console.error('[Onboarding] Unexpected error saving onboarding status:', err);
      }
    }
    
    // Only set the local storage flag if they completed it. If they skip, they get the dashboard banner.
    if (!skip) {
      localStorage.setItem(ONBOARDING_KEY, 'true');
    }
    
    setIsSubmitting(false);
    navigate('/dashboard', { replace: true });
  };

  const handleSkip = () => markCompleted(true);

  const handleNext = () => {
    if (step === TOTAL_STEPS - 1) {
      markCompleted(false);
      return;
    }
    setStep(s => s + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(s => s - 1);
  };

  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  const canProceed = step === 0 || step === 4 || step === 5
    || (step === 1 && name.trim().length > 0)
    || (step === 2 && referral !== null)
    || (step === 3 && role !== null);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }} 
      animate={{ opacity: 1, scale: 1 }} 
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col min-h-[100dvh] bg-background"
    >
      {/* Header */}
      <div className="shrink-0 px-4 pt-safe">
        <div className="flex items-center justify-between h-14">
          <div className="w-20">
            {step > 0 && (
              <Button variant="ghost" size="sm" onClick={handleBack} aria-label="Go back" disabled={isSubmitting}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted-foreground" disabled={isSubmitting}>
            Skip
          </Button>
        </div>
        <Progress value={progress} className="h-1.5 mb-4" />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-safe">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-md flex flex-col items-center text-center"
          >
            {/* Step 0: Welcome */}
            {step === 0 && (
              <>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                  className="mb-6"
                >
                  <AppIcon size={96} />
                </motion.div>
                <h1 className="text-2xl font-bold text-foreground mb-2">Welcome to WiseResume</h1>
                <p className="text-muted-foreground">Your AI-powered career companion. Let's set up your profile.</p>
              </>
            )}

            {/* Step 1: About You */}
            {step === 1 && (
              <>
                <h2 className="text-xl font-bold text-foreground mb-2">About You</h2>
                <p className="text-muted-foreground mb-6">Tell us a bit about yourself. This will also help us fulfill your portfolio data.</p>
                <div className="w-full space-y-4 text-left">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Full Name</label>
                    <Input 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      placeholder="Jane Doe"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Date of Birth</label>
                    <Input 
                      type="date"
                      value={dob} 
                      onChange={(e) => setDob(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Phone Number</label>
                    <Input 
                      type="tel"
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)} 
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Step 2: Referral */}
            {step === 2 && (
              <>
                <h2 className="text-xl font-bold text-foreground mb-2">How did you hear about us?</h2>
                <p className="text-muted-foreground mb-6">This helps us improve WiseResume</p>
                <div className="w-full flex flex-wrap justify-center gap-3">
                  {REFERRAL_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      onClick={() => setReferral(opt)}
                      className={`px-4 py-2.5 rounded-full border-2 text-sm font-medium transition-all ${
                        referral === opt
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-background hover:border-primary/40'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Step 3: Role */}
            {step === 3 && (
              <>
                <h2 className="text-xl font-bold text-foreground mb-2">What brings you here?</h2>
                <p className="text-muted-foreground mb-6">We'll tailor the experience for you</p>
                <div className="w-full space-y-3">
                  {ROLE_OPTIONS.map(r => (
                    <button
                      key={r.id}
                      onClick={() => setRole(r.id)}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all touch-manipulation active:scale-[0.98] ${
                        role === r.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/40'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <r.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{r.label}</p>
                        <p className="text-sm text-muted-foreground">{r.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Step 4: Done */}
            {step === 4 && (
              <>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
                  className="mb-4"
                >
                  <div className="w-20 h-20 rounded-full bg-success/15 flex items-center justify-center">
                    <Sparkles className="w-10 h-10 text-success" />
                  </div>
                </motion.div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Profile Complete! 🎉</h2>
                <p className="text-muted-foreground mb-6">You're all set up. Let's discover what you can do next.</p>
              </>
            )}

            {/* Step 5: What's Next */}
            {step === 5 && (
              <>
                <h2 className="text-2xl font-bold text-foreground mb-4">What's Next?</h2>
                <p className="text-muted-foreground mb-6">Explore AI Studio tools to land your next role.</p>
                <div className="w-full space-y-4 text-left">
                  <div className="p-4 border rounded-xl bg-card">
                    <h3 className="font-semibold mb-1 flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" /> Create a Resume First
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Before using the interview practice or portfolio builder, you'll need a resume in your account.
                    </p>
                    <Button variant="outline" size="sm" onClick={() => { markCompleted(false); navigate('/ai-studio'); }}>
                      Go to AI Studio
                    </Button>
                  </div>

                  <div className="p-4 border rounded-xl bg-card">
                    <h3 className="font-semibold mb-1 flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-primary" /> AI Interview Practice
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Practice answering questions out loud with our AI interviewer. Get instant feedback and scoring.
                    </p>
                    <Button variant="outline" size="sm" onClick={() => { markCompleted(false); navigate('/interview'); }}>
                      Try Interview Practice
                    </Button>
                  </div>

                  <div className="p-4 border rounded-xl bg-card">
                    <h3 className="font-semibold mb-1 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" /> Build Your Portfolio
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Turn your resume into a beautiful web portfolio in one click. Customize it and share with recruiters.
                    </p>
                    <Button variant="outline" size="sm" onClick={() => { markCompleted(false); navigate('/portfolio'); }}>
                      Open Portfolio Editor
                    </Button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="shrink-0 px-6 pb-6 pb-safe">
        {step < TOTAL_STEPS - 1 ? (
          <Button
            onClick={handleNext}
            disabled={!canProceed || isSubmitting}
            className="w-full h-12 text-base rounded-xl"
            size="lg"
          >
            {isSubmitting ? 'Saving...' : 'Continue'}
            {!isSubmitting && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        ) : (
          <Button
            onClick={() => markCompleted(false)}
            disabled={isSubmitting}
            className="w-full h-12 text-base rounded-xl"
            size="lg"
          >
            {isSubmitting ? 'Saving...' : 'Go to Dashboard'}
          </Button>
        )}
      </div>
    </motion.div>
  );
}
