import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TemplateId, PDFOptions } from '@/types/resume';

interface SettingsState {
  // Notifications
  showAutoSaveToasts: boolean;
  showAIEnhancementTips: boolean;
  
  // Privacy
  localOnlyMode: boolean;
  analyticsEnabled: boolean;
  
  // Editor Preferences
  defaultTemplate: TemplateId;
  pdfDefaults: PDFOptions;
  
  // Onboarding
  hasSeenAIIntro: boolean;
   biometricLockEnabled: boolean;
  
  // Actions
  setShowAutoSaveToasts: (value: boolean) => void;
  setShowAIEnhancementTips: (value: boolean) => void;
  setLocalOnlyMode: (value: boolean) => void;
  setAnalyticsEnabled: (value: boolean) => void;
  setDefaultTemplate: (template: TemplateId) => void;
  setPdfDefaults: (defaults: Partial<PDFOptions>) => void;
  setHasSeenAIIntro: (value: boolean) => void;
   setBiometricLockEnabled: (value: boolean) => void;
  resetSettings: () => void;
}

const defaultSettings = {
  showAutoSaveToasts: true,
  showAIEnhancementTips: true,
  localOnlyMode: false,
  analyticsEnabled: true,
  defaultTemplate: 'modern' as TemplateId,
  pdfDefaults: {
    showPageNumbers: true,
    pageNumberFormat: 'full' as const,
    showBranding: true,
  },
  hasSeenAIIntro: false,
   biometricLockEnabled: false,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,

      setShowAutoSaveToasts: (value) => set({ showAutoSaveToasts: value }),
      setShowAIEnhancementTips: (value) => set({ showAIEnhancementTips: value }),
      setLocalOnlyMode: (value) => set({ localOnlyMode: value }),
      setAnalyticsEnabled: (value) => set({ analyticsEnabled: value }),
      setDefaultTemplate: (template) => set({ defaultTemplate: template }),
      setPdfDefaults: (defaults) =>
        set((state) => ({
          pdfDefaults: { ...state.pdfDefaults, ...defaults },
        })),
      setHasSeenAIIntro: (value) => set({ hasSeenAIIntro: value }),
       setBiometricLockEnabled: (value) => set({ biometricLockEnabled: value }),
      resetSettings: () => set(defaultSettings),
    }),
    {
      name: 'wiseresume-settings',
    }
  )
);
