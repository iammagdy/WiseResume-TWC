import { FileText, Scissors, Search, Mail, ChevronRight } from 'lucide-react';
import { JobActivityStats as Stats } from '@/hooks/useJobActivityStats';
import { haptics } from '@/lib/haptics';

interface Props {
  stats: Stats;
  onOriginalsTap?: () => void;
  onTailoredTap?: () => void;
}

const tiles = [
  { key: 'originals', label: 'Resumes Created', icon: FileText, color: 'text-primary', action: 'callback' },
  { key: 'tailored', label: 'Tailored Versions', icon: Scissors, color: 'text-accent-foreground', action: 'callback' },
  { key: 'jobsAnalyzed', label: 'Jobs Analyzed', icon: Search, color: 'text-warning', action: 'scroll', to: '#activity-timeline' },
  { key: 'coverLetters', label: 'Cover Letters', icon: Mail, color: 'text-success', action: 'scroll', to: '#activity-timeline' },
] as const;

export function JobActivityStatsCard({ stats, onOriginalsTap, onTailoredTap }: Props) {
  const handleTap = (tile: typeof tiles[number]) => {
    haptics.selection();
    if (tile.key === 'originals' && onOriginalsTap) {
      onOriginalsTap();
    } else if (tile.key === 'tailored' && onTailoredTap) {
      onTailoredTap();
    } else if (tile.action === 'scroll' && 'to' in tile) {
      document.querySelector(tile.to)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {tiles.map((tile) => {
        const Icon = tile.icon;
        return (
          <button
            key={tile.key}
            onClick={() => handleTap(tile)}
            className="glass-surface rounded-2xl p-4 min-h-[100px] border border-border/20 flex flex-col items-center gap-2 relative cursor-pointer transition-transform active:scale-[0.97] hover:border-border/40 touch-ripple"
          >
            <ChevronRight className="absolute top-3 right-3 w-3.5 h-3.5 text-muted-foreground/40" />
            <div className={`w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center ${tile.color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold">
              {stats.isLoading ? '–' : stats[tile.key]}
            </p>
            <p className="text-[11px] text-muted-foreground text-center leading-tight">{tile.label}</p>
          </button>
        );
      })}
    </div>
  );
}
