import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
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
    return !localStorage.getItem('wr-tip-dismissed');
  });
  const [manualDismiss, setManualDismiss] = useState(false);
  const [swipeDismiss, setSwipeDismiss] = useState(false);
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
    localStorage.setItem('wr-tip-dismissed', 'true');
    onVisibilityChange?.(false);
  };

  const handleSwipeDismiss = () => {
    setSwipeDismiss(true);
    setVisible(false);
    localStorage.setItem('wr-tip-dismissed', 'true');
    onVisibilityChange?.(false);
    // Reset after animation completes
    setTimeout(() => {
      setSwipeDismiss(false);
      setManualDismiss(true);
    }, 300);
  };

  const handleExpand = () => {
    setVisible(true);
    onVisibilityChange?.(true);
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 80 || Math.abs(info.velocity.x) > 300) {
      handleSwipeDismiss();
    }
  };

  if (manualDismiss) return null;

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={swipeDismiss
              ? { opacity: 0, x: 200, transition: { duration: 0.2 } }
              : { opacity: 0, height: 0, transition: { duration: 0.25 } }
            }
            transition={{ duration: 0.25 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.3}
            onDragEnd={handleDragEnd}
            className="mx-4 mt-2 mb-1 overflow-hidden cursor-grab active:cursor-grabbing"
          >
            <div className="glass-surface border-glow rounded-xl p-4 flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-warning/10 flex items-center justify-center flex-shrink-0">
                <Lightbulb className="w-3.5 h-3.5 text-warning" />
              </div>
              <p className="text-[11px] text-foreground leading-relaxed line-clamp-1 flex-1 min-w-0">{tip}</p>
              <button
                onClick={handleDismiss}
                className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-muted/50 text-muted-foreground touch-manipulation flex-shrink-0"
                aria-label="Dismiss tip"
              >
                <X className="w-4 h-4" />
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
            className="mx-4 mt-1.5 mb-1 flex items-center gap-1.5 px-3 py-2 min-h-[44px] min-w-[44px] rounded-full bg-warning/10 border border-warning/20 touch-manipulation w-fit"
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
