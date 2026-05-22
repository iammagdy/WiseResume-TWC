/* global React, Icon, useApp, ScoreRing, Code */

/* ════════════════════════════════════════════════════════════════════
   BRAND · LOGOS
   ════════════════════════════════════════════════════════════════════ */
function PageBrandLogos() {
  const { brand, copy } = useApp();
  const logoLight = 'assets/wiseresume-logo-light.webp';
  const logoDark = 'assets/wiseresume-logo-dark.webp';
  const favicon = brand === 'wisehire' ? 'assets/wisehire-favicon.png' : 'assets/wiseresume-favicon.png';

  return (
    <div className="ds-page">
      <div className="ds-eyebrow">BRAND · LOGOS</div>
      <h1 className="ds-h1">3D mark. <span className="accent">Document plus spark.</span></h1>
      <p className="ds-lede">
        The brand mark is a rounded-square 3D app icon — red document with a ruby spark for WiseResume, purple-blue for WiseHire. Logos sit on light and dark backgrounds; favicons are 32px reductions.
      </p>

      <h2 className="ds-h2">Primary mark</h2>
      <div className="ds-grid cols-2">
        <div className="ds-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ background: '#fff', padding: 40, display: 'grid', placeItems: 'center', minHeight: 200 }}>
            <img src={logoLight} alt="WiseResume light logo" style={{ maxWidth: 200, height: 'auto' }} />
          </div>
          <div style={{ padding: '12px 16px', borderTop: '1px solid hsl(var(--app-border-h))',
                         display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Logo · light</div>
              <div style={{ fontSize: 11, color: 'hsl(var(--muted-fg-h))', marginTop: 2,
                             fontFamily: 'var(--font-mono)' }}>assets/wiseresume-logo-light.webp</div>
            </div>
            <button className="ds-btn outline sm" onClick={() => copy(logoLight, 'Light logo path')}>
              <Icon name="copy" size={12} /> Copy path
            </button>
          </div>
        </div>
        <div className="ds-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ background: '#111114', padding: 40, display: 'grid', placeItems: 'center', minHeight: 200 }}>
            <img src={logoDark} alt="WiseResume dark logo" style={{ maxWidth: 200, height: 'auto' }} />
          </div>
          <div style={{ padding: '12px 16px', borderTop: '1px solid hsl(var(--app-border-h))',
                         display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Logo · dark</div>
              <div style={{ fontSize: 11, color: 'hsl(var(--muted-fg-h))', marginTop: 2,
                             fontFamily: 'var(--font-mono)' }}>assets/wiseresume-logo-dark.webp</div>
            </div>
            <button className="ds-btn outline sm" onClick={() => copy(logoDark, 'Dark logo path')}>
              <Icon name="copy" size={12} /> Copy path
            </button>
          </div>
        </div>
      </div>

      <h2 className="ds-h2">Favicon</h2>
      <div className="ds-grid cols-3">
        <div className="ds-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <img src={favicon} alt="" style={{ width: 64, height: 64, borderRadius: 14 }} />
          <div style={{ fontSize: 11, color: 'hsl(var(--muted-fg-h))', fontFamily: 'var(--font-mono)' }}>64px preview</div>
        </div>
        <div className="ds-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <img src={favicon} alt="" style={{ width: 32, height: 32, borderRadius: 8 }} />
          <div style={{ fontSize: 11, color: 'hsl(var(--muted-fg-h))', fontFamily: 'var(--font-mono)' }}>32px (favicon)</div>
        </div>
        <div className="ds-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <img src={favicon} alt="" style={{ width: 16, height: 16, borderRadius: 4 }} />
          <div style={{ fontSize: 11, color: 'hsl(var(--muted-fg-h))', fontFamily: 'var(--font-mono)' }}>16px (tab)</div>
        </div>
      </div>

      <h2 className="ds-h2">Wordmark anatomy</h2>
      <div className="ds-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 4px' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, hsl(var(--primary-h)), hsl(var(--primary-glow-h)))',
            display: 'grid', placeItems: 'center',
            boxShadow: '0 6px 18px -4px hsl(var(--primary-h) / 0.5), inset 0 1px 0 hsl(0 0% 100% / 0.25)',
            color: '#fff', fontWeight: 800, fontSize: 18,
          }}>
            {brand === 'wisehire' ? 'WH' : 'W'}
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1 }}>
              <span style={{ color: 'hsl(var(--fg-h))' }}>{brand === 'wisehire' ? 'Wise' : 'Wise'}</span>
              <span style={{ color: 'hsl(var(--primary-h))' }}>{brand === 'wisehire' ? 'Hire' : 'Resume'}</span>
            </div>
            <div style={{ fontSize: 11, color: 'hsl(var(--muted-fg-h))', fontWeight: 600,
                           letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 3 }}>
              {brand === 'wisehire' ? 'AI Hiring Console' : 'AI Career Platform'}
            </div>
          </div>
        </div>
      </div>

      <h2 className="ds-h2">Don't</h2>
      <div className="ds-grid cols-3">
        {[
          ["Don't recolor the mark", 'sepia'],
          ["Don't stretch", 'stretch'],
          ["Don't change the wordmark casing", 'lowercase'],
        ].map(([t, kind]) => (
          <div className="ds-card" key={kind} style={{ borderColor: 'hsl(var(--error-h) / 0.4)' }}>
            <div style={{ height: 80, display: 'grid', placeItems: 'center', background: 'hsl(var(--muted-h))',
                           borderRadius: 12, marginBottom: 12 }}>
              <span style={{
                fontSize: 18, fontWeight: 800, letterSpacing: '-0.025em',
                filter: kind === 'sepia' ? 'sepia(1) hue-rotate(60deg)' : 'none',
                transform: kind === 'stretch' ? 'scaleX(1.6)' : 'none',
                textTransform: kind === 'lowercase' ? 'lowercase' : 'none',
              }}>
                {brand === 'wisehire' ? 'WiseHire' : 'WiseResume'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <Icon name="x" size={14} strokeWidth={2.6} style={{ color: 'hsl(var(--error-h))' }} />
              <div style={{ fontSize: 13, fontWeight: 600 }}>{t}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   BRAND · TWINS (WiseResume × WiseHire)
   ════════════════════════════════════════════════════════════════════ */
function PageBrandTwins() {
  const { brand, setBrand } = useApp();
  return (
    <div className="ds-page">
      <div className="ds-eyebrow">BRAND · TWO SURFACES</div>
      <h1 className="ds-h1">One codebase. <span className="accent">Two screens.</span></h1>
      <p className="ds-lede">
        WiseResume and WiseHire share auth, backend, and design tokens — but each owns its own brand color, hero, sidebar shell and route prefix. On the marketing site they live side-by-side via a product toggle; in the app, the active brand owns the entire screen.
      </p>

      <h2 className="ds-h2">Side-by-side</h2>
      <div className="ds-grid cols-2">
        <BrandSurface kind="wiseresume" current={brand} onPick={setBrand} />
        <BrandSurface kind="wisehire"   current={brand} onPick={setBrand} />
      </div>

      <h2 className="ds-h2">Switching rules</h2>
      <div className="ds-grid cols-2">
        <RuleRow ok t="The active route's brand owns every primary surface — buttons, focus rings, sidebar active state, hero glow." />
        <RuleRow ok t="The product toggle is only on the landing page, where both brands live for cross-sell." />
        <RuleRow t="Brands never mix inside the product — never a blue button on a WiseResume screen." />
        <RuleRow t="Don't tint neutrals to brand. Neutrals stay neutral; only the primary swaps." />
      </div>

      <h2 className="ds-h2">CSS switch</h2>
      <Code label="Apply on <html>" code={`/* Default = WiseResume crimson */
<html>

/* WiseHire = add the class */
<html class="brand-wisehire">

/* Dark theme = independent of brand */
<html class="dark brand-wisehire">`} />
    </div>
  );
}

function BrandSurface({ kind, current, onPick }) {
  const isHire = kind === 'wisehire';
  const primary = isHire ? '#1D4ED8' : '#9E1B22';
  const primaryGlow = isHire ? '#3B82F6' : '#c41e3a';
  const isActive = current === kind;
  return (
    <div className="ds-card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
      <div style={{
        padding: 26,
        position: 'relative', overflow: 'hidden',
        background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${primaryGlow}55 0%, transparent 65%), hsl(var(--card-h))`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{ width: 28, height: 28, borderRadius: 9,
                         background: `linear-gradient(135deg, ${primary}, ${primaryGlow})`,
                         display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, fontSize: 12 }}>
            {isHire ? 'WH' : 'W'}
          </div>
          <div style={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
            <span>Wise</span>
            <span style={{ color: primary }}>{isHire ? 'Hire' : 'Resume'}</span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'inline-flex', gap: 6 }}>
            <span style={{ padding: '3px 9px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                            background: `${primary}1f`, color: primary, border: `1px solid ${primary}55`,
                            letterSpacing: '0.1em' }}>
              {isHire ? 'EARLY ACCESS' : 'AI'}
            </span>
          </div>
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, maxWidth: '16ch' }}>
          {isHire ? <>Hire smarter.<br /><span style={{ color: primary }}>Screen faster.</span></>
                  : <>Stand out as a<br /><span style={{ color: primary }}>Software Engineer.</span></>}
        </div>
        <div style={{ fontSize: 12.5, color: 'hsl(var(--muted-fg-h))', marginTop: 8, maxWidth: '40ch', lineHeight: 1.5 }}>
          {isHire
            ? 'AI that screens candidates, writes JDs, and surfaces your best hires.'
            : 'AI that builds, tailors, and lands your next job.'}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <button className="ds-btn sm" style={{
            background: primary, color: '#fff',
            boxShadow: `0 4px 14px -2px ${primary}55`,
          }}>
            {isHire ? 'Join the Waitlist' : 'Get Started Free'}
          </button>
          <button className="ds-btn outline sm">See it in action</button>
        </div>
      </div>
      <div style={{ padding: '12px 18px', borderTop: '1px solid hsl(var(--app-border-h))',
                     display: 'flex', alignItems: 'center', gap: 12, fontSize: 12 }}>
        <span style={{ color: 'hsl(var(--muted-fg-h))', fontFamily: 'var(--font-mono)' }}>
          {isHire ? 'thewise.cloud/enterprises' : 'thewise.cloud'}
        </span>
        <button
          className={`ds-btn ${isActive ? 'primary' : 'outline'} sm`}
          style={{ marginLeft: 'auto' }}
          onClick={() => onPick(kind)}
        >
          {isActive ? <><Icon name="check" size={13} strokeWidth={2.4} /> Active</> : 'Switch to this brand'}
        </button>
      </div>
    </div>
  );
}

function RuleRow({ ok, t }) {
  return (
    <div className="ds-card" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div style={{ width: 26, height: 26, borderRadius: 7, display: 'grid', placeItems: 'center', flexShrink: 0,
                     background: ok ? 'hsl(var(--success-h) / 0.15)' : 'hsl(var(--error-h) / 0.15)',
                     color: ok ? 'hsl(var(--success-h))' : 'hsl(var(--error-h))' }}>
        <Icon name={ok ? 'check' : 'x'} size={14} strokeWidth={2.6} />
      </div>
      <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>
        <strong style={{ color: ok ? 'hsl(var(--success-h))' : 'hsl(var(--error-h))', fontSize: 11.5, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{ok ? 'Do' : "Don't"}</strong>
        <div style={{ marginTop: 4 }}>{t}</div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   PATTERN · LANDING HERO
   ════════════════════════════════════════════════════════════════════ */
function PatternHero() {
  const { brand } = useApp();
  const words = brand === 'wisehire'
    ? ['Hiring Manager', 'Recruiter', 'Talent Lead', 'Founder']
    : ['Software Engineer', 'Designer', 'Product Manager', 'Marketer'];
  return (
    <div className="ds-page">
      <div className="ds-eyebrow">PATTERN · LANDING HERO</div>
      <h1 className="ds-h1">The first surface. <span className="accent">Aurora, eyebrow, typewriter.</span></h1>
      <p className="ds-lede">
        Aurora canvas behind everything, then a radial primary glow at the top of the hero. Brand pill, sentence-cased headline with intentional period, typewriter on the role, three trust pills below.
      </p>

      <div className="screen-frame">
        <div className="titlebar">
          <span className="dot" style={{ background: '#ff5f57' }} />
          <span className="dot" style={{ background: '#febc2e' }} />
          <span className="dot" style={{ background: '#28c840' }} />
          <span className="url">thewise.cloud{brand === 'wisehire' ? '/enterprises' : ''}</span>
        </div>
        <div style={{
          position: 'relative',
          background: 'hsl(var(--bg-h))',
          padding: '48px 32px 56px',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: -120, left: '50%', transform: 'translateX(-50%)',
            width: 700, height: 360,
            background: 'radial-gradient(ellipse 80% 55% at 50% 0%, hsl(var(--primary-glow-h) / 0.4), transparent 65%)',
            pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative', maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
            <span className="ds-badge primary" style={{ marginBottom: 18 }}>
              <Icon name="sparkles" size={11} strokeWidth={2.2} />
              {brand === 'wisehire' ? 'NOW IN EARLY ACCESS' : 'AI-POWERED CAREER PLATFORM'}
            </span>
            <h1 style={{ fontSize: 'clamp(1.8rem, 6vw, 3.4rem)', fontWeight: 800, letterSpacing: '-0.035em',
                          lineHeight: 1.05, margin: '8px 0 16px' }}>
              {brand === 'wisehire'
                ? <>Hire smarter.<br /><span className={`gradient-text-${brand === 'wisehire' ? 'blue' : 'crimson'}`}>Screen faster.</span></>
                : <>Stand out as a<br /><MiniTypewriter words={words} /></>}
            </h1>
            <p style={{ fontSize: 16, color: 'hsl(var(--muted-fg-h))', maxWidth: '52ch', margin: '0 auto 22px', lineHeight: 1.5 }}>
              {brand === 'wisehire'
                ? 'AI that screens candidates, writes job descriptions, and surfaces your best hires — in minutes, not hours.'
                : 'AI that builds, tailors, and lands your next job. Free to start.'}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 22 }}>
              <button className="ds-btn primary lg">
                <Icon name="sparkles" size={15} strokeWidth={2.2} />
                {brand === 'wisehire' ? 'Join the Waitlist' : 'Get Started Free'}
              </button>
              <button className="ds-btn outline lg"><Icon name="eye" size={15} /> See it in action</button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 18, flexWrap: 'wrap',
                          fontSize: 12.5, color: 'hsl(var(--muted-fg-h))' }}>
              {(brand === 'wisehire'
                ? ['Invite-only access', '7-day free trial', 'No credit card', '500+ on the waitlist']
                : ['Free to start', 'No credit card', 'AI-powered']
              ).map((t) => (
                <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Icon name="checkc" size={13} style={{ color: 'hsl(var(--success-h))' }} />
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <h2 className="ds-h2">Anatomy</h2>
      <div className="ds-grid cols-2">
        <InfoRow t="Brand pill" d="rounded-full · 11px font · 0.14em tracking · primary tint at 10%/25%" />
        <InfoRow t="Headline" d="font-extrabold (800) · -0.035em tracking · clamp(1.9rem, 9vw, 5.5rem)" />
        <InfoRow t="Typewriter cursor" d="3px wide · primary color · 1s blink · honors reduced motion" />
        <InfoRow t="Hero glow" d="radial-gradient(ellipse 80% 55% at 50% 0%, --primary-glow, transparent)" />
        <InfoRow t="Subhead" d="≤ 12 words · ends in a verb or noun · muted-fg color" />
        <InfoRow t="Trust strip" d="3 short benefits · CheckCircle2 icons · middle dot separator" />
      </div>
    </div>
  );
}

function InfoRow({ t, d }) {
  return (
    <div className="ds-card">
      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{t}</div>
      <div style={{ fontSize: 12.5, color: 'hsl(var(--muted-fg-h))', marginTop: 4, lineHeight: 1.5,
                     fontFamily: 'var(--font-mono)' }}>{d}</div>
    </div>
  );
}

function MiniTypewriter({ words }) {
  const [i, setI] = React.useState(0);
  const [out, setOut] = React.useState('');
  const [forward, setForward] = React.useState(true);
  React.useEffect(() => {
    const word = words[i % words.length];
    const t = setTimeout(() => {
      if (forward) {
        if (out.length < word.length) setOut(word.slice(0, out.length + 1));
        else setTimeout(() => setForward(false), 1100);
      } else {
        if (out.length > 0) setOut(word.slice(0, out.length - 1));
        else { setForward(true); setI(i + 1); }
      }
    }, forward ? 70 : 40);
    return () => clearTimeout(t);
  }, [out, forward, i, words]);
  return (
    <span className="gradient-text-crimson">
      {out}<span style={{ display: 'inline-block', width: 3, height: '0.95em', background: 'hsl(var(--primary-h))',
                          marginLeft: 2, verticalAlign: '-2px', animation: 'tw-blink 1s steps(2, end) infinite' }} />
    </span>
  );
}

/* ════════════════════════════════════════════════════════════════════
   PATTERN · DASHBOARD
   ════════════════════════════════════════════════════════════════════ */
function PatternDashboard() {
  const { pushToast } = useApp();
  return (
    <div className="ds-page">
      <div className="ds-eyebrow">PATTERN · DASHBOARD</div>
      <h1 className="ds-h1">The home base. <span className="accent">Score, list, next step.</span></h1>
      <p className="ds-lede">
        Once you're authed, the dashboard greets you with an outcome-oriented hero, the ATS gauge, a resume list and a "what's next" card. Cards lift on hover; chips link to deep actions.
      </p>

      <div className="screen-frame">
        <div className="titlebar">
          <span className="dot" style={{ background: '#ff5f57' }} />
          <span className="dot" style={{ background: '#febc2e' }} />
          <span className="dot" style={{ background: '#28c840' }} />
          <span className="url">thewise.cloud/dashboard</span>
        </div>
        <div style={{ background: 'hsl(var(--app-bg-h))', padding: 24 }}>
          {/* App top nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px',
                         background: 'hsl(var(--card-h))', borderRadius: 14, border: '1px solid hsl(var(--app-border-h))',
                         marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: 8, background: 'linear-gradient(135deg, hsl(var(--primary-h)), hsl(var(--primary-glow-h)))',
                             display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, fontSize: 11 }}>W</div>
              <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.02em', color: 'hsl(var(--primary-h))' }}>WiseResume</div>
            </div>
            {['Home', 'Resumes', 'AI Studio', 'Applications', 'Portfolio'].map((t, i) => (
              <button
                key={t}
                style={{
                  border: 0, background: i === 0 ? 'hsl(var(--primary-h) / 0.12)' : 'transparent',
                  color: i === 0 ? 'hsl(var(--primary-h))' : 'hsl(var(--muted-fg-h))',
                  padding: '6px 12px', borderRadius: 9, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >{t}</button>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
              <div className="ds-search" style={{ padding: '6px 10px' }}>
                <Icon name="search" size={13} /><input placeholder="Search" style={{ width: 100 }} /><kbd>⌘K</kbd>
              </div>
              <span className="ds-badge primary">120 credits</span>
              <div style={{ width: 30, height: 30, borderRadius: 999, background: 'linear-gradient(135deg, hsl(var(--primary-h)), hsl(var(--primary-glow-h)))', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 12 }}>AR</div>
            </div>
          </div>

          {/* Hero card */}
          <div style={{
            position: 'relative', overflow: 'hidden',
            borderRadius: 20,
            background: 'linear-gradient(135deg, hsl(var(--primary-h) / 0.08), hsl(var(--card-h)) 55%)',
            border: '1px solid hsl(var(--primary-h) / 0.18)',
            padding: '22px 24px', marginBottom: 16,
          }}>
            <div style={{
              position: 'absolute', top: -60, right: -50, width: 220, height: 220, borderRadius: '50%',
              background: 'hsl(var(--primary-h) / 0.14)', filter: 'blur(50px)', pointerEvents: 'none',
            }} />
            <span className="ds-badge primary" style={{ position: 'relative' }}><Icon name="sparkles" size={11} strokeWidth={2.2} /> AI READY</span>
            <h2 style={{ position: 'relative', margin: '10px 0 4px', fontSize: 24, fontWeight: 800, letterSpacing: '-0.025em' }}>
              Optimize your resume. Get more interviews.
            </h2>
            <p style={{ position: 'relative', margin: '0 0 14px', fontSize: 13.5, color: 'hsl(var(--muted-fg-h))', maxWidth: '52ch' }}>
              Tailor for a job in seconds. AI rewrites vague bullets into measurable, recruiter-ready results.
            </p>
            <div style={{ position: 'relative', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="ds-btn primary" onClick={() => pushToast({ title: 'Resume started', sub: 'Pre-filled with your latest data' })}>
                <Icon name="plus" size={14} strokeWidth={2.2} /> Build a Resume
              </button>
              <button className="ds-btn outline">
                <Icon name="target" size={14} /> Optimize for a Job
              </button>
            </div>
          </div>

          {/* Two-col content */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <h3 style={{ margin: 0, fontSize: 12.5, fontWeight: 700, letterSpacing: '0.08em',
                              textTransform: 'uppercase', color: 'hsl(var(--muted-fg-h))' }}>My Resumes</h3>
                <button className="ds-btn ghost sm">View all <Icon name="arrowR" size={12} /></button>
              </div>
              {[
                { t: 'Frontend Engineer · v3', sub: 'Last edited 4m ago · Tailored for Stripe', score: 87 },
                { t: 'Frontend Engineer · v2', sub: '3 days ago · General', score: 72 },
                { t: 'Frontend Engineer · v1', sub: '2 weeks ago · Initial', score: 54 },
              ].map((r) => (
                <div key={r.t} style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: 12,
                  background: 'hsl(var(--card-h))', border: '1px solid hsl(var(--app-border-h))',
                  borderRadius: 14, marginBottom: 8,
                }}>
                  <div style={{
                    width: 44, height: 56, background: '#fff', borderRadius: 5, padding: 4,
                    border: '1px solid hsl(var(--app-border-h))', flexShrink: 0,
                    display: 'flex', flexDirection: 'column', gap: 2,
                  }}>
                    <div style={{ height: 3, width: '55%', background: 'hsl(var(--primary-h))', borderRadius: 1 }} />
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} style={{ height: 1.5, background: '#9ca3af', opacity: 0.7, borderRadius: 1 }} />
                    ))}
                    <div style={{ height: 8, background: 'hsl(var(--primary-h) / 0.1)', borderRadius: 1, marginTop: 2 }} />
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} style={{ height: 1.5, background: '#9ca3af', opacity: 0.6, borderRadius: 1 }} />
                    ))}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{r.t}</div>
                    <div style={{ fontSize: 12, color: 'hsl(var(--muted-fg-h))', marginTop: 2 }}>{r.sub}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      <button className="ds-btn outline sm" style={{ height: 28, padding: '0 10px', fontSize: 11.5 }}>
                        <Icon name="edit" size={11} /> Edit
                      </button>
                      <button className="ds-btn ghost sm" style={{ height: 28, padding: '0 10px', fontSize: 11.5 }}>
                        <Icon name="download" size={11} /> Download
                      </button>
                    </div>
                  </div>
                  <ScoreRing score={r.score} size={56} />
                </div>
              ))}
            </div>
            <div>
              <h3 style={{ margin: '0 0 10px', fontSize: 12.5, fontWeight: 700, letterSpacing: '0.08em',
                            textTransform: 'uppercase', color: 'hsl(var(--muted-fg-h))' }}>What's next</h3>
              {[
                { i: 'target', t: 'Tailor for a job', sub: 'Paste a JD' },
                { i: 'sparkles', t: 'Boost weak bullets', sub: '3 found in v3' },
                { i: 'eye', t: 'ATS scan', sub: 'Score: 87 · 2 fixes' },
                { i: 'globe', t: 'Publish portfolio', sub: 'alex.thewise.cloud' },
              ].map((n) => (
                <div key={n.t} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: 12,
                  background: 'hsl(var(--card-h))', border: '1px solid hsl(var(--app-border-h))',
                  borderRadius: 13, marginBottom: 8, cursor: 'pointer',
                }}>
                  <div style={{ width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center',
                                 background: 'hsl(var(--primary-h) / 0.12)', color: 'hsl(var(--primary-h))', flexShrink: 0 }}>
                    <Icon name={n.i} size={15} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{n.t}</div>
                    <div style={{ fontSize: 11.5, color: 'hsl(var(--muted-fg-h))', marginTop: 1 }}>{n.sub}</div>
                  </div>
                  <Icon name="chevronR" size={14} style={{ color: 'hsl(var(--muted-fg-h))' }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <h2 className="ds-h2">Building blocks used</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {['Hero card', 'Top nav', 'Search', 'Brand pill', 'Score ring', 'Resume row', 'What\'s next list', 'Toasts'].map((t) => (
          <span key={t} className="ds-badge primary">{t}</span>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   PATTERN · EDITOR
   ════════════════════════════════════════════════════════════════════ */
function PatternEditor() {
  const { setSheet } = useApp();
  const [tab, setTab] = React.useState('Experience');
  const sections = [
    ['Contact', 'user', 1],
    ['Summary', 'send', 1],
    ['Experience', 'briefcase', 3],
    ['Skills', 'zap', 12],
    ['Education', 'star', 2],
    ['Projects', 'file', 2],
  ];
  return (
    <div className="ds-page">
      <div className="ds-eyebrow">PATTERN · RESUME EDITOR</div>
      <h1 className="ds-h1">The workhorse. <span className="accent">3-column. Live preview.</span></h1>
      <p className="ds-lede">
        Section nav on the left, editor in the middle, miniature live preview on the right. AI floats bottom-right; tap any weak bullet to invoke a tailored Boost.
      </p>

      <div className="screen-frame">
        <div className="titlebar">
          <span className="dot" style={{ background: '#ff5f57' }} />
          <span className="dot" style={{ background: '#febc2e' }} />
          <span className="dot" style={{ background: '#28c840' }} />
          <span className="url">thewise.cloud/editor/frontend-engineer-v3</span>
        </div>
        <div style={{ background: 'hsl(var(--app-bg-h))', minHeight: 480 }}>
          {/* Editor header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px',
            borderBottom: '1px solid hsl(var(--app-border-h))', background: 'hsl(var(--card-h))',
          }}>
            <button className="ds-btn ghost sm"><Icon name="arrowL" size={13} /> Back</button>
            <div style={{ fontSize: 13, color: 'hsl(var(--muted-fg-h))' }}>
              Resumes / <span style={{ color: 'hsl(var(--fg-h))', fontWeight: 700 }}>Frontend Engineer · v3</span>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
              <ScoreRing score={87} size={36} label="" />
              <button className="ds-btn outline sm"><Icon name="target" size={13} /> Tailor</button>
              <button className="ds-btn primary sm" onClick={() => setSheet({
                title: 'AI Boost', subtitle: 'Rewrites vague bullets into measurable results',
                from: '"Worked on the team to improve the product."',
                to: '"Led a 4-person squad to ship a redesigned checkout, lifting conversion 18% and saving $1.2M annually."',
              })}>
                <Icon name="sparkles" size={13} strokeWidth={2.2} /> AI Boost
              </button>
            </div>
          </div>

          {/* 3-col body */}
          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr 280px', minHeight: 420 }}>
            {/* Sidebar */}
            <div style={{ borderRight: '1px solid hsl(var(--app-border-h))', padding: 12, background: 'hsl(var(--card-h))' }}>
              {sections.map(([t, ic, n]) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', borderRadius: 9, border: 0, cursor: 'pointer',
                    background: tab === t ? 'hsl(var(--primary-h) / 0.1)' : 'transparent',
                    color: tab === t ? 'hsl(var(--primary-h))' : 'hsl(var(--fg-h))',
                    fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, marginBottom: 2, textAlign: 'left',
                  }}
                >
                  <Icon name={ic} size={14} />
                  <span style={{ flex: 1 }}>{t}</span>
                  <span style={{
                    fontSize: 10, padding: '1px 6px', borderRadius: 999,
                    background: tab === t ? 'hsl(var(--primary-h) / 0.18)' : 'hsl(var(--muted-h))',
                    color: tab === t ? 'hsl(var(--primary-h))' : 'hsl(var(--muted-fg-h))',
                    fontWeight: 700,
                  }}>{n}</span>
                </button>
              ))}
            </div>

            {/* Main editor */}
            <div style={{ padding: 20, overflowY: 'auto' }}>
              <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>{tab}</h3>
                <span className="ds-badge neutral">3 entries</span>
                <button className="ds-btn ghost sm" style={{ marginLeft: 'auto' }}>
                  <Icon name="plus" size={12} /> Add
                </button>
              </div>

              {/* Role card */}
              <div style={{
                padding: 14, border: '1px solid hsl(var(--app-border-h))', borderRadius: 13,
                background: 'hsl(var(--card-h))', marginBottom: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'hsl(var(--primary-h))',
                                color: '#fff', display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 800 }}>S</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>Senior Frontend Engineer · Stripe</div>
                    <div style={{ fontSize: 12, color: 'hsl(var(--muted-fg-h))', marginTop: 2 }}>2023 — Present · Remote</div>
                  </div>
                  <button className="ds-btn ghost sm" style={{ height: 28 }}>
                    <Icon name="edit" size={12} /> Edit
                  </button>
                </div>
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <Bullet
                    quantified
                    text={<><b>Led a 4-person squad</b> to ship a redesigned checkout, lifting conversion 18% and saving $1.2M annually.</>}
                  />
                  <Bullet
                    quantified
                    text={<>Drove migration of design system to <b>tokens-driven Tailwind</b>, cutting visual-regression bugs by 62%.</>}
                  />
                  <Bullet
                    weak
                    onClick={() => setSheet({
                      title: 'AI Boost', subtitle: 'Rewrites vague bullets into measurable results',
                      from: '"Worked closely with PMs to improve onboarding."',
                      to: '"Partnered with 3 PMs to redesign onboarding, reducing time-to-first-value from 5 days to 30 minutes for 12k+ new users."',
                    })}
                    text={'Worked closely with PMs to improve onboarding.'}
                  />
                </div>
                <button className="ds-btn ghost sm" style={{ marginTop: 8, fontSize: 11.5, height: 26,
                  border: '1px dashed hsl(var(--app-border-h))', color: 'hsl(var(--muted-fg-h))' }}>
                  <Icon name="plus" size={11} /> Add bullet
                </button>
              </div>
            </div>

            {/* Preview */}
            <div style={{ borderLeft: '1px solid hsl(var(--app-border-h))', padding: 12, background: 'hsl(var(--app-surface-h))', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <button className="ds-btn ghost sm" style={{ height: 26, padding: '0 8px', fontSize: 11 }}><Icon name="eye" size={11} /> Preview</button>
                <button className="ds-btn ghost sm" style={{ height: 26, padding: '0 8px', fontSize: 11 }}><Icon name="download" size={11} /> PDF</button>
              </div>
              <div style={{ background: '#fff', borderRadius: 6, padding: 14, fontSize: 9, lineHeight: 1.4,
                             color: '#18181b', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: '-0.02em' }}>Alex Rivers</div>
                <div style={{ color: '#6b7280', fontSize: 8, marginTop: 1 }}>alex@example.com · 415-555-0142 · linkedin.com/in/alex</div>
                <div style={{ height: 1, background: '#f3f4f6', margin: '8px 0' }} />
                <PvSection title="EXPERIENCE">
                  <div style={{ fontWeight: 700, fontSize: 9 }}>Senior Frontend Engineer — Stripe</div>
                  <div style={{ color: '#6b7280', fontSize: 8 }}>2023 — Present</div>
                  <PvBullet>Led a 4-person squad to ship a redesigned checkout, lifting conversion 18%.</PvBullet>
                  <PvBullet>Drove migration of design system to tokens-driven Tailwind.</PvBullet>
                  <PvBullet weak>Worked closely with PMs to improve onboarding.</PvBullet>
                </PvSection>
                <PvSection title="SKILLS">
                  <div style={{ color: '#374151', fontSize: 8.5 }}>React · TypeScript · Tailwind · Figma · Node · GraphQL · Playwright</div>
                </PvSection>
              </div>
            </div>
          </div>
        </div>
      </div>

      <h2 className="ds-h2">Try the AI sheet — click any weak bullet above</h2>
      <p style={{ fontSize: 13, color: 'hsl(var(--muted-fg-h))', maxWidth: '60ch' }}>
        Weak bullets are dashed and softer. Tapping one fires the AI Boost sheet with that line as the source.
      </p>
    </div>
  );
}

function Bullet({ text, weak, quantified, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 8,
        padding: '8px 10px', borderRadius: 9,
        fontSize: 12.5, lineHeight: 1.5,
        background: weak ? 'hsl(var(--warning-h) / 0.08)' : 'hsl(var(--muted-h) / 0.5)',
        border: weak ? '1px dashed hsl(var(--warning-h) / 0.4)' : '1px solid transparent',
        cursor: weak ? 'pointer' : 'default',
      }}
    >
      <span style={{ color: 'hsl(var(--primary-h))', fontWeight: 700, flexShrink: 0 }}>•</span>
      <span style={{ flex: 1 }}>{text}</span>
      {weak && (
        <span className="ds-badge warn" style={{ flexShrink: 0 }}>
          <Icon name="sparkles" size={10} strokeWidth={2.2} /> Boost
        </span>
      )}
      {quantified && (
        <Icon name="check" size={13} strokeWidth={2.4} style={{ color: 'hsl(var(--success-h))', flexShrink: 0, marginTop: 1 }} />
      )}
    </div>
  );
}

function PvSection({ title, children }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
                     color: 'hsl(var(--primary-h))', borderBottom: '1px solid #f3f4f6', paddingBottom: 2, marginBottom: 3 }}>
        {title}
      </div>
      {children}
    </div>
  );
}
function PvBullet({ children, weak }) {
  return (
    <div style={{
      fontSize: 8, paddingLeft: 8, position: 'relative', marginBottom: 1.5,
      color: weak ? '#a78b00' : '#4b5563',
    }}>
      <span style={{ position: 'absolute', left: 2, color: 'hsl(var(--primary-h))' }}>•</span>
      {children}
    </div>
  );
}

Object.assign(window, {
  PageBrandLogos, PageBrandTwins, PatternHero, PatternDashboard, PatternEditor,
});
