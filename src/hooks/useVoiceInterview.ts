/**
 * Stub — voice mode in interviews has been removed. Interviews are
 * text-only now. Kept so existing imports compile.
 */
export interface VoiceInterviewState {
  isAvailable: false;
  isActive: false;
  isSpeaking: false;
  isListening: false;
  transcript: '';
  error: null;
}

export function useVoiceInterview(): VoiceInterviewState & {
  start: () => void;
  stop: () => void;
  speak: (_text: string) => void;
} {
  return {
    isAvailable: false,
    isActive: false,
    isSpeaking: false,
    isListening: false,
    transcript: '',
    error: null,
    start: () => {},
    stop: () => {},
    speak: () => {},
  };
}
