import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TemplateId, PDFOptions } from '@/types/resume';

export type BiometricLockTimeout = 0 | 30000 | 60000 | 300000;
export type AutoSaveToastMode = 'always' | 'errors-only';
export type AITipFrequency = 'daily' | 'weekly' | 'on-demand';

// AI Provider types
export type AIProvider = 'wiseresume' | 'gemini';
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
  quietHoursEnabled: boolean;
  quietHoursStart: string; // HH:mm
  quietHoursEnd: string;   // HH:mm
  
  // Privacy
  shakeToReportEnabled: boolean;
  localOnlyMode: boolean;
  analyticsEnabled: boolean;
  biometricLockEnabled: boolean;
  biometricLockTimeout: BiometricLockTimeout;
  
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
  
  // Proofread
  autoProofread: boolean;
  
  // AI Provider Settings
  aiProvider: AIProvider;
  geminiApiKey: string;
  
  geminiKeyTier: GeminiKeyTier;
  geminiKeyValidated: boolean;
  geminiDailyUsage: GeminiDailyUsage;
  
  // Actions
  setShowAutoSaveToasts: (value: boolean) => void;
  setAutoSaveToastMode: (mode: AutoSaveToastMode) => void;
  setShowAIEnhancementTips: (value: boolean) => void;
  setAITipFrequency: (freq: AITipFrequency) => void;
  setQuietHoursEnabled: (value: boolean) => void;
  setQuietHoursStart: (time: string) => void;
  setQuietHoursEnd: (time: string) => void;
  setShakeToReportEnabled: (value: boolean) => void;
  setLocalOnlyMode: (value: boolean) => void;
  setAnalyticsEnabled: (value: boolean) => void;
  setBiometricLockEnabled: (value: boolean) => void;
  setBiometricLockTimeout: (timeout: BiometricLockTimeout) => void;
  setDefaultTemplate: (template: TemplateId) => void;
  setPdfDefaults: (defaults: Partial<PDFOptions>) => void;
  setHasSeenSplash: (value: boolean) => void;
  setHasSeenAIIntro: (value: boolean) => void;
  setHasSeenPreviewHint: (value: boolean) => void;
  setHasSeenTailorHint: (value: boolean) => void;
  setHasSeenInterviewHint: (value: boolean) => void;
  setHasSeenAIStudioTour: (value: boolean) => void;
  setElevenlabsApiKey: (key: string) => void;
  setAutoProofread: (value: boolean) => void;
  
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
  autoSaveToastMode: 'always' as AutoSaveToastMode,
  showAIEnhancementTips: true,
  aiTipFrequency: 'daily' as AITipFrequency,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  shakeToReportEnabled: true,
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
  hasSeenSplash: false,
  hasSeenAIIntro: false,
  hasSeenPreviewHint: false,
  hasSeenTailorHint: false,
  hasSeenInterviewHint: false,
  hasSeenAIStudioTour: false,
  elevenlabsApiKey: '',
  autoProofread: true,
  // AI Provider defaults
  aiProvider: 'wiseresume' as AIProvider,
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
      setAutoSaveToastMode: (mode) => set({ autoSaveToastMode: mode }),
      setShowAIEnhancementTips: (value) => set({ showAIEnhancementTips: value }),
      setAITipFrequency: (freq) => set({ aiTipFrequency: freq }),
      setQuietHoursEnabled: (value) => set({ quietHoursEnabled: value }),
      setQuietHoursStart: (time) => set({ quietHoursStart: time }),
      setQuietHoursEnd: (time) => set({ quietHoursEnd: time }),
      setShakeToReportEnabled: (value) => set({ shakeToReportEnabled: value }),
      setLocalOnlyMode: (value) => set({ localOnlyMode: value }),
      setAnalyticsEnabled: (value) => set({ analyticsEnabled: value }),
      setBiometricLockEnabled: (value) => set({ biometricLockEnabled: value }),
      setBiometricLockTimeout: (timeout) => set({ biometricLockTimeout: timeout }),
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
      setAutoProofread: (value) => set({ autoProofread: value }),
      
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
      partialize: (state) => {
        // Exclude sensitive keys from localStorage persistence
        // Keys are now stored server-side via manage-api-keys edge function
        const { geminiApiKey, elevenlabsApiKey, ...rest } = state;
        return rest;
      },
    }
  )
);
