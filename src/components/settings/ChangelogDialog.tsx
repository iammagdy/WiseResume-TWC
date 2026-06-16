import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChangelogBadge } from '@/hooks/useChangelogBadge';

interface ChangelogItem {
  title: string;
  description: string;
}

interface ChangelogEntry {
  version: string;
  date: string;
  latest?: boolean;
  summary?: string;
  items?: ChangelogItem[];
}

interface ChangelogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangelogDialog({ open, onOpenChange }: ChangelogDialogProps) {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { markSeen } = useChangelogBadge();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(false);
    fetch('/changelog.json')
      .then((r) => r.json())
      .then((data: ChangelogEntry[]) => {
        setEntries(Array.isArray(data) ? data : []);
        markSeen();
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [open, markSeen]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85dvh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <DialogTitle>What&apos;s New</DialogTitle>
          <DialogDescription>Release notes and recent improvements.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 max-h-[60dvh] px-6 py-4">
          {loading && (
            <div className="space-y-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          )}
          {error && (
            <p className="text-sm text-muted-foreground">
              Could not load changelog.{' '}
              <Link to="/whats-new" className="text-primary hover:underline" onClick={() => onOpenChange(false)}>
                View full release notes
              </Link>
            </p>
          )}
          {!loading && !error && entries.length === 0 && (
            <p className="text-sm text-muted-foreground">No release notes available yet.</p>
          )}
          {!loading && !error && entries.map((entry) => (
            <article key={entry.version} className="mb-6 last:mb-0">
              <div className="flex items-baseline gap-2 mb-1">
                <h3 className="text-sm font-semibold text-foreground">{entry.version}</h3>
                {entry.latest && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Latest</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-2">{entry.date}</p>
              {entry.summary && (
                <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{entry.summary}</p>
              )}
              {entry.items && entry.items.length > 0 && (
                <ul className="space-y-3">
                  {entry.items.map((item) => (
                    <li key={item.title} className="text-sm">
                      <p className="font-medium text-foreground">{item.title}</p>
                      <p className="text-muted-foreground mt-0.5 leading-relaxed">{item.description}</p>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </ScrollArea>
        <div className="px-6 py-4 border-t border-border/50">
          <Link
            to="/whats-new"
            className="text-sm text-primary hover:underline"
            onClick={() => onOpenChange(false)}
          >
            View full release history
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
