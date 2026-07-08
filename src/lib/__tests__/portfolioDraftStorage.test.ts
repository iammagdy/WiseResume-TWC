import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  mergeDraftIntoPortfolioExtras,
  getMergedPortfolioDraftBytes,
  persistPortfolioDraftToProfile,
  readPortfolioDraftFromProfileDoc,
} from '../portfolioDraftStorage';

// Mock appwrite module
vi.mock('@/lib/appwrite', () => ({
  databases: {
    updateDocument: vi.fn(),
  },
  DATABASE_ID: 'test-db',
}));

describe('Portfolio Draft Storage (Client-Side Protection)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
    }
  });

  it('mergeDraftIntoPortfolioExtras strips draft/savedAt keys to keep extras small', () => {
    const extras = {
      availabilityStatus: 'actively-looking',
      passwordEnabled: true,
      portfolioDraft: { projects: [] },
      portfolioDraftSavedAt: '2026-07-09T00:00:00Z',
    };
    const next = mergeDraftIntoPortfolioExtras(extras, { other: 123 }, '2026-07-09T01:00:00Z');
    
    expect(next.availabilityStatus).toBe('actively-looking');
    expect(next.passwordEnabled).toBe(true);
    expect(next.portfolioDraft).toBeUndefined();
    expect(next.portfolioDraftSavedAt).toBeUndefined();
  });

  it('getMergedPortfolioDraftBytes measures the draft itself', () => {
    const draft = { test: 'data', complex: [1, 2, 3] };
    const bytes = getMergedPortfolioDraftBytes(null, draft, '2026');
    expect(bytes).toBe(new Blob([JSON.stringify(draft)]).size);
  });

  it('persistPortfolioDraftToProfile writes to localStorage and returns clean extras without hitting DB', async () => {
    const existing = { availabilityStatus: 'open-to-offers' };
    const draft = { workspace: 'saved' };
    const now = '2026-07-09T02:00:00Z';

    const result = await persistPortfolioDraftToProfile('doc-123', 'user-456', existing, draft, now);

    // Returned object must be cleaned of draft keys
    expect(result.availabilityStatus).toBe('open-to-offers');
    expect(result.portfolioDraft).toBeUndefined();

    // Verify localStorage has the draft
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('wiseresume:portfolio-draft:user-456');
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed.draft).toEqual(draft);
      expect(parsed.savedAt).toBe(now);
    }
  });

  it('readPortfolioDraftFromProfileDoc reads legacy draft information from profile document correctly', () => {
    const legacyDoc = {
      portfolio_extras: JSON.stringify({
        availabilityStatus: 'actively-looking',
        portfolioDraft: { legacy: true },
        portfolioDraftSavedAt: '2026-07-08T00:00:00Z',
      }),
    };

    const parsed = readPortfolioDraftFromProfileDoc(legacyDoc);
    expect(parsed.portfolioDraft).toEqual({ legacy: true });
    expect(parsed.portfolioDraftSavedAt).toBe('2026-07-08T00:00:00Z');
  });
});
