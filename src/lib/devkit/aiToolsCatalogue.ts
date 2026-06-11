/**
 * Canonical AI tool catalogue — single source of truth for DevKit AI Tools Map.
 *
 * Credit costs mirror ai-gateway FEATURE_CREDIT_COSTS (gateway is authoritative).
 * Gateway defaults mirror ai-gateway FEATURE_ROUTES (gateway is authoritative).
 * This file is display/config only — no route mutations happen here.
 */

export type ToolAppArea = 'resume-editor' | 'tailoring' | 'chat' | 'documents' | 'portfolio';
export type ToolProvider = 'nvidia' | 'groq' | 'deepseek' | 'openrouter';

export interface AiToolDef {
  id: string;
  label: string;
  description: string;
  appArea: ToolAppArea;
  /** Credit cost per invocation — mirrors FEATURE_CREDIT_COSTS in ai-gateway. */
  creditCost: number;
  /** Static gateway default — null means pool fallback (no dedicated route). */
  gatewayDefault: { provider: ToolProvider; model: string } | null;
  /**
   * When set, this tool shares the same default routing as the named feature.
   * Used to group AI Studio surfaces without splitting gateway routes.
   */
  sharedRouteWith?: string;
}

/** Mirrors FEATURE_CREDIT_COSTS in appwrite-hubs/ai-gateway/src/main.js */
export const TOOL_CREDIT_COSTS: Record<string, number> = {
  'score-resume': 0,
  'analyze-resume': 2,
  'tailor-resume': 2,
  'generate-cover-letter': 2,
  'generate-question-bank': 1,
  'agentic-chat': 1,
  'wise-ai-chat': 1,
  'resume-section-ai': 1,
  'editor-ai': 1,
  'smart-fit-rewrite': 2,
  'suggest-template': 1,
  'generate-fix-suggestions': 1,
  'parse-resume': 1,
  'parse-job': 1,
  'optimize-for-linkedin': 1,
  'company-briefing': 1,
};

/** Mirrors FEATURE_ROUTES in appwrite-hubs/ai-gateway/src/main.js */
export const TOOL_GATEWAY_DEFAULTS: Record<string, { provider: ToolProvider; model: string }> = {
  'generate-cover-letter':        { provider: 'deepseek',   model: 'deepseek-chat' },
  'tailor-resume':                 { provider: 'deepseek',   model: 'deepseek-chat' },
  'agentic-chat':                 { provider: 'deepseek',   model: 'deepseek-chat' },
  'wise-ai-chat':                 { provider: 'deepseek',   model: 'deepseek-chat' },
  'resume-section-ai':            { provider: 'groq',       model: 'llama-3.3-70b-versatile' },
  'editor-ai':                    { provider: 'deepseek',   model: 'deepseek-chat' },
  'smart-fit-rewrite':            { provider: 'deepseek',   model: 'deepseek-chat' },
  'suggest-template':             { provider: 'deepseek',   model: 'deepseek-chat' },
  'analyze-resume':               { provider: 'deepseek',   model: 'deepseek-chat' },
  'generate-fix-suggestions':     { provider: 'deepseek',   model: 'deepseek-chat' },
  'parse-resume':                 { provider: 'deepseek',   model: 'deepseek-chat' },
  'parse-job':                    { provider: 'deepseek',   model: 'deepseek-chat' },
  'optimize-for-linkedin':        { provider: 'deepseek',   model: 'deepseek-chat' },
  'generate-question-bank':       { provider: 'deepseek',   model: 'deepseek-chat' },
  'company-briefing':             { provider: 'deepseek',   model: 'deepseek-chat' },
};

/** All AI tools, grouped by app area. */
export const AI_TOOLS_CATALOGUE: AiToolDef[] = [
  // ─── Resume Editor ──────────────────────────────────────────────────────────
  {
    id: 'resume-section-ai',
    appArea: 'resume-editor',
    creditCost: TOOL_CREDIT_COSTS['resume-section-ai'],
    gatewayDefault: TOOL_GATEWAY_DEFAULTS['resume-section-ai'],
    label: 'Section Enhance',
    description: 'Improve, shorten, ATS-optimize, and rewrite individual resume sections (Summary, Skills, Experience bullets, etc.)',
  },
  {
    id: 'editor-ai',
    appArea: 'resume-editor',
    creditCost: TOOL_CREDIT_COSTS['editor-ai'],
    gatewayDefault: TOOL_GATEWAY_DEFAULTS['editor-ai'],
    label: 'In-Editor Rewrite',
    description: 'Inline grammar, tone, and rewrite adjustments triggered from the rich-text editor toolbar',
  },
  {
    id: 'generate-fix-suggestions',
    appArea: 'resume-editor',
    creditCost: TOOL_CREDIT_COSTS['generate-fix-suggestions'],
    gatewayDefault: TOOL_GATEWAY_DEFAULTS['generate-fix-suggestions'],
    label: 'ATS Fix Suggestions',
    description: 'Generates targeted improvement tips after an ATS score run highlights red-zone sections',
  },
  {
    id: 'suggest-template',
    appArea: 'resume-editor',
    creditCost: TOOL_CREDIT_COSTS['suggest-template'],
    gatewayDefault: TOOL_GATEWAY_DEFAULTS['suggest-template'],
    label: 'Template Suggestions',
    description: "Recommends the best resume template layout based on the user's role and industry",
  },

  // ─── Tailoring & Job Match ──────────────────────────────────────────────────
  {
    id: 'tailor-resume',
    appArea: 'tailoring',
    creditCost: TOOL_CREDIT_COSTS['tailor-resume'],
    gatewayDefault: TOOL_GATEWAY_DEFAULTS['tailor-resume'],
    label: 'Resume Tailoring',
    description: 'Full resume tailoring pass — rewrites and re-orders content to match a specific job description',
  },
  {
    id: 'parse-resume',
    appArea: 'tailoring',
    creditCost: TOOL_CREDIT_COSTS['parse-resume'],
    gatewayDefault: TOOL_GATEWAY_DEFAULTS['parse-resume'],
    label: 'Resume Parsing',
    description: 'Parses raw resume text (paste or upload) into structured JSON for the editor',
  },
  {
    id: 'parse-job',
    appArea: 'tailoring',
    creditCost: TOOL_CREDIT_COSTS['parse-job'],
    gatewayDefault: TOOL_GATEWAY_DEFAULTS['parse-job'],
    label: 'Job Description Parsing',
    description: 'Parses a job posting into structured role requirements used by Tailoring and ATS scoring',
  },
  {
    id: 'smart-fit-rewrite',
    appArea: 'tailoring',
    creditCost: TOOL_CREDIT_COSTS['smart-fit-rewrite'],
    gatewayDefault: TOOL_GATEWAY_DEFAULTS['smart-fit-rewrite'],
    label: 'Smart Fit Rewrite',
    description: "Rewrites individual bullet points to better echo keywords and requirements from a job posting",
  },
  {
    id: 'optimize-for-linkedin',
    appArea: 'tailoring',
    creditCost: TOOL_CREDIT_COSTS['optimize-for-linkedin'],
    gatewayDefault: TOOL_GATEWAY_DEFAULTS['optimize-for-linkedin'],
    label: 'LinkedIn Optimisation',
    description: 'Rewrites resume sections using LinkedIn-friendly phrasing and character limits',
  },
  {
    id: 'score-resume',
    appArea: 'tailoring',
    creditCost: TOOL_CREDIT_COSTS['score-resume'],
    gatewayDefault: null,
    label: 'Resume Scoring',
    description: 'Scores a resume against a job description for ATS compatibility — uses provider pool, no dedicated route',
  },

  // ─── Chat & Analysis ────────────────────────────────────────────────────────
  {
    id: 'agentic-chat',
    appArea: 'chat',
    creditCost: TOOL_CREDIT_COSTS['agentic-chat'],
    gatewayDefault: TOOL_GATEWAY_DEFAULTS['agentic-chat'],
    label: 'Career Coach Chat',
    description: 'Main AI assistant chat — answers resume, job search, and career questions with tool-calling support',
  },
  {
    id: 'wise-ai-chat',
    appArea: 'chat',
    creditCost: TOOL_CREDIT_COSTS['wise-ai-chat'],
    gatewayDefault: TOOL_GATEWAY_DEFAULTS['wise-ai-chat'],
    label: 'WiseAI Chat (AI Studio)',
    description: 'AI Studio chat surface — separate route entry, same default routing as agentic-chat. Do not split.',
    sharedRouteWith: 'agentic-chat',
  },
  {
    id: 'analyze-resume',
    appArea: 'chat',
    creditCost: TOOL_CREDIT_COSTS['analyze-resume'],
    gatewayDefault: TOOL_GATEWAY_DEFAULTS['analyze-resume'],
    label: 'Resume Analysis',
    description: 'Deep resume analysis: scores sections, identifies gaps, and produces a full ATS compatibility report',
  },
  {
    id: 'company-briefing',
    appArea: 'chat',
    creditCost: TOOL_CREDIT_COSTS['company-briefing'],
    gatewayDefault: TOOL_GATEWAY_DEFAULTS['company-briefing'],
    label: 'Company Briefing',
    description: 'Generates a pre-interview briefing on the target company — culture, product, recent news',
  },

  // ─── Document Generation ────────────────────────────────────────────────────
  {
    id: 'generate-cover-letter',
    appArea: 'documents',
    creditCost: TOOL_CREDIT_COSTS['generate-cover-letter'],
    gatewayDefault: TOOL_GATEWAY_DEFAULTS['generate-cover-letter'],
    label: 'Cover Letter',
    description: 'Generates a personalised, job-specific cover letter from the resume and job description',
  },
  {
    id: 'generate-question-bank',
    appArea: 'documents',
    creditCost: TOOL_CREDIT_COSTS['generate-question-bank'],
    gatewayDefault: TOOL_GATEWAY_DEFAULTS['generate-question-bank'],
    label: 'Question Bank',
    description: 'Generates a role-specific interview Q&A bank, including behavioural and technical questions',
  },
];
