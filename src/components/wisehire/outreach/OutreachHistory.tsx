import { safeFormatDistanceToNow } from '@/lib/dateUtils';
import { Mail, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { useOutreachHistory } from '@/hooks/wisehire/useOutreach';
import { cn } from '@/lib/utils';

interface Props {
  candidateId: string;
}

const STATUS_CONFIG = {
  sent: { icon: CheckCircle2, color: 'text-emerald-500', label: 'Sent' },
  saved: { icon: Clock, color: 'text-amber-500', label: 'Saved (not delivered)' },
  failed: { icon: AlertCircle, color: 'text-red-500', label: 'Failed' },
};

export function OutreachHistory({ candidateId }: Props) {
  const { data: emails = [], isLoading } = useOutreachHistory(candidateId);

  if (isLoading) return <p className="text-xs text-slate-400">Loading…</p>;
  if (emails.length === 0) return (
    <p className="text-xs text-slate-400 italic">No outreach sent yet.</p>
  );

  return (
    <div className="space-y-2">
      {emails.map((email) => {
        const cfg = STATUS_CONFIG[email.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.saved;
        const Icon = cfg.icon;
        return (
          <div
            key={email.id}
            className="flex gap-2 items-start p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
          >
            <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                {email.subject}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                → {email.to_email}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <div className={cn('flex items-center gap-0.5', cfg.color)}>
                <Icon className="h-3 w-3" />
                <span className="text-[10px] font-medium">{cfg.label}</span>
              </div>
              <span className="text-[10px] text-slate-400">
                {safeFormatDistanceToNow(email.created_at, { addSuffix: true })}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
