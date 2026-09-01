import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { App } from './App';

it('renders the application shell without mounting unfinished feature data', () => {
  window.history.replaceState({}, '', '/?view=fpl');
  render(<App />);
  expect(screen.getAllByRole('navigation', { name: 'Main navigation' })).toHaveLength(2);
  expect(screen.getByRole('heading', { level: 1, name: 'FPL workspace' })).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: 'Home' }).length).toBeGreaterThan(0);
});
