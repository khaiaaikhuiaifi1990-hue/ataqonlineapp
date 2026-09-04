import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Circular-safe JSON.stringify safeguard
try {
  const _nativeStringify = JSON.stringify;
  JSON.stringify = function(value: any, replacer?: any, space?: any) {
    const seen = new WeakSet();
    const safeReplacer = function(this: any, key: string, val: any) {
      if (typeof val === 'object' && val !== null) {
        if (seen.has(val)) {
          return '[Circular]';
        }
        seen.add(val);
      }
      if (typeof replacer === 'function') {
        return replacer.call(this, key, val);
      }
      return val;
    };

    try {
      if (Array.isArray(replacer)) {
        return _nativeStringify(value, function(this: any, k: string, v: any) {
          if (k !== '' && !replacer.includes(k)) return undefined;
          return safeReplacer.call(this, k, v);
        }, space);
      }
      return _nativeStringify(value, safeReplacer, space);
    } catch {
      try {
        return _nativeStringify(value, (k, v) => {
          if (typeof v === 'object' && v !== null) {
            try {
              if (seen.has(v)) return '[Circular]';
              seen.add(v);
            } catch {
              return '[Unserializable]';
            }
          }
          return v;
        }, space);
      } catch {
        return 'null';
      }
    }
  };
} catch {}

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
