import { useState, useEffect, useCallback } from 'react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import {
  BrainCircuit, Save, RefreshCw, AlertTriangle, FileEdit,
  Target, MessageSquare, FileText, Globe, ChevronDown, ChevronUp,
  Wifi, Sparkles, Info,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { getCuratedModels } from '@/lib/devkit/aiTestSlotModels';
import type { AITestProvider } from '@/lib/devkit/aiTestSlotModels';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { devKitAuthHeaders } from '@/lib/devkit/devKitAuth';
import { tryUnwrapAdminResponse } from '@/lib/devkit/edgeResponse';

// ─── Types ────────────────────────────────────────────────────────────────────

type FeatureCategory = 'resume-editor' | 'tailoring' | 'chat' | 'documents' | 'portfolio';
type ProviderId = 'nvidia' | 'groq' | 'deepseek' | 'openrouter';

interface FeatureDef {
  id: string;
  label: string;
  description: string;
  category: FeatureCategory;
  gatewayDefault: { provider: ProviderId; model: string } | null;
}

interface RouteState {
  $id?: string;
  feature_id: string;
  provider: string;
  model: string;
}

// ─── Gateway defaults (mirrors FEATURE_ROUTES in appwrite-hubs/ai-gateway/src/main.js) ──

const GATEWAY_DEFAULTS: Record<string, { provider: ProviderId; model: string }> = {
  'generate-cover-letter':        { provider: 'nvidia',     model: 'nvidia/llama-3.1-nemotron-70b-instruct' },
  'tailor-resume':                { provider: 'nvidia',     model: 'nvidia/llama-3.1-nemotron-70b-instruct' },
  'recruiter-simulation':         { provider: 'nvidia',     model: 'nvidia/llama-3.1-nemotron-70b-instruct' },
  'agentic-chat':                 { provider: 'groq',       model: 'llama-3.3-70b-versatile' },
  'wise-ai-chat':                 { provider: 'groq',       model: 'llama-3.3-70b-versatile' },
  'resume-section-ai':            { provider: 'groq',       model: 'llama-3.3-70b-versatile' },
  'editor-ai':                    { provider: 'groq',       model: 'llama-3.3-70b-versatile' },
  'detect-and-humanize':          { provider: 'groq',       model: 'llama-3.3-70b-versatile' },
  'smart-fit-rewrite':            { provider: 'groq',       model: 'llama-3.3-70b-versatile' },
  'career-assessment':            { provider: 'groq',       model: 'llama-3.3-70b-versatile' },
  'generate-portfolio-bio':       { provider: 'groq',       model: 'llama-3.3-70b-versatile' },
  'generate-resignation-letter':  { provider: 'groq',       model: 'llama-3.3-70b-versatile' },
  'validate-tailor':              { provider: 'groq',       model: 'llama-3.3-70b-versatile' },
  'suggest-template':             { provider: 'groq',       model: 'llama-3.1-8b-instant' },
  'analyze-resume':               { provider: 'deepseek',   model: 'deepseek-chat' },
  'generate-fix-suggestions':     { provider: 'deepseek',   model: 'deepseek-chat' },
  'parse-resume':                 { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free' },
  'parse-job':                    { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free' },
  'optimize-for-linkedin':        { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free' },
  'generate-question-bank':       { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free' },
  'company-briefing':             { provider: 'groq',       model: 'llama-3.3-70b-versatile' },
  'ask-portfolio':                { provider: 'groq',       model: 'llama-3.3-70b-versatile' },
};

// ─── Feature catalogue ────────────────────────────────────────────────────────

const FEATURES: FeatureDef[] = [
  // Resume Editor AI
  {
    id: 'resume-section-ai',
    label: 'Section Enhance',
    description: 'Improve, shorten, ATS-optimize, and rewrite individual resume sections (Summary, Skills, Experience bullets, etc.)',
    category: 'resume-editor',
    gatewayDefault: GATEWAY_DEFAULTS['resume-section-ai'] ?? null,
  },
  {
    id: 'editor-ai',
    label: 'In-Editor Rewrite',
    description: 'Inline grammar, tone, and rewrite adjustments triggered from the rich-text editor toolbar',
    category: 'resume-editor',
    gatewayDefault: GATEWAY_DEFAULTS['editor-ai'] ?? null,
  },
  {
    id: 'generate-fix-suggestions',
    label: 'ATS Fix Suggestions',
    description: 'Generates targeted improvement tips after an ATS score run highlights red-zone sections',
    category: 'resume-editor',
    gatewayDefault: GATEWAY_DEFAULTS['generate-fix-suggestions'] ?? null,
  },
  {
    id: 'detect-and-humanize',
    label: 'Humanize Text',
    description: 'Detects AI-generated phrasing and rewrites it to read naturally and authentically',
    category: 'resume-editor',
    gatewayDefault: GATEWAY_DEFAULTS['detect-and-humanize'] ?? null,
  },
  {
    id: 'suggest-template',
    label: 'Template Suggestions',
    description: 'Recommends the best resume template layout based on the user\'s role and industry',
    category: 'resume-editor',
    gatewayDefault: GATEWAY_DEFAULTS['suggest-template'] ?? null,
  },

  // Tailoring & Job Match
  {
    id: 'tailor-resume',
    label: 'Resume Tailoring',
    description: 'Full resume tailoring pass — rewrites and re-orders content to match a specific job description',
    category: 'tailoring',
    gatewayDefault: GATEWAY_DEFAULTS['tailor-resume'] ?? null,
  },
  {
    id: 'parse-resume',
    label: 'Resume Parsing',
    description: 'Parses raw resume text (paste or upload) into structured JSON for the editor',
    category: 'tailoring',
    gatewayDefault: GATEWAY_DEFAULTS['parse-resume'] ?? null,
  },
  {
    id: 'parse-job',
    label: 'Job Description Parsing',
    description: 'Parses a job posting into structured role requirements used by Tailoring and ATS scoring',
    category: 'tailoring',
    gatewayDefault: GATEWAY_DEFAULTS['parse-job'] ?? null,
  },
  {
    id: 'smart-fit-rewrite',
    label: 'Smart Fit Rewrite',
    description: 'Rewrites individual bullet points to better echo keywords and requirements from a job posting',
    category: 'tailoring',
    gatewayDefault: GATEWAY_DEFAULTS['smart-fit-rewrite'] ?? null,
  },
  {
    id: 'validate-tailor',
    label: 'Tailor Validation',
    description: 'Verifies that a tailored resume adequately addresses the target job\'s key requirements',
    category: 'tailoring',
    gatewayDefault: GATEWAY_DEFAULTS['validate-tailor'] ?? null,
  },
  {
    id: 'optimize-for-linkedin',
    label: 'LinkedIn Optimisation',
    description: 'Rewrites resume sections using LinkedIn-friendly phrasing and character limits',
    category: 'tailoring',
    gatewayDefault: GATEWAY_DEFAULTS['optimize-for-linkedin'] ?? null,
  },
  {
    id: 'score-resume',
    label: 'Resume Scoring',
    description: 'Scores a resume against a job description for ATS compatibility — uses provider pool, no dedicated route',
    category: 'tailoring',
    gatewayDefault: null,
  },

  // Chat & Analysis
  {
    id: 'agentic-chat',
    label: 'Career Coach Chat',
    description: 'Main AI assistant chat — answers resume, job search, and career questions with tool-calling support',
    category: 'chat',
    gatewayDefault: GATEWAY_DEFAULTS['agentic-chat'] ?? null,
  },
  {
    id: 'wise-ai-chat',
    label: 'WiseAI Chat',
    description: 'Secondary chat interface with a different system prompt; mirrors agentic-chat routing',
    category: 'chat',
    gatewayDefault: GATEWAY_DEFAULTS['wise-ai-chat'] ?? null,
  },
  {
    id: 'analyze-resume',
    label: 'Resume Analysis',
    description: 'Deep resume analysis: scores sections, identifies gaps, and produces a full ATS compatibility report',
    category: 'chat',
    gatewayDefault: GATEWAY_DEFAULTS['analyze-resume'] ?? null,
  },
  {
    id: 'career-assessment',
    label: 'Career Assessment',
    description: 'Career path assessment and skills-gap analysis based on the user\'s current profile and goals',
    category: 'chat',
    gatewayDefault: GATEWAY_DEFAULTS['career-assessment'] ?? null,
  },
  {
    id: 'recruiter-simulation',
    label: 'Recruiter Simulation',
    description: 'Simulates a recruiter reviewing the resume, providing realistic feedback as if in an early screening',
    category: 'chat',
    gatewayDefault: GATEWAY_DEFAULTS['recruiter-simulation'] ?? null,
  },
  {
    id: 'company-briefing',
    label: 'Company Briefing',
    description: 'Generates a pre-interview briefing on the target company — culture, product, recent news',
    category: 'chat',
    gatewayDefault: GATEWAY_DEFAULTS['company-briefing'] ?? null,
  },

  // Document Generation
  {
    id: 'generate-cover-letter',
    label: 'Cover Letter',
    description: 'Generates a personalised, job-specific cover letter from the resume and job description',
    category: 'documents',
    gatewayDefault: GATEWAY_DEFAULTS['generate-cover-letter'] ?? null,
  },
  {
    id: 'generate-portfolio-bio',
    label: 'Portfolio Bio',
    description: 'Writes the "About Me" bio displayed on the user\'s public portfolio page',
    category: 'documents',
    gatewayDefault: GATEWAY_DEFAULTS['generate-portfolio-bio'] ?? null,
  },
  {
    id: 'generate-resignation-letter',
    label: 'Resignation Letter',
    description: 'Generates a professional resignation letter based on the user\'s role and chosen tone',
    category: 'documents',
    gatewayDefault: GATEWAY_DEFAULTS['generate-resignation-letter'] ?? null,
  },
  {
    id: 'generate-question-bank',
    label: 'Question Bank',
    description: 'Generates a role-specific interview Q&A bank, including behavioural and technical questions',
    category: 'documents',
    gatewayDefault: GATEWAY_DEFAULTS['generate-question-bank'] ?? null,
  },

  // Portfolio & Other
  {
    id: 'ask-portfolio',
    label: 'Ask Portfolio',
    description: 'Answers visitor questions about a user\'s public portfolio — uses provider pool, no dedicated route',
    category: 'portfolio',
    gatewayDefault: null,
  },
];

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
  { id: 'nvidia',     label: 'NVIDIA',     defaultModel: 'nvidia/llama-3.1-nemotron-70b-instruct' },
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
  'agentic-chat':               { priority: 'latency',   rationale: 'Real-time chat — Groq has the lowest inference latency',                    recommendedProvider: 'groq',       recommendedModel: 'meta-llama/llama-4-maverick-17b-128e-instruct' },
  'wise-ai-chat':               { priority: 'latency',   rationale: 'Interactive chat — Groq keeps responses fast',                              recommendedProvider: 'groq',       recommendedModel: 'meta-llama/llama-4-maverick-17b-128e-instruct' },
  'editor-ai':                  { priority: 'latency',   rationale: 'Inline edits must feel instant — Groq with a fast model',                   recommendedProvider: 'groq',       recommendedModel: 'llama-3.1-8b-instant' },
  'detect-and-humanize':        { priority: 'latency',   rationale: 'Fast rewrite loop — Groq 8B is enough for short-text humanization',         recommendedProvider: 'groq',       recommendedModel: 'llama-3.1-8b-instant' },
  'suggest-template':           { priority: 'latency',   rationale: 'Quick classifier — small model keeps it snappy',                            recommendedProvider: 'groq',       recommendedModel: 'llama-3.1-8b-instant' },
  'smart-fit-rewrite':          { priority: 'latency',   rationale: 'Per-bullet rewrite happens in a loop — low latency prevents UI stall',      recommendedProvider: 'groq',       recommendedModel: 'llama-3.3-70b-versatile' },
  'career-assessment':          { priority: 'latency',   rationale: 'Conversational assessment — Groq speed keeps the flow natural',             recommendedProvider: 'groq',       recommendedModel: 'llama-3.3-70b-versatile' },
  'generate-resignation-letter':{ priority: 'latency',   rationale: 'Short focused doc — fast model is sufficient',                              recommendedProvider: 'groq',       recommendedModel: 'llama-3.3-70b-versatile' },
  'validate-tailor':            { priority: 'latency',   rationale: 'Validation pass runs after tailoring — keep it fast',                       recommendedProvider: 'groq',       recommendedModel: 'llama-3.3-70b-versatile' },
  'resume-section-ai':          { priority: 'latency',   rationale: 'Section-level rewrites triggered frequently in the editor',                 recommendedProvider: 'groq',       recommendedModel: 'llama-3.3-70b-versatile' },
  'analyze-resume':             { priority: 'reasoning', rationale: 'Deep analysis with structured JSON output — DeepSeek V4 excels here',       recommendedProvider: 'deepseek',   recommendedModel: 'deepseek-v4-flash' },
  'generate-fix-suggestions':   { priority: 'reasoning', rationale: 'Requires logical gap identification — DeepSeek reasoning model',            recommendedProvider: 'deepseek',   recommendedModel: 'deepseek-v4-flash' },
  'recruiter-simulation':       { priority: 'reasoning', rationale: 'Nuanced persona simulation benefits from a reasoning-capable model',        recommendedProvider: 'deepseek',   recommendedModel: 'deepseek-v4-flash' },
  'tailor-resume':              { priority: 'quality',   rationale: 'High-stakes doc rewrite — NVIDIA Llama 4 Maverick for best output quality', recommendedProvider: 'nvidia',     recommendedModel: 'meta/llama-4-maverick-17b-128e-instruct' },
  'generate-cover-letter':      { priority: 'quality',   rationale: 'Professional creative writing — quality over speed',                        recommendedProvider: 'nvidia',     recommendedModel: 'meta/llama-4-maverick-17b-128e-instruct' },
  'generate-portfolio-bio':     { priority: 'quality',   rationale: 'Public-facing copy needs the highest quality output',                       recommendedProvider: 'nvidia',     recommendedModel: 'meta/llama-4-maverick-17b-128e-instruct' },
  'optimize-for-linkedin':      { priority: 'quality',   rationale: 'Tone-sensitive rewrite for professional audience',                          recommendedProvider: 'nvidia',     recommendedModel: 'meta/llama-4-maverick-17b-128e-instruct' },
  'parse-resume':               { priority: 'context',   rationale: 'Full resume text can be long — needs a large context window',               recommendedProvider: 'openrouter', recommendedModel: 'meta-llama/llama-4-scout:free' },
  'parse-job':                  { priority: 'context',   rationale: 'Job postings vary in length — large context handles edge cases',            recommendedProvider: 'openrouter', recommendedModel: 'meta-llama/llama-4-scout:free' },
  'generate-question-bank':     { priority: 'context',   rationale: 'Generates many Q&A pairs — large context + free tier is optimal',          recommendedProvider: 'openrouter', recommendedModel: 'meta-llama/llama-4-maverick:free' },
  'company-briefing':           { priority: 'context',   rationale: 'Research synthesis requires large context to process source material',      recommendedProvider: 'groq',       recommendedModel: 'llama-3.3-70b-versatile' },
  'ask-portfolio':              { priority: 'latency',   rationale: 'Public portfolio chat should stay responsive while handling short answers', recommendedProvider: 'groq',       recommendedModel: 'llama-3.3-70b-versatile' },
};

// ─── Component ────────────────────────────────────────────────────────────────

interface ProviderPing {
  provider: string;
  ok: boolean;
  latencyMs: number | null;
  httpStatus: number;
  configured: boolean;
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
        configMap[doc.feature_id] = {
          $id: doc.$id,
          feature_id: doc.feature_id,
          provider: doc.provider,
          model: doc.model,
        };
      }
      setRoutes(configMap);
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
      [featureId]: { ...prev[featureId], provider, model, feature_id: featureId },
    }));
  };

  const handleUpdateModel = (featureId: string, model: string) => {
    setRoutes(prev => {
      const existing = prev[featureId];
      if (!existing) return prev;
      return { ...prev, [featureId]: { ...existing, model } };
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

  const saveAll = async () => {
    setSaving(true);
    try {
      const toSave = Object.entries(routes);
      // Upsert active overrides
      await Promise.all(toSave.map(async ([featureId, config]) => {
        if (config.$id) {
          await appwriteFunctions.invoke('admin-devkit-data', {
            headers: devKitAuthHeaders(),
            body: { action: 'update-routing-config', docId: config.$id, provider: config.provider, model: config.model },
          });
        } else {
          await appwriteFunctions.invoke('admin-devkit-data', {
            headers: devKitAuthHeaders(),
            body: { action: 'create-routing-config', featureId, provider: config.provider, model: config.model },
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
            <h2 className="text-xl font-black text-white">AI Global Routing</h2>
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono">
              Master Override Console · {FEATURES.length} features · {totalOverrides} active override{totalOverrides !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
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
            disabled={saving}
            className="bg-purple-600 hover:bg-purple-500 text-white rounded-2xl h-11 px-7 font-bold shadow-lg shadow-purple-500/20"
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
                        </div>

                        {/* Right: provider toggle + model picker */}
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex bg-white/5 rounded-xl p-0.5 border border-white/10">
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
                          </div>

                          {/* Model picker — shown only when an override provider is selected */}
                          {hasOverride && override.provider && (() => {
                            const models = getCuratedModels(override.provider as AITestProvider);
                            return (
                              <div className="flex items-center gap-2 w-full justify-end">
                                <select
                                  value={override.model}
                                  onChange={e => handleUpdateModel(feature.id, e.target.value)}
                                  className="bg-white/5 border border-white/10 rounded-lg text-[10px] font-mono text-white/80 px-2 py-1.5 max-w-[260px] focus:outline-none focus:border-purple-500/50 transition-colors"
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
                                {/* Tier badge for the currently selected model */}
                                {(() => {
                                  const found = models.find(m => m.value === override.model);
                                  if (!found) return null;
                                  return (
                                    <span className={cn(
                                      'text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md',
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
