/* global React, Icon */
const { useState, useEffect, useRef, createContext, useContext, useCallback } = React;

/* ──────────────────────────────────────────────────────────────────
   App context — theme, brand, toast helpers
   ────────────────────────────────────────────────────────────── */
const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

function AppProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('ds-theme') || 'dark');
  const [brand, setBrand] = useState(() => localStorage.getItem('ds-brand') || 'wiseresume');
  const [toasts, setToasts] = useState([]);
  const [sheet, setSheet] = useState(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ds-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('brand-wisehire', brand === 'wisehire');
    localStorage.setItem('ds-brand', brand);
  }, [brand]);

  const pushToast = useCallback((t) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((arr) => [...arr, { id, kind: 'success', ...t }]);
    setTimeout(() => {
      setToasts((arr) => arr.map((x) => x.id === id ? { ...x, out: true } : x));
    }, 2200);
    setTimeout(() => {
      setToasts((arr) => arr.filter((x) => x.id !== id));
    }, 2500);
  }, []);

  const copy = useCallback((value, label) => {
    navigator.clipboard?.writeText(value);
    pushToast({ title: 'Copied to clipboard', sub: label || value, kind: 'success' });
  }, [pushToast]);

  return (
    <AppCtx.Provider value={{ theme, setTheme, brand, setBrand, pushToast, copy, sheet, setSheet }}>
      {children}
      <ToastStack toasts={toasts} />
      {sheet ? <Sheet sheet={sheet} onClose={() => setSheet(null)} /> : null}
    </AppCtx.Provider>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Toasts
   ────────────────────────────────────────────────────────────── */
function ToastStack({ toasts }) {
  return (
    <div className="ds-toast-stack" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`ds-toast ${t.kind} ${t.out ? 'out' : ''}`}>
          <div className="icon-circ"><Icon name={t.kind === 'success' ? 'check' : 'info'} size={14} strokeWidth={2.4} /></div>
          <div className="body">
            <div className="title">{t.title}</div>
            {t.sub && <div className="sub">{t.sub}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   AI Sheet (used by Components > AI sheet, Editor demo, etc)
   ────────────────────────────────────────────────────────────── */
function Sheet({ sheet, onClose }) {
  const [stage, setStage] = useState('input'); // input → thinking → result
  useEffect(() => {
    setStage('input');
    const t = setTimeout(() => setStage('thinking'), 400);
    const t2 = setTimeout(() => setStage('result'), 1700);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [sheet.from]);

  return (
    <>
      <div className="ds-scrim" onClick={onClose} />
      <div className="ds-sheet" role="dialog" aria-modal="true">
        <div className="ds-sheet-head">
          <div className="avatar"><Icon name="sparkles" size={15} strokeWidth={2.2} /></div>
          <div>
            <h4>{sheet.title || 'AI Boost'}</h4>
            <small>{sheet.subtitle || 'Rewrites vague bullets into measurable results'}</small>
          </div>
          <button className="ds-icon-btn" style={{ marginLeft: 'auto' }} onClick={onClose}>
            <Icon name="x" size={16} />
          </button>
        </div>
        <div className="ds-sheet-body">
          <div className="ds-ai-from">{sheet.from}</div>
          {stage === 'thinking' && (
            <div className="thinking-dots"><span /><span /><span /></div>
          )}
          {stage === 'result' && (
            <div className="ds-ai-to">{sheet.to}</div>
          )}
          {stage === 'result' && (
            <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
              <button className="ds-btn primary sm"><Icon name="check" size={13} strokeWidth={2.4} />Apply</button>
              <button className="ds-btn outline sm"><Icon name="refresh" size={13} />Try Again</button>
              <button className="ds-btn ghost sm">Dismiss</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Navigation config
   ────────────────────────────────────────────────────────────── */
const NAV = [
  {
    heading: 'Get Started',
    items: [
      { id: 'overview', label: 'Overview', icon: 'home' },
      { id: 'voice', label: 'Voice & Content', icon: 'send' },
      { id: 'getting-started', label: 'Setup & Tokens', icon: 'command' },
    ],
  },
  {
    heading: 'Foundations',
    items: [
      { id: 'color', label: 'Color', icon: 'palette' },
      { id: 'type', label: 'Typography', icon: 'type' },
      { id: 'spacing', label: 'Spacing & Layout', icon: 'ruler' },
      { id: 'radii', label: 'Radii & Shadows', icon: 'layers' },
      { id: 'motion', label: 'Motion', icon: 'zap' },
      { id: 'iconography', label: 'Iconography', icon: 'star' },
    ],
  },
  {
    heading: 'Components',
    items: [
      { id: 'buttons', label: 'Buttons', icon: 'target' },
      { id: 'inputs', label: 'Inputs & Forms', icon: 'edit' },
      { id: 'badges', label: 'Badges & Pills', icon: 'shield' },
      { id: 'cards', label: 'Cards', icon: 'file' },
      { id: 'score-ring', label: 'Score Ring', icon: 'target' },
      { id: 'ai-sheet', label: 'AI Sheet', icon: 'sparkles' },
      { id: 'toasts', label: 'Toasts', icon: 'bell' },
    ],
  },
  {
    heading: 'Brand',
    items: [
      { id: 'brand-logos', label: 'Logos & Marks', icon: 'star' },
      { id: 'brand-twins', label: 'WiseResume × WiseHire', icon: 'layers' },
    ],
  },
  {
    heading: 'Patterns',
    items: [
      { id: 'pattern-hero', label: 'Landing Hero', icon: 'globe' },
      { id: 'pattern-dashboard', label: 'Dashboard', icon: 'home' },
      { id: 'pattern-editor', label: 'Resume Editor', icon: 'edit' },
    ],
  },
];

const FLAT_NAV = NAV.flatMap((g) => g.items);
const navById = (id) => FLAT_NAV.find((x) => x.id === id) || FLAT_NAV[0];
const groupOf = (id) => NAV.find((g) => g.items.some((it) => it.id === id))?.heading || '';

/* ──────────────────────────────────────────────────────────────────
   Sidebar
   ────────────────────────────────────────────────────────────── */
function Sidebar({ current, onPick, query, setQuery }) {
  const { theme, setTheme, brand, setBrand } = useApp();
  const q = query.trim().toLowerCase();
  const filtered = q
    ? NAV.map((g) => ({ ...g, items: g.items.filter((it) => it.label.toLowerCase().includes(q) || it.id.includes(q)) }))
        .filter((g) => g.items.length > 0)
    : NAV;

  return (
    <aside className="ds-sidebar">
      <div className="ds-brand" onClick={() => onPick('overview')}>
        <div className="ds-brand-mark">{brand === 'wisehire' ? 'WH' : 'W'}</div>
        <div className="ds-brand-text">
          <b>{brand === 'wisehire' ? 'WiseHire' : 'WiseResume'}</b>
          <small>Design System</small>
        </div>
      </div>

      <div className="ds-search">
        <Icon name="search" size={14} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search components, tokens…"
        />
        <kbd>⌘K</kbd>
      </div>

      <nav className="ds-nav">
        {filtered.map((group) => (
          <div className="ds-nav-group" key={group.heading}>
            <div className="ds-nav-heading">
              <span>{group.heading}</span>
              <span className="count">{group.items.length}</span>
            </div>
            {group.items.map((it) => (
              <button
                key={it.id}
                className={`ds-nav-item ${current === it.id ? 'is-active' : ''}`}
                onClick={() => onPick(it.id)}
              >
                <Icon name={it.icon} size={15} className="ds-nav-icon" />
                {it.label}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="ds-side-foot">
        <div className="ds-toggle brand-toggle" title="Brand">
          <button
            className={brand === 'wiseresume' ? 'is-on' : ''}
            onClick={() => setBrand('wiseresume')}
          >
            <span style={{ width: 8, height: 8, borderRadius: 999, background: '#9E1B22' }} />
            WiseResume
          </button>
          <button
            className={brand === 'wisehire' ? 'is-on' : ''}
            onClick={() => setBrand('wisehire')}
          >
            <span style={{ width: 8, height: 8, borderRadius: 999, background: '#3B82F6' }} />
            WiseHire
          </button>
        </div>
        <div className="ds-toggle" title="Theme">
          <button
            className={theme === 'light' ? 'is-on' : ''}
            onClick={() => setTheme('light')}
          >
            <Icon name="sun" size={12} /> Light
          </button>
          <button
            className={theme === 'dark' ? 'is-on' : ''}
            onClick={() => setTheme('dark')}
          >
            <Icon name="moon" size={12} /> Dark
          </button>
        </div>
      </div>
    </aside>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Page header (sticky breadcrumb + actions)
   ────────────────────────────────────────────────────────────── */
function PageHead({ current, onPick }) {
  const { setTheme, theme } = useApp();
  const idx = FLAT_NAV.findIndex((x) => x.id === current);
  const prev = idx > 0 ? FLAT_NAV[idx - 1] : null;
  const next = idx < FLAT_NAV.length - 1 ? FLAT_NAV[idx + 1] : null;
  const item = navById(current);

  return (
    <header className="ds-main-head">
      <div className="ds-pill">
        <Icon name="sparkles" size={11} strokeWidth={2.4} />
        DESIGN SYSTEM · v1.0
      </div>
      <div className="ds-breadcrumb">
        <span>{groupOf(current)}</span>
        <Icon name="chevronR" size={12} />
        <b>{item.label}</b>
      </div>
      <div className="ds-main-head-right">
        <button
          className="ds-icon-btn"
          disabled={!prev}
          onClick={() => prev && onPick(prev.id)}
          title={prev ? `Previous: ${prev.label}` : ''}
          style={{ opacity: prev ? 1 : 0.4 }}
        >
          <Icon name="chevronL" size={14} />
        </button>
        <button
          className="ds-icon-btn"
          disabled={!next}
          onClick={() => next && onPick(next.id)}
          title={next ? `Next: ${next.label}` : ''}
          style={{ opacity: next ? 1 : 0.4 }}
        >
          <Icon name="chevronR" size={14} />
        </button>
        <button
          className="ds-icon-btn"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title="Toggle theme"
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={14} />
        </button>
      </div>
    </header>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Reusable: copyable code block with syntax-ish coloring
   ────────────────────────────────────────────────────────────── */
function Code({ code, label, language = 'css' }) {
  const { copy } = useApp();
  // very light coloring for css/html-like content
  const colored = code
    .replace(/\/\*[\s\S]*?\*\//g, (m) => `__COM__${m}__/COM__`)
    .replace(/(--[a-z0-9-]+)/g, '__KEY__$1__/KEY__')
    .replace(/(#[0-9a-f]{3,8})/gi, '__STR__$1__/STR__')
    .replace(/(\b\d+(?:\.\d+)?(?:px|rem|em|%|ms|s)?\b)/g, '__NUM__$1__/NUM__')
    .replace(/__COM__([\s\S]*?)__\/COM__/g, '<span class="tk-com">$1</span>')
    .replace(/__KEY__([\s\S]*?)__\/KEY__/g, '<span class="tk-key">$1</span>')
    .replace(/__STR__([\s\S]*?)__\/STR__/g, '<span class="tk-str">$1</span>')
    .replace(/__NUM__([\s\S]*?)__\/NUM__/g, '<span class="tk-num">$1</span>');
  return (
    <pre className="ds-code">
      <button className="ds-copy" onClick={() => copy(code, label || 'Snippet')}>
        <Icon name="copy" size={11} /> Copy
      </button>
      <code dangerouslySetInnerHTML={{ __html: colored }} />
    </pre>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Reusable: copyable token row / swatch
   ────────────────────────────────────────────────────────────── */
function Swatch({ name, value, style }) {
  const { copy } = useApp();
  return (
    <div className="swatch" onClick={() => copy(value, name)}>
      <div className="chip" style={style}>
        <span className="copy-hint">
          <Icon name="copy" size={9} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 2 }} /> Copy
        </span>
      </div>
      <div className="meta">
        <div className="name">{name}</div>
        <div className="hex">{value}</div>
      </div>
    </div>
  );
}

function TokenRow({ name, value, previewStyle }) {
  const { copy } = useApp();
  return (
    <div className="token-row" onClick={() => copy(`var(${name})`, name)}>
      <div className="name">
        {previewStyle ? <span className="preview" style={previewStyle} /> : null}
        {name}
      </div>
      <div className="value">{value}</div>
      <div style={{ color: 'hsl(var(--muted-fg-h))', display: 'flex', alignItems: 'center' }}>
        <Icon name="copy" size={13} />
      </div>
    </div>
  );
}

Object.assign(window, {
  AppProvider, useApp, Sidebar, PageHead,
  Code, Swatch, TokenRow,
  NAV, FLAT_NAV, navById, groupOf,
});
