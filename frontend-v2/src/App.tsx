import { useEffect, useState } from 'react';
import { AppShell, type AppView } from './components/layout/AppShell';
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
  if (view === 'home') content = <HomePage requestedGameweek={gameweek} onNavigate={navigate} />;
  else if (view === 'fixtures') content = <FixturesPage requestedGameweek={gameweek} />;
  else if (view === 'fpl') content = <FplPage requestedGameweek={gameweek} />;
  else if (view === 'markets') content = <MarketsPage requestedGameweek={gameweek} />;
  else if (view === 'performance') content = <PerformancePage requestedGameweek={gameweek} />;
  else content = <EnginePage requestedGameweek={gameweek} />;

  return <AppShell view={view} gameweek={gameweek} onNavigate={navigate} onGameweekChange={changeGameweek}>{content}</AppShell>;
}
