import { useState, useEffect } from 'react';

const COLUMNS = [
  { label: 'Applied', color: 'rgba(148,163,184,0.6)', bg: 'rgba(148,163,184,0.08)' },
  { label: 'Screening', color: '#60A5FA', bg: 'rgba(96,165,250,0.08)' },
  { label: 'Interview', color: '#A78BFA', bg: 'rgba(167,139,250,0.08)' },
  { label: 'Offer', color: '#34D399', bg: 'rgba(52,211,153,0.08)' },
];

const INITIAL_CARDS: { id: number; name: string; initials: string; role: string; score: number; col: number }[] = [
  { id: 1, name: 'Alex Kim', initials: 'AK', role: 'FE Eng', score: 91, col: 0 },
  { id: 2, name: 'Priya M.', initials: 'PM', role: 'FE Eng', score: 87, col: 0 },
  { id: 3, name: 'Tom B.', initials: 'TB', role: 'FE Eng', score: 74, col: 0 },
  { id: 4, name: 'Sarah C.', initials: 'SC', role: 'FE Eng', score: 87, col: 1 },
  { id: 5, name: 'James W.', initials: 'JW', role: 'FE Eng', score: 80, col: 1 },
  { id: 6, name: 'Lisa O.', initials: 'LO', role: 'FE Eng', score: 93, col: 2 },
  { id: 7, name: 'David H.', initials: 'DH', role: 'FE Eng', score: 78, col: 3 },
];

function scoreColor(s: number) {
  if (s >= 90) return '#34D399';
  if (s >= 80) return '#60A5FA';
  return '#94A3B8';
}

function avatarBg(i: number) {
  const bgs = [
    'linear-gradient(135deg,#3B82F6,#1D4ED8)',
    'linear-gradient(135deg,#8B5CF6,#6D28D9)',
    'linear-gradient(135deg,#10B981,#059669)',
    'linear-gradient(135deg,#F59E0B,#D97706)',
    'linear-gradient(135deg,#EF4444,#DC2626)',
    'linear-gradient(135deg,#EC4899,#DB2777)',
    'linear-gradient(135deg,#06B6D4,#0891B2)',
  ];
  return bgs[i % bgs.length];
}

export function PipelineDemo() {
  const [cards, setCards] = useState(INITIAL_CARDS);
  const [animId, setAnimId] = useState<number | null>(null);

  useEffect(() => {
    const cycle = () => {
      setCards((prev) => {
        const toMove = prev.find((c) => c.col < 3);
        if (!toMove) return prev;
        setAnimId(toMove.id);
        return prev.map((c) => c.id === toMove.id ? { ...c, col: c.col + 1 } : c);
      });
    };

    const interval = setInterval(() => {
      cycle();
      setTimeout(() => setAnimId(null), 600);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const colCards = (col: number) => cards.filter((c) => c.col === col);

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 380,
        borderRadius: 16,
        background: 'var(--lp-card)',
        border: '1px solid var(--lp-border-card)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
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
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--lp-text)' }}>Pipeline Board</span>
        <span style={{ marginLeft: 'auto', fontSize: '0.62rem', color: 'var(--lp-text-muted)' }}>7 candidates</span>
      </div>

      {/* Kanban columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0 }}>
        {COLUMNS.map((col, ci) => (
          <div
            key={col.label}
            style={{
              borderRight: ci < 3 ? '1px solid var(--lp-border)' : undefined,
              minHeight: 220,
              padding: '10px 6px',
            }}
          >
            {/* Column header */}
            <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: col.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--lp-text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {col.label}
              </span>
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: '0.58rem',
                  fontWeight: 600,
                  color: col.color,
                  background: col.bg,
                  borderRadius: 99,
                  padding: '1px 5px',
                }}
              >
                {colCards(ci).length}
              </span>
            </div>

            {/* Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {colCards(ci).map((card, i) => (
                <div
                  key={card.id}
                  style={{
                    borderRadius: 8,
                    background: animId === card.id ? col.bg : 'var(--lp-card-glass)',
                    border: `1px solid ${animId === card.id ? col.color : 'var(--lp-border-card)'}`,
                    padding: '7px 8px',
                    transition: 'all 0.5s cubic-bezier(0.22,1,0.36,1)',
                    transform: animId === card.id ? 'scale(1.04)' : 'scale(1)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: avatarBg(i + ci * 2),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '0.5rem',
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      {card.initials}
                    </div>
                    <span style={{ fontSize: '0.62rem', fontWeight: 600, color: 'var(--lp-text)', lineHeight: 1.2 }}>
                      {card.name}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.57rem', color: 'var(--lp-text-muted)' }}>{card.role}</span>
                    <span
                      style={{
                        fontSize: '0.57rem',
                        fontWeight: 700,
                        color: scoreColor(card.score),
                        background: `${scoreColor(card.score)}18`,
                        borderRadius: 4,
                        padding: '1px 4px',
                      }}
                    >
                      {card.score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
