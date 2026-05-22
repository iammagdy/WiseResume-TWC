/* global React */

/* ── Lucide icon — fetched from CDN sprite via inline SVG paths ────── */
/* Tiny inline-Lucide so we don't depend on initialization timing.   */
const I = {
  home: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
  file: 'M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',
  sparkles: 'M9.94 13.06 12 7l2.06 6.06L20 15.12l-5.94 2.06L12 23l-2.06-5.82L4 15.12z M22 4 21 6 19 7 21 8 22 10 23 8 25 7 23 6Z M5 2 4 4 2 5 4 6 5 8 6 6 8 5 6 4Z',
  bar3: 'M3 3v18h18 M7 16V8 M12 16V4 M17 16v-6',
  globe: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M3 12h18 M12 3a14.6 14.6 0 0 1 0 18 M12 3a14.6 14.6 0 0 0 0 18',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM21 21l-4.3-4.3',
  arrowR: 'M5 12h14 M12 5l7 7-7 7',
  arrowL: 'M19 12H5 M12 19l-7-7 7-7',
  plus: 'M5 12h14 M12 5v14',
  wand: 'M15 4V2 M15 16v-2 M8 9h2 M20 9h2 M17.8 11.8 19 13 M15 9l-3.3-3.3-9.4 9.4L5.6 18.4z M17 6l1.4 1.4 M4 22l1.5-1.5',
  target: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0 M18 12a6 6 0 1 1-12 0 6 6 0 0 1 12 0 M14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0',
  zap: 'M13 2 3 14h9l-1 8 10-12h-9z',
  share: 'M7.7 13.3 16.3 18 M7.7 10.7 16.3 6 M5 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0 M23 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0 M23 19a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3',
  trend: 'M22 7l-9.5 9.5L8 12l-6 6 M16 7h6v6',
  check: 'M5 12l5 5 9-12',
  checkc: 'M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4 12 14.01l-3-3',
  alert: 'M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0 M12 9v4 M12 17h.01',
  star: 'M11.5 1.5l3 6.5 7 1-5 4.5 1.5 7-6.5-3.5L5 21l1.5-7L1.5 9.5 8.5 8z',
  edit: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z',
  trash: 'M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
  more: 'M12 12.01v.01 M12 5.01v.01 M12 19.01v.01',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z',
  bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9 M13.7 21a2 2 0 0 1-3.4 0',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z M12 1v2 M12 21v2 M4.2 4.2l1.4 1.4 M18.4 18.4l1.4 1.4 M1 12h2 M21 12h2 M4.2 19.8l1.4-1.4 M18.4 5.6l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  chevronD: 'M6 9l6 6 6-6',
  chevronR: 'M9 18l6-6-6-6',
  x: 'M18 6 6 18 M6 6l12 12',
  copy: 'M20 9h-9a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2 M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1',
  refresh: 'M3 12a9 9 0 0 1 15-6.7L21 8 M21 3v5h-5 M21 12a9 9 0 0 1-15 6.7L3 16 M3 21v-5h5',
  lock: 'M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2 M7 11V7a5 5 0 0 1 10 0v4',
  brief: 'M20 7h-3V5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2 M9 5h6v2H9z',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M23 21v-2a4 4 0 0 0-3-3.87 M17 3.13a4 4 0 0 1 0 7.75',
  message: 'M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z',
  building: 'M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18z M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2 M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2 M10 6h4 M10 10h4 M10 14h4 M10 18h4',
  fileSearch: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M18 21l-2-2 M9 15a3.5 3.5 0 1 0 7 0 3.5 3.5 0 0 0-7 0',
  brain: 'M9.5 2a4.5 4.5 0 0 1 4.5 4.5V18 M9.5 2A4.5 4.5 0 0 0 5 6.5V8a3 3 0 0 0 0 6v1.5A4.5 4.5 0 0 0 9.5 20 M14 2a4.5 4.5 0 0 1 4.5 4.5V8a3 3 0 0 1 0 6v1.5A4.5 4.5 0 0 1 14 20 M9.5 20a2 2 0 1 1 0-4',
  shield: 'M12 2 4 5v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V5z M9 12l2 2 4-4',
  clipboard: 'M16 2H8a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2 M9 2h6v3H9z M9 12h6 M9 16h4',
  credit: 'M2 5h20v14H2z M2 10h20',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
  menu: 'M3 12h18 M3 6h18 M3 18h18',
};

function Icon({ name, size = 16, color, strokeWidth = 1.6, className = '', style = {} }) {
  const d = I[name];
  if (!d) return null;
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke={color || 'currentColor'} strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round"
      className={className} style={style}
      aria-hidden="true"
    >
      {d.split(' M').map((seg, i) => (
        <path key={i} d={(i === 0 ? '' : 'M') + seg} />
      ))}
    </svg>
  );
}

/* ── Atomic primitives ─────────────────────────────────────────────── */
function Button({ variant = 'primary', size = 'md', icon, iconRight, children, onClick, className = '', style = {} }) {
  const base = {
    fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: 8, border: 0, cursor: 'pointer', fontWeight: 600,
    borderRadius: 12, transition: 'all .18s cubic-bezier(0.16,1,0.3,1)',
    fontSize: size === 'lg' ? 15 : size === 'sm' ? 12.5 : 14,
    height: size === 'lg' ? 48 : size === 'sm' ? 34 : 42,
    padding: size === 'lg' ? '0 22px' : size === 'sm' ? '0 12px' : '0 16px',
    whiteSpace: 'nowrap',
  };
  const variants = {
    primary: { background: 'var(--wr-primary, #9E1B22)', color: '#fff', boxShadow: '0 4px 14px -2px rgb(158 27 34 / 0.3)' },
    outline: { background: 'var(--wr-card, #fff)', color: 'var(--wr-fg, #18181b)', border: '1px solid var(--wr-border, #e5e7eb)' },
    ghost: { background: 'transparent', color: 'var(--wr-muted-fg, #52525b)' },
    secondary: { background: 'var(--wr-muted, #e2e8f0)', color: 'var(--wr-fg, #0f172a)' },
    icon: { background: 'transparent', color: 'var(--wr-muted-fg, #52525b)', width: 38, height: 38, padding: 0, borderRadius: 10 },
  };
  return (
    <button onClick={onClick} className={className} style={{ ...base, ...variants[variant], ...style }}>
      {icon && <Icon name={icon} size={size === 'sm' ? 14 : 16} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === 'sm' ? 14 : 16} />}
    </button>
  );
}

function Card({ children, className = '', style = {}, hover = false }) {
  return (
    <div className={`wr-card ${hover ? 'wr-card-hover' : ''} ${className}`} style={style}>
      {children}
    </div>
  );
}

function Pill({ children, variant = 'primary', icon }) {
  const colors = {
    primary: { bg: 'rgb(158 27 34 / 0.08)', fg: '#9E1B22', border: 'rgb(158 27 34 / 0.22)' },
    success: { bg: 'rgb(34 197 94 / 0.1)', fg: '#16a34a', border: 'rgb(34 197 94 / 0.22)' },
    warn:    { bg: 'rgb(245 158 11 / 0.12)', fg: '#b45309', border: 'rgb(245 158 11 / 0.25)' },
    info:    { bg: 'rgb(59 130 246 / 0.1)', fg: '#2563eb', border: 'rgb(59 130 246 / 0.22)' },
    neutral: { bg: 'var(--wr-muted, #f3f4f6)', fg: 'var(--wr-fg, #374151)', border: 'var(--wr-border, #e5e7eb)' },
  };
  const c = colors[variant];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 600,
      background: c.bg, color: c.fg, border: `1px solid ${c.border}`, whiteSpace: 'nowrap',
    }}>
      {icon && <Icon name={icon} size={11} />}
      {children}
    </span>
  );
}

function ScoreRing({ score, label = 'ATS', size = 80 }) {
  const r = size * 0.42;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - score / 100);
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#9E1B22' : '#f59e0b';
  const bgTrack = score >= 80 ? '#f0fdf4' : score >= 60 ? '#fef2f2' : '#fffbeb';
  return (
    <div style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} stroke={bgTrack} strokeWidth={size * 0.09} fill="none" />
        <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={size * 0.09} fill="none"
                strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: size * 0.28, fontWeight: 800, letterSpacing: '-0.03em', color, lineHeight: 1 }}>{score}</div>
        <div style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--wr-muted-fg)', fontWeight: 700, marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

Object.assign(window, { Icon, Button, Card, Pill, ScoreRing });
