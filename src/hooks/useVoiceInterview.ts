/**
 * Stub — voice mode in interviews has been removed. Interviews are now
 * text-only (via the agentic chat). The hook keeps a wide return shape
 * so the legacy InterviewPage and its sub-components still compile and
 * render their empty states; every callback is a no-op and every flag
 * is false / null.
 */

import type { ResumeData } from '@/types/resume';

export type InterviewStatus =
  | 'idle'
  | 'ready'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'error';

export type SttEngine = 'browser' | 'webspeech' | 'elevenlabs' | 'none';
export type VoiceGender = 'male' | 'female';

export interface TranscriptEntry {
  role: 'user' | 'assistant' | 'interviewer';
  text: string;
  timestamp: number | string | Date;
  id?: string;
  [k: string]: unknown;
}

export interface AnswerScore {
  score: number;
  feedback: string;
  strengths?: string[];
  improvements?: string[];
  questionIndex?: number;
  tip?: string;
  improvedAnswer?: string;
  [k: string]: unknown;
}

export interface RoleAnalysis {
  role: string;
  level?: string;
  skills?: string[];
  categories?: { name: string; weight: number }[];
  title?: string;
  keySkills?: string[];
  questionCategories?: Array<{
    name: string;
    description?: string;
    [k: string]: unknown;
  }>;
  industryInsights?: string;
  [k: string]: unknown;
}

export interface UseVoiceInterviewReturn {
  // status & transcript
  status: InterviewStatus;
  transcript: TranscriptEntry[];
  isStarted: boolean;
  summary: string | null;
  error: string | null;
  interimText: string;

  // capabilities
  speechSupported: boolean;
  speechRecognitionAvailable: boolean;
  sttEngine: SttEngine;
  voiceFallbackReason: string | null;

  // metrics
  elapsedSeconds: number;
  silenceDetected: boolean;
  countdown: number | null;
  audioLevel: number;

  // voice settings
  voiceGender: VoiceGender;
  setVoiceGender: (g: VoiceGender) => void;

  // scoring
  scores: AnswerScore[];
  latestScore: AnswerScore | null;
  dismissScore: () => void;

  // role analysis
  roleAnalysis: RoleAnalysis | null;
  isAnalyzingRole: boolean;
  analyzeRole: (..._args: unknown[]) => void;

  // lifecycle
  startInterview: (..._args: unknown[]) => void;
  startListening: () => void;
  stopListening: () => void;
  sendTextMessage: (_text: string) => void;
  endInterview: () => void;
  resetInterview: () => void;
  retryAI: () => void;
  skipAITurn: () => void;
  retryCurrentQuestion: () => void;
  retryVoice: () => void;
  submitAnswerNow: () => void;
  resumeFromDraft: (..._args: unknown[]) => void;
}

export function useVoiceInterview(
  _resume?: ResumeData | null,
): UseVoiceInterviewReturn {
  return {
    status: 'idle',
    transcript: [],
    isStarted: false,
    summary: null,
    error: null,
    interimText: '',

    speechSupported: false,
    speechRecognitionAvailable: false,
    sttEngine: 'none',
    voiceFallbackReason: null,

    elapsedSeconds: 0,
    silenceDetected: false,
    countdown: null,
    audioLevel: 0,

    voiceGender: 'female',
    setVoiceGender: () => {},

    scores: [],
    latestScore: null,
    dismissScore: () => {},

    roleAnalysis: null,
    isAnalyzingRole: false,
    analyzeRole: () => {},

    startInterview: () => {},
    startListening: () => {},
    stopListening: () => {},
    sendTextMessage: () => {},
    endInterview: () => {},
    resetInterview: () => {},
    retryAI: () => {},
    skipAITurn: () => {},
    retryCurrentQuestion: () => {},
    retryVoice: () => {},
    submitAnswerNow: () => {},
    resumeFromDraft: () => {},
  };
}
