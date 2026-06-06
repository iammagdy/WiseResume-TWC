/**
 * FULL AI & OPS INVENTORY:
 * These functions are routed through the secure Appwrite AI-Gateway Hub.
 */
export const AI_HUB_FUNCTIONS = new Set([
  // Core AI
  'agentic-chat', 'wise-ai-chat', 'analyze-resume', 'score-resume',
  'editor-ai', 'recruiter-simulation',

  // Document Generation
  'generate-cover-letter', 'generate-portfolio-bio', 'generate-question-bank',
  'generate-resignation-letter', 'generate-fix-suggestions',

  // Job & Tailoring
  'tailor-resume', 'parse-job', 'parse-resume', 'suggest-template',
  'smart-fit-rewrite', 'optimize-for-linkedin', 'validate-tailor',

  // Career & Portfolio
  'career-assessment', 'company-briefing', 'detect-and-humanize',

  // Ops routed through ai-gateway
  'send-contact-email',
]);

export function shouldRouteToAppwrite(fnName: string): boolean {
  return AI_HUB_FUNCTIONS.has(fnName);
}
