import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { CheckCircle2, Clock, Send, TrendingUp } from 'lucide-react';

type OfferStatus = 'pending' | 'sent' | 'accepted' | 'negotiating';

const INITIAL_OFFERS: { id: number; initials: string; name: string; role: string; salary: string; status: OfferStatus }[] = [
  { id: 1, initials: 'LO', name: 'Lisa O.', role: 'Product Designer', salary: '£72,000', status: 'accepted' },
  { id: 2, initials: 'SC', name: 'Sarah C.', role: 'FE Engineer', salary: '£85,000', status: 'negotiating' },
  { id: 3, initials: 'AK', name: 'Alex Kim', role: 'FE Engineer', salary: '£90,000', status: 'sent' },
  { id: 4, initials: 'DH', name: 'David H.', role: 'Backend Eng.', salary: '£78,000', status: 'pending' },
];

const STATUS_TRANSITIONS: Record<OfferStatus, OfferStatus> = {
  pending: 'sent',
  sent: 'negotiating',
  negotiating: 'accepted',
  accepted: 'pending',
};

const STATUS_CONFIG: Record<OfferStatus, { label: string; color: string; bg: string; Icon: typeof CheckCircle2 }> = {
  pending: { label: 'Pending', color: '#94A3B8', bg: 'rgba(148,163,184,0.12)', Icon: Clock },
  sent: { label: 'Sent', color: '#60A5FA', bg: 'rgba(96,165,250,0.12)', Icon: Send },
  negotiating: { label: 'Negotiating', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', Icon: TrendingUp },
  accepted: { label: 'Accepted', color: '#34D399', bg: 'rgba(52,211,153,0.12)', Icon: CheckCircle2 },
};

function avatarBg(i: number) {
  const bgs = [
    'linear-gradient(135deg,#EC4899,#DB2777)',
    'linear-gradient(135deg,#3B82F6,#1D4ED8)',
    'linear-gradient(135deg,#3B82F6,#1D4ED8)',
    'linear-gradient(135deg,#06B6D4,#0891B2)',
  ];
  return bgs[i % bgs.length];
}

export function OfferTrackerDemo() {
  const prefersReduced = useReducedMotion();
  const [offers, setOffers] = useState(INITIAL_OFFERS);
  const [animId, setAnimId] = useState<number | null>(null);

  useEffect(() => {
    if (prefersReduced) return;
    let idx = 0;
    const interval = setInterval(() => {
      const offer = INITIAL_OFFERS[idx % INITIAL_OFFERS.length];
      setAnimId(offer.id);
      setOffers((prev) =>
        prev.map((o) =>
          o.id === offer.id ? { ...o, status: STATUS_TRANSITIONS[o.status] } : o
        )
      );
      setTimeout(() => setAnimId(null), 700);
      idx += 1;
    }, 1800);

    return () => clearInterval(interval);
  }, [prefersReduced]);

  const accepted = offers.filter((o) => o.status === 'accepted').length;

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
        <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--lp-eyebrow)', flexShrink: 0 }} />
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--lp-text)' }}>Offer Tracker</span>
        <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#34D399', fontWeight: 600, background: 'rgba(52,211,153,0.12)', borderRadius: 6, padding: '2px 7px' }}>
          {accepted} accepted
        </span>
      </div>

      <div style={{ padding: '10px 14px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {offers.map((offer, i) => {
          const cfg = STATUS_CONFIG[offer.status];
          const StatusIcon = cfg.Icon;
          const isAnimating = animId === offer.id;

          return (
            <div
              key={offer.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                borderRadius: 10,
                background: isAnimating ? cfg.bg : 'var(--lp-card-glass)',
                border: `1px solid ${isAnimating ? cfg.color : 'var(--lp-border-card)'}`,
                padding: '8px 10px',
                transition: 'background 0.4s ease, border-color 0.4s ease',
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
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
              aria-hidden="true"
              >
                {offer.initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--lp-text)', marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {offer.name}
                </p>
                <p style={{ fontSize: '0.72rem', color: 'var(--lp-text-muted)' }}>{offer.role}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--lp-text)' }}>{offer.salary}</span>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    color: cfg.color,
                    background: cfg.bg,
                    borderRadius: 5,
                    padding: '2px 5px',
                    transition: 'color 0.4s ease, background 0.4s ease',
                  }}
                >
                  <StatusIcon className="w-2.5 h-2.5" />
                  {cfg.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
