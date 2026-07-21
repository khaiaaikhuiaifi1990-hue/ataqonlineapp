import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global error handler for uncaught runtime errors in browser
window.addEventListener('error', (event) => {
  console.error('Global application error caught:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Global unhandled promise rejection caught:', event.reason);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);


