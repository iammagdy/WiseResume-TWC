import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  Send,
  Bot,
  User,
  Sparkles,
  Wrench,
  Trash2,
  Lightbulb,
  Brain,
  Check,
  X,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useAgenticChat } from '@/hooks/useAgenticChat';
import { haptics } from '@/lib/haptics';
import { AIProviderBadge } from '@/components/editor/ai/AIProviderBadge';
import { SuggestionProposal } from '@/lib/agenticChat';

interface AgenticChatSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SUGGESTIONS = [
  'Write a summary for a software engineer',
  'Add metrics to my achievements',
  'Proofread my resume',
  'Add skills for a React developer',
  'What can I improve?',
];

function FunctionCallBadge({ name }: { name: string }) {
  const labels: Record<string, string> = {
    update_summary: 'Updated Summary',
    add_experience: 'Added Experience',
    update_experience: 'Updated Experience',
    update_skills: 'Updated Skills',
    add_skills: 'Added Skills',
    update_contact: 'Updated Contact',
    proofread_and_fix: 'Fixed Issues',
  };

  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/20">
      <Wrench className="w-3 h-3" />
      {labels[name] || name}
    </span>
  );
}

function SuggestionCard({
  proposal,
  index,
  messageId,
  onAction,
}: {
  proposal: SuggestionProposal & { status?: 'pending' | 'accepted' | 'rejected' };
  index: number;
  messageId: string;
  onAction: (messageId: string, index: number, status: 'accepted' | 'rejected') => void;
}) {
  const isResolved = proposal.status === 'accepted' || proposal.status === 'rejected';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        'rounded-xl border p-3 space-y-2',
        isResolved
          ? proposal.status === 'accepted'
            ? 'bg-success/5 border-success/20'
            : 'bg-muted/50 border-muted'
          : 'bg-card border-border'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground capitalize">
          {proposal.section}
          {proposal.itemId && ` • ${proposal.itemId}`}
        </span>
        {isResolved && (
          <span
            className={cn(
              'text-xs px-2 py-0.5 rounded-full',
              proposal.status === 'accepted'
                ? 'bg-success/15 text-success'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {proposal.status === 'accepted' ? 'Applied' : 'Skipped'}
          </span>
        )}
      </div>

      <div className="space-y-1.5 text-sm">
        <div className="p-2 rounded-lg bg-destructive/5 border border-destructive/10">
          <span className="text-xs text-destructive/70 font-medium">Before:</span>
          <p className="text-foreground/80 line-through decoration-destructive/40">
            {proposal.original.slice(0, 200)}
            {proposal.original.length > 200 && '...'}
          </p>
        </div>
        <div className="p-2 rounded-lg bg-success/5 border border-success/10">
          <span className="text-xs text-success/70 font-medium">After:</span>
          <p className="text-foreground">
            {proposal.suggested.slice(0, 200)}
            {proposal.suggested.length > 200 && '...'}
          </p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground italic">{proposal.explanation}</p>

      {!isResolved && (
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-8 text-xs border-success/30 text-success hover:bg-success/10"
            onClick={() => {
              haptics.success();
              onAction(messageId, index, 'accepted');
            }}
          >
            <Check className="w-3.5 h-3.5 mr-1" />
            Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-8 text-xs"
            onClick={() => {
              haptics.light();
              onAction(messageId, index, 'rejected');
            }}
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Reject
          </Button>
        </div>
      )}
    </motion.div>
  );
}

export function AgenticChatSheet({ open, onOpenChange }: AgenticChatSheetProps) {
  const {
    messages,
    isThinking,
    thinkingMode,
    sendMessage,
    clearChat,
    toggleThinkingMode,
    updateSuggestionStatus,
  } = useAgenticChat();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  useEffect(() => {
    if (open && messages.length === 0) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open, messages.length]);

  const handleSend = () => {
    if (!input.trim()) return;
    haptics.light();
    sendMessage(input);
    setInput('');
  };

  const handleSuggestion = (text: string) => {
    haptics.light();
    sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col p-0">
        <SheetHeader className="px-4 pt-4 pb-2 shrink-0 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary-foreground" />
              </div>
              Wise AI
              <AIProviderBadge size="xs" showSettingsLink />
            </SheetTitle>
            <div className="flex items-center gap-2">
              {/* Thinking Mode Toggle */}
              <div className="flex items-center gap-1.5">
                <Brain
                  className={cn(
                    'w-4 h-4 transition-colors',
                    thinkingMode ? 'text-primary' : 'text-muted-foreground'
                  )}
                />
                <Switch
                  checked={thinkingMode}
                  onCheckedChange={toggleThinkingMode}
                  className="scale-90"
                />
                <span className="text-xs text-muted-foreground hidden sm:inline">Pro</span>
              </div>
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearChat}
                  className="text-muted-foreground h-9"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mb-4 opacity-80">
                <Sparkles className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Wise AI</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-[280px]">
                I can edit your resume directly. Just tell me what to change.
              </p>

              <div className="w-full space-y-2">
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                  <Lightbulb className="w-3 h-3" />
                  Try saying:
                </p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSuggestion(s)}
                    className="w-full text-left text-sm px-3 py-2.5 rounded-xl glass-surface hover:bg-muted/50 active:scale-[0.98] transition-all touch-manipulation"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      'flex gap-2',
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-3.5 h-3.5 text-primary-foreground" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'glass-surface rounded-bl-md'
                      )}
                    >
                      {msg.functionCall && (
                        <div className="mb-1.5">
                          <FunctionCallBadge name={msg.functionCall.name} />
                        </div>
                      )}
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                      {msg.suggestion && msg.suggestion.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {msg.suggestion.map((proposal, idx) => (
                            <SuggestionCard
                              key={idx}
                              proposal={proposal}
                              index={idx}
                              messageId={msg.id}
                              onAction={updateSuggestionStatus}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                        <User className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {isThinking && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-2 items-start"
                >
                  <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center shrink-0">
                    <Bot className="w-3.5 h-3.5 text-primary-foreground" />
                  </div>
                  <div className="glass-surface rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border p-3 pb-safe">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                thinkingMode
                  ? 'Ask Wise AI (Pro mode - complex reasoning)...'
                  : 'Ask Wise AI to edit your resume...'
              }
              className="flex-1 h-11 px-4 rounded-full glass-input text-sm placeholder:text-muted-foreground/60 focus:outline-none"
              disabled={isThinking}
            />
            <Button
              size="icon"
              className="w-11 h-11 rounded-full gradient-primary shrink-0"
              onClick={handleSend}
              disabled={!input.trim() || isThinking}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
