import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { App } from './App';

it('renders the application shell without mounting unfinished feature data', () => {
  window.history.replaceState({}, '', '/?view=performance');
  render(<App />);
  expect(screen.getAllByRole('navigation', { name: 'Main navigation' })).toHaveLength(2);
  expect(screen.getByRole('heading', { level: 1, name: 'Performance' })).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: 'Home' }).length).toBeGreaterThan(0);
});
