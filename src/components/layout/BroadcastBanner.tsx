import { useEffect, useState } from 'react';
import { X, Info, AlertTriangle, AlertOctagon, Clock } from 'lucide-react';
import { databases, DATABASE_ID, Query } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';

interface Broadcast {
  id: string;
  title: string;
  body: string;
  severity: 'info' | 'warning' | 'critical';
}

interface BroadcastBannerProps {
  enabled: boolean;
}

const DISMISSED_KEY = 'wiseresume_dismissed_broadcasts';
const MAINT_COUNTDOWN_DISMISSED_KEY = 'wiseresume_maint_countdown_dismissed';

function getDismissed(): Set<string> {
  try {
    const raw = sessionStorage.getItem(DISMISSED_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveDismissed(ids: Set<string>) {
  try {
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
  } catch { /* storage unavailable */ }
}

const SEVERITY_STYLES: Record<string, { bg: string; border: string; text: string; icon: React.ElementType }> = {
  info: {
    bg: 'bg-blue-50 dark:bg-blue-950/60',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-800 dark:text-blue-200',
    icon: Info,
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-950/60',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-800 dark:text-amber-200',
    icon: AlertTriangle,
  },
  critical: {
    bg: 'bg-red-50 dark:bg-red-950/60',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-800 dark:text-red-200',
    icon: AlertOctagon,
  },
};

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'now';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

export function BroadcastBanner({ enabled }: BroadcastBannerProps) {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(getDismissed);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    databases
      .listDocuments(DATABASE_ID, COLLECTIONS.broadcasts, [
        Query.equal('active', true),
        Query.select(['$id', 'title', 'body', 'severity']),
        Query.limit(20),
      ])
      .then(res => {
        if (cancelled) return;
        const items: Broadcast[] = res.documents.map(d => {
          const doc = d as unknown as Record<string, unknown>;
          return {
            id: doc.$id as string,
            title: (doc.title as string) ?? '',
            body: (doc.body as string) ?? '',
            severity: (doc.severity as Broadcast['severity']) ?? 'info',
          };
        });
        setBroadcasts(items);
      })
      .catch((error: unknown) => {
        if (!cancelled) console.warn('[BroadcastBanner] Failed to load broadcasts', error);
      });
    return () => { cancelled = true; };
  }, [enabled]);

  const handleDismiss = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    saveDismissed(next);
  };

  const visible = broadcasts.filter(b => !dismissed.has(b.id));
  if (!enabled || visible.length === 0) return null;

  return (
    <div className="flex flex-col gap-0.5">
      {visible.map(b => {
        const style = SEVERITY_STYLES[b.severity] ?? SEVERITY_STYLES.info;
        const Icon = style.icon;
        return (
          <div
            key={b.id}
            className={`w-full border-b px-4 py-2.5 flex items-start gap-3 ${style.bg} ${style.border} ${style.text}`}
          >
            <Icon className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0 text-sm">
              <span className="font-semibold">{b.title}</span>
              {b.body && <span className="ml-1.5 opacity-90">{b.body}</span>}
            </div>
            <button
              onClick={() => handleDismiss(b.id)}
              className="shrink-0 p-0.5 rounded hover:opacity-70 transition-opacity"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

interface MaintenanceCountdownProps {
  windowStart: string | null;
  windowEnd: string | null;
}

export function MaintenanceCountdown({ windowStart, windowEnd }: MaintenanceCountdownProps) {
  const [msUntilStart, setMsUntilStart] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem(MAINT_COUNTDOWN_DISMISSED_KEY) === windowStart; } catch { return false; }
  });

  useEffect(() => {
    setDismissed(() => {
      try { return sessionStorage.getItem(MAINT_COUNTDOWN_DISMISSED_KEY) === windowStart; } catch { return false; }
    });
  }, [windowStart]);

  useEffect(() => {
    if (!windowStart) { setMsUntilStart(null); return; }
    const update = () => setMsUntilStart(new Date(windowStart).getTime() - Date.now());
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [windowStart]);

  if (!windowStart || !windowEnd || dismissed) return null;

  const ms = msUntilStart ?? 0;
  const windowEndTs = new Date(windowEnd).getTime();
  const now = Date.now();

  if (ms > 24 * 60 * 60 * 1000) return null;
  if (now > windowEndTs) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem(MAINT_COUNTDOWN_DISMISSED_KEY, windowStart); } catch { /* ok */ }
  };

  const inWindow = ms <= 0;

  return (
    <div className="w-full border-b border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 px-4 py-2.5 flex items-center gap-3 text-amber-800 dark:text-amber-200">
      <Clock className="w-4 h-4 shrink-0" />
      <div className="flex-1 min-w-0 text-sm">
        {inWindow ? (
          <span className="font-semibold">Scheduled maintenance is in progress.</span>
        ) : (
          <>
            <span className="font-semibold">Scheduled maintenance in {formatCountdown(ms)}</span>
            <span className="ml-1.5 opacity-80">
              — {new Date(windowStart).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </>
        )}
      </div>
      <button
        onClick={handleDismiss}
        className="shrink-0 p-0.5 rounded hover:opacity-70 transition-opacity"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
