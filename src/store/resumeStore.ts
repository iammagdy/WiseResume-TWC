import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ResumeData, JobMatchScore, GapAnalysis, TemplateId, PageBreakSettings, TailorHistory, TailorSectionId, EnhancedTailorResult, CoverLetterContext, MultiJobComparison, JobComparisonEntry, SuperTailorResult } from '@/types/resume';
import { v4 as uuidv4 } from 'uuid';

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
  pageBreakSettings: PageBreakSettings;
  tailorHistory: TailorHistory[];
  tailorHistoryByResume: Record<string, TailorHistory[]>;
  generatedCoverLetter: string | null;
  coverLetterJobContext: CoverLetterContext | null;
  
  // Multi-job comparison
  currentComparison: MultiJobComparison | null;
  
  setCurrentResume: (resume: ResumeData | null) => void;
  setCurrentResumeId: (id: string | null) => void;
  setIsSaving: (saving: boolean) => void;
  setLastSavedAt: (date: Date | null) => void;
  updateResume: (updates: Partial<ResumeData>) => void;
  setJobDescription: (description: string) => void;
  setMatchScore: (score: JobMatchScore | null) => void;
  setGapAnalysis: (analysis: GapAnalysis | null) => void;
  setIsAnalyzing: (analyzing: boolean) => void;
  setSelectedTemplate: (template: TemplateId) => void;
  setPageBreakSettings: (settings: PageBreakSettings) => void;
  addTailorHistory: (entry: Omit<TailorHistory, 'id' | 'createdAt'>, resumeId?: string) => void;
  clearTailorHistory: () => void;
  getTailorHistoryForResume: (resumeId: string) => TailorHistory[];
  restoreTailorVersion: (id: string) => void;
  setGeneratedCoverLetter: (letter: string | null, context?: CoverLetterContext) => void;
  
  // Multi-job comparison actions
  startNewComparison: (resumeId: string, firstJob: Omit<JobComparisonEntry, 'id' | 'createdAt'>) => void;
  addJobToComparison: (job: Omit<JobComparisonEntry, 'id' | 'createdAt'>) => void;
  removeJobFromComparison: (jobId: string) => void;
  selectBestJob: (jobId: string) => void;
  applySelectedJob: () => void;
  clearComparison: () => void;
  
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
  templateId: 'modern',
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
      selectedTemplate: 'modern',
      pageBreakSettings: { mode: 'auto', breakAfterSections: [] },
      tailorHistory: [],
      tailorHistoryByResume: {},
      generatedCoverLetter: null,
      coverLetterJobContext: null,
      currentComparison: null,

      setCurrentResume: (resume) => set({ currentResume: resume }),
      setCurrentResumeId: (id) => set({ currentResumeId: id }),
      setIsSaving: (saving) => set({ isSaving: saving }),
      setLastSavedAt: (date) => set({ lastSavedAt: date }),
      
      updateResume: (updates) => set((state) => ({
        currentResume: state.currentResume 
          ? { ...state.currentResume, ...updates }
          : { ...defaultResume, ...updates }
      })),
      
      setJobDescription: (description) => set({ jobDescription: description }),
      setMatchScore: (score) => set({ matchScore: score }),
      setGapAnalysis: (analysis) => set({ gapAnalysis: analysis }),
      setIsAnalyzing: (analyzing) => set({ isAnalyzing: analyzing }),
      setSelectedTemplate: (template) => set({ selectedTemplate: template }),
      setPageBreakSettings: (settings) => set({ pageBreakSettings: settings }),
      
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
      
      clearAll: () => set({
        currentResume: null,
        currentResumeId: null,
        isSaving: false,
        lastSavedAt: null,
        jobDescription: '',
        matchScore: null,
        gapAnalysis: null,
        isAnalyzing: false,
        selectedTemplate: 'modern',
        pageBreakSettings: { mode: 'auto', breakAfterSections: [] },
        tailorHistory: [],
        tailorHistoryByResume: {},
        generatedCoverLetter: null,
        coverLetterJobContext: null,
        currentComparison: null,
      }),
    }),
    {
      name: 'resume-storage',
    }
  )
);
