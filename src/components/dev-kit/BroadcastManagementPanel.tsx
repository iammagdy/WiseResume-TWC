import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Info, Megaphone, RefreshCw, ShieldAlert, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { Textarea } from '@/components/ui/textarea';
import { devKitCall } from '@/lib/devkit/devKitClient';
import { DevKitErrorCard } from './DevKitErrorCard';

type BroadcastSeverity = 'info' | 'warning' | 'critical';

interface AdminBroadcast {
  id: string;
  title: string;
  body: string;
  severity: BroadcastSeverity;
  active: boolean;
  created_by: string | null;
  created_at: string;
  expires_at: string | null;
}

interface BroadcastListResponse {
  broadcasts: AdminBroadcast[];
  total: number;
}

const SEVERITY_ICON = {
  info: Info,
  warning: AlertTriangle,
  critical: ShieldAlert,
};

export function BroadcastManagementPanel() {
  const [broadcasts, setBroadcasts] = useState<AdminBroadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [severity, setSeverity] = useState<BroadcastSeverity>('info');
  const [expiresAt, setExpiresAt] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [expiringId, setExpiringId] = useState<string | null>(null);

  const fetchBroadcasts = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await devKitCall<BroadcastListResponse>({ action: 'list-broadcasts' });
    if (result.ok) {
      setBroadcasts(result.data.broadcasts ?? []);
    } else {
      setError(result.error.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchBroadcasts();
  }, [fetchBroadcasts]);

  const handlePublish = async () => {
    if (!title.trim() || !body.trim()) return;
    setPublishing(true);
    const result = await devKitCall<{ broadcast: AdminBroadcast }>({
      action: 'publish-broadcast',
      payload: {
        title: title.trim(),
        body: body.trim(),
        severity,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      },
    });
    if (result.ok) {
      setTitle('');
      setBody('');
      setSeverity('info');
      setExpiresAt('');
      toast.success('Broadcast published');
      await fetchBroadcasts();
    } else {
      toast.error(result.error.message);
    }
    setPublishing(false);
  };

  const handleExpire = async (id: string) => {
    setExpiringId(id);
    const result = await devKitCall<{ broadcast: AdminBroadcast }>({
      action: 'expire-broadcast',
      payload: { id },
    });
    if (result.ok) {
      setBroadcasts((current) =>
        current.map((broadcast) =>
          broadcast.id === id ? { ...broadcast, active: false } : broadcast,
        ),
      );
      toast.success('Broadcast expired');
    } else {
      toast.error(result.error.message);
    }
    setExpiringId(null);
  };

  if (error) {
    return (
      <DevKitErrorCard
        error={error}
        title="Failed to load broadcasts"
        onRetry={fetchBroadcasts}
        context={{ panel: 'Feature Control', action: 'list-broadcasts' }}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Megaphone className="h-4 w-4" />
          <span>{broadcasts.filter((broadcast) => broadcast.active).length} active</span>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={fetchBroadcasts}
          disabled={loading}
          title="Refresh broadcasts"
          aria-label="Refresh broadcasts"
        >
          {loading ? <MiniSpinner size={16} /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>

      {!loading && broadcasts.length === 0 && (
        <p className="text-sm text-muted-foreground">No broadcasts have been published.</p>
      )}

      <div className="space-y-2">
        {broadcasts.map((broadcast) => {
          const SeverityIcon = SEVERITY_ICON[broadcast.severity];
          const expired =
            !!broadcast.expires_at && Date.parse(broadcast.expires_at) <= Date.now();
          return (
            <div key={broadcast.id} className="flex items-start gap-3 border-b border-border py-3">
              <SeverityIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{broadcast.title}</p>
                  <span className="text-xs text-muted-foreground">
                    {!broadcast.active ? 'inactive' : expired ? 'expired' : broadcast.severity}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{broadcast.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(broadcast.created_at).toLocaleString()}
                  {broadcast.expires_at
                    ? ` · expires ${new Date(broadcast.expires_at).toLocaleString()}`
                    : ''}
                </p>
              </div>
              {broadcast.active && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleExpire(broadcast.id)}
                  disabled={expiringId === broadcast.id}
                  title="Expire broadcast"
                  aria-label={`Expire ${broadcast.title}`}
                >
                  {expiringId === broadcast.id
                    ? <MiniSpinner size={16} />
                    : <Trash2 className="h-4 w-4" />}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-3 border-t border-border pt-4">
        <h4 className="text-sm font-semibold text-foreground">Publish broadcast</h4>
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={256}
          placeholder="Title"
        />
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={4096}
          rows={3}
          placeholder="Message"
          className="resize-none"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs text-muted-foreground">
            <span>Severity</span>
            <select
              value={severity}
              onChange={(event) => setSeverity(event.target.value as BroadcastSeverity)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
            >
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">
            <span>Expires at (optional)</span>
            <Input
              type="datetime-local"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
            />
          </label>
        </div>
        <Button
          onClick={handlePublish}
          disabled={publishing || !title.trim() || !body.trim()}
        >
          {publishing
            ? <MiniSpinner size={16} className="mr-2" />
            : <Megaphone className="mr-2 h-4 w-4" />}
          Publish
        </Button>
      </div>
    </div>
  );
}
