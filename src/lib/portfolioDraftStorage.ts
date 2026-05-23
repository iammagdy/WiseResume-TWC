/**
 * Portfolio working-copy draft is stored inside `portfolio_extras` because the
 * live Appwrite `profiles` collection does not define `portfolio_draft` /
 * `portfolio_draft_saved_at` attributes (Supabase-only columns in the old schema).
 */

import { databases, DATABASE_ID } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';

export const PORTFOLIO_DRAFT_EXTRAS_KEY = 'portfolioDraft';
export const PORTFOLIO_DRAFT_SAVED_AT_EXTRAS_KEY = 'portfolioDraftSavedAt';

export function parsePortfolioExtrasField(raw: unknown): Record<string, unknown> | null {
  return parseJsonField(raw);
}

function parseJsonField(raw: unknown): Record<string, unknown> | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  if (typeof raw === 'object') return raw as Record<string, unknown>;
  return null;
}

function stringifyJsonField(value: Record<string, unknown> | null): string | null {
  if (value === null) return null;
  return JSON.stringify(value);
}

export function readPortfolioDraftFromProfileDoc(doc: Record<string, unknown>): {
  portfolioDraft: Record<string, unknown> | null;
  portfolioDraftSavedAt: string | null;
} {
  const extras = parseJsonField(doc.portfolio_extras);
  const fromExtras = extras?.[PORTFOLIO_DRAFT_EXTRAS_KEY];
  const draftFromExtras =
    fromExtras && typeof fromExtras === 'object'
      ? (fromExtras as Record<string, unknown>)
      : null;
  const savedAtFromExtras = extras?.[PORTFOLIO_DRAFT_SAVED_AT_EXTRAS_KEY];
  const legacyDraft = parseJsonField(doc.portfolio_draft);

  return {
    portfolioDraft: draftFromExtras ?? legacyDraft,
    portfolioDraftSavedAt:
      (typeof savedAtFromExtras === 'string' ? savedAtFromExtras : null) ??
      (typeof doc.portfolio_draft_saved_at === 'string' ? doc.portfolio_draft_saved_at : null),
  };
}

export function mergeDraftIntoPortfolioExtras(
  extras: Record<string, unknown> | null,
  draft: Record<string, unknown> | null,
  savedAt: string | null,
): Record<string, unknown> {
  const next = { ...(extras ?? {}) };
  if (draft === null) {
    delete next[PORTFOLIO_DRAFT_EXTRAS_KEY];
    delete next[PORTFOLIO_DRAFT_SAVED_AT_EXTRAS_KEY];
  } else {
    next[PORTFOLIO_DRAFT_EXTRAS_KEY] = draft;
    next[PORTFOLIO_DRAFT_SAVED_AT_EXTRAS_KEY] = savedAt;
  }
  return next;
}

/** Persist draft snapshot by updating only `portfolio_extras` (Appwrite-safe). */
export async function persistPortfolioDraftToProfile(
  profileDocumentId: string,
  existingExtras: Record<string, unknown> | null,
  snapshot: Record<string, unknown>,
  savedAt: string,
): Promise<Record<string, unknown>> {
  const mergedExtras = mergeDraftIntoPortfolioExtras(existingExtras, snapshot, savedAt);
  await databases.updateDocument(DATABASE_ID, COLLECTIONS.profiles, profileDocumentId, {
    portfolio_extras: stringifyJsonField(mergedExtras),
  });
  return mergedExtras;
}
