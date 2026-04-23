/**
 * Stub — voice scribe (ElevenLabs) integration has been removed.
 * Kept as a no-op so existing imports compile.
 */
export interface ScribeState {
  isRecording: false;
  isAvailable: false;
  transcript: '';
  error: null;
}

export function useElevenLabsScribe(): ScribeState & {
  start: () => void;
  stop: () => void;
  reset: () => void;
} {
  return {
    isRecording: false,
    isAvailable: false,
    transcript: '',
    error: null,
    start: () => {},
    stop: () => {},
    reset: () => {},
  };
}
