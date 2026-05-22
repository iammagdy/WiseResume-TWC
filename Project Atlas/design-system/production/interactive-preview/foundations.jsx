/* global React, Icon, Swatch, TokenRow, Code, useApp */

/* ════════════════════════════════════════════════════════════════════
   OVERVIEW
   ════════════════════════════════════════════════════════════════════ */
function PageOverview({ onPick }) {
  const { brand, theme } = useApp();
  return (
    <div className="ds-page">
      <div className="ds-hero">
        <div className="ds-eyebrow">{brand === 'wisehire' ? 'AI HIRING CONSOLE' : 'AI-POWERED CAREER PLATFORM'}</div>
        <h1 className="ds-hero-h1">
          The <span className="accent">{brand === 'wisehire' ? 'WiseHire' : 'WiseResume'}</span> design system.
        </h1>
        <p className="ds-hero-sub">
          Tokens, primitives, patterns. Two brands — Crimson Red for the job-seeker, Royal Blue for the recruiter — sharing one ruthlessly consistent surface language. Click anything to copy its value.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="ds-btn primary" onClick={() => onPick('color')}>
            <Icon name="palette" size={15} /> Explore tokens
          </button>
          <button className="ds-btn outline" onClick={() => onPick('buttons')}>
            Component library <Icon name="arrowR" size={14} />
          </button>
          <button className="ds-btn ghost" onClick={() => onPick('voice')}>
            <Icon name="send" size={14} /> Voice & content
          </button>
        </div>

        <div style={{ display: 'flex', gap: 16, marginTop: 32, color: 'hsl(var(--muted-fg-h))', fontSize: 12.5, fontWeight: 500, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Icon name="checkc" size={14} style={{ color: 'hsl(var(--success-h))' }} /> Free to start
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Icon name="checkc" size={14} style={{ color: 'hsl(var(--success-h))' }} /> 125 tokens
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Icon name="checkc" size={14} style={{ color: 'hsl(var(--success-h))' }} /> 18 component patterns
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Icon name="checkc" size={14} style={{ color: 'hsl(var(--success-h))' }} /> {theme === 'dark' ? 'Dark' : 'Light'} mode active
          </span>
        </div>
      </div>

      <div className="ds-h2-row">
        <div>
          <h2>System at a glance</h2>
          <p>Click a card to jump in.</p>
        </div>
      </div>
      <div className="ds-grid cols-3">
        {[
          { id: 'color', icon: 'palette', t: 'Color', d: 'Crimson, royal blue, neutrals, semantics. Click to copy.' },
          { id: 'type', icon: 'type', t: 'Typography', d: 'Inter only. 400 → 800. Tight on display, comfortable on body.' },
          { id: 'spacing', icon: 'ruler', t: 'Spacing', d: '4px grid. Tailwind-aligned. 44px tap target floor.' },
          { id: 'radii', icon: 'layers', t: 'Radii & shadows', d: 'Rounds heavily — 8 → 24. Five soft shadow tiers.' },
          { id: 'iconography', icon: 'star', t: 'Iconography', d: 'Lucide only. 1.5px stroke. Sized by Tailwind class.' },
          { id: 'motion', icon: 'zap', t: 'Motion', d: 'Custom cubic-bezier(0.16,1,0.3,1). 150 → 350ms.' },
          { id: 'buttons', icon: 'target', t: 'Buttons', d: 'Primary, outline, ghost, secondary. 34/42/48 sizes.' },
          { id: 'ai-sheet', icon: 'sparkles', t: 'AI Sheet', d: 'Floating from/to assistant card with thinking dots.' },
          { id: 'pattern-editor', icon: 'edit', t: 'Resume Editor', d: 'The signature surface — 3-column with live preview.' },
        ].map((c) => (
          <div className="ds-card hover" key={c.id} onClick={() => onPick(c.id)}>
            <div style={{ width: 36, height: 36, borderRadius: 11, display: 'grid', placeItems: 'center',
                          background: 'hsl(var(--primary-h) / 0.1)', color: 'hsl(var(--primary-h))', marginBottom: 12 }}>
              <Icon name={c.icon} size={17} />
            </div>
            <h3 style={{ margin: '0 0 4px', fontSize: 15.5, fontWeight: 700 }}>{c.t}</h3>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'hsl(var(--muted-fg-h))' }}>{c.d}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 12, fontSize: 12, fontWeight: 700,
                          color: 'hsl(var(--primary-h))' }}>
              Open <Icon name="arrowR" size={12} />
            </div>
          </div>
        ))}
      </div>

      <div className="ds-h2-row">
        <div>
          <h2>Two brands, one system</h2>
          <p>Toggle the brand in the sidebar — every primary tint, hover, ring and glow swaps in lockstep.</p>
        </div>
      </div>
      <div className="ds-grid cols-2">
        <BrandCard kind="wiseresume" />
        <BrandCard kind="wisehire" />
      </div>
    </div>
  );
}

function BrandCard({ kind }) {
  const { setBrand, brand: current } = useApp();
  const is = current === kind;
  const meta = kind === 'wiseresume'
    ? { name: 'WiseResume', tagline: 'Stand out as a Software Engineer.', primary: '#9E1B22', bg: '#9E1B22', sub: 'Crimson Red · #9E1B22' }
    : { name: 'WiseHire',   tagline: 'Hire smarter. Screen faster.',      primary: '#1D4ED8', bg: '#1D4ED8', sub: 'Royal Blue · #1D4ED8' };
  return (
    <div className="ds-card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{
        height: 132,
        background: `radial-gradient(ellipse 70% 60% at 50% 30%, ${meta.primary}cc, ${meta.primary}33 60%, transparent), linear-gradient(135deg, ${meta.primary}, ${meta.primary}aa)`,
        position: 'relative', padding: 20, color: '#fff',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.18)',
          fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
          border: '1px solid rgba(255,255,255,0.3)'
        }}>
          <Icon name="sparkles" size={11} strokeWidth={2.4} />
          {kind === 'wiseresume' ? 'JOB SEEKER' : 'RECRUITER'}
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, marginTop: 14, letterSpacing: '-0.025em', lineHeight: 1.1 }}>
          {meta.tagline}
        </div>
      </div>
      <div style={{ padding: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{meta.name}</div>
          <div style={{ fontSize: 12, color: 'hsl(var(--muted-fg-h))', marginTop: 2 }}>{meta.sub}</div>
        </div>
        <button className={`ds-btn ${is ? 'primary' : 'outline'} sm`} onClick={() => setBrand(kind)}>
          {is ? <><Icon name="check" size={13} strokeWidth={2.4} /> Active</> : 'Switch'}
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   VOICE & CONTENT
   ════════════════════════════════════════════════════════════════════ */
function PageVoice() {
  return (
    <div className="ds-page">
      <div className="ds-eyebrow">CONTENT FUNDAMENTALS</div>
      <h1 className="ds-h1">Voice is <span className="accent">direct, confident, outcome-oriented.</span></h1>
      <p className="ds-lede">
        The product is an AI assistant. It sounds like a sharp colleague who already knows your goal and tells you the next move — not a chatbot. Address the user with imperatives or "your". Never "we". Never "our system".
      </p>

      <div className="ds-h2-row"><div><h2>Tone in the wild</h2><p>Real strings from the live product.</p></div></div>
      <div className="ds-grid cols-2">
        {[
          ['Hero headline', 'Stand out as a Software Engineer.', 'WiseResume landing'],
          ['Eyebrow', 'AI-POWERED CAREER PLATFORM', 'Landing'],
          ['Subhead', 'Optimize your resume. Get more interviews.', 'Dashboard'],
          ['Trust strip', 'Free to start · No credit card · AI-powered', 'Landing footer'],
          ['Empty state', "No resumes yet — let's create one!", 'Dashboard'],
          ['WiseHire hero', 'Hire Smarter. Screen Faster.', 'WiseHire landing'],
        ].map(([lab, t, src]) => (
          <div className="ds-card" key={lab}>
            <div className="ds-eyebrow" style={{ marginBottom: 8 }}>{lab}</div>
            <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.25 }}>"{t}"</div>
            <div style={{ marginTop: 10, fontSize: 12, color: 'hsl(var(--muted-fg-h))' }}>{src}</div>
          </div>
        ))}
      </div>

      <div className="ds-h2-row"><div><h2>Casing rules</h2></div></div>
      <div className="ds-grid cols-3">
        <RuleCard t="Sentence case" examples={['Optimize your resume.', 'Get more interviews.', 'No credit card required.']} where="Body, paragraphs, tooltips, helper text." />
        <RuleCard t="Title Case" examples={['Get Started Free', 'Build a Resume', 'Optimize for a Job']} where="Buttons & primary CTAs only." />
        <RuleCard t="UPPERCASE eyebrows" examples={['AI-POWERED CAREER PLATFORM', '01 — RESUME BUILDER']} where="Above headlines. Letter-spacing 0.12em." />
      </div>

      <div className="ds-h2-row"><div><h2>Do / Don't</h2></div></div>
      <div className="ds-grid cols-2">
        <DoDont ok>
          <Bullet ok>Use imperatives and "your". <i>"Get more interviews."</i></Bullet>
          <Bullet ok>"AI" is a verb. <i>"AI rewrites vague bullets into quantified achievements."</i></Bullet>
          <Bullet ok>Em-dash for rhythm. <i>"AI that builds, tailors, and lands — your next job."</i></Bullet>
          <Bullet ok>End empty-states with a CTA verb. <i>"No resumes yet — let's create one!"</i></Bullet>
        </DoDont>
        <DoDont>
          <Bullet>Never "we" or "our system". <i>"Our system will check your resume."</i></Bullet>
          <Bullet>Don't sell the AI as a feature. <i>"Powered by GPT-4."</i></Bullet>
          <Bullet>No decorative emoji in product UI. 🎉</Bullet>
          <Bullet>Don't bury the verb. <i>"You can now click here to begin."</i></Bullet>
        </DoDont>
      </div>
    </div>
  );
}

function RuleCard({ t, examples, where }) {
  return (
    <div className="ds-card">
      <div style={{ fontSize: 13.5, fontWeight: 700 }}>{t}</div>
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {examples.map((e) => (
          <div key={e} style={{ fontFamily: 'var(--font-mono)', fontSize: 12, padding: '6px 10px',
                                 background: 'hsl(var(--muted-h))', borderRadius: 8, color: 'hsl(var(--fg-h))' }}>{e}</div>
        ))}
      </div>
      <div style={{ marginTop: 12, fontSize: 12, color: 'hsl(var(--muted-fg-h))' }}>{where}</div>
    </div>
  );
}
function DoDont({ ok, children }) {
  return (
    <div className="ds-card" style={{ borderColor: ok ? 'hsl(var(--success-h) / 0.4)' : 'hsl(var(--error-h) / 0.4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ width: 24, height: 24, borderRadius: 7, display: 'grid', placeItems: 'center',
                      background: ok ? 'hsl(var(--success-h) / 0.15)' : 'hsl(var(--error-h) / 0.15)',
                      color: ok ? 'hsl(var(--success-h))' : 'hsl(var(--error-h))' }}>
          <Icon name={ok ? 'check' : 'x'} size={14} strokeWidth={2.6} />
        </div>
        <div style={{ fontWeight: 700, fontSize: 13.5 }}>{ok ? 'Do' : "Don't"}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>{children}</div>
    </div>
  );
}
function Bullet({ ok, children }) {
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: 13, lineHeight: 1.5 }}>
      <Icon name={ok ? 'check' : 'x'} size={14} strokeWidth={2.6}
            style={{ color: ok ? 'hsl(var(--success-h))' : 'hsl(var(--error-h))', flexShrink: 0, marginTop: 2 }} />
      <div>{children}</div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   GETTING STARTED — install / tokens
   ════════════════════════════════════════════════════════════════════ */
function PageGettingStarted() {
  return (
    <div className="ds-page">
      <div className="ds-eyebrow">SETUP</div>
      <h1 className="ds-h1">Drop the tokens in. <span className="accent">Ship the surface.</span></h1>
      <p className="ds-lede">
        One CSS file gives you every color, type, radius, shadow and motion variable, plus brand- and theme-switch classes. Tokens are unwrapped HSL so they slot into <code>hsl(var(--token))</code> shadcn-style.
      </p>

      <h2 className="ds-h2">1. Load Inter & the token file</h2>
      <p className="ds-sub">Hosted via Google Fonts in dev; production self-hosts via <code>@fontsource/inter</code>.</p>
      <Code label="HTML head" code={`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" />
<link rel="stylesheet" href="assets/tokens.css" />`} />

      <h2 className="ds-h2">2. Pick your brand & theme</h2>
      <p className="ds-sub">Both swap by toggling a class on <code>&lt;html&gt;</code>. Default is WiseResume crimson, light theme.</p>
      <Code label="Brand/theme switch" code={`/* Brand: WiseResume (default) → WiseHire */
document.documentElement.classList.toggle('brand-wisehire', isHire);

/* Theme: light (default) → dark */
document.documentElement.classList.toggle('dark', isDark);`} />

      <h2 className="ds-h2">3. Use tokens, not hex</h2>
      <p className="ds-sub">Always reference variables — they swap automatically across brand and theme.</p>
      <Code label="Card example" code={`.card {
  background: hsl(var(--card-h));
  border: 1px solid hsl(var(--app-border-h));
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-soft);
  padding: var(--space-5);
  color: hsl(var(--fg-h));
}
.card:hover {
  border-color: hsl(var(--primary-h) / 0.22);
  transform: translateY(-3px);
  transition: all var(--dur-base) var(--ease-out);
}`} />

      <h2 className="ds-h2">4. Icons — Lucide only</h2>
      <Code label="Lucide CDN" code={`<script src="https://unpkg.com/lucide@latest"></script>
<i data-lucide="sparkles" class="w-4 h-4"></i>
<script>lucide.createIcons();</script>`} />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   COLOR
   ════════════════════════════════════════════════════════════════════ */
function PageColor() {
  const { brand } = useApp();
  return (
    <div className="ds-page">
      <div className="ds-eyebrow">FOUNDATIONS · COLOR</div>
      <h1 className="ds-h1">Two brands. <span className="accent">Same neutrals.</span></h1>
      <p className="ds-lede">
        WiseResume is Crimson Red <code>#9E1B22</code>. WiseHire is Royal Blue <code>#1D4ED8</code>. They never mix in product surfaces — the active route owns the screen. Neutrals are gray-leaning (not warm cream).
      </p>

      <h2 className="ds-h2">Brand · {brand === 'wisehire' ? 'WiseHire Royal Blue' : 'WiseResume Crimson'}</h2>
      <p className="ds-sub">The primary family. Hover deepens by ~10%, press by ~20%.</p>
      <div className="ds-grid cols-4">
        {brand === 'wisehire' ? (
          <>
            <Swatch name="--blue-50"   value="#f0f5ff" style={{ background: '#f0f5ff' }} />
            <Swatch name="--blue-100"  value="#dbeafe" style={{ background: '#dbeafe' }} />
            <Swatch name="--blue-400"  value="#60a5fa" style={{ background: '#60a5fa' }} />
            <Swatch name="--blue-500"  value="#3B82F6" style={{ background: '#3B82F6' }} />
            <Swatch name="--blue-600"  value="#2563eb" style={{ background: '#2563eb' }} />
            <Swatch name="--blue-700 (brand)" value="#1D4ED8" style={{ background: '#1D4ED8' }} />
            <Swatch name="--blue-900"  value="#1e3a8a" style={{ background: '#1e3a8a' }} />
            <Swatch name="hover (press)" value="hsl(224 76% 30%)" style={{ background: 'hsl(224 76% 30%)' }} />
          </>
        ) : (
          <>
            <Swatch name="--crimson-50"   value="#fff5f5" style={{ background: '#fff5f5' }} />
            <Swatch name="--crimson-100"  value="#ffe5e5" style={{ background: '#ffe5e5' }} />
            <Swatch name="--crimson-300"  value="#f87878" style={{ background: '#f87878' }} />
            <Swatch name="--crimson-500"  value="#e53e3e" style={{ background: '#e53e3e' }} />
            <Swatch name="--crimson-600"  value="#c41e3a" style={{ background: '#c41e3a' }} />
            <Swatch name="--crimson-700 (brand)" value="#9E1B22" style={{ background: '#9E1B22' }} />
            <Swatch name="--crimson-800"  value="#7a1218" style={{ background: '#7a1218' }} />
            <Swatch name="hover (press)"  value="hsl(357 71% 30%)" style={{ background: 'hsl(357 71% 30%)' }} />
          </>
        )}
      </div>

      <h2 className="ds-h2">Neutrals · App-shell</h2>
      <p className="ds-sub">Slightly grayer than landing — used inside the app once you're authed.</p>
      <div className="ds-grid cols-4">
        <Swatch name="--bg-h" value="#FFFFFF / #111114" style={{ background: 'hsl(var(--bg-h))' }} />
        <Swatch name="--card-h" value="card surface" style={{ background: 'hsl(var(--card-h))' }} />
        <Swatch name="--muted-h" value="muted fills" style={{ background: 'hsl(var(--muted-h))' }} />
        <Swatch name="--muted-fg-h" value="secondary text" style={{ background: 'hsl(var(--muted-fg-h))' }} />
        <Swatch name="--app-bg-h" value="#F7F7F8 / #0C0C0E" style={{ background: 'hsl(var(--app-bg-h))' }} />
        <Swatch name="--app-surface-h" value="#EFEFEF / #161618" style={{ background: 'hsl(var(--app-surface-h))' }} />
        <Swatch name="--border-h" value="dividers" style={{ background: 'hsl(var(--border-h))' }} />
        <Swatch name="--fg-h" value="primary text" style={{ background: 'hsl(var(--fg-h))' }} />
      </div>

      <h2 className="ds-h2">Semantics</h2>
      <p className="ds-sub">Flat. Standard. Recognizable.</p>
      <div className="ds-grid cols-4">
        <Swatch name="--success-h" value="#22c55e" style={{ background: 'hsl(var(--success-h))' }} />
        <Swatch name="--warning-h" value="#f59e0b" style={{ background: 'hsl(var(--warning-h))' }} />
        <Swatch name="--error-h"   value="#ef4444" style={{ background: 'hsl(var(--error-h))' }} />
        <Swatch name="--info-h"    value="#3b82f6" style={{ background: 'hsl(var(--info-h))' }} />
      </div>

      <h2 className="ds-h2">Token reference</h2>
      <p className="ds-sub">All color tokens, click to copy.</p>
      <div>
        {[
          ['--primary-h', 'hsl(357 71% 36%)'],
          ['--primary-hover-h', 'hsl(357 71% 30%)'],
          ['--primary-glow-h', 'hsl(357 71% 56%)'],
          ['--card-h', 'hsl(var(--card-h))'],
          ['--border-h', 'hsl(var(--border-h))'],
          ['--ring-h', 'hsl(357 71% 36%)'],
          ['--success-h', 'hsl(142 71% 45%)'],
          ['--error-h', 'hsl(0 72% 51%)'],
          ['--info-h', 'hsl(210 80% 50%)'],
        ].map(([n, v]) => (
          <TokenRow key={n} name={n} value={v} previewStyle={{ background: `hsl(var(${n}))` }} />
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   TYPOGRAPHY
   ════════════════════════════════════════════════════════════════════ */
function PageType() {
  return (
    <div className="ds-page">
      <div className="ds-eyebrow">FOUNDATIONS · TYPOGRAPHY</div>
      <h1 className="ds-h1">Inter, <span className="accent">always.</span></h1>
      <p className="ds-lede">
        One typeface across display, body, mono and UI. Five weights — 400 / 500 / 600 / 700 / 800. Scale is heavy at the top, conventional below. Hero headlines lean on tight tracking (-0.035em) and extrabold weight.
      </p>

      <h2 className="ds-h2">Display scale</h2>
      <p className="ds-sub">Heavy. Tight. Compressed leading. Used on hero and section heads only.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 28 }}>
        <TypeSample name="--display-1" weight={800} sizeLabel="clamp(2.5rem, 9vw, 5.5rem)" tracking="-0.035em" leading="1.04">
          <span style={{ font: 'var(--display-1)', letterSpacing: '-0.035em' }}>Stand out as a Software Engineer.</span>
        </TypeSample>
        <TypeSample name="--display-2" weight={800} sizeLabel="clamp(2rem, 6vw, 4rem)" tracking="-0.035em" leading="1.05">
          <span style={{ font: 'var(--display-2)', letterSpacing: '-0.035em' }}>Optimize your resume.</span>
        </TypeSample>
        <TypeSample name="--h1" weight={700} sizeLabel="clamp(1.75rem, 4vw, 2.25rem)" tracking="-0.02em" leading="1.2">
          <span style={{ font: 'var(--h1)', letterSpacing: '-0.02em' }}>Your dashboard, at a glance.</span>
        </TypeSample>
        <TypeSample name="--h2" weight={600} sizeLabel="1.5rem" tracking="-0.02em" leading="1.3">
          <span style={{ font: 'var(--h2)', letterSpacing: '-0.02em' }}>Resume builder</span>
        </TypeSample>
        <TypeSample name="--h3" weight={600} sizeLabel="1.25rem" tracking="0" leading="1.35">
          <span style={{ font: 'var(--h3)' }}>Recent applications</span>
        </TypeSample>
        <TypeSample name="--h4" weight={600} sizeLabel="1.125rem" tracking="0" leading="1.4">
          <span style={{ font: 'var(--h4)' }}>Tailor for a job</span>
        </TypeSample>
      </div>

      <h2 className="ds-h2">Body & supporting</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <TypeSample name="--body-lg" weight={400} sizeLabel="1.125rem" leading="1.6">
          <span style={{ font: 'var(--body-lg)' }}>AI rewrites vague bullets into measurable, recruiter-ready results — with a live ATS score that updates as you write.</span>
        </TypeSample>
        <TypeSample name="--body" weight={400} sizeLabel="1rem" leading="1.6">
          <span style={{ font: 'var(--body)' }}>Free to start. No credit card. AI-powered. Track every application from one place — never lose context again.</span>
        </TypeSample>
        <TypeSample name="--body-sm" weight={400} sizeLabel="0.875rem" leading="1.5">
          <span style={{ font: 'var(--body-sm)', color: 'hsl(var(--muted-fg-h))' }}>Live ATS score that updates with every edit. Before/after comparison shows exactly what changed.</span>
        </TypeSample>
        <TypeSample name="--caption" weight={500} sizeLabel="0.75rem" leading="1.4">
          <span style={{ font: 'var(--caption)', color: 'hsl(var(--muted-fg-h))' }}>Last edited 4m ago · 87% ATS score</span>
        </TypeSample>
        <TypeSample name="--eyebrow" weight={600} sizeLabel="0.8rem · UPPER 0.12em" leading="1.4">
          <span style={{ font: 'var(--eyebrow)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'hsl(var(--primary-h))' }}>01 — Resume Builder</span>
        </TypeSample>
        <TypeSample name="--kbd" weight={500} sizeLabel="0.6875rem · mono" leading="1">
          <span style={{ font: 'var(--kbd)', fontFamily: 'var(--font-mono)', background: 'hsl(var(--muted-h))', padding: '2px 6px', borderRadius: 5 }}>⌘ K</span>
        </TypeSample>
      </div>

      <h2 className="ds-h2">Gradient text (signature)</h2>
      <div className="ds-card">
        <div style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.05 }}>
          <span className="gradient-text-crimson">Crimson shimmer</span> · <span className="gradient-text-blue">Blue shimmer</span>
        </div>
        <p style={{ margin: '14px 0 0', fontSize: 13, color: 'hsl(var(--muted-fg-h))' }}>
          Used on hero headlines only. 300% background-size, 4s ease infinite, panning gradient. Class: <code>.gradient-text-crimson</code> / <code>.gradient-text-blue</code>.
        </p>
      </div>
    </div>
  );
}

function TypeSample({ name, weight, sizeLabel, tracking, leading, children }) {
  const { copy } = useApp();
  return (
    <div
      style={{ padding: '14px 16px', border: '1px solid hsl(var(--app-border-h))', borderRadius: 14,
               background: 'hsl(var(--card-h))', cursor: 'pointer' }}
      onClick={() => copy(`var(${name})`, name)}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
                     fontSize: 11, fontFamily: 'var(--font-mono)', color: 'hsl(var(--muted-fg-h))' }}>
        <span style={{ color: 'hsl(var(--primary-h))' }}>{name}</span>
        <span>{weight} · {sizeLabel}{tracking ? ` · ${tracking}` : ''} · ↕ {leading}</span>
      </div>
      {children}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   SPACING
   ════════════════════════════════════════════════════════════════════ */
function PageSpacing() {
  return (
    <div className="ds-page">
      <div className="ds-eyebrow">FOUNDATIONS · SPACING</div>
      <h1 className="ds-h1">Tailwind 4px grid. <span className="accent">44px tap floor.</span></h1>
      <p className="ds-lede">
        Spacing is the Tailwind scale — multiples of 4px (0.25rem). Buttons, nav items and icon buttons all hit the 44px touch floor. Cards pad 16–24px. Sections breathe 32px mobile, 64px desktop.
      </p>

      <h2 className="ds-h2">Scale</h2>
      <p className="ds-sub">Click a row to copy.</p>
      <div>
        {[
          ['--space-1', 4], ['--space-2', 8], ['--space-3', 12], ['--space-4', 16],
          ['--space-5', 20], ['--space-6', 24], ['--space-8', 32], ['--space-10', 40],
          ['--space-12', 48], ['--space-16', 64], ['--space-20', 80],
        ].map(([n, v]) => <SpaceRow key={n} name={n} value={v} />)}
      </div>

      <h2 className="ds-h2">Layout containers</h2>
      <div className="ds-grid cols-2">
        <InfoCard t="Container max-width" v="1280px (xl) or 1400px (2xl)" sub="Landing hero text centers at max-w-4xl. App-shell padding uses px-3 md:px-4." />
        <InfoCard t="App-shell padding" v="px-edge (12 / 16px)" sub="Bumps to 24px on cards, 38px on hero panels." />
        <InfoCard t="Section vertical" v="py-8 → py-16" sub="32px mobile, 64px desktop. Hero panels add another 24px above." />
        <InfoCard t="Touch target floor" v="44px" sub="Every button, nav item, icon button hits this floor." />
      </div>

      <h2 className="ds-h2">Grid</h2>
      <p className="ds-sub">One column on mobile. 2 on tablet. 3–4 on desktop.</p>
      <div className="ds-grid cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ padding: 18, border: '1px dashed hsl(var(--primary-h) / 0.4)', borderRadius: 14,
                                 background: 'hsl(var(--primary-h) / 0.05)', fontFamily: 'var(--font-mono)',
                                 fontSize: 12, color: 'hsl(var(--primary-h))', textAlign: 'center' }}>
            grid-cols-3 · gap-3
          </div>
        ))}
      </div>
    </div>
  );
}

function SpaceRow({ name, value }) {
  const { copy } = useApp();
  return (
    <div className="space-row" onClick={() => copy(`var(${name})`, `${name} (${value}px)`)}>
      <div className="name">{name}</div>
      <div className="bar" style={{ width: value * 4 + 'px', maxWidth: '100%' }} />
      <div className="px">{value}px</div>
    </div>
  );
}

function InfoCard({ t, v, sub }) {
  return (
    <div className="ds-card">
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                     color: 'hsl(var(--muted-fg-h))' }}>{t}</div>
      <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.025em', marginTop: 4,
                     fontFamily: 'var(--font-mono)' }}>{v}</div>
      <div style={{ fontSize: 13, color: 'hsl(var(--muted-fg-h))', marginTop: 6, lineHeight: 1.5 }}>{sub}</div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   RADII & SHADOWS
   ════════════════════════════════════════════════════════════════════ */
function PageRadii() {
  return (
    <div className="ds-page">
      <div className="ds-eyebrow">FOUNDATIONS · RADII & SHADOWS</div>
      <h1 className="ds-h1">Rounds <span className="accent">a lot.</span></h1>
      <p className="ds-lede">
        No square corners anywhere. Chips and pills are full-radius. Cards land at 16–20px. Hero panels go up to 24px. Five soft, low-spread shadow tiers — never one without the other on a card.
      </p>

      <h2 className="ds-h2">Radius scale</h2>
      <div className="ds-grid cols-3">
        {[
          ['--radius-sm', '0.5rem · 8px'],
          ['--radius-md', '0.625rem · 10px'],
          ['--radius-lg', '0.75rem · 12px'],
          ['--radius-xl', '1rem · 16px'],
          ['--radius-2xl', '1.25rem · 20px'],
          ['--radius-3xl', '1.5rem · 24px'],
        ].map(([n, label]) => (
          <RadiusDemo key={n} name={n} label={label} />
        ))}
      </div>

      <h2 className="ds-h2">Shadow tiers</h2>
      <div className="ds-grid cols-3">
        {[
          ['--shadow-soft-sm', 'Cards, default'],
          ['--shadow-soft',    'Buttons, inputs'],
          ['--shadow-soft-md', 'Hover lift'],
          ['--shadow-soft-lg', 'Sheets, popovers'],
          ['--shadow-soft-xl', 'Modals, toasts'],
          ['--shadow-primary-glow', 'Primary CTAs'],
        ].map(([n, sub]) => (
          <ShadowDemo key={n} name={n} sub={sub} />
        ))}
      </div>

      <h2 className="ds-h2">Rules</h2>
      <div className="ds-grid cols-2">
        <InfoCard t="Card anatomy" v="border + soft shadow" sub="Never one without the other. Borders stay low-contrast (~12% delta)." />
        <InfoCard t="Hover lift" v="translateY(-2px to -3px)" sub="With a brand-tinted border. Always honored on .ds-card.hover." />
      </div>
    </div>
  );
}

function RadiusDemo({ name, label }) {
  const { copy } = useApp();
  return (
    <div
      className="ds-card hover"
      onClick={() => copy(`var(${name})`, name)}
      style={{ padding: 16, cursor: 'pointer' }}
    >
      <div className="radius-box" style={{ borderRadius: `var(${name})`, marginBottom: 12 }} />
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'hsl(var(--primary-h))', fontWeight: 600 }}>{name}</div>
      <div style={{ fontSize: 11.5, color: 'hsl(var(--muted-fg-h))', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function ShadowDemo({ name, sub }) {
  const { copy } = useApp();
  return (
    <div className="ds-card" style={{ padding: 18, background: 'hsl(var(--app-bg-h))', cursor: 'pointer' }}
         onClick={() => copy(`var(${name})`, name)}>
      <div className="shadow-box" style={{ boxShadow: `var(${name})`, marginBottom: 12 }} />
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'hsl(var(--primary-h))', fontWeight: 600 }}>{name}</div>
      <div style={{ fontSize: 11.5, color: 'hsl(var(--muted-fg-h))', marginTop: 2 }}>{sub}</div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   MOTION
   ════════════════════════════════════════════════════════════════════ */
function PageMotion() {
  const [run, setRun] = React.useState(0);
  return (
    <div className="ds-page">
      <div className="ds-eyebrow">FOUNDATIONS · MOTION</div>
      <h1 className="ds-h1">Quick on hover. <span className="accent">Springy on entry.</span></h1>
      <p className="ds-lede">
        Easing is a custom cubic-bezier(0.16, 1, 0.3, 1) for everything that moves. Durations are 150 / 220 / 350ms. Buttons get an active:scale(0.97). Primary CTAs breathe at 2.8s.
      </p>

      <h2 className="ds-h2">Durations & easings</h2>
      <div className="ds-grid cols-3">
        {[
          ['--dur-fast', '150ms', 'Hover · focus · button press'],
          ['--dur-base', '220ms', 'Card lift · accordion · toggle'],
          ['--dur-slow', '350ms', 'Sheet · dialog · page swap'],
          ['--ease-out',    'cubic-bezier(0.16, 1, 0.3, 1)', 'Default everywhere'],
          ['--ease-in-out', 'cubic-bezier(0.4, 0, 0.2, 1)', 'Continuous looping'],
          ['--ease-spring', 'cubic-bezier(0.22, 1, 0.36, 1)', 'Entry pops'],
        ].map(([n, v, sub]) => (
          <div className="ds-card" key={n}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'hsl(var(--primary-h))', fontWeight: 600 }}>{n}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, marginTop: 4 }}>{v}</div>
            <div style={{ fontSize: 12, color: 'hsl(var(--muted-fg-h))', marginTop: 8 }}>{sub}</div>
          </div>
        ))}
      </div>

      <h2 className="ds-h2">Demo · click "Replay"</h2>
      <div className="ds-card" style={{ padding: 22 }}>
        <button className="ds-btn primary sm" onClick={() => setRun(run + 1)}>
          <Icon name="refresh" size={13} /> Replay all
        </button>
        <div className="ds-grid cols-3" style={{ marginTop: 18 }}>
          {[
            { label: 'Hero stagger', d: 'opacity + y, 220ms ease-out' },
            { label: 'Card lift', d: 'translateY(-3px), 180ms' },
            { label: 'Sheet in', d: 'translateY(20px), 350ms' },
          ].map((m, i) => (
            <MotionDemo key={`${m.label}-${run}`} delay={i * 150} {...m} />
          ))}
        </div>
      </div>

      <h2 className="ds-h2">Signature animations</h2>
      <div className="ds-grid cols-3">
        <div className="ds-card">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
            <Icon name="type" size={16} style={{ color: 'hsl(var(--primary-h))' }} />
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>Typewriter</div>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.025em' }}>
            Stand out as a <Typewriter words={['Designer', 'PM', 'Engineer', 'Marketer']} />
          </div>
          <div style={{ fontSize: 12, color: 'hsl(var(--muted-fg-h))', marginTop: 8 }}>
            3px cursor. 1s blink. Hero headlines only.
          </div>
        </div>
        <div className="ds-card">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
            <Icon name="sparkles" size={16} style={{ color: 'hsl(var(--primary-h))' }} />
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>Gradient shimmer</div>
          </div>
          <div className="gradient-text-crimson" style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.025em' }}>
            Get more interviews.
          </div>
          <div style={{ fontSize: 12, color: 'hsl(var(--muted-fg-h))', marginTop: 8 }}>
            300% bg-size. 4s ease infinite.
          </div>
        </div>
        <div className="ds-card">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
            <Icon name="zap" size={16} style={{ color: 'hsl(var(--primary-h))' }} />
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>CTA pulse</div>
          </div>
          <button className="ds-btn primary" style={{ animation: 'ds-cta-pulse 2.8s ease-in-out infinite' }}>
            <Icon name="sparkles" size={14} strokeWidth={2.2} /> Build a Resume
          </button>
          <div style={{ fontSize: 12, color: 'hsl(var(--muted-fg-h))', marginTop: 10 }}>
            2.8s box-shadow ring breathing.
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes ds-cta-pulse {
          0%, 100% { box-shadow: 0 4px 14px -2px hsl(var(--primary-h) / 0.45); }
          50% { box-shadow: 0 4px 28px -2px hsl(var(--primary-h) / 0.8); }
        }
        @keyframes tw-blink { 0%, 49% { opacity: 1 } 50%, 100% { opacity: 0 } }
      ` }} />
    </div>
  );
}

function MotionDemo({ label, d, delay }) {
  const [shown, setShown] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setShown(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div
      style={{
        border: '1px solid hsl(var(--app-border-h))',
        borderRadius: 14, padding: 16, background: 'hsl(var(--app-bg-h))',
        opacity: shown ? 1 : 0, transform: shown ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 350ms var(--ease-out), transform 350ms var(--ease-out)',
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{label}</div>
      <div style={{ fontSize: 12, color: 'hsl(var(--muted-fg-h))', marginTop: 4 }}>{d}</div>
    </div>
  );
}

function Typewriter({ words }) {
  const [i, setI] = React.useState(0);
  const [out, setOut] = React.useState('');
  const [forward, setForward] = React.useState(true);
  React.useEffect(() => {
    const word = words[i % words.length];
    const t = setTimeout(() => {
      if (forward) {
        if (out.length < word.length) setOut(word.slice(0, out.length + 1));
        else setTimeout(() => setForward(false), 900);
      } else {
        if (out.length > 0) setOut(word.slice(0, out.length - 1));
        else { setForward(true); setI(i + 1); }
      }
    }, forward ? 65 : 40);
    return () => clearTimeout(t);
  }, [out, forward, i, words]);
  return (
    <span style={{ color: 'hsl(var(--primary-h))' }}>
      {out}<span style={{ display: 'inline-block', width: 3, height: '0.95em', background: 'hsl(var(--primary-h))',
                          marginLeft: 2, verticalAlign: '-2px', animation: 'tw-blink 1s steps(2, end) infinite' }} />
    </span>
  );
}

/* ════════════════════════════════════════════════════════════════════
   ICONOGRAPHY
   ════════════════════════════════════════════════════════════════════ */
function PageIconography() {
  const { copy } = useApp();
  const all = Object.keys(window.ICONS);
  const [q, setQ] = React.useState('');
  const list = all.filter((n) => n.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="ds-page">
      <div className="ds-eyebrow">FOUNDATIONS · ICONOGRAPHY</div>
      <h1 className="ds-h1">Lucide. <span className="accent">Stroke 1.5px.</span> Current color.</h1>
      <p className="ds-lede">
        One icon library. Stroke icons, 1.5px stroke weight, <code>currentColor</code> fill, sized via Tailwind classes (<code>w-4 h-4</code>, <code>w-5 h-5</code>, sometimes <code>w-3.5 h-3.5</code> in chips). If Lucide doesn't have it, fall back to a placeholder — never invent.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="ds-search" style={{ flex: '1 1 240px', maxWidth: 320 }}>
          <Icon name="search" size={14} />
          <input placeholder="Filter icons…" value={q} onChange={(e) => setQ(e.target.value)} />
          <kbd>{list.length}</kbd>
        </div>
        <div style={{ fontSize: 12, color: 'hsl(var(--muted-fg-h))' }}>
          Click any icon to copy its name.
        </div>
      </div>

      <div className="ds-grid cols-6">
        {list.map((n) => (
          <div className="icon-tile" key={n} onClick={() => copy(n, `Icon: ${n}`)}>
            <Icon name={n} size={22} strokeWidth={1.6} />
            <div className="label">{n}</div>
          </div>
        ))}
      </div>

      <h2 className="ds-h2">Sizes & usage</h2>
      <div className="ds-card">
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {[12, 14, 16, 18, 22, 28, 36].map((s) => (
            <div key={s} style={{ textAlign: 'center', color: 'hsl(var(--fg-h))' }}>
              <Icon name="sparkles" size={s} strokeWidth={1.6} />
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'hsl(var(--muted-fg-h))', marginTop: 6 }}>
                {s}px
              </div>
            </div>
          ))}
        </div>
      </div>

      <h2 className="ds-h2">Snippet</h2>
      <Code label="HTML usage" code={`<script src="https://unpkg.com/lucide@latest"></script>
<i data-lucide="sparkles" class="w-4 h-4"></i>
<i data-lucide="check-circle-2" class="w-5 h-5 text-success"></i>
<script>lucide.createIcons();</script>`} />
    </div>
  );
}

Object.assign(window, {
  PageOverview, PageVoice, PageGettingStarted,
  PageColor, PageType, PageSpacing, PageRadii, PageMotion, PageIconography,
});
