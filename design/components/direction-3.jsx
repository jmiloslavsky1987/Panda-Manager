// ─────────────────────────────────────────────────────────────
// DIRECTION 3 — "Command Workspace"
// Inspired direction. Three-rail layout: command rail (projects),
// main canvas, right context rail (AI assistant + activity).
// Heavy mono numerals, opinionated AI-forward UX.
// Dark + accent treatment available via Tweaks.
// ─────────────────────────────────────────────────────────────

const D3CommandRail = ({ activeId = 2 }) => (
  <aside style={{
    width: 240, background: 'var(--color-gray-950)', color: 'var(--color-gray-200)',
    display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--color-gray-800)'
  }}>
    <div className="row" style={{ padding: '14px 16px', gap: 8, borderBottom: '1px solid var(--color-gray-800)' }}>
      <BrandMark size={22} color="white" />
      <span style={{ fontWeight: 600, fontSize: 13, color: 'white' }}>Panda Manager</span>
      <span style={{ marginLeft: 'auto', fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.65)', fontFamily: 'JetBrains Mono' }}>v2.4</span>
    </div>

    <div style={{ padding: '10px 12px 6px' }}>
      <div className="row" style={{
        height: 28, padding: '0 8px', gap: 8,
        background: 'rgba(255,255,255,0.05)', borderRadius: 6,
        border: '1px solid rgba(255,255,255,0.05)',
      }}>
        <Icon name="search" size={14} style={{ color: 'rgba(255,255,255,0.4)' }}/>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', flex: 1 }}>Jump to…</span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'JetBrains Mono' }}>⌘K</span>
      </div>
    </div>

    <div style={{ padding: '4px 8px' }}>
      {[
        { ic: 'view_quilt', t: 'Portfolio' },
        { ic: 'today', t: 'Today' },
        { ic: 'auto_awesome', t: 'AI Briefing', count: 3 },
      ].map(n => (
        <div key={n.t} className="row" style={{
          gap: 10, padding: '7px 10px', borderRadius: 6, marginBottom: 1, fontSize: 13,
          color: 'rgba(255,255,255,0.7)',
        }}>
          <Icon name={n.ic} size={16} />
          <span style={{ flex: 1 }}>{n.t}</span>
          {n.count && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 9999, background: 'var(--color-purple-500)', color: 'white', fontWeight: 600 }}>{n.count}</span>}
        </div>
      ))}
    </div>

    <div style={{ padding: '14px 16px 6px' }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>Engagements</span>
        <Icon name="add" size={14} style={{ color: 'rgba(255,255,255,0.4)' }}/>
      </div>
    </div>

    <div style={{ flex: 1, overflow: 'auto', padding: '0 8px' }}>
      {projectFixtures.map(p => {
        const active = p.id === activeId;
        return (
          <div key={p.id} className="row" style={{
            gap: 10, padding: '8px 10px', borderRadius: 6, marginBottom: 2, alignItems: 'flex-start',
            background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
            borderLeft: active ? '2px solid var(--color-blue-400)' : '2px solid transparent',
            color: active ? 'white' : 'rgba(255,255,255,0.7)',
          }}>
            <span className={`rag-dot ${p.health}`} style={{ marginTop: 5, flex: 'none' }}/>
            <div className="col" style={{ minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'JetBrains Mono', lineHeight: 1.3 }}>{p.date}</span>
            </div>
          </div>
        );
      })}
    </div>

    <div style={{ borderTop: '1px solid var(--color-gray-800)', padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
      <Avatar name="Jonathan Miloslavsky" size={28} color="#7B41B3" />
      <div className="col" style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'white' }}>J. Miloslavsky</span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>BigPanda PS</span>
      </div>
      <Icon name="settings" size={16} style={{ color: 'rgba(255,255,255,0.4)' }}/>
    </div>
  </aside>
);

const D3AssistantRail = () => (
  <aside style={{ width: 320, background: 'var(--color-surface-container)', borderLeft: '1px solid var(--color-stroke-subtle)', display: 'flex', flexDirection: 'column' }}>
    <div className="row" style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-stroke-subtle)', gap: 8 }}>
      <span style={{ width: 24, height: 24, borderRadius: 9999, background: 'var(--color-surface-ai-subtle)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="auto_awesome" size={14} style={{ color: 'var(--color-icon-ai)' }}/></span>
      <span style={{ fontWeight: 500, fontSize: 13 }}>Assistant</span>
      <span className="badge ai" style={{ marginLeft: 'auto' }}>scoped: Globex</span>
    </div>

    <div style={{ flex: 1, overflow: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* AI insight */}
      <div style={{ padding: 14, background: 'var(--color-surface-ai-subtle)', borderRadius: 10, border: '1px solid var(--color-stroke-ai)' }}>
        <div className="row" style={{ gap: 6, marginBottom: 8 }}>
          <Icon name="warning" size={14} style={{ color: 'var(--color-icon-warning)' }}/>
          <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-on-ai-subtle)' }}>Risk detected</span>
        </div>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--color-on-container)' }}>
          Source B mapping has been blocked for <b className="mono">9 days</b>. Velocity dropped <b className="mono">38%</b>. The cutover dry-run is unlikely to land by <b className="mono">May 01</b> without intervention.
        </p>
        <div className="row" style={{ gap: 6, marginTop: 12 }}>
          <button className="btn btn-primary" style={{ height: 28, fontSize: 12, background: 'var(--color-purple-500)' }}>Create escalation</button>
          <button className="btn btn-ghost" style={{ height: 28, fontSize: 12 }}>Dismiss</button>
        </div>
      </div>

      {/* Suggestion */}
      <div className="card" style={{ padding: 14 }}>
        <div className="row" style={{ gap: 6, marginBottom: 8 }}>
          <Icon name="lightbulb" size={14} style={{ color: 'var(--color-icon-ai)' }}/>
          <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-on-container-as-tertiary)' }}>Suggested action</span>
        </div>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>Reschedule the cutover window to <b className="mono">Sun May 12, 02:00 UTC</b>. Lower-risk slot per customer freeze calendar.</p>
        <div className="row" style={{ gap: 6, marginTop: 10 }}>
          <button className="btn btn-secondary" style={{ height: 26, fontSize: 12 }}>Accept</button>
          <button className="btn btn-ghost" style={{ height: 26, fontSize: 12 }}>Edit</button>
        </div>
      </div>

      {/* Quick prompts */}
      <div>
        <span className="label-sm-upper" style={{ fontSize: 10, color: 'var(--color-on-container-as-tertiary)' }}>Try asking</span>
        <div className="col" style={{ gap: 6, marginTop: 8 }}>
          {[
            'Draft this week\'s status report',
            'Who hasn\'t logged time since Friday?',
            'Compare velocity to last sprint',
            'Surface decisions awaiting signoff',
          ].map(q => (
            <button key={q} className="row" style={{
              padding: '8px 10px', borderRadius: 6, gap: 8,
              background: 'var(--color-surface-field)', border: '1px solid var(--color-stroke-subtle)',
              fontSize: 12, color: 'var(--color-on-container-as-secondary)', textAlign: 'left', cursor: 'pointer',
            }}>
              <Icon name="north_east" size={12} style={{ color: 'var(--color-icon-tertiary)' }}/>
              <span style={{ flex: 1 }}>{q}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Activity */}
      <div>
        <span className="label-sm-upper" style={{ fontSize: 10, color: 'var(--color-on-container-as-tertiary)' }}>Recent activity</span>
        <div className="col" style={{ gap: 12, marginTop: 10 }}>
          {[
            { who:'AI',        what:'flagged Source B as at-risk',      when:'14m', ai: true },
            { who:'A. Tan',    what:'logged a status update',           when:'2h' },
            { who:'M. Nguyen', what:'closed risk RSK-204',              when:'5h' },
            { who:'D. Park',   what:'added milestone Phase 2 kickoff',  when:'1d' },
          ].map((a,i) => (
            <div key={i} className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
              {a.ai
                ? <span style={{ width: 22, height: 22, borderRadius: 9999, background: 'var(--color-surface-ai-subtle)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Icon name="auto_awesome" size={12} style={{ color: 'var(--color-icon-ai)' }}/></span>
                : <Avatar name={a.who} size={22}/>}
              <div className="col" style={{ flex: 1 }}>
                <span style={{ fontSize: 12, lineHeight: 1.45 }}><b style={{ fontWeight: 500 }}>{a.who}</b> <span style={{ color: 'var(--color-on-container-as-secondary)' }}>{a.what}</span></span>
                <span className="mono" style={{ fontSize: 10, color: 'var(--color-on-container-as-tertiary)' }}>{a.when} ago</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Composer */}
    <div style={{ padding: 12, borderTop: '1px solid var(--color-stroke-subtle)' }}>
      <div className="row" style={{
        padding: '8px 10px', gap: 8, borderRadius: 8,
        background: 'var(--color-surface-field)', border: '1px solid var(--color-stroke-subtle)',
      }}>
        <Icon name="auto_awesome" size={14} style={{ color: 'var(--color-icon-ai)' }}/>
        <span style={{ fontSize: 12, color: 'var(--color-on-container-as-placeholder)', flex: 1 }}>Ask anything about Globex…</span>
        <Icon name="mic" size={14} style={{ color: 'var(--color-icon-tertiary)' }}/>
        <Icon name="arrow_upward" size={14} style={{ color: 'var(--color-icon-secondary)' }}/>
      </div>
    </div>
  </aside>
);

// ── Portfolio Dashboard — Direction 3 ──────────────────────────
const D3PortfolioDashboard = () => (
  <div className="artboard-body" style={{ background: 'var(--color-surface-canvas)', height: '100%', display: 'flex' }}>
    <D3CommandRail activeId={null} />
    <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* Page-bar */}
      <div className="row" style={{ height: 44, borderBottom: '1px solid var(--color-stroke-subtle)', padding: '0 24px', gap: 12, background: 'var(--color-surface-container)' }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>Portfolio</span>
        <span style={{ width: 1, height: 16, background: 'var(--color-stroke-subtle)' }}/>
        <span className="mono" style={{ fontSize: 11, color: 'var(--color-on-container-as-tertiary)' }}>Mon · Apr 28 · Wk 18</span>
        <span style={{ flex: 1 }}/>
        <span className="chip" style={{ background: 'transparent' }}><Icon name="filter_list" size={14}/>Filters · 0</span>
        <span className="chip" style={{ background: 'transparent' }}><Icon name="sort" size={14}/>Sort: Updated</span>
        <button className="btn btn-secondary" style={{ height: 28, fontSize: 12 }}><Icon name="auto_awesome" size={14} style={{ color: 'var(--color-icon-ai)' }}/>Brief me</button>
        <button className="btn btn-primary" style={{ height: 28, fontSize: 12 }}><Icon name="add" size={14}/>New project</button>
      </div>

      {/* Hero stat band */}
      <div style={{ padding: '32px 32px 28px', background: 'var(--color-surface-container)', borderBottom: '1px solid var(--color-stroke-subtle)' }}>
        <div className="row" style={{ gap: 48, alignItems: 'flex-end' }}>
          <div className="col" style={{ gap: 8 }}>
            <span className="label-sm-upper" style={{ fontSize: 10, color: 'var(--color-on-container-as-tertiary)' }}>Active engagements</span>
            <span className="mono tnum" style={{ font: '600 64px/1 JetBrains Mono', letterSpacing: '-0.04em', color: 'var(--color-on-container)' }}>07</span>
          </div>
          <div className="col" style={{ gap: 6, paddingBottom: 6 }}>
            <div className="row" style={{ gap: 8, alignItems: 'baseline' }}>
              <span className={`rag-dot green`} style={{ width: 10, height: 10 }}/>
              <span className="mono tnum" style={{ font: '500 22px/1 JetBrains Mono' }}>04</span>
              <span style={{ fontSize: 12, color: 'var(--color-on-container-as-secondary)' }}>healthy</span>
            </div>
            <div className="row" style={{ gap: 8, alignItems: 'baseline' }}>
              <span className={`rag-dot yellow`} style={{ width: 10, height: 10 }}/>
              <span className="mono tnum" style={{ font: '500 22px/1 JetBrains Mono' }}>02</span>
              <span style={{ fontSize: 12, color: 'var(--color-on-container-as-secondary)' }}>at risk</span>
            </div>
            <div className="row" style={{ gap: 8, alignItems: 'baseline' }}>
              <span className={`rag-dot red`} style={{ width: 10, height: 10 }}/>
              <span className="mono tnum" style={{ font: '500 22px/1 JetBrains Mono' }}>01</span>
              <span style={{ fontSize: 12, color: 'var(--color-on-container-as-secondary)' }}>critical</span>
            </div>
          </div>
          <div style={{ width: 1, height: 92, background: 'var(--color-stroke-subtle)' }}/>
          <div className="col" style={{ gap: 6, flex: 1 }}>
            <span className="label-sm-upper" style={{ fontSize: 10, color: 'var(--color-on-container-as-tertiary)' }}>This week</span>
            <div className="row" style={{ gap: 24, marginTop: 4 }}>
              <div className="col"><span className="mono tnum" style={{ font: '500 20px/1 JetBrains Mono' }}>23</span><span style={{ fontSize: 11, color: 'var(--color-on-container-as-tertiary)' }}>tasks closed</span></div>
              <div className="col"><span className="mono tnum" style={{ font: '500 20px/1 JetBrains Mono' }}>4</span><span style={{ fontSize: 11, color: 'var(--color-on-container-as-tertiary)' }}>milestones hit</span></div>
              <div className="col"><span className="mono tnum" style={{ font: '500 20px/1 JetBrains Mono', color: 'var(--color-on-container-as-error)' }}>3</span><span style={{ fontSize: 11, color: 'var(--color-on-container-as-tertiary)' }}>overdue</span></div>
              <div className="col"><span className="mono tnum" style={{ font: '500 20px/1 JetBrains Mono' }}>11</span><span style={{ fontSize: 11, color: 'var(--color-on-container-as-tertiary)' }}>updates logged</span></div>
              <div className="col"><span className="mono tnum" style={{ font: '500 20px/1 JetBrains Mono', color: 'var(--color-purple-500)' }}>32</span><span style={{ fontSize: 11, color: 'var(--color-on-container-as-tertiary)' }}>AI suggestions</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* AI briefing strip */}
      <div style={{ padding: '20px 32px', background: 'var(--color-surface-canvas)', borderBottom: '1px solid var(--color-stroke-subtle)' }}>
        <div className="row" style={{ gap: 8, marginBottom: 12 }}>
          <Icon name="auto_awesome" size={16} style={{ color: 'var(--color-icon-ai)' }}/>
          <span style={{ fontWeight: 500, fontSize: 14 }}>AI briefing — what needs you today</span>
          <span className="mono" style={{ fontSize: 11, color: 'var(--color-on-container-as-tertiary)', marginLeft: 'auto' }}>Generated 14m ago · claude-sonnet-4.5</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { tone: 'error',   icon: 'priority_high', title: 'Initech: stakeholder signoff overdue 2d',      sub: 'Salesforce CDC blocker has been open since Apr 18 — exec attention recommended.' },
            { tone: 'warning', icon: 'schedule',      title: 'Globex: cutover dry-run will likely slip',      sub: 'Source B mapping unresolved 9d. Velocity ↓38%. Reschedule window May 12.' },
            { tone: 'ai',      icon: 'auto_awesome',  title: 'Hooli: 5 stalled tasks share a blocker (FW-2421)', sub: 'Group under one workstream and flag as P1 dependency.' },
          ].map((b, i) => (
            <div key={i} className="card" style={{ padding: 16, borderColor: b.tone === 'error' ? 'var(--color-stroke-error)' : b.tone === 'warning' ? 'var(--color-stroke-warning)' : 'var(--color-stroke-ai)' }}>
              <div className="row" style={{ gap: 6, marginBottom: 8 }}>
                <Icon name={b.icon} size={14} style={{ color: b.tone === 'error' ? 'var(--color-icon-error)' : b.tone === 'warning' ? 'var(--color-icon-warning)' : 'var(--color-icon-ai)' }}/>
                <span style={{ fontWeight: 500, fontSize: 13, lineHeight: 1.3 }}>{b.title}</span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--color-on-container-as-secondary)', lineHeight: 1.5 }}>{b.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Project grid */}
      <div style={{ padding: '20px 32px 32px' }}>
        <div className="row" style={{ marginBottom: 12, gap: 8 }}>
          <span style={{ fontWeight: 500, fontSize: 14 }}>All engagements</span>
          <span className="mono" style={{ fontSize: 11, color: 'var(--color-on-container-as-tertiary)' }}>· 7</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {portfolioRows.slice(0, 6).map(p => {
            const tone = p.health === 'green' ? 'success' : p.health === 'yellow' ? 'warning' : 'error';
            const accent = p.health === 'green' ? 'var(--color-green-400)' : p.health === 'yellow' ? 'var(--color-orange-300)' : 'var(--color-red-500)';
            return (
              <div key={p.name} className="card" style={{ padding: 0, overflow: 'hidden', borderLeft: `3px solid ${accent}` }}>
                <div style={{ padding: '14px 18px' }}>
                  <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontWeight: 500, fontSize: 15 }}>{p.name}</span>
                    <KBadge tone={tone} dot>{p.health === 'green' ? 'Healthy' : p.health === 'yellow' ? 'At risk' : 'Critical'}</KBadge>
                  </div>
                  <div className="row" style={{ gap: 12, fontSize: 11, color: 'var(--color-on-container-as-tertiary)', marginBottom: 12 }}>
                    <span>{p.track}</span>
                    <span>·</span>
                    <span>{p.phase}</span>
                    <span>·</span>
                    <span><Avatar name={p.owner} size={14} /> <span style={{ marginLeft: 4 }}>{p.owner}</span></span>
                  </div>
                  <div className="row" style={{ gap: 24 }}>
                    <div className="col" style={{ gap: 2 }}>
                      <span className="label-sm-upper" style={{ fontSize: 9, color: 'var(--color-on-container-as-tertiary)' }}>Progress</span>
                      <span className="mono tnum" style={{ font: '500 22px/1 JetBrains Mono', letterSpacing: '-0.01em' }}>{String(p.pct).padStart(2,'0')}<span style={{ fontSize: 12, color: 'var(--color-on-container-as-tertiary)' }}>%</span></span>
                    </div>
                    <div className="col" style={{ gap: 2 }}>
                      <span className="label-sm-upper" style={{ fontSize: 9, color: 'var(--color-on-container-as-tertiary)' }}>Next</span>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{p.ms}</span>
                      <span className="mono" style={{ fontSize: 10, color: 'var(--color-on-container-as-tertiary)' }}>{p.date}</span>
                    </div>
                    <div className="col" style={{ gap: 2 }}>
                      <span className="label-sm-upper" style={{ fontSize: 9, color: 'var(--color-on-container-as-tertiary)' }}>Velocity</span>
                      <Sparkline data={p.health === 'red' ? [3,2,2,1,1,0,0,0] : p.health === 'yellow' ? [4,4,3,3,2,2,2,2] : [3,4,4,5,5,5,6,6]} color={p.health === 'red' ? 'gray' : p.health === 'yellow' ? 'gray' : 'green'} height={22}/>
                    </div>
                    {p.ai > 0 && (
                      <div className="col" style={{ gap: 2, marginLeft: 'auto', alignItems: 'flex-end' }}>
                        <span className="label-sm-upper" style={{ fontSize: 9, color: 'var(--color-on-container-as-tertiary)' }}>AI</span>
                        <span style={{ fontSize: 13, color: 'var(--color-on-ai-subtle)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="auto_awesome" size={12} style={{ color: 'var(--color-icon-ai)' }}/>{p.ai}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="progress" style={{ borderRadius: 0, height: 3 }}>
                  <i style={{ width: `${p.pct}%`, background: accent }}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  </div>
);

// ── Project Workspace — Direction 3 ────────────────────────────
const D3ProjectWorkspace = () => (
  <div className="artboard-body" style={{ background: 'var(--color-surface-canvas)', height: '100%', display: 'flex' }}>
    <D3CommandRail activeId={2} />
    <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      {/* Page-bar */}
      <div className="row" style={{ height: 44, borderBottom: '1px solid var(--color-stroke-subtle)', padding: '0 24px', gap: 8, background: 'var(--color-surface-container)' }}>
        <Icon name="apartment" size={16} style={{ color: 'var(--color-icon-secondary)' }}/>
        <span style={{ fontSize: 13, fontWeight: 500 }}>Globex Industries</span>
        <KBadge tone="warning" dot>At risk</KBadge>
        <span style={{ width: 1, height: 16, background: 'var(--color-stroke-subtle)' }}/>
        <span className="mono" style={{ fontSize: 11, color: 'var(--color-on-container-as-tertiary)' }}>GBX-2026-Q2 · Biggy</span>
        <span style={{ flex: 1 }}/>
        <button className="btn btn-secondary" style={{ height: 28, fontSize: 12 }}><Icon name="ios_share" size={14}/>Export</button>
        <button className="btn btn-primary" style={{ height: 28, fontSize: 12 }}><Icon name="add" size={14}/>Log update</button>
      </div>

      {/* Tabs */}
      <div className="row" style={{ borderBottom: '1px solid var(--color-stroke-subtle)', padding: '0 24px', background: 'var(--color-surface-container)' }}>
        {['Overview','Plan','Gantt','Stakeholders','Risks','Decisions','Artifacts','Skills','Time'].map((t,i) => (
          <span key={t} style={{
            padding: '10px 12px', fontSize: 12, fontWeight: 500,
            color: i === 0 ? 'var(--color-on-container)' : 'var(--color-on-container-as-secondary)',
            borderBottom: i === 0 ? '2px solid var(--color-blue-500)' : '2px solid transparent',
            marginBottom: -1, cursor: 'pointer',
          }}>{t}</span>
        ))}
      </div>

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Header band — KPI strip */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
            {[
              { label: 'Phase', big: 'Build', sub: 'Sprint 7 of 12' },
              { label: 'Progress', big: '54%', sub: '+6% week-over-week', mono: true },
              { label: 'Days to go-live', big: '12', sub: 'May 02, 2026', mono: true, tone: 'warning' },
              { label: 'Open risks', big: '5', sub: '2 high · 3 medium', mono: true, tone: 'error' },
              { label: 'Velocity', big: '↓ 38%', sub: 'vs prior sprint', tone: 'error' },
            ].map((k, i) => (
              <div key={i} style={{ padding: 18, borderRight: i < 4 ? '1px solid var(--color-stroke-subtle)' : 'none' }}>
                <span className="label-sm-upper" style={{ fontSize: 10, color: 'var(--color-on-container-as-tertiary)' }}>{k.label}</span>
                <div style={{ marginTop: 6 }}>
                  <span className={k.mono ? 'mono tnum' : ''} style={{
                    font: `500 28px/1 ${k.mono ? 'JetBrains Mono' : 'Inter'}`,
                    letterSpacing: '-0.01em',
                    color: k.tone === 'error' ? 'var(--color-on-container-as-error)' : k.tone === 'warning' ? 'var(--color-on-container-as-warning)' : 'var(--color-on-container)',
                  }}>{k.big}</span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--color-on-container-as-tertiary)', marginTop: 2, display: 'block' }}>{k.sub}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Grid: focus + plan */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
          <div className="card" style={{ padding: 0 }}>
            <div className="row" style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-stroke-subtle)', gap: 8 }}>
              <span style={{ fontWeight: 500, fontSize: 14 }}>This week's focus</span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--color-on-container-as-tertiary)' }}>Wk 18 · Apr 27 – May 03</span>
              <span style={{ flex: 1 }}/>
              <span style={{ fontSize: 12, color: 'var(--color-on-container-as-link)' }}>Open plan →</span>
            </div>
            <div>
              {[
                { t: 'Drive cutover dry-run completion', s: 'A. Tan',    due: 'May 01', status: 'In progress', tone: 'info' },
                { t: 'Resolve Source B mapping',        s: 'M. Nguyen', due: 'Apr 30', status: 'Blocked',     tone: 'error' },
                { t: 'Steering Committee deck',         s: 'A. Tan',    due: 'May 02', status: 'Not started', tone: 'neutral' },
                { t: 'Land 4 dependent integrations',   s: 'D. Park',   due: 'May 03', status: 'In progress', tone: 'info' },
                { t: 'AI status report draft',          s: 'AI',        due: 'May 02', status: 'Auto',        tone: 'ai',       ai: true },
              ].map((x, i, arr) => (
                <div key={i} className="row" style={{ padding: '11px 18px', gap: 12, borderBottom: i === arr.length - 1 ? 'none' : '1px solid var(--color-stroke-subtle)' }}>
                  <Icon name={x.status === 'Blocked' ? 'block' : x.status === 'In progress' ? 'autorenew' : x.status === 'Auto' ? 'auto_awesome' : 'radio_button_unchecked'}
                        size={16}
                        style={{ color: x.tone === 'error' ? 'var(--color-icon-error)' : x.tone === 'info' ? 'var(--color-icon-interactive)' : x.tone === 'ai' ? 'var(--color-icon-ai)' : 'var(--color-icon-tertiary)' }}/>
                  <span style={{ flex: 1, fontSize: 13 }}>{x.t}</span>
                  {x.ai
                    ? <span style={{ width: 22, height: 22, borderRadius: 9999, background: 'var(--color-surface-ai-subtle)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Icon name="auto_awesome" size={12} style={{ color: 'var(--color-icon-ai)' }}/></span>
                    : <Avatar name={x.s} size={22}/>}
                  <span className="mono" style={{ fontSize: 11, color: 'var(--color-on-container-as-tertiary)', width: 50, textAlign: 'right' }}>{x.due}</span>
                  <KBadge tone={x.tone}>{x.status}</KBadge>
                </div>
              ))}
            </div>
          </div>

          {/* Open risks */}
          <div className="card" style={{ padding: 0 }}>
            <div className="row" style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-stroke-subtle)' }}>
              <span style={{ fontWeight: 500, fontSize: 14 }}>Open risks</span>
              <KBadge tone="error" style={{ marginLeft: 8 }}>5</KBadge>
            </div>
            <div>
              {[
                { s:'High', tone:'error',   t:'Customer SME unavailable for cutover dry-run', age: '6d' },
                { s:'High', tone:'error',   t:'Source B mapping unresolved', age: '9d' },
                { s:'Med',  tone:'warning', t:'IdP cutover dependent on FW-2421', age: '11d' },
                { s:'Med',  tone:'warning', t:'Steering cadence has slipped', age: '14d' },
                { s:'Low',  tone:'neutral', t:'Knowledge transfer doc behind', age: '4d' },
              ].map((r,i,arr) => (
                <div key={i} className="row" style={{ padding: '10px 18px', gap: 8, borderBottom: i === arr.length - 1 ? 'none' : '1px solid var(--color-stroke-subtle)' }}>
                  <KBadge tone={r.tone} dot>{r.s}</KBadge>
                  <span style={{ flex: 1, fontSize: 12, lineHeight: 1.4 }}>{r.t}</span>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--color-on-container-as-tertiary)' }}>{r.age}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
    <D3AssistantRail />
  </div>
);

Object.assign(window, { D3PortfolioDashboard, D3ProjectWorkspace });
