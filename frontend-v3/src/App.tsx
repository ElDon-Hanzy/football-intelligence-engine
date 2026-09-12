import { useEffect, useState } from 'react';
import { FplWorkspace } from './components/FplWorkspace';
import { HistoryPage, HomePage, InsightsPage, MatchesPage, type ProductView } from './components/ProductPages';

const navItems: Array<{ label: string; view: ProductView }> = [
  { label: 'Home', view: 'home' },
  { label: 'FPL', view: 'fpl' },
  { label: 'Matches', view: 'matches' },
  { label: 'Insights', view: 'insights' },
  { label: 'History', view: 'history' },
];

const validViews = new Set<ProductView>(navItems.map((item) => item.view));

function viewFromLocation(): ProductView {
  const raw = window.location.hash.replace(/^#/, '').trim().toLowerCase();
  return validViews.has(raw as ProductView) ? raw as ProductView : 'fpl';
}

export function App() {
  const [active, setActive] = useState<ProductView>(viewFromLocation);

  useEffect(() => {
    const onHashChange = () => {
      setActive(viewFromLocation());
      window.scrollTo({ top: 0, behavior: 'auto' });
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = (view: ProductView) => {
    if (window.location.hash === `#${view}`) {
      setActive(view);
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }
    window.location.hash = view;
  };

  let content;
  if (active === 'home') content = <HomePage onNavigate={navigate} />;
  else if (active === 'fpl') content = <FplWorkspace />;
  else if (active === 'matches') content = <MatchesPage />;
  else if (active === 'insights') content = <InsightsPage />;
  else content = <HistoryPage />;

  return (
    <div className="v3-app-shell">
      <header className="v3-topbar">
        <a className="v3-brand" href="#home" aria-label="Football Intelligence home">
          <span className="v3-brand-mark" aria-hidden="true">FI</span>
          <span>
            <strong>Football Intelligence</strong>
            <small>V3</small>
          </span>
        </a>

        <nav className="v3-desktop-nav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <a key={item.view} href={`#${item.view}`} aria-current={item.view === active ? 'page' : undefined}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="v3-top-actions">
          <span className="v3-status" data-tone="intelligence">Live product</span>
        </div>
      </header>

      <main className="v3-page" id={active} data-active-view={active}>
        {content}
      </main>

      <nav className="v3-mobile-nav" aria-label="Mobile navigation">
        {navItems.map((item) => (
          <a key={item.view} href={`#${item.view}`} aria-current={item.view === active ? 'page' : undefined}>
            <span aria-hidden="true">•</span>{item.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
