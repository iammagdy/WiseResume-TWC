/* global React, Icon, Card, Pill, Avatar, ScoreBar */

const BULK_CANDIDATES = [
  { initials: 'AK', name: 'Alex Kim', score: 91, summary: '6y · React, GraphQL, AWS · ex-Linear, Stripe', match: ['React (5y)', 'GraphQL (4y)', 'AWS', 'Remote-friendly'], miss: [] },
  { initials: 'PM', name: 'Priya Mehta', score: 87, summary: '5y · React, TypeScript, Node · ex-Airbnb', match: ['React (5y)', 'TypeScript', 'Senior'], miss: ['GraphQL'] },
  { initials: 'SC', name: 'Sarah Chen', score: 83, summary: '7y · React, Node · ex-Stripe', match: ['React (7y)', 'Mentoring'], miss: ['GraphQL', 'AWS'] },
  { initials: 'TB', name: 'Tom Brennan', score: 74, summary: '4y · Vue, CSS, design systems', match: ['Mid+', 'CSS'], miss: ['React', 'GraphQL'] },
  { initials: 'JW', name: 'James Wu', score: 66, summary: '3y · React, JS · contractor', match: ['React (3y)'], miss: ['Senior', 'GraphQL', 'AWS'] },
];

function MatchPill({ children, kind }) {
  const colors = kind === 'match'
    ? { bg: 'rgb(34 197 94 / 0.1)', fg: '#16a34a' }
    : { bg: 'rgb(239 68 68 / 0.1)', fg: '#dc2626' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '2px 8px', borderRadius: 999, fontSize: 10.5, fontWeight: 600,
      background: colors.bg, color: colors.fg, whiteSpace: 'nowrap',
    }}>
      <Icon name={kind === 'match' ? 'check' : 'x'} size={9} strokeWidth={3} />
      {children}
    </span>
  );
}

function CandidateScoredRow({ c, idx }) {
  return (
    <div className="wh-bulk-row">
      <div className="wh-bulk-rank">{idx + 1}</div>
      <Avatar initials={c.initials} idx={idx} size={36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 700 }}>{c.name}</h3>
          {idx === 0 && <Pill variant="success" icon="star">Top match</Pill>}
        </div>
        <div style={{ fontSize: 12, color: 'var(--wh-muted-fg)', marginBottom: 5 }}>{c.summary}</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {c.match.map(m => <MatchPill key={m} kind="match">{m}</MatchPill>)}
          {c.miss.map(m => <MatchPill key={m} kind="miss">{m}</MatchPill>)}
        </div>
      </div>
      <ScoreBar score={c.score} w={120} />
      <div style={{ display: 'flex', gap: 4 }}>
        <button className="wh-mini-btn"><Icon name="brief" size={12} />Pipeline</button>
        <button className="wh-icon-btn-sm"><Icon name="message" size={13} /></button>
        <button className="wh-icon-btn-sm"><Icon name="more" size={13} /></button>
      </div>
    </div>
  );
}

function BulkScreen() {
  return (
    <div className="wh-page">
      <div className="wh-page-head">
        <div>
          <div className="wh-eyebrow">Senior Frontend Engineer</div>
          <h1 className="wh-page-title">Bulk Screen</h1>
          <div style={{ fontSize: 12.5, color: 'var(--wh-muted-fg)', marginTop: 4 }}>
            Upload 100s of CVs · AI ranks against role requirements · review only the top 10
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="wh-mini-btn" style={{ whiteSpace: 'nowrap' }}><Icon name="download" size={13} />Export shortlist</button>
          <button className="wh-mini-btn wh-mini-btn-primary" style={{ whiteSpace: 'nowrap' }}><Icon name="users" size={13} />Move to pipeline</button>
        </div>
      </div>

      {/* Drop zone */}
      <Card style={{ padding: 16, marginBottom: 18, background: 'rgb(29 78 216 / 0.04)', borderColor: 'rgb(29 78 216 / 0.22)', borderStyle: 'dashed' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="wh-icon-box-lg"><Icon name="fileSearch" size={20} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>Drop CVs here, or click to upload</div>
            <div style={{ fontSize: 12, color: 'var(--wh-muted-fg)' }}>PDF, DOCX, TXT · up to 200 files · screened against current role</div>
          </div>
          <Pill variant="success" icon="checkc">Done · 5 / 5</Pill>
          <button className="wh-cta-primary" style={{ height: 38, padding: '0 16px', fontSize: 13 }}>
            <Icon name="brain" size={14} />Re-screen
          </button>
        </div>
      </Card>

      {/* Filters */}
      <div className="wh-toolbar">
        <div style={{ fontSize: 11.5, color: 'var(--wh-muted-fg)', fontWeight: 600, marginRight: 4 }}>Filter:</div>
        <button className="wh-chip wh-chip-active"><Icon name="brain" size={12} />Score ≥ 80</button>
        <button className="wh-chip">5+ years</button>
        <button className="wh-chip">Remote</button>
        <button className="wh-chip">North America</button>
        <button className="wh-chip wh-chip-add"><Icon name="plus" size={11} />Add filter</button>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--wh-muted-fg)' }}>
          <Icon name="shield" size={13} />
          <span>Anonymized view</span>
          <div style={{ position: 'relative', width: 32, height: 18, background: '#1D4ED8', borderRadius: 999 }}>
            <div style={{ position: 'absolute', right: 2, top: 2, width: 14, height: 14, background: '#fff', borderRadius: '50%' }} />
          </div>
        </div>
      </div>

      {/* Ranked results */}
      <div className="wh-section-head" style={{ marginTop: 18 }}>
        <h2>Ranked results · 5 candidates</h2>
        <button className="wh-link-btn">Sort: AI Score <Icon name="chevronD" size={11} /></button>
      </div>
      <Card style={{ padding: 4 }}>
        {BULK_CANDIDATES.map((c, i) => <CandidateScoredRow key={c.name} c={c} idx={i} />)}
      </Card>
    </div>
  );
}

Object.assign(window, { BulkScreen });
