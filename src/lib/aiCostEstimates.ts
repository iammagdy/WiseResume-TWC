/** Estimated AI credit cost per operation type */
export const AI_COST_MAP: Record<string, number> = {
  'score': 1,
  'enhance': 1,
  'tailor': 2,
  'proofread': 1,
  'cover-letter': 2,
  'interview': 1,
  'career-assessment': 2,
  'detect-humanize': 1,
  'one-page': 1,
  'linkedin': 1,
  'gap-explain': 1,
  'gap-fill': 1,
  'recruiter-sim': 2,
  'agentic-chat': 1,
  'company_briefing': 1,
} as const;

export function getAICost(operation: string): number {
  return AI_COST_MAP[operation] ?? 1;
}
