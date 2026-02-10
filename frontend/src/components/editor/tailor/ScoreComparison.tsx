import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { TrendingUp, Target, Zap, FileSearch, Award } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SectionScores } from '@/types/resume';
import { cn } from '@/lib/utils';

interface ScoreComparisonProps {
  beforeScore: number;
  afterScore: number;
  sectionScores: SectionScores;
  selectedSections: string[];
}

function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(0, value, {
      duration: 1.2,
      ease: 'easeOut',
      onUpdate: (v) => setDisplayValue(Math.round(v)),
    });
    return () => controls.stop();
  }, [value]);

  return <span>{displayValue}</span>;
}

function ScoreCircle({ score, label, size = 'lg' }: { score: number; label: string; size?: 'lg' | 'sm' }) {
  const getScoreColor = (s: number) => {
    if (s >= 85) return 'text-success';
    if (s >= 70) return 'text-amber-500';
    return 'text-destructive';
  };

  const getScoreLabel = (s: number) => {
    if (s >= 85) return 'Excellent';
    if (s >= 70) return 'Good';
    if (s >= 50) return 'Average';
    return 'Needs Work';
  };

  return (
    <div className="text-center">
      <div className={cn(
        'rounded-2xl border-4 flex flex-col items-center justify-center mx-auto mb-2',
        size === 'lg' ? 'w-24 h-24' : 'w-16 h-16',
        getScoreColor(score),
        score >= 85 ? 'border-success/30 bg-success/10' :
        score >= 70 ? 'border-amber-500/30 bg-amber-500/10' :
        'border-destructive/30 bg-destructive/10'
      )}>
        <span className={cn('font-bold', size === 'lg' ? 'text-3xl' : 'text-xl')}>
          <AnimatedNumber value={score} />
        </span>
        <span className={cn('font-medium', size === 'lg' ? 'text-sm' : 'text-xs')}>%</span>
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('text-xs font-medium', getScoreColor(score))}>
        {getScoreLabel(score)}
      </p>
    </div>
  );
}

const SCORE_BREAKDOWN = [
  { id: 'skills', label: 'Skills Match', icon: Target },
  { id: 'experience', label: 'Experience', icon: Award },
  { id: 'summary', label: 'Keywords', icon: FileSearch },
  { id: 'education', label: 'ATS Ready', icon: Zap },
];

export function ScoreComparison({
  beforeScore,
  afterScore,
  sectionScores,
  selectedSections,
}: ScoreComparisonProps) {
  const improvement = afterScore - beforeScore;

  // Calculate effective after score based on selected sections
  const effectiveAfterScore = Math.round(
    beforeScore + (improvement * selectedSections.length / 4)
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-5 rounded-2xl bg-gradient-to-br from-card via-card to-muted/30 border border-border"
    >
      <h4 className="font-semibold text-sm mb-4 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary" />
        Impact Preview
      </h4>

      {/* Main Score Comparison */}
      <div className="flex items-center justify-center gap-6 mb-6">
        <ScoreCircle score={beforeScore} label="Before" />
        
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, type: 'spring' }}
          className="flex flex-col items-center"
        >
          <div className="text-2xl">→</div>
          <span className={cn(
            'text-xs font-bold px-2 py-0.5 rounded-full',
            improvement > 0 ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'
          )}>
            +{improvement}
          </span>
        </motion.div>

        <ScoreCircle score={effectiveAfterScore} label="After" />
      </div>

      {/* Score Breakdown */}
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground font-medium">Improvements:</p>
        {SCORE_BREAKDOWN.map(({ id, label, icon: Icon }, index) => {
          const scores = sectionScores[id as keyof SectionScores];
          const change = scores.after - scores.before;
          const isSelected = selectedSections.includes(id);

          return (
            <motion.div
              key={id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className={cn(
                'flex items-center justify-between text-sm p-2 rounded-lg transition-colors',
                isSelected ? 'bg-primary/5' : 'opacity-50'
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-muted-foreground" />
                <span>{label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{scores.before}%</span>
                <span>→</span>
                <span className={cn(
                  'font-medium',
                  change > 0 ? 'text-success' : 'text-muted-foreground'
                )}>
                  {scores.after}%
                </span>
                {change > 0 && (
                  <span className="text-xs text-success font-medium">(+{change})</span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
