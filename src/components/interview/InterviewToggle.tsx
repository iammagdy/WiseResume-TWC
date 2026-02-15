import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Loader2, Volume2, Hand } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import type { InterviewStatus, SttEngine } from '@/hooks/useVoiceInterview';

interface InterviewToggleProps {
  status: InterviewStatus;
  onPress: () => void;
  disabled?: boolean;
  silenceDetected?: boolean;
  audioLevel?: number;
  sttEngine?: SttEngine;
}

export function InterviewToggle({ status, onPress, disabled, silenceDetected, audioLevel = 0, sttEngine }: InterviewToggleProps) {
  const isListening = status === 'listening';
  const isThinking = status === 'thinking';
  const isSpeaking = status === 'speaking';
  const isIdle = status === 'idle';
  const isReady = status === 'ready';

  const Icon = isListening ? Mic : isThinking ? Loader2 : isSpeaking ? Volume2 : isReady ? Hand : MicOff;

  const handlePress = () => {
    haptics.medium();
    onPress();
  };

  // Scale audio level for visual feedback (amplified for better visibility)
  const amplifiedLevel = Math.min(1, audioLevel * 2);
  const ringScale1 = 1 + amplifiedLevel * 0.4;
  const ringScale2 = 1 + amplifiedLevel * 0.6;
  const ringScale3 = 1 + amplifiedLevel * 0.8;

  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: 180, height: 200 }}>
      {/* Breathing ambient glow */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 180,
          height: 180,
          background: isListening
            ? 'radial-gradient(circle, hsl(var(--primary) / 0.4) 0%, transparent 70%)'
            : isSpeaking
            ? 'radial-gradient(circle, hsl(142 70% 50% / 0.3) 0%, transparent 70%)'
            : isReady
            ? 'radial-gradient(circle, hsl(45 90% 55% / 0.35) 0%, transparent 70%)'
            : isThinking
            ? 'radial-gradient(circle, hsl(var(--primary) / 0.25) 0%, transparent 70%)'
            : 'radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)',
        }}
        animate={{ 
          scale: isListening ? [1, 1.1 + amplifiedLevel * 0.2, 1] : [1, 1.15, 1], 
          opacity: isListening ? [0.7, 0.9 + amplifiedLevel * 0.1, 0.7] : [0.6, 1, 0.6] 
        }}
        transition={{ duration: isReady ? 1.5 : isListening ? 0.3 : 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Outer rotating ring */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 160,
          height: 160,
          background: isReady
            ? `conic-gradient(from 0deg, hsl(45 90% 55% / 0.6), hsl(45 90% 55% / 0.15), hsl(45 90% 55% / 0.6))`
            : isListening
            ? `conic-gradient(from 0deg, hsl(var(--primary) / 0.6), hsl(var(--primary) / 0.1), hsl(var(--primary) / 0.6))`
            : `conic-gradient(from 0deg, hsl(var(--primary) / 0.4), hsl(var(--primary) / 0.05), hsl(var(--primary) / 0.4))`,
          WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 2.5px), #fff calc(100% - 2.5px))',
          mask: 'radial-gradient(farthest-side, transparent calc(100% - 2.5px), #fff calc(100% - 2.5px))',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: isThinking ? 1.5 : isReady ? 2.5 : isListening ? 4 : 8, repeat: Infinity, ease: 'linear' }}
      />

      {/* Audio-responsive rings when listening */}
      <AnimatePresence>
        {isListening && (
          <>
            <motion.div
              key="ring1"
              className="absolute w-[130px] h-[130px] rounded-full border-2 border-primary/50"
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: ringScale1, opacity: 0.6 - amplifiedLevel * 0.3 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            />
            <motion.div
              key="ring2"
              className="absolute w-[130px] h-[130px] rounded-full border border-primary/35"
              initial={{ scale: 1, opacity: 0.4 }}
              animate={{ scale: ringScale2, opacity: 0.4 - amplifiedLevel * 0.2 }}
              exit={{ scale: 1.7, opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut', delay: 0.05 }}
            />
            <motion.div
              key="ring3"
              className="absolute w-[130px] h-[130px] rounded-full border border-primary/20"
              initial={{ scale: 1, opacity: 0.3 }}
              animate={{ scale: ringScale3, opacity: 0.3 - amplifiedLevel * 0.1 }}
              exit={{ scale: 1.9, opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut', delay: 0.1 }}
            />
          </>
        )}
      </AnimatePresence>

      {/* Ready pulse rings - golden */}
      {isReady && (
        <>
          <motion.div
            className="absolute w-[140px] h-[140px] rounded-full"
            style={{ border: '2.5px solid hsl(45 90% 55% / 0.6)' }}
            animate={{ scale: [1, 1.35], opacity: [0.8, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'easeOut' }}
          />
          <motion.div
            className="absolute w-[140px] h-[140px] rounded-full"
            style={{ border: '1.5px solid hsl(45 90% 55% / 0.35)' }}
            animate={{ scale: [1, 1.55], opacity: [0.5, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'easeOut', delay: 0.25 }}
          />
        </>
      )}

      {/* Speaking wave rings - smooth oscillation */}
      {isSpeaking && (
        <>
          <motion.div
            className="absolute w-[125px] h-[125px] rounded-full"
            style={{ border: '2px solid hsl(142 70% 50% / 0.5)' }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.3, 0.6] }}
            transition={{ duration: 0.6, repeat: Infinity }}
          />
          <motion.div
            className="absolute w-[135px] h-[135px] rounded-full"
            style={{ border: '1.5px solid hsl(142 70% 50% / 0.3)' }}
            animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0.15, 0.4] }}
            transition={{ duration: 0.9, repeat: Infinity }}
          />
        </>
      )}

      {/* Thinking particles */}
      {isThinking && (
        <>
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-primary/60"
              style={{
                transformOrigin: 'center center',
              }}
              animate={{
                rotate: [0, 360],
                x: [0, Math.cos((i * Math.PI * 2) / 6) * 70, 0],
                y: [0, Math.sin((i * Math.PI * 2) / 6) * 70, 0],
                opacity: [0.4, 0.8, 0.4],
                scale: [0.8, 1.2, 0.8],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.15,
              }}
            />
          ))}
        </>
      )}

      {/* Main button */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={handlePress}
        disabled={disabled || isThinking}
        className={cn(
          'relative z-10 w-[110px] h-[110px] rounded-full flex items-center justify-center',
          'backdrop-blur-xl border-2 transition-all touch-manipulation',
          isListening && 'bg-primary/25 border-primary/50 shadow-[0_0_40px_hsl(var(--primary)/0.5)]',
          isThinking && 'bg-muted/40 border-muted-foreground/25 cursor-wait',
          isSpeaking && 'bg-[hsl(142_70%_50%/0.2)] border-[hsl(142_70%_50%/0.45)] shadow-[0_0_40px_hsl(142_70%_50%/0.35)]',
          isReady && 'bg-[hsl(45_90%_55%/0.2)] border-[hsl(45_90%_55%/0.5)] shadow-[0_0_40px_hsl(45_90%_55%/0.4)]',
          isIdle && 'bg-card/50 border-border/60 hover:border-primary/50 hover:shadow-[0_0_25px_hsl(var(--primary)/0.25)]',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <Icon
          className={cn(
            'w-9 h-9 transition-all',
            isListening && 'text-primary',
            isThinking && 'text-muted-foreground animate-spin',
            isSpeaking && 'text-[hsl(142_70%_50%)]',
            isReady && 'text-[hsl(45_90%_55%)]',
            isIdle && 'text-muted-foreground'
          )}
        />
      </motion.button>

      {/* VU meter bars when listening */}
      {isListening && (
        <div className="absolute" style={{ bottom: 55, right: -10 }}>
          <div className="flex items-end gap-[2px] h-4">
            {[0.3, 0.5, 0.7, 0.5, 0.3].map((threshold, i) => (
              <motion.div
                key={i}
                className="w-[3px] rounded-full bg-primary/70"
                animate={{
                  height: amplifiedLevel > threshold ? `${8 + amplifiedLevel * 8}px` : '3px',
                  opacity: amplifiedLevel > threshold ? 0.9 : 0.3,
                }}
                transition={{ duration: 0.1 }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Status label */}
      <motion.div
        key={`${status}-${silenceDetected}`}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute -bottom-2 flex flex-col items-center gap-0.5"
      >
        <span
          className={cn(
            "text-xs font-semibold whitespace-nowrap",
            isListening && silenceDetected && "text-muted-foreground",
            isListening && !silenceDetected && "text-primary",
            isThinking && "text-muted-foreground",
            isSpeaking && "text-[hsl(142_70%_50%)]",
            isReady && "text-[hsl(45_90%_55%)]",
            isIdle && "text-muted-foreground"
          )}
        >
          {isListening && silenceDetected
            ? 'Sending soon…'
            : isListening
            ? (amplifiedLevel > 0.1 ? 'Detecting speech...' : 'Listening...')
            : isThinking
            ? 'Analyzing...'
            : isSpeaking
            ? 'Speaking...'
            : isReady
            ? 'Starting mic...'
            : 'Tap to speak'}
        </span>
        {isListening && !silenceDetected && (
          <motion.span 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            className="text-[10px] text-muted-foreground"
          >
            Tap when done
          </motion.span>
        )}
        {isSpeaking && (
          <motion.span 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            className="text-[10px] text-muted-foreground"
          >
            Tap to interrupt
          </motion.span>
        )}
        {isListening && sttEngine && sttEngine !== 'none' && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            className="text-[9px] text-muted-foreground mt-0.5"
          >
            {sttEngine === 'elevenlabs' ? 'ElevenLabs' : 'Browser STT'}
          </motion.span>
        )}
      </motion.div>
    </div>
  );
}