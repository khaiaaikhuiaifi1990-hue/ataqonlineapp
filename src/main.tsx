import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safe error logging preventing cyclic structure errors
window.addEventListener('error', (event) => {
  const msg = typeof event?.message === 'string' ? event.message : 'Error occurred';
  console.warn('Runtime error notice:', msg);
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event?.reason;
  const msg = typeof reason === 'string' ? reason : (reason && typeof reason.message === 'string' ? reason.message : 'Promise rejection');
  console.warn('Unhandled rejection notice:', msg);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
