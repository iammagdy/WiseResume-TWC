import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { TranscriptEntry } from '@/hooks/useVoiceInterview';

interface TranscriptBubbleProps {
  entry: TranscriptEntry;
  isTyping?: boolean;
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-2 py-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-primary/60"
          animate={{ 
            y: [0, -4, 0],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  );
}

export function TranscriptBubble({ entry, isTyping }: TranscriptBubbleProps) {
  const isUser = entry.role === 'user';
  const timeAgo = formatDistanceToNow(entry.timestamp, { addSuffix: false });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-br-md shadow-[0_4px_20px_hsl(var(--primary)/0.3)]'
            : 'bg-card/90 backdrop-blur-md border border-border/40 text-foreground rounded-bl-md shadow-[0_4px_20px_hsl(var(--primary)/0.08)]'
        )}
      >
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider opacity-70">
            {!isUser && (
              <motion.span
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Sparkles className="w-2.5 h-2.5" />
              </motion.span>
            )}
            {isUser ? 'You' : 'Wise AI'}
          </p>
          <span className="text-[9px] opacity-50 font-medium">
            {timeAgo === 'less than a minute' ? 'now' : timeAgo}
          </span>
        </div>
        {isTyping ? (
          <TypingIndicator />
        ) : (
          <p className="whitespace-pre-wrap">{entry.text}</p>
        )}
      </div>
    </motion.div>
  );
}

// Typing bubble component for when AI is thinking
export function TypingBubble() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="flex w-full justify-start"
    >
      <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 bg-card/90 backdrop-blur-md border border-border/40 shadow-[0_4px_20px_hsl(var(--primary)/0.08)]">
        <div className="flex items-center gap-1.5 mb-1.5">
          <motion.span
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Sparkles className="w-2.5 h-2.5 text-primary/70" />
          </motion.span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/70">
            Wise AI
          </span>
        </div>
        <TypingIndicator />
      </div>
    </motion.div>
  );
}