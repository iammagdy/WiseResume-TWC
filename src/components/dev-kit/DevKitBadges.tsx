import { Briefcase, User } from 'lucide-react';
import { type TestStatus } from './types';

export function StatusBadge({ status }: { status: TestStatus }) {
  const map: Record<TestStatus, { bg: string; text: string; label: string }> = {
    idle: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Idle' },
    running: { bg: 'bg-primary/20', text: 'text-primary', label: 'Running…' },
    success: { bg: 'bg-green-500/20', text: 'text-green-600 dark:text-green-400', label: 'Success' },
    warn: { bg: 'bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400', label: 'Skipped' },
    error: { bg: 'bg-destructive/20', text: 'text-destructive', label: 'Error' },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

export function AccountTypeBadge({ accountType }: { accountType: string | null | undefined }) {
  const isHr = accountType === 'hr';
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
        isHr
          ? 'bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400'
          : 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400'
      }`}
    >
      {isHr ? <Briefcase className="w-2.5 h-2.5 shrink-0" /> : <User className="w-2.5 h-2.5 shrink-0" />}
      {isHr ? 'HR Account' : 'Job Seeker'}
    </span>
  );
}

export function SectionSummaryBadge({ passed, skipped = 0, failed }: { passed: number; skipped?: number; failed: number }) {
  const total = passed + skipped + failed;
  if (total === 0) return null;

  if (failed > 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/20 text-destructive">
        {`${failed}/${total} failed`}
      </span>
    );
  }
  if (passed === 0 && skipped > 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-600 dark:text-amber-400">
        {`${skipped} skipped`}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-600 dark:text-green-400">
      {skipped > 0 ? `${passed}/${passed + failed} passed` : `${passed}/${total} passed`}
    </span>
  );
}
