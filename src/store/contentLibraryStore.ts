import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ContentLibraryState {
  favorites: string[];
  recentlyUsed: string[];
  toggleFavorite: (id: string) => void;
  addToRecent: (id: string) => void;
  clearRecents: () => void;
}

export const useContentLibraryStore = create<ContentLibraryState>()(
  persist(
    (set) => ({
      favorites: [],
      recentlyUsed: [],
      toggleFavorite: (id) =>
        set((state) => ({
          favorites: state.favorites.includes(id)
            ? state.favorites.filter((f) => f !== id)
            : [...state.favorites, id],
        })),
      addToRecent: (id) =>
        set((state) => ({
          recentlyUsed: [id, ...state.recentlyUsed.filter((r) => r !== id)].slice(0, 20),
        })),
      clearRecents: () => set({ recentlyUsed: [] }),
    }),
    { name: 'content-library-store' }
  )
);
