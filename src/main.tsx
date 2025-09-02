import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

console.log('Main: Starting application...');

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Main: Root element not found!');
} else {
  console.log('Main: Root element found, rendering app...');
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}