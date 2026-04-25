import { useState, useCallback, useEffect } from 'react';
import { RefreshCw, Save, RotateCcw, SplitSquareVertical, Zap, Route } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { devKitAuthHeaders } from '@/lib/devkit/devKitAuth';
import { unwrapAdminResponse, formatEdgeError } from '@/lib/devkit/edgeResponse';
import { useIsMounted } from '@/lib/devkit/hooks';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Provider = 'auto' | 'openrouter' | 'groq';

interface RoutingConfig {
  feature_name: string;
  provider: Provider;
  model: string;
  ab_secondary_provider: string | null;
  ab_secondary_model: string;
  ab_split_pct: number;
  updated_by: string | null;
  updated_at: string | null;
}

interface CapValues {
  daily_cap_free: string | null;
  daily_cap_trial: string | null;
  daily_cap_pro: string | null;
}

const FEATURE_LABELS: Record<string, string> = {
  'tailor-resume': 'Tailor Resume',
  'enhance-section': 'Enhance Section',
  'analyze-resume': 'Analyze Resume',
  'generate-cover-letter': 'Cover Letter',
  'agentic-chat': 'Agentic Chat',
  'wise-ai-chat': 'Wise AI Chat',
  'score-resume': 'Score Resume',
};

const PROVIDER_OPTIONS: { value: Provider; label: string }[] = [
  { value: 'auto', label: 'Auto (random pool)' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'groq', label: 'Groq' },
];

type InternalTab = 'routing' | 'caps';

export function AIRoutingPanel() {
  const isMounted = useIsMounted();
  const [activeTab, setActiveTab] = useState<InternalTab>('routing');

  const [configs, setConfigs] = useState<RoutingConfig[]>([]);
  const [loadingRouting, setLoadingRouting] = useState(false);
  const [routingError, setRoutingError] = useState<string | null>(null);
  const [savingFeature, setSavingFeature] = useState<string | null>(null);
  const [resetingFeature, setResetingFeature] = useState<string | null>(null);

  const [localConfigs, setLocalConfigs] = useState<Record<string, Partial<RoutingConfig>>>({});

  const [caps, setCaps] = useState<CapValues>({ daily_cap_free: null, daily_cap_trial: null, daily_cap_pro: null });
  const [capInputs, setCapInputs] = useState<Record<string, string>>({ free: '', trial: '', pro: '' });
  const [loadingCaps, setLoadingCaps] = useState(false);
  const [capsError, setCapsError] = useState<string | null>(null);
  const [savingCap, setSavingCap] = useState<string | null>(null);

  const fetchRouting = useCallback(async () => {
    setLoadingRouting(true);
    setRoutingError(null);
    try {
      const tuple = await edgeFunctions.functions.invoke('admin-ai-routing', {
        headers: devKitAuthHeaders(),
        body: { action: 'get_all' },
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
      const c = result.caps ?? { daily_cap_free: null, daily_cap_trial: null, daily_cap_pro: null };
      setCaps(c);
      setCapInputs({
        free: c.daily_cap_free ?? '',
        trial: c.daily_cap_trial ?? '',
        pro: c.daily_cap_pro ?? '',
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

  const saveCap = async (plan: string) => {
    const rawVal = capInputs[plan]?.trim();
    setSavingCap(plan);
    try {
      const tuple = await edgeFunctions.functions.invoke('admin-ai-caps', {
        headers: devKitAuthHeaders(),
        body: {
          action: 'set_plan_cap',
          plan,
          value: rawVal === '' ? null : rawVal,
        },
      });
      unwrapAdminResponse(tuple, 'admin-ai-caps');
      if (!isMounted()) return;
      const capKey = `daily_cap_${plan}` as keyof CapValues;
      setCaps(prev => ({ ...prev, [capKey]: rawVal === '' ? null : rawVal }));
      toast.success(`${plan.charAt(0).toUpperCase() + plan.slice(1)} plan cap saved`);
    } catch (e) {
      toast.error(formatEdgeError(e, 'Failed to save cap'));
    } finally {
      if (isMounted()) setSavingCap(null);
    }
  };

  const hasLocalChanges = (feature: string) => Object.keys(localConfigs[feature] ?? {}).length > 0;

  const tabs: { id: InternalTab; label: string; icon: React.ElementType }[] = [
    { id: 'routing', label: 'Routing Config', icon: Route },
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

      {activeTab === 'routing' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Select a provider and optional model for each AI feature. Changes take effect immediately — no redeploy needed.
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
              const isSaving = savingFeature === cfg.feature_name;
              const isResetting = resetingFeature === cfg.feature_name;

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
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => resetFeature(cfg.feature_name)}
                        disabled={isResetting || isSaving || (resolved.provider === 'auto' && !resolved.model && !resolved.ab_secondary_provider)}
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Reset
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

                  <div className="border-t border-border/60 pt-3 space-y-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                      <SplitSquareVertical className="w-3 h-3" />
                      A/B split
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label className="text-[11px] text-muted-foreground">Secondary provider</label>
                        <select
                          value={resolved.ab_secondary_provider ?? ''}
                          onChange={(e) => setLocalField(cfg.feature_name, 'ab_secondary_provider', e.target.value || null)}
                          className="w-full h-8 px-2 text-xs bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="">None</option>
                          <option value="openrouter">OpenRouter</option>
                          <option value="groq">Groq</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] text-muted-foreground">Secondary model</label>
                        <Input
                          placeholder="e.g. gemma-3n-e4b-it-fp8"
                          value={resolved.ab_secondary_model ?? ''}
                          onChange={(e) => setLocalField(cfg.feature_name, 'ab_secondary_model', e.target.value)}
                          className="h-8 text-xs font-mono"
                          disabled={!resolved.ab_secondary_provider}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] text-muted-foreground">Split % to secondary</label>
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
                          {(resolved.ab_split_pct ?? 0) > 0 && resolved.ab_secondary_provider && (
                            <span className="text-[10px] text-muted-foreground">
                              {100 - (resolved.ab_split_pct ?? 0)}% primary / {resolved.ab_split_pct}% secondary
                            </span>
                          )}
                        </div>
                      </div>
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

      {activeTab === 'caps' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Override the per-plan daily AI credit limits. Leave blank to use the built-in plan defaults. Use -1 for unlimited.
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
                      placeholder="blank = per-plan default, -1 = unlimited"
                      value={capInputs[plan] ?? ''}
                      onChange={(e) => setCapInputs(prev => ({ ...prev, [plan]: e.target.value }))}
                      className="h-8 text-sm flex-1"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => saveCap(plan)}
                      disabled={savingCap === plan}
                      className="shrink-0 flex items-center gap-1.5 h-8"
                    >
                      <Save className="w-3 h-3" />
                      {savingCap === plan ? 'Saving…' : 'Save'}
                    </Button>
                  </div>
                  {currentVal != null && (
                    <p className="text-xs text-muted-foreground">
                      Current override:{' '}
                      <strong>{currentVal === '-1' ? 'Unlimited' : `${currentVal} credits/day`}</strong>
                    </p>
                  )}
                  {currentVal == null && (
                    <p className="text-xs text-muted-foreground italic">No override — using per-plan default</p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-border/50 bg-muted/20 p-4 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Priority order</p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>Per-user override (set via Users panel → Set Credits)</li>
              <li>Per-plan cap override (set here)</li>
              <li>Built-in plan default from creditLimits.json</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
