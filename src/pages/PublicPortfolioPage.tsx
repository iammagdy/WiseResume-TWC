import { useParams, useSearchParams } from 'react-router-dom';
import { supabase, SUPABASE_URL } from '@/integrations/supabase/safeClient';
import { usePublicPortfolio } from '@/hooks/usePublicPortfolio';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MapPin, Linkedin, Briefcase, GraduationCap, Award, FolderOpen,
  Github, Globe, Mail, X, Download, ExternalLink, Loader2, ChevronDown, ChevronUp,
  Wrench, Layers, ArrowUpRight, Code2, Paintbrush, MessageSquare, PenLine, Star, Send, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { computeSkillFrequencies, getSkillTier } from '@/lib/skillCloud';
import type { Experience, Education, Project } from '@/types/resume';
import type { CaseStudy, PortfolioService } from '@/hooks/useProfile';
import type { PublicProfile, PublicResume } from '@/hooks/usePublicPortfolio';
import { CareerCardSheet } from '@/components/portfolio/CareerCardSheet';

// ─── useActiveStatus — polls last_active_at every 60s ─────────────────────────
function isActiveWithin24h(lastActiveAt: string | null): boolean {
  if (!lastActiveAt) return false;
  return Date.now() - new Date(lastActiveAt).getTime() < 24 * 60 * 60 * 1000;
}

function useActiveStatus(username: string, initialLastActiveAt: string | null): string | null {
  const [lastActiveAt, setLastActiveAt] = useState(initialLastActiveAt);
  useEffect(() => {
    setLastActiveAt(initialLastActiveAt);
  }, [initialLastActiveAt]);
  useEffect(() => {
    const id = setInterval(async () => {
      const { data } = await supabase.rpc('get_portfolio_active_status', {
        p_username: username.toLowerCase(),
      });
      if (data) {
        setLastActiveAt(data as string);
      }
    }, 60_000);
    return () => clearInterval(id);
  }, [username]);
  return lastActiveAt;
}

// ─── Motion variants ───────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0, 0, 0.2, 1] as const } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

// Cinematic per-section variants
const slideFromLeft = {
  hidden: { opacity: 0, x: -56, filter: 'blur(4px)' },
  visible: { opacity: 1, x: 0, filter: 'blur(0px)', transition: { duration: 0.55, ease: [0.25, 0, 0, 1] as const } },
};
const slideFromRight = {
  hidden: { opacity: 0, x: 56, filter: 'blur(4px)' },
  visible: { opacity: 1, x: 0, filter: 'blur(0px)', transition: { duration: 0.55, ease: [0.25, 0, 0, 1] as const } },
};
const scalePop = {
  hidden: { opacity: 0, scale: 0.88, rotateX: 6 },
  visible: { opacity: 1, scale: 1, rotateX: 0, transition: { duration: 0.45, ease: [0, 0, 0.2, 1] as const } },
};
const unfold = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] as const } },
};
const skillWave = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.035 } },
};
const skillPill = {
  hidden: { opacity: 0, y: 12, scale: 0.9 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3 } },
};
const bioFade = {
  hidden: { opacity: 0, filter: 'blur(4px)' },
  visible: { opacity: 1, filter: 'blur(0px)', transition: { duration: 0.6, ease: [0, 0, 0.2, 1] as const } },
};
const sectionHeaderSlide = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.25, 0, 0, 1] as const } },
};

// ─── Typewriter hero text ─────────────────────────────────────────────────────
function buildTypewriterPhrases(profile: PublicProfile, skills: string[]): string[] {
  const phrases: string[] = [];
  if (profile.availabilityHeadline) phrases.push(profile.availabilityHeadline);
  if (profile.jobTitle && skills[0]) phrases.push(`${profile.jobTitle} specializing in ${skills[0]}`);
  if (skills.length >= 3) phrases.push(`Expert in ${skills[0]}, ${skills[1]} & ${skills[2]}`);
  if (profile.location && profile.jobTitle) phrases.push(`${profile.jobTitle} based in ${profile.location}`);
  if (profile.openToWork) phrases.push('Open to exciting new opportunities');
  return [...new Set(phrases.filter(Boolean))].slice(0, 5);
}

function TypewriterText({ phrases, accentColor }: { phrases: string[]; accentColor: string }) {
  const [displayed, setDisplayed] = useState('');
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [phase, setPhase] = useState<'typing' | 'paused' | 'deleting' | 'waiting'>('typing');
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    if (phrases.length === 0) return;
    if (reducedMotion.current) {
      setDisplayed(phrases[0]);
      return;
    }

    const current = phrases[phraseIdx % phrases.length];

    if (phase === 'typing') {
      if (displayed.length < current.length) {
        const t = setTimeout(() => setDisplayed(current.slice(0, displayed.length + 1)), 55);
        return () => clearTimeout(t);
      }
      setPhase('paused');
    } else if (phase === 'paused') {
      const t = setTimeout(() => setPhase('deleting'), 2000);
      return () => clearTimeout(t);
    } else if (phase === 'deleting') {
      if (displayed.length > 0) {
        const t = setTimeout(() => setDisplayed(d => d.slice(0, -1)), 30);
        return () => clearTimeout(t);
      }
      setPhase('waiting');
    } else if (phase === 'waiting') {
      const t = setTimeout(() => {
        setPhraseIdx(i => i + 1);
        setPhase('typing');
      }, 400);
      return () => clearTimeout(t);
    }
  }, [phrases, phraseIdx, phase, displayed]);

  if (phrases.length === 0) return null;

  const isMoving = phase === 'typing' || phase === 'deleting';

  return (
    <p className="text-sm italic mb-5 max-w-md leading-relaxed min-h-[1.5rem]" style={{ color: 'var(--pf-muted, #9ca3af)' }}>
      "{displayed}
      <span
        className={`pf-cursor ${isMoving ? 'pf-cursor--typing' : ''}`}
        style={{ color: accentColor }}
      >|</span>
      "
    </p>
  );
}

// ─── AI Ask-Me-Anything widget ────────────────────────────────────────────────
interface ChatMessage { role: 'user' | 'assistant'; content: string; }

function ChatWidget({ profile, resume, accentColor, pStyle }: {
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

  const send = async () => {
    const q = input.trim();
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
    } catch (e) {
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
                      onClick={() => { setInput(q); }}
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
                  onClick={send}
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

// ─── Theme CSS injection ───────────────────────────────────────────────────────
function getThemeVars(style: string, accentColor: string | null, font: string): React.CSSProperties {
  const accent = accentColor || '#e84545';
  const fontFamilies: Record<string, string> = {
    'inter': 'Inter, system-ui, sans-serif',
    'space-grotesk': '"Space Grotesk", Inter, system-ui, sans-serif',
    'serif': 'Georgia, "Times New Roman", serif',
  };
  const headingFont = fontFamilies[font] || fontFamilies['inter'];

  const base: React.CSSProperties = {
    '--pf-accent': accent,
    '--pf-heading-font': headingFont,
    '--pf-body-font': font === 'serif' ? headingFont : (fontFamilies['inter']),
  } as React.CSSProperties;

  return base;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function PortfolioSkeleton() {
  return (
    <div className="min-h-screen bg-[--pf-bg,#0a0a0f] p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col items-center gap-4 pt-16">
        <Skeleton className="h-36 w-36 rounded-full" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-4 w-72" />
        <div className="flex gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-12 w-36 rounded-full" />
          <Skeleton className="h-12 w-44 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    </div>
  );
}

// ─── Not Found ────────────────────────────────────────────────────────────────
function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6">
      <div className="text-center space-y-4">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-3xl font-bold text-white">Portfolio Not Found</h1>
        <p className="text-white/60">This portfolio doesn't exist or isn't public yet.</p>
        <a href={window.location.origin} className="inline-flex items-center gap-2 mt-4 px-6 py-3 bg-[#e84545] text-white rounded-full font-medium text-sm hover:bg-[#e84545]/90 transition-colors">
          Create your free portfolio with WiseResume →
        </a>
      </div>
    </div>
  );
}

// ─── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({ icon, title, style }: { icon: React.ReactNode; title: string; style: string }) {
  const wrapperClass = "flex items-center gap-3 mb-6";
  const motionProps = {
    variants: sectionHeaderSlide,
    initial: "hidden" as const,
    whileInView: "visible" as const,
    viewport: { once: true, margin: '-40px' },
  };

  // IntersectionObserver ref callback for underline draw
  const observerRef = useRef<IntersectionObserver | null>(null);
  const titleRef = useCallback((node: HTMLHeadingElement | null) => {
    if (observerRef.current) { observerRef.current.disconnect(); observerRef.current = null; }
    if (!node) return;
    observerRef.current = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { node.classList.add('title-revealed'); observerRef.current?.disconnect(); } },
      { threshold: 0.5 }
    );
    observerRef.current.observe(node);
  }, []);
  useEffect(() => () => { observerRef.current?.disconnect(); }, []);

  if (style === 'classic-clean') {
    return (
      <motion.div {...motionProps} className={wrapperClass}>
        <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: 'var(--pf-accent)' }} />
        <h2 ref={titleRef} className="text-xl font-bold pf-section-title" style={{ fontFamily: 'var(--pf-heading-font)', color: 'var(--pf-fg, inherit)' }}>{title}</h2>
        <div className="flex-1 h-px opacity-20" style={{ background: 'var(--pf-fg, #111)' }} />
      </motion.div>
    );
  }
  if (style === 'bold-dark') {
    return (
      <motion.div {...motionProps} className={wrapperClass}>
        <span className="text-[var(--pf-accent)]">{icon}</span>
        <h2 ref={titleRef} className="text-2xl font-black tracking-tight pf-section-title" style={{
          fontFamily: 'var(--pf-heading-font)',
          background: `linear-gradient(135deg, var(--pf-accent), color-mix(in srgb, var(--pf-accent) 50%, white))`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>{title}</h2>
      </motion.div>
    );
  }
  // minimal & glass-pro
  return (
    <motion.div {...motionProps} className={wrapperClass}>
      <span style={{ color: 'var(--pf-accent)' }}>{icon}</span>
      <h2 ref={titleRef} className="text-lg font-bold tracking-tight pf-section-title" style={{ color: 'var(--pf-fg, inherit)', fontFamily: 'var(--pf-heading-font)' }}>{title}</h2>
      <div className="flex-1 h-px" style={{ background: 'var(--pf-border, rgba(255,255,255,0.08))' }} />
    </motion.div>
  );
}

// ─── Experience Card ──────────────────────────────────────────────────────────
function ExperienceCard({ exp, style, isLast, index }: { exp: Experience; style: string; isLast: boolean; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const hasLongContent = (exp.description?.length ?? 0) > 200 || (exp.achievements?.length ?? 0) > 3;

  const cardClass = style === 'bold-dark'
    ? 'rounded-2xl p-5 space-y-3 border transition-all hover:border-[var(--pf-accent)]/40'
    : style === 'glass-pro'
    ? 'rounded-2xl p-5 space-y-3 backdrop-blur-sm transition-all hover:bg-white/10'
    : style === 'classic-clean'
    ? 'pl-5 py-4 space-y-2'
    : 'rounded-2xl p-5 space-y-3 border transition-all';

  const cardStyle: React.CSSProperties = style === 'bold-dark'
    ? { background: 'rgba(255,255,255,0.03)', borderColor: 'color-mix(in srgb, var(--pf-accent) 20%, transparent)' }
    : style === 'glass-pro'
    ? { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }
    : style === 'classic-clean'
    ? { borderLeft: '2px solid var(--pf-accent)' }
    : { background: 'var(--pf-card, rgba(255,255,255,0.04))', borderColor: 'var(--pf-border, rgba(255,255,255,0.08))' };

  return (
    <div className="relative">
      {/* Timeline dot connector */}
      {style === 'classic-clean' && !isLast && (
        <div className="absolute left-[-1px] top-full w-[2px] h-4" style={{ background: 'var(--pf-border, #e5e7eb)' }} />
      )}
      <div
        className={`${cardClass} pf-exp-card`} style={cardStyle}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Company logo placeholder circle */}
            <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold"
              style={{ background: 'color-mix(in srgb, var(--pf-accent) 15%, transparent)', color: 'var(--pf-accent)' }}>
              {exp.company?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-base leading-tight" style={{ fontFamily: 'var(--pf-heading-font)', color: 'var(--pf-fg, inherit)' }}>
                {exp.position}
              </h4>
              <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--pf-accent)' }}>{exp.company}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {exp.current && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'color-mix(in srgb, var(--pf-accent) 20%, transparent)', color: 'var(--pf-accent)' }}>
                NOW
              </span>
            )}
            <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'var(--pf-card, rgba(255,255,255,0.06))', color: 'var(--pf-muted, #9ca3af)', border: '1px solid var(--pf-border, rgba(255,255,255,0.08))' }}>
              {exp.startDate} – {exp.current ? 'Present' : exp.endDate}
            </span>
          </div>
        </div>

        {exp.description && (
          <p className="text-sm leading-relaxed" style={{ color: 'var(--pf-muted, #9ca3af)' }}>
            {!expanded && exp.description.length > 200 ? exp.description.slice(0, 200) + '…' : exp.description}
          </p>
        )}

        {exp.achievements?.length > 0 && (expanded || !hasLongContent) && (
          <ul className="space-y-1.5">
            {(expanded ? exp.achievements : exp.achievements.slice(0, 3)).map((a, i) => (
              <li key={i} className="flex gap-2 text-sm" style={{ color: 'var(--pf-muted, #9ca3af)' }}>
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--pf-accent)' }} />
                {a}
              </li>
            ))}
          </ul>
        )}

        {hasLongContent && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-80"
            style={{ color: 'var(--pf-accent)' }}
          >
            {expanded ? <><ChevronUp className="w-3.5 h-3.5" /> Show less</> : <><ChevronDown className="w-3.5 h-3.5" /> Show more</>}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Education Card ───────────────────────────────────────────────────────────
function EducationCard({ edu, style }: { edu: Education; style: string }) {
  const cardStyle: React.CSSProperties = style === 'classic-clean'
    ? { borderLeft: '2px solid var(--pf-accent)', paddingLeft: '1.25rem', paddingTop: '0.75rem', paddingBottom: '0.75rem' }
    : style === 'bold-dark'
    ? { background: 'rgba(255,255,255,0.03)', border: '1px solid color-mix(in srgb, var(--pf-accent) 20%, transparent)', borderRadius: '1rem', padding: '1.25rem' }
    : { background: 'var(--pf-card, rgba(255,255,255,0.04))', border: '1px solid var(--pf-border, rgba(255,255,255,0.08))', borderRadius: '1rem', padding: '1.25rem' };

  return (
    <div style={cardStyle} className="pf-edu-card space-y-1">
      <h4 className="font-bold text-sm" style={{ fontFamily: 'var(--pf-heading-font)', color: 'var(--pf-fg, inherit)' }}>
        {edu.degree}{edu.field ? ` in ${edu.field}` : ''}
      </h4>
      <p className="text-sm font-semibold" style={{ color: 'var(--pf-accent)' }}>{edu.institution}</p>
      <p className="text-xs" style={{ color: 'var(--pf-muted, #9ca3af)' }}>{edu.startDate} – {edu.endDate}</p>
      {edu.gpa && <p className="text-xs" style={{ color: 'var(--pf-muted, #9ca3af)' }}>GPA: {edu.gpa}</p>}
    </div>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────
function ProjectCard({ project, style }: { project: Project; style: string }) {
  const cardStyle: React.CSSProperties = style === 'bold-dark'
    ? { background: 'rgba(255,255,255,0.03)', border: '1px solid color-mix(in srgb, var(--pf-accent) 25%, transparent)', borderRadius: '1rem', padding: '1.25rem' }
    : style === 'glass-pro'
    ? { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '1.25rem' }
    : style === 'classic-clean'
    ? { borderLeft: '2px solid var(--pf-accent)', paddingLeft: '1.25rem', paddingTop: '0.75rem', paddingBottom: '0.75rem' }
    : { background: 'var(--pf-card, rgba(255,255,255,0.04))', border: '1px solid var(--pf-border, rgba(255,255,255,0.08))', borderRadius: '1rem', padding: '1.25rem' };

  return (
    <motion.div variants={scalePop} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} style={cardStyle} className="space-y-3 group">
      <div>
        {project.url ? (
          <a href={project.url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-bold text-base transition-opacity hover:opacity-80"
            style={{ fontFamily: 'var(--pf-heading-font)', color: 'var(--pf-fg, inherit)' }}>
            {project.name}
            <ArrowUpRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--pf-accent)' }} />
          </a>
        ) : (
          <h4 className="font-bold text-base" style={{ fontFamily: 'var(--pf-heading-font)', color: 'var(--pf-fg, inherit)' }}>{project.name}</h4>
        )}
        {project.role && <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--pf-accent)' }}>{project.role}</p>}
      </div>
      {project.description && (
        <p className="text-sm leading-relaxed" style={{ color: 'var(--pf-muted, #9ca3af)' }}>{project.description}</p>
      )}
      {project.technologies?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {project.technologies.map((t, i) => (
            <span key={i} className="text-xs px-2.5 py-1 rounded-full font-medium" style={{
              background: 'color-mix(in srgb, var(--pf-accent) 12%, transparent)',
              color: 'var(--pf-accent)',
              border: '1px solid color-mix(in srgb, var(--pf-accent) 25%, transparent)',
            }}>{t}</span>
          ))}
        </div>
      )}
      {(project.url || project.githubUrl) && (
        <div className="flex gap-2 flex-wrap">
          {project.url && (
            <a href={project.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all hover:opacity-85"
              style={{ background: 'var(--pf-accent)', color: '#fff' }}>
              <ExternalLink className="w-3 h-3" /> Live Demo
            </a>
          )}
          {project.githubUrl && (
            <a href={project.githubUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all hover:opacity-85"
              style={{ borderColor: 'var(--pf-border, rgba(255,255,255,0.15))', color: 'var(--pf-fg, inherit)' }}>
              <Github className="w-3 h-3" /> GitHub
            </a>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ─── Case Study Card ──────────────────────────────────────────────────────────
function CaseStudyCard({ cs, style }: { cs: CaseStudy; style: string }) {
  const cardStyle: React.CSSProperties = style === 'bold-dark'
    ? { background: 'rgba(255,255,255,0.03)', border: '1px solid color-mix(in srgb, var(--pf-accent) 30%, transparent)', borderRadius: '1rem', padding: '1.5rem' }
    : style === 'glass-pro'
    ? { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '1rem', padding: '1.5rem' }
    : style === 'classic-clean'
    ? { borderLeft: '3px solid var(--pf-accent)', paddingLeft: '1.5rem', paddingTop: '1rem', paddingBottom: '1rem', borderRadius: '0 0.75rem 0.75rem 0', background: 'var(--pf-card, #f9f9f9)' }
    : { background: 'var(--pf-card, rgba(255,255,255,0.04))', border: '1px solid var(--pf-border, rgba(255,255,255,0.08))', borderRadius: '1rem', padding: '1.5rem' };

  return (
    <motion.div variants={unfold} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} style={cardStyle} className="space-y-4 relative">
      {/* Tag */}
      <div className="absolute top-4 right-4">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
          style={{ background: 'color-mix(in srgb, var(--pf-accent) 15%, transparent)', color: 'var(--pf-accent)', border: '1px solid color-mix(in srgb, var(--pf-accent) 30%, transparent)' }}>
          Case Study
        </span>
      </div>

      <div className="pr-20">
        {cs.url ? (
          <a href={cs.url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-bold text-lg transition-opacity hover:opacity-80 group"
            style={{ fontFamily: 'var(--pf-heading-font)', color: 'var(--pf-fg, inherit)' }}>
            {cs.title}
            <ArrowUpRight className="w-4 h-4 opacity-50 group-hover:opacity-100" style={{ color: 'var(--pf-accent)' }} />
          </a>
        ) : (
          <h4 className="font-bold text-lg" style={{ fontFamily: 'var(--pf-heading-font)', color: 'var(--pf-fg, inherit)' }}>{cs.title}</h4>
        )}
      </div>

      {cs.challenge && (
        <div className="space-y-1.5">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--pf-accent)' }}>Challenge</p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--pf-muted, #9ca3af)' }}>{cs.challenge}</p>
        </div>
      )}

      {cs.outcome && (
        <div className="space-y-1.5">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--pf-accent)' }}>Outcome</p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--pf-muted, #9ca3af)' }}>{cs.outcome}</p>
        </div>
      )}

      {cs.technologies?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {cs.technologies.map((t, i) => (
            <span key={i} className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ background: 'color-mix(in srgb, var(--pf-accent) 12%, transparent)', color: 'var(--pf-accent)', border: '1px solid color-mix(in srgb, var(--pf-accent) 25%, transparent)' }}>
              {t}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── Service Card ─────────────────────────────────────────────────────────────
const SERVICE_ICONS: Record<string, React.ReactNode> = {
  development: <Code2 className="w-5 h-5" />,
  design: <Paintbrush className="w-5 h-5" />,
  consulting: <MessageSquare className="w-5 h-5" />,
  writing: <PenLine className="w-5 h-5" />,
  other: <Star className="w-5 h-5" />,
};

function ServiceCard({ service, style }: { service: PortfolioService; style: string }) {
  const cardStyle: React.CSSProperties = style === 'bold-dark'
    ? { background: 'rgba(255,255,255,0.03)', border: '1px solid color-mix(in srgb, var(--pf-accent) 20%, transparent)', borderRadius: '1rem', padding: '1.25rem' }
    : style === 'glass-pro'
    ? { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '1.25rem' }
    : style === 'classic-clean'
    ? { background: 'var(--pf-card, #f9f9f9)', border: '1px solid var(--pf-border, #e5e7eb)', borderRadius: '1rem', padding: '1.25rem' }
    : { background: 'var(--pf-card, rgba(255,255,255,0.04))', border: '1px solid var(--pf-border, rgba(255,255,255,0.08))', borderRadius: '1rem', padding: '1.25rem' };

  return (
    <motion.div variants={scalePop} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} style={cardStyle} className="space-y-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: 'color-mix(in srgb, var(--pf-accent) 15%, transparent)', color: 'var(--pf-accent)' }}>
        {SERVICE_ICONS[service.category] || SERVICE_ICONS.other}
      </div>
      <div>
        <h4 className="font-bold text-sm" style={{ fontFamily: 'var(--pf-heading-font)', color: 'var(--pf-fg, inherit)' }}>{service.title}</h4>
        {service.startingPrice && (
          <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--pf-accent)' }}>
            From {service.startingPrice}
          </p>
        )}
      </div>
      {service.description && (
        <p className="text-sm leading-relaxed" style={{ color: 'var(--pf-muted, #9ca3af)' }}>
          {service.description.slice(0, 100)}{service.description.length > 100 ? '…' : ''}
        </p>
      )}
    </motion.div>
  );
}

// ─── Sticky Header ────────────────────────────────────────────────────────────
function StickyHeader({
  name, avatarUrl, initials, contactEmail, accentColor, visible
}: {
  name: string | null; avatarUrl: string | null; initials: string;
  contactEmail: string | null; accentColor: string; visible: boolean;
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.2 }}
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2"
          data-pdf-exclude
          style={{
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            background: 'var(--pf-bg-alpha, rgba(10,10,20,0.85))',
            borderBottom: '1px solid var(--pf-border, rgba(255,255,255,0.08))',
          }}
        >
          <div className="flex items-center gap-2.5">
            <Avatar className="w-8 h-8 border" style={{ borderColor: accentColor }}>
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="text-xs font-bold" style={{ background: accentColor, color: '#fff' }}>{initials}</AvatarFallback>
            </Avatar>
            <span className="font-semibold text-sm" style={{ color: 'var(--pf-fg, #f5f5ff)', fontFamily: 'var(--pf-heading-font)' }}>
              {name || 'Portfolio'}
            </span>
          </div>
          {contactEmail && (
            <a href={`mailto:${contactEmail}`}
              className="text-xs font-semibold px-3 py-1.5 rounded-full transition-opacity hover:opacity-85"
              style={{ background: accentColor, color: '#fff' }}>
              Get in Touch
            </a>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Skill Cloud Helpers (imported from @/lib/skillCloud) ────────────────────

interface SkillCloudProps {
  skills: string[];
  experience: Experience[];
  projects: Project[];
  pStyle: string;
  showMore: boolean;
  onToggleMore: () => void;
  hasMore: boolean;
  moreCount: number;
}

const SKILL_CLOUD_LIMIT = 28;

function SkillCloud({ skills, experience, projects, showMore, onToggleMore, hasMore, moreCount }: SkillCloudProps) {
  const scores = useMemo(
    () => computeSkillFrequencies(skills, experience, projects),
    [skills, experience, projects]
  );

  const sorted = useMemo(
    () => [...skills].sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0)),
    [skills, scores]
  );

  const visible = showMore ? sorted : sorted.slice(0, SKILL_CLOUD_LIMIT);
  const containerRef = useRef<HTMLDivElement>(null);
  const observerFired = useRef(false);

  // Initial reveal via IntersectionObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el || observerFired.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observerFired.current = true;
        const tags = el.querySelectorAll('.pf-skill-tag');
        const delay = window.innerWidth < 768 ? 25 : 40;
        tags.forEach((tag, i) => {
          (tag as HTMLElement).style.animationDelay = `${i * delay}ms`;
          tag.classList.add('pf-skill-revealed');
        });
        observer.disconnect();
      },
      { threshold: 0.2, rootMargin: '0px 0px -50px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Animate newly revealed tags when "Show more" expands
  useEffect(() => {
    if (!showMore || !containerRef.current) return;
    requestAnimationFrame(() => {
      const el = containerRef.current;
      if (!el) return;
      const unrevealed = el.querySelectorAll('.pf-skill-tag:not(.pf-skill-revealed)');
      if (unrevealed.length === 0) return;
      const alreadyCount = el.querySelectorAll('.pf-skill-tag.pf-skill-revealed').length;
      const delay = window.innerWidth < 768 ? 25 : 40;
      unrevealed.forEach((tag, i) => {
        (tag as HTMLElement).style.animationDelay = `${(alreadyCount + i) * delay}ms`;
        tag.classList.add('pf-skill-revealed');
      });
    });
  }, [showMore]);

  return (
    <>
      <div ref={containerRef} className="flex flex-wrap gap-2 items-baseline">
        {visible.map((skill, i) => {
          const tier = getSkillTier(scores[skill] ?? 0);
          return (
            <span
              key={skill}
              title={skill}
              className="pf-skill-tag"
              style={{
                fontSize: tier.fontSize,
                fontWeight: tier.fontWeight,
                padding: `${tier.py} ${tier.px}`,
                borderRadius: '9999px',
                background: 'color-mix(in srgb, var(--pf-accent) 12%, transparent)',
                color: 'var(--pf-accent)',
                border: '1px solid color-mix(in srgb, var(--pf-accent) 22%, transparent)',
                display: 'inline-flex',
                alignItems: 'center',
                transition: 'all 0.2s',
                lineHeight: 1.2,
                cursor: 'default',
              }}
            >
              {skill}
            </span>
          );
        })}
      </div>
      {hasMore && (
        <button
          onClick={onToggleMore}
          className="mt-3 text-xs font-medium flex items-center gap-1 transition-opacity hover:opacity-80"
          style={{ color: 'var(--pf-accent)' }}
        >
          {showMore
            ? <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
            : <><ChevronDown className="w-3.5 h-3.5" /> +{moreCount} more</>}
        </button>
      )}
    </>
  );
}

// ─── Main Content ─────────────────────────────────────────────────────────────
function PublicPortfolioContent() {
  const { username } = useParams<{ username: string }>();
  const [searchParams] = useSearchParams();
  const ref = searchParams.get('ref') || undefined;

  const { data: portfolio, isLoading, error } = usePublicPortfolio(username);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showCareerCard, setShowCareerCard] = useState(false);
  const [showMoreSkills, setShowMoreSkills] = useState(false);
  const [stickyVisible, setStickyVisible] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  // Live active status — polls every 60s
  const liveLastActiveAt = useActiveStatus(
    username || '',
    portfolio?.profile?.lastActiveAt ?? null,
  );

  // Track visited sections via IntersectionObserver
  const sectionsViewedRef = useRef<Set<string>>(new Set());
  const mountTimeRef = useRef<number>(Date.now());
  const trackSentRef = useRef(false);

  const sendTrackingBeacon = useCallback(() => {
    if (trackSentRef.current) return;
    if (!portfolio?.profile?.username) return;
    trackSentRef.current = true;
    const timeSpentSeconds = Math.round((Date.now() - mountTimeRef.current) / 1000);
    const body = JSON.stringify({
      username: portfolio.profile.username,
      ref,
      sectionsViewed: [...sectionsViewedRef.current],
      timeSpentSeconds,
    });
    const url = `${SUPABASE_URL}/functions/v1/track-portfolio-view`;
    // sendBeacon works on page close; fetch is a backup
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
    } else {
      fetch(url, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => {});
    }
  }, [portfolio, ref]);

  // Send beacon on page hide / visibility change
  useEffect(() => {
    const onHide = () => sendTrackingBeacon();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
      sendTrackingBeacon();
    };
  }, [sendTrackingBeacon]);

  // Also send after 30s for long-staying visitors
  useEffect(() => {
    const t = setTimeout(() => {
      if (!trackSentRef.current) {
        // Don't mark as sent so we still send on leave for longer visits
        if (portfolio?.profile?.username) {
          const timeSpentSeconds = Math.round((Date.now() - mountTimeRef.current) / 1000);
          const body = JSON.stringify({
            username: portfolio.profile.username,
            ref,
            sectionsViewed: [...sectionsViewedRef.current],
            timeSpentSeconds,
          });
          fetch(`${SUPABASE_URL}/functions/v1/track-portfolio-view`, {
            method: 'POST',
            body,
            headers: { 'Content-Type': 'application/json' },
          }).catch(() => {});
          trackSentRef.current = true;
        }
      }
    }, 30_000);
    return () => clearTimeout(t);
  }, [portfolio, ref]);

  // Section scroll tracking via IntersectionObserver
  useEffect(() => {
    if (!portfolio) return;
    const sectionNames = ['experience', 'education', 'skills', 'projects', 'certifications', 'case-studies', 'services'];
    const observers: IntersectionObserver[] = [];
    sectionNames.forEach(name => {
      const el = document.getElementById(`section-${name}`);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) sectionsViewedRef.current.add(name); },
        { threshold: 0.3 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach(o => o.disconnect());
  }, [portfolio]);

  // Sticky header observer
  useEffect(() => {
    if (!heroRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setStickyVisible(!entry.isIntersecting),
      { threshold: 0.1, rootMargin: '-80px 0px 0px 0px' }
    );
    observer.observe(heroRef.current);
    return () => observer.disconnect();
  }, [portfolio]);

  // SEO / theme
  useEffect(() => {
    if (portfolio?.profile) {
      const { profile } = portfolio;
      const name = profile.fullName || profile.username;
      document.title = profile.metaTitle || (profile.jobTitle ? `${name} — ${profile.jobTitle}` : name);

      if (profile.theme) {
        document.documentElement.setAttribute("data-theme", profile.theme);
      } else {
        document.documentElement.removeAttribute("data-theme");
      }

      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'description');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', profile.metaDescription || profile.portfolioBio || `${name}'s professional portfolio`);

      const setMeta = (prop: string, val: string, attr = 'property') => {
        let el = document.querySelector(`meta[${attr}="${prop}"]`);
        if (!el) { el = document.createElement('meta'); el.setAttribute(attr, prop); document.head.appendChild(el); }
        el.setAttribute('content', val);
      };
      const ogTitle = profile.metaTitle || (profile.jobTitle ? `${name} — ${profile.jobTitle}` : `${name}'s Portfolio`);
      const ogDesc = profile.metaDescription || profile.portfolioBio || `${name}'s professional portfolio`;
      const ogImageUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/og-image?username=${encodeURIComponent(profile.username)}`;
      setMeta('og:title', ogTitle);
      setMeta('og:description', ogDesc);
      setMeta('og:type', 'profile');
      setMeta('og:image', ogImageUrl);
      setMeta('og:image:width', '1200');
      setMeta('og:image:height', '630');
      setMeta('twitter:card', 'summary_large_image', 'name');
      setMeta('twitter:title', ogTitle, 'name');
      setMeta('twitter:description', ogDesc, 'name');
      setMeta('twitter:image', ogImageUrl, 'name');
    }
    return () => {
      document.title = 'WiseResume';
      document.documentElement.removeAttribute("data-theme");
    };
  }, [portfolio]);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const portfolioEl = document.getElementById('portfolio-content');
      if (!portfolioEl) throw new Error('Content not found');

      const [{ default: html2canvas }, { PDFDocument }] = await Promise.all([
        import('html2canvas'),
        import('pdf-lib').then(m => ({ PDFDocument: m.PDFDocument })),
      ]);

      const canvas = await html2canvas(portfolioEl, {
        scale: 1.5,
        useCORS: true,
        logging: false,
        allowTaint: true,
        ignoreElements: (el) => el.hasAttribute('data-pdf-exclude'),
      });

      const pdfDoc = await PDFDocument.create();
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const imgBytes = await fetch(imgData).then(r => r.arrayBuffer());
      const img = await pdfDoc.embedJpg(imgBytes);

      const pageWidth = 595;
      const pageHeight = Math.round((canvas.height / canvas.width) * pageWidth);
      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      page.drawImage(img, { x: 0, y: 0, width: pageWidth, height: pageHeight });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const { downloadFile } = await import('@/lib/downloadUtils');
      const name = portfolio?.profile?.fullName?.replace(/\s+/g, '_') || 'Portfolio';
      await downloadFile({ blob, fileName: `${name}_Portfolio.pdf` });
      toast.success('Portfolio PDF downloaded!');
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) return <PortfolioSkeleton />;
  if (error || !portfolio) return <NotFound />;

  const { profile, resume } = portfolio;
  const pStyle = profile.portfolioStyle || 'minimal';
  const pLayout = profile.portfolioLayout || 'single';
  const accentColor = profile.portfolioAccentColor || '#e84545';
  const pFont = profile.portfolioFont || 'inter';

  const sections = profile.portfolioSections;
  const initials = profile.fullName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  const show = (key: string) => !sections || (sections as unknown as Record<string, boolean>)[key] !== false;
  const hasExperience = show('experience') && resume.experience?.length > 0;
  const hasEducation = show('education') && resume.education?.length > 0;
  const hasSkills = show('skills') && resume.skills?.length > 0;
  const hasProjects = show('projects') && resume.projects?.length > 0;
  const hasCerts = show('certifications') && resume.certifications?.length > 0;
  const hasCaseStudies = profile.caseStudies?.length > 0;
  const hasServices = profile.services?.length > 0;

  const themeVars = getThemeVars(pStyle, accentColor, pFont);

  const rootStyle: React.CSSProperties = {
    ...themeVars,
    fontFamily: 'var(--pf-body-font, Inter, system-ui, sans-serif)',
    ...(pStyle === 'bold-dark' ? {
      '--pf-bg': '#0a0a0f',
      '--pf-bg-alpha': 'rgba(10,10,15,0.88)',
      '--pf-card': 'rgba(255,255,255,0.03)',
      '--pf-border': 'rgba(255,255,255,0.08)',
      '--pf-fg': '#f8f8ff',
      '--pf-muted': '#9ca3af',
    } as React.CSSProperties : pStyle === 'glass-pro' ? {
      '--pf-bg': '#0d1117',
      '--pf-bg-alpha': 'rgba(13,17,23,0.88)',
      '--pf-card': 'rgba(255,255,255,0.06)',
      '--pf-border': 'rgba(255,255,255,0.1)',
      '--pf-fg': '#f0f4ff',
      '--pf-muted': '#a0aec0',
    } as React.CSSProperties : pStyle === 'classic-clean' ? {
      '--pf-bg': '#ffffff',
      '--pf-bg-alpha': 'rgba(255,255,255,0.92)',
      '--pf-card': '#f9f9f9',
      '--pf-border': '#e5e7eb',
      '--pf-fg': '#111827',
      '--pf-muted': '#6b7280',
    } as React.CSSProperties : /* minimal */ {
      '--pf-bg': '#0a0a14',
      '--pf-bg-alpha': 'rgba(10,10,20,0.88)',
      '--pf-card': 'rgba(255,255,255,0.04)',
      '--pf-border': 'rgba(255,255,255,0.08)',
      '--pf-fg': '#f5f5ff',
      '--pf-muted': '#9ca3af',
    } as React.CSSProperties),
  };

  const heroBg: React.CSSProperties = pStyle === 'bold-dark'
    ? { background: `radial-gradient(ellipse 90% 50% at 50% 0%, color-mix(in srgb, ${accentColor} 22%, transparent), transparent)` }
    : pStyle === 'glass-pro'
    ? { background: `radial-gradient(ellipse 90% 60% at 50% -5%, color-mix(in srgb, ${accentColor} 16%, transparent), transparent)` }
    : pStyle === 'classic-clean'
    ? { background: `linear-gradient(180deg, color-mix(in srgb, ${accentColor} 6%, #ffffff), #ffffff 60%)` }
    : { background: `radial-gradient(ellipse 80% 40% at 50% 0%, color-mix(in srgb, ${accentColor} 14%, transparent), transparent)` };

  const isTwoCol = pLayout === 'two-col';

  const allSkills = resume.skills.map((s) => typeof s === 'string' ? s : (s as Record<string, string>).name || String(s));
  const hasMoreSkills = allSkills.length > SKILL_CLOUD_LIMIT;

  // Tagline: availability headline or first ~80 chars of bio
  const tagline = profile.availabilityHeadline || (profile.portfolioBio ? profile.portfolioBio.slice(0, 90) + (profile.portfolioBio.length > 90 ? '…' : '') : null);

  return (
    <div
      id="portfolio-content"
      className="min-h-screen"
      style={{ ...rootStyle, backgroundColor: 'var(--pf-bg, #0a0a14)', color: 'var(--pf-fg, #f5f5ff)' }}
      data-portfolio-style={pStyle}
    >
      {/* Sticky mini-header */}
      <StickyHeader
        name={profile.fullName}
        avatarUrl={profile.avatarUrl}
        initials={initials}
        contactEmail={profile.contactEmail}
        accentColor={accentColor}
        visible={stickyVisible}
      />

      <motion.div
        className="max-w-4xl mx-auto px-4 py-0"
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <motion.div
          ref={heroRef}
          variants={fadeUp}
          className="relative flex flex-col items-center text-center pt-16 pb-12 px-4"
          style={heroBg}
        >
          {/* Ambient gradient background (dark themes only) */}
          {pStyle !== 'classic-clean' && (
            <div className="pf-hero-ambient rounded-2xl" aria-hidden="true" />
          )}

          {/* Avatar with animated glow ring */}
          <div className="relative mb-6">
            <div
              className="absolute inset-0 rounded-full scale-125 animate-pulse opacity-20 blur-lg"
              style={{ background: accentColor }}
            />
            <div
              className="absolute inset-[-4px] rounded-full opacity-40"
              style={{ background: `conic-gradient(${accentColor}, transparent, ${accentColor})`, animation: 'spin 6s linear infinite' }}
            />
            <Avatar className="h-36 w-36 relative z-10 border-[3px]" style={{ borderColor: accentColor }}>
              <AvatarFallback
                className="text-4xl font-black"
                style={{ background: `linear-gradient(135deg, ${accentColor}, color-mix(in srgb, ${accentColor} 60%, purple))`, color: '#fff' }}
              >
                {initials}
              </AvatarFallback>
              <AvatarImage src={profile.avatarUrl || undefined} />
            </Avatar>
          </div>

          {/* Name — dominant */}
          <h1 className="text-5xl md:text-6xl font-black leading-tight mb-3" style={{ fontFamily: 'var(--pf-heading-font)' }}>
            {profile.fullName || 'Anonymous'}
          </h1>

          {/* Role pill + Open to Work badge + location + social + CTAs with entrance animations */}
          {(() => {
            const nameLen = (profile.fullName || 'Anonymous').length;
            const badgeDelay = nameLen * 35 + 200 + 100;
            const locationDelay = badgeDelay + 200;
            const ctaBaseDelay = badgeDelay + 150;
            let ctaIdx = 0;
            return (<>
          <div className="flex items-center justify-center gap-2.5 flex-wrap mb-3 pf-badge-entrance" style={{ animationDelay: `${badgeDelay}ms` }}>
            {profile.jobTitle && (
              <span className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-1.5 rounded-full"
                style={{ background: `color-mix(in srgb, ${accentColor} 15%, transparent)`, color: accentColor, border: `1px solid color-mix(in srgb, ${accentColor} 35%, transparent)` }}>
                {profile.jobTitle}
              </span>
            )}
            {profile.openToWork && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full" style={{
                background: 'rgba(34,197,94,0.15)',
                color: '#22c55e',
                border: '1px solid rgba(34,197,94,0.3)',
              }}>
                <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
                Open to Work
              </span>
            )}
          </div>

          {/* Active today badge — only when openToWork + active within 24h */}
          {profile.openToWork && isActiveWithin24h(liveLastActiveAt) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-3"
              style={{
                background: 'rgba(34,197,94,0.10)',
                color: '#22c55e',
                border: '1px solid rgba(34,197,94,0.25)',
              }}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22c55e]" />
              </span>
              Active today — responds within 24h
            </motion.div>
          )}


          <div className="flex items-center justify-center gap-3 mb-3 flex-wrap pf-fade-entrance" style={{ animationDelay: `${locationDelay}ms` }}>
            {profile.location && (
              <span className="inline-flex items-center gap-1 text-sm" style={{ color: 'var(--pf-muted, #9ca3af)' }}>
                <MapPin className="w-3.5 h-3.5" />{profile.location}
              </span>
            )}
            {profile.industry && (
              <span className="text-xs px-2.5 py-1 rounded-full" style={{
                background: 'var(--pf-card, rgba(255,255,255,0.06))',
                border: '1px solid var(--pf-border, rgba(255,255,255,0.08))',
                color: 'var(--pf-muted, #9ca3af)',
              }}>
                {profile.industry}
              </span>
            )}
          </div>

          {/* Typewriter Tagline */}
          <div className="pf-fade-entrance" style={{ animationDelay: `${locationDelay}ms` }}>
            {(() => {
              const phrases = buildTypewriterPhrases(profile, allSkills);
              return phrases.length > 0 ? (
                <TypewriterText phrases={phrases} accentColor={accentColor} />
              ) : null;
            })()}
          </div>

          {/* Social icon buttons */}
          {(profile.linkedinUrl || profile.githubUrl || profile.websiteUrl || profile.twitterUrl) && (
            <div className="flex items-center justify-center gap-2 mb-6">
              {profile.linkedinUrl && (
                <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer"
                  className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 pf-cta-entrance"
                  style={{ background: 'var(--pf-card, rgba(255,255,255,0.06))', border: '1px solid var(--pf-border, rgba(255,255,255,0.1))', animationDelay: `${ctaBaseDelay + (ctaIdx++) * 120}ms` }}
                  title="LinkedIn">
                  <Linkedin className="w-4.5 h-4.5" style={{ color: 'var(--pf-fg, #f5f5ff)' }} />
                </a>
              )}
              {profile.githubUrl && (
                <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer"
                  className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 pf-cta-entrance"
                  style={{ background: 'var(--pf-card, rgba(255,255,255,0.06))', border: '1px solid var(--pf-border, rgba(255,255,255,0.1))', animationDelay: `${ctaBaseDelay + (ctaIdx++) * 120}ms` }}
                  title="GitHub">
                  <Github className="w-4.5 h-4.5" style={{ color: 'var(--pf-fg, #f5f5ff)' }} />
                </a>
              )}
              {profile.websiteUrl && (
                <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer"
                  className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 pf-cta-entrance"
                  style={{ background: 'var(--pf-card, rgba(255,255,255,0.06))', border: '1px solid var(--pf-border, rgba(255,255,255,0.1))', animationDelay: `${ctaBaseDelay + (ctaIdx++) * 120}ms` }}
                  title="Website">
                  <Globe className="w-4.5 h-4.5" style={{ color: 'var(--pf-fg, #f5f5ff)' }} />
                </a>
              )}
              {profile.twitterUrl && (
                <a href={profile.twitterUrl} target="_blank" rel="noopener noreferrer"
                  className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 pf-cta-entrance"
                  style={{ background: 'var(--pf-card, rgba(255,255,255,0.06))', border: '1px solid var(--pf-border, rgba(255,255,255,0.1))', animationDelay: `${ctaBaseDelay + (ctaIdx++) * 120}ms` }}
                  title="X / Twitter">
                  <X className="w-4.5 h-4.5" style={{ color: 'var(--pf-fg, #f5f5ff)' }} />
                </a>
              )}
            </div>
          )}

          {/* CTAs: primary = Get in Touch, secondary = View Projects, tertiary = Download */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {profile.contactEmail && (
              <a
                href={`mailto:${profile.contactEmail}`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all hover:scale-105 active:scale-95 shadow-lg pf-cta-entrance"
                style={{ background: accentColor, color: '#fff', boxShadow: `0 4px 20px -4px ${accentColor}60`, animationDelay: `${ctaBaseDelay + (ctaIdx++) * 120}ms` }}
              >
                <Mail className="w-4 h-4" /> Get in Touch
              </a>
            )}
            {hasProjects && (
              <a
                href="#projects"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-all hover:scale-105 active:scale-95 border pf-cta-entrance"
                style={{ borderColor: `color-mix(in srgb, ${accentColor} 50%, transparent)`, color: accentColor, background: `color-mix(in srgb, ${accentColor} 8%, transparent)`, animationDelay: `${ctaBaseDelay + (ctaIdx++) * 120}ms` }}
              >
                <FolderOpen className="w-4 h-4" /> View Projects
              </a>
            )}
            <button
              onClick={() => { haptics.light(); setShowCareerCard(true); }}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full font-semibold text-sm transition-all hover:scale-105 active:scale-95 border pf-cta-entrance"
              style={{
                borderColor: `color-mix(in srgb, ${accentColor} 50%, transparent)`,
                color: accentColor,
                background: `color-mix(in srgb, ${accentColor} 8%, transparent)`,
                animationDelay: `${ctaBaseDelay + (ctaIdx++) * 120}ms`,
              }}
            >
              <Sparkles className="w-4 h-4" /> Share Card
            </button>
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full font-medium text-sm transition-all hover:scale-105 active:scale-95 border pf-cta-entrance"
              style={{ background: 'transparent', borderColor: 'var(--pf-border, rgba(255,255,255,0.2))', color: 'var(--pf-fg, #f5f5ff)', animationDelay: `${ctaBaseDelay + (ctaIdx++) * 120}ms` }}
            >
              {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isDownloading ? 'Generating…' : 'Download CV'}
            </button>
          </div>
            </>);
          })()}
        </motion.div>

        {/* ── Body content ─────────────────────────────────────────────── */}
        <div className={`px-2 pb-20 pt-10 ${isTwoCol ? 'md:grid md:grid-cols-5 md:gap-10' : 'space-y-10'}`}>

          {/* Left column (or full width in single layout) */}
          <div className={isTwoCol ? 'md:col-span-3 space-y-10' : 'space-y-10'}>

            {/* About */}
            {profile.portfolioBio && (
              <motion.section variants={bioFade} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}>
                <SectionHeader icon={<Briefcase className="w-5 h-5" />} title="About" style={pStyle} />
                <div className="p-5 rounded-2xl"
                  style={{ background: 'var(--pf-card, rgba(255,255,255,0.04))', border: '1px solid var(--pf-border, rgba(255,255,255,0.08))' }}>
                  <p className="text-sm leading-loose" style={{ color: 'var(--pf-muted, #9ca3af)' }}>
                    {profile.portfolioBio}
                  </p>
                </div>
              </motion.section>
            )}

            {/* Experience */}
            {hasExperience && (
              <motion.section variants={stagger} id="section-experience">
                <SectionHeader icon={<Briefcase className="w-5 h-5" />} title="Experience" style={pStyle} />
                <div className="space-y-4" ref={(node) => {
                  if (!node || node.dataset.observed) return;
                  node.dataset.observed = 'true';
                  const obs = new IntersectionObserver(([entry]) => {
                    if (entry.isIntersecting) {
                      node.querySelectorAll('.pf-exp-card').forEach((card, idx) => {
                        (card as HTMLElement).style.animationDelay = `${idx * 100}ms`;
                        card.classList.add('pf-card-revealed');
                      });
                      obs.disconnect();
                    }
                  }, { threshold: 0.15 });
                  obs.observe(node);
                }}>
                  {resume.experience.map((exp, i) => (
                    <ExperienceCard key={exp.id || i} exp={exp} style={pStyle} isLast={i === resume.experience.length - 1} index={i} />
                  ))}
                </div>
              </motion.section>
            )}

            {/* Case Studies */}
            {hasCaseStudies && (
              <motion.section variants={stagger} id="section-case-studies">
                <SectionHeader icon={<Layers className="w-5 h-5" />} title="Case Studies" style={pStyle} />
                <div className="space-y-5">
                  {profile.caseStudies.map((cs) => (
                    <CaseStudyCard key={cs.id} cs={cs} style={pStyle} />
                  ))}
                </div>
              </motion.section>
            )}

            {/* Projects */}
            {hasProjects && (
              <motion.section id="section-projects" variants={stagger}>
                <SectionHeader icon={<FolderOpen className="w-5 h-5" />} title="Projects" style={pStyle} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {resume.projects.map((p, i) => (
                    <ProjectCard key={p.id || i} project={p} style={pStyle} />
                  ))}
                </div>
              </motion.section>
            )}

            {/* Services */}
            {hasServices && (
              <motion.section variants={stagger} id="section-services">
                <SectionHeader icon={<Wrench className="w-5 h-5" />} title="Services" style={pStyle} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {profile.services.map((s) => (
                    <ServiceCard key={s.id} service={s} style={pStyle} />
                  ))}
                </div>
              </motion.section>
            )}
          </div>

          {/* Right column (two-col) or inline below (single) */}
          <div className={isTwoCol ? 'md:col-span-2 space-y-10' : 'space-y-10'}>

            {/* Skills */}
            {hasSkills && (
              <motion.section
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
                className={isTwoCol ? 'md:sticky md:top-8' : ''}
                id="section-skills"
              >
                <SectionHeader icon={<Award className="w-5 h-5" />} title="Skills" style={pStyle} />
                <SkillCloud
                  skills={allSkills}
                  experience={resume.experience}
                  projects={resume.projects}
                  pStyle={pStyle}
                  showMore={showMoreSkills}
                  onToggleMore={() => setShowMoreSkills(v => !v)}
                  hasMore={hasMoreSkills}
                  moreCount={allSkills.length - SKILL_CLOUD_LIMIT}
                />
              </motion.section>
            )}

            {/* Education */}
            {hasEducation && (
              <motion.section variants={stagger} id="section-education">
                <SectionHeader icon={<GraduationCap className="w-5 h-5" />} title="Education" style={pStyle} />
                <div className="space-y-4" ref={(el) => {
                  if (!el || (el as HTMLElement & { __eduObserved?: boolean }).__eduObserved) return;
                  (el as HTMLElement & { __eduObserved?: boolean }).__eduObserved = true;
                  const observer = new IntersectionObserver(
                    ([entry]) => {
                      if (!entry.isIntersecting) return;
                      const cards = el.querySelectorAll('.pf-edu-card');
                      cards.forEach((card, i) => {
                        (card as HTMLElement).style.animationDelay = `${i * 120}ms`;
                        card.classList.add('pf-edu-revealed');
                      });
                      observer.disconnect();
                    },
                    { threshold: 0.2, rootMargin: '0px 0px -50px 0px' }
                  );
                  observer.observe(el);
                }}>
                  {resume.education.map((edu, i) => (
                    <EducationCard key={edu.id || i} edu={edu} style={pStyle} />
                  ))}
                </div>
              </motion.section>
            )}

            {/* Certifications */}
            {hasCerts && (
              <motion.section variants={stagger}>
                <SectionHeader icon={<Award className="w-5 h-5" />} title="Certifications" style={pStyle} />
                <div className="space-y-3">
                  {resume.certifications.map((cert, i) => (
                    <motion.div key={cert.id || i} variants={fadeUp} className="p-4 rounded-xl" style={{
                      background: 'var(--pf-card, rgba(255,255,255,0.04))',
                      border: '1px solid var(--pf-border, rgba(255,255,255,0.08))',
                    }}>
                      <h4 className="font-semibold text-sm" style={{ color: 'var(--pf-fg, inherit)' }}>{cert.name}</h4>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--pf-muted, #9ca3af)' }}>{cert.issuer} · {cert.date}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            )}
          </div>
        </div>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <motion.div variants={fadeUp} className="text-center py-10 border-t" style={{ borderColor: 'var(--pf-border, rgba(255,255,255,0.08))' }}>
          <a
            href={window.location.origin}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs transition-opacity hover:opacity-80"
            style={{ color: 'var(--pf-muted, #9ca3af)' }}
          >
            Built with <span className="font-bold" style={{ color: accentColor }}>WiseResume</span> · Create your free portfolio →
          </a>
        </motion.div>
      </motion.div>
      <ChatWidget
        profile={profile}
        resume={resume}
        accentColor={accentColor}
        pStyle={pStyle}
      />
      <CareerCardSheet
        open={showCareerCard}
        onOpenChange={setShowCareerCard}
        profile={{
          fullName: profile.fullName,
          avatarUrl: profile.avatarUrl,
          jobTitle: profile.jobTitle,
          location: profile.location,
          openToWork: profile.openToWork,
          username: profile.username,
          portfolioAccentColor: profile.portfolioAccentColor,
        }}
        selectedResume={{
          id: resume.id,
          title: resume.title,
          skills: resume.skills,
          experience: resume.experience,
        }}
        accentColor={accentColor}
      />
    </div>
  );
}

export default function PublicPortfolioPage() {
  return (
    <ErrorBoundary>
      <PublicPortfolioContent />
    </ErrorBoundary>
  );
}
