import type { ReactNode } from 'react';

export type AppView = 'home' | 'fixtures' | 'fpl' | 'markets' | 'performance' | 'engine';

type AppShellProps = {
  children: ReactNode;
  view: AppView;
  gameweek: number;
  liveGameweek?: number | null;
  onNavigate: (view: AppView) => void;
  onGameweekChange: (gameweek: number) => void;
};

type NavItem = { view: AppView; label: string; mark: string };
const desktopNavigation: ReadonlyArray<NavItem> = [
  { view: 'home', label: 'Home', mark: 'H' },
  { view: 'fixtures', label: 'Fixtures', mark: 'FX' },
  { view: 'fpl', label: 'FPL', mark: 'XI' },
  { view: 'markets', label: 'Markets', mark: 'M' },
  { view: 'performance', label: 'Performance', mark: 'P' },
  { view: 'engine', label: 'Engine', mark: 'E' },
];
const mobileNavigation = desktopNavigation.filter((item) => item.view !== 'engine');

export function AppShell({ children, view, gameweek, liveGameweek = null, onNavigate, onGameweekChange }: AppShellProps) {
  const liveLabel = liveGameweek == null ? 'Live GW' : `Live GW · GW${liveGameweek}`;
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <aside className="side-rail" aria-label="Primary">
        <button className="brand-lockup" type="button" onClick={() => onNavigate('home')} aria-label="Football Intelligence Engine home">
          <span className="brand-mark" aria-hidden="true">FI</span>
          <span><strong>Football</strong><small>Intelligence</small></span>
        </button>
        <Navigation items={desktopNavigation} view={view} onNavigate={onNavigate} />
        <a className="legacy-link" href="../">Legacy UI</a>
      </aside>
      <div className="app-column">
        <header className="top-bar">
          <div><span className="top-eyebrow">Decision workspace</span><strong className="top-title">{desktopNavigation.find((item) => item.view === view)?.label ?? 'Home'}</strong></div>
          <div className="top-actions">
            <button className={`engine-shortcut${view === 'engine' ? ' is-active' : ''}`} type="button" onClick={() => onNavigate('engine')} aria-label="Engine and research">Engine</button>
            <label className="gw-control"><span className="sr-only">Gameweek</span><select value={gameweek} onChange={(event) => onGameweekChange(Number(event.target.value))} aria-label="Gameweek"><option value={0}>{liveLabel}</option>{Array.from({ length: 38 }, (_, index) => index + 1).map((gw) => <option key={gw} value={gw}>GW{gw}</option>)}</select></label>
            <span className="parallel-chip">V2 parallel</span>
          </div>
        </header>
        <main id="main-content" className="app-content" tabIndex={-1}>{children}</main>
      </div>
      <div className="mobile-nav-wrap"><Navigation items={mobileNavigation} view={view} onNavigate={onNavigate} /></div>
    </div>
  );
}

function Navigation({ items, view, onNavigate }: { items: ReadonlyArray<NavItem>; view: AppView; onNavigate: (view: AppView) => void }) {
  return <nav className="primary-nav" aria-label="Main navigation">{items.map((item) => <button key={item.view} type="button" className={`nav-item${view === item.view ? ' is-active' : ''}`} aria-current={view === item.view ? 'page' : undefined} onClick={() => onNavigate(item.view)}><span className="nav-mark" aria-hidden="true">{item.mark}</span><span>{item.label}</span></button>)}</nav>;
}
