/**
 * Portfolio working-copy draft is stored locally first because the live
 * Appwrite `profiles` collection currently does not define `portfolio_extras`,
 * `portfolio_draft`, or `portfolio_draft_saved_at` attributes.
 */

import { databases, DATABASE_ID } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';

export const PORTFOLIO_DRAFT_EXTRAS_KEY = 'portfolioDraft';
export const PORTFOLIO_DRAFT_SAVED_AT_EXTRAS_KEY = 'portfolioDraftSavedAt';
const LOCAL_DRAFT_KEY_PREFIX = 'wiseresume:portfolio-draft:';

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

function localDraftKey(userId: string): string {
  return `${LOCAL_DRAFT_KEY_PREFIX}${userId}`;
}

export function readLocalPortfolioDraft(userId: string | undefined): {
  portfolioDraft: Record<string, unknown> | null;
  portfolioDraftSavedAt: string | null;
} {
  if (!userId || typeof window === 'undefined') {
    return { portfolioDraft: null, portfolioDraftSavedAt: null };
  }
  try {
    const raw = window.localStorage.getItem(localDraftKey(userId));
    if (!raw) return { portfolioDraft: null, portfolioDraftSavedAt: null };
    const parsed = JSON.parse(raw) as {
      draft?: unknown;
      savedAt?: unknown;
    };
    return {
      portfolioDraft:
        parsed.draft && typeof parsed.draft === 'object'
          ? (parsed.draft as Record<string, unknown>)
          : null,
      portfolioDraftSavedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : null,
    };
  } catch {
    return { portfolioDraft: null, portfolioDraftSavedAt: null };
  }
}

export function writeLocalPortfolioDraft(
  userId: string,
  snapshot: Record<string, unknown>,
  savedAt: string,
): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    localDraftKey(userId),
    JSON.stringify({ draft: snapshot, savedAt }),
  );
}

export function clearLocalPortfolioDraft(userId: string | undefined): void {
  if (!userId || typeof window === 'undefined') return;
  window.localStorage.removeItem(localDraftKey(userId));
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

export function getMergedPortfolioDraftBytes(
  extras: Record<string, unknown> | null,
  draft: Record<string, unknown>,
  savedAt: string,
): number {
  return JSON.stringify(mergeDraftIntoPortfolioExtras(extras, draft, savedAt)).length;
}

/** Persist draft snapshot locally; mirror to `portfolio_extras` only when that schema exists. */
export async function persistPortfolioDraftToProfile(
  profileDocumentId: string,
  userId: string,
  existingExtras: Record<string, unknown> | null,
  snapshot: Record<string, unknown>,
  savedAt: string,
): Promise<Record<string, unknown>> {
  const mergedExtras = mergeDraftIntoPortfolioExtras(existingExtras, snapshot, savedAt);
  writeLocalPortfolioDraft(userId, snapshot, savedAt);
  try {
    await databases.updateDocument(DATABASE_ID, COLLECTIONS.profiles, profileDocumentId, {
      portfolio_extras: stringifyJsonField(mergedExtras),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('portfolio_extras') && !message.includes('Unknown attribute')) {
      throw error;
    }
  }
  return mergedExtras;
}
