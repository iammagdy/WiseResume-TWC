import { useState, useEffect } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ResumeData, JobMatchScore, GapAnalysis, TemplateId, TailorHistory, TailorSectionId, EnhancedTailorResult, CoverLetterContext, MultiJobComparison, JobComparisonEntry, SuperTailorResult, CoverLetterHistory, SectionStyleOverride, TemplateCustomization } from '@/types/resume';
import { migrateTemplateId } from '@/lib/templateMigration';
import { getDefaultCustomization } from '@/lib/templateCustomization';
import { DEFAULT_RESUME_TEMPLATE_ID } from '@/lib/defaultTemplate';
import { TailorIntensity } from '@/lib/aiTailor';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

let hasHydrated = false;
const hydrationListeners: Set<() => void> = new Set();

export const subscribeToHydration = (listener: () => void) => {
  hydrationListeners.add(listener);
  return () => hydrationListeners.delete(listener);
};

export const getResumeStoreHasHydrated = () => hasHydrated;

interface ResumeState {
  currentResume: ResumeData | null;
  currentResumeId: string | null;
  isSaving: boolean;
  lastSavedAt: Date | null;
  jobDescription: string;
  matchScore: JobMatchScore | null;
  gapAnalysis: GapAnalysis | null;
  isAnalyzing: boolean;
  selectedTemplate: TemplateId;
  tailorHistory: TailorHistory[];
  tailorHistoryByResume: Record<string, TailorHistory[]>;
  generatedCoverLetter: string | null;
  coverLetterJobContext: CoverLetterContext | null;
  coverLetterHistory: CoverLetterHistory[];

  // Multi-job comparison
  currentComparison: MultiJobComparison | null;

  // Pending tailor results (persisted so sheet close doesn't lose data)
  pendingTailorResult: SuperTailorResult | null;
  pendingTailorOriginal: ResumeData | null;
  pendingTailorJobInfo: { title: string; company: string } | null;
  pendingTailorSections: TailorSectionId[];
  pendingTailorIntensity: TailorIntensity;
  pendingTailorJobUrl: string | null;

  // Guided intake: signals SummarySection to auto-trigger AI generation on next mount
  pendingSummaryGeneration: boolean;
  setPendingSummaryGeneration: (pending: boolean) => void;

  setCurrentResume: (resume: ResumeData | null) => void;
  setCurrentResumeId: (id: string | null) => void;
  setIsSaving: (saving: boolean) => void;
  setLastSavedAt: (date: Date | null) => void;
  updateResume: (updates: Partial<ResumeData>) => void;
  updateSectionOverride: (sectionName: string, override: Partial<SectionStyleOverride>) => void;
  setJobDescription: (description: string) => void;
  setMatchScore: (score: JobMatchScore | null) => void;
  setGapAnalysis: (analysis: GapAnalysis | null) => void;
  setIsAnalyzing: (analyzing: boolean) => void;
  setSelectedTemplate: (template: TemplateId) => void;
  addTailorHistory: (entry: Omit<TailorHistory, 'id' | 'createdAt'>, resumeId?: string) => void;
  clearTailorHistory: () => void;
  getTailorHistoryForResume: (resumeId: string) => TailorHistory[];
  restoreTailorVersion: (id: string) => void;
  setGeneratedCoverLetter: (letter: string | null, context?: CoverLetterContext) => void;
  addCoverLetterHistory: (entry: Omit<CoverLetterHistory, 'id' | 'createdAt'>) => void;
  deleteCoverLetterHistoryEntry: (id: string) => void;
  clearCoverLetterHistory: () => void;

  // Multi-job comparison actions
  startNewComparison: (resumeId: string, firstJob: Omit<JobComparisonEntry, 'id' | 'createdAt'>) => void;
  addJobToComparison: (job: Omit<JobComparisonEntry, 'id' | 'createdAt'>) => void;
  removeJobFromComparison: (jobId: string) => void;
  selectBestJob: (jobId: string) => void;
  applySelectedJob: () => void;
  clearComparison: () => void;

  // Pending tailor actions
  setPendingTailor: (data: {
    result: SuperTailorResult;
    original: ResumeData;
    jobInfo: { title: string; company: string } | null;
    sections: TailorSectionId[];
    intensity: TailorIntensity;
    jobUrl: string | null;
  }) => void;
  clearPendingTailor: () => void;

  clearAll: () => void;
}

const defaultResume: ResumeData = {
  contactInfo: {
    fullName: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    portfolio: '',
  },
  summary: '',
  experience: [],
  education: [],
  skills: [],
  certifications: [],
  awards: [],
  projects: [],
  publications: [],
  volunteering: [],
  hobbies: [],
  references: [],
  templateId: DEFAULT_RESUME_TEMPLATE_ID,
};

export const useResumeStore = create<ResumeState>()(
  persist(
    (set, get) => ({
      currentResume: null,
      currentResumeId: null,
      isSaving: false,
      lastSavedAt: null,
      jobDescription: '',
      matchScore: null,
      gapAnalysis: null,
      isAnalyzing: false,
      selectedTemplate: DEFAULT_RESUME_TEMPLATE_ID,
      tailorHistory: [],
      tailorHistoryByResume: {},
      generatedCoverLetter: null,
      coverLetterJobContext: null,
      coverLetterHistory: [],
      currentComparison: null,
      pendingTailorResult: null,
      pendingTailorOriginal: null,
      pendingTailorJobInfo: null,
      pendingTailorSections: ['summary', 'skills', 'experience', 'education', 'projects', 'certifications'],
      pendingTailorIntensity: 'moderate' as TailorIntensity,
      pendingTailorJobUrl: null,
      pendingSummaryGeneration: false,

      setPendingSummaryGeneration: (pending) => set({ pendingSummaryGeneration: pending }),

      setCurrentResume: (resume) => set({
        currentResume: resume,
        ...(resume ? { selectedTemplate: migrateTemplateId(resume.templateId) } : {}),
      }),
      setCurrentResumeId: (id) => set({ currentResumeId: id }),
      setIsSaving: (saving) => set({ isSaving: saving }),
      setLastSavedAt: (date) => set({ lastSavedAt: date }),

      updateResume: (updates) => set((state) => {
        // Sanitize array fields to prevent corrupted data from AI
        const sanitized = { ...updates };
        if ('experience' in sanitized && !Array.isArray(sanitized.experience)) {
          sanitized.experience = [];
        }
        if ('education' in sanitized && !Array.isArray(sanitized.education)) {
          sanitized.education = [];
        }
        if ('skills' in sanitized) {
          if (!Array.isArray(sanitized.skills)) {
            sanitized.skills = [];
          } else {
            sanitized.skills = sanitized.skills.map((s: unknown) =>
              typeof s === 'string' ? s : (s as Record<string, string>)?.name || String(s)
            );
          }
        }

        const prev = state.currentResume;
        const templateChanged =
          sanitized.templateId &&
          prev?.templateId &&
          sanitized.templateId !== prev.templateId;
        const hadCustomBreaks = (prev?.customization?.customBreakPositions?.length ?? 0) > 0;

        if (templateChanged && hadCustomBreaks) {
          const baseCustomization = { ...(prev?.customization ?? {}), ...(sanitized.customization ?? {}) };
          delete baseCustomization.customBreakPositions;
          sanitized.customization = baseCustomization;
          queueMicrotask(() => {
            toast.info('Page cuts were reset for the new template. Tap the page count to set them again.', {
              duration: 4000,
            });
          });
        }

        return {
          currentResume: prev
            ? { ...prev, ...sanitized }
            : { ...defaultResume, ...sanitized }
        };
      }),

      updateSectionOverride: (sectionName, override) => set((state) => {
        if (!state.currentResume) return state;
        const baseCustomization: TemplateCustomization =
          state.currentResume.customization ?? getDefaultCustomization();
        const existingMap = baseCustomization.sectionOverrides ?? {};
        const nextMap: Record<string, SectionStyleOverride> = { ...existingMap };
        // Empty object => clear all overrides for this section.
        if (override && Object.keys(override).length === 0) {
          delete nextMap[sectionName];
        } else {
          const merged: SectionStyleOverride = {
            ...(existingMap[sectionName] ?? {}),
            ...override,
          };
          // Strip keys explicitly set to undefined so the override map only
          // carries real values (keeps the per-section CSS minimal and lets
          // callers "clear one knob" by passing `{ paddingTop: undefined }`).
          for (const k of Object.keys(merged) as Array<keyof SectionStyleOverride>) {
            if (merged[k] === undefined) delete merged[k];
          }
          if (Object.keys(merged).length === 0) {
            delete nextMap[sectionName];
          } else {
            nextMap[sectionName] = merged;
          }
        }
        return {
          currentResume: {
            ...state.currentResume,
            customization: {
              ...baseCustomization,
              sectionOverrides: nextMap,
            },
          },
        };
      }),

      setJobDescription: (description) => set({ jobDescription: description }),
      setMatchScore: (score) => set({ matchScore: score }),
      setGapAnalysis: (analysis) => set({ gapAnalysis: analysis }),
      setIsAnalyzing: (analyzing) => set({ isAnalyzing: analyzing }),
      setSelectedTemplate: (template) => set({ selectedTemplate: template }),

      addTailorHistory: (entry, resumeId) => set((state) => {
        const newEntry = {
          ...entry,
          id: uuidv4(),
          createdAt: new Date().toISOString(),
        };
        const newHistory = [newEntry, ...state.tailorHistory.slice(0, 9)];

        // Also store by resume ID
        const byResume = { ...state.tailorHistoryByResume };
        if (resumeId) {
          byResume[resumeId] = [newEntry, ...(byResume[resumeId] || []).slice(0, 4)];
        }

        return { tailorHistory: newHistory, tailorHistoryByResume: byResume };
      }),

      clearTailorHistory: () => set({ tailorHistory: [], tailorHistoryByResume: {} }),

      getTailorHistoryForResume: (resumeId: string) => {
        return get().tailorHistoryByResume[resumeId] || [];
      },

      restoreTailorVersion: (id) => {
        const state = get();
        const entry = state.tailorHistory.find(h => h.id === id);
        if (entry && state.currentResume) {
          const result = entry.tailorResult;
          set({
            currentResume: {
              ...state.currentResume,
              summary: result.summary,
              skills: result.skills,
              experience: result.experience,
              education: result.education,
            },
            jobDescription: entry.jobDescription,
          });
        }
      },

      setGeneratedCoverLetter: (letter, context) => set({
        generatedCoverLetter: letter,
        coverLetterJobContext: context || null,
      }),

      addCoverLetterHistory: (entry) => set((state) => {
        const newEntry: CoverLetterHistory = {
          ...entry,
          id: uuidv4(),
          createdAt: new Date().toISOString(),
        };
        return {
          coverLetterHistory: [newEntry, ...state.coverLetterHistory.slice(0, 19)],
        };
      }),

      deleteCoverLetterHistoryEntry: (id) => set((state) => ({
        coverLetterHistory: state.coverLetterHistory.filter(e => e.id !== id),
      })),

      clearCoverLetterHistory: () => set({ coverLetterHistory: [] }),

      startNewComparison: (resumeId, firstJob) => set({
        currentComparison: {
          id: uuidv4(),
          resumeId,
          jobs: [{
            ...firstJob,
            id: uuidv4(),
            createdAt: new Date().toISOString(),
          }],
          selectedJobId: null,
          createdAt: new Date().toISOString(),
        },
      }),

      addJobToComparison: (job) => set((state) => {
        if (!state.currentComparison || state.currentComparison.jobs.length >= 4) {
          return state;
        }
        return {
          currentComparison: {
            ...state.currentComparison,
            jobs: [
              ...state.currentComparison.jobs,
              {
                ...job,
                id: uuidv4(),
                createdAt: new Date().toISOString(),
              },
            ],
          },
        };
      }),

      removeJobFromComparison: (jobId) => set((state) => {
        if (!state.currentComparison) return state;
        const newJobs = state.currentComparison.jobs.filter(j => j.id !== jobId);
        if (newJobs.length === 0) {
          return { currentComparison: null };
        }
        return {
          currentComparison: {
            ...state.currentComparison,
            jobs: newJobs,
            selectedJobId: state.currentComparison.selectedJobId === jobId
              ? null
              : state.currentComparison.selectedJobId,
          },
        };
      }),

      selectBestJob: (jobId) => set((state) => {
        if (!state.currentComparison) return state;
        return {
          currentComparison: {
            ...state.currentComparison,
            selectedJobId: jobId,
          },
        };
      }),

      applySelectedJob: () => {
        const state = get();
        if (!state.currentComparison || !state.currentComparison.selectedJobId) return;

        const selectedJob = state.currentComparison.jobs.find(
          j => j.id === state.currentComparison?.selectedJobId
        );

        if (!selectedJob || !state.currentResume) return;

        const result = selectedJob.tailorResult;
        set({
          currentResume: {
            ...state.currentResume,
            summary: result.summary,
            skills: result.skills,
            experience: result.experience,
            education: result.education,
          },
          jobDescription: selectedJob.jobDescription,
          currentComparison: null,
        });
      },

      clearComparison: () => set({ currentComparison: null }),

      setPendingTailor: (data) => set({
        pendingTailorResult: data.result,
        pendingTailorOriginal: data.original,
        pendingTailorJobInfo: data.jobInfo,
        pendingTailorSections: data.sections,
        pendingTailorIntensity: data.intensity,
        pendingTailorJobUrl: data.jobUrl,
      }),

      clearPendingTailor: () => set({
        pendingTailorResult: null,
        pendingTailorOriginal: null,
        pendingTailorJobInfo: null,
        pendingTailorSections: ['summary', 'skills', 'experience', 'education', 'projects', 'certifications'],
        pendingTailorIntensity: 'moderate' as TailorIntensity,
        pendingTailorJobUrl: null,
      }),

      clearAll: () => set({
        currentResume: null,
        currentResumeId: null,
        isSaving: false,
        lastSavedAt: null,
        jobDescription: '',
        matchScore: null,
        gapAnalysis: null,
        isAnalyzing: false,
        selectedTemplate: DEFAULT_RESUME_TEMPLATE_ID,
        tailorHistory: [],
        tailorHistoryByResume: {},
        generatedCoverLetter: null,
        coverLetterJobContext: null,
        coverLetterHistory: [],
        currentComparison: null,
        pendingTailorResult: null,
        pendingTailorOriginal: null,
        pendingTailorJobInfo: null,
        pendingTailorSections: ['summary', 'skills', 'experience', 'education', 'projects', 'certifications'],
        pendingTailorIntensity: 'moderate' as TailorIntensity,
        pendingTailorJobUrl: null,
        pendingSummaryGeneration: false,
      }),
    }),
    {
      name: 'resume-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentResume: state.currentResume,
        currentResumeId: state.currentResumeId,
        selectedTemplate: state.selectedTemplate,
        tailorHistory: state.tailorHistory,
        tailorHistoryByResume: state.tailorHistoryByResume,
        coverLetterHistory: state.coverLetterHistory,
      }),
      onRehydrateStorage: () => {
        return (state) => {
          if (state) {
            // Always migrate — even if selectedTemplate is falsy (undefined / '')
            // so that stale persisted storage never produces an unrecognised ID.
            state.selectedTemplate = migrateTemplateId(state.selectedTemplate);
          }
          hasHydrated = true;
          hydrationListeners.forEach(listener => listener());
        };
      },
    }
  )
);

export const useResumeStoreHydration = () => {
  const [hydrated, setHydrated] = useState(getResumeStoreHasHydrated);
  useEffect(() => {
    if (hydrated) return;
    if (getResumeStoreHasHydrated()) {
      setHydrated(true);
      return;
    }
    const unsub = subscribeToHydration(() => setHydrated(true));
    return () => { unsub(); };
  }, [hydrated]);
  return hydrated;
};
