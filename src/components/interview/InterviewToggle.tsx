import { motion } from 'framer-motion';
import { Mic, MicOff, Loader2, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InterviewStatus } from '@/hooks/useVoiceInterview';

interface InterviewToggleProps {
  status: InterviewStatus;
  onPress: () => void;
  disabled?: boolean;
}

export function InterviewToggle({ status, onPress, disabled }: InterviewToggleProps) {
  const isListening = status === 'listening';
  const isThinking = status === 'thinking';
  const isSpeaking = status === 'speaking';
  const isIdle = status === 'idle';

  const Icon = isListening ? Mic : isThinking ? Loader2 : isSpeaking ? Volume2 : MicOff;

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer pulse rings when listening */}
      {isListening && (
        <>
          <motion.div
            className="absolute w-40 h-40 rounded-full border-2 border-primary/30"
            animate={{ scale: [1, 1.4], opacity: [0.6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
          />
          <motion.div
            className="absolute w-40 h-40 rounded-full border-2 border-primary/20"
            animate={{ scale: [1, 1.6], opacity: [0.4, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut', delay: 0.3 }}
          />
        </>
      )}

      {/* Speaking wave rings */}
      {isSpeaking && (
        <>
          <motion.div
            className="absolute w-36 h-36 rounded-full border-2 border-accent/40"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
          <motion.div
            className="absolute w-40 h-40 rounded-full border border-accent/20"
            animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
        </>
      )}

      {/* Main button */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={onPress}
        disabled={disabled || isThinking}
        className={cn(
          'relative z-10 w-28 h-28 rounded-full flex items-center justify-center',
          'transition-colors shadow-lg touch-manipulation',
          isListening && 'bg-primary text-primary-foreground shadow-primary/40',
          isThinking && 'bg-muted text-muted-foreground cursor-wait',
          isSpeaking && 'bg-accent text-accent-foreground',
          isIdle && 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <Icon
          className={cn(
            'w-10 h-10',
            isThinking && 'animate-spin'
          )}
        />
      </motion.button>

      {/* Status label */}
      <motion.span
        key={status}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute -bottom-8 text-xs font-medium text-muted-foreground capitalize"
      >
        {isListening ? 'Listening...' : isThinking ? 'Thinking...' : isSpeaking ? 'Speaking...' : 'Tap to speak'}
      </motion.span>
    </div>
  );
}
