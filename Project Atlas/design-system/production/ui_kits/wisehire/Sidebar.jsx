/* global React, Icon */

const WH_NAV = [
  { id: 'dashboard', icon: 'home', label: 'Dashboard' },
  { id: 'jd', icon: 'file', label: 'JD Writer' },
  { id: 'briefs', icon: 'sparkles', label: 'Brief Generator' },
  { id: 'roles', icon: 'brief', label: 'Roles' },
  { id: 'pipeline', icon: 'bar3', label: 'Pipeline' },
  { id: 'bulk', icon: 'fileSearch', label: 'Bulk Screen' },
  { id: 'scorecards', icon: 'clipboard', label: 'SC Templates' },
  { id: 'mask', icon: 'shield', label: 'CV Masking' },
  { id: 'talent', icon: 'users', label: 'Talent Pool' },
  { id: 'clients', icon: 'building', label: 'Clients' },
  { id: 'analytics', icon: 'trend', label: 'Analytics' },
];

function WHSidebar({ active, onNavigate }) {
  return (
    <aside className="wh-sidebar">
      <div className="wh-brand-block">
        <a className="wh-brand" onClick={() => onNavigate('dashboard')}>WiseHire</a>
        <div className="wh-brand-sub">by thewise.cloud</div>
        <div className="wh-trial">
          <Icon name="zap" size={11} />
          <span>5 days left in trial</span>
        </div>
      </div>

      <nav className="wh-nav">
        {WH_NAV.map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`wh-nav-item ${active === item.id ? 'is-active' : ''}`}
          >
            <Icon name={item.icon} size={15} />
            <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
            {active === item.id && <Icon name="chevronR" size={11} />}
          </button>
        ))}
      </nav>

      <div className="wh-sidebar-foot">
        <button className="wh-nav-item">
          <Icon name="moon" size={15} />
          <span style={{ flex: 1, textAlign: 'left' }}>Dark mode</span>
        </button>
        <button className="wh-nav-item">
          <Icon name="settings" size={15} />
          <span style={{ flex: 1, textAlign: 'left' }}>Settings</span>
        </button>
        <div className="wh-user-row">
          <div className="wh-user-avatar">JM</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--wh-fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Jordan Miles</div>
            <div style={{ fontSize: 10, color: 'var(--wh-muted-fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>jordan@acme.co</div>
          </div>
          <button className="wh-icon-btn-sm"><Icon name="logout" size={13} /></button>
        </div>
      </div>
    </aside>
  );
}

Object.assign(window, { WHSidebar });
