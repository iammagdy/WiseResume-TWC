/* global React, Icon, Card, Pill, Avatar, ScoreBar */

const CANDIDATES_INIT = [
  { id: 1, name: 'Alex Kim', initials: 'AK', role: 'Senior FE', score: 91, col: 0, applied: '2h ago', tags: ['React', 'GraphQL'] },
  { id: 2, name: 'Priya Mehta', initials: 'PM', role: 'Senior FE', score: 87, col: 0, applied: '4h ago', tags: ['React', 'TypeScript'] },
  { id: 3, name: 'Tom Brennan', initials: 'TB', role: 'Mid FE', score: 74, col: 0, applied: '1d ago', tags: ['Vue', 'CSS'] },
  { id: 4, name: 'Sarah Chen', initials: 'SC', role: 'Senior FE', score: 87, col: 1, applied: '3d ago', tags: ['React', 'Node'] },
  { id: 5, name: 'James Wu', initials: 'JW', role: 'Senior FE', score: 80, col: 1, applied: '3d ago', tags: ['React'] },
  { id: 6, name: 'Lisa Okafor', initials: 'LO', role: 'Senior FE', score: 93, col: 2, applied: '1w ago', tags: ['React', 'AWS'] },
  { id: 7, name: 'Marcus Hall', initials: 'MH', role: 'Senior FE', score: 84, col: 2, applied: '1w ago', tags: ['React'] },
  { id: 8, name: 'David Hartono', initials: 'DH', role: 'Senior FE', score: 89, col: 3, applied: '2w ago', tags: ['React', 'GraphQL'] },
];

const COLUMNS = [
  { id: 0, label: 'Applied',     color: '#94a3b8', count: 3 },
  { id: 1, label: 'Screening',   color: '#60A5FA', count: 2 },
  { id: 2, label: 'Interview',   color: '#A78BFA', count: 2 },
  { id: 3, label: 'Offer',       color: '#34D399', count: 1 },
];

function PipelineHeader() {
  return (
    <div className="wh-page-head">
      <div>
        <div className="wh-eyebrow">Role · Senior Frontend Engineer</div>
        <h1 className="wh-page-title">Pipeline</h1>
        <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: 12, color: 'var(--wh-muted-fg)' }}>
          <span><b style={{ color: 'var(--wh-fg)' }}>8</b> candidates</span>
          <span><b style={{ color: 'var(--wh-fg)' }}>4</b> active stages</span>
          <span><b style={{ color: 'var(--wh-fg)' }}>2</b> awaiting feedback</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className="wh-mini-btn"><Icon name="users" size={13} />Share with team</button>
        <button className="wh-mini-btn wh-mini-btn-primary"><Icon name="plus" size={13} />Add candidate</button>
      </div>
    </div>
  );
}

function CandidateCard({ c, idx }) {
  return (
    <div className="wh-cand-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Avatar initials={c.initials} idx={idx} size={28} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--wh-fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
          <div style={{ fontSize: 10.5, color: 'var(--wh-muted-fg)' }}>{c.applied}</div>
        </div>
        <button className="wh-icon-btn-sm"><Icon name="more" size={12} /></button>
      </div>
      <div style={{ marginTop: 8 }}>
        <ScoreBar score={c.score} w={140} />
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
        {c.tags.map(t => <span key={t} className="wh-tag">{t}</span>)}
      </div>
    </div>
  );
}

function Pipeline() {
  return (
    <div className="wh-page">
      <PipelineHeader />

      <div className="wh-toolbar">
        <div className="wh-search">
          <Icon name="search" size={13} />
          <input placeholder="Search candidates…" />
        </div>
        <button className="wh-chip"><Icon name="brain" size={12} />AI score ≥ 80</button>
        <button className="wh-chip">React</button>
        <button className="wh-chip">GraphQL</button>
        <button className="wh-chip wh-chip-add"><Icon name="plus" size={11} />Add filter</button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button className="wh-mini-btn"><Icon name="shield" size={13} />Anonymize</button>
          <button className="wh-mini-btn"><Icon name="download" size={13} />Export</button>
        </div>
      </div>

      <div className="wh-kanban">
        {COLUMNS.map(col => {
          const cards = CANDIDATES_INIT.filter(c => c.col === col.id);
          return (
            <div className="wh-col" key={col.id}>
              <div className="wh-col-head">
                <span className="wh-col-dot" style={{ background: col.color }} />
                <span className="wh-col-label">{col.label}</span>
                <span className="wh-col-count" style={{ color: col.color, background: `${col.color}1f` }}>{cards.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {cards.map((c, i) => <CandidateCard key={c.id} c={c} idx={c.id} />)}
                <button className="wh-add-card"><Icon name="plus" size={12} />Add</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { Pipeline });
