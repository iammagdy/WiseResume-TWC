import { Inbox } from 'lucide-react';

export function EmptyState({ message = 'No data yet' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-1.5 py-8 rounded-lg bg-muted/30 border border-dashed border-border">
      <Inbox className="w-4 h-4 text-muted-foreground/60" />
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );
}
