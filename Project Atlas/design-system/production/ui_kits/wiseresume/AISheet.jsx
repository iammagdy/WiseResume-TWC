/* global React, Icon, Button, Pill */

function AISheet({ open, onClose }) {
  const [phase, setPhase] = React.useState('idle');
  const [draft, setDraft] = React.useState(null);

  React.useEffect(() => {
    if (!open) { setPhase('idle'); setDraft(null); }
  }, [open]);

  function run() {
    setPhase('thinking');
    setTimeout(() => {
      setDraft('Shipped a real-time analytics dashboard adopted by 40+ teams, cutting reporting time by 62% at launch.');
      setPhase('done');
    }, 1100);
  }

  if (!open) return null;
  return (
    <>
      <div className="wr-scrim" onClick={onClose} />
      <div className="wr-ai-sheet">
        <div className="wr-ai-sheet-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="wr-ai-avatar">
              <Icon name="sparkles" size={14} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Boost this bullet</div>
              <div style={{ fontSize: 11.5, color: 'var(--wr-muted-fg)' }}>Wise AI · Senior Engineer at Acme</div>
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Pill variant="primary" icon="zap">4 / 50</Pill>
            <button className="wr-icon-btn" onClick={onClose}><Icon name="x" size={16} /></button>
          </div>
        </div>

        <div className="wr-ai-sheet-body">
          <div style={{ fontSize: 11, color: 'var(--wr-muted-fg)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Your bullet</div>
          <div className="wr-ai-from">Worked on a new dashboard for the team and helped with launch.</div>

          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            {['Add metrics', 'Use stronger verbs', 'Match this JD', 'Make concise'].map(t => (
              <button key={t} className="wr-prompt-chip">
                <Icon name="sparkles" size={11} />{t}
              </button>
            ))}
          </div>

          {phase === 'idle' && (
            <Button variant="primary" icon="wand" style={{ width: '100%', marginTop: 14 }} onClick={run}>
              Boost with Wise AI
            </Button>
          )}

          {phase === 'thinking' && (
            <div className="wr-ai-thinking">
              <span className="wr-dot" /><span className="wr-dot" /><span className="wr-dot" />
              <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--wr-muted-fg)' }}>Wise AI is rewriting…</span>
            </div>
          )}

          {phase === 'done' && (
            <>
              <div style={{ fontSize: 11, color: 'var(--wr-muted-fg)', margin: '14px 0 6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Wise AI suggests</div>
              <div className="wr-ai-to">{draft}</div>
              <div className="wr-ai-meta">
                <Pill variant="success" icon="check">Quantified · 40+ · 62%</Pill>
                <Pill variant="info">Strong verb · "Shipped"</Pill>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <Button variant="primary" icon="check" style={{ flex: 1 }} onClick={onClose}>Apply</Button>
                <Button variant="outline" icon="refresh" onClick={run}>Try again</Button>
                <Button variant="ghost" icon="copy">Copy</Button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

Object.assign(window, { AISheet });
