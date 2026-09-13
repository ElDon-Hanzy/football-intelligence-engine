import { useEffect, useMemo, useState } from 'react';
import { fetchFplWorkspace } from './api/fplWorkspace';
import { FplLiveWorkspace } from './components/FplLiveWorkspace';
import { HistoryPage } from './components/HistoryPage';
import { MarketsPage } from './components/MarketsPage';
import { MatchesIntelligencePage } from './components/MatchesIntelligencePage';
import { HomePage, InsightsPage, type ProductView } from './components/ProductPages';

const navItems: Array<{ label: string; view: ProductView }> = [
  { label: 'Home', view: 'home' },
  { label: 'FPL', view: 'fpl' },
  { label: 'Matches', view: 'matches' },
  { label: 'Markets', view: 'markets' },
  { label: 'Insights', view: 'insights' },
  { label: 'History', view: 'history' },
];
const validViews = new Set<ProductView>(navItems.map((item) => item.view));
function viewFromLocation(): ProductView { const raw = window.location.hash.replace(/^#/, '').trim().toLowerCase(); return validViews.has(raw as ProductView) ? raw as ProductView : 'fpl'; }
function gameweekFromLocation(): number { const value = Number(new URL(window.location.href).searchParams.get('gw') ?? 0); return Number.isInteger(value) && value >= 1 && value <= 38 ? value : 0; }

export function App() {
  const [active, setActive] = useState<ProductView>(viewFromLocation);
  const [selectedGameweek, setSelectedGameweek] = useState<number>(gameweekFromLocation);
  const [currentGameweek, setCurrentGameweek] = useState<number | null>(null);

  useEffect(() => {
    const onHashChange = () => { setActive(viewFromLocation()); window.scrollTo({ top: 0, behavior: 'auto' }); };
    const onPopState = () => setSelectedGameweek(gameweekFromLocation());
    window.addEventListener('hashchange', onHashChange);
    window.addEventListener('popstate', onPopState);
    return () => { window.removeEventListener('hashchange', onHashChange); window.removeEventListener('popstate', onPopState); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchFplWorkspace(0, controller.signal)
      .then((workspace) => setCurrentGameweek(workspace.gameweek))
      .catch(() => setCurrentGameweek(null));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (currentGameweek == null || selectedGameweek === 0 || selectedGameweek <= currentGameweek) return;
    setSelectedGameweek(0);
    updateGameweekUrl(0);
  }, [currentGameweek, selectedGameweek]);

  const visibleGameweek = selectedGameweek || currentGameweek || 0;
  const availableGameweeks = useMemo(() => currentGameweek == null ? [] : Array.from({ length: currentGameweek }, (_, index) => index + 1), [currentGameweek]);

  const changeGameweek = (gameweek: number) => {
    const normalized = currentGameweek != null && gameweek === currentGameweek ? 0 : gameweek;
    setSelectedGameweek(normalized);
    updateGameweekUrl(normalized);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  let content;
  if (active === 'home') content = <HomePage onNavigate={navigate} gameweek={selectedGameweek} />;
  else if (active === 'fpl') content = <FplLiveWorkspace gameweek={selectedGameweek} />;
  else if (active === 'matches') content = <MatchesIntelligencePage gameweek={selectedGameweek} />;
  else if (active === 'markets') content = <MarketsPage gameweek={selectedGameweek} />;
  else if (active === 'insights') content = <InsightsPage gameweek={selectedGameweek} />;
  else content = <HistoryPage gameweek={selectedGameweek} />;

  return <div className="v3-app-shell">
    <header className="v3-topbar">
      <a className="v3-brand" href="#home" aria-label="Football Intelligence home"><span className="v3-brand-mark" aria-hidden="true">FI</span><span><strong>Football Intelligence</strong><small>V3</small></span></a>
      <nav className="v3-desktop-nav" aria-label="Primary navigation">{navItems.map((item) => <a key={item.view} href={`#${item.view}`} aria-current={item.view === active ? 'page' : undefined}>{item.label}</a>)}</nav>
      <div className="v3-top-actions">
        <label className="v3-gw-switcher">
          <span>Gameweek</span>
          <select aria-label="Select Gameweek" value={visibleGameweek || ''} onChange={(event) => changeGameweek(Number(event.target.value))} disabled={!availableGameweeks.length}>
            {!availableGameweeks.length ? <option value="">GW…</option> : availableGameweeks.map((gameweek) => <option key={gameweek} value={gameweek}>{`GW${gameweek}${gameweek === currentGameweek ? ' · Current' : ''}`}</option>)}
          </select>
        </label>
      </div>
    </header>
    <main className="v3-page" id={active} data-active-view={active} data-gameweek={visibleGameweek || undefined}>{content}</main>
    <nav className="v3-mobile-nav" aria-label="Mobile navigation">{navItems.map((item) => <a key={item.view} href={`#${item.view}`} aria-current={item.view === active ? 'page' : undefined}><span aria-hidden="true">•</span>{item.label}</a>)}</nav>
  </div>;
}

function updateGameweekUrl(gameweek: number) {
  const url = new URL(window.location.href);
  if (gameweek > 0) url.searchParams.set('gw', String(gameweek));
  else url.searchParams.delete('gw');
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

function navigate(view: ProductView) { if (window.location.hash === `#${view}`) { window.scrollTo({ top: 0, behavior: 'auto' }); return; } window.location.hash = view; }
