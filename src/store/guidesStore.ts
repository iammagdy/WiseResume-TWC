import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GuidesState {
  bookmarkedSlugs: string[];
  readSlugs: string[];
  helpfulSlugs: Record<string, boolean>;
  fontSize: 'sm' | 'md' | 'lg';
  toggleBookmark: (slug: string) => void;
  markRead: (slug: string) => void;
  setHelpful: (slug: string, helpful: boolean) => void;
  setFontSize: (size: 'sm' | 'md' | 'lg') => void;
}

export const useGuidesStore = create<GuidesState>()(
  persist(
    (set) => ({
      bookmarkedSlugs: [],
      readSlugs: [],
      helpfulSlugs: {},
      fontSize: 'md',
      toggleBookmark: (slug) =>
        set((s) => ({
          bookmarkedSlugs: s.bookmarkedSlugs.includes(slug)
            ? s.bookmarkedSlugs.filter((s2) => s2 !== slug)
            : [...s.bookmarkedSlugs, slug],
        })),
      markRead: (slug) =>
        set((s) => ({
          readSlugs: s.readSlugs.includes(slug) ? s.readSlugs : [...s.readSlugs, slug],
        })),
      setHelpful: (slug, helpful) =>
        set((s) => ({ helpfulSlugs: { ...s.helpfulSlugs, [slug]: helpful } })),
      setFontSize: (fontSize) => set({ fontSize }),
    }),
    { name: 'wr-guides-store' }
  )
);
