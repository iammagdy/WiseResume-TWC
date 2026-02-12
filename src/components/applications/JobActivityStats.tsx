import { useNavigate } from 'react-router-dom';
import { FileText, Scissors, Search, Mail, ChevronRight } from 'lucide-react';
import { JobActivityStats as Stats } from '@/hooks/useJobActivityStats';
import { haptics } from '@/lib/haptics';

interface Props {
  stats: Stats;
}

const tiles = [
  { key: 'originals', label: 'Resumes Created', icon: FileText, color: 'text-primary', action: 'navigate', to: '/dashboard' },
  { key: 'tailored', label: 'Tailored Versions', icon: Scissors, color: 'text-accent-foreground', action: 'navigate', to: '/dashboard' },
  { key: 'jobsAnalyzed', label: 'Jobs Analyzed', icon: Search, color: 'text-warning', action: 'scroll', to: '#activity-timeline' },
  { key: 'coverLetters', label: 'Cover Letters', icon: Mail, color: 'text-success', action: 'scroll', to: '#activity-timeline' },
] as const;

export function JobActivityStatsCard({ stats }: Props) {
  const navigate = useNavigate();

  const handleTap = (tile: typeof tiles[number]) => {
    haptics.selection();
    if (tile.action === 'navigate') {
      navigate(tile.to);
    } else {
      document.querySelector(tile.to)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {tiles.map((tile) => {
        const Icon = tile.icon;
        return (
          <button
            key={tile.key}
            onClick={() => handleTap(tile)}
            className="glass-surface rounded-2xl p-4 border border-border/20 flex flex-col items-center gap-2 relative cursor-pointer transition-transform active:scale-[0.97] hover:border-border/40"
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
