import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lightbulb, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { haptics } from '@/lib/haptics';

const FEATURES = [
  {
    title: 'A/B Resume Compare',
    description: 'Score two versions of your resume side-by-side to find the stronger one.',
    route: '/ai-studio?tool=ab-compare',
  },
  {
    title: 'Smart Tailor',
    description: 'Paste a job description and auto-adapt your resume keywords to match.',
    route: '/ai-studio?tool=tailor',
  },
  {
    title: 'Company Briefing',
    description: 'Get a quick research brief on any company before your interview.',
    route: '/ai-studio?tool=company-briefing',
  },
  {
    title: 'Portfolio Website',
    description: 'Turn your resume into a shareable portfolio site with one tap.',
    route: '/portfolio',
  },
  {
    title: 'Cover Letter Generator',
    description: 'Create AI-powered cover letters tailored to any job posting.',
    route: '/cover-letter/new',
  },
];

const STORAGE_KEY = 'feature-discovery-dismissed';
const INDEX_KEY = 'feature-discovery-index';

export function FeatureDiscoveryCard() {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
  });
  const [index] = useState(() => {
    try {
      const saved = localStorage.getItem(INDEX_KEY);
      const next = saved ? (parseInt(saved, 10) + 1) % FEATURES.length : 0;
      localStorage.setItem(INDEX_KEY, String(next));
      return next;
    } catch { return 0; }
  });

  if (dismissed) return null;

  const feature = FEATURES[index];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0 }}
        className="glass-elevated rounded-2xl p-4 relative overflow-hidden"
      >
        <button
          onClick={() => {
            setDismissed(true);
            localStorage.setItem(STORAGE_KEY, '1');
          }}
          className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-start gap-3 pr-8">
          <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center shrink-0 mt-0.5">
            <Lightbulb className="w-4.5 h-4.5 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-accent font-semibold uppercase tracking-wider mb-0.5">Did you know?</p>
            <p className="text-sm font-semibold text-foreground">{feature.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{feature.description}</p>
            <button
              onClick={() => { haptics.light(); navigate(feature.route); }}
              className="mt-2 text-xs font-medium text-primary flex items-center gap-1 min-h-[44px] touch-manipulation active:scale-95"
            >
              Try it <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
