import { useEffect, useMemo, useState } from 'react';
import { fetchActualLive } from './api/actualLive';
import { fetchGameweekCatalog } from './api/gameweekCatalog';
import { FplLiveWorkspace } from './components/FplLiveWorkspace';
import { ForwardFplPage, ForwardHomePage, ForwardInsightsPage } from './components/ForwardPages';
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
  const [latestIntelligenceGameweek, setLatestIntelligenceGameweek] = useState<number | null>(null);
  const [catalogReady, setCatalogReady] = useState(false);

  useEffect(() => {
    const onHashChange = () => { setActive(viewFromLocation()); window.scrollTo({ top: 0, behavior: 'auto' }); };
    const onPopState = () => setSelectedGameweek(gameweekFromLocation());
    window.addEventListener('hashchange', onHashChange);
    window.addEventListener('popstate', onPopState);
    return () => { window.removeEventListener('hashchange', onHashChange); window.removeEventListener('popstate', onPopState); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchGameweekCatalog(controller.signal)
      .then((catalog) => {
        setCurrentGameweek(catalog.currentGameweek);
        setLatestIntelligenceGameweek(catalog.latestIntelligenceGameweek);
        setCatalogReady(true);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        setCurrentGameweek(null);
        setLatestIntelligenceGameweek(null);
        setCatalogReady(true);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (active !== 'fpl' || selectedGameweek !== 0 || currentGameweek == null) return;
    const controller = new AbortController();
    void fetchActualLive(currentGameweek, controller.signal).catch(() => undefined);
    return () => controller.abort();
  }, [active, currentGameweek, selectedGameweek]);

  const latestAvailableGameweek = Math.max(currentGameweek ?? 0, latestIntelligenceGameweek ?? 0);

  useEffect(() => {
    if (!catalogReady || selectedGameweek === 0 || latestAvailableGameweek === 0 || selectedGameweek <= latestAvailableGameweek) return;
    setSelectedGameweek(0);
    updateGameweekUrl(0);
  }, [catalogReady, latestAvailableGameweek, selectedGameweek]);

  const visibleGameweek = selectedGameweek || currentGameweek || latestIntelligenceGameweek || 0;
  const availableGameweeks = useMemo(() => latestAvailableGameweek > 0 ? Array.from({ length: latestAvailableGameweek }, (_, index) => index + 1) : [], [latestAvailableGameweek]);

  const changeGameweek = (gameweek: number) => {
    const normalized = currentGameweek != null && gameweek === currentGameweek ? 0 : gameweek;
    setSelectedGameweek(normalized);
    updateGameweekUrl(normalized);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const isForwardGameweek = selectedGameweek > 0 && currentGameweek != null && selectedGameweek > currentGameweek;
  let content;
  if (active === 'home') content = isForwardGameweek ? <ForwardHomePage onNavigate={navigate} gameweek={selectedGameweek} /> : <HomePage onNavigate={navigate} gameweek={selectedGameweek} />;
  else if (active === 'fpl') content = isForwardGameweek && currentGameweek != null
    ? <ForwardFplPage gameweek={selectedGameweek} activeGameweek={currentGameweek} />
    : selectedGameweek === 0 && !catalogReady
      ? <PageLoading />
      : <FplLiveWorkspace gameweek={selectedGameweek} />;
  else if (active === 'matches') content = <MatchesIntelligencePage gameweek={visibleGameweek} />;
  else if (active === 'markets') content = <MarketsPage gameweek={visibleGameweek} />;
  else if (active === 'insights') content = isForwardGameweek ? <ForwardInsightsPage gameweek={selectedGameweek} /> : <InsightsPage gameweek={selectedGameweek} />;
  else content = visibleGameweek > 0 ? <HistoryPage gameweek={visibleGameweek} /> : <PageLoading />;

  return <div className="v3-app-shell">
    <header className="v3-topbar">
      <a className="v3-brand" href="#home" aria-label="Football Intelligence home"><span className="v3-brand-mark" aria-hidden="true">FI</span><span><strong>Football Intelligence</strong><small>V3</small></span></a>
      <nav className="v3-desktop-nav" aria-label="Primary navigation">{navItems.map((item) => <a key={item.view} href={`#${item.view}`} aria-current={item.view === active ? 'page' : undefined}>{item.label}</a>)}</nav>
      <div className="v3-top-actions">
        <label className="v3-gw-switcher">
          <span>Gameweek</span>
          <select aria-label="Select Gameweek" value={visibleGameweek || ''} onChange={(event) => changeGameweek(Number(event.target.value))} disabled={!availableGameweeks.length}>
            {!availableGameweeks.length ? <option value="">GW…</option> : availableGameweeks.map((gameweek) => <option key={gameweek} value={gameweek}>{gameweekLabel(gameweek, currentGameweek, latestIntelligenceGameweek)}</option>)}
          </select>
        </label>
      </div>
    </header>
    <main className="v3-page" id={active} data-active-view={active} data-gameweek={visibleGameweek || undefined}>{content}</main>
    <nav className="v3-mobile-nav" aria-label="Mobile navigation">{navItems.map((item) => <a key={item.view} href={`#${item.view}`} aria-current={item.view === active ? 'page' : undefined}><span aria-hidden="true">•</span>{item.label}</a>)}</nav>
  </div>;
}

function PageLoading() { return <section className="v3-product-page" aria-busy="true"><div className="v3-surface v3-skeleton-panel" /></section>; }

function gameweekLabel(gameweek: number, currentGameweek: number | null, latestIntelligenceGameweek: number | null): string {
  if (gameweek === currentGameweek) return `GW${gameweek} · Live`;
  if (currentGameweek != null && gameweek > currentGameweek && latestIntelligenceGameweek != null && gameweek <= latestIntelligenceGameweek) return `GW${gameweek} · Upcoming`;
  return `GW${gameweek}`;
}

function updateGameweekUrl(gameweek: number) {
  const url = new URL(window.location.href);
  if (gameweek > 0) url.searchParams.set('gw', String(gameweek));
  else url.searchParams.delete('gw');
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

function navigate(view: ProductView) { if (window.location.hash === `#${view}`) { window.scrollTo({ top: 0, behavior: 'auto' }); return; } window.location.hash = view; }
