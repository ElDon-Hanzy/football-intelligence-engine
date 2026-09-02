import { useEffect, useState } from 'react';
import { AppShell, type AppView } from './components/layout/AppShell';
import { useLiveGameweek } from './lib/gameweek';
import { EnginePage } from './pages/EnginePage';
import { FixturesPage } from './pages/FixturesPage';
import { FplPage } from './pages/FplPage';
import { HomePage } from './pages/HomePage';
import { MarketsPage } from './pages/MarketsPage';
import { PerformancePage } from './pages/PerformancePage';

const validViews = new Set<AppView>(['home', 'fixtures', 'fpl', 'markets', 'performance', 'engine']);

function viewFromLocation(): AppView {
  const value = new URLSearchParams(window.location.search).get('view') ?? 'home';
  return validViews.has(value as AppView) ? (value as AppView) : 'home';
}

function gameweekFromLocation(): number {
  const raw = Number(new URLSearchParams(window.location.search).get('gw') ?? 0);
  return Number.isInteger(raw) && raw >= 1 && raw <= 38 ? raw : 0;
}

export function App() {
  const [view, setView] = useState<AppView>(viewFromLocation);
  const [gameweek, setGameweek] = useState(gameweekFromLocation);
  const liveGameweek = useLiveGameweek(gameweek === 0);
  const resolvedGameweek = gameweek > 0 ? gameweek : (liveGameweek.data?.live_gameweek ?? 0);

  useEffect(() => {
    const onPopState = () => {
      setView(viewFromLocation());
      setGameweek(gameweekFromLocation());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = (nextView: AppView) => {
    const url = new URL(window.location.href);
    url.searchParams.set('view', nextView);
    if (gameweek > 0) url.searchParams.set('gw', String(gameweek));
    else url.searchParams.delete('gw');
    window.history.pushState({}, '', url);
    setView(nextView);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const changeGameweek = (nextGameweek: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set('view', view);
    if (nextGameweek > 0) url.searchParams.set('gw', String(nextGameweek));
    else url.searchParams.delete('gw');
    window.history.pushState({}, '', url);
    setGameweek(nextGameweek);
  };

  let content;
  if (resolvedGameweek === 0) {
    content = liveGameweek.isError
      ? <section className="state-panel" aria-live="polite"><span className="page-eyebrow">Gameweek</span><h1>Live Gameweek is unavailable.</h1><p>The interface will not guess a Gameweek from future frozen projection runs or endpoint defaults.</p><button type="button" className="button button-primary" onClick={() => void liveGameweek.refetch()}>Retry Gameweek status</button></section>
      : <div className="command-skeleton" aria-busy="true" aria-label="Resolving live Gameweek"><div className="skeleton-line is-short" /><div className="skeleton-line is-title" /><div className="skeleton-panel" /></div>;
  } else if (view === 'home') content = <HomePage requestedGameweek={resolvedGameweek} onNavigate={navigate} />;
  else if (view === 'fixtures') content = <FixturesPage requestedGameweek={resolvedGameweek} />;
  else if (view === 'fpl') content = <FplPage requestedGameweek={resolvedGameweek} />;
  else if (view === 'markets') content = <MarketsPage requestedGameweek={resolvedGameweek} />;
  else if (view === 'performance') content = <PerformancePage requestedGameweek={resolvedGameweek} />;
  else content = <EnginePage requestedGameweek={resolvedGameweek} />;

  return <AppShell view={view} gameweek={gameweek} liveGameweek={liveGameweek.data?.live_gameweek ?? null} onNavigate={navigate} onGameweekChange={changeGameweek}>{content}</AppShell>;
}
