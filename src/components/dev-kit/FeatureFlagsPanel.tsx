import { useState, useCallback, useEffect } from 'react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { RefreshCw, Flag, Plus, Trash2, ChevronDown, ChevronUp, Save, X, Zap, AlertTriangle, ShieldAlert, Rocket, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { devKitInvokeOptions } from '@/lib/devkit/devKitAuth';
import { devKitCall } from '@/lib/devkit/devKitClient';
import { useIsMounted } from '@/lib/devkit/hooks';
import { unwrapAdminResponse, formatEdgeError } from '@/lib/devkit/edgeResponse';
import { DevKitErrorCard } from './DevKitErrorCard';

// ─── App-wide settings types ──────────────────────────────────────────────────

interface AppSetting {
  $id: string;
  key: string;
  value: string;
}

interface AppSettingsResponse {
  settings: AppSetting[];
  total: number;
  missing_collection?: boolean;
}

// ─── Feature-flag types ───────────────────────────────────────────────────────

interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled_globally: boolean;
  enabled_plans: string[];
  enabled_user_ids: string[];
  percentage_rollout: number;
  kill_switch_function: string | null;
  updated_by: string;
  updated_at: string;
}

const KNOWN_PLANS = ['free', 'pro', 'trial', 'premium'];

const EMPTY_FLAG: Omit<FeatureFlag, 'id' | 'updated_by' | 'updated_at'> = {
  name: '',
  description: '',
  enabled_globally: false,
  enabled_plans: [],
  enabled_user_ids: [],
  percentage_rollout: 0,
  kill_switch_function: null,
};

// ─── Shared Toggle ────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  disabled,
  destructive,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
        checked
          ? destructive
            ? 'bg-destructive'
            : 'bg-primary'
          : 'bg-muted'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

// ─── App-wide settings section ────────────────────────────────────────────────

function AppWideSettingsSection() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [showMaintenanceConfirm, setShowMaintenanceConfirm] = useState(false);
  const [confirmTyped, setConfirmTyped] = useState('');

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await devKitCall<AppSettingsResponse>({ action: 'list-app-settings' });
    if (result.ok) {
      const map: Record<string, string> = {};
      for (const doc of result.data.settings) {
        map[doc.key] = doc.value;
      }
      setSettings(map);
    } else {
      setError(result.error.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const toggleSetting = async (key: string, current: string | undefined) => {
    const newValue = current === 'true' ? 'false' : 'true';
    setToggling(key);
    const result = await devKitCall<{ setting: AppSetting }>({
      action: 'toggle-app-setting',
      payload: { key, value: newValue },
    });
    if (result.ok) {
      setSettings(prev => ({ ...prev, [key]: newValue }));
      toast.success(`${key} updated`);
    } else {
      toast.error(result.error.message);
    }
    setToggling(null);
  };

  const handleMaintenanceClick = () => {
    const isActive = settings.maintenance_mode === 'true';
    if (isActive) {
      // Disabling is low-risk — execute directly
      toggleSetting('maintenance_mode', settings.maintenance_mode);
    } else {
      // Activating is dangerous — require typed confirmation
      setShowMaintenanceConfirm(true);
      setConfirmTyped('');
    }
  };

  const handleMaintenanceConfirm = () => {
    setShowMaintenanceConfirm(false);
    setConfirmTyped('');
    toggleSetting('maintenance_mode', settings.maintenance_mode);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-6 text-muted-foreground text-sm">
        <MiniSpinner size={16} />
        Loading app-wide settings…
      </div>
    );
  }

  if (error) {
    return (
      <DevKitErrorCard
        error={error}
        title="Failed to load app settings"
        onRetry={fetchSettings}
        context={{ panel: 'Feature Control', action: 'list-app-settings' }}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Maintenance Mode */}
      <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/15 flex flex-col justify-between gap-5">
        <div>
          <div className="flex items-center gap-2.5 text-red-400 mb-1.5">
            <ShieldAlert size={20} />
            <h4 className="font-bold text-base uppercase tracking-tight">Maintenance Mode</h4>
          </div>
          <p className="text-xs text-red-200/50">Instantly locks the app for all users. Use only for critical updates.</p>
        </div>

        {showMaintenanceConfirm ? (
          <div className="space-y-3">
            <p className="text-xs text-red-300/70 leading-relaxed">
              This will take the entire app offline for every user. Type <span className="font-black text-red-400">OFFLINE</span> to confirm.
            </p>
            <input
              type="text"
              value={confirmTyped}
              onChange={e => setConfirmTyped(e.target.value.toUpperCase())}
              placeholder="Type OFFLINE"
              className="w-full px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm font-mono placeholder:text-red-500/30 focus:outline-none focus:border-red-500/60"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowMaintenanceConfirm(false); setConfirmTyped(''); }}
                className="flex-1 py-2 rounded-xl text-xs font-bold uppercase border border-white/10 bg-white/5 text-white/50 hover:text-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleMaintenanceConfirm}
                disabled={confirmTyped !== 'OFFLINE' || toggling === 'maintenance_mode'}
                className="flex-1 py-2 rounded-xl text-xs font-black uppercase bg-red-600 text-white disabled:opacity-30 transition-all"
              >
                {toggling === 'maintenance_mode' ? <MiniSpinner size={13} className="mx-auto" /> : 'Activate'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleMaintenanceClick}
            disabled={toggling === 'maintenance_mode'}
            className={`w-full py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all disabled:opacity-50 ${
              settings.maintenance_mode === 'true'
                ? 'bg-red-600 text-white shadow-[0_0_16px_rgba(220,38,38,0.4)]'
                : 'bg-white/5 text-red-400 border border-red-500/20'
            }`}
          >
            {toggling === 'maintenance_mode' ? (
              <span className="flex items-center justify-center gap-2">
                <MiniSpinner size={14} /> Saving…
              </span>
            ) : (
              settings.maintenance_mode === 'true' ? 'Disable Maintenance' : 'Activate Maintenance'
            )}
          </button>
        )}
      </div>

      {/* App-wide feature gates */}
      <div className="p-6 rounded-2xl bg-blue-500/5 border border-blue-500/15 flex flex-col gap-4">
        <h4 className="font-bold text-base text-white flex items-center gap-2.5">
          <Rocket size={18} className="text-blue-400" /> Feature Gates
        </h4>
        <div className="space-y-2">
          {([
            { key: 'feature_tailor',    label: 'AI Tailoring' },
            { key: 'feature_chat',      label: 'AI Chat & Assistant' },
            { key: 'feature_portfolio', label: 'Public Portfolios' },
          ] as const).map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/[0.06]">
              <div className="flex items-center gap-2.5 text-white/80 text-sm font-medium">
                <CheckCircle2 size={14} className="text-blue-400/70" />
                {label}
              </div>
              <Toggle
                checked={settings[key] === 'true'}
                onChange={() => toggleSetting(key, settings[key])}
                disabled={toggling === key}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Feature-flag sub-components ──────────────────────────────────────────────

function PlanBadge({ plan, selected, onClick }: { plan: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
        selected
          ? 'bg-primary/10 border-primary/40 text-primary'
          : 'bg-muted border-border text-muted-foreground hover:border-muted-foreground/40'
      }`}
    >
      {plan}
    </button>
  );
}

interface FlagFormProps {
  initial: Omit<FeatureFlag, 'id' | 'updated_by' | 'updated_at'>;
  onSave: (flag: Omit<FeatureFlag, 'id' | 'updated_by' | 'updated_at'>) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  isNew?: boolean;
}

function FlagForm({ initial, onSave, onCancel, saving, isNew }: FlagFormProps) {
  const [form, setForm] = useState(initial);
  const [userIdsText, setUserIdsText] = useState(initial.enabled_user_ids.join('\n'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const userIds = userIdsText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    await onSave({ ...form, enabled_user_ids: userIds });
  };

  const togglePlan = (plan: string) => {
    setForm((f) => ({
      ...f,
      enabled_plans: f.enabled_plans.includes(plan)
        ? f.enabled_plans.filter((p) => p !== plan)
        : [...f.enabled_plans, plan],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-3 border-t border-border mt-3">
      {isNew && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Flag name (slug)</label>
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. dark_mode_v2"
            className="h-8 text-sm font-mono"
            required
          />
          <p className="text-[11px] text-muted-foreground">
            Lowercase letters, numbers and underscores only. Auto-normalised on save.
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Description</label>
        <Textarea
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="What does this flag control?"
          rows={2}
          className="text-xs resize-none"
        />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm">Enabled globally</p>
          <p className="text-xs text-muted-foreground">On for every user regardless of plan or rollout</p>
        </div>
        <Toggle
          checked={form.enabled_globally}
          onChange={(v) => setForm((f) => ({ ...f, enabled_globally: v }))}
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Enable for plans</p>
        <div className="flex flex-wrap gap-2">
          {KNOWN_PLANS.map((plan) => (
            <PlanBadge
              key={plan}
              plan={plan}
              selected={form.enabled_plans.includes(plan)}
              onClick={() => togglePlan(plan)}
            />
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Users on these plans always see the feature, regardless of global toggle.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">User ID overrides</label>
        <Textarea
          value={userIdsText}
          onChange={(e) => setUserIdsText(e.target.value)}
          placeholder="One UUID per line"
          rows={3}
          className="text-xs font-mono resize-none"
        />
        <p className="text-[11px] text-muted-foreground">
          These specific users always see the feature. Takes priority over plan rules.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Percentage rollout (0 = off, 100 = everyone)
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={100}
            value={form.percentage_rollout}
            onChange={(e) => setForm((f) => ({ ...f, percentage_rollout: Number(e.target.value) }))}
            className="flex-1 accent-primary"
          />
          <span className="text-sm font-mono w-10 text-right tabular-nums">
            {form.percentage_rollout}%
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Deterministic hash — the same user always gets the same result.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-destructive" />
          Kill switch — target edge function name
        </label>
        <Input
          value={form.kill_switch_function ?? ''}
          onChange={(e) =>
            setForm((f) => ({ ...f, kill_switch_function: e.target.value.trim() || null }))
          }
          placeholder="e.g. tailor-resume (leave blank to disable)"
          className="h-8 text-sm font-mono"
        />
        <p className="text-[11px] text-muted-foreground">
          When this flag is globally on AND a function name is set, that function returns 503 instantly.
        </p>
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" disabled={saving} className="flex items-center gap-1.5">
          <Save className="w-3.5 h-3.5" />
          {saving ? 'Saving…' : isNew ? 'Create flag' : 'Save changes'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={saving}>
          <X className="w-3.5 h-3.5 mr-1" />
          Cancel
        </Button>
      </div>
    </form>
  );
}

interface FlagRowProps {
  flag: FeatureFlag;
  onToggleGlobal: (flag: FeatureFlag) => void;
  onEdit: (flag: FeatureFlag) => void;
  onDelete: (name: string) => void;
  toggling: boolean;
  deleting: boolean;
}

function FlagRow({ flag, onToggleGlobal, onEdit, onDelete, toggling, deleting }: FlagRowProps) {
  const [expanded, setExpanded] = useState(false);
  const hasKillSwitch = !!flag.kill_switch_function;
  const isKilled = hasKillSwitch && flag.enabled_globally;

  return (
    <div className={`rounded-lg border ${isKilled ? 'border-destructive/30 bg-destructive/5' : 'border-border'} transition-all`}>
      <div className="flex items-center gap-3 p-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-mono font-medium text-foreground">{flag.name}</p>
            {isKilled && (
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive font-medium border border-destructive/20">
                <AlertTriangle className="w-2.5 h-2.5" />
                KILL SWITCH ACTIVE
              </span>
            )}
            {hasKillSwitch && !isKilled && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                kill-switch armed
              </span>
            )}
            {flag.enabled_plans.length > 0 && (
              <span className="text-[10px] text-muted-foreground">
                plans: {flag.enabled_plans.join(', ')}
              </span>
            )}
            {flag.percentage_rollout > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {flag.percentage_rollout}% rollout
              </span>
            )}
          </div>
          {flag.description && (
            <p className="text-xs text-muted-foreground mt-0.5">{flag.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Toggle
            checked={flag.enabled_globally}
            onChange={() => onToggleGlobal(flag)}
            disabled={toggling || deleting}
            destructive={hasKillSwitch}
          />
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
            title="Expand details"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3">
          <div className="text-xs text-muted-foreground space-y-1 bg-muted/30 rounded-md p-3 mb-3">
            {flag.kill_switch_function && (
              <p>
                <span className="font-medium text-foreground">Kill switch target:</span>{' '}
                <span className="font-mono">{flag.kill_switch_function}</span>
              </p>
            )}
            {flag.enabled_plans.length > 0 && (
              <p>
                <span className="font-medium text-foreground">Plans:</span>{' '}
                {flag.enabled_plans.join(', ')}
              </p>
            )}
            {flag.enabled_user_ids.length > 0 && (
              <p>
                <span className="font-medium text-foreground">User overrides:</span>{' '}
                {flag.enabled_user_ids.length} user{flag.enabled_user_ids.length !== 1 ? 's' : ''}
              </p>
            )}
            {flag.percentage_rollout > 0 && (
              <p>
                <span className="font-medium text-foreground">Rollout:</span>{' '}
                {flag.percentage_rollout}%
              </p>
            )}
            <p>
              <span className="font-medium text-foreground">Last updated by:</span>{' '}
              {flag.updated_by || '—'}{' '}
              <span className="text-muted-foreground">
                {new Date(flag.updated_at).toLocaleString()}
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(flag)}
              disabled={deleting}
              className="text-xs h-7"
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(flag.name)}
              disabled={deleting}
              className="text-xs h-7 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function FeatureFlagsPanel() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState<string | null>(null);
  const isMounted = useIsMounted();

  const fetchFlags = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tuple = await appwriteFunctions.invoke(
        'admin-feature-flags',
        devKitInvokeOptions({ action: 'list' }),
      );
      const result = unwrapAdminResponse<{ flags: FeatureFlag[] }>(tuple, 'admin-feature-flags');
      if (!isMounted()) return;
      setFlags(result.flags ?? []);
    } catch (e) {
      if (!isMounted()) return;
      setError(formatEdgeError(e, 'Failed to load feature flags'));
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [isMounted]);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const handleToggleGlobal = useCallback(async (flag: FeatureFlag) => {
    setSaving(flag.name);
    try {
      const tuple = await appwriteFunctions.invoke(
        'admin-feature-flags',
        devKitInvokeOptions({
          action: 'upsert',
          name: flag.name,
          description: flag.description,
          enabled_globally: !flag.enabled_globally,
          enabled_plans: flag.enabled_plans,
          enabled_user_ids: flag.enabled_user_ids,
          percentage_rollout: flag.percentage_rollout,
          kill_switch_function: flag.kill_switch_function,
        }),
      );
      unwrapAdminResponse(tuple, 'admin-feature-flags');
      if (!isMounted()) return;
      setFlags((prev) =>
        prev.map((f) =>
          f.name === flag.name ? { ...f, enabled_globally: !f.enabled_globally } : f,
        ),
      );
      toast.success(`${flag.name} ${!flag.enabled_globally ? 'enabled' : 'disabled'}`);
    } catch (e) {
      toast.error(formatEdgeError(e, 'Failed to update flag'));
    } finally {
      if (isMounted()) setSaving(null);
    }
  }, [isMounted]);

  const handleSave = useCallback(
    async (data: Omit<FeatureFlag, 'id' | 'updated_by' | 'updated_at'>) => {
      const name = data.name || editingFlag?.name;
      if (!name) return;
      setSaving(name);
      try {
        const tuple = await appwriteFunctions.invoke(
          'admin-feature-flags',
          devKitInvokeOptions({ action: 'upsert', ...data }),
        );
        const result = unwrapAdminResponse<{ flag: FeatureFlag }>(tuple, 'admin-feature-flags');
        if (!isMounted()) return;
        const saved = result.flag;
        setFlags((prev) => {
          const exists = prev.some((f) => f.name === saved.name);
          return exists
            ? prev.map((f) => (f.name === saved.name ? saved : f))
            : [...prev, saved].sort((a, b) => a.name.localeCompare(b.name));
        });
        setEditingFlag(null);
        setShowNewForm(false);
        toast.success(`Flag "${saved.name}" saved`);
      } catch (e) {
        toast.error(formatEdgeError(e, 'Failed to save flag'));
      } finally {
        if (isMounted()) setSaving(null);
      }
    },
    [editingFlag, isMounted],
  );

  const handleDelete = useCallback(
    async (name: string) => {
      setDeleteConfirmName(name);
    },
    [],
  );

  const executeDelete = useCallback(
    async (name: string) => {
      setDeleteConfirmName(null);
      setDeleting(name);
      try {
        const tuple = await appwriteFunctions.invoke(
          'admin-feature-flags',
          devKitInvokeOptions({ action: 'delete', name }),
        );
        unwrapAdminResponse(tuple, 'admin-feature-flags');
        if (!isMounted()) return;
        setFlags((prev) => prev.filter((f) => f.name !== name));
        toast.success(`Flag "${name}" deleted`);
      } catch (e) {
        toast.error(formatEdgeError(e, 'Failed to delete flag'));
      } finally {
        if (isMounted()) setDeleting(null);
      }
    },
    [isMounted],
  );

  const activeCount = flags.filter((f) => f.enabled_globally).length;
  const killCount = flags.filter((f) => f.kill_switch_function && f.enabled_globally).length;

  return (
    <div className="space-y-8">

      {/* ── Feature flag delete confirmation ────────────────────────────── */}
      {deleteConfirmName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl border border-red-500/20 bg-[#0e0e0e] p-8 shadow-2xl space-y-5">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle size={22} />
              <h3 className="font-black text-white text-lg">Delete Feature Flag?</h3>
            </div>
            <p className="text-sm text-white/50 leading-relaxed">
              Delete flag <span className="font-mono font-bold text-white">{deleteConfirmName}</span>?
              This cannot be undone and may break features that depend on it.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmName(null)}
                className="flex-1 rounded-2xl border-white/10 bg-white/5 text-white/60 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={() => executeDelete(deleteConfirmName)}
                disabled={deleting === deleteConfirmName}
                className="flex-1 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold"
              >
                {deleting === deleteConfirmName
                  ? <MiniSpinner size={14} className="mr-2" />
                  : <Trash2 size={14} className="mr-2" />}
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── App-wide gates section ──────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-white/40">App-Wide Gates</h3>
          <div className="flex-1 h-px bg-white/5" />
        </div>
        <AppWideSettingsSection />
      </section>

      {/* ── Divider ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-white/40">Feature Flags</h3>
        <div className="flex-1 h-px bg-white/5" />
      </div>

      {/* ── Feature flags section ────────────────────────────────────────── */}
      <div className="space-y-6 -mt-2">
        {error && (
          <DevKitErrorCard
            error={error}
            title="Couldn't load feature flags"
            context={{ panel: 'Feature Control', function: 'admin-feature-flags' }}
          />
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Flag className="w-4 h-4" />
              <span>
                {flags.length} flag{flags.length !== 1 ? 's' : ''} ·{' '}
                <span className="text-foreground font-medium">{activeCount} globally on</span>
                {killCount > 0 && (
                  <>
                    {' '}·{' '}
                    <span className="text-destructive font-medium">
                      {killCount} kill switch{killCount !== 1 ? 'es' : ''} active
                    </span>
                  </>
                )}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowNewForm(true);
                setEditingFlag(null);
              }}
              disabled={loading || showNewForm}
            >
              <Plus className="w-4 h-4 mr-1" />
              New flag
            </Button>
            <Button variant="outline" size="sm" onClick={fetchFlags} disabled={loading}>
              {loading ? <MiniSpinner size={16} /> : <RefreshCw className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {showNewForm && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
            <h3 className="text-sm font-semibold mb-1">New feature flag</h3>
            <FlagForm
              initial={EMPTY_FLAG}
              onSave={handleSave}
              onCancel={() => setShowNewForm(false)}
              saving={!!saving}
              isNew
            />
          </div>
        )}

        {loading && flags.length === 0 && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-muted/40 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && flags.length === 0 && !showNewForm && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <Flag className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No feature flags defined yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Click "New flag" to create your first one.
            </p>
          </div>
        )}

        <div className="space-y-2">
          {flags.map((flag) =>
            editingFlag?.name === flag.name ? (
              <div key={flag.name} className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                <h3 className="text-sm font-semibold font-mono mb-1">{flag.name}</h3>
                <FlagForm
                  initial={{
                    name: flag.name,
                    description: flag.description,
                    enabled_globally: flag.enabled_globally,
                    enabled_plans: flag.enabled_plans,
                    enabled_user_ids: flag.enabled_user_ids,
                    percentage_rollout: flag.percentage_rollout,
                    kill_switch_function: flag.kill_switch_function,
                  }}
                  onSave={handleSave}
                  onCancel={() => setEditingFlag(null)}
                  saving={saving === flag.name}
                />
              </div>
            ) : (
              <FlagRow
                key={flag.name}
                flag={flag}
                onToggleGlobal={handleToggleGlobal}
                onEdit={setEditingFlag}
                onDelete={handleDelete}
                toggling={saving === flag.name}
                deleting={deleting === flag.name}
              />
            ),
          )}
        </div>
      </div>
    </div>
  );
}
