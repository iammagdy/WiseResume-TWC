import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ResumeData } from '@/types/resume';

interface PendingChange {
  resumeId: string;
  updates: Partial<ResumeData>;
  timestamp: number;
}

interface OfflineSyncState {
  pendingChanges: PendingChange[];
  addPendingChange: (resumeId: string, updates: Partial<ResumeData>) => void;
  removePendingChange: (resumeId: string) => void;
  getPendingCount: () => number;
  clearAll: () => void;
}

export const useOfflineSyncStore = create<OfflineSyncState>()(
  persist(
    (set, get) => ({
      pendingChanges: [],

      addPendingChange: (resumeId, updates) => {
        set((state) => {
          // Deduplicate: replace existing entry for same resumeId (last-write-wins)
          const filtered = state.pendingChanges.filter(c => c.resumeId !== resumeId);
          return {
            pendingChanges: [...filtered, { resumeId, updates, timestamp: Date.now() }],
          };
        });
      },

      removePendingChange: (resumeId) => {
        set((state) => ({
          pendingChanges: state.pendingChanges.filter(c => c.resumeId !== resumeId),
        }));
      },

      getPendingCount: () => get().pendingChanges.length,

      clearAll: () => set({ pendingChanges: [] }),
    }),
    {
      name: 'wr-offline-sync',
    }
  )
);
