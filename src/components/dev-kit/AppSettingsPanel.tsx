import { useState, useCallback, useEffect } from 'react';
import { RefreshCw, Settings, Save, Zap, RotateCcw, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useResumeMutations, useResumes } from '@/hooks/useResumes';
import { useAuth } from '@/hooks/useAuth';
import { buildSampleResume } from '@/lib/devkit/sampleResume';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { getDevKitToken } from '@/contexts/DevKitSessionContext';
import { useIsMounted } from '@/lib/devkit/hooks';
import { unwrapAdminResponse, formatEdgeError, EdgeFunctionError } from '@/lib/devkit/edgeResponse';
import { devKitAuthHeaders } from '@/lib/devkit/devKitAuth';

const FEATURE_FLAGS: { key: string; label: string; description: string }[] = [
  { key: 'feature_cover_letters', label: 'Cover Letters', description: 'Enable cover letter generation feature' },
  { key: 'feature_applications', label: 'Application Tracker', description: 'Enable job application tracking' },
  { key: 'feature_ai_studio', label: 'AI Studio', description: 'Enable AI studio tools' },
  { key: 'feature_portfolio', label: 'Portfolio', description: 'Enable public portfolio pages' },
  { key: 'feature_interview_coach', label: 'Interview Coach', description: 'Enable interview preparation tools' },
  { key: 'feature_career_advisor', label: 'Career Advisor', description: 'Enable career path advisory tools' },
];

export function AppSettingsPanel() {
  const [settings, setSettings] = useState<Record<string, boolean | string | null>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcementText, setAnnouncementText] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [globalLimitInput, setGlobalLimitInput] = useState('');
  const [resettingCredits, setResettingCredits] = useState(false);

  const [resetCreditsDialogOpen, setResetCreditsDialogOpen] = useState(false);
  const [creatingSampleResume, setCreatingSampleResume] = useState(false);

  const { user } = useAuth();
  const { createResume } = useResumeMutations();
  const { data: resumes } = useResumes();
  const sampleResumeTitle = 'Demo Resume';
  const hasSampleResume = (resumes ?? []).some(r => r.title?.startsWith(sampleResumeTitle));

  const handleCreateSampleResume = useCallback(async () => {
    if (!user) {
      toast.error('You must be signed in to create a sample resume.');
      return;
    }
    setCreatingSampleResume(true);
    try {
      const displayName = user.name?.trim() || (user.email ? user.email.split('@')[0] : null);
      const { resume, title } = buildSampleResume(displayName);
      await createResume.mutateAsync({ resume, title });
      toast.success('Sample resume created. Open AI Studio to start chatting with Wise AI.');
    } catch (err) {
      console.error('[devkit] Failed to create sample resume', err);
      toast.error('Failed to create sample resume');
    } finally {
      setCreatingSampleResume(false);
    }
  }, [user, createResume]);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);

  const isMounted = useIsMounted();

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tuple = await edgeFunctions.functions.invoke('admin-get-settings', {
        headers: devKitAuthHeaders(),
        body: {},
      });
      const result = unwrapAdminResponse<{ settings?: Record<string, unknown> }>(tuple, 'admin-get-settings');
      if (!isMounted()) return;
      const raw = result.settings ?? {};
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
      if (!isMounted()) return;
      setError(formatEdgeError(e, 'Failed to load settings'));
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [isMounted]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const updateSetting = async (key: string, value: boolean | string | null) => {
    setSaving(key);
    try {
      const tuple = await edgeFunctions.functions.invoke('admin-update-settings', {
        headers: devKitAuthHeaders(),
        body: { key, value },
      });
      unwrapAdminResponse(tuple, 'admin-update-settings');
      if (!isMounted()) return;
      setSettings((prev) => ({ ...prev, [key]: value }));
      toast.success('Setting updated');
    } catch (e) {
      toast.error(formatEdgeError(e, 'Failed to update setting'));
    } finally {
      if (isMounted()) setSaving(null);
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

  const handleResetCreditsConfirm = async () => {
    setResettingCredits(true);
    try {
      const tuple = await edgeFunctions.functions.invoke('admin-reset-credits', {
        headers: devKitAuthHeaders(),
        body: {},
      });
      const result = unwrapAdminResponse<{ reset_count?: number }>(tuple, 'admin-reset-credits');
      toast.success(`Daily AI credits reset for ${result.reset_count ?? 'all'} users`);
    } catch (e) {
      if (e instanceof EdgeFunctionError && e.notDeployed) {
        toast.info('admin-reset-credits not deployed', {
          description: 'Deploy the admin-reset-credits edge function to use this feature.',
          duration: 6000,
        });
      } else {
        toast.error(formatEdgeError(e, 'Failed to reset credits'));
      }
    } finally {
      if (isMounted()) setResettingCredits(false);
    }
  };

  const handleMaintenanceToggleConfirm = () => {
    updateSetting('maintenance_mode', !settings.maintenance_mode);
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
            onClick={() => setMaintenanceDialogOpen(true)}
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
          {FEATURE_FLAGS.map((flag) => {
            const isLoaded = flag.key in settings;
            const isOn = isLoaded ? settings[flag.key] !== false : false;
            return (
              <div key={flag.key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm">{flag.label}</p>
                  <p className="text-xs text-muted-foreground">{flag.description}</p>
                </div>
                {loading && !isLoaded ? (
                  <div className="w-11 h-6 rounded-full bg-muted/60 animate-pulse" />
                ) : (
                  <button
                    onClick={() => updateSetting(flag.key, !isOn)}
                    disabled={saving === flag.key || loading}
                    className={`relative w-11 h-6 rounded-full transition-colors ${isOn ? 'bg-primary' : 'bg-muted'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${isOn ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* WiseResume AI Engine */}
      <div className="rounded-xl border border-border p-4 space-y-3">
        <h3 className="text-sm font-semibold">WiseResume AI Engine</h3>
        <p className="text-xs text-muted-foreground">Select which AI backend powers WiseResume AI for all users. Changes take effect immediately.</p>
        <div className="space-y-2">
          {([
            { value: 'auto', label: 'Auto (best available)', description: 'Tries OpenRouter → OpenRouter 2 → Groq in order' },
            { value: 'openrouter', label: 'OpenRouter · Gemma 4', description: 'Google Gemma 4 via OpenRouter (free tier)' },
            { value: 'openrouter2', label: 'OpenRouter 2 · GPT-OSS 120B', description: 'openai/gpt-oss-120b:free via the secondary OpenRouter account' },
            { value: 'groq', label: 'Groq · Qwen 3 32B', description: 'Qwen 3 32B via Groq (free tier — primary Groq model in fallback chain)' },
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
            onClick={() => setResetCreditsDialogOpen(true)}
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

      {/* Demo Data */}
      <div className="rounded-xl border border-border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Demo Data</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Seed your own account with a realistic sample resume so you can test AI Studio chat, tailoring, cover letters, and interview prep end-to-end without filling in resume data manually.
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCreateSampleResume}
            disabled={creatingSampleResume || !user}
            className="flex items-center gap-2"
          >
            {creatingSampleResume
              ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Creating…</>
              : <><FileText className="w-3.5 h-3.5" />Create sample resume</>
            }
          </Button>
          {hasSampleResume && (
            <span className="text-xs text-muted-foreground">
              You already have a demo resume — clicking again creates another copy.
            </span>
          )}
        </div>
      </div>

      {/* Reset Credits Confirmation Dialog */}
      <AlertDialog open={resetCreditsDialogOpen} onOpenChange={setResetCreditsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset daily AI credits for all users?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately set the used-today counter back to 0 for every user on the platform, regardless of how many credits they have already consumed today. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetCreditsConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reset all credits
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Maintenance Mode Confirmation Dialog */}
      <AlertDialog open={maintenanceDialogOpen} onOpenChange={setMaintenanceDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {settings.maintenance_mode ? 'Disable maintenance mode?' : 'Enable maintenance mode?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {settings.maintenance_mode
                ? 'This will remove the maintenance banner and restore normal access for all users.'
                : 'This will display a maintenance banner to all users, blocking access to the app until maintenance mode is disabled. To undo, click the toggle again to disable it.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMaintenanceToggleConfirm}
              className={settings.maintenance_mode ? '' : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'}
            >
              {settings.maintenance_mode ? 'Disable maintenance mode' : 'Enable maintenance mode'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
