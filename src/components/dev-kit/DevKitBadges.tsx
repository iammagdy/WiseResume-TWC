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

export function SectionSummaryBadge({ passed, failed }: { passed: number; failed: number }) {
  const total = passed + failed;
  if (total === 0) return null;
  const allPassed = failed === 0;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${allPassed ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-destructive/20 text-destructive'}`}>
      {allPassed ? `${passed}/${total} passed` : `${failed}/${total} failed`}
    </span>
  );
}
