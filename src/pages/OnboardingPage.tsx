import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Sparkles, Target, Palette, Bell, CheckCircle2, PenTool, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AppIcon } from '@/components/brand/AppIcon';
import { TemplateThumbnail } from '@/components/editor/TemplateThumbnail';
import { templates, sampleResumeData } from '@/lib/templateData';
import { TemplateId } from '@/types/resume';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/safeClient';

const ONBOARDING_KEY = 'wr-onboarding-completed';
const GOAL_KEY = 'wr-onboarding-goal';
const TEMPLATE_KEY = 'wr-onboarding-template';

const GOALS = [
  { id: 'new-job', label: 'Land a new job', icon: Target, description: 'Create a tailored resume for job applications' },
  { id: 'update', label: 'Update my resume', icon: PenTool, description: 'Refresh and improve your existing resume' },
  { id: 'explore', label: 'Explore templates', icon: LayoutGrid, description: 'Browse professional designs and layouts' },
];

const POPULAR_TEMPLATES = templates.slice(0, 6);

const TOTAL_STEPS = 5;

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId | null>(null);

  useEffect(() => {
    // Fast path: localStorage already marked complete — let dashboard handle it
    if (localStorage.getItem(ONBOARDING_KEY) === 'true') {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleSkip = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    navigate('/dashboard', { replace: true });
  };

  const handleNext = () => {
    if (step === 1 && selectedGoal) {
      localStorage.setItem(GOAL_KEY, selectedGoal);
    }
    if (step === 2 && selectedTemplate) {
      localStorage.setItem(TEMPLATE_KEY, selectedTemplate);
    }
    if (step === TOTAL_STEPS - 1) {
      localStorage.setItem(ONBOARDING_KEY, 'true');
      navigate('/dashboard', { replace: true });
      return;
    }
    setStep(s => s + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(s => s - 1);
  };

  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  const canProceed = step === 0 || step === 3 || step === 4
    || (step === 1 && selectedGoal)
    || (step === 2);

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background">
      {/* Header */}
      <div className="shrink-0 px-4 pt-safe">
        <div className="flex items-center justify-between h-14">
          <div className="w-20">
            {step > 0 && (
              <Button variant="ghost" size="sm" onClick={handleBack} aria-label="Go back">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted-foreground">
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
                <p className="text-muted-foreground">Your AI-powered resume builder. Let's set things up in under a minute.</p>
              </>
            )}

            {/* Step 1: Select Goal */}
            {step === 1 && (
              <>
                <Target className="w-12 h-12 text-primary mb-4" />
                <h2 className="text-xl font-bold text-foreground mb-2">What's your goal?</h2>
                <p className="text-muted-foreground mb-6">We'll personalize your experience</p>
                <div className="w-full space-y-3">
                  {GOALS.map(goal => (
                    <button
                      key={goal.id}
                      onClick={() => setSelectedGoal(goal.id)}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all touch-manipulation active:scale-[0.98] ${
                        selectedGoal === goal.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/40'
                      }`}
                      aria-label={goal.label}
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <goal.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{goal.label}</p>
                        <p className="text-sm text-muted-foreground">{goal.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Step 2: Pick Template */}
            {step === 2 && (
              <>
                <Palette className="w-12 h-12 text-primary mb-4" />
                <h2 className="text-xl font-bold text-foreground mb-2">Pick a starting template</h2>
                <p className="text-muted-foreground mb-6">You can always change it later</p>
                <div className="w-full grid grid-cols-2 gap-3">
                  {POPULAR_TEMPLATES.map(tmpl => (
                    <button
                      key={tmpl.id}
                      onClick={() => setSelectedTemplate(tmpl.id)}
                      className={`relative p-2 rounded-xl border-2 transition-all touch-manipulation active:scale-[0.98] ${
                        selectedTemplate === tmpl.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/40'
                      }`}
                      aria-label={`${tmpl.name} template`}
                    >
                      <TemplateThumbnail templateId={tmpl.id} resume={sampleResumeData as any} />
                      <p className="text-xs font-medium mt-1.5 text-foreground">{tmpl.name}</p>
                      {selectedTemplate === tmpl.id && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Step 3: Notifications */}
            {step === 3 && (
              <>
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Bell className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">Stay in the loop</h2>
                <p className="text-muted-foreground mb-6">Get notified about job application deadlines and resume tips</p>
                <div className="glass-elevated rounded-2xl p-4 w-full text-left space-y-3">
                  {['Application deadline reminders', 'Weekly resume improvement tips', 'New template releases'].map(item => (
                    <div key={item} className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                      <span className="text-sm text-foreground">{item}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-4">You can change notification settings anytime</p>
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
                <h2 className="text-2xl font-bold text-foreground mb-2">You're all set! 🎉</h2>
                <p className="text-muted-foreground mb-6">Your workspace is ready. Let's build something amazing.</p>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="shrink-0 px-6 pb-6 pb-safe">
        <Button
          onClick={handleNext}
          disabled={!canProceed}
          className="w-full h-12 text-base rounded-xl"
          size="lg"
          aria-label={step === TOTAL_STEPS - 1 ? 'Get Started' : 'Continue'}
        >
          {step === TOTAL_STEPS - 1 ? 'Get Started' : 'Continue'}
          {step < TOTAL_STEPS - 1 && <ArrowRight className="w-4 h-4 ml-2" />}
        </Button>
      </div>
    </div>
  );
}
