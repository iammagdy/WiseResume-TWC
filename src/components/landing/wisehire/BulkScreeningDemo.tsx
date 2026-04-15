import { useEffect, useState } from 'react';
import { Upload, Loader2, CheckCircle2 } from 'lucide-react';

const CANDIDATES = [
  { initials: 'AK', name: 'Alex Kim', score: 91, status: 'done' as const },
  { initials: 'PM', name: 'Priya M.', score: 87, status: 'done' as const },
  { initials: 'TB', name: 'Tom B.', score: 74, status: 'done' as const },
  { initials: 'SC', name: 'Sarah C.', score: 83, status: 'done' as const },
  { initials: 'JW', name: 'James W.', score: 66, status: 'done' as const },
];

function scoreColor(s: number) {
  if (s >= 85) return '#34D399';
  if (s >= 75) return '#60A5FA';
  return '#94A3B8';
}

function avatarBg(i: number) {
  const bgs = [
    'linear-gradient(135deg,#3B82F6,#1D4ED8)',
    'linear-gradient(135deg,#8B5CF6,#6D28D9)',
    'linear-gradient(135deg,#10B981,#059669)',
    'linear-gradient(135deg,#F59E0B,#D97706)',
    'linear-gradient(135deg,#EF4444,#DC2626)',
  ];
  return bgs[i % bgs.length];
}

export function BulkScreeningDemo() {
  const [revealed, setRevealed] = useState(0);
  const [uploading, setUploading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const run = () => {
      setRevealed(0);
      setUploading(true);

      const uploadTimer = setTimeout(() => {
        if (cancelled) return;
        setUploading(false);

        let idx = 0;
        const reveal = () => {
          if (cancelled) return;
          idx += 1;
          setRevealed(idx);
          if (idx < CANDIDATES.length) {
            setTimeout(reveal, 500);
          } else {
            setTimeout(() => {
              if (!cancelled) run();
            }, 3000);
          }
        };
        setTimeout(reveal, 300);
      }, 1200);

      return () => clearTimeout(uploadTimer);
    };

    const cleanup = run();
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

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
        <Upload className="w-3.5 h-3.5" style={{ color: '#3B82F6', flexShrink: 0 }} />
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--lp-text)' }}>Bulk Screening</span>
        {uploading ? (
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.62rem', color: '#3B82F6', fontWeight: 600 }}>
            <Loader2 className="w-3 h-3 animate-spin" /> Uploading CVs…
          </span>
        ) : (
          <span style={{ marginLeft: 'auto', fontSize: '0.62rem', color: 'var(--lp-text-muted)', fontWeight: 500 }}>
            5 CVs · ranked by AI
          </span>
        )}
      </div>

      {uploading ? (
        <div style={{ padding: '28px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: 'rgba(29,78,216,0.10)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Upload className="w-6 h-6" style={{ color: '#3B82F6' }} />
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--lp-text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
            Uploading 5 CVs and<br />scoring against role criteria…
          </p>
          <div style={{ width: '80%', height: 4, borderRadius: 99, background: 'rgba(29,78,216,0.10)', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                borderRadius: 99,
                background: '#3B82F6',
                animation: 'lp-progress 1.2s ease forwards',
                width: '100%',
                transformOrigin: 'left',
                transform: 'scaleX(0)',
              }}
            />
          </div>
          <style>{`@keyframes lp-progress { from { transform: scaleX(0); } to { transform: scaleX(1); } }`}</style>
        </div>
      ) : (
        <div style={{ padding: '10px 14px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#34D399' }} />
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--lp-text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Ranked results
            </span>
          </div>
          {CANDIDATES.map((c, i) => (
            <div
              key={c.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                borderRadius: 10,
                background: 'var(--lp-card-glass)',
                border: '1px solid var(--lp-border-card)',
                padding: '7px 10px',
                opacity: i < revealed ? 1 : 0,
                transform: i < revealed ? 'translateY(0)' : 'translateY(6px)',
                transition: 'opacity 0.35s ease, transform 0.35s ease',
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: avatarBg(i),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '0.52rem',
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {c.initials}
              </div>
              <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--lp-text)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.name}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <div style={{ width: 52, height: 4, borderRadius: 99, background: 'rgba(29,78,216,0.10)', overflow: 'hidden' }}>
                  <div style={{ width: `${c.score}%`, height: '100%', borderRadius: 99, background: scoreColor(c.score), transition: 'width 0.5s ease' }} />
                </div>
                <span style={{ fontSize: '0.62rem', fontWeight: 700, color: scoreColor(c.score), minWidth: 22, textAlign: 'right' }}>{c.score}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
