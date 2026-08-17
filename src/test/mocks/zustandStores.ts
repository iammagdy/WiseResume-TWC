import { vi } from "vitest";
import type { ResumeData } from "@/types/resume";

// Minimal mock resume for tests
export const mockResume: Partial<ResumeData> = {
  contactInfo: {
    fullName: "Jane Doe",
    email: "jane@example.com",
    phone: "555-1234",
    location: "San Francisco, CA",
  },
  summary: "Experienced software engineer with 5 years in web development.",
  experience: [],
  education: [],
  skills: [],
  certifications: [],
  templateId: "wiseresume-classic",
};

// Mock useResumeStore
const mockResumeStore = {
  currentResume: mockResume as ResumeData,
  currentResumeId: "mock-resume-id",
  isSaving: false,
  lastSavedAt: null,
  jobDescription: "",
  matchScore: null,
  gapAnalysis: null,
  isAnalyzing: false,
  selectedTemplate: "wiseresume-classic" as const,
  defaultTemplate: "wiseresume-classic" as const,
  tailorHistory: [],
  tailorHistoryByResume: {},
  coverLetterHistory: [],
  generatedCoverLetter: null,
  setCurrentResume: vi.fn(),
  setCurrentResumeId: vi.fn(),
  updateResume: vi.fn(),
  setJobDescription: vi.fn(),
  setMatchScore: vi.fn(),
  setGapAnalysis: vi.fn(),
  setIsAnalyzing: vi.fn(),
  setSelectedTemplate: vi.fn(),
  addTailorHistory: vi.fn(),
  clearTailorHistory: vi.fn(),
  addCoverLetterHistory: vi.fn(),
  deleteCoverLetterHistoryEntry: vi.fn(),
  clearCoverLetterHistory: vi.fn(),
  setGeneratedCoverLetter: vi.fn(),
  saveResume: vi.fn().mockResolvedValue(undefined),
  multiJobComparisons: [],
  setMultiJobComparisons: vi.fn(),
};

// Mock useSettingsStore
const mockSettingsStore = {
  showAutoSaveToasts: true,
  biometricLockEnabled: false,
  biometricLockTimeout: 0,
  aiTipFrequency: "on-demand" as const,
  selectedTemplate: "wiseresume-classic" as const,
  defaultTemplate: "wiseresume-classic" as const,
  pdfDefaults: {
    showPageNumbers: true,
    pageNumberFormat: "full" as const,
    showBranding: true,
  },
  lastExportType: null as string | null,
  byokGeminiKey: null,
  byokOllamaUrl: null,
  aiProvider: "wiseresume" as const,
  setShowAutoSaveToasts: vi.fn(),
  setBiometricLockEnabled: vi.fn(),
  setAITipFrequency: vi.fn(),
  setSelectedTemplate: vi.fn(),
  setPdfDefaults: vi.fn(),
  setLastExportType: vi.fn(),
  setByokGeminiKey: vi.fn(),
  setByokOllamaUrl: vi.fn(),
  setAIProvider: vi.fn(),
};

// Mock useOfflineSyncStore
const mockOfflineSyncStore = {
  pendingChanges: [],
  addPendingChange: vi.fn(),
  removePendingChange: vi.fn(),
  getPendingCount: vi.fn().mockReturnValue(0),
  clearAll: vi.fn(),
};

const useResumeStoreFn = vi.fn((selector?: (s: typeof mockResumeStore) => unknown) =>
  selector ? selector(mockResumeStore) : mockResumeStore
);
Object.assign(useResumeStoreFn, {
  getState: () => mockResumeStore,
  setState: vi.fn(),
  subscribe: vi.fn(() => () => {}),
});

vi.mock("@/store/resumeStore", () => ({
  useResumeStore: useResumeStoreFn,
  useResumeStoreHydration: vi.fn(() => true),
  subscribeToHydration: vi.fn(() => () => {}),
  getResumeStoreHasHydrated: vi.fn(() => true),
}));

const useSettingsStoreFn = vi.fn((selector?: (s: typeof mockSettingsStore) => unknown) =>
  selector ? selector(mockSettingsStore) : mockSettingsStore
);
Object.assign(useSettingsStoreFn, {
  getState: () => mockSettingsStore,
  setState: vi.fn(),
  subscribe: vi.fn(() => () => {}),
});

vi.mock("@/store/settingsStore", () => ({
  useSettingsStore: useSettingsStoreFn,
}));

const useOfflineSyncStoreFn = vi.fn((selector?: (s: typeof mockOfflineSyncStore) => unknown) =>
  selector ? selector(mockOfflineSyncStore) : mockOfflineSyncStore
);
Object.assign(useOfflineSyncStoreFn, {
  getState: () => mockOfflineSyncStore,
  setState: vi.fn(),
  subscribe: vi.fn(() => () => {}),
});

vi.mock("@/store/offlineSyncStore", () => ({
  useOfflineSyncStore: useOfflineSyncStoreFn,
}));

export { mockResumeStore, mockSettingsStore, mockOfflineSyncStore };
