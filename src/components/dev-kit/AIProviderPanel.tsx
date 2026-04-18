import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Check, Zap, DollarSign, RefreshCw, Cpu, ChevronDown, Info, AlertTriangle } from 'lucide-react';
import { useSettingsStore } from '@/store/settingsStore';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────

type ProviderTab = 'openrouter' | 'groq' | 'gemini' | 'ollama';

interface ORModel {
  id: string;
  name: string;
  pricing: { prompt: string; completion: string };
  context_length: number;
  description?: string;
  isFree: boolean;
}

interface GroqModel {
  id: string;
  owned_by: string;
  context_window?: number;
}

interface OllamaModel {
  name: string;
  size?: number;
}

interface ORCredits {
  label: string;
  usage: number;
  limit: number | null;
  is_free_tier: boolean;
  rate_limit: { requests: number; interval: string } | null;
}

// ── Static model lists ─────────────────────────────────────────────────────────

const GEMINI_MODELS = [
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', context: 1_000_000 },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', context: 1_000_000 },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', context: 1_000_000 },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', context: 2_000_000 },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', context: 1_000_000 },
  { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro', context: 32_768 },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatCtx(n?: number) {
  if (!n) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M ctx`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K ctx`;
  return `${n} ctx`;
}

function FreeBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
      <Zap className="w-2.5 h-2.5" />
      Free
    </span>
  );
}

function PaidBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
      <DollarSign className="w-2.5 h-2.5" />
      Paid
    </span>
  );
}

// ── Sub-panels ─────────────────────────────────────────────────────────────────

// OpenRouter ───────────────────────────────────────────────────────────────────
function OpenRouterPanel() {
  const { openrouterModel, openrouterApiKey, openrouterKeyValidated, setOpenrouterModel } = useSettingsStore();

  const [models, setModels] = useState<ORModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [credits, setCredits] = useState<ORCredits | null>(null);
  const [creditsLoading, setCreditsLoading] = useState(false);
  const hasFetched = useRef(false);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('https://openrouter.ai/api/v1/models');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const list: ORModel[] = (json.data ?? []).map((m: any) => ({
        id: m.id,
        name: m.name ?? m.id,
        pricing: m.pricing ?? { prompt: '1', completion: '1' },
        context_length: m.context_length ?? 0,
        description: m.description,
        isFree: m.pricing?.prompt === '0' && m.pricing?.completion === '0',
      }));
      list.sort((a, b) => {
        if (a.isFree !== b.isFree) return a.isFree ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      setModels(list);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load models');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCredits = useCallback(async () => {
    if (!openrouterApiKey) return;
    setCreditsLoading(true);
    try {
      const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: { Authorization: `Bearer ${openrouterApiKey}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      setCredits(json.data ?? null);
    } catch {
    } finally {
      setCreditsLoading(false);
    }
  }, [openrouterApiKey]);

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchModels();
      fetchCredits();
    }
  }, [fetchModels, fetchCredits]);

  const filtered = models.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.id.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || (filter === 'free' ? m.isFree : !m.isFree);
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-4">
      {/* Credits bar */}
      {openrouterApiKey && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-foreground">Credits remaining</p>
            {creditsLoading ? (
              <p className="text-xs text-muted-foreground">Loading…</p>
            ) : credits ? (
              <p className="text-xs text-muted-foreground">
                {credits.limit !== null
                  ? `$${((credits.limit - credits.usage)).toFixed(4)} / $${credits.limit.toFixed(4)}`
                  : `$${credits.usage.toFixed(4)} used`}
                {credits.is_free_tier && <span className="ml-2 text-green-600 dark:text-green-400">· Free tier</span>}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Unable to fetch</p>
            )}
          </div>
          <button onClick={() => fetchCredits()} className="p-1.5 rounded hover:bg-muted transition-colors">
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      )}
      {!openrouterApiKey && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <p className="text-xs">No OpenRouter key configured. Models shown are public. Add a key in AI Settings to switch to BYOK.</p>
        </div>
      )}

      {/* Current model */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Active model</p>
          <p className="text-sm font-mono font-medium text-foreground truncate max-w-[260px]">
            {openrouterModel || <span className="text-muted-foreground italic">none selected</span>}
          </p>
        </div>
        <button
          onClick={() => { hasFetched.current = false; fetchModels(); }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border border-border hover:bg-muted transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>

      {/* Search + filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search models…"
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex rounded-md border border-border overflow-hidden text-xs">
          {(['all', 'free', 'paid'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-2.5 py-1.5 capitalize transition-colors',
                filter === f ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted text-muted-foreground'
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Model list */}
      {loading && (
        <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
          <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading models…
        </div>
      )}
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
          {error}
        </div>
      )}
      {!loading && !error && (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="max-h-80 overflow-y-auto divide-y divide-border">
            {filtered.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">No models match your search.</div>
            )}
            {filtered.map(m => {
              const isActive = openrouterModel === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => { setOpenrouterModel(m.id); }}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors',
                    isActive ? 'bg-primary/8' : 'hover:bg-muted/50'
                  )}
                >
                  <div className="min-w-0 flex-1 mr-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={cn('text-sm font-medium truncate', isActive && 'text-primary')}>
                        {m.name}
                      </span>
                      {m.isFree ? <FreeBadge /> : <PaidBadge />}
                    </div>
                    <p className="text-[11px] text-muted-foreground font-mono mt-0.5 truncate">{m.id}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {formatCtx(m.context_length) && (
                      <span className="text-[10px] text-muted-foreground">{formatCtx(m.context_length)}</span>
                    )}
                    {isActive && <Check className="w-3.5 h-3.5 text-primary" />}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="px-3 py-2 bg-muted/30 border-t border-border text-[11px] text-muted-foreground">
            {filtered.length} of {models.length} models
          </div>
        </div>
      )}
    </div>
  );
}

// Groq ─────────────────────────────────────────────────────────────────────────
const GROQ_CONTEXT: Record<string, number> = {
  'llama-3.3-70b-versatile': 128_000,
  'llama-3.1-8b-instant': 128_000,
  'llama3-8b-8192': 8_192,
  'llama3-70b-8192': 8_192,
  'mixtral-8x7b-32768': 32_768,
  'gemma2-9b-it': 8_192,
  'qwen/qwen3-32b': 32_768,
  'deepseek-r1-distill-llama-70b': 128_000,
  'meta-llama/llama-4-scout-17b-16e-instruct': 131_072,
  'meta-llama/llama-4-maverick-17b-128e-instruct': 131_072,
};

function GroqPanel() {
  const { groqModel, groqApiKey, groqKeyValidated, setGroqModel } = useSettingsStore();
  const [models, setModels] = useState<GroqModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const hasFetched = useRef(false);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (groqApiKey) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { Authorization: `Bearer ${groqApiKey}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setModels(json.data ?? []);
        return;
      } catch (e: any) {
        setError(e.message ?? 'Failed to load');
      } finally {
        setLoading(false);
      }
    } else {
      // Fallback to known model list
      const fallback: GroqModel[] = Object.keys(GROQ_CONTEXT).map(id => ({
        id,
        owned_by: 'groq',
        context_window: GROQ_CONTEXT[id],
      }));
      setModels(fallback);
      setLoading(false);
    }
  }, [groqApiKey]);

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchModels();
    }
  }, [fetchModels]);

  const filtered = models.filter(m =>
    m.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
        <Zap className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
        <p className="text-xs text-green-700 dark:text-green-300">
          All Groq models are <strong>free</strong> with daily rate limits. No charges apply.
        </p>
      </div>

      {!groqApiKey && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
          <Info className="w-4 h-4 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">Showing known models. Add a Groq key in AI Settings to fetch the live list.</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Active model</p>
          <p className="text-sm font-mono font-medium text-foreground truncate max-w-[260px]">
            {groqModel || <span className="text-muted-foreground italic">none selected</span>}
          </p>
        </div>
        <button
          onClick={() => { hasFetched.current = false; fetchModels(); }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border border-border hover:bg-muted transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search models…"
          className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
          <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading…
        </div>
      )}
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">{error}</div>
      )}
      {!loading && !error && (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="max-h-80 overflow-y-auto divide-y divide-border">
            {filtered.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">No models match.</div>
            )}
            {filtered.map(m => {
              const isActive = groqModel === m.id;
              const ctx = m.context_window ?? GROQ_CONTEXT[m.id];
              return (
                <button
                  key={m.id}
                  onClick={() => setGroqModel(m.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors',
                    isActive ? 'bg-primary/8' : 'hover:bg-muted/50'
                  )}
                >
                  <div className="min-w-0 flex-1 mr-3">
                    <div className="flex items-center gap-1.5">
                      <span className={cn('text-sm font-medium font-mono truncate', isActive && 'text-primary')}>{m.id}</span>
                      <FreeBadge />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {ctx && <span className="text-[10px] text-muted-foreground">{formatCtx(ctx)}</span>}
                    {isActive && <Check className="w-3.5 h-3.5 text-primary" />}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="px-3 py-2 bg-muted/30 border-t border-border text-[11px] text-muted-foreground">
            {filtered.length} of {models.length} models
          </div>
        </div>
      )}
    </div>
  );
}

// Gemini ───────────────────────────────────────────────────────────────────────
function GeminiPanel() {
  const { geminiModel, geminiApiKey, geminiKeyValidated, geminiDailyUsage, setGeminiModel } = useSettingsStore();
  const [search, setSearch] = useState('');

  const filtered = GEMINI_MODELS.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.id.toLowerCase().includes(search.toLowerCase())
  );

  const today = new Date().toISOString().slice(0, 10);
  const todayUsage = geminiDailyUsage?.date === today ? geminiDailyUsage.count : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
        <Info className="w-4 h-4 text-blue-500 shrink-0" />
        <p className="text-xs text-blue-700 dark:text-blue-300">
          Gemini models require a valid Gemini API key. Free tier available via Google AI Studio.
        </p>
      </div>

      {geminiApiKey && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
          <div>
            <p className="text-xs font-medium text-foreground">Today's usage</p>
            <p className="text-xs text-muted-foreground">{todayUsage} requests today</p>
          </div>
          <span className={cn(
            'text-xs px-2 py-1 rounded-full border',
            geminiKeyValidated
              ? 'bg-green-500/10 text-green-600 border-green-500/20'
              : 'bg-muted text-muted-foreground border-border'
          )}>
            {geminiKeyValidated ? 'Key validated' : 'Key not validated'}
          </span>
        </div>
      )}
      {!geminiApiKey && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <p className="text-xs">No Gemini key configured. Add one in AI Settings.</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Active model</p>
          <p className="text-sm font-mono font-medium text-foreground">
            {geminiModel || <span className="text-muted-foreground italic">none selected</span>}
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search models…"
          className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="divide-y divide-border">
          {filtered.map(m => {
            const isActive = geminiModel === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setGeminiModel(m.id)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors',
                  isActive ? 'bg-primary/8' : 'hover:bg-muted/50'
                )}
              >
                <div className="min-w-0 flex-1 mr-3">
                  <span className={cn('text-sm font-medium', isActive && 'text-primary')}>{m.name}</span>
                  <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{m.id}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-muted-foreground">{formatCtx(m.context)}</span>
                  {isActive && <Check className="w-3.5 h-3.5 text-primary" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Ollama ───────────────────────────────────────────────────────────────────────
function OllamaPanel() {
  const { ollamaModel, ollamaBaseUrl, ollamaKeyValidated, setOllamaModel } = useSettingsStore();
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const hasFetched = useRef(false);

  const fetchModels = useCallback(async () => {
    const base = ollamaBaseUrl || 'http://localhost:11434';
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${base}/api/tags`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setModels(json.models ?? []);
    } catch (e: any) {
      setError('Cannot reach Ollama. Is it running locally?');
    } finally {
      setLoading(false);
    }
  }, [ollamaBaseUrl]);

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchModels();
    }
  }, [fetchModels]);

  const filtered = models.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
        <Cpu className="w-4 h-4 text-purple-500 shrink-0" />
        <div className="text-xs text-purple-700 dark:text-purple-300">
          <p><strong>Local models</strong> — runs on your machine. No API calls, no charges, no usage limits.</p>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{ollamaBaseUrl || 'http://localhost:11434'}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Active model</p>
          <p className="text-sm font-mono font-medium text-foreground">
            {ollamaModel || <span className="text-muted-foreground italic">none selected</span>}
          </p>
        </div>
        <button
          onClick={() => { hasFetched.current = false; fetchModels(); }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border border-border hover:bg-muted transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search installed models…"
          className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
          <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Connecting to Ollama…
        </div>
      )}
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">{error}</div>
      )}
      {!loading && !error && models.length === 0 && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No models installed. Run <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">ollama pull &lt;model&gt;</code> to add one.
        </div>
      )}
      {!loading && !error && models.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="max-h-80 overflow-y-auto divide-y divide-border">
            {filtered.map(m => {
              const isActive = ollamaModel === m.name;
              return (
                <button
                  key={m.name}
                  onClick={() => setOllamaModel(m.name)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors',
                    isActive ? 'bg-primary/8' : 'hover:bg-muted/50'
                  )}
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-3">
                    <span className={cn('text-sm font-mono font-medium truncate', isActive && 'text-primary')}>{m.name}</span>
                    <FreeBadge />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {m.size && (
                      <span className="text-[10px] text-muted-foreground">{(m.size / 1e9).toFixed(1)} GB</span>
                    )}
                    {isActive && <Check className="w-3.5 h-3.5 text-primary" />}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="px-3 py-2 bg-muted/30 border-t border-border text-[11px] text-muted-foreground">
            {filtered.length} of {models.length} installed models
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Panel ─────────────────────────────────────────────────────────────────

export function AIProviderPanel() {
  const { aiProvider, wiseresumeSubProvider, openrouterKeyValidated, groqKeyValidated, geminiKeyValidated, ollamaKeyValidated } = useSettingsStore();
  const [activeTab, setActiveTab] = useState<ProviderTab>('openrouter');

  const tabs: { id: ProviderTab; label: string; validated: boolean | null }[] = [
    { id: 'openrouter', label: 'OpenRouter', validated: openrouterKeyValidated },
    { id: 'groq', label: 'Groq', validated: groqKeyValidated },
    { id: 'gemini', label: 'Gemini', validated: geminiKeyValidated },
    { id: 'ollama', label: 'Ollama', validated: ollamaKeyValidated },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">AI Provider</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Browse and switch models for each provider. Changes take effect immediately on the next AI request.
        </p>
      </div>

      {/* Provider tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
              activeTab === t.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
            {t.validated && (
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
            )}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div>
        {activeTab === 'openrouter' && <OpenRouterPanel />}
        {activeTab === 'groq' && <GroqPanel />}
        {activeTab === 'gemini' && <GeminiPanel />}
        {activeTab === 'ollama' && <OllamaPanel />}
      </div>
    </div>
  );
}
