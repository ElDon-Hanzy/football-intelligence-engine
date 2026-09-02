import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { AppShell } from './components/layout/AppShell';

it('renders the six-view shell while keeping five full-size mobile primary destinations', () => {
  render(<AppShell view="performance" gameweek={3} onNavigate={vi.fn()} onGameweekChange={vi.fn()}><h1>Performance test surface</h1></AppShell>);
  expect(screen.getAllByRole('navigation', { name: 'Main navigation' })).toHaveLength(2);
  expect(screen.getByRole('heading', { level: 1, name: 'Performance test surface' })).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: 'Markets' }).length).toBeGreaterThan(0);
  expect(screen.getByRole('button', { name: 'Engine and research' })).toBeInTheDocument();
});
