import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getChangelog, useChangelogBadge } from '@/hooks/useChangelogBadge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, ChevronRight } from 'lucide-react';

interface ChangelogEntry {
  version: string;
  date: string;
  summary: string;
  latest?: boolean;
  items: { text: string; tag?: string }[];
}

export function WhatsNewDialog() {
  const [open, setOpen] = useState(false);
  const [entry, setEntry] = useState<ChangelogEntry | null>(null);
  const { markSeen } = useChangelogBadge();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      getChangelog().then((data: ChangelogEntry[]) => {
        const latest = data[0];
        if (!latest) return;
        const seen = localStorage.getItem('lastSeenChangelog');
        if (seen !== latest.version) {
          setEntry(latest);
          setOpen(true);
        }
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setOpen(false);
    markSeen();
  };

  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15">
              <Sparkles className="h-4 w-4 text-primary" />
            </span>
            <DialogTitle className="text-fluid-lg">What's New</DialogTitle>
          </div>
          <DialogDescription className="pt-1">
            {entry.version} &middot; {entry.date}
          </DialogDescription>
        </DialogHeader>

        <p className="text-fluid-sm text-foreground/90 font-medium">{entry.summary}</p>

        <ul className="space-y-2">
          {entry.items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-fluid-sm text-muted-foreground">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>{item.text}</span>
            </li>
          ))}
        </ul>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            onClick={handleClose}
            className="w-full min-h-[44px] active:scale-95 transition-transform"
          >
            Got it
          </Button>
          <button
            onClick={() => { handleClose(); navigate('/settings'); }}
            className="flex items-center justify-center gap-1 text-fluid-xs text-muted-foreground hover:text-foreground transition-colors min-h-[44px] active:scale-95"
          >
            View full changelog <ChevronRight className="h-3 w-3" />
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
