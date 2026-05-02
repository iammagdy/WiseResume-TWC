import { create } from 'zustand';
import type { BridgeIdentity } from '@/lib/auth';

interface AuthState {
  identity: BridgeIdentity | null;
  ready: boolean;
  setIdentity: (i: BridgeIdentity | null) => void;
  setReady: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  identity: null,
  ready: false,
  setIdentity: (identity) => set({ identity }),
  setReady: (ready) => set({ ready }),
}));
