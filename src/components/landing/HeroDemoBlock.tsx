import { useState, useEffect, useRef } from 'react';
import { Sparkles, ArrowRight, Wand2, Mic } from 'lucide-react';

interface HeroDemoBlockProps {
  onCTA: () => void;
  isAuthenticated: boolean;
}

type Phase = 'idle' | 'thinking' | 'typing' | 'done';

const DEMO_ITEMS = [
  {
    chip: 'Improve my resume bullet',
    icon: Sparkles,
    response: [
      'Here\'s your improved bullet:',
      '',
      'Before: "Managed team projects and helped deliver products on time"',
      '',
      'After: "Led cross-functional team of 6 to ship 3 product features on schedule, cutting time-to-market by 22%"',
      '',
      '✦ Added team size, feature count, and a measurable outcome. Recruiters notice this.',
    ],
  },
  {
    chip: 'Tailor my resume',
    icon: Wand2,
    response: [
      'Tailored for Senior Product Manager at Stripe.',
      '',
      'ATS match: 87% ↑ (up from 61%)',
      '',
      'Keywords added: payments infrastructure, cross-functional leadership, data-driven prioritisation.',
      '',
      '⚠ One gap: add "stakeholder alignment" to your Experience section to reach 95%+.',
    ],
  },
  {
    chip: 'Mock interview me',
    icon: Mic,
    response: [
      'Here\'s your question:',
      '',
      '"Tell me about a time you had competing priorities. How did you decide what to focus on?"',
      '',
      'Tip: Use Situation → Action → Result. Include team size and an outcome metric for maximum impact.',
      '',
      'I\'ll score your answer when you\'re ready.',
    ],
  },
];

function ThinkingDots() {
  const [dots, setDots] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setDots(d => d === 3 ? 1 : d + 1), 400);
    return () => clearInterval(id);
  }, []);
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center', paddingTop: 2 }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            width: 5, height: 5, borderRadius: '50%',
            background: 'var(--lp-brand)',
            opacity: dots > i ? 0.9 : 0.25,
            transition: 'opacity 0.2s ease',
          }}
        />
      ))}
    </span>
  );
}

function AIAvatar() {
  return (
    <div style={{
      width: 26, height: 26, borderRadius: 7, flexShrink: 0,
      background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Sparkles style={{ width: 12, height: 12, color: '#fff' }} />
    </div>
  );
}

export function HeroDemoBlock({ onCTA, isAuthenticated }: HeroDemoBlockProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [typedLines, setTypedLines] = useState<string[]>([]);
  const [currentLineIdx, setCurrentLineIdx] = useState(0);
  const [currentLineChars, setCurrentLineChars] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTyping = () => {
    if (typingRef.current) {
      clearInterval(typingRef.current);
      typingRef.current = null;
    }
  };

  const startTyping = (idx: number) => {
    setTypedLines([]);
    setCurrentLineIdx(0);
    setCurrentLineChars(0);
    setPhase('typing');

    const lines = DEMO_ITEMS[idx].response;
    let lineIdx = 0;
    let charIdx = 0;

    clearTyping();
    typingRef.current = setInterval(() => {
      if (lineIdx >= lines.length) {
        clearTyping();
        setPhase('done');
        return;
      }

      const currentLine = lines[lineIdx];

      if (currentLine === '') {
        setTypedLines(prev => [...prev, '']);
        lineIdx++;
        charIdx = 0;
        setCurrentLineIdx(lineIdx);
        setCurrentLineChars(0);
        return;
      }

      if (charIdx < currentLine.length) {
        charIdx++;
        setCurrentLineChars(charIdx);
        setTypedLines(prev => {
          const next = [...prev];
          next[lineIdx] = currentLine.slice(0, charIdx);
          return next;
        });
      } else {
        lineIdx++;
        charIdx = 0;
        setCurrentLineIdx(lineIdx);
        setCurrentLineChars(0);
        if (lineIdx < lines.length) {
          setTypedLines(prev => [...prev, '']);
        }
      }
    }, 14);
  };

  const handleChip = (idx: number) => {
    clearTyping();
    setSelectedIdx(idx);
    setTypedLines([]);
    setPhase('thinking');

    const delay = 900 + Math.random() * 500;
    setTimeout(() => startTyping(idx), delay);
  };

  useEffect(() => {
    return clearTyping;
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [typedLines, phase]);

  const item = selectedIdx !== null ? DEMO_ITEMS[selectedIdx] : null;

  return (
    <div
      className="relative z-10"
      style={{ width: '100%', maxWidth: 560, marginTop: '2.5rem' }}
    >
      {/* Eyebrow */}
      <div style={{ textAlign: 'center', marginBottom: '0.9rem' }}>
        <p style={{
          fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--lp-eyebrow)', fontWeight: 700, marginBottom: '0.3rem',
        }}>
          Try WiseResume
        </p>
        <p style={{ fontSize: '0.82rem', color: 'var(--lp-text-muted)', lineHeight: 1.5 }}>
          Click a prompt to see the AI in action
        </p>
      </div>

      {/* Chat window */}
      <div
        style={{
          background: 'var(--lp-card)',
          border: '1px solid var(--lp-border-card)',
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        {/* Window chrome bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '10px 14px',
          borderBottom: '1px solid var(--lp-border)',
          background: 'rgba(255,255,255,0.02)',
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
          <span style={{ marginLeft: 6, fontSize: '0.7rem', color: 'var(--lp-text-muted)', letterSpacing: '0.04em' }}>
            WiseResume AI
          </span>
        </div>

        {/* Messages area */}
        <div
          ref={scrollRef}
          style={{
            minHeight: 180,
            maxHeight: 280,
            overflowY: 'auto',
            padding: '16px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            scrollbarWidth: 'none',
          }}
        >
          {/* Idle state */}
          {phase === 'idle' && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flex: 1, minHeight: 140,
            }}>
              <p style={{
                fontSize: '0.82rem', color: 'var(--lp-text-muted)',
                textAlign: 'center', lineHeight: 1.6,
              }}>
                Pick a prompt below to try WiseResume ↓
              </p>
            </div>
          )}

          {/* User message bubble */}
          {phase !== 'idle' && item && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{
                padding: '8px 13px',
                borderRadius: '12px 12px 3px 12px',
                background: '#6366F1',
                color: '#fff',
                fontSize: '0.83rem',
                fontWeight: 500,
                maxWidth: '80%',
                lineHeight: 1.4,
              }}>
                {item.chip}
              </div>
            </div>
          )}

          {/* Thinking state */}
          {phase === 'thinking' && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <AIAvatar />
              <div style={{
                padding: '9px 13px',
                borderRadius: '3px 12px 12px 12px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--lp-border)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--lp-text-muted)' }}>Thinking</span>
                <ThinkingDots />
              </div>
            </div>
          )}

          {/* Typing / done response */}
          {(phase === 'typing' || phase === 'done') && typedLines.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <AIAvatar />
              <div style={{
                padding: '10px 13px',
                borderRadius: '3px 12px 12px 12px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--lp-border)',
                fontSize: '0.83rem',
                color: 'var(--lp-text)',
                lineHeight: 1.6,
                maxWidth: 'calc(100% - 38px)',
                textAlign: 'left',
              }}>
                {typedLines.map((line, i) =>
                  line === '' ? (
                    <div key={i} style={{ height: '0.5em' }} />
                  ) : (
                    <p key={i} style={{ margin: 0 }}>{line}</p>
                  )
                )}
                {/* Blinking cursor while typing */}
                {phase === 'typing' && (
                  <span style={{
                    display: 'inline-block',
                    width: 2, height: '0.9em',
                    background: 'var(--lp-brand)',
                    marginLeft: 2,
                    verticalAlign: 'text-bottom',
                    animation: 'lp-blink 0.8s step-end infinite',
                  }} />
                )}
              </div>
            </div>
          )}

          {/* CTA row after done */}
          {phase === 'done' && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
              <button
                onClick={onCTA}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: '0.78rem', fontWeight: 600,
                  color: 'var(--lp-brand)',
                  background: 'none', border: 'none',
                  cursor: 'pointer', padding: '4px 0',
                }}
              >
                {isAuthenticated ? 'Go to dashboard' : 'Start free — it\'s free'}
                <ArrowRight style={{ width: 12, height: 12 }} />
              </button>
            </div>
          )}
        </div>

        {/* Chip row inside the card bottom */}
        <div style={{
          padding: '10px 14px 12px',
          borderTop: '1px solid var(--lp-border)',
          display: 'flex', gap: 7, flexWrap: 'wrap',
          background: 'rgba(255,255,255,0.01)',
        }}>
          {DEMO_ITEMS.map((item, idx) => {
            const Icon = item.icon;
            const active = selectedIdx === idx && phase !== 'idle';
            return (
              <button
                key={idx}
                onClick={() => handleChip(idx)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px',
                  borderRadius: 999,
                  border: active
                    ? '1px solid rgba(99,102,241,0.45)'
                    : '1px solid var(--lp-border)',
                  background: active
                    ? 'rgba(99,102,241,0.12)'
                    : 'rgba(255,255,255,0.03)',
                  color: active ? 'var(--lp-brand)' : 'var(--lp-text-muted)',
                  fontSize: '0.76rem',
                  fontWeight: active ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.16s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                <Icon style={{ width: 11, height: 11, flexShrink: 0 }} />
                {item.chip}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
