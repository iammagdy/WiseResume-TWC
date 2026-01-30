import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ResumeData, JobMatchScore, GapAnalysis, TemplateId } from '@/types/resume';

interface ResumeState {
  currentResume: ResumeData | null;
  jobDescription: string;
  matchScore: JobMatchScore | null;
  gapAnalysis: GapAnalysis | null;
  isAnalyzing: boolean;
  selectedTemplate: TemplateId;
  
  setCurrentResume: (resume: ResumeData | null) => void;
  updateResume: (updates: Partial<ResumeData>) => void;
  setJobDescription: (description: string) => void;
  setMatchScore: (score: JobMatchScore | null) => void;
  setGapAnalysis: (analysis: GapAnalysis | null) => void;
  setIsAnalyzing: (analyzing: boolean) => void;
  setSelectedTemplate: (template: TemplateId) => void;
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
    (set) => ({
      currentResume: null,
      jobDescription: '',
      matchScore: null,
      gapAnalysis: null,
      isAnalyzing: false,
      selectedTemplate: 'modern',

      setCurrentResume: (resume) => set({ currentResume: resume }),
      
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
      
      clearAll: () => set({
        currentResume: null,
        jobDescription: '',
        matchScore: null,
        gapAnalysis: null,
        isAnalyzing: false,
        selectedTemplate: 'modern',
      }),
    }),
    {
      name: 'resume-storage',
    }
  )
);
