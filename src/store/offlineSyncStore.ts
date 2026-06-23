import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ResumeData } from '@/types/resume';

interface PendingChange {
  resumeId: string;
  updates: Partial<ResumeData>;
  /** Client wall-clock time the change was queued (legacy fallback only). */
  timestamp: number;
  /**
   * Server `$updatedAt` of the resume when this edit was made (the baseline the
   * offline edit started from). Conflict detection compares the server's current
   * `$updatedAt` against THIS value — not the client clock — so device clock skew
   * can no longer cause valid offline edits to be discarded as false conflicts.
   */
  baseUpdatedAt?: string | null;
}

interface OfflineSyncState {
  pendingChanges: PendingChange[];
  addPendingChange: (resumeId: string, updates: Partial<ResumeData>, baseUpdatedAt?: string | null) => void;
  removePendingChange: (resumeId: string) => void;
  getPendingCount: () => number;
  clearAll: () => void;
}

export const useOfflineSyncStore = create<OfflineSyncState>()(
  persist(
    (set, get) => ({
      pendingChanges: [],

      addPendingChange: (resumeId, updates, baseUpdatedAt) => {
        set((state) => {
          const filtered = state.pendingChanges.filter(c => c.resumeId !== resumeId);
          return {
            pendingChanges: [
              ...filtered,
              { resumeId, updates, timestamp: Date.now(), baseUpdatedAt: baseUpdatedAt ?? null },
            ],
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
      partialize: (state) => ({ pendingChanges: state.pendingChanges }),
    }
  )
);
