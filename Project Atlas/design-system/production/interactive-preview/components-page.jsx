/* global React, Icon, useApp, Code */

/* ════════════════════════════════════════════════════════════════════
   BUTTONS
   ════════════════════════════════════════════════════════════════════ */
function PageButtons() {
  const { pushToast } = useApp();
  return (
    <div className="ds-page">
      <div className="ds-eyebrow">COMPONENTS · BUTTONS</div>
      <h1 className="ds-h1">Press matters. <span className="accent">Hover deepens.</span></h1>
      <p className="ds-lede">
        Five variants — primary, secondary, outline, ghost, destructive. Three sizes — sm (34px), md (42px), lg (48px). Every button gets active:scale(0.97). Primary CTAs ship with a soft glow.
      </p>

      <h2 className="ds-h2">Variants</h2>
      <div className="ds-card">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="ds-btn primary" onClick={() => pushToast({ title: 'Resume saved', sub: 'Live ATS score updated to 87%' })}>
            <Icon name="sparkles" size={14} strokeWidth={2.2} /> Build a Resume
          </button>
          <button className="ds-btn secondary"><Icon name="download" size={14} /> Download</button>
          <button className="ds-btn outline"><Icon name="eye" size={14} /> Preview</button>
          <button className="ds-btn ghost">Dismiss</button>
          <button className="ds-btn destructive"><Icon name="trash" size={14} /> Delete</button>
        </div>
      </div>

      <h2 className="ds-h2">Sizes</h2>
      <div className="ds-card">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="ds-btn primary sm">Small · 34</button>
          <button className="ds-btn primary">Medium · 42</button>
          <button className="ds-btn primary lg">Large · 48</button>
          <button className="ds-btn primary icon" aria-label="Add"><Icon name="plus" size={16} /></button>
          <button className="ds-btn outline icon" aria-label="Settings"><Icon name="settings" size={16} /></button>
        </div>
      </div>

      <h2 className="ds-h2">States · hover / focus / disabled</h2>
      <div className="ds-grid cols-3">
        {[
          { label: 'Default', cls: 'primary' },
          { label: 'Focus-visible', cls: 'primary', focus: true },
          { label: 'Disabled', cls: 'primary', disabled: true },
          { label: 'Outline default', cls: 'outline' },
          { label: 'Outline focus', cls: 'outline', focus: true },
          { label: 'Outline disabled', cls: 'outline', disabled: true },
        ].map((s) => (
          <div className="ds-card" key={s.label}>
            <div style={{ fontSize: 12, color: 'hsl(var(--muted-fg-h))', marginBottom: 10 }}>{s.label}</div>
            <button
              className={`ds-btn ${s.cls}`}
              disabled={s.disabled}
              style={s.focus ? { boxShadow: '0 0 0 3px hsl(var(--primary-h) / 0.3)' } : {}}
            >
              <Icon name="check" size={14} strokeWidth={2.4} /> Confirm
            </button>
          </div>
        ))}
      </div>

      <h2 className="ds-h2">Snippet</h2>
      <Code label="Button HTML" code={`<button class="ds-btn primary">
  <i data-lucide="sparkles" class="w-3.5 h-3.5"></i>
  Build a Resume
</button>

<button class="ds-btn outline sm">
  <i data-lucide="eye" class="w-3.5 h-3.5"></i>
  Preview
</button>

<button class="ds-btn ghost" disabled>Dismiss</button>`} />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   INPUTS & FORMS
   ════════════════════════════════════════════════════════════════════ */
function PageInputs() {
  const [first, setFirst] = React.useState('');
  const [email, setEmail] = React.useState('alex@example');
  const [bio, setBio] = React.useState('');
  const [role, setRole] = React.useState('Software Engineer');
  const [notify, setNotify] = React.useState(true);
  const emailInvalid = email.length > 0 && !email.includes('.') ;

  return (
    <div className="ds-page">
      <div className="ds-eyebrow">COMPONENTS · INPUTS & FORMS</div>
      <h1 className="ds-h1">Quiet by default. <span className="accent">Crisp on focus.</span></h1>
      <p className="ds-lede">
        Inputs land at 42px height to share the button rhythm. Focus borders go primary, with a 3px translucent ring. Invalid uses the error token. Helper text sits below in muted-fg.
      </p>

      <div className="ds-card">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <div className="ds-field">
            <label className="ds-label">First name</label>
            <input className="ds-input" placeholder="Alex" value={first} onChange={(e) => setFirst(e.target.value)} />
            <div className="ds-helper">Shown on your public portfolio.</div>
          </div>
          <div className="ds-field">
            <label className="ds-label">Email address</label>
            <input className={`ds-input ${emailInvalid ? 'invalid' : ''}`} placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <div className="ds-helper" style={{ color: emailInvalid ? 'hsl(var(--error-h))' : 'hsl(var(--muted-fg-h))' }}>
              {emailInvalid ? 'Add a domain — e.g. .com' : "We'll never spam. AI-powered job alerts only."}
            </div>
          </div>
          <div className="ds-field">
            <label className="ds-label">Target role</label>
            <select className="ds-select ds-input" value={role} onChange={(e) => setRole(e.target.value)}>
              <option>Software Engineer</option>
              <option>Product Manager</option>
              <option>Designer</option>
              <option>Marketing Lead</option>
              <option>Data Scientist</option>
            </select>
          </div>
          <div className="ds-field">
            <label className="ds-label">Live ATS notifications</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0' }}>
              <div className={`ds-switch ${notify ? 'on' : ''}`} onClick={() => setNotify(!notify)} />
              <div style={{ fontSize: 13, color: 'hsl(var(--muted-fg-h))' }}>
                {notify ? 'On — alert me when score drops below 80.' : 'Off — never alert me.'}
              </div>
            </div>
          </div>
          <div className="ds-field" style={{ gridColumn: '1 / -1' }}>
            <label className="ds-label">Summary</label>
            <textarea
              className="ds-textarea"
              placeholder="Write a sentence or two about yourself — AI will polish it."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
            <div className="ds-helper">{bio.length}/280 — AI rewrites kick in past 30 chars.</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
          <button className="ds-btn ghost">Cancel</button>
          <button className="ds-btn primary"><Icon name="check" size={14} strokeWidth={2.4} /> Save profile</button>
        </div>
      </div>

      <h2 className="ds-h2">States</h2>
      <div className="ds-grid cols-3">
        <FieldState label="Default" />
        <FieldState label="Focused" focused />
        <FieldState label="Invalid" invalid msg="Pick a stronger headline." />
        <FieldState label="Disabled" disabled />
        <FieldState label="With prefix" prefix="https://" placeholder="alex-rivers" />
        <FieldState label="With suffix" suffix=".thewise.cloud" placeholder="alex-rivers" />
      </div>

      <h2 className="ds-h2">Search & command</h2>
      <div className="ds-card">
        <div className="ds-search" style={{ maxWidth: 440 }}>
          <Icon name="search" size={14} />
          <input placeholder="Search resumes, applications, AI tools…" />
          <kbd>⌘K</kbd>
        </div>
      </div>
    </div>
  );
}

function FieldState({ label, focused, invalid, disabled, msg, placeholder = 'Senior Frontend Engineer', prefix, suffix }) {
  return (
    <div className="ds-card">
      <div style={{ fontSize: 12, color: 'hsl(var(--muted-fg-h))', marginBottom: 8 }}>{label}</div>
      <div style={{
        display: 'flex', alignItems: 'center',
        height: 42, padding: prefix || suffix ? '0' : '0 14px',
        borderRadius: 12,
        border: '1px solid hsl(var(--app-border-h))',
        background: 'hsl(var(--card-h))',
        opacity: disabled ? 0.5 : 1,
        ...(focused ? {
          borderColor: 'hsl(var(--primary-h))',
          boxShadow: '0 0 0 3px hsl(var(--primary-h) / 0.15)',
        } : {}),
        ...(invalid ? {
          borderColor: 'hsl(var(--error-h))',
          boxShadow: '0 0 0 3px hsl(var(--error-h) / 0.12)',
        } : {}),
      }}>
        {prefix && (
          <div style={{ padding: '0 0 0 14px', color: 'hsl(var(--muted-fg-h))', fontSize: 13 }}>{prefix}</div>
        )}
        <input
          disabled={disabled}
          placeholder={placeholder}
          style={{
            flex: 1, border: 0, background: 'transparent', outline: 0, color: 'hsl(var(--fg-h))',
            fontFamily: 'inherit', fontSize: 13.5, padding: prefix || suffix ? '0 8px' : 0, minWidth: 0,
          }}
        />
        {suffix && (
          <div style={{ padding: '0 14px 0 0', color: 'hsl(var(--muted-fg-h))', fontSize: 13 }}>{suffix}</div>
        )}
      </div>
      {msg && (
        <div style={{ fontSize: 11.5, color: 'hsl(var(--error-h))', marginTop: 6,
                      display: 'flex', gap: 5, alignItems: 'center' }}>
          <Icon name="alert" size={12} strokeWidth={2} /> {msg}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   BADGES & PILLS
   ════════════════════════════════════════════════════════════════════ */
function PageBadges() {
  return (
    <div className="ds-page">
      <div className="ds-eyebrow">COMPONENTS · BADGES & PILLS</div>
      <h1 className="ds-h1">Soft fills, <span className="accent">borders on tone.</span></h1>
      <p className="ds-lede">
        Status, count, label. Always rounded-full. 11px font, 600 weight. Background sits at ~10% of the brand color, border at ~25%.
      </p>

      <h2 className="ds-h2">Tones</h2>
      <div className="ds-card">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="ds-badge primary"><Icon name="sparkles" size={11} strokeWidth={2.2} /> AI-Powered</span>
          <span className="ds-badge success"><Icon name="check" size={11} strokeWidth={2.4} /> 87% ATS</span>
          <span className="ds-badge warn"><Icon name="alert" size={11} strokeWidth={2} /> Weak bullet</span>
          <span className="ds-badge info"><Icon name="info" size={11} strokeWidth={2} /> Trial · 6 days left</span>
          <span className="ds-badge error"><Icon name="x" size={11} strokeWidth={2.6} /> Job closed</span>
          <span className="ds-badge neutral">Draft</span>
        </div>
      </div>

      <h2 className="ds-h2">In context</h2>
      <div className="ds-grid cols-3">
        <div className="ds-card">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Senior PM — Stripe</div>
              <div style={{ fontSize: 12, color: 'hsl(var(--muted-fg-h))', marginTop: 2 }}>Applied 3 days ago</div>
            </div>
            <span className="ds-badge success"><Icon name="check" size={11} strokeWidth={2.4} /> Interview</span>
          </div>
          <button className="ds-btn ghost sm">View details <Icon name="arrowR" size={12} /></button>
        </div>
        <div className="ds-card">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Frontend Eng — Linear</div>
              <div style={{ fontSize: 12, color: 'hsl(var(--muted-fg-h))', marginTop: 2 }}>Submitted yesterday</div>
            </div>
            <span className="ds-badge warn">Waiting</span>
          </div>
          <button className="ds-btn ghost sm">View details <Icon name="arrowR" size={12} /></button>
        </div>
        <div className="ds-card">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Product Designer — Figma</div>
              <div style={{ fontSize: 12, color: 'hsl(var(--muted-fg-h))', marginTop: 2 }}>Saved Tue</div>
            </div>
            <span className="ds-badge neutral">Draft</span>
          </div>
          <button className="ds-btn ghost sm">Tailor resume <Icon name="arrowR" size={12} /></button>
        </div>
      </div>

      <h2 className="ds-h2">Count chip</h2>
      <div className="ds-card">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="ds-btn outline"><Icon name="bell" size={14} /> Notifications</button>
          <span className="ds-badge primary" style={{ minWidth: 22, justifyContent: 'center' }}>3</span>
          <span className="ds-badge neutral" style={{ minWidth: 22, justifyContent: 'center' }}>0</span>
          <span className="ds-badge error" style={{ minWidth: 22, justifyContent: 'center' }}>12</span>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   CARDS
   ════════════════════════════════════════════════════════════════════ */
function PageCards() {
  return (
    <div className="ds-page">
      <div className="ds-eyebrow">COMPONENTS · CARDS</div>
      <h1 className="ds-h1">Border. Shadow. <span className="accent">Both, always.</span></h1>
      <p className="ds-lede">
        Cards never run without a border-and-soft-shadow pair. Hover lifts 2–3px with a brand-tinted border. Padding lives at 16–24px. Featured panels round to 20–24px.
      </p>

      <h2 className="ds-h2">Anatomy</h2>
      <div className="ds-grid cols-2">
        <div className="ds-card">
          <div style={{ fontSize: 12, color: 'hsl(var(--muted-fg-h))', marginBottom: 12 }}>Default · static</div>
          <div className="ds-card hover" style={{ background: 'hsl(var(--app-bg-h))' }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 11, display: 'grid', placeItems: 'center',
                            background: 'hsl(var(--primary-h) / 0.12)', color: 'hsl(var(--primary-h))', flexShrink: 0 }}>
                <Icon name="file" size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Frontend Engineer · v3</div>
                <div style={{ fontSize: 12, color: 'hsl(var(--muted-fg-h))', marginTop: 2 }}>Last edited 4m ago · 87% ATS</div>
              </div>
            </div>
          </div>
        </div>
        <div className="ds-card">
          <div style={{ fontSize: 12, color: 'hsl(var(--muted-fg-h))', marginBottom: 12 }}>Hover — try it</div>
          <div className="ds-card hover" style={{ background: 'hsl(var(--app-bg-h))' }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 11, display: 'grid', placeItems: 'center',
                            background: 'hsl(var(--primary-h) / 0.12)', color: 'hsl(var(--primary-h))', flexShrink: 0 }}>
                <Icon name="sparkles" size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>AI Tailor for a job</div>
                <div style={{ fontSize: 12, color: 'hsl(var(--muted-fg-h))', marginTop: 2 }}>Paste a JD, AI tailors in seconds.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <h2 className="ds-h2">Hero / feature card</h2>
      <div className="ds-card" style={{ padding: 0, overflow: 'hidden', borderRadius: 22 }}>
        <div style={{ padding: 28, position: 'relative',
                       background: 'linear-gradient(180deg, hsl(var(--primary-h) / 0.08), transparent 80%), hsl(var(--card-h))' }}>
          <span className="ds-badge primary" style={{ marginBottom: 14 }}>
            <Icon name="sparkles" size={11} strokeWidth={2.2} /> NEW · AI Tailor
          </span>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.1, maxWidth: '24ch' }}>
            Watch AI turn weak bullets into quantified achievements.
          </div>
          <p style={{ fontSize: 14, color: 'hsl(var(--muted-fg-h))', maxWidth: '50ch', marginTop: 8 }}>
            Live ATS score updates as you write. Before/after comparison shows exactly what changed.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button className="ds-btn primary">Try AI Tailor</button>
            <button className="ds-btn outline">See an example</button>
          </div>
        </div>
      </div>

      <h2 className="ds-h2">Specification</h2>
      <Code label="Card CSS" code={`.card {
  background: hsl(var(--card-h));
  border: 1px solid hsl(var(--app-border-h));
  border-radius: var(--radius-xl);            /* 16px · 20px on featured */
  box-shadow: var(--shadow-soft);
  padding: 1rem;                              /* 16–24px */
  transition: all var(--dur-base) var(--ease-out);
}
.card:hover {
  border-color: hsl(var(--primary-h) / 0.22);
  transform: translateY(-3px);
  box-shadow: var(--shadow-soft-lg);
}`} />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   SCORE RING
   ════════════════════════════════════════════════════════════════════ */
function ScoreRing({ score, label = 'ATS', size = 88 }) {
  const r = size * 0.42;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - score / 100);
  const color = score >= 80 ? 'hsl(var(--success-h))' : score >= 60 ? 'hsl(var(--primary-h))' : 'hsl(var(--warning-h))';
  const trackColor = score >= 80 ? 'hsl(var(--success-h) / 0.15)' : score >= 60 ? 'hsl(var(--primary-h) / 0.15)' : 'hsl(var(--warning-h) / 0.18)';
  return (
    <div style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={size * 0.09} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={size * 0.09} fill="none"
                strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
                style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.16,1,0.3,1)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: size * 0.28, fontWeight: 800, letterSpacing: '-0.03em', color, lineHeight: 1 }}>{score}</div>
        <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'hsl(var(--muted-fg-h))', fontWeight: 700, marginTop: 3 }}>{label}</div>
      </div>
    </div>
  );
}

function PageScoreRing() {
  const [score, setScore] = React.useState(72);
  return (
    <div className="ds-page">
      <div className="ds-eyebrow">COMPONENTS · SCORE RING</div>
      <h1 className="ds-h1">Live ATS score. <span className="accent">The signature gauge.</span></h1>
      <p className="ds-lede">
        Sits on the dashboard and at the head of the editor. Color thresholds: <strong style={{ color: 'hsl(var(--warning-h))' }}>&lt; 60 warning</strong>, <strong style={{ color: 'hsl(var(--primary-h))' }}>60–79 primary</strong>, <strong style={{ color: 'hsl(var(--success-h))' }}>≥ 80 success</strong>. Animates between values.
      </p>

      <h2 className="ds-h2">Sizes</h2>
      <div className="ds-card">
        <div style={{ display: 'flex', gap: 32, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {[56, 80, 112, 160].map((s) => (
            <div key={s} style={{ textAlign: 'center' }}>
              <ScoreRing score={87} size={s} />
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'hsl(var(--muted-fg-h))', marginTop: 8 }}>
                {s}px
              </div>
            </div>
          ))}
        </div>
      </div>

      <h2 className="ds-h2">Thresholds — drag to test</h2>
      <div className="ds-card">
        <div style={{ display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap' }}>
          <ScoreRing score={score} size={140} />
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 8 }}>ATS score: {score}</div>
            <input type="range" min="0" max="100" value={score} onChange={(e) => setScore(+e.target.value)}
                   style={{ width: '100%', accentColor: 'hsl(var(--primary-h))' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'hsl(var(--muted-fg-h))',
                          marginTop: 6, fontFamily: 'var(--font-mono)' }}>
              <span>0 — warn</span><span>60 — primary</span><span>80 — success</span><span>100</span>
            </div>
            <div className="ds-grid cols-3" style={{ marginTop: 16, gap: 8 }}>
              <button className="ds-btn outline sm" onClick={() => setScore(48)}>Weak</button>
              <button className="ds-btn outline sm" onClick={() => setScore(72)}>OK</button>
              <button className="ds-btn outline sm" onClick={() => setScore(94)}>Great</button>
            </div>
          </div>
        </div>
      </div>

      <h2 className="ds-h2">In context</h2>
      <div className="ds-grid cols-3">
        {[
          { score: 48, t: 'Resume v1', sub: 'Generic. AI suggests 8 fixes.' },
          { score: 72, t: 'Resume v2', sub: 'Tailored. AI suggests 3 fixes.' },
          { score: 94, t: 'Resume v3', sub: 'Quantified. Ship it.' },
        ].map((r) => (
          <div className="ds-card hover" key={r.t}>
            <div className="ring-card">
              <ScoreRing score={r.score} size={68} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{r.t}</div>
                <div style={{ fontSize: 12, color: 'hsl(var(--muted-fg-h))', marginTop: 2 }}>{r.sub}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   AI SHEET
   ════════════════════════════════════════════════════════════════════ */
function PageAiSheet() {
  const { setSheet } = useApp();
  const presets = [
    {
      title: 'AI Boost',
      subtitle: 'Rewrites vague bullets into measurable results',
      from: '"Worked on the team to improve the product."',
      to: '"Led a 4-person squad to ship a redesigned checkout, lifting conversion 18% and saving $1.2M annually."',
    },
    {
      title: 'AI Tailor',
      subtitle: 'Pastes a JD and rewrites your resume for the role',
      from: '"Responsible for managing several projects across teams."',
      to: '"Owned roadmap for 3 cross-functional teams, shipping 14 features and reducing average cycle time 32%."',
    },
    {
      title: 'AI ATS Scan',
      subtitle: 'Surfaces keyword gaps and ATS pitfalls',
      from: '"Familiar with Figma, Notion, and Slack."',
      to: '"Power-user of Figma, Notion, Slack — plus production-tested in Linear, Loom, and Productboard."',
    },
  ];
  return (
    <div className="ds-page">
      <div className="ds-eyebrow">COMPONENTS · AI SHEET</div>
      <h1 className="ds-h1">From → To. <span className="accent">With a thinking pause.</span></h1>
      <p className="ds-lede">
        The signature AI interaction. Bottom-right card slides up with the source quote, runs a 3-dot thinking animation, then reveals the rewrite in a success-tinted block. "AI" tab anchors the result. Try each preset.
      </p>

      <h2 className="ds-h2">Trigger any sheet</h2>
      <div className="ds-grid cols-3">
        {presets.map((p) => (
          <div className="ds-card hover" key={p.title} onClick={() => setSheet(p)}>
            <div style={{ width: 36, height: 36, borderRadius: 11, display: 'grid', placeItems: 'center',
                          background: 'linear-gradient(135deg, hsl(var(--primary-h)), hsl(var(--primary-glow-h)))',
                          color: '#fff', marginBottom: 12,
                          boxShadow: '0 4px 14px -2px hsl(var(--primary-h) / 0.5)' }}>
              <Icon name="sparkles" size={17} strokeWidth={2.2} />
            </div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{p.title}</div>
            <div style={{ fontSize: 12.5, color: 'hsl(var(--muted-fg-h))', marginTop: 4, lineHeight: 1.5 }}>{p.subtitle}</div>
            <div style={{ marginTop: 12, color: 'hsl(var(--primary-h))', fontSize: 12, fontWeight: 700,
                          display: 'flex', alignItems: 'center', gap: 4 }}>
              Open sheet <Icon name="arrowR" size={12} />
            </div>
          </div>
        ))}
      </div>

      <h2 className="ds-h2">Floating AI button</h2>
      <div className="ds-card" style={{ position: 'relative', minHeight: 200, padding: 28,
                                          background: 'hsl(var(--app-bg-h))' }}>
        <div style={{ maxWidth: '52ch' }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Anchored bottom-right.</div>
          <div style={{ fontSize: 13, color: 'hsl(var(--muted-fg-h))' }}>
            Hovers above the editor surface. CTA pulse glow. Tap to open the AI sheet contextual to the current section.
          </div>
        </div>
        <button
          className="ds-btn primary"
          onClick={() => setSheet(presets[0])}
          style={{
            position: 'absolute', bottom: 22, right: 22,
            height: 46, padding: '0 18px', borderRadius: 16, fontSize: 14,
            boxShadow: '0 10px 25px -5px hsl(var(--primary-h) / 0.5)',
            animation: 'ds-cta-pulse 2.8s ease-in-out infinite',
          }}
        >
          <Icon name="sparkles" size={15} strokeWidth={2.2} /> Ask AI
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   TOASTS
   ════════════════════════════════════════════════════════════════════ */
function PageToasts() {
  const { pushToast } = useApp();
  return (
    <div className="ds-page">
      <div className="ds-eyebrow">COMPONENTS · TOASTS</div>
      <h1 className="ds-h1">Bottom-right. <span className="accent">2.5 seconds out.</span></h1>
      <p className="ds-lede">
        Stack from the bottom. Slide up 20px on enter, fade on exit. Default 2.5s lifetime. Click any button below to fire one.
      </p>

      <h2 className="ds-h2">Tones</h2>
      <div className="ds-card">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="ds-btn outline" onClick={() => pushToast({ title: 'Resume saved', sub: 'Live ATS score updated to 87%', kind: 'success' })}>
            <Icon name="checkc" size={14} /> Success
          </button>
          <button className="ds-btn outline" onClick={() => pushToast({ title: 'AI is thinking…', sub: 'Rewriting 3 weak bullets', kind: 'info' })}>
            <Icon name="info" size={14} /> Info
          </button>
          <button className="ds-btn outline" onClick={() => pushToast({ title: 'Linked to clipboard', sub: '#9E1B22 · WiseResume primary', kind: 'success' })}>
            <Icon name="copy" size={14} /> Copy confirmation
          </button>
          <button className="ds-btn outline" onClick={() => pushToast({ title: 'Tailored for Stripe', sub: 'New score: 94 · ready to apply', kind: 'success' })}>
            <Icon name="target" size={14} /> Action complete
          </button>
        </div>
      </div>

      <h2 className="ds-h2">Spec</h2>
      <Code label="Toast spec" code={`Position:   fixed; bottom: 22px; right: 22px;
Stack:      column-reverse, gap 10px
Card:       16px padding, 14px radius, soft-xl shadow
Enter:      translateY(20px) scale(0.96) → 0/1   (350ms ease-out)
Exit:       translateY(20px) opacity(0)          (250ms ease-out)
Default:    2.2s visible, then 300ms exit`} />
    </div>
  );
}

Object.assign(window, {
  PageButtons, PageInputs, PageBadges, PageCards,
  PageScoreRing, PageAiSheet, PageToasts, ScoreRing,
});
