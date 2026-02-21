import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Pencil, Wand2, Download, Mic, ArrowRight, Lightbulb, X } from 'lucide-react';
import { haptics } from '@/lib/haptics';
import { useResumes, dbToResumeData } from '@/hooks/useResumes';
import { useResumeStore } from '@/store/resumeStore';
import { calcOverallScore, getNextIncompleteSection } from '@/lib/resumeCompletionRules';
import { cn } from '@/lib/utils';
import { shouldShowDiscovery } from '@/lib/discoveryManager';

interface NextStep {
  icon: React.ElementType;
  title: string;
  description: string;
  action: () => void;
  color: string;
  bgColor: string;
}

const SECTION_LABELS: Record<string, string> = {
  contact: 'Contact Info',
  summary: 'Summary',
  experience: 'Experience',
  education: 'Education',
  skills: 'Skills',
};

// Feature discovery tips (merged from FeatureDiscoveryCard)
const FEATURE_TIPS = [
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

const TIP_INDEX_KEY = 'feature-discovery-index';
const TIP_DISMISSED_KEY = 'feature-discovery-dismissed';

export function WhatsNextCard() {
  const navigate = useNavigate();
  const { data: resumes } = useResumes();
  const setCurrentResumeId = useResumeStore(s => s.setCurrentResumeId);
  const setCurrentResume = useResumeStore(s => s.setCurrentResume);

  // Feature tip dismissed state
  const [tipDismissed, setTipDismissed] = useState(() => {
    try { return localStorage.getItem(TIP_DISMISSED_KEY) === '1'; } catch { return false; }
  });

  // Read onboarding goal
  const onboardingGoal = useMemo(() => {
    try { return localStorage.getItem('wr-onboarding-goal') || null; } catch { return null; }
  }, []);

  // Rotating tip index
  const tipIndex = useMemo(() => {
    try {
      const saved = localStorage.getItem(TIP_INDEX_KEY);
      const next = saved ? (parseInt(saved, 10) + 1) % FEATURE_TIPS.length : 0;
      localStorage.setItem(TIP_INDEX_KEY, String(next));
      return next;
    } catch { return 0; }
  }, []);

  const step = useMemo<NextStep | null>(() => {
    if (!resumes) return null;

    // 1. No resumes
    if (resumes.length === 0) {
      return {
        icon: Plus,
        title: 'Create your first resume',
        description: 'Get started in under 2 minutes',
        action: () => navigate('/dashboard?action=create'),
        color: 'text-primary',
        bgColor: 'bg-primary/10',
      };
    }

    // Find the best master resume
    const masterResumes = resumes.filter(r => !r.parent_resume_id);
    const best = masterResumes[0];
    if (!best) return null;
    const bestData = dbToResumeData(best);
    const score = calcOverallScore(bestData);

    // 2. Resume needs work
    if (score < 40) {
      // Goal-based: "Explore templates" → prioritize templates
      if (onboardingGoal === 'explore-templates') {
        return {
          icon: Wand2,
          title: 'Browse Templates',
          description: 'Find the perfect look for your resume',
          action: () => navigate('/templates'),
          color: 'text-primary',
          bgColor: 'bg-primary/10',
        };
      }
      const section = getNextIncompleteSection(bestData);
      const sectionLabel = section ? SECTION_LABELS[section] || section : 'sections';
      return {
        icon: Pencil,
        title: `Finish your ${sectionLabel}`,
        description: `Your resume is ${score}% complete — keep going!`,
        action: () => {
          setCurrentResumeId(best.id);
          setCurrentResume(bestData);
          navigate('/editor');
        },
        color: 'text-amber-500',
        bgColor: 'bg-amber-500/10',
      };
    }

    // 3. Never tailored — prioritize based on goal
    const hasTailored = resumes.some(r => r.parent_resume_id);
    if (!hasTailored) {
      // Goal: "Update my resume" → Enhance/Proofread first
      if (onboardingGoal === 'update-resume') {
        return {
          icon: Wand2,
          title: 'Enhance your resume',
          description: 'Polish your content with AI suggestions',
          action: () => {
            setCurrentResumeId(best.id);
            setCurrentResume(bestData);
            navigate('/ai-studio?tool=enhance');
          },
          color: 'text-cyan-500',
          bgColor: 'bg-cyan-500/10',
        };
      }
      return {
        icon: Wand2,
        title: 'Tailor for a job posting',
        description: 'Boost your match score with AI tailoring',
        action: () => {
          setCurrentResumeId(best.id);
          setCurrentResume(bestData);
          navigate('/ai-studio?tool=tailor');
        },
        color: 'text-primary',
        bgColor: 'bg-primary/10',
      };
    }

    // 4. Try interview
    return {
      icon: Mic,
      title: 'Practice a mock interview',
      description: 'Get AI-powered feedback on your answers',
      action: () => {
        setCurrentResumeId(best.id);
        setCurrentResume(bestData);
        navigate('/interview');
      },
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    };
  }, [resumes, navigate, setCurrentResumeId, setCurrentResume, onboardingGoal]);

  // If we have a step, render the suggested next step
  if (step) {
    const Icon = step.icon;
    return (
      <motion.button
        onClick={() => { haptics.light(); step.action(); }}
        className="mx-4 mb-3 w-[calc(100%-2rem)] rounded-2xl glass-elevated p-4 text-left active:scale-[0.98] transition-transform touch-manipulation border-l-[3px] border-primary/40 bg-primary/[0.03]"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
      >
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Suggested next step</p>
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', step.bgColor)}>
            <Icon className={cn('w-5 h-5', step.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{step.title}</p>
            <p className="text-xs text-muted-foreground">{step.description}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </div>
      </motion.button>
    );
  }

  // Fallback: show a feature discovery tip (only after session 3+)
  if (tipDismissed || !shouldShowDiscovery('feature-discovery')) return null;

  const tip = FEATURE_TIPS[tipIndex];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mb-3 rounded-2xl glass-elevated p-4 relative overflow-hidden"
    >
      <button
        onClick={() => {
          setTipDismissed(true);
          localStorage.setItem(TIP_DISMISSED_KEY, '1');
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
          <p className="text-sm font-semibold text-foreground">{tip.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{tip.description}</p>
          <button
            onClick={() => { haptics.light(); navigate(tip.route); }}
            className="mt-2 text-xs font-medium text-primary flex items-center gap-1 min-h-[44px] touch-manipulation active:scale-95"
          >
            Try it <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
