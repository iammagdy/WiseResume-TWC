import { useState, useEffect, useRef } from 'react';
import { TrendingUp, Target, Zap, FileSearch, Award } from 'lucide-react';
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
  const rafRef = useRef<number>();
  const startTimeRef = useRef<number>();

  useEffect(() => {
    startTimeRef.current = undefined;
    const duration = 1200;

    const step = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(eased * value));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
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

  const dimension = size === 'lg' ? 96 : 64;
  const strokeWidth = size === 'lg' ? 6 : 4;
  const radius = (dimension - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const strokeColor =
    score >= 85 ? 'hsl(var(--success))' :
    score >= 70 ? 'hsl(38, 92%, 50%)' :
    'hsl(var(--destructive))';

  return (
    <div className="text-center">
      <div className="relative mx-auto mb-2" style={{ width: dimension, height: dimension }}>
        <svg width={dimension} height={dimension} className="-rotate-90">
          <circle
            cx={dimension / 2}
            cy={dimension / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={dimension / 2}
            cy={dimension / 2}
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-[1200ms] ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('font-bold', getScoreColor(score), size === 'lg' ? 'text-2xl' : 'text-lg')}>
            <AnimatedNumber value={score} />
          </span>
          <span className={cn('font-medium text-muted-foreground', size === 'lg' ? 'text-[10px]' : 'text-[9px]')}>%</span>
        </div>
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
  const effectiveAfterScore = Math.round(
    beforeScore + (improvement * selectedSections.length / 4)
  );

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <div
      className={cn(
        'p-5 rounded-2xl bg-gradient-to-br from-card via-card to-muted/30 border border-border transition-all duration-500',
        mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      )}
    >
      <h4 className="font-semibold text-sm mb-4 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary" />
        Impact Preview
      </h4>

      {/* Main Score Comparison */}
      <div className="flex items-center justify-center gap-6 mb-6">
        <ScoreCircle score={beforeScore} label="Before" />
        
        <div className={cn(
          'flex flex-col items-center transition-all duration-500 delay-300',
          mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
        )}>
          <div className="text-2xl">→</div>
          <span className={cn(
            'text-xs font-bold px-2 py-0.5 rounded-full',
            improvement > 0 ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'
          )}>
            +{improvement}
          </span>
        </div>

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
            <div
              key={id}
              className={cn(
                'flex items-center justify-between text-sm p-2 rounded-lg transition-all duration-300',
                isSelected ? 'bg-primary/5' : 'opacity-50',
                mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
              )}
              style={{ transitionDelay: `${400 + index * 100}ms` }}
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
