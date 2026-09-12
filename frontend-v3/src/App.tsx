import { FplWorkspace } from './components/FplWorkspace';

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
          <span className="v3-status" data-tone="warning">Private · QA gated</span>
        </div>
      </header>

      <main className="v3-page" id="fpl">
        <FplWorkspace />
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
