import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ResumeData, JobMatchScore, GapAnalysis, TemplateId, PageBreakSettings, TailorHistory, TailorSectionId, EnhancedTailorResult, CoverLetterContext } from '@/types/resume';
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
  generatedCoverLetter: string | null;
  coverLetterJobContext: CoverLetterContext | null;
  
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
  addTailorHistory: (entry: Omit<TailorHistory, 'id' | 'createdAt'>) => void;
  clearTailorHistory: () => void;
  restoreTailorVersion: (id: string) => void;
  setGeneratedCoverLetter: (letter: string | null, context?: CoverLetterContext) => void;
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
      generatedCoverLetter: null,
      coverLetterJobContext: null,

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
      
      addTailorHistory: (entry) => set((state) => ({
        tailorHistory: [
          {
            ...entry,
            id: uuidv4(),
            createdAt: new Date().toISOString(),
          },
          ...state.tailorHistory.slice(0, 9), // Keep last 10
        ],
      })),
      
      clearTailorHistory: () => set({ tailorHistory: [] }),
      
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
        generatedCoverLetter: null,
        coverLetterJobContext: null,
      }),
    }),
    {
      name: 'resume-storage',
    }
  )
);
