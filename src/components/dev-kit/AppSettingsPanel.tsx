import { useState, useCallback, useEffect } from 'react';
import { RefreshCw, Settings, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';

interface AppSettingsPanelProps {
  password: string;
}

const FEATURE_FLAGS: { key: string; label: string; description: string }[] = [
  { key: 'feature_cover_letters', label: 'Cover Letters', description: 'Enable cover letter generation feature' },
  { key: 'feature_applications', label: 'Application Tracker', description: 'Enable job application tracking' },
  { key: 'feature_ai_studio', label: 'AI Studio', description: 'Enable AI studio tools' },
  { key: 'feature_portfolio', label: 'Portfolio', description: 'Enable public portfolio pages' },
  { key: 'feature_interview_coach', label: 'Interview Coach', description: 'Enable interview preparation tools' },
  { key: 'feature_career_advisor', label: 'Career Advisor', description: 'Enable career path advisory tools' },
];

export function AppSettingsPanel({ password }: AppSettingsPanelProps) {
  const [settings, setSettings] = useState<Record<string, boolean | string | null>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcementText, setAnnouncementText] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await edgeFunctions.functions.invoke('admin-get-settings', {
        body: { password },
      });
      if (err) throw new Error(err.message);
      const result = data as { success?: boolean; settings?: Record<string, unknown>; error?: string };
      if (result?.success === false) throw new Error(result.error ?? 'Unknown error');
      const raw = result?.settings ?? {};
      const parsed: Record<string, boolean | string | null> = {};
      for (const [k, v] of Object.entries(raw)) {
        if (typeof v === 'boolean') parsed[k] = v;
        else if (typeof v === 'string') parsed[k] = v;
        else if (v === null) parsed[k] = null;
        else parsed[k] = JSON.parse(JSON.stringify(v)) as boolean;
      }
      setSettings(parsed);
      const ann = raw['announcement_banner'];
      setAnnouncementText(typeof ann === 'string' ? ann : (ann !== null && ann !== undefined ? String(ann) : ''));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [password]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const updateSetting = async (key: string, value: boolean | string | null) => {
    setSaving(key);
    try {
      const { data, error: err } = await edgeFunctions.functions.invoke('admin-update-settings', {
        body: { password, key, value },
      });
      if (err) throw new Error(err.message);
      const result = data as { success?: boolean; error?: string };
      if (result?.success === false) throw new Error(result.error ?? 'Unknown error');
      setSettings((prev) => ({ ...prev, [key]: value }));
      toast.success('Setting updated');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update setting');
    } finally {
      setSaving(null);
    }
  };

  const handleSaveAnnouncement = () => {
    updateSetting('announcement_banner', announcementText.trim() || null);
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">{error}</div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Settings className="w-4 h-4" />
          <span>App-wide settings</span>
        </div>
        <Button variant="outline" size="sm" onClick={fetchSettings} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Maintenance Mode */}
      <div className="rounded-xl border border-border p-4 space-y-3">
        <h3 className="text-sm font-semibold">Maintenance Mode</h3>
        <p className="text-xs text-muted-foreground">When enabled, shows a full-screen maintenance banner to all users.</p>
        <div className="flex items-center justify-between">
          <span className="text-sm">Enable maintenance mode</span>
          <button
            onClick={() => updateSetting('maintenance_mode', !settings.maintenance_mode)}
            disabled={saving === 'maintenance_mode'}
            className={`relative w-11 h-6 rounded-full transition-colors ${settings.maintenance_mode ? 'bg-destructive' : 'bg-muted'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${settings.maintenance_mode ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
        {settings.maintenance_mode && (
          <div className="p-2 rounded-md bg-destructive/10 text-xs text-destructive">
            ⚠ Maintenance mode is ON — users will see a maintenance screen
          </div>
        )}
      </div>

      {/* Announcement Banner */}
      <div className="rounded-xl border border-border p-4 space-y-3">
        <h3 className="text-sm font-semibold">Announcement Banner</h3>
        <p className="text-xs text-muted-foreground">Shows a dismissible banner at the top of the app for all users.</p>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm">Show banner</span>
          <button
            onClick={() => updateSetting('announcement_enabled', !settings.announcement_enabled)}
            disabled={saving === 'announcement_enabled'}
            className={`relative w-11 h-6 rounded-full transition-colors ${settings.announcement_enabled ? 'bg-primary' : 'bg-muted'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${settings.announcement_enabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
        <Textarea
          placeholder="Enter announcement message for users…"
          value={announcementText}
          onChange={(e) => setAnnouncementText(e.target.value)}
          rows={2}
          className="text-xs resize-none"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={handleSaveAnnouncement}
          disabled={saving === 'announcement_banner'}
          className="flex items-center gap-2"
        >
          <Save className="w-3.5 h-3.5" />
          {saving === 'announcement_banner' ? 'Saving…' : 'Save announcement'}
        </Button>
      </div>

      {/* Feature Flags */}
      <div className="rounded-xl border border-border p-4 space-y-3">
        <h3 className="text-sm font-semibold">Feature Flags</h3>
        <p className="text-xs text-muted-foreground">Toggle app features on/off for all users. Changes take effect within 5 minutes.</p>
        <div className="space-y-3">
          {FEATURE_FLAGS.map((flag) => (
            <div key={flag.key} className="flex items-center justify-between">
              <div>
                <p className="text-sm">{flag.label}</p>
                <p className="text-xs text-muted-foreground">{flag.description}</p>
              </div>
              <button
                onClick={() => updateSetting(flag.key, !settings[flag.key])}
                disabled={saving === flag.key || loading}
                className={`relative w-11 h-6 rounded-full transition-colors ${settings[flag.key] !== false ? 'bg-primary' : 'bg-muted'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${settings[flag.key] !== false ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
