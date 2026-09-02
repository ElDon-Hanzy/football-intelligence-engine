import { useEffect, useState } from 'react';
import { AppShell, type AppView } from './components/layout/AppShell';
import { FixturesPage } from './pages/FixturesPage';
import { FplPage } from './pages/FplPage';
import { HomePage } from './pages/HomePage';
import { PlaceholderPage } from './pages/PlaceholderPage';

const validViews = new Set<AppView>(['home', 'fixtures', 'fpl', 'performance', 'engine']);

function viewFromLocation(): AppView {
  const value = new URLSearchParams(window.location.search).get('view') ?? 'home';
  return validViews.has(value as AppView) ? (value as AppView) : 'home';
}

function gameweekFromLocation(): number {
  const raw = Number(new URLSearchParams(window.location.search).get('gw') ?? 0);
  return Number.isInteger(raw) && raw >= 1 && raw <= 38 ? raw : 0;
}

const placeholders: Record<Exclude<AppView, 'home' | 'fixtures' | 'fpl'>, { title: string; eyebrow: string; copy: string }> = {
  performance: { title: 'Performance', eyebrow: 'C0174', copy: 'Model performance, markets and validation views stay out of the command surface until their dedicated batch.' },
  engine: { title: 'Engine & research', eyebrow: 'C0174', copy: 'Diagnostics, governance and research tracks will live here instead of competing with weekly decisions.' },
};

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
  else content = <PlaceholderPage {...placeholders[view]} />;

  return <AppShell view={view} gameweek={gameweek} onNavigate={navigate} onGameweekChange={changeGameweek}>{content}</AppShell>;
}
