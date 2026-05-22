/* global React, Icon, Button, Card, Pill, ScoreRing */

function DashboardHero({ onCreate, onTailor }) {
  return (
    <div className="wr-hero">
      <div className="wr-hero-blob" />
      <div style={{ position: 'relative' }}>
        <span className="wr-eyebrow"><Icon name="wand" size={11} />AI-Powered</span>
        <h1 className="wr-hero-h1">Optimize your resume.<br />Get more interviews.</h1>
        <p className="wr-hero-sub">Start in under 2 minutes — build from scratch or optimize for a specific job.</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button variant="outline" icon="file" onClick={onCreate}>Build a Resume</Button>
          <Button variant="primary" icon="wand" iconRight="arrowR" onClick={onTailor}>Optimize for a Job</Button>
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value, delta, icon }) {
  return (
    <Card style={{ padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="wr-icon-box"><Icon name={icon} size={14} /></div>
        <span style={{ fontSize: 11, color: 'var(--wr-muted-fg)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
        <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em' }}>{value}</span>
        {delta && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11.5, color: '#16a34a', fontWeight: 600 }}>
            <Icon name="trend" size={11} />{delta}
          </span>
        )}
      </div>
    </Card>
  );
}

function ResumeRow({ resume, onOpen }) {
  return (
    <Card hover style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}>
      <div className="wr-thumb">
        <div className="wr-thumb-stripe" style={{ background: '#9E1B22' }} />
        <div className="wr-thumb-line" style={{ width: '70%' }} />
        <div className="wr-thumb-line" style={{ width: '40%', opacity: 0.5 }} />
        <div className="wr-thumb-block" />
        <div className="wr-thumb-line" style={{ width: '85%', opacity: 0.5 }} />
        <div className="wr-thumb-line" style={{ width: '55%', opacity: 0.5 }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>{resume.title}</h3>
          {resume.tag && <Pill variant={resume.tag.v}>{resume.tag.label}</Pill>}
        </div>
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--wr-muted-fg)' }}>
          {resume.target} · Edited {resume.updated}
        </p>
        <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 11, color: 'var(--wr-muted-fg)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Icon name="file" size={11} />{resume.sections} sections
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Icon name="share" size={11} />{resume.applications} sent
          </span>
          {resume.shared && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Icon name="globe" size={11} />Portfolio live
            </span>
          )}
        </div>
      </div>
      <ScoreRing score={resume.score} size={64} />
      <Button variant="outline" size="sm" icon="edit" onClick={onOpen}>Edit</Button>
    </Card>
  );
}

function WhatsNextCard() {
  const items = [
    { done: true, text: 'Add a target job' },
    { done: true, text: 'Fill out work experience' },
    { done: false, text: 'Add 3 measurable bullets', cta: 'Boost' },
    { done: false, text: 'Run an ATS scan against a JD' },
    { done: false, text: 'Publish your portfolio' },
  ];
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>What's next</h3>
        <Pill variant="primary">2 of 5</Pill>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5 }}>
            <span style={{
              width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
              background: it.done ? '#22c55e' : 'transparent',
              border: it.done ? '0' : '1.5px solid var(--wr-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            }}>
              {it.done && <Icon name="check" size={11} strokeWidth={3} />}
            </span>
            <span style={{
              flex: 1,
              color: it.done ? 'var(--wr-muted-fg)' : 'var(--wr-fg)',
              textDecoration: it.done ? 'line-through' : 'none',
              fontWeight: it.done ? 400 : 500,
            }}>{it.text}</span>
            {it.cta && <button className="wr-mini-btn">{it.cta} <Icon name="arrowR" size={10} /></button>}
          </div>
        ))}
      </div>
    </Card>
  );
}

function DailyTipCard() {
  return (
    <Card style={{ padding: 16, background: 'linear-gradient(135deg,rgba(158,27,34,0.05),var(--wr-card) 60%)', borderColor: 'rgba(158,27,34,0.2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div className="wr-icon-box" style={{ background: 'rgba(158,27,34,0.12)', color: '#9E1B22' }}><Icon name="sparkles" size={14} /></div>
        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9E1B22' }}>Daily Tip</span>
      </div>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--wr-fg)' }}>
        Resumes with <b>quantified bullets</b> get 2.4× more callbacks. Try running Boost on your top 3 experience items.
      </p>
      <button className="wr-link-btn" style={{ marginTop: 10 }}>Show me how <Icon name="arrowR" size={11} /></button>
    </Card>
  );
}

function Dashboard({ onOpenResume }) {
  const resumes = [
    { title: 'Senior Frontend Engineer · Stripe', target: 'Software Engineer', updated: '2h ago', score: 87, sections: 9, applications: 12, tag: { label: 'Live', v: 'success' }, shared: true },
    { title: 'Senior Frontend Engineer · Linear', target: 'Software Engineer', updated: 'Yesterday', score: 72, sections: 8, applications: 4, tag: { label: 'Draft', v: 'neutral' } },
    { title: 'Staff Engineer (early draft)', target: 'Staff Engineer', updated: '3d ago', score: 54, sections: 6, applications: 0, tag: { label: 'Needs work', v: 'warn' } },
  ];
  return (
    <div className="wr-page">
      <DashboardHero onCreate={onOpenResume} onTailor={onOpenResume} />

      {/* Quick action chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        <button className="wr-chip"><Icon name="wand" size={13} />Tailor for a job</button>
        <button className="wr-chip"><Icon name="target" size={13} />Run ATS scan</button>
        <button className="wr-chip"><Icon name="message" size={13} />Cover letter</button>
        <button className="wr-chip"><Icon name="brain" size={13} />Interview prep</button>
        <button className="wr-chip"><Icon name="globe" size={13} />Share portfolio</button>
      </div>

      <div className="wr-2col">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <div className="wr-section-head">
              <h2>Your resumes</h2>
              <Button variant="ghost" size="sm" icon="plus">New resume</Button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {resumes.map((r, i) => <ResumeRow key={i} resume={r} onOpen={onOpenResume} />)}
            </div>
          </div>

          <div>
            <div className="wr-section-head">
              <h2>This month</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              <StatTile label="Applications" value="14" delta="+4" icon="share" />
              <StatTile label="Interviews" value="3" delta="+2" icon="message" />
              <StatTile label="Avg ATS" value="78" delta="+12" icon="target" />
              <StatTile label="Portfolio views" value="247" delta="+68" icon="globe" />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <WhatsNextCard />
          <DailyTipCard />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Dashboard });
