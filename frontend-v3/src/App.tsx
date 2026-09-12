const navItems = ['Home', 'FPL', 'Matches', 'Insights', 'History'] as const;

type NavItem = (typeof navItems)[number];

export function App() {
  const active: NavItem = 'FPL';

  return (
    <div className="v3-app-shell">
      <header className="v3-topbar">
        <a className="v3-brand" href="#home" aria-label="Football Intelligence home">
          <span className="v3-brand-mark" aria-hidden="true">FI</span>
          <span>
            <strong>Football Intelligence</strong>
            <small>V3 private build</small>
          </span>
        </a>

        <nav className="v3-desktop-nav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`} aria-current={item === active ? 'page' : undefined}>
              {item}
            </a>
          ))}
        </nav>

        <div className="v3-top-actions">
          <span className="v3-status" data-tone="warning">Private · not deployed</span>
        </div>
      </header>

      <main className="v3-page v3-shell-preview">
        <section className="v3-shell-hero">
          <div>
            <span className="v3-kicker">Gameweek workspace · C0255</span>
            <h1 className="v3-display">Your football decisions, on the pitch.</h1>
            <p>
              V3 separates the engine recommendation, the verified submitted team and live results before any
              football UI is rendered.
            </p>
          </div>
          <div className="v3-state-stack" aria-label="V3 state contract preview">
            <span className="v3-status" data-tone="intelligence">Engine recommendation</span>
            <span className="v3-status" data-tone="warning">Actual team · verification required</span>
          </div>
        </section>

        <section className="v3-surface v3-pitch-placeholder" aria-labelledby="pitch-heading">
          <div className="v3-placeholder-head">
            <div>
              <span className="v3-kicker">FPL</span>
              <h2 id="pitch-heading">Pitch-first workspace</h2>
            </div>
            <div className="v3-view-toggle" aria-label="View preview">
              <button className="is-active" type="button">Pitch</button>
              <button type="button">List</button>
            </div>
          </div>

          <div className="v3-pitch-preview" aria-hidden="true">
            <span className="v3-pitch-line v3-pitch-line--half" />
            <span className="v3-pitch-circle" />
            <div className="v3-player-row v3-player-row--one"><span /></div>
            <div className="v3-player-row v3-player-row--three"><span /><span /><span /></div>
            <div className="v3-player-row v3-player-row--five"><span /><span /><span /><span /><span /></div>
            <div className="v3-player-row v3-player-row--two"><span /><span /></div>
          </div>

          <div className="v3-bench-preview">
            <span>Bench</span>
            <div><i /><i /><i /><i /></div>
          </div>
        </section>
      </main>

      <nav className="v3-mobile-nav" aria-label="Mobile navigation">
        {navItems.map((item) => (
          <a key={item} href={`#${item.toLowerCase()}`} aria-current={item === active ? 'page' : undefined}>
            <span aria-hidden="true">•</span>{item}
          </a>
        ))}
      </nav>
    </div>
  );
}
