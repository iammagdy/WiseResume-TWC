import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TemplateId, PDFOptions } from '@/types/resume';

export type BiometricLockTimeout = 0 | 30000 | 60000 | 300000;
export type AutoSaveToastMode = 'always' | 'errors-only';
export type AITipFrequency = 'daily' | 'weekly' | 'on-demand';

// Kept for backward compat with AIPrivacyDisclosureProvider and DevKitRunner.
// The flat 6-key managed pool is the only active engine; aiProvider is always 'wiseresume'.
export type AIProvider = 'wiseresume' | 'openai' | 'anthropic' | 'gemini' | 'groq' | 'mistral' | 'xai' | 'cohere' | 'openrouter' | 'ollama';

export interface ByokKeyHint {
  id: string;
  provider: string;
  key_hint: string | null;
  is_active: boolean;
  created_at: string;
}

interface SettingsState {
  // BYOK state — populated by useAIKeyHydration, never persisted
  byokEnabled: boolean;
  byokProvider: string | null;
  byokKeyHints: ByokKeyHint[];

  // Notifications
  showAutoSaveToasts: boolean;
  autoSaveToastMode: AutoSaveToastMode;
  showAIEnhancementTips: boolean;
  aiTipFrequency: AITipFrequency;
  // Privacy
  shakeToReportEnabled: boolean;
  analyticsEnabled: boolean;
  biometricLockEnabled: boolean;
  biometricLockTimeout: BiometricLockTimeout;
  redactPiiBeforeAI: boolean;
  
  // Editor Preferences
  defaultTemplate: TemplateId;
  pdfDefaults: PDFOptions;
  
  // Onboarding
  hasSeenSplash: boolean;
  hasSeenAIIntro: boolean;
  hasSeenPreviewHint: boolean;
  hasSeenTailorHint: boolean;
  hasSeenInterviewHint: boolean;
  hasSeenAIStudioTour: boolean;
  
  // Integrations (in-memory only, not persisted — keys stored server-side)
  elevenlabsApiKey: string;
  
  // Theme
  theme: 'light' | 'dark' | 'system';

  // Landing page product mode (not persisted — ephemeral session state)
  lpProduct: 'jobseeker' | 'wisehire';
  setLpProduct: (product: 'jobseeker' | 'wisehire') => void;
  
  // Export
  lastExportType: string | null;
  
  // AI Provider — always 'wiseresume'; pinned in onRehydrateStorage.
  // Setter is a no-op kept for backward compat with DevKit and AIPrivacyDisclosureProvider.
  aiProvider: AIProvider;
  
  // BYOK setters (called by useAIKeyHydration after fetching from server)
  setByokEnabled: (value: boolean) => void;
  setByokProvider: (provider: string | null) => void;
  setByokKeyHints: (hints: ByokKeyHint[]) => void;

  // Actions
  setShowAutoSaveToasts: (value: boolean) => void;
  setAutoSaveToastMode: (mode: AutoSaveToastMode) => void;
  setShowAIEnhancementTips: (value: boolean) => void;
  setAITipFrequency: (freq: AITipFrequency) => void;
  setShakeToReportEnabled: (value: boolean) => void;
  setAnalyticsEnabled: (value: boolean) => void;
  setBiometricLockEnabled: (value: boolean) => void;
  setBiometricLockTimeout: (timeout: BiometricLockTimeout) => void;
  setRedactPiiBeforeAI: (value: boolean) => void;
  setDefaultTemplate: (template: TemplateId) => void;
  setPdfDefaults: (defaults: Partial<PDFOptions>) => void;
  setHasSeenSplash: (value: boolean) => void;
  setHasSeenAIIntro: (value: boolean) => void;
  setHasSeenPreviewHint: (value: boolean) => void;
  setHasSeenTailorHint: (value: boolean) => void;
  setHasSeenInterviewHint: (value: boolean) => void;
  setHasSeenAIStudioTour: (value: boolean) => void;
  setElevenlabsApiKey: (key: string) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setLastExportType: (type: string) => void;
  
  // No-op — aiProvider is pinned to 'wiseresume'; kept for compat
  setAIProvider: (provider: AIProvider) => void;
  
  resetSettings: () => void;
  resetUserSettings: () => void;
}

const defaultSettings = {
  byokEnabled: false,
  byokProvider: null as string | null,
  byokKeyHints: [] as ByokKeyHint[],
  showAutoSaveToasts: true,
  autoSaveToastMode: 'always' as AutoSaveToastMode,
  showAIEnhancementTips: true,
  aiTipFrequency: 'daily' as AITipFrequency,
  shakeToReportEnabled: true,
  analyticsEnabled: true,
  biometricLockEnabled: false,
  biometricLockTimeout: 30000 as BiometricLockTimeout,
  redactPiiBeforeAI: true,
  defaultTemplate: 'modern' as TemplateId,
  pdfDefaults: {
    showPageNumbers: true,
    pageNumberFormat: 'full' as const,
    showBranding: true,
  },
  hasSeenSplash: false,
  hasSeenAIIntro: false,
  hasSeenPreviewHint: false,
  hasSeenTailorHint: false,
  hasSeenInterviewHint: false,
  hasSeenAIStudioTour: false,
  elevenlabsApiKey: '',
  theme: 'system' as 'light' | 'dark' | 'system',
  lpProduct: 'jobseeker' as 'jobseeker' | 'wisehire',
  lastExportType: null as string | null,
  aiProvider: 'wiseresume' as AIProvider,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,

      setByokEnabled: (value) => set({ byokEnabled: value }),
      setByokProvider: (provider) => set({ byokProvider: provider }),
      setByokKeyHints: (hints) => set({ byokKeyHints: hints }),
      setShowAutoSaveToasts: (value) => set({ showAutoSaveToasts: value }),
      setAutoSaveToastMode: (mode) => set({ autoSaveToastMode: mode }),
      setShowAIEnhancementTips: (value) => set({ showAIEnhancementTips: value }),
      setAITipFrequency: (freq) => set({ aiTipFrequency: freq }),
      setShakeToReportEnabled: (value) => set({ shakeToReportEnabled: value }),
      setAnalyticsEnabled: (value) => set({ analyticsEnabled: value }),
      setBiometricLockEnabled: (value) => set({ biometricLockEnabled: value }),
      setBiometricLockTimeout: (timeout) => set({ biometricLockTimeout: timeout }),
      setRedactPiiBeforeAI: (value) => set({ redactPiiBeforeAI: value }),
      setDefaultTemplate: (template) => set({ defaultTemplate: template }),
      setPdfDefaults: (defaults) =>
        set((state) => ({
          pdfDefaults: { ...state.pdfDefaults, ...defaults },
        })),
      setHasSeenSplash: (value) => set({ hasSeenSplash: value }),
      setHasSeenAIIntro: (value) => set({ hasSeenAIIntro: value }),
      setHasSeenPreviewHint: (value) => set({ hasSeenPreviewHint: value }),
      setHasSeenTailorHint: (value) => set({ hasSeenTailorHint: value }),
      setHasSeenInterviewHint: (value) => set({ hasSeenInterviewHint: value }),
      setHasSeenAIStudioTour: (value) => set({ hasSeenAIStudioTour: value }),
      setElevenlabsApiKey: (key) => set({ elevenlabsApiKey: key }),
      setTheme: (theme) => set({ theme }),
      setLpProduct: (product) => set({ lpProduct: product }),
      setLastExportType: (type) => set({ lastExportType: type }),
      
      // No-op — flat 6-key pool is the only engine
      setAIProvider: (_provider) => { /* no-op */ },
      
      resetSettings: () => set(defaultSettings),

      resetUserSettings: () => set((state) => ({
        ...defaultSettings,
        // Preserve one-time UX flags that are device-local, not account-specific.
        hasSeenAIIntro: state.hasSeenAIIntro,
        hasSeenPreviewHint: state.hasSeenPreviewHint,
        hasSeenTailorHint: state.hasSeenTailorHint,
        hasSeenInterviewHint: state.hasSeenInterviewHint,
        hasSeenAIStudioTour: state.hasSeenAIStudioTour,
      })),
    }),
    {
      name: 'wiseresume-settings',
      partialize: (state) => {
        // Exclude ephemeral and sensitive fields from localStorage.
        // elevenlabsApiKey is in-memory only.
        // lpProduct and hasSeenSplash are session-only.
        // byok* state is hydrated from server on each load — never persisted.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { elevenlabsApiKey, lpProduct: _lp, hasSeenSplash: _splash, byokEnabled: _be, byokProvider: _bp, byokKeyHints: _bkh, ...rest } = state;
        return rest;
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Splash shows on every fresh page load.
          state.hasSeenSplash = false;
          // Always force managed pool regardless of any legacy persisted value.
          state.aiProvider = 'wiseresume';
        }
      },
    }
  )
);
