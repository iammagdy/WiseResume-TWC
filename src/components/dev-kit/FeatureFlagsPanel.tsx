import { useState, useCallback, useEffect } from 'react';
import {
  RefreshCw,
  Flag,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Save,
  X,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { devKitInvokeOptions } from '@/lib/devkit/devKitAuth';
import { useIsMounted } from '@/lib/devkit/hooks';
import { unwrapAdminResponse, formatEdgeError } from '@/lib/devkit/edgeResponse';

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

export function FeatureFlagsPanel() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const isMounted = useIsMounted();

  const fetchFlags = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tuple = await edgeFunctions.functions.invoke(
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
      const tuple = await edgeFunctions.functions.invoke(
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
        const tuple = await edgeFunctions.functions.invoke(
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
      if (!confirm(`Delete flag "${name}"? This cannot be undone.`)) return;
      setDeleting(name);
      try {
        const tuple = await edgeFunctions.functions.invoke(
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
    <div className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {error}
        </div>
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
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
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
  );
}
