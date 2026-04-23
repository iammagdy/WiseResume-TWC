import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TemplateId, PDFOptions } from '@/types/resume';

export type BiometricLockTimeout = 0 | 30000 | 60000 | 300000;
export type AutoSaveToastMode = 'always' | 'errors-only';
export type AITipFrequency = 'daily' | 'weekly' | 'on-demand';

// AI Provider type — kept for backward compat with rateLimiter and AIPrivacyDisclosureProvider.
// The flat 6-key managed pool is the only active engine; aiProvider is always 'wiseresume'.
export type AIProvider = 'wiseresume' | 'openai' | 'anthropic' | 'gemini' | 'groq' | 'mistral' | 'xai' | 'cohere' | 'openrouter' | 'ollama';
export type GeminiKeyTier = 'free' | 'paid' | 'unknown';

interface GeminiDailyUsage {
  date: string;
  count: number;
}

interface SettingsState {
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
  
  // AI Provider (always 'wiseresume' — flat 6-key pool is the only engine)
  aiProvider: AIProvider;

  // Gemini fields retained for rateLimiter backward compat (effectively dead since aiProvider === 'wiseresume')
  geminiApiKey: string;
  geminiKeyTier: GeminiKeyTier;
  geminiKeyValidated: boolean;
  geminiDailyUsage: GeminiDailyUsage;
  geminiModel: string;
  
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
  
  // AI Provider actions (effectively no-ops — kept for compat with DevKit read-ai-settings panel)
  setAIProvider: (provider: AIProvider) => void;
  setGeminiApiKey: (key: string) => void;
  setGeminiKeyTier: (tier: GeminiKeyTier) => void;
  setGeminiKeyValidated: (validated: boolean) => void;
  setGeminiModel: (model: string) => void;
  incrementGeminiDailyUsage: () => void;
  resetGeminiDailyUsage: () => void;
  
  resetSettings: () => void;
  resetUserSettings: () => void;
}

const defaultSettings = {
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
  // AI Provider — always 'wiseresume' (flat 6-key pool is the only engine)
  aiProvider: 'wiseresume' as AIProvider,
  // Gemini fields retained for rateLimiter backward compat
  geminiApiKey: '',
  geminiKeyTier: 'unknown' as GeminiKeyTier,
  geminiKeyValidated: false,
  geminiDailyUsage: { date: '', count: 0 } as GeminiDailyUsage,
  geminiModel: 'gemini-2.5-flash',
};

function getTodayPacific(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...defaultSettings,

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
      
      // AI Provider actions
      setAIProvider: (provider) => set({ aiProvider: provider }),
      setGeminiApiKey: (key) => set({ 
        geminiApiKey: key,
        geminiKeyValidated: false,
        geminiKeyTier: 'unknown',
      }),
      setGeminiKeyTier: (tier) => set({ geminiKeyTier: tier }),
      setGeminiKeyValidated: (validated) => set({ geminiKeyValidated: validated }),
      setGeminiModel: (model) => set({ geminiModel: model }),
      incrementGeminiDailyUsage: () => {
        const today = getTodayPacific();
        const current = get().geminiDailyUsage;
        if (current.date !== today) {
          set({ geminiDailyUsage: { date: today, count: 1 } });
        } else {
          set({ geminiDailyUsage: { date: today, count: current.count + 1 } });
        }
      },
      resetGeminiDailyUsage: () => set({ geminiDailyUsage: { date: '', count: 0 } }),
      
      resetSettings: () => set(defaultSettings),

      resetUserSettings: () => set((state) => ({
        ...defaultSettings,
        // Preserve one-time flags that are device/user experience state,
        // not account-specific data. These should never reset on sign-out.
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
        // Exclude sensitive fields and ephemeral session state from localStorage.
        // lpProduct is ephemeral — never persisted.
        // hasSeenSplash is session-only — splash shows on every cold page load.
        // geminiApiKey is stored server-side only.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { geminiApiKey, elevenlabsApiKey, lpProduct: _lpProduct, hasSeenSplash: _hasSeenSplash, ...rest } = state;
        return rest;
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Splash shows on every fresh page load regardless of persisted value.
          state.hasSeenSplash = false;
          // Always force managed pool — legacy persisted BYOK provider values are ignored.
          state.aiProvider = 'wiseresume';
        }
      },
    }
  )
);
