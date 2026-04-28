// Shared chrome primitives used across all 3 directions.
// Components export to window so other Babel scripts can use them.

const Icon = ({ name, size = 20, className = '', style = {} }) => (
  <span
    className={`material-symbols-outlined ${className}`}
    style={{ fontSize: size, ...style }}
    aria-hidden="true"
  >
    {name}
  </span>
);

// Brand mark (panda head, simplified inline SVG so we don't depend on the file path)
const BrandMark = ({ size = 22, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 38 35" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9.6 5.7c-2.7-1.4-5.4-1.2-6.6.5-1.2 1.6-.5 4.6 1.7 6.7-1.5 2.5-2.4 5.5-2.4 8.7 0 7.7 6.6 13.9 16.7 13.9s16.7-6.2 16.7-13.9c0-3.2-.9-6.2-2.4-8.7 2.2-2.1 2.9-5.1 1.7-6.7-1.2-1.7-3.9-1.9-6.6-.5-1.2.6-2.5 1.5-3.7 2.7-1.7-.6-3.6-1-5.7-1s-4 .4-5.7 1c-1.2-1.2-2.5-2.1-3.7-2.7Z"
      fill={color}/>
    <ellipse cx="14" cy="22" rx="2.2" ry="3" fill="white"/>
    <ellipse cx="25" cy="22" rx="2.2" ry="3" fill="white"/>
    <circle cx="14" cy="22.5" r="1.1" fill="#181D1E"/>
    <circle cx="25" cy="22.5" r="1.1" fill="#181D1E"/>
  </svg>
);

// ── Kata-style dark topbar ──────────────────────────────────────
const Topbar = ({ search = 'Search projects, tasks, decisions…', activeNav = 'Projects' }) => (
  <div className="topbar">
    <div className="brand">
      <BrandMark size={22} color="white" />
      <span className="brand-text">Panda Manager</span>
    </div>
    <div className="row" style={{ gap: 2 }}>
      {['Projects', 'Daily prep', 'Knowledge', 'Outputs'].map(n => (
        <span key={n} className={`nav-item ${n === activeNav ? 'active' : ''}`}>{n}</span>
      ))}
    </div>
    <div className="spacer" />
    <div className="search">
      <Icon name="search" size={16} />
      <span>{search}</span>
      <span style={{ marginLeft: 'auto', opacity: 0.5, fontSize: 11 }}>⌘K</span>
    </div>
    <span className="icon-btn"><Icon name="notifications" size={18} /></span>
    <span className="icon-btn"><Icon name="help_outline" size={18} /></span>
    <span className="avatar">JM</span>
  </div>
);

// ── Light slim sidebar ──────────────────────────────────────────
const projectFixtures = [
  { id: 1, name: 'Acme Corp',          health: 'green',  date: 'Go-live Jun 14' },
  { id: 2, name: 'Globex Industries',  health: 'yellow', date: 'Go-live May 02' },
  { id: 3, name: 'Initech',            health: 'red',    date: 'Go-live Apr 28' },
  { id: 4, name: 'Soylent',            health: 'green',  date: 'Go-live Aug 30' },
  { id: 5, name: 'Umbrella Logistics', health: 'green',  date: 'Go-live Sep 12' },
  { id: 6, name: 'Hooli',              health: 'yellow', date: 'Go-live Jul 21' },
  { id: 7, name: 'Cyberdyne',          health: 'green',  date: 'Go-live Oct 04' },
];

const Sidebar = ({ activeProjectId = null, activeNav = 'Dashboard' }) => (
  <aside className="k-sidebar">
    <div style={{ padding: '12px 8px 4px' }}>
      <a className={`nav-link ${activeNav === 'Dashboard' ? 'active' : ''}`}>
        <Icon name="dashboard" size={18} /> Dashboard
      </a>
      <a className={`nav-link ${activeNav === 'Daily prep' ? 'active' : ''}`}>
        <Icon name="event_note" size={18} /> Daily prep
      </a>
    </div>

    <div className="section-label">Projects</div>
    <div className="col" style={{ flex: 1, overflow: 'hidden' }}>
      {projectFixtures.map(p => (
        <a key={p.id}
           className="nav-link"
           style={{
             height: 'auto', padding: '6px 12px',
             ...(p.id === activeProjectId ? { background: 'var(--color-surface-primary-subtle)', color: 'var(--color-on-primary-subtle)' } : {})
           }}>
          <span className={`rag-dot ${p.health}`} style={{ marginTop: 4 }} />
          <div className="col" style={{ minWidth: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.25 }}>{p.name}</span>
            <span style={{ fontSize: 11, color: 'var(--color-on-container-as-tertiary)', lineHeight: 1.25 }}>{p.date}</span>
          </div>
        </a>
      ))}
    </div>

    <div style={{ borderTop: '1px solid var(--color-stroke-subtle)', padding: '6px 0 10px' }}>
      <a className="nav-link"><Icon name="menu_book" size={18} /> Knowledge base</a>
      <a className="nav-link"><Icon name="folder_open" size={18} /> Outputs</a>
      <a className="nav-link"><Icon name="schedule" size={18} /> Time tracking</a>
      <a className="nav-link"><Icon name="settings" size={18} /> Settings</a>
    </div>
  </aside>
);

// ── Tiny components ─────────────────────────────────────────────
const Sparkline = ({ data, color = 'gray', height = 18 }) => {
  const max = Math.max(...data, 1);
  return (
    <span className={`spark ${color}`} style={{ height }}>
      {data.map((v, i) => {
        const h = Math.max((v / max) * height, v > 0 ? 3 : 2);
        return <i key={i} style={{ height: h }} />;
      })}
    </span>
  );
};

const Avatar = ({ name, size = 22, color }) => {
  const initials = name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
  const colors = ['#0041F5','#9A53E0','#17723F','#964900','#384144','#7B41B3','#0030CF'];
  const bg = color || colors[(name.charCodeAt(0) + name.length) % colors.length];
  return (
    <span style={{
      width: size, height: size, borderRadius: 9999, background: bg,
      color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter', fontWeight: 600, fontSize: Math.round(size * 0.42), letterSpacing: 0,
      flex: 'none'
    }}>{initials}</span>
  );
};

const AvatarStack = ({ names, size = 22 }) => (
  <span style={{ display: 'inline-flex' }}>
    {names.map((n, i) => (
      <span key={i} style={{
        marginLeft: i === 0 ? 0 : -6,
        boxShadow: '0 0 0 2px var(--color-surface-container)',
        borderRadius: 9999, display: 'inline-flex',
      }}>
        <Avatar name={n} size={size} />
      </span>
    ))}
  </span>
);

const KBadge = ({ tone = 'neutral', children, dot = false }) => (
  <span className={`badge ${tone}`}>
    {dot && <span className={`rag-dot ${tone === 'success' ? 'green' : tone === 'warning' ? 'yellow' : tone === 'error' ? 'red' : 'gray'}`} style={{ width: 6, height: 6 }} />}
    {children}
  </span>
);

Object.assign(window, { Icon, BrandMark, Topbar, Sidebar, Sparkline, Avatar, AvatarStack, KBadge, projectFixtures });
