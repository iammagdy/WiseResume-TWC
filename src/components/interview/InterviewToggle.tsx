import { motion } from 'framer-motion';
import { Mic, MicOff, Loader2, Volume2, Hand } from 'lucide-react';
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
  const isReady = status === 'ready';

  const Icon = isListening ? Mic : isThinking ? Loader2 : isSpeaking ? Volume2 : isReady ? Hand : MicOff;

  return (
    <div className="relative flex items-center justify-center" style={{ width: 180, height: 180 }}>
      {/* Breathing ambient glow */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: isListening
            ? 'radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 70%)'
            : isSpeaking
            ? 'radial-gradient(circle, hsl(142 70% 50% / 0.25) 0%, transparent 70%)'
            : isReady
            ? 'radial-gradient(circle, hsl(45 90% 55% / 0.3) 0%, transparent 70%)'
            : isThinking
            ? 'radial-gradient(circle, hsl(var(--primary) / 0.2) 0%, transparent 70%)'
            : 'radial-gradient(circle, hsl(var(--primary) / 0.1) 0%, transparent 70%)',
        }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: isReady ? 1.5 : 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Outer rotating ring */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 160,
          height: 160,
          background: isReady
            ? `conic-gradient(from 0deg, hsl(45 90% 55% / 0.5), hsl(45 90% 55% / 0.1), hsl(45 90% 55% / 0.5))`
            : `conic-gradient(from 0deg, hsl(var(--primary) / 0.4), hsl(var(--primary) / 0.05), hsl(var(--primary) / 0.4))`,
          WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #fff calc(100% - 2px))',
          mask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #fff calc(100% - 2px))',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: isThinking ? 2 : isReady ? 3 : 8, repeat: Infinity, ease: 'linear' }}
      />

      {/* Listening pulse rings */}
      {isListening && (
        <>
          <motion.div
            className="absolute w-[140px] h-[140px] rounded-full border border-primary/40"
            animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
          />
          <motion.div
            className="absolute w-[140px] h-[140px] rounded-full border border-primary/30"
            animate={{ scale: [1, 1.7], opacity: [0.4, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut', delay: 0.4 }}
          />
          <motion.div
            className="absolute w-[140px] h-[140px] rounded-full border border-primary/20"
            animate={{ scale: [1, 1.9], opacity: [0.3, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut', delay: 0.8 }}
          />
        </>
      )}

      {/* Ready pulse rings - golden */}
      {isReady && (
        <>
          <motion.div
            className="absolute w-[140px] h-[140px] rounded-full"
            style={{ border: '2px solid hsl(45 90% 55% / 0.5)' }}
            animate={{ scale: [1, 1.4], opacity: [0.7, 0] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'easeOut' }}
          />
          <motion.div
            className="absolute w-[140px] h-[140px] rounded-full"
            style={{ border: '1.5px solid hsl(45 90% 55% / 0.3)' }}
            animate={{ scale: [1, 1.6], opacity: [0.4, 0] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'easeOut', delay: 0.3 }}
          />
        </>
      )}

      {/* Speaking wave rings */}
      {isSpeaking && (
        <>
          <motion.div
            className="absolute w-[130px] h-[130px] rounded-full"
            style={{ border: '1.5px solid hsl(142 70% 50% / 0.4)' }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
          <motion.div
            className="absolute w-[140px] h-[140px] rounded-full"
            style={{ border: '1px solid hsl(142 70% 50% / 0.25)' }}
            animate={{ scale: [1, 1.35, 1], opacity: [0.3, 0.1, 0.3] }}
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
          'relative z-10 w-[120px] h-[120px] rounded-full flex items-center justify-center',
          'backdrop-blur-md border transition-all touch-manipulation',
          isListening && 'bg-primary/20 border-primary/40 shadow-[0_0_30px_hsl(var(--primary)/0.4)]',
          isThinking && 'bg-muted/30 border-muted-foreground/20 cursor-wait',
          isSpeaking && 'bg-[hsl(142_70%_50%/0.15)] border-[hsl(142_70%_50%/0.35)] shadow-[0_0_30px_hsl(142_70%_50%/0.3)]',
          isReady && 'bg-[hsl(45_90%_55%/0.15)] border-[hsl(45_90%_55%/0.4)] shadow-[0_0_30px_hsl(45_90%_55%/0.3)]',
          isIdle && 'bg-card/40 border-border/50 hover:border-primary/40 hover:shadow-[0_0_20px_hsl(var(--primary)/0.2)]',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <Icon
          className={cn(
            'w-10 h-10',
            isListening && 'text-primary',
            isThinking && 'text-muted-foreground animate-spin',
            isSpeaking && 'text-[hsl(142_70%_50%)]',
            isReady && 'text-[hsl(45_90%_55%)]',
            isIdle && 'text-muted-foreground'
          )}
        />
      </motion.button>

      {/* Status label */}
      <motion.span
        key={status}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute -bottom-6 text-xs font-medium text-muted-foreground"
      >
        {isListening ? 'Listening...' : isThinking ? 'Wise AI is thinking...' : isSpeaking ? 'Wise AI speaking...' : isReady ? 'Tap to answer' : 'Tap to speak'}
      </motion.span>
    </div>
  );
}
