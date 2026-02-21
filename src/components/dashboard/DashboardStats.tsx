import { useMemo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Flame, AlertCircle, Lightbulb, X } from 'lucide-react';
import { ResumeHealthScore } from '@/hooks/useResumeScore';
import { Badge } from '@/components/ui/badge';
import { DatabaseResume } from '@/hooks/useResumes';

function useLoginStreak() {
  const [streak, setStreak] = useState(1);

  useEffect(() => {
    const key = 'wise_resume_streak';
    const lastKey = 'wise_resume_last_login';
    const today = new Date().toDateString();
    const lastLogin = localStorage.getItem(lastKey);

    if (lastLogin === today) {
      setStreak(parseInt(localStorage.getItem(key) || '1', 10));
      return;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    let newStreak = 1;
    if (lastLogin === yesterday.toDateString()) {
      newStreak = parseInt(localStorage.getItem(key) || '0', 10) + 1;
    }

    localStorage.setItem(key, String(newStreak));
    localStorage.setItem(lastKey, today);
    setStreak(newStreak);
  }, []);

  return streak;
}

const motivationalSubtitles = [
  "Let's create something amazing today!",
  "Your next opportunity starts here",
  "One great resume away from your dream job",
  "Today is the perfect day to stand out",
];

const tips = [
  'Tailoring your resume to each job increases callbacks by 40%.',
  'Use numbers and metrics — recruiters spend 6 seconds scanning.',
  'A strong summary section can boost interview chances by 30%.',
  'Keep your resume to one page if under 10 years of experience.',
  'Use action verbs like "led", "built", and "improved" to stand out.',
  'Adding relevant keywords from the job posting helps beat ATS filters.',
  'Proofread twice — 77% of hiring managers reject resumes with typos.',
  'Quantify achievements: "Increased revenue by 25%" beats vague claims.',
  'Update your resume every 3 months, even if you\'re not job hunting.',
];

interface DashboardStatsProps {
  totalResumes: number;
  healthScores: Record<string, ResumeHealthScore>;
  userName?: string | null;
  isScoring?: boolean;
  resumes?: DatabaseResume[];
  loginStreak?: number;
}

export function DashboardStats({ totalResumes, healthScores, userName, isScoring = false, resumes, loginStreak: externalStreak }: DashboardStatsProps) {
  const localStreak = useLoginStreak();
  const streak = externalStreak ?? localStreak;
  const [subtitleIndex, setSubtitleIndex] = useState(0);
  const [tipDismissed, setTipDismissed] = useState(() => !!localStorage.getItem('wr-tip-dismissed'));

  const tip = tips[new Date().getDate() % tips.length];

  const handleDismissTip = () => {
    setTipDismissed(true);
    localStorage.setItem('wr-tip-dismissed', 'true');
  };

  // Rotate subtitles every 4 seconds when empty state
  useEffect(() => {
    if (totalResumes > 0) return;
    const interval = setInterval(() => {
      setSubtitleIndex(prev => (prev + 1) % motivationalSubtitles.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [totalResumes]);

  const { avgScore, bestScore } = useMemo(() => {
    const scores = Object.values(healthScores).map(s => s.overallScore);
    if (scores.length === 0) return { avgScore: 0, bestScore: 0 };
    return {
      avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      bestScore: Math.max(...scores),
    };
  }, [healthScores]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const firstName = userName ? userName.split(' ')[0] : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="px-4 pt-2 pb-2"
    >
      {/* Glass Hero Card */}
      <div className="glass-elevated rounded-2xl p-4 relative overflow-hidden">
        {/* Animated gradient border */}
        <div className="absolute inset-0 rounded-2xl p-[1px] pointer-events-none">
          <div
            className="absolute inset-0 rounded-2xl opacity-30"
            style={{
              background: `conic-gradient(from 135deg, hsl(var(--primary)), hsl(var(--secondary)), hsl(var(--accent)), hsl(var(--primary)))`,
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
              padding: '1px',
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10">
          {/* Greeting - compact */}
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl sm:text-lg font-semibold truncate">
              {greeting}{firstName ? `, ${firstName}` : ''}{' '}
              <span className="text-base">👋</span>
            </h2>
            {streak > 1 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full bg-warning/10 border border-warning/20"
              >
                <Flame className="w-3.5 h-3.5 text-warning" />
                <span className="text-xs font-bold text-warning">{streak}</span>
              </motion.div>
            )}
          </div>

          {/* Inline daily tip */}
          {!tipDismissed && (
            <div className="flex items-center gap-2 mt-1">
              <Lightbulb className="w-3 h-3 text-warning shrink-0" />
              <p className="text-[11px] text-muted-foreground truncate flex-1 min-w-0">{tip}</p>
              <button
                onClick={handleDismissTip}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground touch-manipulation shrink-0"
                aria-label="Dismiss tip"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Rotating motivational subtitle for empty state only */}
          {totalResumes === 0 && (
            <div className="h-6 mb-4 overflow-hidden mt-1">
              <AnimatePresence mode="wait">
                <motion.p
                  key={subtitleIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="text-sm text-muted-foreground"
                >
                  {motivationalSubtitles[subtitleIndex]}
                </motion.p>
              </AnimatePresence>
            </div>
          )}

          {/* Stats Row - simplified inline badges */}
          {totalResumes > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-sm font-medium">
                <FileText className="w-3.5 h-3.5" />
                {totalResumes} {totalResumes === 1 ? 'Resume' : 'Resumes'}
              </Badge>
              {resumes && resumes.length > 0 && (() => {
                const oldest = resumes.reduce((a, b) =>
                  new Date(a.updated_at) < new Date(b.updated_at) ? a : b
                );
                const daysSince = Math.floor((Date.now() - new Date(oldest.updated_at).getTime()) / 86_400_000);
                if (daysSince < 30) return null;
                return (
                  <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-sm font-medium border-warning/40 text-warning">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Resume {daysSince}d old
                  </Badge>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
