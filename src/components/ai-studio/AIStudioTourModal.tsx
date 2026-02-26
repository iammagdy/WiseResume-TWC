import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Wand2, Target, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { haptics } from '@/lib/haptics';

interface AIStudioTourModalProps {
  onDismiss: () => void;
}

const steps = [
  {
    icon: Sparkles,
    title: 'Welcome to AI Studio',
    description: 'Chat with Wise AI to edit your resume using natural language — just type what you need.',
  },
  {
    icon: Wand2,
    title: 'Your AI Toolkit',
    description: 'Smart Tailor adapts your resume to any job. Enhance, Humanize, and 8 more tools at your fingertips.',
  },
  {
    icon: Target,
    title: 'Try It Now!',
    description: 'Tap a suggestion chip or open any tool card to get started. Your AI credits are shown in the header.',
  },
];

export function AIStudioTourModal({ onDismiss }: AIStudioTourModalProps) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-background/60 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onDismiss()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="w-full max-w-sm glass-elevated rounded-3xl border border-primary/20 p-6 space-y-5"
        >
          {/* Step indicator */}
          <div className="flex justify-center gap-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? 'w-6 bg-primary' : 'w-1.5 bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center text-center space-y-4"
            >
              <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center">
                <current.icon className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-bold">{current.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{current.description}</p>
            </motion.div>
          </AnimatePresence>

          {/* Actions */}
          <div className="flex gap-3">
            {!isLast ? (
              <>
                <Button
                  variant="ghost"
                  className="flex-1 min-h-[44px]"
                  onClick={() => {
                    haptics.light();
                    onDismiss();
                  }}
                >
                  Skip
                </Button>
                <Button
                  className="flex-1 min-h-[44px] gap-2"
                  onClick={() => {
                    haptics.light();
                    setStep(s => s + 1);
                  }}
                >
                  Next <ArrowRight className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Button
                className="w-full min-h-[44px]"
                onClick={() => {
                  haptics.medium();
                  onDismiss();
                }}
              >
                Got It!
              </Button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
