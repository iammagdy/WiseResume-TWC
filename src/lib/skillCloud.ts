import type { Experience, Project } from '@/types/resume';

export function computeSkillFrequencies(
  skills: string[],
  experience: Experience[],
  projects: Project[]
): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const skill of skills) {
    const lower = skill.toLowerCase();
    let score = 0;
    for (const exp of experience) {
      const corpus = [
        exp.description ?? '',
        ...(exp.achievements ?? []),
        ...((exp as Experience & { responsibilities?: string[] }).responsibilities ?? []),
      ].join(' ').toLowerCase();
      if (corpus.includes(lower)) score += 2;
    }
    for (const proj of projects) {
      if (proj.technologies?.some((t: string) => t.toLowerCase() === lower)) score += 1;
      if (proj.description?.toLowerCase().includes(lower)) score += 1;
    }
    scores[skill] = score;
  }
  return scores;
}

export function getSkillTier(score: number): {
  tier: string;
  fontSize: string;
  fontWeight: number;
  px: string;
  py: string;
  opacity: number;
} {
  if (score >= 7) return { tier: 'xl', fontSize: '17px', fontWeight: 800, px: '20px', py: '10px', opacity: 1 };
  if (score >= 4) return { tier: 'lg', fontSize: '15px', fontWeight: 700, px: '16px', py: '9px',  opacity: 1 };
  if (score >= 2) return { tier: 'md', fontSize: '13px', fontWeight: 600, px: '14px', py: '8px',  opacity: 0.85 };
  if (score >= 1) return { tier: 'sm', fontSize: '12px', fontWeight: 500, px: '12px', py: '7px',  opacity: 0.70 };
  return                 { tier: 'xs', fontSize: '11px', fontWeight: 400, px: '10px', py: '6px',  opacity: 0.55 };
}

export const TIER_STYLES: Record<string, string> = {
  xl: 'bg-emerald-400/15 text-emerald-400 border-emerald-400/20',
  lg: 'bg-blue-400/15 text-blue-400 border-blue-400/20',
  md: 'bg-amber-400/15 text-amber-400 border-amber-400/20',
  sm: 'bg-muted text-muted-foreground border-border/30',
  xs: 'bg-muted/50 text-muted-foreground/50 border-border/20',
};
