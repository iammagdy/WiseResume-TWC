/* global React, Icon, Card, Pill, Avatar, ScoreBar */

function WHStatTile({ label, value, delta, icon, accent }) {
  return (
    <Card style={{ padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="wh-icon-box" style={accent ? { background: 'rgb(29 78 216 / 0.1)', color: '#1D4ED8' } : {}}>
          <Icon name={icon} size={14} />
        </div>
        <span style={{ fontSize: 10.5, color: 'var(--wh-muted-fg)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
        <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em' }}>{value}</span>
        {delta && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#16a34a', fontWeight: 700 }}>
            <Icon name="trend" size={11} />{delta}
          </span>
        )}
      </div>
    </Card>
  );
}

function ActiveRoleRow({ title, dept, candidates, hot, daysOpen, owner, ownerIdx }) {
  return (
    <div className="wh-role-row">
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{title}</h3>
          {hot && <Pill variant="warn" icon="zap">Urgent</Pill>}
        </div>
        <div style={{ fontSize: 12, color: 'var(--wh-muted-fg)' }}>
          {dept} · Open {daysOpen} days
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <div>
          <div style={{ fontSize: 10.5, color: 'var(--wh-muted-fg)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Candidates</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--wh-fg)' }}>{candidates}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Avatar initials={owner} idx={ownerIdx} size={26} />
          <Icon name="chevronR" size={14} color="var(--wh-muted-fg)" />
        </div>
      </div>
    </div>
  );
}

function NewActivityCard() {
  const items = [
    { kind: 'screen', who: 'Alex Kim', what: 'scored 91 against Senior FE', when: '2m ago', icon: 'brain' },
    { kind: 'feedback', who: 'Sarah Chen', what: 'interview feedback submitted by Maya', when: '18m ago', icon: 'message' },
    { kind: 'move', who: 'Lisa Okafor', what: 'moved to Offer', when: '1h ago', icon: 'trend' },
    { kind: 'reject', who: 'Tom Brennan', what: 'rejected (auto)', when: '3h ago', icon: 'x' },
  ];
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 700 }}>Recent activity</h3>
        <Pill variant="primary">Live</Pill>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 12 }}>
            <div className="wh-act-dot"><Icon name={it.icon} size={11} /></div>
            <div style={{ flex: 1, lineHeight: 1.45 }}>
              <b style={{ color: 'var(--wh-fg)', fontWeight: 700 }}>{it.who}</b>
              <span style={{ color: 'var(--wh-muted-fg)' }}> {it.what}</span>
            </div>
            <span style={{ fontSize: 10.5, color: 'var(--wh-muted-fg)', whiteSpace: 'nowrap' }}>{it.when}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function WHDashboard({ onOpenPipeline, onOpenBulk, onOpenJD }) {
  return (
    <div className="wh-page">
      <div className="wh-hero">
        <div className="wh-hero-blob" />
        <div style={{ position: 'relative' }}>
          <span className="wh-eyebrow"><Icon name="sparkles" size={11} />Good morning, Jordan</span>
          <h1 className="wh-hero-h1">Hire smarter today.</h1>
          <p className="wh-hero-sub">12 new candidates applied overnight. AI ranked them — review the top 3 in under a minute.</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="wh-cta-primary" onClick={onOpenBulk}>
              <Icon name="fileSearch" size={15} />Screen 12 new CVs
              <Icon name="arrowR" size={14} />
            </button>
            <button className="wh-cta-secondary" onClick={onOpenJD}>
              <Icon name="wand" size={15} />Draft a new JD
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <WHStatTile label="Open roles" value="14" delta="+3" icon="brief" accent />
        <WHStatTile label="In pipeline" value="186" delta="+24" icon="users" accent />
        <WHStatTile label="Avg time to hire" value="18d" delta="-4d" icon="zap" accent />
        <WHStatTile label="Offers out" value="7" icon="checkc" accent />
      </div>

      <div className="wh-2col">
        <div>
          <div className="wh-section-head">
            <h2>Active roles</h2>
            <button className="wh-link-btn">View all <Icon name="arrowR" size={11} /></button>
          </div>
          <Card style={{ padding: 4 }}>
            <ActiveRoleRow title="Senior Frontend Engineer" dept="Engineering · Remote" candidates={42} hot daysOpen={9} owner="JM" ownerIdx={0} />
            <ActiveRoleRow title="Product Designer" dept="Design · NYC" candidates={28} daysOpen={14} owner="MA" ownerIdx={1} />
            <ActiveRoleRow title="DevRel Engineer" dept="Marketing · Remote" candidates={31} daysOpen={6} owner="JM" ownerIdx={0} />
            <ActiveRoleRow title="Engineering Manager · Backend" dept="Engineering · SF" candidates={19} daysOpen={22} hot owner="ML" ownerIdx={2} />
          </Card>

          <div className="wh-section-head" style={{ marginTop: 20 }}>
            <h2>Top scored this week</h2>
            <button className="wh-link-btn" onClick={onOpenPipeline}>Open pipeline <Icon name="arrowR" size={11} /></button>
          </div>
          <Card style={{ padding: 14 }}>
            {[
              { name: 'Lisa Okafor', role: 'Senior FE Engineer', score: 93, idx: 5 },
              { name: 'Alex Kim', role: 'Senior FE Engineer', score: 91, idx: 0 },
              { name: 'David Hartono', role: 'Senior FE Engineer', score: 89, idx: 7 },
              { name: 'Priya Mehta', role: 'Senior FE Engineer', score: 87, idx: 1 },
            ].map((c, i) => (
              <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', borderBottom: i < 3 ? '1px solid var(--wh-border)' : 0 }}>
                <Avatar initials={c.name.split(' ').map(n => n[0]).join('')} idx={c.idx} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{c.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--wh-muted-fg)' }}>{c.role}</div>
                </div>
                <ScoreBar score={c.score} w={90} />
                <button className="wh-mini-btn"><Icon name="message" size={12} />Outreach</button>
              </div>
            ))}
          </Card>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <NewActivityCard />
          <Card style={{ padding: 14, background: 'linear-gradient(135deg,rgb(29 78 216 / 0.05),var(--wh-card) 60%)', borderColor: 'rgb(29 78 216 / 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div className="wh-icon-box" style={{ background: 'rgb(29 78 216 / 0.12)', color: '#1D4ED8' }}><Icon name="brain" size={14} /></div>
              <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#1D4ED8' }}>AI suggestion</span>
            </div>
            <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--wh-fg)' }}>
              <b>3 candidates in Screening</b> haven't moved in 4+ days. Want to nudge them with an interview slot?
            </p>
            <button className="wh-link-btn" style={{ marginTop: 8 }}>Open scheduling <Icon name="arrowR" size={11} /></button>
          </Card>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { WHDashboard });
