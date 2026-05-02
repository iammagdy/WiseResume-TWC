import { useState, useCallback, useEffect } from 'react';
import { RefreshCw, Save, RotateCcw, SplitSquareVertical, Zap, Route, Globe, User, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { devKitAuthHeaders } from '@/lib/devkit/devKitAuth';
import { unwrapAdminResponse, formatEdgeError } from '@/lib/devkit/edgeResponse';
import { useIsMounted } from '@/lib/devkit/hooks';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AITestSlotModelsCard } from './AITestSlotModelsCard';

type Provider = 'auto' | 'openrouter' | 'groq' | 'deepseek';
type SecondaryProvider = 'openrouter' | 'groq' | 'deepseek';

interface RoutingConfig {
  feature_name: string;
  provider: Provider;
  model: string;
  ab_secondary_provider: SecondaryProvider | null;
  ab_secondary_model: string;
  ab_split_pct: number;
  updated_by: string | null;
  updated_at: string | null;
}

interface CapValues {
  daily_cap_free: string | null;
  daily_cap_trial: string | null;
  daily_cap_pro: string | null;
  global_daily_limit: string | null;
}

// score-resume is excluded — fully deterministic, no LLM calls, routing has no effect.
const FEATURE_LABELS: Record<string, string> = {
  'tailor-resume': 'Tailor Resume',
  'enhance-section': 'Enhance Section',
  'analyze-resume': 'Analyze Resume',
  'generate-cover-letter': 'Cover Letter',
  'agentic-chat': 'Agentic Chat',
  'wise-ai-chat': 'Wise AI Chat',
};

const PROVIDER_OPTIONS: { value: Provider; label: string }[] = [
  { value: 'auto', label: 'Auto (random pool)' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'groq', label: 'Groq' },
  { value: 'deepseek', label: 'DeepSeek' },
];

type InternalTab = 'routing' | 'ab' | 'caps';

export function AIRoutingPanel() {
  const isMounted = useIsMounted();
  const [activeTab, setActiveTab] = useState<InternalTab>('routing');

  const [configs, setConfigs] = useState<RoutingConfig[]>([]);
  const [loadingRouting, setLoadingRouting] = useState(false);
  const [routingError, setRoutingError] = useState<string | null>(null);
  const [savingFeature, setSavingFeature] = useState<string | null>(null);
  const [resetingFeature, setResetingFeature] = useState<string | null>(null);

  const [localConfigs, setLocalConfigs] = useState<Record<string, Partial<RoutingConfig>>>({});

  const [caps, setCaps] = useState<CapValues>({ daily_cap_free: null, daily_cap_trial: null, daily_cap_pro: null, global_daily_limit: null });
  const [capInputs, setCapInputs] = useState<Record<string, string>>({ free: '', trial: '', pro: '', global: '' });
  const [loadingCaps, setLoadingCaps] = useState(false);
  const [capsError, setCapsError] = useState<string | null>(null);
  const [savingCap, setSavingCap] = useState<string | null>(null);

  const [userCapUserId, setUserCapUserId] = useState('');
  const [userCapInput, setUserCapInput] = useState('');
  const [userCapLookup, setUserCapLookup] = useState<{ user_id: string; value: string | null } | null>(null);
  const [lookingUpUserCap, setLookingUpUserCap] = useState(false);
  const [savingUserCap, setSavingUserCap] = useState(false);

  const fetchRouting = useCallback(async () => {
    setLoadingRouting(true);
    setRoutingError(null);
    try {
      const tuple = await edgeFunctions.functions.invoke('admin-ai-routing', {
        headers: devKitAuthHeaders(),
        body: { action: 'get_config' },
      });
      const result = unwrapAdminResponse<{ configs: RoutingConfig[] }>(tuple, 'admin-ai-routing');
      if (!isMounted()) return;
      setConfigs(result.configs ?? []);
      setLocalConfigs({});
    } catch (e) {
      if (!isMounted()) return;
      setRoutingError(formatEdgeError(e, 'Failed to load routing config'));
    } finally {
      if (isMounted()) setLoadingRouting(false);
    }
  }, [isMounted]);

  const fetchCaps = useCallback(async () => {
    setLoadingCaps(true);
    setCapsError(null);
    try {
      const tuple = await edgeFunctions.functions.invoke('admin-ai-caps', {
        headers: devKitAuthHeaders(),
        body: { action: 'get_caps' },
      });
      const result = unwrapAdminResponse<{ caps: CapValues }>(tuple, 'admin-ai-caps');
      if (!isMounted()) return;
      const c = result.caps ?? { daily_cap_free: null, daily_cap_trial: null, daily_cap_pro: null, global_daily_limit: null };
      setCaps(c);
      setCapInputs({
        free: c.daily_cap_free ?? '',
        trial: c.daily_cap_trial ?? '',
        pro: c.daily_cap_pro ?? '',
        global: c.global_daily_limit ?? '',
      });
    } catch (e) {
      if (!isMounted()) return;
      setCapsError(formatEdgeError(e, 'Failed to load spend caps'));
    } finally {
      if (isMounted()) setLoadingCaps(false);
    }
  }, [isMounted]);

  useEffect(() => { fetchRouting(); fetchCaps(); }, [fetchRouting, fetchCaps]);

  const getLocal = (feature: string): Partial<RoutingConfig> => localConfigs[feature] ?? {};

  const setLocalField = (feature: string, field: keyof RoutingConfig, value: unknown) => {
    setLocalConfigs(prev => ({
      ...prev,
      [feature]: { ...(prev[feature] ?? {}), [field]: value },
    }));
  };

  const resolvedConfig = (base: RoutingConfig): RoutingConfig => ({
    ...base,
    ...localConfigs[base.feature_name],
  });

  const saveFeature = async (feature: string) => {
    const base = configs.find(c => c.feature_name === feature);
    if (!base) return;
    const resolved = resolvedConfig(base);
    setSavingFeature(feature);
    try {
      const tuple = await edgeFunctions.functions.invoke('admin-ai-routing', {
        headers: devKitAuthHeaders(),
        body: {
          action: 'update_feature',
          feature_name: feature,
          provider: resolved.provider,
          model: resolved.model || '',
          ab_secondary_provider: resolved.ab_secondary_provider || null,
          ab_secondary_model: resolved.ab_secondary_model || '',
          ab_split_pct: resolved.ab_split_pct ?? 0,
        },
      });
      unwrapAdminResponse(tuple, 'admin-ai-routing');
      if (!isMounted()) return;
      setConfigs(prev => prev.map(c => c.feature_name === feature ? { ...c, ...resolved } : c));
      setLocalConfigs(prev => { const next = { ...prev }; delete next[feature]; return next; });
      toast.success(`Routing saved for ${FEATURE_LABELS[feature] ?? feature}`);
    } catch (e) {
      toast.error(formatEdgeError(e, 'Failed to save routing'));
    } finally {
      if (isMounted()) setSavingFeature(null);
    }
  };

  const resetFeature = async (feature: string) => {
    setResetingFeature(feature);
    try {
      const tuple = await edgeFunctions.functions.invoke('admin-ai-routing', {
        headers: devKitAuthHeaders(),
        body: { action: 'reset_feature', feature_name: feature },
      });
      unwrapAdminResponse(tuple, 'admin-ai-routing');
      if (!isMounted()) return;
      setConfigs(prev => prev.map(c => c.feature_name === feature
        ? { ...c, provider: 'auto', model: '', ab_secondary_provider: null, ab_secondary_model: '', ab_split_pct: 0 }
        : c));
      setLocalConfigs(prev => { const next = { ...prev }; delete next[feature]; return next; });
      toast.success(`${FEATURE_LABELS[feature] ?? feature} reset to Auto`);
    } catch (e) {
      toast.error(formatEdgeError(e, 'Failed to reset feature'));
    } finally {
      if (isMounted()) setResetingFeature(null);
    }
  };

  const savePlanCap = async (plan: string) => {
    const rawVal = capInputs[plan]?.trim();
    setSavingCap(plan);
    try {
      const tuple = await edgeFunctions.functions.invoke('admin-ai-caps', {
        headers: devKitAuthHeaders(),
        body: { action: 'set_plan_cap', plan, value: rawVal === '' ? null : rawVal },
      });
      unwrapAdminResponse(tuple, 'admin-ai-caps');
      if (!isMounted()) return;
      const capKey = `daily_cap_${plan}` as keyof CapValues;
      setCaps(prev => ({ ...prev, [capKey]: rawVal === '' ? null : rawVal }));
      toast.success(`${plan.charAt(0).toUpperCase() + plan.slice(1)} plan cap saved`);
    } catch (e) {
      toast.error(formatEdgeError(e, 'Failed to save plan cap'));
    } finally {
      if (isMounted()) setSavingCap(null);
    }
  };

  const saveGlobalCap = async () => {
    const rawVal = capInputs['global']?.trim();
    setSavingCap('global');
    try {
      const tuple = await edgeFunctions.functions.invoke('admin-ai-caps', {
        headers: devKitAuthHeaders(),
        body: { action: 'set_global_cap', value: rawVal === '' ? null : rawVal },
      });
      unwrapAdminResponse(tuple, 'admin-ai-caps');
      if (!isMounted()) return;
      setCaps(prev => ({ ...prev, global_daily_limit: rawVal === '' ? null : rawVal }));
      toast.success('Global cap saved');
    } catch (e) {
      toast.error(formatEdgeError(e, 'Failed to save global cap'));
    } finally {
      if (isMounted()) setSavingCap(null);
    }
  };

  const lookupUserCap = async () => {
    const uid = userCapUserId.trim();
    if (!uid) return;
    setLookingUpUserCap(true);
    try {
      const tuple = await edgeFunctions.functions.invoke('admin-ai-caps', {
        headers: devKitAuthHeaders(),
        body: { action: 'get_user_cap', user_id: uid },
      });
      const result = unwrapAdminResponse<{ user_id: string; value: string | null }>(tuple, 'admin-ai-caps');
      if (!isMounted()) return;
      setUserCapLookup({ user_id: result.user_id, value: result.value });
      setUserCapInput(result.value ?? '');
    } catch (e) {
      toast.error(formatEdgeError(e, 'Failed to look up user cap'));
    } finally {
      if (isMounted()) setLookingUpUserCap(false);
    }
  };

  const saveUserCap = async () => {
    const uid = userCapUserId.trim();
    if (!uid) return;
    const rawVal = userCapInput.trim();
    setSavingUserCap(true);
    try {
      const tuple = await edgeFunctions.functions.invoke('admin-ai-caps', {
        headers: devKitAuthHeaders(),
        body: { action: 'set_user_cap', user_id: uid, value: rawVal === '' ? null : rawVal },
      });
      unwrapAdminResponse(tuple, 'admin-ai-caps');
      if (!isMounted()) return;
      setUserCapLookup({ user_id: uid, value: rawVal === '' ? null : rawVal });
      toast.success(`User cap saved`);
    } catch (e) {
      toast.error(formatEdgeError(e, 'Failed to save user cap'));
    } finally {
      if (isMounted()) setSavingUserCap(false);
    }
  };

  const clearUserCap = async () => {
    const uid = userCapUserId.trim();
    if (!uid) return;
    setSavingUserCap(true);
    try {
      const tuple = await edgeFunctions.functions.invoke('admin-ai-caps', {
        headers: devKitAuthHeaders(),
        body: { action: 'set_user_cap', user_id: uid, value: null },
      });
      unwrapAdminResponse(tuple, 'admin-ai-caps');
      if (!isMounted()) return;
      setUserCapLookup({ user_id: uid, value: null });
      setUserCapInput('');
      toast.success('User cap cleared');
    } catch (e) {
      toast.error(formatEdgeError(e, 'Failed to clear user cap'));
    } finally {
      if (isMounted()) setSavingUserCap(false);
    }
  };

  const hasLocalChanges = (feature: string) => Object.keys(localConfigs[feature] ?? {}).length > 0;

  const featureActionButtons = (cfg: RoutingConfig) => {
    const resolved = resolvedConfig(cfg);
    const dirty = hasLocalChanges(cfg.feature_name);
    const isSaving = savingFeature === cfg.feature_name;
    const isResetting = resetingFeature === cfg.feature_name;
    const isClean = resolved.provider === 'auto' && !resolved.model && !resolved.ab_secondary_provider;
    return (
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => resetFeature(cfg.feature_name)}
          disabled={isResetting || isSaving || isClean}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          {isResetting ? 'Resetting…' : 'Reset'}
        </Button>
        <Button
          size="sm"
          onClick={() => saveFeature(cfg.feature_name)}
          disabled={isSaving || isResetting || !dirty}
          className="h-7 px-2 text-xs"
        >
          <Save className="w-3 h-3 mr-1" />
          {isSaving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    );
  };

  const tabs: { id: InternalTab; label: string; icon: React.ElementType }[] = [
    { id: 'routing', label: 'Routing Config', icon: Route },
    { id: 'ab', label: 'A/B Testing', icon: SplitSquareVertical },
    { id: 'caps', label: 'Spend Caps', icon: Zap },
  ];

  return (
    <div className="space-y-4">
      <div className="border-b border-border">
        <div className="flex gap-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                'px-4 py-2 text-xs font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5',
                activeTab === t.id
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── ROUTING TAB ──────────────────────────────────────────────────── */}
      {activeTab === 'routing' && (
        <div className="space-y-4">
          {/* Surface per-slot test models alongside per-feature routing so an
              admin doesn't have to open the DevKit AI Keys panel to see what
              `openrouter:1` etc. test against. Same data source as that panel. */}
          <AITestSlotModelsCard
            title="AI test slot models (per-key)"
            subtitle="What each of the 9 AI key slots tests against. Edit in DevKit › AI Keys."
          />

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Select a primary provider and optional model for each AI feature. Changes take effect immediately.
            </p>
            <Button variant="outline" size="sm" onClick={fetchRouting} disabled={loadingRouting}>
              <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', loadingRouting && 'animate-spin')} />
              Refresh
            </Button>
          </div>

          {routingError && (
            <div className="rounded-md bg-red-500/5 border border-red-500/20 p-3 text-xs text-red-600 dark:text-red-400">
              {routingError}
            </div>
          )}

          <div className="space-y-3">
            {configs.map((cfg) => {
              const resolved = resolvedConfig(cfg);
              const dirty = hasLocalChanges(cfg.feature_name);

              return (
                <div key={cfg.feature_name} className={cn(
                  'rounded-xl border p-4 space-y-3 transition-colors',
                  dirty ? 'border-primary/40 bg-primary/3' : 'border-border bg-card',
                )}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{FEATURE_LABELS[cfg.feature_name] ?? cfg.feature_name}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">{cfg.feature_name}</span>
                      {dirty && (
                        <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                          unsaved
                        </Badge>
                      )}
                    </div>
                    {featureActionButtons(cfg)}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground font-medium">Primary provider</label>
                      <select
                        value={resolved.provider}
                        onChange={(e) => setLocalField(cfg.feature_name, 'provider', e.target.value as Provider)}
                        className="w-full h-8 px-2 text-xs bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {PROVIDER_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground font-medium">
                        Model override <span className="font-normal">(blank = provider default)</span>
                      </label>
                      <Input
                        placeholder="e.g. llama-3.3-70b-versatile"
                        value={resolved.model ?? ''}
                        onChange={(e) => setLocalField(cfg.feature_name, 'model', e.target.value)}
                        className="h-8 text-xs font-mono"
                        disabled={resolved.provider === 'auto'}
                      />
                    </div>
                  </div>

                  {cfg.updated_at && (
                    <p className="text-[10px] text-muted-foreground">
                      Last updated {new Date(cfg.updated_at).toLocaleString()}
                      {cfg.updated_by ? ` by ${cfg.updated_by}` : ''}
                    </p>
                  )}
                </div>
              );
            })}

            {!loadingRouting && configs.length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-6">
                No routing config found. Run the migration to seed the table.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── A/B TESTING TAB ──────────────────────────────────────────────── */}
      {activeTab === 'ab' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Split traffic between a primary and secondary provider per feature. The split % goes to the secondary; remainder goes to primary.
            </p>
            <Button variant="outline" size="sm" onClick={fetchRouting} disabled={loadingRouting}>
              <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', loadingRouting && 'animate-spin')} />
              Refresh
            </Button>
          </div>

          {routingError && (
            <div className="rounded-md bg-red-500/5 border border-red-500/20 p-3 text-xs text-red-600 dark:text-red-400">
              {routingError}
            </div>
          )}

          <div className="space-y-3">
            {configs.map((cfg) => {
              const resolved = resolvedConfig(cfg);
              const dirty = hasLocalChanges(cfg.feature_name);
              const hasAB = !!resolved.ab_secondary_provider;

              return (
                <div key={cfg.feature_name} className={cn(
                  'rounded-xl border p-4 space-y-3 transition-colors',
                  dirty ? 'border-primary/40 bg-primary/3' : 'border-border bg-card',
                )}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{FEATURE_LABELS[cfg.feature_name] ?? cfg.feature_name}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">{cfg.feature_name}</span>
                      {hasAB && (resolved.ab_split_pct ?? 0) > 0 && (
                        <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">
                          {100 - (resolved.ab_split_pct ?? 0)}% / {resolved.ab_split_pct}% split
                        </Badge>
                      )}
                      {dirty && (
                        <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                          unsaved
                        </Badge>
                      )}
                    </div>
                    {featureActionButtons(cfg)}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground font-medium">Secondary provider</label>
                      <select
                        value={resolved.ab_secondary_provider ?? ''}
                        onChange={(e) => setLocalField(cfg.feature_name, 'ab_secondary_provider', (e.target.value || null) as SecondaryProvider | null)}
                        className="w-full h-8 px-2 text-xs bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="">None — A/B disabled</option>
                        <option value="openrouter">OpenRouter</option>
                        <option value="groq">Groq</option>
                        <option value="deepseek">DeepSeek</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground font-medium">Secondary model</label>
                      <Input
                        placeholder="e.g. gemma-3n-e4b-it-fp8"
                        value={resolved.ab_secondary_model ?? ''}
                        onChange={(e) => setLocalField(cfg.feature_name, 'ab_secondary_model', e.target.value)}
                        className="h-8 text-xs font-mono"
                        disabled={!resolved.ab_secondary_provider}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground font-medium">Split % to secondary</label>
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          placeholder="0"
                          value={resolved.ab_split_pct ?? 0}
                          onChange={(e) => setLocalField(cfg.feature_name, 'ab_split_pct', Math.min(100, Math.max(0, Number(e.target.value))))}
                          className="h-8 text-xs w-20"
                          disabled={!resolved.ab_secondary_provider}
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                      {hasAB && (resolved.ab_split_pct ?? 0) > 0 && (
                        <p className="text-[10px] text-muted-foreground">
                          {100 - (resolved.ab_split_pct ?? 0)}% → primary · {resolved.ab_split_pct}% → secondary
                        </p>
                      )}
                    </div>
                  </div>

                  {hasAB && (resolved.ab_split_pct ?? 0) > 0 && resolved.provider === 'auto' && (
                    <div className="rounded-md bg-amber-500/5 border border-amber-500/20 p-2 text-[11px] text-amber-600 dark:text-amber-400">
                      Primary provider is "Auto" — the split will not produce deterministic routing. Set an explicit primary provider in the Routing Config tab for A/B to work as expected.
                    </div>
                  )}

                  {cfg.updated_at && (
                    <p className="text-[10px] text-muted-foreground">
                      Last updated {new Date(cfg.updated_at).toLocaleString()}
                      {cfg.updated_by ? ` by ${cfg.updated_by}` : ''}
                    </p>
                  )}
                </div>
              );
            })}

            {!loadingRouting && configs.length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-6">
                No routing config found. Run the migration to seed the table.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SPEND CAPS TAB ───────────────────────────────────────────────── */}
      {activeTab === 'caps' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Override daily AI credit limits. Leave blank to use built-in defaults. Use -1 for unlimited.
            </p>
            <Button variant="outline" size="sm" onClick={fetchCaps} disabled={loadingCaps}>
              <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', loadingCaps && 'animate-spin')} />
              Refresh
            </Button>
          </div>

          {capsError && (
            <div className="rounded-md bg-red-500/5 border border-red-500/20 p-3 text-xs text-red-600 dark:text-red-400">
              {capsError}
            </div>
          )}

          {/* Global cap */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Globe className="w-3.5 h-3.5 text-muted-foreground" />
              Global cap
            </div>
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div>
                <h3 className="text-sm font-medium">Platform-wide aggregate daily limit</h3>
                <p className="text-xs text-muted-foreground">
                  Total credits consumed across <em>all users combined</em> per day. When the platform total reaches this limit, all AI requests are rejected until midnight UTC regardless of individual plan limits. Use -1 for unlimited.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={-1}
                  placeholder="blank = disabled, -1 = unlimited"
                  value={capInputs['global'] ?? ''}
                  onChange={(e) => setCapInputs(prev => ({ ...prev, global: e.target.value }))}
                  className="h-8 text-sm flex-1"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={saveGlobalCap}
                  disabled={savingCap === 'global'}
                  className="shrink-0 flex items-center gap-1.5 h-8"
                >
                  <Save className="w-3 h-3" />
                  {savingCap === 'global' ? 'Saving…' : 'Save'}
                </Button>
              </div>
              {caps.global_daily_limit != null ? (
                <p className="text-xs text-muted-foreground">
                  Active global cap:{' '}
                  <strong>{caps.global_daily_limit === '-1' ? 'Unlimited' : `${caps.global_daily_limit} credits/day`}</strong>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground italic">No global cap active — using per-plan caps</p>
              )}
            </div>
          </div>

          {/* Per-plan caps */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-foreground">Per-plan caps</div>
            <div className="space-y-3">
              {([
                { plan: 'free', label: 'Free plan', description: 'Users on the free tier' },
                { plan: 'trial', label: 'Trial plan', description: 'Users with an active trial (any plan)' },
                { plan: 'pro', label: 'Pro plan', description: 'Users on Pro (also applies to Premium as a floor)' },
              ] as const).map(({ plan, label, description }) => {
                const capKey = `daily_cap_${plan}` as keyof CapValues;
                const currentVal = caps[capKey];
                return (
                  <div key={plan} className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div>
                      <h3 className="text-sm font-medium">{label}</h3>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={-1}
                        placeholder="blank = built-in default, -1 = unlimited"
                        value={capInputs[plan] ?? ''}
                        onChange={(e) => setCapInputs(prev => ({ ...prev, [plan]: e.target.value }))}
                        className="h-8 text-sm flex-1"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => savePlanCap(plan)}
                        disabled={savingCap === plan}
                        className="shrink-0 flex items-center gap-1.5 h-8"
                      >
                        <Save className="w-3 h-3" />
                        {savingCap === plan ? 'Saving…' : 'Save'}
                      </Button>
                    </div>
                    {currentVal != null ? (
                      <p className="text-xs text-muted-foreground">
                        Current override:{' '}
                        <strong>{currentVal === '-1' ? 'Unlimited' : `${currentVal} credits/day`}</strong>
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No override — using built-in plan default</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Per-user override */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              Per-user override
            </div>
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div>
                <h3 className="text-sm font-medium">Individual user cap</h3>
                <p className="text-xs text-muted-foreground">
                  Overrides all other caps for a specific user. Enter a user UUID to look up or set their limit.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="User UUID (e.g. a1b2c3d4-…)"
                  value={userCapUserId}
                  onChange={(e) => { setUserCapUserId(e.target.value); setUserCapLookup(null); }}
                  className="h-8 text-xs font-mono flex-1"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={lookupUserCap}
                  disabled={lookingUpUserCap || !userCapUserId.trim()}
                  className="shrink-0 h-8 flex items-center gap-1.5"
                >
                  <Search className="w-3 h-3" />
                  {lookingUpUserCap ? 'Looking…' : 'Look up'}
                </Button>
              </div>
              {userCapLookup && (
                <div className="space-y-2 pt-1 border-t border-border/60">
                  {userCapLookup.value != null ? (
                    <p className="text-xs text-muted-foreground">
                      Current override: <strong>{userCapLookup.value === '-1' ? 'Unlimited' : `${userCapLookup.value} credits/day`}</strong>
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No override set for this user</p>
                  )}
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={-1}
                      placeholder="blank = clear override, -1 = unlimited"
                      value={userCapInput}
                      onChange={(e) => setUserCapInput(e.target.value)}
                      className="h-8 text-sm flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={saveUserCap}
                      disabled={savingUserCap}
                      className="shrink-0 h-8 flex items-center gap-1.5"
                    >
                      <Save className="w-3 h-3" />
                      {savingUserCap ? 'Saving…' : 'Set'}
                    </Button>
                    {userCapLookup.value != null && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={clearUserCap}
                        disabled={savingUserCap}
                        className="shrink-0 h-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border/50 bg-muted/20 p-4 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Priority order (highest wins)</p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>Per-user override (this panel — takes precedence over everything)</li>
              <li>Per-plan cap override (this panel)</li>
              <li>Global daily cap (this panel — platform-wide default)</li>
              <li>Built-in plan default from planLimits.ts</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
