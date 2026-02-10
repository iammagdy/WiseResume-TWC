import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { FileText, Award, TrendingUp } from 'lucide-react';
import { ResumeHealthScore } from '@/hooks/useResumeScore';
import { cn } from '@/lib/utils';
import { ScoreRing } from './ScoreRing';

interface DashboardStatsProps {
  totalResumes: number;
  healthScores: Record<string, ResumeHealthScore>;
  userName?: string | null;
}

export function DashboardStats({ totalResumes, healthScores, userName }: DashboardStatsProps) {
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
      className="px-4 pt-4 pb-3"
    >
      {/* Glass Hero Card */}
      <div className="glass-elevated rounded-2xl p-5 relative overflow-hidden">
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
          {/* Greeting */}
          <h1 className="text-2xl font-bold mb-1">
            {greeting}{firstName ? `, ${firstName}` : ''}{' '}
            <span className="inline-block animate-pulse">👋</span>
          </h1>
          <p className="text-sm text-muted-foreground mb-4">
            {totalResumes === 0
              ? 'Ready to build your first resume?'
              : `You have ${totalResumes} resume${totalResumes !== 1 ? 's' : ''} in your library`}
          </p>

          {/* Stats Row with Score Ring */}
          {totalResumes > 0 && avgScore > 0 && (
            <div className="flex items-center gap-5">
              {/* Large Score Ring */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              >
                <ScoreRing score={avgScore} size={72} strokeWidth={5} />
              </motion.div>

              {/* Stats beside ring */}
              <div className="flex-1 grid grid-cols-2 gap-3">
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center gap-2.5"
                >
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <FileText className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-bold leading-tight">{totalResumes}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Resumes</p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center gap-2.5"
                >
                  <div className="w-9 h-9 rounded-xl bg-success/10 flex items-center justify-center">
                    <Award className="w-4.5 h-4.5 text-success" />
                  </div>
                  <div>
                    <p className="text-lg font-bold leading-tight">{bestScore}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Best</p>
                  </div>
                </motion.div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
