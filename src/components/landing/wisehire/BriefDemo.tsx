import { useEffect, useState } from 'react';
import { Brain, CheckCircle2, AlertTriangle, MessageSquare } from 'lucide-react';

const STRENGTHS = [
  '6 years React & TypeScript — production at scale',
  'Led cross-functional team of 9 engineers',
  'Shipped 3 full product redesigns on time',
];

const CONCERNS = [
  'No direct Go or Rust experience listed',
];

const INTERVIEW_Q = 'Describe a time you balanced technical debt against a shipping deadline.';

export function BriefDemo() {
  const [score, setScore] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 400);
    return () => clearTimeout(t1);
  }, []);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;

    const animate = () => {
      let current = 0;
      const target = 87;
      const step = () => {
        if (cancelled) return;
        current = Math.min(current + 2, target);
        setScore(current);
        if (current < target) {
          requestAnimationFrame(step);
        } else {
          setTimeout(() => {
            if (!cancelled) {
              setScore(0);
              setTimeout(() => {
                if (!cancelled) animate();
              }, 500);
            }
          }, 2500);
        }
      };
      setTimeout(() => { if (!cancelled) requestAnimationFrame(step); }, 200);
    };

    animate();
    return () => { cancelled = true; };
  }, [visible]);

  const radius = 32;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 320,
        borderRadius: 16,
        background: 'var(--lp-card)',
        border: '1px solid var(--lp-border-card)',
        overflow: 'hidden',
        fontFamily: 'inherit',
      }}
    >
      {/* Header bar */}
      <div
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid var(--lp-border)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(29,78,216,0.06)',
        }}
      >
        <Brain className="w-3.5 h-3.5" style={{ color: '#3B82F6', flexShrink: 0 }} />
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--lp-text)', letterSpacing: '0.02em' }}>
          AI Candidate Brief
        </span>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: '0.62rem',
            fontWeight: 600,
            background: 'rgba(29,78,216,0.14)',
            color: '#3B82F6',
            borderRadius: 6,
            padding: '2px 7px',
          }}
        >
          Senior FE Engineer
        </span>
      </div>

      <div style={{ padding: '14px 14px 16px' }}>
        {/* Candidate row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'linear-gradient(135deg,#3B82F6,#1D4ED8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 800,
              fontSize: '0.85rem',
              flexShrink: 0,
            }}
          >
            SC
          </div>
          <div>
            <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--lp-text)', lineHeight: 1.2 }}>Sarah Chen</p>
            <p style={{ fontSize: '0.68rem', color: 'var(--lp-text-muted)' }}>6 yrs exp · London, UK</p>
          </div>

          {/* Score dial */}
          <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <svg width={80} height={80} viewBox="0 0 80 80">
              <circle cx={40} cy={40} r={radius} fill="none" stroke="rgba(29,78,216,0.12)" strokeWidth={7} />
              <circle
                cx={40}
                cy={40}
                r={radius}
                fill="none"
                stroke="#3B82F6"
                strokeWidth={7}
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={offset}
                transform="rotate(-90 40 40)"
                style={{ transition: 'stroke-dashoffset 0.05s linear' }}
              />
              <text x={40} y={44} textAnchor="middle" fill="#3B82F6" fontSize={13} fontWeight={800}>
                {score}
              </text>
              <text x={40} y={54} textAnchor="middle" fill="rgba(29,78,216,0.5)" fontSize={8}>
                /100
              </text>
            </svg>
            <span style={{ fontSize: '0.6rem', fontWeight: 600, color: 'var(--lp-text-muted)', marginTop: -4 }}>Match score</span>
          </div>
        </div>

        {/* Strengths */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
            <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#22c55e', flexShrink: 0 }} />
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--lp-text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Strengths
            </span>
          </div>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {STRENGTHS.map((s) => (
              <li key={s} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#22c55e', flexShrink: 0, marginTop: 5 }} />
                <span style={{ fontSize: '0.68rem', color: 'var(--lp-text)', lineHeight: 1.45 }}>{s}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Concerns */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
            <AlertTriangle className="w-3.5 h-3.5" style={{ color: '#f59e0b', flexShrink: 0 }} />
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--lp-text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Considerations
            </span>
          </div>
          {CONCERNS.map((c) => (
            <div key={c} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#f59e0b', flexShrink: 0, marginTop: 5 }} />
              <span style={{ fontSize: '0.68rem', color: 'var(--lp-text)', lineHeight: 1.45 }}>{c}</span>
            </div>
          ))}
        </div>

        {/* Top interview question */}
        <div
          style={{
            borderRadius: 10,
            background: 'rgba(29,78,216,0.07)',
            border: '1px solid rgba(29,78,216,0.14)',
            padding: '8px 10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
            <MessageSquare className="w-3 h-3" style={{ color: '#3B82F6', flexShrink: 0 }} />
            <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#3B82F6', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Top interview Q
            </span>
          </div>
          <p style={{ fontSize: '0.67rem', color: 'var(--lp-text)', lineHeight: 1.5 }}>{INTERVIEW_Q}</p>
        </div>
      </div>
    </div>
  );
}
