import { Button } from './components/primitives/Button';
import { Surface } from './components/primitives/Surface';

const foundations = [
  ['Decision-first', 'Primary surfaces will answer the football or FPL decision before exposing diagnostics.'],
  ['Validated data', 'Production API payloads are parsed at runtime before they can reach presentation components.'],
  ['Mobile-first', 'Safe areas, 44px interaction targets and no hidden horizontal overflow are baseline rules.'],
] as const;

export function App() {
  return (
    <main className="foundation-page">
      <section className="foundation-hero" aria-labelledby="ui-v2-title">
        <div className="eyebrow">C0169 · Parallel foundation</div>
        <h1 id="ui-v2-title">Football Intelligence Engine</h1>
        <p className="hero-copy">
          UI v2 is being rebuilt as an isolated decision workspace. The production legacy interface remains untouched until the controlled cutover gate.
        </p>
        <div className="hero-actions">
          <Button as="a" href="../" variant="secondary">Open legacy UI</Button>
          <span className="status-chip" role="status">Foundation online</span>
        </div>
      </section>

      <section className="foundation-grid" aria-label="UI v2 foundation principles">
        {foundations.map(([title, copy]) => (
          <Surface key={title}>
            <span className="surface-kicker">Foundation</span>
            <h2>{title}</h2>
            <p>{copy}</p>
          </Surface>
        ))}
      </section>

      <footer className="foundation-footer">
        <span>Parallel build · no model effect</span>
        <span>React · TypeScript · Vite</span>
      </footer>
    </main>
  );
}
