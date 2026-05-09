import { Route, BrainCircuit } from 'lucide-react';

type Provider = 'nvidia' | 'groq' | 'deepseek' | 'openrouter';

interface RouteEntry {
  featureName: string;
  label: string;
  provider: Provider;
  model: string;
  rationale: string;
}

const PROVIDER_COLOR: Record<Provider, string> = {
  nvidia:     'text-green-400',
  groq:       'text-orange-400',
  deepseek:   'text-purple-400',
  openrouter: 'text-blue-400',
};

const PROVIDER_BG: Record<Provider, string> = {
  nvidia:     'bg-green-500/10 border-green-500/20',
  groq:       'bg-orange-500/10 border-orange-500/20',
  deepseek:   'bg-purple-500/10 border-purple-500/20',
  openrouter: 'bg-blue-500/10 border-blue-500/20',
};

const PROVIDER_LABEL: Record<Provider, string> = {
  nvidia:     'NVIDIA NIM',
  groq:       'Groq',
  deepseek:   'DeepSeek',
  openrouter: 'OpenRouter',
};

const FEATURE_ROUTES: RouteEntry[] = [
  // Quality-critical
  { featureName: 'generate-cover-letter',       label: 'Cover Letter',           provider: 'nvidia',     model: 'nvidia/llama-3.1-nemotron-70b-instruct', rationale: 'Quality-critical generation' },
  { featureName: 'tailor-resume',               label: 'Tailor Resume',          provider: 'nvidia',     model: 'nvidia/llama-3.1-nemotron-70b-instruct', rationale: 'Quality-critical generation' },
  { featureName: 'recruiter-simulation',        label: 'Recruiter Sim',          provider: 'nvidia',     model: 'nvidia/llama-3.1-nemotron-70b-instruct', rationale: 'Quality-critical generation' },
  // Speed-critical
  { featureName: 'agentic-chat',                label: 'Agentic Chat',           provider: 'groq',       model: 'llama-3.3-70b-versatile',                rationale: 'Speed-critical / chat' },
  { featureName: 'wise-ai-chat',                label: 'Wise AI Chat',           provider: 'groq',       model: 'llama-3.3-70b-versatile',                rationale: 'Speed-critical / chat' },
  { featureName: 'resume-section-ai',           label: 'Section Rewrite',        provider: 'groq',       model: 'llama-3.3-70b-versatile',                rationale: 'Speed-critical / streaming' },
  { featureName: 'editor-ai',                   label: 'Editor AI',              provider: 'groq',       model: 'llama-3.3-70b-versatile',                rationale: 'Speed-critical / streaming' },
  { featureName: 'smart-fit-rewrite',           label: 'Smart Fit Rewrite',      provider: 'groq',       model: 'llama-3.3-70b-versatile',                rationale: 'Speed-critical / streaming' },
  { featureName: 'detect-and-humanize',         label: 'Detect & Humanize',      provider: 'groq',       model: 'llama-3.3-70b-versatile',                rationale: 'Speed-critical / streaming' },
  { featureName: 'career-assessment',           label: 'Career Assessment',      provider: 'groq',       model: 'llama-3.3-70b-versatile',                rationale: 'Speed-critical / chat' },
  { featureName: 'generate-portfolio-bio',      label: 'Portfolio Bio',          provider: 'groq',       model: 'llama-3.3-70b-versatile',                rationale: 'Short, fast generation' },
  { featureName: 'generate-resignation-letter', label: 'Resignation Letter',     provider: 'groq',       model: 'llama-3.3-70b-versatile',                rationale: 'Short, fast generation' },
  { featureName: 'validate-tailor',             label: 'Validate Tailor',        provider: 'groq',       model: 'llama-3.3-70b-versatile',                rationale: 'Speed-critical' },
  { featureName: 'suggest-template',            label: 'Suggest Template',       provider: 'groq',       model: 'llama-3.1-8b-instant',                   rationale: 'Lightweight classifier' },
  // Reasoning / analysis
  { featureName: 'analyze-resume',              label: 'Analyze Resume',         provider: 'deepseek',   model: 'deepseek-chat',                          rationale: 'Structured analysis' },
  { featureName: 'generate-fix-suggestions',    label: 'Fix Suggestions',        provider: 'deepseek',   model: 'deepseek-chat',                          rationale: 'Structured analysis' },
  // Long-context / parsing
  { featureName: 'parse-resume',                label: 'Parse Resume',           provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free', rationale: 'Long context / parsing' },
  { featureName: 'parse-job',                   label: 'Parse Job',              provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free', rationale: 'Long context / parsing' },
  { featureName: 'optimize-for-linkedin',       label: 'LinkedIn Optimizer',     provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free', rationale: 'Long context' },
  { featureName: 'generate-question-bank',      label: 'Question Bank',          provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free', rationale: 'Long context / factual' },
  { featureName: 'company-briefing',            label: 'Company Briefing',       provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free', rationale: 'Long context / factual' },
];

const PROVIDER_GROUPS: { provider: Provider; label: string; rationale: string }[] = [
  { provider: 'nvidia',     label: 'NVIDIA NIM — Nemotron 70B',     rationale: 'Best instruction-following for long generative tasks (cover letters, tailoring, recruiter sim).' },
  { provider: 'groq',       label: 'Groq — Llama 3.3 70B',          rationale: 'Lowest-latency inference. Preferred for all chat, streaming, and short-generation features.' },
  { provider: 'deepseek',   label: 'DeepSeek — DeepSeek Chat',      rationale: 'Strong multi-step reasoning and structured output for analysis tasks.' },
  { provider: 'openrouter', label: 'OpenRouter — Llama 3.3 70B',    rationale: 'Broad free-tier access with diverse fallback models. Used for long-context parsing.' },
];

export function AIRoutingPanel() {
  const byProvider = PROVIDER_GROUPS.map(g => ({
    ...g,
    routes: FEATURE_ROUTES.filter(r => r.provider === g.provider),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Route className="w-5 h-5 text-blue-400" />
        <div>
          <h2 className="text-base font-black uppercase tracking-wider text-white">AI Routing Config</h2>
          <p className="text-xs text-white/40 mt-0.5">
            Per-feature provider preference map — hardcoded in{' '}
            <code className="font-mono text-white/50 text-[10px]">appwrite-hubs/ai-gateway/src/main.js</code>.
            Falls back to random pool when the preferred provider has no key configured.
          </p>
        </div>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        {PROVIDER_GROUPS.map(g => {
          const count = FEATURE_ROUTES.filter(r => r.provider === g.provider).length;
          return (
            <span
              key={g.provider}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${PROVIDER_BG[g.provider]} ${PROVIDER_COLOR[g.provider]}`}
            >
              <BrainCircuit className="w-3 h-3" />
              {PROVIDER_LABEL[g.provider]}
              <span className="ml-1 opacity-60">{count} features</span>
            </span>
          );
        })}
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/10 text-white/40 text-xs font-bold bg-white/5">
          Random fallback for all others
        </span>
      </div>

      {/* Per-provider tables */}
      {byProvider.map(group => (
        <div key={group.provider} className="rounded-xl border border-border bg-card overflow-hidden">
          <div className={`flex items-start gap-3 px-4 py-3 border-b border-border ${PROVIDER_BG[group.provider]}`}>
            <div className="mt-0.5">
              <BrainCircuit className={`w-4 h-4 ${PROVIDER_COLOR[group.provider]}`} />
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-black uppercase tracking-wide ${PROVIDER_COLOR[group.provider]}`}>
                {group.label}
              </p>
              <p className="text-xs text-white/40 mt-0.5">{group.rationale}</p>
            </div>
            <span className={`ml-auto shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${PROVIDER_BG[group.provider]} ${PROVIDER_COLOR[group.provider]}`}>
              {group.routes.length}
            </span>
          </div>

          <div className="divide-y divide-border">
            {group.routes.map(r => (
              <div key={r.featureName} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors">
                <div className="min-w-[160px]">
                  <p className="text-xs font-semibold text-white">{r.label}</p>
                  <p className="text-[10px] font-mono text-white/30 mt-0.5">{r.featureName}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[11px] font-mono truncate ${PROVIDER_COLOR[r.provider]}`}>{r.model}</p>
                </div>
                <span className="shrink-0 text-[10px] text-white/30 italic">{r.rationale}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Fallback note */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
        <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1">Random fallback pool</p>
        <p className="text-xs text-white/30">
          Features not listed above (e.g. <code className="font-mono text-white/40">score-resume</code>,{' '}
          <code className="font-mono text-white/40">ask-portfolio</code>, <code className="font-mono text-white/40">ai-health</code>, coupons)
          are routed to a randomly-selected provider from all configured keys.
          The gateway tries each provider in the order: OpenRouter → Groq → DeepSeek → NVIDIA, picking
          whichever keys are present in Appwrite Function variables at invocation time.
        </p>
      </div>
    </div>
  );
}
