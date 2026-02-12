import { FileText, Scissors, Search, Mail } from 'lucide-react';
import { JobActivityStats as Stats } from '@/hooks/useJobActivityStats';

interface Props {
  stats: Stats;
}

const tiles = [
  { key: 'originals', label: 'Resumes Created', icon: FileText, color: 'text-primary' },
  { key: 'tailored', label: 'Tailored Versions', icon: Scissors, color: 'text-accent-foreground' },
  { key: 'jobsAnalyzed', label: 'Jobs Analyzed', icon: Search, color: 'text-warning' },
  { key: 'coverLetters', label: 'Cover Letters', icon: Mail, color: 'text-success' },
] as const;

export function JobActivityStatsCard({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {tiles.map(({ key, label, icon: Icon, color }) => (
        <div
          key={key}
          className="glass-surface rounded-2xl p-4 border border-border/20 flex flex-col items-center gap-2"
        >
          <div className={`w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold">
            {stats.isLoading ? '–' : stats[key]}
          </p>
          <p className="text-[11px] text-muted-foreground text-center leading-tight">{label}</p>
        </div>
      ))}
    </div>
  );
}
