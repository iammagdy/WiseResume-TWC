import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { FileText, TrendingUp, Award, Zap } from 'lucide-react';
import { ResumeHealthScore } from '@/hooks/useResumeScore';
import { cn } from '@/lib/utils';

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

  const stats = [
    { icon: FileText, label: 'Resumes', value: totalResumes, color: 'text-primary' },
    { icon: TrendingUp, label: 'Avg Score', value: avgScore || '—', color: 'text-secondary' },
    { icon: Award, label: 'Best', value: bestScore || '—', color: 'text-success' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="px-4 pt-4 pb-2"
    >
      {/* Greeting */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold">
          {greeting}{userName ? `, ${userName.split(' ')[0]}` : ''} <span className="inline-block animate-pulse">👋</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {totalResumes === 0
            ? 'Ready to build your first resume?'
            : `You have ${totalResumes} resume${totalResumes !== 1 ? 's' : ''} in your library`}
        </p>
      </div>

      {/* Stats Row */}
      {totalResumes > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              className="glass-card rounded-xl p-3 text-center"
            >
              <stat.icon className={cn('w-4 h-4 mx-auto mb-1', stat.color)} />
              <p className="text-lg font-bold">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
