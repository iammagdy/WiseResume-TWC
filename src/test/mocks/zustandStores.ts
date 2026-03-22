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
  templateId: "modern",
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
  selectedTemplate: "modern" as const,
  tailorHistory: [],
  tailorHistoryByResume: {},
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
  setGeneratedCoverLetter: vi.fn(),
  saveResume: vi.fn().mockResolvedValue(undefined),
};

// Mock useSettingsStore
const mockSettingsStore = {
  showAutoSaveToasts: true,
  biometricLockEnabled: false,
  biometricLockTimeout: 0,
  aiTipFrequency: "on-demand" as const,
  selectedTemplate: "modern" as const,
  byokGeminiKey: null,
  byokOllamaUrl: null,
  aiProvider: "wiseresume" as const,
  setShowAutoSaveToasts: vi.fn(),
  setBiometricLockEnabled: vi.fn(),
  setAITipFrequency: vi.fn(),
  setSelectedTemplate: vi.fn(),
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

vi.mock("@/store/resumeStore", () => ({
  useResumeStore: vi.fn((selector?: (s: typeof mockResumeStore) => unknown) =>
    selector ? selector(mockResumeStore) : mockResumeStore
  ),
  useResumeStoreHydration: vi.fn(() => true),
  subscribeToHydration: vi.fn(),
  getResumeStoreHasHydrated: vi.fn(() => true),
}));

vi.mock("@/store/settingsStore", () => ({
  useSettingsStore: vi.fn((selector?: (s: typeof mockSettingsStore) => unknown) =>
    selector ? selector(mockSettingsStore) : mockSettingsStore
  ),
}));

vi.mock("@/store/offlineSyncStore", () => ({
  useOfflineSyncStore: vi.fn((selector?: (s: typeof mockOfflineSyncStore) => unknown) =>
    selector ? selector(mockOfflineSyncStore) : mockOfflineSyncStore
  ),
}));

export { mockResumeStore, mockSettingsStore, mockOfflineSyncStore };
