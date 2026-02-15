import { useMemo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Flame } from 'lucide-react';
import { ResumeHealthScore } from '@/hooks/useResumeScore';
import { Badge } from '@/components/ui/badge';

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

interface DashboardStatsProps {
  totalResumes: number;
  healthScores: Record<string, ResumeHealthScore>;
  userName?: string | null;
  isScoring?: boolean;
}

export function DashboardStats({ totalResumes, healthScores, userName, isScoring = false }: DashboardStatsProps) {
  const streak = useLoginStreak();
  const [subtitleIndex, setSubtitleIndex] = useState(0);

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
      className="px-4 pt-3 pb-2"
    >
      {/* Glass Hero Card */}
      <div className="glass-elevated rounded-2xl p-4 relative overflow-hidden">
        {/* Animated gradient border */}
        <div className="absolute inset-0 rounded-2xl p-[1px] pointer-events-none">
          <div
            className="absolute inset-0 rounded-2xl opacity-40"
            style={{
              background: `conic-gradient(from 0deg, hsl(var(--primary)), hsl(var(--secondary)), hsl(var(--accent)), hsl(var(--primary)))`,
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
              padding: '1px',
              animation: 'rotate-gradient 6s linear infinite',
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10">
          {/* Greeting - compact */}
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl sm:text-lg font-semibold">
              {greeting}{firstName ? `, ${firstName}` : ''}{' '}
              <span className="text-base">👋</span>
            </h2>
            {streak > 1 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-warning/10 border border-warning/20"
              >
                <Flame className="w-3.5 h-3.5 text-warning" />
                <span className="text-xs font-bold text-warning">{streak}</span>
              </motion.div>
            )}
          </div>

          {/* Rotating motivational subtitle for empty state only */}
          {totalResumes === 0 && (
            <div className="h-6 mb-4 overflow-hidden">
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
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
