import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ResumeData } from '@/types/resume';

interface PendingChange {
  resumeId: string;
  updates: Partial<ResumeData>;
  timestamp: number;
}

interface ConflictInfo {
  change: PendingChange;
  serverUpdatedAt: string;
}

interface OfflineSyncState {
  pendingChanges: PendingChange[];
  conflictingChange: ConflictInfo | null;
  addPendingChange: (resumeId: string, updates: Partial<ResumeData>) => void;
  removePendingChange: (resumeId: string) => void;
  getPendingCount: () => number;
  clearAll: () => void;
  setConflict: (change: PendingChange, serverUpdatedAt: string) => void;
  clearConflict: () => void;
}

export const useOfflineSyncStore = create<OfflineSyncState>()(
  persist(
    (set, get) => ({
      pendingChanges: [],
      conflictingChange: null,

      addPendingChange: (resumeId, updates) => {
        set((state) => {
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

      clearAll: () => set({ pendingChanges: [], conflictingChange: null }),

      setConflict: (change, serverUpdatedAt) => {
        set({ conflictingChange: { change, serverUpdatedAt } });
      },

      clearConflict: () => {
        set({ conflictingChange: null });
      },
    }),
    {
      name: 'wr-offline-sync',
      partialize: (state) => ({ pendingChanges: state.pendingChanges }),
    }
  )
);
