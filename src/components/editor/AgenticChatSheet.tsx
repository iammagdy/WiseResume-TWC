import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  Send,
  User,
  Sparkles,
  Wrench,
  Lightbulb,
  Check,
  X,
  MessageSquare,
  GitCompareArrows,
  Shield,
  LogIn,
  MessageSquarePlus,
  FileText,
  Briefcase,
  Mail,
  Globe,
  BarChart3,
  Clock,
  Trash2,
  AlertTriangle,
  ChevronLeft,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { cn } from '@/lib/utils';
import { useAgenticChat } from '@/hooks/useAgenticChat';
import { haptics } from '@/lib/haptics';
import { AIProviderBadge } from '@/components/editor/ai/AIProviderBadge';
import { SuggestionProposal } from '@/lib/agenticChat';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { AppIcon } from '@/components/brand/AppIcon';
import { AITrustBadge } from '@/components/ui/AITrustBadge';
import { AISheetErrorBoundary } from '@/components/ai/AISheetErrorBoundary';
import { useResumes, dbToResumeData } from '@/hooks/useResumes';
import { useResumeStore } from '@/store/resumeStore';
import { useShallow } from 'zustand/react/shallow';
import { useChatSessions, useDeleteChatSession } from '@/hooks/useChatHistory';

interface AgenticChatSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMessage?: string;
}

const CONTEXT_FILTERS = [
  { id: 'resumes', label: 'Resumes', icon: FileText, routes: ['/editor', '/preview', '/dashboard', '/resume', '/templates'] },
  { id: 'cover-letters', label: 'Cover Letters', icon: Mail, routes: ['/cover-letter', '/cover-letters'] },
  { id: 'applications', label: 'Applications', icon: Briefcase, routes: ['/applications', '/application', '/job'] },
  { id: 'portfolio', label: 'Portfolio', icon: Globe, routes: ['/portfolio'] },
  { id: 'activity', label: 'Activity', icon: BarChart3, routes: ['/interview', '/career', '/ai-studio'] },
] as const;

function detectContextFromRoute(pathname: string): string {
  for (const filter of CONTEXT_FILTERS) {
    if (filter.routes.some(r => pathname.startsWith(r))) return filter.id;
  }
  return 'resumes';
}

const SUGGESTIONS = [
  'Write a summary for a software engineer',
  'Add metrics to my achievements',
  'Add skills for a React developer',
  'What can I improve?',
];

const CAPABILITIES = [
  { icon: MessageSquare, title: 'Edit by Chatting', desc: '"Update my summary" or "Add React to skills" — changes apply instantly' },
  { icon: Wrench, title: 'Auto-Apply Changes', desc: 'Wise AI edits your resume directly, no copy-pasting needed' },
  { icon: GitCompareArrows, title: 'Review Suggestions', desc: 'See before/after diffs and accept or reject each change' },
  { icon: Sparkles, title: 'AI-Powered Insights', desc: 'Get smart suggestions based on your career goals' },
  { icon: Shield, title: 'Private & Secure', desc: 'Your data stays yours' },
];

function FunctionCallBadge({ name }: { name: string }) {
  const labels: Record<string, string> = {
    update_summary: 'Updated Summary',
    add_experience: 'Added Experience',
    update_experience: 'Updated Experience',
    delete_experience: 'Deleted Experience',
    update_skills: 'Updated Skills',
    add_skills: 'Added Skills',
    update_contact: 'Updated Contact',
  };

  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/20">
      <Wrench className="w-3 h-3" />
      {labels[name] || name}
    </span>
  );
}

function DeleteConfirmCard({
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
            ? 'bg-destructive/5 border-destructive/20'
            : 'bg-muted border-muted'
          : 'bg-card border-destructive/30'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-destructive flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Remove Experience
        </span>
        {isResolved && (
          <span
            className={cn(
              'text-xs px-2 py-0.5 rounded-full',
              proposal.status === 'accepted'
                ? 'bg-destructive/15 text-destructive'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {proposal.status === 'accepted' ? 'Deleted' : 'Kept'}
          </span>
        )}
      </div>

      <div className="p-2 rounded-lg bg-destructive/5 border border-destructive/10">
        <span className="text-xs text-destructive/70 font-medium block mb-1">Entry to remove:</span>
        <p className="text-sm text-foreground/80 break-words">{proposal.original}</p>
      </div>

      <p className="text-xs text-muted-foreground italic break-words">{proposal.explanation}</p>

      {!isResolved && (
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
            onClick={() => {
              haptics.success();
              onAction(messageId, index, 'accepted');
            }}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            Yes, Delete
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs"
            onClick={() => {
              haptics.light();
              onAction(messageId, index, 'rejected');
            }}
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Cancel
          </Button>
        </div>
      )}
    </motion.div>
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
  if (proposal.action === 'delete') {
    return (
      <DeleteConfirmCard
        proposal={proposal}
        index={index}
        messageId={messageId}
        onAction={onAction}
      />
    );
  }

  const isResolved = proposal.status === 'accepted' || proposal.status === 'rejected';
  const [showMoreOriginal, setShowMoreOriginal] = useState(false);
  const [showMoreSuggested, setShowMoreSuggested] = useState(false);
  const CLAMP_LEN = 200;
  const originalLong = proposal.original.length > CLAMP_LEN;
  const suggestedLong = proposal.suggested.length > CLAMP_LEN;

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
            : 'bg-muted border-muted'
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
          <p className="text-foreground/80 line-through decoration-destructive/40 break-words">
            {showMoreOriginal ? proposal.original : proposal.original.slice(0, CLAMP_LEN)}
            {originalLong && !showMoreOriginal && '...'}
          </p>
          {originalLong && (
            <button
              className="text-xs text-muted-foreground hover:text-foreground mt-1 underline"
              onClick={() => setShowMoreOriginal(v => !v)}
            >
              {showMoreOriginal ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
        <div className="p-2 rounded-lg bg-success/5 border border-success/10">
          <span className="text-xs text-success/70 font-medium">After:</span>
          <p className="text-foreground break-words">
            {showMoreSuggested ? proposal.suggested : proposal.suggested.slice(0, CLAMP_LEN)}
            {suggestedLong && !showMoreSuggested && '...'}
          </p>
          {suggestedLong && (
            <button
              className="text-xs text-muted-foreground hover:text-foreground mt-1 underline"
              onClick={() => setShowMoreSuggested(v => !v)}
            >
              {showMoreSuggested ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground italic break-words">{proposal.explanation}</p>

      {!isResolved && (
        <div className="flex gap-2 pt-1" style={{ gap: '8px' }}>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs border-success/30 text-success hover:bg-success/10"
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
            className="flex-1 text-xs"
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

function GuestShowcase({ onClose, onSignIn }: { onClose: () => void; onSignIn: () => void }) {
  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-6 min-h-0">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4">
            <AppIcon size={56} showSparkle />
          </div>
          <h3 className="text-lg font-semibold mb-1">Your AI Resume Assistant</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-[280px]">
            Edit your resume effortlessly just by chatting with Wise AI.
          </p>

          <div className="w-full space-y-3 mb-6">
            <p className="text-xs text-muted-foreground font-medium text-left">What Wise AI can do:</p>
            {CAPABILITIES.map((cap) => (
              <div key={cap.title} className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border text-left">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <cap.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{cap.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{cap.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <Button className="w-full gradient-primary" onClick={onSignIn}>
            <LogIn className="w-4 h-4 mr-2" />
            Sign In to Start Chatting
          </Button>
          <p className="text-xs text-muted-foreground mt-2">Free to use after signing in</p>
        </div>
      </div>
      <div className="shrink-0 border-t border-border p-3 pb-safe">
        <Button variant="ghost" className="w-full h-10 text-muted-foreground" onClick={onClose}>
          Close
        </Button>
      </div>
    </>
  );
}

export function AgenticChatSheet({ open, onOpenChange, initialMessage }: AgenticChatSheetProps) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: allResumes = [] } = useResumes();
  const { currentResume, setCurrentResume, setCurrentResumeId } = useResumeStore(useShallow((s) => ({ currentResume: s.currentResume, setCurrentResume: s.setCurrentResume, setCurrentResumeId: s.setCurrentResumeId })));
  const [activeContext, setActiveContext] = useState(() => detectContextFromRoute(location.pathname));
  const {
    messages,
    isThinking,
    sendMessage,
    startNewSession,
    loadSession,
    updateSuggestionStatus,
  } = useAgenticChat(activeContext);
  const [input, setInput] = useState('');
  const [resumePickerOpen, setResumePickerOpen] = useState(false);
  const [chatPanel, setChatPanel] = useState<'chat' | 'history'>('chat');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // History data
  const { data: sessions = [] } = useChatSessions();
  const deleteMutation = useDeleteChatSession();

  useEffect(() => {
    if (initialMessage && open) {
      setInput(initialMessage);
    }
  }, [initialMessage, open]);

  useEffect(() => {
    setActiveContext(detectContextFromRoute(location.pathname));
  }, [location.pathname]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  useEffect(() => {
    if (open && messages.length === 0 && isAuthenticated) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open, messages.length, isAuthenticated]);

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

  const handleSignIn = () => {
    onOpenChange(false);
    navigate('/auth?mode=login');
  };

  const handleSelectResume = (resume: typeof allResumes[0]) => {
    setCurrentResume(dbToResumeData(resume));
    setCurrentResumeId(resume.id);
    setResumePickerOpen(false);
    haptics.light();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col p-0">
        <AISheetErrorBoundary key={String(open)} onClose={() => onOpenChange(false)}>
        <SheetHeader className="px-4 pt-4 pb-3 shrink-0 border-b border-border">
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="flex items-center gap-2">
              <AppIcon size={32} showSparkle className="shrink-0" />
              <span className="font-semibold">Wise AI</span>
              {isAuthenticated && (
                <AIProviderBadge size="xs" showSettingsLink />
              )}
            </SheetTitle>
            
            {isAuthenticated && (
              <div className="flex items-center gap-1">
                {chatPanel === 'history' ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setChatPanel('chat')}
                    className="text-muted-foreground"
                    aria-label="Back to chat"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { setChatPanel('history'); setDeleteConfirmId(null); }}
                      className="text-muted-foreground"
                      aria-label="Chat history"
                    >
                      <Clock className="w-4 h-4" />
                    </Button>
                    {messages.length > 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={startNewSession}
                        className="text-muted-foreground"
                        aria-label="New Chat"
                      >
                        <MessageSquarePlus className="w-4 h-4" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </SheetHeader>

        {isAuthenticated && (
          <div className="px-4 pt-1 space-y-2">
            <AITrustBadge />
            {/* Context filter chips */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {CONTEXT_FILTERS.map((filter) => {
                const Icon = filter.icon;
                const isActive = activeContext === filter.id;
                return (
                  <button
                    key={filter.id}
                    onClick={() => { setActiveContext(filter.id); haptics.selection(); }}
                    className={cn(
                      'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0 touch-manipulation',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted'
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {!isAuthenticated ? (
          <GuestShowcase onClose={() => onOpenChange(false)} onSignIn={handleSignIn} />
        ) : chatPanel === 'history' ? (
          <div className="flex-1 h-0 overflow-y-auto px-4 py-4">
            <p className="text-xs text-muted-foreground font-medium mb-3">Recent conversations</p>
            {sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Clock className="w-8 h-8 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No saved conversations yet.</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Your chats will appear here.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center gap-2 group rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors px-3 py-2.5"
                  >
                    <button
                      className="flex-1 text-left min-w-0"
                      onClick={async () => {
                        await loadSession(session.id);
                        setChatPanel('chat');
                        haptics.light();
                      }}
                    >
                      <p className="text-sm font-medium truncate">{session.title || 'Untitled chat'}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(session.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </button>
                    {deleteConfirmId === session.id ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 text-xs px-2"
                          onClick={() => {
                            deleteMutation.mutate(session.id);
                            setDeleteConfirmId(null);
                            haptics.light();
                          }}
                        >
                          Delete
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs px-2"
                          onClick={() => setDeleteConfirmId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <button
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all shrink-0"
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(session.id); }}
                        aria-label="Delete session"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <div ref={scrollRef} className="flex-1 h-0 overflow-y-auto px-4 py-4">
              {messages.length === 0 ? (
              <div className="flex flex-col items-center h-full text-center pt-6">
                  <p className="text-sm text-muted-foreground max-w-[260px] mb-8">
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
                        className="w-full text-left text-sm px-4 py-3 rounded-xl border border-border bg-card hover:bg-primary/5 hover:border-primary/30 active:scale-[0.98] transition-all touch-manipulation flex items-center gap-3"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-primary/50 shrink-0" />
                        <span>{s}</span>
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
                          <AppIcon size={28} showSparkle={false} className="shrink-0 mt-0.5" />
                        )}
                        <div
                          className={cn(
                            'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                            msg.role === 'user'
                              ? 'bg-primary text-primary-foreground rounded-br-md'
                              : 'bg-card border border-border rounded-bl-md'
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
                          {/* Clickable resume cards when AI mentions resume titles */}
                          {msg.role === 'assistant' && allResumes.length > 0 && (() => {
                            const mentioned = allResumes.filter(r => msg.content.includes(r.title));
                            if (mentioned.length === 0) return null;
                            return (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {mentioned.map(r => (
                                  <button
                                    key={r.id}
                                    onClick={() => handleSelectResume(r)}
                                    className={cn(
                                      'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-all touch-manipulation active:scale-95',
                                      currentResume?.id === r.id
                                        ? 'bg-primary/10 border-primary/30 text-primary font-medium'
                                        : 'bg-card border-border hover:border-primary/20 hover:bg-primary/5'
                                    )}
                                  >
                                    <FileText className="w-3 h-3 shrink-0" />
                                    <span className="truncate max-w-[140px]">{r.title}</span>
                                  </button>
                                ))}
                              </div>
                            );
                          })()}
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
                      <AppIcon size={28} showSparkle={false} className="shrink-0" />
                      <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3">
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

            <div className="shrink-0 border-t border-border p-3 space-y-2 pb-safe">
              {/* Active resume badge */}
              {currentResume && (
                <p className="text-[11px] text-muted-foreground px-1 truncate">
                  Chatting about: <span className="font-medium text-foreground">{currentResume.contactInfo?.fullName || 'Untitled'}</span>
                </p>
              )}
              <div className="flex items-center gap-2">
                {/* Resume picker */}
                <Popover open={resumePickerOpen} onOpenChange={setResumePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-11 h-11 rounded-full shrink-0"
                      aria-label="Select resume"
                    >
                      <FileText className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" side="top" className="w-64 p-1 max-h-60 overflow-y-auto">
                    <p className="px-3 py-1.5 text-xs text-muted-foreground font-medium">Select a resume</p>
                    {allResumes.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-muted-foreground">No resumes yet</p>
                    ) : (
                      allResumes.map((r) => (
                        <button
                          key={r.id}
                          className={cn(
                            'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors touch-manipulation text-left',
                            currentResume?.id === r.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'
                          )}
                          onClick={() => handleSelectResume(r)}
                        >
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{r.title}</span>
                        </button>
                      ))
                    )}
                  </PopoverContent>
                </Popover>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Wise AI to edit your resume..."
                  className="flex-1 h-11 px-4 rounded-full bg-input border border-border text-sm placeholder:text-muted-foreground/60 focus:outline-none"
                  disabled={isThinking}
                />
                <Button
                  size="icon"
                  className="w-11 h-11 rounded-full gradient-primary shrink-0"
                  onClick={handleSend}
                  disabled={!input.trim() || isThinking}
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
        </AISheetErrorBoundary>
      </SheetContent>
    </Sheet>
  );
}
