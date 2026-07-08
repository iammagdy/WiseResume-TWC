import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import {
  BrainCircuit, Save, RefreshCw, AlertTriangle, FileEdit,
  Target, MessageSquare, FileText, Globe, ChevronDown, ChevronUp,
  Wifi, Sparkles, Info, Link2,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { getCuratedModels } from '@/lib/devkit/aiTestSlotModels';
import type { AITestProvider } from '@/lib/devkit/aiTestSlotModels';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { account } from '@/lib/appwrite';
import { devKitAuthHeaders } from '@/lib/devkit/devKitAuth';
import { tryUnwrapAdminResponse } from '@/lib/devkit/edgeResponse';
import {
  AI_TOOLS_CATALOGUE,
  TOOL_GATEWAY_DEFAULTS,
  type ToolAppArea,
  type AiToolDef,
} from '@/lib/devkit/aiToolsCatalogue';

// ─── Types ────────────────────────────────────────────────────────────────────

type FeatureCategory = ToolAppArea;
type ProviderId = 'nvidia' | 'groq' | 'deepseek' | 'openrouter';

interface FeatureDef extends AiToolDef {
  category: FeatureCategory;
}

interface RouteState {
  $id?: string;
  feature_id: string;
  provider: string;
  model: string;
  key_slot?: number;
}

// ─── Feature catalogue — sourced from aiToolsCatalogue.ts ────────────────────

const FEATURES: FeatureDef[] = AI_TOOLS_CATALOGUE.map(tool => ({
  ...tool,
  category: tool.appArea,
}));

// ─── Category metadata ─────────────────────────────────────────────────────────

const CATEGORY_META: Record<FeatureCategory, { label: string; Icon: LucideIcon; color: string; bg: string }> = {
  'resume-editor': { label: 'Resume Editor AI',      Icon: FileEdit,      color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20' },
  'tailoring':     { label: 'Tailoring & Job Match', Icon: Target,        color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20' },
  'chat':          { label: 'Chat & Analysis',        Icon: MessageSquare, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  'documents':     { label: 'Document Generation',   Icon: FileText,      color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20' },
  'portfolio':     { label: 'Portfolio & Other',     Icon: Globe,         color: 'text-rose-400',   bg: 'bg-rose-500/10 border-rose-500/20' },
};

const CATEGORY_ORDER: FeatureCategory[] = ['resume-editor', 'tailoring', 'chat', 'documents', 'portfolio'];

// ─── Provider toggle config ────────────────────────────────────────────────────

const PROVIDERS: { id: ProviderId; label: string; defaultModel: string }[] = [
  { id: 'nvidia',     label: 'NVIDIA',     defaultModel: 'meta/llama-4-maverick-17b-128e-instruct' },
  { id: 'groq',       label: 'Groq',       defaultModel: 'llama-3.3-70b-versatile' },
  { id: 'deepseek',   label: 'DeepSeek',   defaultModel: 'deepseek-chat' },
  { id: 'openrouter', label: 'OpenRouter', defaultModel: 'meta-llama/llama-3.3-70b-instruct:free' },
];

const PROVIDER_COLOR: Record<ProviderId, string> = {
  nvidia:     'text-green-400',
  groq:       'text-orange-400',
  deepseek:   'text-purple-400',
  openrouter: 'text-blue-400',
};

// ─── Feature fitness metadata ─────────────────────────────────────────────────

type FeaturePriority = 'latency' | 'quality' | 'reasoning' | 'context';

interface FeatureMeta {
  priority: FeaturePriority;
  rationale: string;
  recommendedProvider: ProviderId;
  recommendedModel: string;
}

const PRIORITY_BADGE: Record<FeaturePriority, { label: string; color: string }> = {
  latency:   { label: 'Low Latency',  color: 'bg-orange-500/15 text-orange-400' },
  quality:   { label: 'High Quality', color: 'bg-green-500/15 text-green-400' },
  reasoning: { label: 'Reasoning',    color: 'bg-purple-500/15 text-purple-400' },
  context:   { label: 'Long Context', color: 'bg-blue-500/15 text-blue-400' },
};

const FEATURE_METADATA: Record<string, FeatureMeta> = {
  'agentic-chat':               { priority: 'quality',   rationale: 'Real-time chat — DeepSeek provides reliable quality and consistent response speed',                    recommendedProvider: 'deepseek',   recommendedModel: 'deepseek-chat' },
  'wise-ai-chat':               { priority: 'quality',   rationale: 'AI Studio chat — shares routing with agentic-chat, DeepSeek-first',                                   recommendedProvider: 'deepseek',   recommendedModel: 'deepseek-chat' },
  'editor-ai':                  { priority: 'quality',   rationale: 'Inline rewrites — DeepSeek produces consistent, high-fidelity short-text edits',                      recommendedProvider: 'deepseek',   recommendedModel: 'deepseek-chat' },
  'detect-and-humanize':        { priority: 'quality',   rationale: 'Nuanced rewrite task — DeepSeek avoids over-mechanical output',                                       recommendedProvider: 'deepseek',   recommendedModel: 'deepseek-chat' },
  'suggest-template':           { priority: 'quality',   rationale: 'Structured output classifier — DeepSeek returns reliable JSON',                                       recommendedProvider: 'deepseek',   recommendedModel: 'deepseek-chat' },
  'smart-fit-rewrite':          { priority: 'quality',   rationale: 'Per-bullet keyword alignment — DeepSeek preserves meaning while rewriting accurately',                recommendedProvider: 'deepseek',   recommendedModel: 'deepseek-chat' },
  'career-assessment':          { priority: 'reasoning', rationale: 'Skills-gap analysis requires deep reasoning — DeepSeek excels at structured assessments',             recommendedProvider: 'deepseek',   recommendedModel: 'deepseek-chat' },
  'generate-resignation-letter':{ priority: 'quality',   rationale: 'Professional writing — DeepSeek produces polished, tone-appropriate output',                          recommendedProvider: 'deepseek',   recommendedModel: 'deepseek-chat' },
  'validate-tailor':            { priority: 'reasoning', rationale: 'Gap identification requires reasoning over structured data — DeepSeek handles this reliably',         recommendedProvider: 'deepseek',   recommendedModel: 'deepseek-chat' },
  'resume-section-ai':          { priority: 'latency',   rationale: 'Routed via resume-section-ai function (not ai-gateway) — Groq-first pool is intentional for speed',  recommendedProvider: 'groq',       recommendedModel: 'llama-3.3-70b-versatile' },
  'analyze-resume':             { priority: 'reasoning', rationale: 'Deep structured analysis — DeepSeek produces accurate JSON reports with high reliability',            recommendedProvider: 'deepseek',   recommendedModel: 'deepseek-chat' },
  'generate-fix-suggestions':   { priority: 'reasoning', rationale: 'Logical gap identification from ATS results — DeepSeek reasoning is well-suited',                    recommendedProvider: 'deepseek',   recommendedModel: 'deepseek-chat' },
  'recruiter-simulation':       { priority: 'quality',   rationale: 'Persona simulation and nuanced feedback — DeepSeek produces natural, realistic responses',            recommendedProvider: 'deepseek',   recommendedModel: 'deepseek-chat' },
  'tailor-resume':              { priority: 'quality',   rationale: 'High-stakes full-resume rewrite — DeepSeek delivers stable, structured JSON output',                  recommendedProvider: 'deepseek',   recommendedModel: 'deepseek-chat' },
  'generate-cover-letter':      { priority: 'quality',   rationale: 'Professional creative writing — DeepSeek balances quality and reliability',                           recommendedProvider: 'deepseek',   recommendedModel: 'deepseek-chat' },
  'generate-portfolio-bio':     { priority: 'quality',   rationale: 'Public-facing copy — DeepSeek produces polished, coherent professional bios',                        recommendedProvider: 'deepseek',   recommendedModel: 'deepseek-chat' },
  'optimize-for-linkedin':      { priority: 'quality',   rationale: 'Tone-sensitive rewrite with structured output — DeepSeek handles JSON + prose reliably',             recommendedProvider: 'deepseek',   recommendedModel: 'deepseek-chat' },
  'parse-resume':               { priority: 'context',   rationale: 'Full resume text parsing into JSON — DeepSeek handles varied formats and lengths reliably',           recommendedProvider: 'deepseek',   recommendedModel: 'deepseek-chat' },
  'parse-job':                  { priority: 'context',   rationale: 'Job posting extraction — DeepSeek parses structured requirements consistently across formats',        recommendedProvider: 'deepseek',   recommendedModel: 'deepseek-chat' },
  'generate-question-bank':     { priority: 'reasoning', rationale: 'Multi-category Q&A generation with enforced schema — DeepSeek JSON output is reliable',              recommendedProvider: 'deepseek',   recommendedModel: 'deepseek-chat' },
  'company-briefing':           { priority: 'context',   rationale: 'Research synthesis with structured output — DeepSeek handles long-form JSON generation reliably',    recommendedProvider: 'deepseek',   recommendedModel: 'deepseek-chat' },
  'ask-portfolio':              { priority: 'quality',   rationale: 'Portfolio Q&A for public visitors — DeepSeek stays accurate and responsive',                         recommendedProvider: 'deepseek',   recommendedModel: 'deepseek-chat' },
};

// ─── Component ────────────────────────────────────────────────────────────────

interface GatewayAdminTestResponse {
  status?: string;
  adminTest?: boolean;
  feature?: string;
  provider?: string;
  model?: string;
  slot?: number;
  preview?: string;
  meta?: {
    feature?: string;
    provider?: string;
    model?: string;
    slot?: number;
    latencyMs?: number;
    fallback?: boolean;
    adminTest?: boolean;
  };
  data?: {
    providerUsed?: string;
    modelUsed?: string;
    content?: string;
    answer?: string;
  };
  message?: string;
  error?: string | Record<string, unknown>;
}

function stringifyDevKitError(value: unknown): string {
  if (!value) return 'Unknown error';
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.message;
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.message === 'string') return obj.message;
    if (typeof obj.error === 'string') return obj.error;
    if (typeof obj.status === 'number') return `Request failed with status ${obj.status}`;
    try { return JSON.stringify(obj).slice(0, 500); } catch {}
  }
  return String(value);
}

function getDevKitErrorDetails(errorObj: any): string | undefined {
  if (!errorObj || typeof errorObj !== 'object') return undefined;
  const parts: string[] = [];
  if (errorObj.status) parts.push(`HTTP ${errorObj.status}`);
  if (errorObj.code) parts.push(`Code: ${errorObj.code}`);

  const raw = errorObj.raw;
  if (raw && typeof raw === 'object') {
    if (raw.message) parts.push(`Msg: ${raw.message}`);
    else if (raw.error) parts.push(`Err: ${raw.error}`);
    else if (raw.responseBody) parts.push(`Body: ${String(raw.responseBody).slice(0, 200)}`);
  }
  return parts.length > 0 ? parts.join(' | ') : undefined;
}

interface ProviderPing {
  provider: string;
  ok: boolean;
  latencyMs: number | null;
  httpStatus: number;
  configured: boolean;
}

interface LiveRouteEntry {
  provider: string | null;
  model: string | null;
  source: 'default' | 'override' | 'pool';
  creditCost: number;
}

export const AIRoutingSwitcher = () => {
  const [routes, setRoutes] = useState<Record<string, RouteState>>({});
  // Tracks $ids of ai_routing_config documents that have been reset locally
  // but not yet deleted from the database. saveAll drains this list.
  const [pendingDeletes, setPendingDeletes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState<Partial<Record<FeatureCategory, boolean>>>({});
  const [pings, setPings] = useState<Record<string, ProviderPing>>({});
  const [pinging, setPinging] = useState(false);
  const [liveRoutes, setLiveRoutes] = useState<Record<string, LiveRouteEntry> | null>(null);
  const [probingRoutes, setProbingRoutes] = useState(false);
  const [routeTestResults, setRouteTestResults] = useState<Record<string, { status: 'running' | 'ok' | 'error'; provider?: string; model?: string; preview?: string; error?: string; errorDetails?: string }>>({});

  const initialRoutesRef = useRef<Record<string, RouteState>>({});

  const hasUnsavedChanges = useMemo(() => {
    const currentKeys = Object.keys(routes);
    const initialKeys = Object.keys(initialRoutesRef.current);
    if (currentKeys.length !== initialKeys.length) return true;

    for (const key of currentKeys) {
      const current = routes[key];
      const initial = initialRoutesRef.current[key];
      if (!initial) return true;
      if (current.provider !== initial.provider) return true;
      if (current.model !== initial.model) return true;
      if (current.key_slot !== initial.key_slot) return true;
    }
    return false;
  }, [routes]);

  const fetchRoutes = async () => {
    setLoading(true);
    setLoadError(null);
    // Discard any unsaved local intent (provider toggles, pending deletes)
    // so the UI reflects the actual database state after a refresh.
    setPendingDeletes([]);
    try {
      const tuple = await appwriteFunctions.invoke('admin-devkit-data', {
        headers: devKitAuthHeaders(),
        body: { action: 'list-routing-config' },
      });
      const result = tryUnwrapAdminResponse<{ configs: Array<{ $id: string; feature_id: string; provider: string; model: string }> }>(tuple, 'admin-devkit-data');
      const configMap: Record<string, RouteState> = {};
      for (const doc of (result?.configs ?? [])) {
        const [providerName, slotStr] = (doc.provider || '').split(':');
        configMap[doc.feature_id] = {
          $id: doc.$id,
          feature_id: doc.feature_id,
          provider: providerName,
          model: doc.model,
          key_slot: slotStr ? Number(slotStr) : 1,
        };
      }
      setRoutes(configMap);
      initialRoutesRef.current = configMap;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load AI routing config';
      console.error('Failed to fetch AI routes:', err);
      setLoadError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchRoutes(); }, []);

  const handleUpdateRoute = (featureId: string, provider: ProviderId) => {
    const providerDef = PROVIDERS.find(p => p.id === provider);
    const models = getCuratedModels(provider as AITestProvider);
    // Pick the first curated model if available; otherwise fall back to the provider default.
    const model = models.length > 0 ? models[0].value : (providerDef?.defaultModel ?? '');
    setRoutes(prev => ({
      ...prev,
      [featureId]: { ...prev[featureId], provider, model, key_slot: 1, feature_id: featureId },
    }));
  };

  const handleUpdateModel = (featureId: string, model: string) => {
    setRoutes(prev => {
      const existing = prev[featureId];
      if (!existing) return prev;
      return { ...prev, [featureId]: { ...existing, model } };
    });
  };

  const handleUpdateKeySlot = (featureId: string, keySlot: number) => {
    setRoutes(prev => {
      const existing = prev[featureId];
      if (!existing) return prev;
      return { ...prev, [featureId]: { ...existing, key_slot: keySlot } };
    });
  };

  const clearOverride = (featureId: string) => {
    setRoutes(prev => {
      const existing = prev[featureId];
      // If this override has already been persisted to the DB, queue the
      // document for deletion so saveAll can remove it from ai_routing_config.
      if (existing?.$id) {
        setPendingDeletes(ids => ids.includes(existing.$id!) ? ids : [...ids, existing.$id!]);
      }
      const next = { ...prev };
      delete next[featureId];
      return next;
    });
  };

  const pingProviders = useCallback(async () => {
    setPinging(true);
    try {
      const tuple = await appwriteFunctions.invoke('admin-devkit-data', {
        headers: devKitAuthHeaders(),
        body: { action: 'ping-providers' },
      });
      const result = tryUnwrapAdminResponse<{ pings: ProviderPing[] }>(tuple, 'admin-devkit-data');
      if (result?.pings) {
        const map: Record<string, ProviderPing> = {};
        for (const p of result.pings) map[p.provider] = p;
        setPings(map);
      }
    } catch {
      toast.error('Provider ping failed');
    } finally {
      setPinging(false);
    }
  }, []);

  const probeRoutes = useCallback(async () => {
    setProbingRoutes(true);
    try {
      const tuple = await appwriteFunctions.invoke('admin-devkit-data', {
        headers: devKitAuthHeaders(),
        body: { action: 'list-routes' },
      });
      const result = tryUnwrapAdminResponse<{
        routes: Record<string, LiveRouteEntry>;
        overrideCount: number;
      }>(tuple, 'admin-devkit-data');
      if (result?.routes) {
        setLiveRoutes(result.routes);
        toast.success(`Live route table loaded — ${result.overrideCount} override${result.overrideCount !== 1 ? 's' : ''} active`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Route probe failed';
      toast.error('Route probe failed: ' + msg);
    } finally {
      setProbingRoutes(false);
    }
  }, []);

  const saveAll = async () => {
    setSaving(true);
    try {
      const toSave = Object.entries(routes);
      // Upsert active overrides
      await Promise.all(toSave.map(async ([featureId, config]) => {
        if (config.$id) {
          await appwriteFunctions.invoke('admin-devkit-data', {
            headers: devKitAuthHeaders(),
            body: { action: 'update-routing-config', docId: config.$id, provider: config.provider, model: config.model, keySlot: config.key_slot },
          });
        } else {
          await appwriteFunctions.invoke('admin-devkit-data', {
            headers: devKitAuthHeaders(),
            body: { action: 'create-routing-config', featureId, provider: config.provider, model: config.model, keySlot: config.key_slot },
          });
        }
      }));
      // Delete overrides that were reset since the last fetch
      if (pendingDeletes.length > 0) {
        await Promise.all(pendingDeletes.map(docId =>
          appwriteFunctions.invoke('admin-devkit-data', {
            headers: devKitAuthHeaders(),
            body: { action: 'delete-routing-config', docId },
          }),
        ));
        setPendingDeletes([]);
      }
      toast.success('AI routing saved — changes apply on next gateway invocation.');
      void fetchRoutes();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error('Failed to save routes: ' + msg);
    } finally {
      setSaving(false);
    }
  };

  const [applyingSmartDefaults, setApplyingSmartDefaults] = useState(false);

  const applySmartDefaults = async () => {
    setApplyingSmartDefaults(true);
    try {
      let updated = 0;
      await Promise.all(
        Object.entries(FEATURE_METADATA).map(async ([featureId, meta]) => {
          const existing = routes[featureId];
          if (existing?.$id) {
            await appwriteFunctions.invoke('admin-devkit-data', {
              headers: devKitAuthHeaders(),
              body: { action: 'update-routing-config', docId: existing.$id, provider: meta.recommendedProvider, model: meta.recommendedModel },
            });
          } else {
            await appwriteFunctions.invoke('admin-devkit-data', {
              headers: devKitAuthHeaders(),
              body: { action: 'create-routing-config', featureId, provider: meta.recommendedProvider, model: meta.recommendedModel },
            });
          }
          updated++;
        })
      );
      toast.success(`Smart defaults applied — ${updated} features updated`);
      void fetchRoutes();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error('Failed to apply smart defaults: ' + msg);
    } finally {
      setApplyingSmartDefaults(false);
    }
  };

  const toggleCategory = (cat: FeatureCategory) => {
    setCollapsed(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const testRoute = useCallback(async (featureId: string) => {
    setRouteTestResults(prev => ({ ...prev, [featureId]: { status: 'running' } }));
    try {
      // 1. Issue a short-lived nonce from admin-devkit-data
      const nonceTuple = await appwriteFunctions.invoke('admin-devkit-data', {
        headers: devKitAuthHeaders(),
        body: { action: 'issue-test-nonce', featureId },
      });
      const nonceResult = tryUnwrapAdminResponse<{ nonce: string }>(nonceTuple, 'admin-devkit-data');
      if (!nonceResult?.nonce) throw new Error('Failed to obtain test nonce');

      // 2. Get the admin's Appwrite JWT for gateway auth
      const jwtToken = await account.createJWT();
      const jwt = jwtToken.jwt;

      // 3. Call ai-gateway with the nonce (no credit deduction, 80-token cap)
      const gwTuple = await appwriteFunctions.invoke<GatewayAdminTestResponse>('ai-gateway', {
        headers: { 'X-Appwrite-JWT': jwt },
        body: {
          featureName: featureId,
          feature: featureId,
          message: 'Admin route test. Reply with exactly: ROUTE_OK',
          __admin_test_nonce: nonceResult.nonce,
        },
      });

      if (gwTuple.error) {
        setRouteTestResults(prev => ({
          ...prev,
          [featureId]: {
            status: 'error',
            error: stringifyDevKitError(gwTuple.error),
            errorDetails: getDevKitErrorDetails(gwTuple.error),
          },
        }));
        return;
      }

      const gwData = gwTuple.data;
      const isSuccess =
        gwData?.status === 'ok' ||
        gwData?.status === 'success' ||
        gwData?.adminTest === true;

      if (isSuccess) {
        const provider =
          gwData?.meta?.provider ||
          gwData?.data?.providerUsed ||
          gwData?.provider ||
          '';
        const model =
          gwData?.meta?.model ||
          gwData?.data?.modelUsed ||
          gwData?.model ||
          '';
        const previewContent =
          gwData?.preview ||
          gwData?.data?.content ||
          gwData?.data?.answer ||
          '';
        setRouteTestResults(prev => ({
          ...prev,
          [featureId]: {
            status: 'ok',
            provider,
            model,
            preview: String(previewContent).slice(0, 300),
          },
        }));
      } else {
        const errMsg = stringifyDevKitError(gwData?.message || gwData?.error || 'Unknown gateway error');
        setRouteTestResults(prev => ({
          ...prev,
          [featureId]: {
            status: 'error',
            error: errMsg,
            errorDetails: getDevKitErrorDetails(gwData),
          },
        }));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Test failed';
      setRouteTestResults(prev => ({ ...prev, [featureId]: { status: 'error', error: msg } }));
    }
  }, []);

  if (loading) {
    return <div className="py-20 text-center animate-pulse text-muted-foreground font-mono">Fetching AI Global Config…</div>;
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-6 space-y-3">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="text-sm font-medium">Failed to load AI routing config</span>
        </div>
        <p className="text-xs text-muted-foreground">{loadError}</p>
        <button
          onClick={() => void fetchRoutes()}
          className="flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      </div>
    );
  }

  const totalOverrides = Object.keys(routes).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20">
            <BrainCircuit className="text-purple-400" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">AI Routing (AI Tools Map)</h2>
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono">
              Provider / Model / Key Slot overrides · {FEATURES.length} tools across {Object.keys(CATEGORY_META).length} app areas · {totalOverrides} active override{totalOverrides !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Sticky Action Bar */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-md z-30 py-4 border-b border-white/5 -mx-6 px-6 flex items-center justify-between flex-wrap gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {hasUnsavedChanges && (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-400 text-[10px] font-black uppercase tracking-wider animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              Unsaved changes
            </span>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {PROVIDERS.map(p => {
              const ping = pings[p.id];
              const dot = !ping
                ? 'bg-white/20'
                : !ping.configured
                  ? 'bg-white/10'
                  : ping.ok
                    ? 'bg-emerald-400'
                    : 'bg-red-400';
              return (
                <span key={p.id} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className={`w-2 h-2 rounded-full ${dot}`} />
                  {p.label}
                  {ping?.ok && ping.latencyMs !== null && (
                    <span className="text-emerald-400/70">{ping.latencyMs}ms</span>
                  )}
                </span>
              );
            })}
          </div>
          <Button
            onClick={pingProviders}
            variant="ghost"
            size="sm"
            disabled={pinging}
            className="h-9 px-3 text-xs text-muted-foreground hover:text-white"
          >
            <Wifi size={14} className={cn('mr-1.5', pinging && 'animate-pulse')} />
            {pinging ? 'Pinging…' : 'Ping'}
          </Button>
          <Button
            onClick={fetchRoutes}
            variant="ghost"
            size="sm"
            className="h-9 px-3 text-xs text-muted-foreground hover:text-white"
          >
            <RefreshCw size={14} className="mr-1.5" /> Refresh
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={probeRoutes}
                variant="ghost"
                size="sm"
                disabled={probingRoutes}
                className={cn(
                  'h-9 px-3 text-xs hover:text-white',
                  liveRoutes ? 'text-emerald-400 hover:text-emerald-300' : 'text-muted-foreground',
                )}
              >
                <Link2 size={14} className={cn('mr-1.5', probingRoutes && 'animate-pulse')} />
                {probingRoutes ? 'Probing…' : liveRoutes ? 'Live ✓' : 'Probe Routes'}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs">
              Fetches the live effective route table from admin-devkit-data — static gateway defaults merged with any active DB overrides. No API keys are returned.
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={applySmartDefaults}
                disabled={applyingSmartDefaults || saving}
                variant="outline"
                className="rounded-2xl h-11 px-5 font-bold border-amber-500/40 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
              >
                {applyingSmartDefaults
                  ? <MiniSpinner size={16} className="mr-2" />
                  : <Sparkles className="mr-2" size={16} />}
                Smart Defaults
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs">
              Applies the recommended provider + model for every feature based on its fit: latency-critical features → Groq, reasoning → DeepSeek, quality → NVIDIA, long context → OpenRouter.
            </TooltipContent>
          </Tooltip>
          <Button
            onClick={saveAll}
            disabled={saving || !hasUnsavedChanges}
            className={cn(
              "rounded-2xl h-11 px-7 font-bold transition-all shadow-lg",
              hasUnsavedChanges && !saving
                ? "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/20 ring-2 ring-purple-500/40"
                : "bg-white/5 border border-white/10 text-muted-foreground cursor-not-allowed shadow-none"
            )}
          >
            {saving ? <MiniSpinner size={16} className="mr-2" /> : <Save className="mr-2" size={16} />}
            Save All
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 px-1 text-[10px] text-muted-foreground/70 font-mono uppercase tracking-wider">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500/60" /> Admin override (saved)</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-white/20" /> Gateway default (hardcoded)</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-white/5 border border-white/15" /> No dedicated route (uses pool)</span>
        {liveRoutes && (
          <span className="flex items-center gap-1.5 text-emerald-400/70"><span className="w-2 h-2 rounded-full bg-emerald-400/60" /> Live probe active</span>
        )}
      </div>

      {/* Feature groups */}
      {CATEGORY_ORDER.map(cat => {
        const meta = CATEGORY_META[cat];
        const features = FEATURES.filter(f => f.category === cat);
        const isCollapsed = collapsed[cat] ?? false;
        const overrideCount = features.filter(f => routes[f.id]).length;

        return (
          <div key={cat} className="space-y-3">
            <button
              onClick={() => toggleCategory(cat)}
              className={cn(
                'w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-all',
                meta.bg,
              )}
            >
              <div className="flex items-center gap-2.5">
                <meta.Icon className={cn('shrink-0', meta.color)} size={16} />
                <span className={cn('font-black text-sm', meta.color)}>{meta.label}</span>
                <span className="text-[10px] text-muted-foreground/60 font-mono">{features.length} features</span>
                {overrideCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-400 text-[9px] font-black uppercase">
                    {overrideCount} overridden
                  </span>
                )}
              </div>
              {isCollapsed ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronUp size={14} className="text-muted-foreground" />}
            </button>

            {!isCollapsed && (
              <div className="grid grid-cols-1 gap-3 pl-0">
                {features.map(feature => {
                  const override = routes[feature.id];
                  const activeProvider = (override?.provider ?? feature.gatewayDefault?.provider ?? null) as ProviderId | null;
                  const activeModel   = override?.model ?? feature.gatewayDefault?.model ?? null;
                  const hasOverride   = Boolean(override);
                  const noRoute       = !feature.gatewayDefault;

                  return (
                    <div
                      key={feature.id}
                      className={cn(
                        'p-5 rounded-2xl border transition-all',
                        hasOverride
                          ? 'bg-purple-500/5 border-purple-500/30'
                          : noRoute
                          ? 'bg-white/[0.02] border-white/[0.06]'
                          : 'bg-card border-border hover:border-white/20',
                      )}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        {/* Left: identity */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-white text-sm leading-tight">{feature.label}</p>
                            {/* Credit cost badge */}
                            <span className={cn(
                              'px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider',
                              feature.creditCost === 0
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : feature.creditCost === 1
                                  ? 'bg-sky-500/15 text-sky-400'
                                  : 'bg-amber-500/15 text-amber-400',
                            )}>
                              {feature.creditCost === 0 ? 'Free' : `${feature.creditCost}cr`}
                            </span>
                            {hasOverride && (
                              <span className="px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-400 text-[9px] font-black uppercase tracking-wider">
                                overridden
                              </span>
                            )}
                            {noRoute && (
                              <span className="px-1.5 py-0.5 rounded-md bg-white/5 text-muted-foreground/50 text-[9px] font-mono">
                                pool fallback
                              </span>
                            )}
                            {feature.sharedRouteWith && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 text-[9px] font-mono cursor-help">
                                    <Link2 size={8} />
                                    shared route
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[240px] text-xs">
                                  Shares default routing with <span className="font-mono text-white">{feature.sharedRouteWith}</span>. Override each independently if needed — do not split into separate gateway features.
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {/* Live probe source indicator */}
                            {liveRoutes?.[feature.id] && (
                              <span className={cn(
                                'px-1.5 py-0.5 rounded-md text-[9px] font-mono',
                                liveRoutes[feature.id].source === 'override'
                                  ? 'bg-purple-500/20 text-purple-400'
                                  : liveRoutes[feature.id].source === 'pool'
                                    ? 'bg-white/5 text-muted-foreground/50'
                                    : 'bg-emerald-500/10 text-emerald-400/70',
                              )}>
                                live:{liveRoutes[feature.id].source}
                              </span>
                            )}
                            {FEATURE_METADATA[feature.id] && (() => {
                              const meta = FEATURE_METADATA[feature.id];
                              const badge = PRIORITY_BADGE[meta.priority];
                              return (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider cursor-help ${badge.color}`}>
                                      {badge.label}
                                      <Info size={8} />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-[220px] text-xs">
                                    <p className="font-semibold mb-0.5">Why this routing?</p>
                                    <p>{meta.rationale}</p>
                                    <p className="mt-1 text-muted-foreground">
                                      Recommended: <span className="text-white font-mono">{meta.recommendedProvider}</span> / <span className="text-white font-mono truncate">{meta.recommendedModel}</span>
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })()}
                          </div>
                          <p className="text-[10px] font-mono text-purple-400/70">{feature.id}</p>
                          <p className="text-[11px] text-muted-foreground/70 leading-snug">{feature.description}</p>

                          {/* Active model chip */}
                          {activeModel && (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <span className="text-[9px] text-muted-foreground/50 uppercase font-mono tracking-wider">
                                {hasOverride ? 'override' : 'default'}:
                              </span>
                              <span className={cn(
                                'text-[9px] font-mono truncate max-w-[260px]',
                                hasOverride ? 'text-purple-300' : 'text-muted-foreground/60',
                              )}>
                                {activeProvider && (
                                  <span className={cn('mr-1 font-black', PROVIDER_COLOR[activeProvider])}>
                                    [{activeProvider}]
                                  </span>
                                )}
                                {activeModel}
                              </span>
                            </div>
                          )}
                          {/* Live probe route — shows actual effective route when probe has run */}
                          {liveRoutes?.[feature.id]?.model && liveRoutes[feature.id].model !== activeModel && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] text-emerald-400/50 uppercase font-mono tracking-wider">live:</span>
                              <span className="text-[9px] font-mono truncate max-w-[260px] text-emerald-300/70">
                                {liveRoutes[feature.id].provider && (
                                  <span className={cn('mr-1 font-black', PROVIDER_COLOR[liveRoutes[feature.id].provider as ProviderId] ?? 'text-white')}>
                                    [{liveRoutes[feature.id].provider}]
                                  </span>
                                )}
                                {liveRoutes[feature.id].model}
                              </span>
                            </div>
                          )}

                          {/* Live probe route fallback warning */}
                          {liveRoutes?.[feature.id] && activeProvider && (
                            (() => {
                              const live = liveRoutes[feature.id];
                              const isMismatched = live.provider !== activeProvider || live.model !== activeModel;
                              if (isMismatched) {
                                return (
                                  <div className="flex items-center gap-1.5 mt-1 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[9px] font-mono">
                                    <AlertTriangle size={10} className="shrink-0" />
                                    <span>Gateway Fallback Active: [{live.provider}] {live.model} (Configured: [{activeProvider}])</span>
                                  </div>
                                );
                              }
                              return null;
                            })()
                          )}

                          {/* Gateway default chip (only shown when there's an override so both are visible) */}
                          {hasOverride && feature.gatewayDefault && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] text-muted-foreground/40 uppercase font-mono tracking-wider">gateway:</span>
                              <span className="text-[9px] font-mono text-muted-foreground/40 truncate max-w-[260px]">
                                <span className={cn('mr-1 font-black', PROVIDER_COLOR[feature.gatewayDefault.provider])}>
                                  [{feature.gatewayDefault.provider}]
                                </span>
                                {feature.gatewayDefault.model}
                              </span>
                            </div>
                          )}

                          {/* Route test result */}
                          {(() => {
                            const testResult = routeTestResults[feature.id];
                            if (!testResult) return null;
                            if (testResult.status === 'running') {
                              return (
                                <div className="flex items-center gap-1.5 mt-1">
                                  <MiniSpinner size={10} />
                                  <span className="text-[9px] text-muted-foreground/60 font-mono">Testing route…</span>
                                </div>
                              );
                            }
                            if (testResult.status === 'error') {
                              return (
                                <div className="mt-1 px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20 max-w-full lg:max-w-[280px]">
                                  <p className="text-[9px] text-red-400 font-mono leading-snug">
                                    {String(testResult.error || 'Unknown error')}
                                  </p>
                                  {testResult.errorDetails && (
                                    <p className="text-[8px] text-red-400/60 font-mono leading-snug mt-0.5 border-t border-red-500/10 pt-0.5 break-all">
                                      {testResult.errorDetails}
                                    </p>
                                  )}
                                </div>
                              );
                            }
                            return (
                              <div className="mt-1 px-2 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 max-w-full lg:max-w-[280px] space-y-0.5">
                                <p className="text-[9px] text-emerald-400 font-black uppercase tracking-wider">Route OK ✓</p>
                                {testResult.provider && (
                                  <p className="text-[8px] font-mono text-emerald-400/60">
                                    [{testResult.provider}] {testResult.model}
                                  </p>
                                )}
                                {testResult.preview && (
                                  <p className="text-[8px] text-muted-foreground/50 font-mono leading-snug line-clamp-2 break-all">
                                    {testResult.preview.slice(0, 100)}
                                  </p>
                                )}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Right: provider toggle + model picker */}
                        <div className="flex flex-col items-start lg:items-end gap-2 shrink-0 w-full lg:w-auto">
                          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                            <div className="flex flex-wrap bg-white/5 rounded-xl p-0.5 border border-white/10">
                              {PROVIDERS.map(p => (
                                <button
                                  key={p.id}
                                  onClick={() => handleUpdateRoute(feature.id, p.id)}
                                  className={cn(
                                    'px-3 py-1.5 text-[9px] uppercase font-black rounded-lg transition-all',
                                    activeProvider === p.id
                                      ? 'bg-purple-600 text-white shadow-md'
                                      : 'text-white/30 hover:text-white/70',
                                  )}
                                >
                                  {p.label}
                                </button>
                              ))}
                            </div>

                            {hasOverride && (
                              <button
                                onClick={() => clearOverride(feature.id)}
                                className="text-[9px] text-muted-foreground/50 hover:text-red-400 font-mono uppercase tracking-wider transition-colors px-2"
                                title="Remove override — reverts to gateway default"
                              >
                                reset
                              </button>
                            )}
                            <button
                              onClick={() => void testRoute(feature.id)}
                              disabled={routeTestResults[feature.id]?.status === 'running'}
                              className="text-[9px] text-muted-foreground/50 hover:text-emerald-400 font-mono uppercase tracking-wider transition-colors px-2 disabled:opacity-40"
                              title="Test this route — admin only, no credit deduction"
                            >
                              {routeTestResults[feature.id]?.status === 'running' ? '…' : 'test'}
                            </button>
                          </div>

                          {/* Model picker — shown only when an override provider is selected */}
                          {hasOverride && override.provider && (() => {
                            const models = getCuratedModels(override.provider as AITestProvider);
                            return (
                              <div className="flex flex-wrap items-center gap-2 w-full lg:justify-end">
                                <select
                                  value={override.model}
                                  onChange={e => handleUpdateModel(feature.id, e.target.value)}
                                  className="bg-white/5 border border-white/10 rounded-lg text-[10px] font-mono text-white/80 px-2 py-1.5 lg:max-w-[220px] focus:outline-none focus:border-purple-500/50 transition-colors flex-1 lg:flex-none"
                                >
                                  {models.map(m => (
                                    <option key={m.value} value={m.value} className="bg-zinc-900">
                                      {m.tier === 'free' ? '[FREE] ' : '[PAID] '}{m.label}{m.deprecated ? ' ⚠' : ''}
                                    </option>
                                  ))}
                                  {/* Preserve the current value if it isn't in the curated list */}
                                  {!models.some(m => m.value === override.model) && (
                                    <option value={override.model} className="bg-zinc-900">
                                      [CUSTOM] {override.model}
                                    </option>
                                  )}
                                </select>

                                {/* Key slot selector */}
                                <select
                                  value={override.key_slot ?? 1}
                                  onChange={e => handleUpdateKeySlot(feature.id, Number(e.target.value))}
                                  className="bg-white/5 border border-white/10 rounded-lg text-[10px] font-mono text-white/80 px-2 py-1.5 focus:outline-none focus:border-purple-500/50 transition-colors shrink-0"
                                >
                                  {override.provider === 'deepseek' ? (
                                    <option value={1} className="bg-zinc-900">DeepSeek Key</option>
                                  ) : override.provider === 'groq' ? (
                                    <>
                                      <option value={1} className="bg-zinc-900">Groq Key 1</option>
                                      <option value={2} className="bg-zinc-900">Groq Key 2</option>
                                      <option value={3} className="bg-zinc-900">Groq Key 3</option>
                                    </>
                                  ) : override.provider === 'openrouter' ? (
                                    <>
                                      <option value={1} className="bg-zinc-900">OpenRouter Key 1</option>
                                      <option value={2} className="bg-zinc-900">OpenRouter Key 2</option>
                                      <option value={3} className="bg-zinc-900">OpenRouter Key 3</option>
                                    </>
                                  ) : override.provider === 'nvidia' ? (
                                    <>
                                      <option value={1} className="bg-zinc-900">NVIDIA Key 1</option>
                                      <option value={2} className="bg-zinc-900">NVIDIA Key 2</option>
                                      <option value={3} className="bg-zinc-900">NVIDIA Key 3</option>
                                    </>
                                  ) : (
                                    <option value={1} className="bg-zinc-900">Slot 1</option>
                                  )}
                                </select>

                                {/* Tier badge for the currently selected model */}
                                {(() => {
                                  const found = models.find(m => m.value === override.model);
                                  if (!found) return null;
                                  return (
                                    <span className={cn(
                                      'text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md shrink-0',
                                      found.tier === 'free'
                                        ? 'bg-emerald-500/15 text-emerald-400'
                                        : 'bg-amber-500/15 text-amber-400',
                                    )}>
                                      {found.tier}
                                    </span>
                                  );
                                })()}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Warning footer */}
      <div className="p-5 rounded-3xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-3">
        <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
        <p className="text-xs text-amber-500/80 leading-relaxed">
          <strong>Caution:</strong> Overrides take effect on the next gateway invocation. Ensure the target provider
          has active API keys set in Appwrite Function Variables before switching. Use <em>reset</em> on any row
          to remove the override and revert to the hardcoded gateway default.
        </p>
      </div>
    </div>
  );
};
