export type GuideCategory = 'resume' | 'cover-letter' | 'interview' | 'career' | 'industry';

export interface Guide {
    slug: string;
    title: string;
    category: GuideCategory;
    readTimeMinutes: number;
    tags: string[];
    content: string;
}

export const GUIDE_CATEGORIES: { id: GuideCategory; label: string }[] = [
    { id: 'resume', label: 'Resume' },
    { id: 'cover-letter', label: 'Cover Letter' },
    { id: 'interview', label: 'Interview' },
    { id: 'career', label: 'Career' },
    { id: 'industry', label: 'Industry' },
];

// ---------------------------------------------------------------------------
// Lazy-loaded guides data (fetched once from static JSON, then cached)
// ---------------------------------------------------------------------------

let _cache: Guide[] | null = null;

export async function getGuides(): Promise<Guide[]> {
    if (_cache) return _cache;
    const res = await fetch('/data/guidesData.json');
    _cache = (await res.json()) as Guide[];
    return _cache;
}

export async function getGuideBySlug(slug: string): Promise<Guide | undefined> {
    const all = await getGuides();
    return all.find(g => g.slug === slug);
}

export async function getGuidesByCategory(category: GuideCategory): Promise<Guide[]> {
    const all = await getGuides();
    return all.filter(g => g.category === category);
}

export async function searchGuides(query: string): Promise<Guide[]> {
    const q = query.toLowerCase();
    const all = await getGuides();
    return all.filter(g =>
        g.title.toLowerCase().includes(q) ||
        g.tags.some(t => t.toLowerCase().includes(q)) ||
        g.content.toLowerCase().includes(q)
    );
}

/**
 * @deprecated Use `getGuides()` instead. Kept for backward compatibility.
 */
export const guides: Guide[] = [];
