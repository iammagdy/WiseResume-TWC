/** Estimated AI credit cost per operation type */
export const AI_COST_MAP: Record<string, number> = {
  'score': 1,
  'enhance': 1,
  'tailor': 2,
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
  'analyze': 2,
  'headshot': 1,
  'interview-turn': 1,
  'ats-deep': 1,
  'salary-negotiation': 2,
  'job-rejection': 1,
  'reference-letter': 2,
  'personal-branding': 1,
  'cold-email': 1,
  'skills-gap': 1,
  'portfolio-bio': 1,
  'free': 0,
} as const;

export function getAICost(operation: string): number {
  return AI_COST_MAP[operation] ?? 1;
}
