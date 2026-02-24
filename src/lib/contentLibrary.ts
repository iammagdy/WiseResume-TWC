/**
 * Pre-Written Content Library — 500+ phrases for resume building
 * Data is lazily loaded from /data/contentLibrary.json
 */

export type ContentCategory =
  | 'action-verbs'
  | 'achievements'
  | 'skills-descriptions'
  | 'tech'
  | 'finance'
  | 'healthcare'
  | 'marketing'
  | 'sales'
  | 'education'
  | 'engineering'
  | 'legal'
  | 'design'
  | 'management';

export interface ContentPhrase {
  id: string;
  text: string;
  category: ContentCategory;
  industry?: string;
  variables?: string[];
}

export const CATEGORY_LABELS: Record<ContentCategory, string> = {
  'action-verbs': 'Action Verbs',
  'achievements': 'Achievements',
  'skills-descriptions': 'Skills',
  'tech': 'Technology',
  'finance': 'Finance',
  'healthcare': 'Healthcare',
  'marketing': 'Marketing',
  'sales': 'Sales',
  'education': 'Education',
  'engineering': 'Engineering',
  'legal': 'Legal',
  'design': 'Design',
  'management': 'Management',
};

export const CATEGORY_COLORS: Record<ContentCategory, string> = {
  'action-verbs': 'bg-blue-500/20 text-blue-400',
  'achievements': 'bg-emerald-500/20 text-emerald-400',
  'skills-descriptions': 'bg-purple-500/20 text-purple-400',
  'tech': 'bg-cyan-500/20 text-cyan-400',
  'finance': 'bg-amber-500/20 text-amber-400',
  'healthcare': 'bg-rose-500/20 text-rose-400',
  'marketing': 'bg-pink-500/20 text-pink-400',
  'sales': 'bg-orange-500/20 text-orange-400',
  'education': 'bg-indigo-500/20 text-indigo-400',
  'engineering': 'bg-slate-500/20 text-slate-400',
  'legal': 'bg-stone-500/20 text-stone-400',
  'design': 'bg-fuchsia-500/20 text-fuchsia-400',
  'management': 'bg-teal-500/20 text-teal-400',
};

export const ALL_CATEGORIES: ContentCategory[] = Object.keys(CATEGORY_LABELS) as ContentCategory[];

// ---------------------------------------------------------------------------
// Lazy-loaded content phrases (fetched once from static JSON, then cached)
// ---------------------------------------------------------------------------

let _cache: ContentPhrase[] | null = null;

export async function getContentPhrases(): Promise<ContentPhrase[]> {
  if (_cache) return _cache;
  const res = await fetch('/data/contentLibrary.json');
  _cache = (await res.json()) as ContentPhrase[];
  return _cache;
}

/**
 * @deprecated Use `getContentPhrases()` instead. Kept for backward compatibility.
 */
export const contentPhrases: ContentPhrase[] = [];
