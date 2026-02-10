import { useState } from 'react';
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

export function DailyTipCard() {
  const [dismissed, setDismissed] = useState(false);
  const tip = tips[new Date().getDate() % tips.length];

  if (dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="mx-4 mb-3 glass-surface border-glow rounded-2xl p-3.5 flex items-start gap-3"
      >
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
          onClick={() => setDismissed(true)}
          className="p-1 rounded-lg hover:bg-muted/50 text-muted-foreground touch-manipulation"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
