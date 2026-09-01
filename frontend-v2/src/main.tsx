import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import { queryClient } from './lib/queryClient';
import './styles/tokens.css';
import './styles/global.css';
import './styles/home.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('UI v2 root element is missing');
}

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
