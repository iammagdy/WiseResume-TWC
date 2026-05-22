/* global React, Icon, Button, Card, Pill, ScoreRing */

const SECTIONS = [
  { id: 'contact', label: 'Contact', icon: 'user', done: true },
  { id: 'summary', label: 'Summary', icon: 'sparkles', done: true },
  { id: 'experience', label: 'Experience', icon: 'brief', done: true, active: true, badge: 4 },
  { id: 'skills', label: 'Skills', icon: 'target', done: true, badge: 12 },
  { id: 'education', label: 'Education', icon: 'building', done: true },
  { id: 'projects', label: 'Projects', icon: 'globe', done: false },
  { id: 'certs', label: 'Certifications', icon: 'shield', done: false },
  { id: 'awards', label: 'Awards', icon: 'star', done: false },
];

function SectionSidebar({ active, onSelect }) {
  return (
    <div className="wr-editor-sidebar">
      <div style={{ padding: '14px 12px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--wr-muted-fg)' }}>Sections</span>
          <button className="wr-icon-btn-sm"><Icon name="plus" size={13} /></button>
        </div>
      </div>
      <div style={{ padding: '0 8px 12px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={`wr-editor-tab ${active === s.id ? 'is-active' : ''}`}
          >
            <span style={{
              width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
              background: s.done ? '#22c55e' : 'transparent',
              border: s.done ? '0' : '1.5px solid var(--wr-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            }}>
              {s.done && <Icon name="check" size={10} strokeWidth={3} />}
            </span>
            <Icon name={s.icon} size={14} />
            <span style={{ flex: 1, textAlign: 'left' }}>{s.label}</span>
            {s.badge != null && <span className="wr-count">{s.badge}</span>}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 'auto', padding: 12, borderTop: '1px solid var(--wr-border)' }}>
        <div style={{ fontSize: 11, color: 'var(--wr-muted-fg)', marginBottom: 6 }}>Progress</div>
        <div style={{ height: 6, borderRadius: 3, background: 'var(--wr-muted)', overflow: 'hidden' }}>
          <div style={{ width: '63%', height: '100%', background: 'linear-gradient(90deg,#9E1B22,#c41e3a)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 11, color: 'var(--wr-muted-fg)' }}>
          <span>5 of 8 sections</span><span style={{ fontWeight: 700, color: '#9E1B22' }}>63%</span>
        </div>
      </div>
    </div>
  );
}

function ExperienceForm({ onOpenBoost }) {
  return (
    <Card style={{ padding: 20, background: 'var(--wr-card)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em' }}>Experience</h2>
        <Pill variant="neutral">4 roles</Pill>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <Button variant="ghost" size="sm" icon="wand" onClick={onOpenBoost}>Boost all</Button>
          <Button variant="outline" size="sm" icon="plus">Add role</Button>
        </div>
      </div>

      {/* Role 1 — expanded */}
      <div className="wr-role-card">
        <div className="wr-role-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="wr-role-logo">A</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Senior Software Engineer</div>
              <div style={{ fontSize: 12, color: 'var(--wr-muted-fg)' }}>Acme · 2022 — Present · Remote</div>
            </div>
          </div>
          <button className="wr-icon-btn-sm"><Icon name="more" size={14} /></button>
        </div>
        <div className="wr-bullets">
          <div className="wr-bullet">
            <span className="wr-bullet-dot">•</span>
            <span style={{ flex: 1 }}>Shipped a real-time analytics dashboard adopted by <b>40+ teams</b>, cutting reporting time by <b>62%</b> at launch.</span>
            <Pill variant="success" icon="check">Quantified</Pill>
          </div>
          <div className="wr-bullet">
            <span className="wr-bullet-dot">•</span>
            <span style={{ flex: 1 }}>Led a team of 4 engineers through a full migration from REST to GraphQL across <b>9 services</b>.</span>
          </div>
          <div className="wr-bullet wr-bullet-weak">
            <span className="wr-bullet-dot">•</span>
            <span style={{ flex: 1 }}>Worked on a new dashboard for the team and helped with launch.</span>
            <button className="wr-mini-btn wr-mini-btn-warn" onClick={onOpenBoost}>
              <Icon name="wand" size={11} />Boost
            </button>
          </div>
          <button className="wr-add-bullet"><Icon name="plus" size={12} />Add a bullet</button>
        </div>
      </div>

      {/* Role 2 — collapsed */}
      <div className="wr-role-card wr-role-collapsed">
        <div className="wr-role-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="wr-role-logo" style={{ background: '#3B82F6' }}>L</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Software Engineer</div>
              <div style={{ fontSize: 12, color: 'var(--wr-muted-fg)' }}>Linear · 2020 — 2022 · San Francisco</div>
            </div>
          </div>
          <Icon name="chevronD" size={14} color="var(--wr-muted-fg)" />
        </div>
      </div>
      <div className="wr-role-card wr-role-collapsed">
        <div className="wr-role-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="wr-role-logo" style={{ background: '#16a34a' }}>S</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Junior Engineer</div>
              <div style={{ fontSize: 12, color: 'var(--wr-muted-fg)' }}>Stripe · 2018 — 2020 · Dublin</div>
            </div>
          </div>
          <Icon name="chevronD" size={14} color="var(--wr-muted-fg)" />
        </div>
      </div>
    </Card>
  );
}

function ResumePreviewMini() {
  return (
    <div className="wr-preview-shell">
      <div className="wr-preview-controls">
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--wr-muted-fg)' }}>Live preview</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          <button className="wr-icon-btn-sm"><Icon name="refresh" size={13} /></button>
          <button className="wr-icon-btn-sm"><Icon name="download" size={13} /></button>
        </div>
      </div>
      <div className="wr-preview-page">
        <div style={{ borderBottom: '2px solid #9E1B22', paddingBottom: 8, marginBottom: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em', color: '#18181b' }}>Alex Kim</div>
          <div style={{ fontSize: 8.5, color: '#6b7280', marginTop: 2 }}>Senior Software Engineer · alex@studio.io · San Francisco</div>
        </div>
        <div className="wr-pv-section">
          <div className="wr-pv-h">Summary</div>
          <div className="wr-pv-text">Engineer with 6+ years building observable, high-traffic web platforms…</div>
        </div>
        <div className="wr-pv-section">
          <div className="wr-pv-h">Experience</div>
          <div className="wr-pv-role">Senior Software Engineer · Acme · 2022—Present</div>
          <div className="wr-pv-bullet">Shipped real-time analytics adopted by 40+ teams, cutting reporting time 62%</div>
          <div className="wr-pv-bullet">Led 4-engineer migration from REST to GraphQL across 9 services</div>
          <div className="wr-pv-bullet" style={{ opacity: 0.5 }}>Worked on a new dashboard for the team</div>
        </div>
        <div className="wr-pv-section">
          <div className="wr-pv-h">Skills</div>
          <div className="wr-pv-text">TypeScript · React · GraphQL · PostgreSQL · AWS · Kubernetes</div>
        </div>
      </div>
    </div>
  );
}

function Editor({ onBack, onOpenAi }) {
  const [active, setActive] = React.useState('experience');
  return (
    <div className="wr-editor-page">
      {/* Editor header */}
      <div className="wr-editor-header">
        <button className="wr-icon-btn" onClick={onBack}><Icon name="arrowL" size={16} /></button>
        <div className="wr-breadcrumb">
          <span>Resumes</span>
          <Icon name="chevronR" size={11} color="var(--wr-muted-fg)" />
          <b>Senior Frontend Engineer · Stripe</b>
        </div>
        <ScoreRing score={87} size={40} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <Pill variant="success" icon="check">Saved · 2s ago</Pill>
          <Button variant="outline" size="sm" icon="target">ATS Scan</Button>
          <Button variant="outline" size="sm" icon="wand">Tailor</Button>
          <Button variant="primary" size="sm" icon="download">Export</Button>
        </div>
      </div>

      <div className="wr-editor-body">
        <SectionSidebar active={active} onSelect={setActive} />
        <div className="wr-editor-main">
          <ExperienceForm onOpenBoost={onOpenAi} />
        </div>
        <ResumePreviewMini />
      </div>

      {/* Floating AI */}
      <button className="wr-ai-float" onClick={onOpenAi}>
        <Icon name="sparkles" size={16} />
        Ask Wise AI
      </button>
    </div>
  );
}

Object.assign(window, { Editor });
