/* global React, Icon, Button, Pill */

function TopNav({ active, onNavigate }) {
  const tabs = [
    { id: 'dashboard', icon: 'home', label: 'Home' },
    { id: 'editor', icon: 'file', label: 'Editor' },
    { id: 'ai', icon: 'sparkles', label: 'AI Tools', pro: true },
    { id: 'activity', icon: 'bar3', label: 'Activity', pro: true },
    { id: 'portfolio', icon: 'globe', label: 'Portfolio' },
  ];
  return (
    <div className="wr-topnav">
      <a className="wr-brand" onClick={() => onNavigate('dashboard')}>WiseResume</a>
      <div style={{ display: 'flex', gap: 2 }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => onNavigate(t.id)}
            className={`wr-tab ${active === t.id ? 'is-active' : ''}`}
          >
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              <Icon name={t.icon} size={15} />
              {t.pro && active !== t.id && (
                <span style={{
                  position: 'absolute', top: -3, right: -3, width: 9, height: 9, borderRadius: '50%',
                  background: '#f59e0b', border: '1.5px solid var(--wr-bg, #fff)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name="lock" size={5} color="#fff" strokeWidth={3} />
                </span>
              )}
            </span>
            {t.label}
          </button>
        ))}
      </div>
      <div className="wr-nav-right">
        <div className="wr-credits">
          <Icon name="zap" size={11} />
          4 / 50
        </div>
        <div className="wr-search">
          <Icon name="search" size={13} />
          <span style={{ marginRight: 6 }}>Search…</span>
          <kbd className="wr-kbd">⌘K</kbd>
        </div>
        <button className="wr-icon-btn"><Icon name="bell" size={16} /></button>
        <div className="wr-avatar">AK</div>
      </div>
    </div>
  );
}

Object.assign(window, { TopNav });
