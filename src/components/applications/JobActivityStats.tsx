import { FileText, Scissors, Send, Users, Trophy, ChevronRight } from 'lucide-react';
import { JobActivityStats as Stats } from '@/hooks/useJobActivityStats';
import { haptics } from '@/lib/haptics';

interface Props {
  stats: Stats;
  onOriginalsTap?: () => void;
  onTailoredTap?: () => void;
}

const resumeTiles = [
  { key: 'originals' as const, label: 'Resumes Created', icon: FileText, color: 'text-primary' },
  { key: 'tailored' as const, label: 'Tailored Versions', icon: Scissors, color: 'text-accent-foreground' },
];

const appTiles = [
  { key: 'applicationsSubmitted' as const, label: 'Submitted', icon: Send, color: 'text-primary' },
  { key: 'interviewsScheduled' as const, label: 'Interviews', icon: Users, color: 'text-warning' },
  { key: 'offersReceived' as const, label: 'Offers', icon: Trophy, color: 'text-success' },
];

export function JobActivityStatsCard({ stats, onOriginalsTap, onTailoredTap }: Props) {
  return (
    <div className="space-y-4">
      {/* Resume Activity */}
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Resume Activity</p>
        <div className="grid grid-cols-2 gap-3">
          {resumeTiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <button
                key={tile.key}
                onClick={() => {
                  haptics.selection();
                  if (tile.key === 'originals') onOriginalsTap?.();
                  else onTailoredTap?.();
                }}
                className="glass-surface rounded-2xl p-4 min-h-[100px] border border-border/20 flex flex-col items-center gap-2 relative cursor-pointer transition-transform active:scale-[0.97] hover:border-border/40 touch-ripple"
              >
                <ChevronRight className="absolute top-3 right-3 w-3.5 h-3.5 text-muted-foreground/40" />
                <div className={`w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center ${tile.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold">{stats.isLoading ? '–' : stats[tile.key]}</p>
                <p className="text-[11px] text-muted-foreground text-center leading-tight">{tile.label}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Application Tracking - only show when user has data */}
      {!stats.isLoading && (stats.applicationsSubmitted > 0 || stats.interviewsScheduled > 0 || stats.offersReceived > 0) && (
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Application Tracking</p>
          <div className="grid grid-cols-3 gap-2">
            {appTiles.map((tile) => {
              const Icon = tile.icon;
              return (
                <div
                  key={tile.key}
                  className="glass-surface rounded-xl p-3 border border-border/20 flex flex-col items-center gap-1.5"
                >
                  <div className={`w-8 h-8 rounded-lg bg-muted/30 flex items-center justify-center ${tile.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <p className="text-lg font-bold">{stats[tile.key]}</p>
                  <p className="text-[10px] text-muted-foreground text-center leading-tight">{tile.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
