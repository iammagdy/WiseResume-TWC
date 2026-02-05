import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { TranscriptEntry } from '@/hooks/useVoiceInterview';

interface TranscriptBubbleProps {
  entry: TranscriptEntry;
}

export function TranscriptBubble({ entry }: TranscriptBubbleProps) {
  const isUser = entry.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25 }}
      className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-muted text-foreground rounded-bl-md'
        )}
      >
        <p className="text-[10px] font-semibold uppercase tracking-wide opacity-60 mb-1">
          {isUser ? 'You' : 'Interviewer'}
        </p>
        <p className="whitespace-pre-wrap">{entry.text}</p>
      </div>
    </motion.div>
  );
}
