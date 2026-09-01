import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('UI v2 foundation', () => {
  it('renders the isolated foundation and legacy escape hatch', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: 'Football Intelligence Engine' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open legacy UI' })).toHaveAttribute('href', '../');
    expect(screen.getByRole('status')).toHaveTextContent('Foundation online');
  });
});
