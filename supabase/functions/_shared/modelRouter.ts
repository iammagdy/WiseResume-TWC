/**
 * Smart Model Router for AI tools.
 *
 * Maps each AI tool to the best provider for its workload:
 *
 *   • 'openrouter'  → Gemma 4 (OPENROUTER_API_KEY)         — creative writing,
 *                                                            chat, friendly tone
 *   • 'openrouter2' → gpt-oss-120b (OPENROUTER2_API_KEY)   — premium reasoning,
 *                                                            HR/recruiting,
 *                                                            long-context
 *                                                            analysis
 *   • 'groq'        → llama-3.3-70b (GROQ_API_KEY)         — fast, strict JSON
 *                                                            extraction,
 *                                                            classification,
 *                                                            detection
 *
 * Every edge function should import `selectProviderForTool(toolName)` and
 * pass the returned `provider`, `model`, and `temperature` straight through
 * to `callAI()` / `callAIWithRetry()`. This is the single source of truth —
 * never hard-code provider slugs in individual tools again.
 *
 * MODEL SLUG CONSTANTS are defined in `_shared/modelDefaults.ts` — that file
 * is the single authoritative location for all WiseResume managed model slugs.
 * Update slugs there; this routing table just references them by alias.
 */

import {
  WISERESUME_OPENROUTER_MODEL,
  WISERESUME_OPENROUTER2_MODEL,
  WISERESUME_GROQ_MODEL,
} from './modelDefaults.ts';

export type WiseProvider = 'openrouter' | 'openrouter2' | 'groq' | 'auto';

export interface ToolRoute {
  /** which managed sub-provider to route through */
  provider: WiseProvider;
  /** suggested model slug (used as a hint; managed routing may override) */
  model: string;
  /** recommended temperature for this tool's output style */
  temperature: number;
  /** human label for logs */
  label: string;
}

// Aliases for readability in the routing table below.
// The actual slug strings live in _shared/modelDefaults.ts.
const GEMMA_MODEL = WISERESUME_OPENROUTER_MODEL;   // OpenRouter (creative writing)
const ELEPHANT_MODEL = WISERESUME_OPENROUTER2_MODEL; // OpenRouter 2 (premium reasoning)
const QWEN_MODEL = WISERESUME_GROQ_MODEL;            // Groq (fast structured extraction)

/**
 * Tool → route mapping. Update this single table to retune the whole app.
 *
 * Picking guide:
 *   • Use Gemma for human-tone writing where fluency matters more than
 *     strict structure.
 *   • Use Elephant for tasks where output quality and reasoning depth
 *     drive paid-product value (HR, executive briefs, market analysis).
 *   • Use Qwen for fast structured extraction, classification, and
 *     anything that must return strict JSON the schema validator will
 *     accept.
 */
const ROUTES: Record<string, ToolRoute> = {
  // ── Writing / creative (Gemma 4) ─────────────────────────────────
  'enhance-section':           { provider: 'openrouter',  model: GEMMA_MODEL,    temperature: 0.4, label: 'Gemma 4 (writing)' },
  'tailor-section':            { provider: 'openrouter',  model: GEMMA_MODEL,    temperature: 0.4, label: 'Gemma 4 (writing)' },
  'tailor-resume':             { provider: 'openrouter',  model: GEMMA_MODEL,    temperature: 0.4, label: 'Gemma 4 (writing)' },
  'generate-cover-letter':     { provider: 'openrouter',  model: GEMMA_MODEL,    temperature: 0.5, label: 'Gemma 4 (cover letter)' },
  'optimize-for-linkedin':     { provider: 'openrouter',  model: GEMMA_MODEL,    temperature: 0.5, label: 'Gemma 4 (LinkedIn)' },
  'generate-portfolio-bio':    { provider: 'openrouter',  model: GEMMA_MODEL,    temperature: 0.5, label: 'Gemma 4 (portfolio bio)' },
  'generate-resignation-letter': { provider: 'openrouter',model: GEMMA_MODEL,    temperature: 0.5, label: 'Gemma 4 (resignation)' },
  'explain-gap':               { provider: 'openrouter',  model: GEMMA_MODEL,    temperature: 0.4, label: 'Gemma 4 (gap explainer)' },
  'interview-chat':            { provider: 'openrouter',  model: GEMMA_MODEL,    temperature: 0.6, label: 'Gemma 4 (interview chat)' },
  'agentic-chat':              { provider: 'openrouter',  model: GEMMA_MODEL,    temperature: 0.5, label: 'Gemma 4 (agent chat)' },
  'wise-ai-chat':              { provider: 'openrouter',  model: GEMMA_MODEL,    temperature: 0.6, label: 'Gemma 4 (assistant chat)' },
  'ask-portfolio':             { provider: 'openrouter',  model: GEMMA_MODEL,    temperature: 0.5, label: 'Gemma 4 (portfolio Q&A)' },
  'suggest-template':          { provider: 'openrouter',  model: GEMMA_MODEL,    temperature: 0.3, label: 'Gemma 4 (template picker)' },

  // ── Premium reasoning / HR / paid surfaces (Elephant) ────────────
  'wisehire-write-jd':         { provider: 'openrouter2', model: ELEPHANT_MODEL, temperature: 0.5, label: 'Elephant (JD writer)' },
  'wisehire-generate-brief':   { provider: 'openrouter2', model: ELEPHANT_MODEL, temperature: 0.4, label: 'Elephant (candidate brief)' },
  'wisehire-bulk-screen':      { provider: 'openrouter2', model: ELEPHANT_MODEL, temperature: 0.4, label: 'Elephant (bulk screen)' },
  'wisehire-mask-cvs':         { provider: 'openrouter2', model: ELEPHANT_MODEL, temperature: 0.2, label: 'Elephant (CV masking)' },
  'company-briefing':          { provider: 'openrouter2', model: ELEPHANT_MODEL, temperature: 0.4, label: 'Elephant (company brief)' },
  'recruiter-simulation':      { provider: 'openrouter2', model: ELEPHANT_MODEL, temperature: 0.6, label: 'Elephant (recruiter sim)' },
  'career-path-advisor':       { provider: 'openrouter2', model: ELEPHANT_MODEL, temperature: 0.4, label: 'Elephant (career advisor)' },
  'career-assessment':         { provider: 'openrouter2', model: ELEPHANT_MODEL, temperature: 0.4, label: 'Elephant (career assessment)' },
  'analyze-resume':            { provider: 'openrouter2', model: ELEPHANT_MODEL, temperature: 0.3, label: 'Elephant (resume analyzer)' },

  // ── Fast structured extraction / detection (Qwen on Groq) ─────────
  'parse-job-url':             { provider: 'groq', model: QWEN_MODEL, temperature: 0.2, label: 'Qwen (JD URL parser)' },
  'parse-job-text':            { provider: 'groq', model: QWEN_MODEL, temperature: 0.2, label: 'Qwen (JD text parser)' },
  'parse-resume':              { provider: 'groq', model: QWEN_MODEL, temperature: 0.2, label: 'Qwen (resume parser)' },
  'parse-linkedin':            { provider: 'groq', model: QWEN_MODEL, temperature: 0.2, label: 'Qwen (LinkedIn parser)' },
  'detect-and-humanize':       { provider: 'groq', model: QWEN_MODEL, temperature: 0.3, label: 'Qwen (AI detector + humanizer)' },
  'one-page-optimizer':        { provider: 'groq', model: QWEN_MODEL, temperature: 0.3, label: 'Qwen (one-page optimizer)' },
  'fill-gap':                  { provider: 'groq', model: QWEN_MODEL, temperature: 0.3, label: 'Qwen (gap filler)' },
  'generate-question-bank':    { provider: 'groq', model: QWEN_MODEL, temperature: 0.4, label: 'Qwen (interview Q-bank)' },
};

/**
 * Default route for any tool not explicitly mapped above. Falls through to
 * `auto` so the existing fallback chain (openrouter → openrouter2 → groq)
 * still runs. Logs a warning so we notice the gap.
 */
const DEFAULT_ROUTE: ToolRoute = {
  provider: 'auto',
  model: GEMMA_MODEL,
  temperature: 0.5,
  label: 'auto (default)',
};

/**
 * Look up the routing decision for a tool by name (must match the function's
 * folder name, e.g. `selectProviderForTool('enhance-section')`).
 *
 * If the name isn't in the table the caller falls through to `auto`, which
 * preserves the legacy openrouter → openrouter2 → groq chain. A warning is
 * logged so a missing entry is easy to spot in the function logs.
 */
export function selectProviderForTool(toolName: string): ToolRoute {
  const route = ROUTES[toolName];
  if (!route) {
    console.warn(`[modelRouter] No explicit route for tool "${toolName}" — falling back to auto.`);
    return DEFAULT_ROUTE;
  }
  return route;
}

/** All routes exported for tests / debug surfaces. */
export const ALL_ROUTES = ROUTES;
