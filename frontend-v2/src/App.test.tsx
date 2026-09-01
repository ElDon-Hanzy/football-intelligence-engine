import { render, screen } from '@testing-library/react';
import { App } from './App';

it('renders the application shell without mounting unfinished feature data', () => {
  window.history.replaceState({}, '', '/?view=fpl');
  render(<App />);
  expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 1, name: 'FPL workspace' })).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: 'Home' }).length).toBeGreaterThan(0);
});
