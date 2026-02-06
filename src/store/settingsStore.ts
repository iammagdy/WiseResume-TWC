import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TemplateId, PDFOptions } from '@/types/resume';

export type BiometricLockTimeout = 0 | 30000 | 60000 | 300000;

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
  
  // Integrations
  elevenlabsApiKey: string;
  
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
  setElevenlabsApiKey: (key: string) => void;
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
  elevenlabsApiKey: '',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
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
      setElevenlabsApiKey: (key) => set({ elevenlabsApiKey: key }),
      resetSettings: () => set(defaultSettings),
    }),
    {
      name: 'wiseresume-settings',
    }
  )
);
