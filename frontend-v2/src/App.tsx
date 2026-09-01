import { useEffect, useState } from 'react';
import { AppShell, type AppView } from './components/layout/AppShell';
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

const placeholders: Record<Exclude<AppView, 'home'>, { title: string; eyebrow: string; copy: string }> = {
  fixtures: { title: 'Fixtures', eyebrow: 'C0171', copy: 'Compact fixture scanning and signed evidence arrive in the dedicated Fixtures batch.' },
  fpl: { title: 'FPL workspace', eyebrow: 'C0173', copy: 'The decision-first squad workspace will be built after Fixtures and the matchup modal are complete.' },
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

  return (
    <AppShell view={view} gameweek={gameweek} onNavigate={navigate} onGameweekChange={changeGameweek}>
      {view === 'home' ? (
        <HomePage requestedGameweek={gameweek} onNavigate={navigate} />
      ) : (
        <PlaceholderPage {...placeholders[view]} />
      )}
    </AppShell>
  );
}
