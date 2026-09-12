import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/base.css';
import './styles/shell.css';
import './styles/fpl.css';
import './styles/product.css';
import './styles/c0257.css';
import './styles/responsive.css';

const root = document.getElementById('root');
if (!root) throw new Error('V3 root element not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
