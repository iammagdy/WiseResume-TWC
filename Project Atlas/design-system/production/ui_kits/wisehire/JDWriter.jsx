/* global React, Icon, Card, Pill, Avatar */

function JDWriter() {
  const [step, setStep] = React.useState('done');

  return (
    <div className="wh-page">
      <div className="wh-page-head">
        <div>
          <div className="wh-eyebrow">AI Tool</div>
          <h1 className="wh-page-title">JD Writer</h1>
          <div style={{ fontSize: 12.5, color: 'var(--wh-muted-fg)', marginTop: 4 }}>
            Tell Wise what you're hiring for · AI drafts a complete, bias-checked job description in 30 seconds
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="wh-mini-btn"><Icon name="copy" size={13} />Copy</button>
          <button className="wh-mini-btn"><Icon name="share" size={13} />Share link</button>
          <button className="wh-cta-primary" style={{ height: 38, padding: '0 16px', fontSize: 13, whiteSpace: 'nowrap' }}>
            <Icon name="download" size={14} />Publish</button>
        </div>
      </div>

      <div className="wh-2col" style={{ gridTemplateColumns: '380px 1fr' }}>
        {/* Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card style={{ padding: 16 }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 13.5, fontWeight: 700 }}>The basics</h3>
            <div className="wh-form">
              <label>
                <span>Role title</span>
                <input value="Senior Frontend Engineer" readOnly />
              </label>
              <label>
                <span>Department</span>
                <input value="Engineering" readOnly />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label>
                  <span>Location</span>
                  <input value="Remote · US/EU" readOnly />
                </label>
                <label>
                  <span>Comp band</span>
                  <input value="$160–$200k" readOnly />
                </label>
              </div>
              <label>
                <span>Must-have skills</span>
                <div className="wh-tag-input">
                  <span className="wh-tag">React<Icon name="x" size={10} /></span>
                  <span className="wh-tag">TypeScript<Icon name="x" size={10} /></span>
                  <span className="wh-tag">GraphQL<Icon name="x" size={10} /></span>
                  <span className="wh-tag">5+ years<Icon name="x" size={10} /></span>
                  <input placeholder="Add skill…" />
                </div>
              </label>
              <label>
                <span>Tone</span>
                <div className="wh-segment">
                  <button>Formal</button>
                  <button className="is-active">Friendly</button>
                  <button>Startup</button>
                </div>
              </label>
            </div>
            <button className="wh-cta-primary" style={{ width: '100%', marginTop: 14 }}>
              <Icon name="wand" size={15} />Regenerate
            </button>
          </Card>

          <Card style={{ padding: 14, background: 'linear-gradient(135deg,rgb(34 197 94 / 0.06),var(--wh-card) 60%)', borderColor: 'rgb(34 197 94 / 0.22)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div className="wh-icon-box" style={{ background: 'rgb(34 197 94 / 0.12)', color: '#16a34a' }}><Icon name="shield" size={14} /></div>
              <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#16a34a' }}>Bias check</span>
            </div>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--wh-fg)' }}>
              <b>All clear</b> — no gendered language, no age signals, no jargon that filters out diverse applicants.
            </p>
            <button className="wh-link-btn" style={{ marginTop: 8 }}>See report <Icon name="arrowR" size={11} /></button>
          </Card>
        </div>

        {/* Output */}
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div className="wh-doc-toolbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="wh-ai-pulse" />
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#1D4ED8' }}>AI · drafted from your inputs</span>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
              <button className="wh-mini-btn"><Icon name="refresh" size={12} />Rewrite</button>
              <button className="wh-mini-btn">Make shorter</button>
              <button className="wh-mini-btn">More technical</button>
            </div>
          </div>

          <div className="wh-doc">
            <h1>Senior Frontend Engineer</h1>
            <div className="wh-doc-meta">Engineering · Remote (US/EU) · Full-time · $160–$200k</div>

            <h3>About the role</h3>
            <p>We're hiring a senior engineer to lead our customer-facing web experience. You'll partner with design and product to ship high-traffic features end-to-end, raise the bar on our React + GraphQL codebase, and mentor 2–3 mid-level engineers.</p>

            <h3>You'll spend your time</h3>
            <ul>
              <li>Owning frontend architecture for new product surfaces — from RFC to launch.</li>
              <li>Shipping React + TypeScript in a modern, well-tested codebase (Vite, Vitest, Playwright).</li>
              <li>Designing GraphQL schemas with backend partners; pushing for thoughtful contracts over quick fixes.</li>
              <li>Mentoring teammates through code review, pairing, and giving honest, kind feedback.</li>
            </ul>

            <h3>You'll likely be a fit if you</h3>
            <ul>
              <li>Have <span className="wh-doc-hl">5+ years</span> of production frontend experience.</li>
              <li>Are fluent in <span className="wh-doc-hl">React</span> and <span className="wh-doc-hl">TypeScript</span>, and comfortable in <span className="wh-doc-hl">GraphQL</span>.</li>
              <li>Care about web performance, accessibility, and the small details that make a product feel great.</li>
            </ul>

            <h3>What we offer</h3>
            <ul>
              <li>$160–$200k base + meaningful equity.</li>
              <li>Remote-first; quarterly team weeks in NYC or Lisbon.</li>
              <li>Generous PTO, full health coverage, $2k/yr learning budget.</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}

Object.assign(window, { JDWriter });
