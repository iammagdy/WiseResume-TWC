import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send } from 'lucide-react';
import { toast } from 'sonner';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://hjnnamwgztlhzkeuufln.supabase.co';
import type { PublicProfile, PublicResume } from '@/hooks/usePublicPortfolio';

interface ChatMessage { role: 'user' | 'assistant'; content: string; }

export function ChatWidget({ profile, resume, accentColor, pStyle }: {
  profile: PublicProfile; resume: PublicResume; accentColor: string; pStyle: string;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionCountRef = useRef(0);
  const MAX_QUESTIONS = 10;

  const isLight = pStyle === 'classic-clean';
  const bgPanel = isLight ? 'rgba(255,255,255,0.98)' : 'rgba(13,13,22,0.95)';
  const fgColor = isLight ? '#111827' : '#f0f0ff';
  const mutedColor = isLight ? '#6b7280' : '#9ca3af';
  const borderColor = isLight ? '#e5e7eb' : 'rgba(255,255,255,0.10)';

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open, loading]);

  const send = async (questionOverride?: string) => {
    const q = (questionOverride ?? input).trim();
    if (!q || loading) return;
    if (sessionCountRef.current >= MAX_QUESTIONS) {
      toast.error('Session limit reached. Refresh to continue.');
      return;
    }
    sessionCountRef.current += 1;
    const userMsg: ChatMessage = { role: 'user', content: q };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/ask-portfolio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: profile.username,
          question: q,
          conversationHistory: messages.slice(-6),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
    } catch {
      toast.error('Could not get a response. Please try again.');
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <>
      {/* Floating button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.5, type: 'spring', stiffness: 300 }}
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-4 z-40 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        style={{ background: accentColor, color: '#fff', boxShadow: `0 8px 32px -4px ${accentColor}70` }}
        data-pdf-exclude
        title={`Ask ${profile.fullName?.split(' ')[0] || 'me'} anything`}
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
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ duration: 0.22, ease: [0, 0, 0.2, 1] }}
            className="fixed bottom-24 right-4 z-40 w-[340px] max-w-[calc(100vw-2rem)] rounded-2xl overflow-hidden flex flex-col"
            style={{
              background: bgPanel,
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: `1px solid ${borderColor}`,
              boxShadow: `0 24px 64px -12px ${accentColor}30, 0 8px 24px rgba(0,0,0,0.3)`,
              maxHeight: '60vh',
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
                <p className="text-[10px]" style={{ color: mutedColor }}>Powered by portfolio data only</p>
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
                        <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: accentColor, animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="px-3 pb-3 pt-2 shrink-0" style={{ borderTop: `1px solid ${borderColor}` }}>
              <div className="flex gap-2 items-end">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Ask a question…"
                  rows={1}
                  className="flex-1 resize-none rounded-xl px-3 py-2 text-xs outline-none transition-all"
                  style={{
                    background: isLight ? '#f9fafb' : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${borderColor}`,
                    color: fgColor,
                    maxHeight: '80px',
                  }}
                />
                <button
                  onClick={() => send()}
                  disabled={!input.trim() || loading}
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-40 hover:scale-105 active:scale-95"
                  style={{ background: accentColor, color: '#fff' }}
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
