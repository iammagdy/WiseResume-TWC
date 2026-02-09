import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Bot,
  User,
  Sparkles,
  Wrench,
  Trash2,
  Lightbulb,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAgenticChat } from '@/hooks/useAgenticChat';
import { haptics } from '@/lib/haptics';
import { AIProviderBadge } from '@/components/editor/ai/AIProviderBadge';

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
    update_skills: 'Updated Skills',
    add_skills: 'Added Skills',
    update_contact: 'Updated Contact',
    proofread: 'Proofread Complete',
  };

  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/20">
      <Wrench className="w-3 h-3" />
      {labels[name] || name}
    </span>
  );
}

export function AgenticChatSheet({ open, onOpenChange }: AgenticChatSheetProps) {
  const { messages, isThinking, sendMessage, clearChat } = useAgenticChat();
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
              AI Copilot
              <AIProviderBadge size="xs" showSettingsLink />
            </SheetTitle>
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
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mb-4 opacity-80">
                <Sparkles className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">
                AI Resume Copilot
              </h3>
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
                        'max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
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
                      <p className="whitespace-pre-wrap">{msg.content}</p>
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
              placeholder="Ask me to edit your resume..."
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
