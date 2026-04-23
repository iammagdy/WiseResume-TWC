import type { ResumeData } from '@/types/resume';
import type { SectionCollapseProposal } from './types';

const CURRENT_YEAR = () => new Date().getFullYear();

function yearOf(dateStr: string | undefined): number | null {
  if (!dateStr) return null;
  const m = dateStr.match(/(19|20)\d{2}/);
  return m ? parseInt(m[0], 10) : null;
}

/**
 * Threshold-based suggestions for which low-signal items to hide when even
 * pruning isn't enough. Pure / deterministic — every suggestion comes with
 * an explainer the UI shows on the per-section card.
 */
export function proposeSectionCollapses(
  resume: ResumeData,
  charsNeeded: number,
): SectionCollapseProposal[] {
  if (charsNeeded <= 0) return [];

  const out: SectionCollapseProposal[] = [];

  // ── Languages: hide "basic" proficiency ──────────────────────────────
  const basicLanguages = (resume.languages ?? []).filter(l => l.proficiency === 'basic');
  if (basicLanguages.length > 0) {
    const chars = basicLanguages.reduce((s, l) => s + (l.name?.length ?? 0) + 10, 0);
    out.push({
      id: 'collapse:languages-basic',
      section: 'languages',
      itemIds: basicLanguages.map(l => l.id),
      reason: `Hide ${basicLanguages.length} "basic" proficiency language${basicLanguages.length === 1 ? '' : 's'} — recruiters typically skim past these.`,
      estimatedCharsSaved: chars,
    });
  }

  // ── Hobbies: hide entire section if present and short ─────────────────
  const visibleHobbies = (resume.hobbies ?? []).filter(h => h.visible !== false);
  if (visibleHobbies.length > 0) {
    const chars = visibleHobbies.reduce(
      (s, h) => s + (h.name?.length ?? 0) + (h.description?.length ?? 0) + 10,
      0,
    );
    out.push({
      id: 'collapse:hobbies-all',
      section: 'hobbies',
      itemIds: visibleHobbies.map(h => h.id),
      reason: 'Hide hobbies — generic interests rarely move the needle on technical resumes.',
      estimatedCharsSaved: chars,
    });
  }

  // ── Certifications: hide ones older than 12 years AND not flagged as
  //    permanent / having an expiry date in the future. The conservative
  //    threshold keeps lifetime credentials (PE licenses, board certs,
  //    PhD-level credentials) on the resume by default.
  const now = CURRENT_YEAR();
  const oldCerts = (resume.certifications ?? []).filter(c => {
    const y = yearOf(c.date);
    if (y === null || now - y <= 12) return false;
    // Never collapse a cert with a future expiry — recruiters care that
    // it's still valid.
    const expiryYear = yearOf(c.expiryDate);
    if (expiryYear !== null && expiryYear >= now) return false;
    // Skip commonly-permanent credentials by name.
    const name = (c.name ?? '').toLowerCase();
    if (/(licens|professional engineer|^pe\b|board[- ]certified|fellow|life ?time|emeritus|phd|doctorate)/.test(name)) {
      return false;
    }
    return true;
  });
  if (oldCerts.length > 0) {
    const chars = oldCerts.reduce(
      (s, c) => s + (c.name?.length ?? 0) + (c.issuer?.length ?? 0) + 30,
      0,
    );
    out.push({
      id: 'collapse:certifications-old',
      section: 'certifications',
      itemIds: oldCerts.map(c => c.id),
      reason: `Hide ${oldCerts.length} certification${oldCerts.length === 1 ? '' : 's'} older than 12 years (lifetime credentials kept).`,
      estimatedCharsSaved: chars,
    });
  }

  // ── References "available on request" ─────────────────────────────────
  if ((resume.references ?? []).length > 0) {
    const chars = (resume.references ?? []).reduce(
      (s, r) => s + (r.name?.length ?? 0) + (r.title?.length ?? 0) + (r.company?.length ?? 0) + 30,
      0,
    );
    out.push({
      id: 'collapse:references-all',
      section: 'references',
      itemIds: (resume.references ?? []).map(r => r.id),
      reason: 'Hide references — modern resumes assume "available on request" and reclaim the space.',
      estimatedCharsSaved: chars,
    });
  }

  // Sort by estimated savings descending so the UI offers the biggest wins first.
  return out.sort((a, b) => b.estimatedCharsSaved - a.estimatedCharsSaved);
}
