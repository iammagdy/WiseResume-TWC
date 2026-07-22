import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { PublicProfile, PublicResume } from '@/hooks/usePublicPortfolio';
import { appwriteFunctions } from '@/lib/appwrite-functions';

interface ChatMessage { role: 'user' | 'assistant'; content: string; }

const SESSION_STORAGE_KEY = (username: string) => `portfolio_chat_${username}`;

interface PersistedChatState {
  messages: ChatMessage[];
  questionCount: number;
  isFallback: boolean;
  sessionToken?: string | null;
}

function loadChatState(username: string): PersistedChatState | null {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY(username));
    if (!raw) return null;
    return JSON.parse(raw) as PersistedChatState;
  } catch {
    return null;
  }
}

function saveChatState(username: string, state: PersistedChatState) {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY(username), JSON.stringify(state));
  } catch {
    // sessionStorage may be unavailable in some contexts — non-fatal
  }
}

export function ChatWidget({ profile, resume: _resume, accentColor, pStyle }: {
  profile: PublicProfile; resume: PublicResume; accentColor: string; pStyle: string;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (!profile.username) return [];
    return loadChatState(profile.username)?.messages ?? [];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFallback, setIsFallback] = useState(() => {
    if (!profile.username) return false;
    return loadChatState(profile.username)?.isFallback ?? false;
  });
  const [chatDisabled, setChatDisabled] = useState(false);
  const [questionCount, setQuestionCount] = useState(() => {
    if (!profile.username) return 0;
    return loadChatState(profile.username)?.questionCount ?? 0;
  });
  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    if (!profile.username) return null;
    return loadChatState(profile.username)?.sessionToken ?? null;
  });
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState(false);
  // First-visit nudge so visitors notice the portfolio is actually askable.
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const MAX_QUESTIONS = 10;
  const firstName = profile.fullName?.split(' ')[0] || 'me';

  useEffect(() => {
    if (hasInteracted || open) return;
    const t = window.setTimeout(() => setShowHint(true), 3500);
    return () => window.clearTimeout(t);
  }, [hasInteracted, open]);

  // Provision a server-signed visitor session token when chat is first opened.
  // This token replaces IP-header-based identity and enables non-bypassable
  // server-side per-session rate limiting on the ask-portfolio endpoint.
  useEffect(() => {
    if (!open || sessionToken || sessionLoading) return;
    if (!profile.username) return;

    setSessionLoading(true);
    setSessionError(false);
    appwriteFunctions
      .invoke<{ sessionToken?: string }>('create-portfolio-chat-session', {
        body: { username: profile.username },
      })
      .then(({ data, error }) => {
        if (error || !data?.sessionToken) {
          throw new Error(error?.message || 'Session unavailable');
        }
        setSessionToken(data.sessionToken);
      })
      .catch(() => {
        setSessionError(true);
      })
      .finally(() => setSessionLoading(false));
  }, [open, sessionToken, sessionLoading, profile.username]);

  const isLight = pStyle === 'classic-clean';
  const bgPanel = isLight ? 'rgba(255,255,255,0.98)' : 'rgba(13,13,22,0.95)';
  const fgColor = isLight ? '#111827' : '#f0f0ff';
  const mutedColor = isLight ? '#6b7280' : '#9ca3af';
  const borderColor = isLight ? '#e5e7eb' : 'rgba(255,255,255,0.10)';

  // Persist conversation state to sessionStorage so history survives page refreshes
  // within the same browser tab session (single-visit memory).
  useEffect(() => {
    if (!profile.username) return;
    if (messages.length === 0 && questionCount === 0 && !isFallback && !sessionToken) return;
    saveChatState(profile.username, { messages, questionCount, isFallback, sessionToken });
  }, [messages, questionCount, isFallback, sessionToken, profile.username]);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open, loading]);

  // We no longer hide the widget entirely to avoid jarring "disappearance"
  // if (chatDisabled) return null;

  const send = async (questionOverride?: string) => {
    const q = (questionOverride ?? input).trim();
    if (!q || loading) return;
    if (sessionLoading || !sessionToken) {
      toast.error('Chat is still getting ready. Please try again in a moment.');
      return;
    }
    const maxAllowed = isFallback ? 5 : MAX_QUESTIONS;
    
    if (questionCount >= maxAllowed) {
      toast.error(isFallback 
        ? 'Platform credit limit reached (5 questions). Contact the owner directly for more info!' 
        : 'Session limit reached. Refresh to continue.'
      );
      return;
    }
    setQuestionCount(c => c + 1);
    const userMsg: ChatMessage = { role: 'user', content: q };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const { data, error } = await appwriteFunctions.invoke<{
        answer?: string;
        isFallback?: boolean;
        chatDisabled?: boolean;
        error?: string;
      }>('ask-portfolio', {
        body: {
          username: profile.username,
          question: q,
          conversationHistory: messages.slice(-6),
          sessionToken,
        },
      });

      if (data?.isFallback) {
        setIsFallback(true);
      }

      // If the owner has explicitly disabled chat or a permanent error occurs
      if (data?.chatDisabled) {
        setChatDisabled(true);
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: "I'm sorry, but chat is currently disabled for this portfolio. You can still reach out via the contact buttons!" 
        }]);
        return;
      }
      if (error?.status === 403) {
        setSessionToken(null);
      }
      if (error) throw new Error(error.message || 'Request failed');
      if (data?.error) throw new Error(data.error);
      if (!data?.answer) throw new Error('Empty response');
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
    } catch {
      toast.error('Could not get a response. Please try again.');
      setMessages(prev => prev.slice(0, -1));
      setQuestionCount(c => Math.max(0, c - 1)); // refund on failure
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <>
      {/* Floating launcher + first-visit nudge */}
      <div className="fixed bottom-6 right-4 z-[60] h-14 w-14" data-pdf-exclude style={{ pointerEvents: 'none' }}>
        <AnimatePresence>
          {showHint && !open && (
            <motion.button
              key="hint"
              initial={{ opacity: 0, x: 16, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 16, scale: 0.9 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => { setOpen(true); setHasInteracted(true); setShowHint(false); }}
              className="absolute bottom-0 right-[calc(100%+0.625rem)] w-[210px] max-w-[calc(100vw-6rem)] rounded-2xl rounded-br-md px-3.5 py-2.5 text-left shadow-xl"
              style={{ background: bgPanel, border: `1px solid ${borderColor}`, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', pointerEvents: 'auto' }}
            >
              <span
                onClick={(e) => { e.stopPropagation(); setShowHint(false); setHasInteracted(true); }}
                className="absolute -top-2 -left-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                style={{ background: bgPanel, border: `1px solid ${borderColor}`, color: mutedColor }}
                aria-label="Dismiss"
              >
                <X className="w-2.5 h-2.5" />
              </span>
              <p className="text-xs font-semibold leading-tight flex items-center gap-1" style={{ color: fgColor }}>
                <Sparkles className="w-3 h-3" style={{ color: accentColor }} />
                Ask me about {firstName}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: mutedColor }}>Skills, experience, availability…</p>
            </motion.button>
          )}
        </AnimatePresence>

        <div className="relative h-14 w-14" style={{ pointerEvents: 'auto' }}>
          {/* attention pulse — only while closed */}
          {!open && (
            <motion.span
              className="absolute inset-0 rounded-full"
              style={{ background: accentColor, zIndex: -1 }}
              animate={{ scale: [1, 1.55], opacity: [0.45, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
            />
          )}
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => { setOpen(o => !o); setHasInteracted(true); setShowHint(false); }}
            className="relative w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            style={{ background: accentColor, color: '#fff', boxShadow: `0 8px 32px -4px ${accentColor}70` }}
            title={`Ask ${firstName} anything`}
            aria-label={`Ask ${firstName} anything`}
          >
            <AnimatePresence mode="wait">
              {open
                ? <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <X className="w-5 h-5" />
                  </motion.span>
                : <motion.span key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <MessageSquare className="w-5 h-5" />
                  </motion.span>
              }
            </AnimatePresence>
            {/* sparkle accent badge to signal "AI" */}
            {!open && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#fff' }}>
                <Sparkles className="w-3 h-3" style={{ color: accentColor }} />
              </span>
            )}
          </motion.button>
        </div>
      </div>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ duration: 0.22, ease: [0, 0, 0.2, 1] }}
            className="fixed bottom-24 right-4 z-[60] w-[340px] max-w-[calc(100vw-2rem)] rounded-2xl overflow-hidden flex flex-col"
            style={{
              background: bgPanel,
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: `1px solid ${borderColor}`,
              boxShadow: `0 24px 64px -12px ${accentColor}30, 0 8px 24px rgba(0,0,0,0.3)`,
              maxHeight: '60vh',
              pointerEvents: 'auto',
            }}
            data-pdf-exclude
          >
            {/* Header */}
            <div className="px-4 py-3 flex items-center gap-2.5 shrink-0" style={{ borderBottom: `1px solid ${borderColor}` }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0"
                style={{ background: accentColor }}>
                {profile.fullName?.charAt(0) || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold leading-tight truncate" style={{ color: fgColor }}>
                  Ask {profile.fullName?.split(' ')[0] || 'me'} anything
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-[10px]" style={{ color: mutedColor }}>Powered by portfolio data</p>
                  {questionCount > 0 && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" 
                      style={{ 
                        background: `color-mix(in srgb, ${accentColor} 15%, transparent)`, 
                        color: accentColor,
                        border: `1px solid color-mix(in srgb, ${accentColor} 20%, transparent)`
                      }}>
                      {questionCount}/{isFallback ? 5 : MAX_QUESTIONS}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 min-h-0">
              {messages.length === 0 && (
                <div className="text-center py-4 space-y-2">
                  <p className="text-xs" style={{ color: mutedColor }}>
                    Ask me about {profile.fullName?.split(' ')[0] || 'my'}'s experience, skills, or availability!
                  </p>
                  {['What are your top skills?', 'Are you open to remote work?', 'Tell me about your projects'].map(q => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      disabled={loading || sessionLoading || !sessionToken || chatDisabled}
                      className="block w-full text-left text-xs px-3 py-1.5 rounded-xl transition-all hover:opacity-80"
                      style={{ background: `color-mix(in srgb, ${accentColor} 10%, transparent)`, color: accentColor, border: `1px solid color-mix(in srgb, ${accentColor} 20%, transparent)` }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="text-xs leading-relaxed px-3 py-2 rounded-2xl max-w-[85%]"
                    style={msg.role === 'user'
                      ? { background: accentColor, color: '#fff' }
                      : { background: isLight ? '#f3f4f6' : 'rgba(255,255,255,0.07)', color: fgColor, border: `1px solid ${borderColor}` }
                    }
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="px-3 py-2 rounded-2xl" style={{ background: isLight ? '#f3f4f6' : 'rgba(255,255,255,0.07)', border: `1px solid ${borderColor}` }}>
                    <div className="flex gap-1 items-center h-4">
                      {[0, 1, 2].map(i => (
                        <span key={i} className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: accentColor, animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="px-3 pb-3 pt-2 shrink-0" style={{ borderTop: `1px solid ${borderColor}` }}>
              {sessionError ? (
                <p className="text-xs text-center py-2" style={{ color: mutedColor }}>
                  Chat is unavailable right now. Please try again later.
                </p>
              ) : (
                <div className="flex gap-2 items-end">
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder={sessionLoading ? 'Preparing chat...' : 'Ask a question...'}
                    rows={1}
                    className="flex-1 resize-none rounded-xl px-3 py-2 text-xs outline-none transition-all"
                    disabled={sessionLoading || !sessionToken || chatDisabled}
                    style={{
                      background: isLight ? '#f9fafb' : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${borderColor}`,
                      color: fgColor,
                      maxHeight: '80px',
                    }}
                  />
                  <button
                    onClick={() => send()}
                    disabled={!input.trim() || loading || sessionLoading || !sessionToken || chatDisabled}
                    aria-label="Send message"
                    className="w-8 h-8 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-40 hover:scale-105 active:scale-95"
                    style={{ background: accentColor, color: '#fff' }}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
