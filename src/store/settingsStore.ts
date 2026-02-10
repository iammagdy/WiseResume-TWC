import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TemplateId, PDFOptions } from '@/types/resume';

export type BiometricLockTimeout = 0 | 30000 | 60000 | 300000;

// AI Provider types
export type AIProvider = 'lovable' | 'gemini';
export type GeminiKeyTier = 'free' | 'paid' | 'unknown';

interface GeminiDailyUsage {
  date: string;
  count: number;
}

interface SettingsState {
  // Notifications
  showAutoSaveToasts: boolean;
  showAIEnhancementTips: boolean;
  
  // Privacy
  localOnlyMode: boolean;
  analyticsEnabled: boolean;
  biometricLockEnabled: boolean;
  biometricLockTimeout: BiometricLockTimeout;
  
  // Editor Preferences
  defaultTemplate: TemplateId;
  pdfDefaults: PDFOptions;
  
  // Onboarding
  hasSeenAIIntro: boolean;
  hasSeenPreviewHint: boolean;
  hasSeenTailorHint: boolean;
  hasSeenInterviewHint: boolean;
  
  // Integrations
  elevenlabsApiKey: string;
  
  // AI Provider Settings
  aiProvider: AIProvider;
  geminiApiKey: string;
  geminiKeyTier: GeminiKeyTier;
  geminiKeyValidated: boolean;
  geminiDailyUsage: GeminiDailyUsage;
  
  // Actions
  setShowAutoSaveToasts: (value: boolean) => void;
  setShowAIEnhancementTips: (value: boolean) => void;
  setLocalOnlyMode: (value: boolean) => void;
  setAnalyticsEnabled: (value: boolean) => void;
  setBiometricLockEnabled: (value: boolean) => void;
  setBiometricLockTimeout: (timeout: BiometricLockTimeout) => void;
  setDefaultTemplate: (template: TemplateId) => void;
  setPdfDefaults: (defaults: Partial<PDFOptions>) => void;
  setHasSeenAIIntro: (value: boolean) => void;
  setHasSeenPreviewHint: (value: boolean) => void;
  setHasSeenTailorHint: (value: boolean) => void;
  setHasSeenInterviewHint: (value: boolean) => void;
  setElevenlabsApiKey: (key: string) => void;
  
  // AI Provider Actions
  setAIProvider: (provider: AIProvider) => void;
  setGeminiApiKey: (key: string) => void;
  setGeminiKeyTier: (tier: GeminiKeyTier) => void;
  setGeminiKeyValidated: (validated: boolean) => void;
  incrementGeminiDailyUsage: () => void;
  resetGeminiDailyUsage: () => void;
  
  resetSettings: () => void;
}

const defaultSettings = {
  showAutoSaveToasts: true,
  showAIEnhancementTips: true,
  localOnlyMode: false,
  analyticsEnabled: true,
  biometricLockEnabled: false,
  biometricLockTimeout: 30000 as BiometricLockTimeout,
  defaultTemplate: 'modern' as TemplateId,
  pdfDefaults: {
    showPageNumbers: true,
    pageNumberFormat: 'full' as const,
    showBranding: true,
  },
  hasSeenAIIntro: false,
  hasSeenPreviewHint: false,
  hasSeenTailorHint: false,
  hasSeenInterviewHint: false,
  elevenlabsApiKey: '',
  // AI Provider defaults
  aiProvider: 'lovable' as AIProvider,
  geminiApiKey: '',
  geminiKeyTier: 'unknown' as GeminiKeyTier,
  geminiKeyValidated: false,
  geminiDailyUsage: { date: '', count: 0 } as GeminiDailyUsage,
};

// Helper to get Pacific midnight reset
function getTodayPacific(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...defaultSettings,

      setShowAutoSaveToasts: (value) => set({ showAutoSaveToasts: value }),
      setShowAIEnhancementTips: (value) => set({ showAIEnhancementTips: value }),
      setLocalOnlyMode: (value) => set({ localOnlyMode: value }),
      setAnalyticsEnabled: (value) => set({ analyticsEnabled: value }),
      setBiometricLockEnabled: (value) => set({ biometricLockEnabled: value }),
      setBiometricLockTimeout: (timeout) => set({ biometricLockTimeout: timeout }),
      setDefaultTemplate: (template) => set({ defaultTemplate: template }),
      setPdfDefaults: (defaults) =>
        set((state) => ({
          pdfDefaults: { ...state.pdfDefaults, ...defaults },
        })),
      setHasSeenAIIntro: (value) => set({ hasSeenAIIntro: value }),
      setHasSeenPreviewHint: (value) => set({ hasSeenPreviewHint: value }),
      setHasSeenTailorHint: (value) => set({ hasSeenTailorHint: value }),
      setHasSeenInterviewHint: (value) => set({ hasSeenInterviewHint: value }),
      setElevenlabsApiKey: (key) => set({ elevenlabsApiKey: key }),
      
      // AI Provider Actions
      setAIProvider: (provider) => set({ aiProvider: provider }),
      setGeminiApiKey: (key) => set({ 
        geminiApiKey: key,
        geminiKeyValidated: false,
        geminiKeyTier: 'unknown',
      }),
      setGeminiKeyTier: (tier) => set({ geminiKeyTier: tier }),
      setGeminiKeyValidated: (validated) => set({ geminiKeyValidated: validated }),
      incrementGeminiDailyUsage: () => {
        const today = getTodayPacific();
        const current = get().geminiDailyUsage;
        
        if (current.date !== today) {
          // Reset for new day
          set({ geminiDailyUsage: { date: today, count: 1 } });
        } else {
          set({ geminiDailyUsage: { date: today, count: current.count + 1 } });
        }
      },
      resetGeminiDailyUsage: () => set({ geminiDailyUsage: { date: '', count: 0 } }),
      
      resetSettings: () => set(defaultSettings),
    }),
    {
      name: 'wiseresume-settings',
    }
  )
);
