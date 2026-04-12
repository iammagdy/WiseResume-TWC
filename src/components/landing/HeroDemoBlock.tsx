import { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Wand2, Mic } from 'lucide-react';

interface HeroDemoBlockProps {
  onCTA: () => void;
  isAuthenticated: boolean;
}

const CHIPS = [
  { label: 'Improve my resume bullet', icon: Sparkles },
  { label: 'Tailor my resume', icon: Wand2 },
  { label: 'Mock interview me', icon: Mic },
];

function BulletContent() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <p style={{ fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--lp-text-muted)', marginBottom: 4, fontWeight: 600 }}>Before</p>
        <p style={{ fontSize: '0.88rem', color: 'var(--lp-text-muted)', lineHeight: 1.5, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid var(--lp-border)' }}>
          "Managed team projects and helped deliver products on time"
        </p>
      </div>
      <div>
        <p style={{ fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6366F1', marginBottom: 4, fontWeight: 600 }}>After · AI-improved</p>
        <p style={{ fontSize: '0.88rem', color: 'var(--lp-text)', lineHeight: 1.5, padding: '8px 12px', background: 'rgba(99,102,241,0.07)', borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)' }}>
          "Led cross-functional team of 6 to ship 3 product features on schedule, cutting time-to-market by 22%"
        </p>
      </div>
      <p style={{ fontSize: '0.78rem', color: 'var(--lp-text-muted)', lineHeight: 1.5 }}>
        <span style={{ color: '#6366F1', fontWeight: 600 }}>✦ Tip:</span> Added team size, feature count, and a measurable outcome metric.
      </p>
    </div>
  );
}

function TailorContent() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <p style={{ fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--lp-text-muted)', marginBottom: 2, fontWeight: 600 }}>Target role</p>
          <p style={{ fontSize: '0.88rem', color: 'var(--lp-text)', fontWeight: 600 }}>Senior Product Manager · Stripe</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--lp-text-muted)', marginBottom: 2 }}>ATS match</p>
          <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#6366F1', lineHeight: 1 }}>87%</p>
        </div>
      </div>
      <div style={{ height: 1, background: 'var(--lp-border)' }} />
      <div>
        <p style={{ fontSize: '0.75rem', color: 'var(--lp-text-muted)', marginBottom: 6, fontWeight: 600 }}>Keywords added to your resume</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {['payments infrastructure', 'cross-functional leadership', 'data-driven prioritisation'].map(kw => (
            <span key={kw} style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: 999, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: '#818CF8' }}>
              {kw}
            </span>
          ))}
        </div>
      </div>
      <p style={{ fontSize: '0.78rem', color: 'var(--lp-text-muted)', lineHeight: 1.5 }}>
        <span style={{ color: '#F59E0B', fontWeight: 600 }}>⚠ Missing:</span> "stakeholder alignment" — add to your Experience section to reach 95%+.
      </p>
    </div>
  );
}

function InterviewContent() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid var(--lp-border)' }}>
        <p style={{ fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--lp-text-muted)', marginBottom: 4, fontWeight: 600 }}>Interview question</p>
        <p style={{ fontSize: '0.88rem', color: 'var(--lp-text)', lineHeight: 1.5, fontWeight: 500 }}>
          "Tell me about a time you handled a competing priority."
        </p>
      </div>
      <div>
        <p style={{ fontSize: '0.75rem', color: 'var(--lp-text-muted)', marginBottom: 6, fontWeight: 600 }}>Strong answer framework</p>
        <div style={{ display: 'flex', gap: 6 }}>
          {['Situation', 'Action', 'Result'].map((step, i) => (
            <div key={step} style={{ flex: 1, textAlign: 'center', padding: '6px 4px', borderRadius: 8, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)' }}>
              <p style={{ fontSize: '0.65rem', color: 'var(--lp-text-muted)', marginBottom: 2 }}>0{i + 1}</p>
              <p style={{ fontSize: '0.78rem', color: '#818CF8', fontWeight: 600 }}>{step}</p>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: '0.78rem', color: 'var(--lp-text-muted)', lineHeight: 1.5 }}>
          <span style={{ color: '#6366F1', fontWeight: 600 }}>AI score: 8/10</span> — Strong structure. Quantify the result to reach a 10.
        </p>
      </div>
    </div>
  );
}

const DEMO_RESPONSES = [
  { content: <BulletContent /> },
  { content: <TailorContent /> },
  { content: <InterviewContent /> },
];

export function HeroDemoBlock({ onCTA, isAuthenticated }: HeroDemoBlockProps) {
  const [selected, setSelected] = useState(0);
  const [cardVisible, setCardVisible] = useState(true);

  const handleChip = (idx: number) => {
    if (idx === selected) return;
    setCardVisible(false);
    setTimeout(() => {
      setSelected(idx);
      setCardVisible(true);
    }, 160);
  };

  useEffect(() => {
    setCardVisible(true);
  }, []);

  return (
    <div
      className="relative z-10"
      style={{
        width: '100%',
        maxWidth: 600,
        marginTop: '3rem',
        textAlign: 'left',
      }}
    >
      {/* Eyebrow + label */}
      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <p style={{
          fontSize: '0.72rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--lp-eyebrow)',
          fontWeight: 700,
          marginBottom: '0.35rem',
        }}>
          Try WiseResume
        </p>
        <p style={{ fontSize: '0.85rem', color: 'var(--lp-text-muted)', lineHeight: 1.5 }}>
          Preview how WiseResume helps you improve your resume in seconds
        </p>
      </div>

      {/* Chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: '0.875rem' }}>
        {CHIPS.map((chip, idx) => {
          const Icon = chip.icon;
          const active = selected === idx;
          return (
            <button
              key={idx}
              onClick={() => handleChip(idx)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                borderRadius: 999,
                border: active ? '1px solid rgba(99,102,241,0.45)' : '1px solid var(--lp-border)',
                background: active ? 'rgba(99,102,241,0.12)' : 'var(--lp-card-glass)',
                color: active ? 'var(--lp-brand)' : 'var(--lp-text-muted)',
                fontSize: '0.8rem',
                fontWeight: active ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon style={{ width: 13, height: 13, flexShrink: 0 }} />
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Response card */}
      <div
        style={{
          background: 'var(--lp-card)',
          border: '1px solid var(--lp-border-card)',
          borderRadius: 16,
          padding: '20px 20px 16px',
          opacity: cardVisible ? 1 : 0,
          transform: cardVisible ? 'translateY(0)' : 'translateY(6px)',
          transition: 'opacity 0.22s ease, transform 0.22s ease',
        }}
      >
        {/* AI label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
          <div style={{
            width: 22, height: 22, borderRadius: 6,
            background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Sparkles style={{ width: 11, height: 11, color: '#fff' }} />
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--lp-text-muted)', fontWeight: 600 }}>
            WiseResume AI
          </p>
        </div>

        {/* Dynamic content */}
        {DEMO_RESPONSES[selected].content}

        {/* Card CTA */}
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--lp-border)' }}>
          <button
            onClick={onCTA}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: '0.82rem',
              fontWeight: 600,
              color: 'var(--lp-brand)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {isAuthenticated ? 'Open full editor' : 'Start free'}
            <ArrowRight style={{ width: 13, height: 13 }} />
          </button>
        </div>
      </div>
    </div>
  );
}
