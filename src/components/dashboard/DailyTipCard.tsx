import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, X } from 'lucide-react';

const tips = [
  'Tailoring your resume to each job increases callbacks by 40%.',
  'Use numbers and metrics — recruiters spend 6 seconds scanning your resume.',
  'A strong summary section can boost your interview chances by 30%.',
  'Keep your resume to one page if you have less than 10 years of experience.',
  'Use action verbs like "led", "built", and "improved" to stand out.',
  'Adding relevant keywords from the job posting helps beat ATS filters.',
  'Proofread twice — 77% of hiring managers reject resumes with typos.',
  'Include a LinkedIn URL — profiles with photos get 21× more views.',
  'Quantify achievements: "Increased revenue by 25%" beats "Helped grow revenue".',
  'Update your resume every 3 months, even if you\'re not job hunting.',
];

interface DailyTipCardProps {
  onVisibilityChange?: (visible: boolean) => void;
}

export function DailyTipCard({ onVisibilityChange }: DailyTipCardProps) {
  const [visible, setVisible] = useState(() => {
    return !sessionStorage.getItem('wr-tip-dismissed');
  });
  const [manualDismiss, setManualDismiss] = useState(false);
  const tip = tips[new Date().getDate() % tips.length];

  // Auto-hide after 3 seconds
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      setVisible(false);
      onVisibilityChange?.(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [visible, onVisibilityChange]);

  // Notify parent on mount
  useEffect(() => {
    onVisibilityChange?.(visible);
  }, []);

  const handleDismiss = () => {
    setManualDismiss(true);
    setVisible(false);
    sessionStorage.setItem('wr-tip-dismissed', 'true');
    onVisibilityChange?.(false);
  };

  const handleExpand = () => {
    setVisible(true);
    onVisibilityChange?.(true);
  };

  if (manualDismiss) return null;

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="mx-4 mt-2 mb-1 overflow-hidden"
          >
            <div className="glass-surface border-glow rounded-2xl p-3.5 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Lightbulb className="w-4 h-4 text-warning" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                  Daily Tip
                </p>
                <p className="text-xs text-foreground leading-relaxed">{tip}</p>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1 rounded-lg hover:bg-muted/50 text-muted-foreground touch-manipulation"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed indicator dot */}
      <AnimatePresence>
        {!visible && !manualDismiss && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={handleExpand}
            className="mx-4 mt-1.5 mb-1 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warning/10 border border-warning/20 touch-manipulation w-fit"
            aria-label="Show daily tip"
          >
            <Lightbulb className="w-3 h-3 text-warning" />
            <span className="text-[10px] font-medium text-muted-foreground">Tip</span>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
