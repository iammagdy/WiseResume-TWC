import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TemplateId, PDFOptions } from '@/types/resume';

export type BiometricLockTimeout = 0 | 30000 | 60000 | 300000;
export type AutoSaveToastMode = 'always' | 'errors-only';
export type AITipFrequency = 'daily' | 'weekly' | 'on-demand';

// AI Provider types
export type AIProvider = 'wiseresume' | 'openai' | 'anthropic' | 'gemini' | 'groq' | 'mistral' | 'xai' | 'cohere' | 'openrouter' | 'ollama';
export type GeminiKeyTier = 'free' | 'paid' | 'unknown';
export type WiseresumeSubProvider = 'openrouter' | 'groq' | 'auto';

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
  
  // AI Provider Settings
  aiProvider: AIProvider;
  /** Stores a masked preview of the key (e.g. AIza...xyz). The full key is only in the server DB. */
  geminiApiKey: string;
  geminiKeyTier: GeminiKeyTier;
  geminiKeyValidated: boolean;
  geminiDailyUsage: GeminiDailyUsage;
  geminiModel: string;
  
  // Ollama Provider Settings (in-memory only, keys stored server-side)
  ollamaApiKey: string;
  ollamaBaseUrl: string;
  ollamaModel: string;
  ollamaKeyValidated: boolean;
  
  // OpenRouter Provider Settings (in-memory only, keys stored server-side)
  openrouterApiKey: string;
  openrouterModel: string;
  openrouterKeyValidated: boolean;

  // WiseResume AI sub-provider selection
  wiseresumeSubProvider: WiseresumeSubProvider;

  // ── New BYOK providers ─────────────────────────────────────────────────────
  // OpenAI
  openaiApiKey: string;
  openaiModel: string;
  openaiKeyValidated: boolean;
  // Anthropic (Claude)
  anthropicApiKey: string;
  anthropicModel: string;
  anthropicKeyValidated: boolean;
  // Groq (user BYOK key, distinct from managed WiseResume Groq)
  groqApiKey: string;
  groqModel: string;
  groqKeyValidated: boolean;
  // Mistral AI
  mistralApiKey: string;
  mistralModel: string;
  mistralKeyValidated: boolean;
  // xAI (Grok)
  xaiApiKey: string;
  xaiModel: string;
  xaiKeyValidated: boolean;
  // Cohere
  cohereApiKey: string;
  cohereModel: string;
  cohereKeyValidated: boolean;
  // ──────────────────────────────────────────────────────────────────────────
  
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
  
  // AI Provider Actions
  setAIProvider: (provider: AIProvider) => void;
  setGeminiApiKey: (key: string) => void;
  setGeminiKeyTier: (tier: GeminiKeyTier) => void;
  setGeminiKeyValidated: (validated: boolean) => void;
  setGeminiModel: (model: string) => void;
  incrementGeminiDailyUsage: () => void;
  resetGeminiDailyUsage: () => void;
  
  // Ollama Actions
  setOllamaApiKey: (key: string) => void;
  setOllamaBaseUrl: (url: string) => void;
  setOllamaModel: (model: string) => void;
  setOllamaKeyValidated: (validated: boolean) => void;
  
  // OpenRouter Actions
  setOpenrouterApiKey: (key: string) => void;
  setOpenrouterModel: (model: string) => void;
  setOpenrouterKeyValidated: (validated: boolean) => void;

  // WiseResume sub-provider
  setWiseresumeSubProvider: (sub: WiseresumeSubProvider) => void;

  // New BYOK provider actions
  setOpenaiApiKey: (key: string) => void;
  setOpenaiModel: (model: string) => void;
  setOpenaiKeyValidated: (validated: boolean) => void;
  setAnthropicApiKey: (key: string) => void;
  setAnthropicModel: (model: string) => void;
  setAnthropicKeyValidated: (validated: boolean) => void;
  setGroqApiKey: (key: string) => void;
  setGroqModel: (model: string) => void;
  setGroqKeyValidated: (validated: boolean) => void;
  setMistralApiKey: (key: string) => void;
  setMistralModel: (model: string) => void;
  setMistralKeyValidated: (validated: boolean) => void;
  setXaiApiKey: (key: string) => void;
  setXaiModel: (model: string) => void;
  setXaiKeyValidated: (validated: boolean) => void;
  setCohereApiKey: (key: string) => void;
  setCohereModel: (model: string) => void;
  setCohereKeyValidated: (validated: boolean) => void;
  
  resetSettings: () => void;
  resetUserSettings: () => void;
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
  // AI Provider defaults
  aiProvider: 'wiseresume' as AIProvider,
  geminiApiKey: '',
  geminiKeyTier: 'unknown' as GeminiKeyTier,
  geminiKeyValidated: false,
  geminiDailyUsage: { date: '', count: 0 } as GeminiDailyUsage,
  geminiModel: 'gemini-2.5-flash',
  // Ollama defaults
  ollamaApiKey: '',
  ollamaBaseUrl: '',
  ollamaModel: '',
  ollamaKeyValidated: false,
  // OpenRouter defaults
  openrouterApiKey: '',
  openrouterModel: '',
  openrouterKeyValidated: false,
  // WiseResume sub-provider default
  wiseresumeSubProvider: 'auto' as WiseresumeSubProvider,
  // New BYOK provider defaults
  openaiApiKey: '',
  openaiModel: 'gpt-4o-mini',
  openaiKeyValidated: false,
  anthropicApiKey: '',
  anthropicModel: 'claude-3-5-haiku-20241022',
  anthropicKeyValidated: false,
  groqApiKey: '',
  groqModel: 'qwen/qwen3-32b',
  groqKeyValidated: false,
  mistralApiKey: '',
  mistralModel: 'mistral-small-latest',
  mistralKeyValidated: false,
  xaiApiKey: '',
  xaiModel: 'grok-2-mini',
  xaiKeyValidated: false,
  cohereApiKey: '',
  cohereModel: 'command-r',
  cohereKeyValidated: false,
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
      
      // AI Provider Actions
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
      
      // Ollama Actions
      setOllamaApiKey: (key) => set({ ollamaApiKey: key, ollamaKeyValidated: false }),
      setOllamaBaseUrl: (url) => set({ ollamaBaseUrl: url }),
      setOllamaModel: (model) => set({ ollamaModel: model }),
      setOllamaKeyValidated: (validated) => set({ ollamaKeyValidated: validated }),
      
      // OpenRouter Actions
      setOpenrouterApiKey: (key) => set({ openrouterApiKey: key, openrouterKeyValidated: false }),
      setOpenrouterModel: (model) => set({ openrouterModel: model }),
      setOpenrouterKeyValidated: (validated) => set({ openrouterKeyValidated: validated }),

      // WiseResume sub-provider
      setWiseresumeSubProvider: (sub) => set({ wiseresumeSubProvider: sub }),

      // New BYOK provider actions
      setOpenaiApiKey: (key) => set({ openaiApiKey: key, openaiKeyValidated: false }),
      setOpenaiModel: (model) => set({ openaiModel: model }),
      setOpenaiKeyValidated: (validated) => set({ openaiKeyValidated: validated }),
      setAnthropicApiKey: (key) => set({ anthropicApiKey: key, anthropicKeyValidated: false }),
      setAnthropicModel: (model) => set({ anthropicModel: model }),
      setAnthropicKeyValidated: (validated) => set({ anthropicKeyValidated: validated }),
      setGroqApiKey: (key) => set({ groqApiKey: key, groqKeyValidated: false }),
      setGroqModel: (model) => set({ groqModel: model }),
      setGroqKeyValidated: (validated) => set({ groqKeyValidated: validated }),
      setMistralApiKey: (key) => set({ mistralApiKey: key, mistralKeyValidated: false }),
      setMistralModel: (model) => set({ mistralModel: model }),
      setMistralKeyValidated: (validated) => set({ mistralKeyValidated: validated }),
      setXaiApiKey: (key) => set({ xaiApiKey: key, xaiKeyValidated: false }),
      setXaiModel: (model) => set({ xaiModel: model }),
      setXaiKeyValidated: (validated) => set({ xaiKeyValidated: validated }),
      setCohereApiKey: (key) => set({ cohereApiKey: key, cohereKeyValidated: false }),
      setCohereModel: (model) => set({ cohereModel: model }),
      setCohereKeyValidated: (validated) => set({ cohereKeyValidated: validated }),
      
      resetSettings: () => set(defaultSettings),

      resetUserSettings: () => set((state) => ({
        ...defaultSettings,
        // Preserve one-time flags that are device/user experience state,
        // not account-specific data. These should never reset on sign-out.
        // Note: hasSeenSplash is intentionally NOT preserved — splash shows on every fresh load.
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
        // Exclude sensitive keys from localStorage persistence
        // Keys are now stored server-side via manage-api-keys edge function
        // lpProduct is ephemeral session state — never persisted
        // hasSeenSplash is session-only — splash shows on every cold page load
        const {
          geminiApiKey, elevenlabsApiKey, ollamaApiKey, openrouterApiKey,
          openaiApiKey, anthropicApiKey, groqApiKey, mistralApiKey, xaiApiKey, cohereApiKey,
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          lpProduct: _lpProduct,
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          hasSeenSplash: _hasSeenSplash,
          ...rest
        } = state;
        return rest;
      },
      // Strip legacy persisted hasSeenSplash so existing users who have
      // hasSeenSplash: true in localStorage still see the splash on every
      // fresh page load after this migration.
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hasSeenSplash = false;
        }
      },
    }
  )
);
