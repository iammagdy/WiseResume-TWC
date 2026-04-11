import { useState, useCallback, useEffect } from 'react';
import { RefreshCw, Settings, Save, Zap, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  const [globalLimitInput, setGlobalLimitInput] = useState('');
  const [resettingCredits, setResettingCredits] = useState(false);

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
      const gl = raw['global_daily_limit'];
      setGlobalLimitInput(gl != null && gl !== '' ? String(gl) : '');
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

  const handleSaveGlobalLimit = () => {
    const val = globalLimitInput.trim();
    if (val === '') {
      updateSetting('global_daily_limit', null);
    } else {
      const n = Number(val);
      if (isNaN(n) || n < -1) { toast.error('Enter a valid number (-1 for unlimited, 0+ for a limit)'); return; }
      updateSetting('global_daily_limit', String(n));
    }
  };

  const handleResetCredits = async () => {
    if (!confirm('Reset daily AI credits for ALL users? This sets everyone\'s used-today counter back to 0. This cannot be undone.')) return;
    setResettingCredits(true);
    try {
      const { data, error: err } = await edgeFunctions.functions.invoke('admin-reset-credits', {
        body: { password },
      });
      if (err) {
        const errStatus = typeof err === 'object' && err !== null && 'status' in err ? (err as { status: unknown }).status : undefined;
        if (err.message?.includes('Failed to fetch') || errStatus === 404) {
          toast.info('admin-reset-credits not deployed', {
            description: 'Deploy the admin-reset-credits edge function to use this feature.',
            duration: 6000,
          });
          return;
        }
        throw new Error(err.message);
      }
      const result = data as { success?: boolean; reset_count?: number; error?: string };
      if (result?.success === false) throw new Error(result.error ?? 'Unknown error');
      toast.success(`Daily AI credits reset for ${result.reset_count ?? 'all'} users`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to reset credits');
    } finally {
      setResettingCredits(false);
    }
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

      {/* WiseResume AI Engine */}
      <div className="rounded-xl border border-border p-4 space-y-3">
        <h3 className="text-sm font-semibold">WiseResume AI Engine</h3>
        <p className="text-xs text-muted-foreground">Select which AI backend powers WiseResume AI for all users. Changes take effect immediately.</p>
        <div className="space-y-2">
          {([
            { value: 'auto', label: 'Auto (best available)', description: 'Tries OpenRouter first, falls back to Groq' },
            { value: 'openrouter', label: 'OpenRouter · Gemma 4', description: 'Google Gemma 4 via OpenRouter (free tier)' },
            { value: 'groq', label: 'Groq · Llama 3.3', description: 'Meta Llama 3.3 70B via Groq (free tier)' },
          ] as const).map((opt) => {
            const current = (settings.wiseresume_ai_engine as string) ?? 'auto';
            const isSelected = current === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => updateSetting('wiseresume_ai_engine', opt.value)}
                disabled={saving === 'wiseresume_ai_engine' || loading}
                className={`w-full text-left flex items-center gap-3 rounded-lg border p-3 transition-all ${
                  isSelected ? 'border-primary/60 bg-primary/5' : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                  isSelected ? 'border-primary' : 'border-muted-foreground/40'
                }`}>
                  {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                </div>
                <div>
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Global AI Credit Controls */}
      <div className="rounded-xl border border-border p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-500" />
          <h3 className="text-sm font-semibold">Global AI Credit Controls</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Apply a platform-wide daily AI usage limit to all users not on a custom per-user override. Use -1 for unlimited. Leave blank to use per-plan defaults.
        </p>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Global daily AI limit (all users)</p>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="-1 = unlimited, blank = per-plan default"
              value={globalLimitInput}
              onChange={(e) => setGlobalLimitInput(e.target.value)}
              className="h-9 text-sm flex-1"
              min="-1"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleSaveGlobalLimit}
              disabled={saving === 'global_daily_limit'}
              className="flex items-center gap-1.5 shrink-0"
            >
              <Save className="w-3.5 h-3.5" />
              {saving === 'global_daily_limit' ? 'Saving…' : 'Save'}
            </Button>
          </div>
          {settings.global_daily_limit != null && settings.global_daily_limit !== '' && (
            <p className="text-xs text-muted-foreground">
              Current: <strong>{settings.global_daily_limit === '-1' ? 'Unlimited' : `${settings.global_daily_limit} / day`}</strong>
            </p>
          )}
        </div>

        <div className="pt-1 border-t border-border space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Reset daily credits</p>
          <p className="text-xs text-muted-foreground">Resets the used-today counter back to 0 for all users immediately. Useful after an incident or when manually granting extra usage.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetCredits}
            disabled={resettingCredits}
            className="flex items-center gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            {resettingCredits
              ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Resetting…</>
              : <><RotateCcw className="w-3.5 h-3.5" />Reset all daily credits</>
            }
          </Button>
        </div>
      </div>
    </div>
  );
}
