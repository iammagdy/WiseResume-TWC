import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
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
            ? 'bg-primary text-primary-foreground rounded-br-md shadow-[0_0_12px_hsl(var(--primary)/0.2)]'
            : 'bg-card/80 backdrop-blur-sm border border-border/50 text-foreground rounded-bl-md shadow-[0_0_12px_hsl(var(--primary)/0.08)]'
        )}
      >
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide opacity-70 mb-1">
          {!isUser && <Sparkles className="w-2.5 h-2.5" />}
          {isUser ? 'You' : 'Wise AI'}
        </p>
        <p className="whitespace-pre-wrap">{entry.text}</p>
      </div>
    </motion.div>
  );
}
