// Self-hosted Inter font (replaces blocking Google Fonts request).
// Loading 4 weights covers 300/400/500/600/700 used across the app.
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
// Display fonts used by portfolio templates and a few editor surfaces.
// These were previously delivered by the broad Google Fonts request that
// was removed from index.html — keep them self-hosted so portfolio
// "Display" / "Code" themes still render correctly.
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/fira-code/400.css";
import "@fontsource/fira-code/700.css";
import { createRoot } from "react-dom/client";
import { registerSW } from 'virtual:pwa-register';
import { Capacitor } from '@capacitor/core';
import App from "./App.tsx";
import "./index.css";
import { reportWebVitals } from "./lib/reportWebVitals";
import { initMonitoring, captureError } from "./lib/monitoring";

// Initialize error tracking as early as possible, before any React code runs.
// Requires VITE_SENTRY_DSN to be set in environment secrets.
initMonitoring();

console.log('🚀 WiseResume App Starting...', Date.now());
console.log('Environment:', {
  mode: import.meta.env.MODE,
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ? 'configured' : 'missing',
  isNative: Capacitor.isNativePlatform(),
  sentry: import.meta.env.VITE_SENTRY_DSN ? 'configured' : 'disabled',
});

// Tag body for native-specific CSS overrides (e.g. disable backdrop-blur)
if (Capacitor.isNativePlatform()) {
  document.body.classList.add('native-app');
}

// Global error handler — captured by Sentry in production.
// Log message + stack explicitly: Error instances serialize to {} in JSON-based
// log collectors because their properties (message, stack) are non-enumerable.
window.addEventListener('error', (event) => {
  const err = event.error;
  const detail = err instanceof Error
    ? `${err.name}: ${err.message}\n${err.stack ?? ''}`
    : String(err);
  console.error('Global Error:', detail);
  captureError(err, { source: 'window.onerror' });
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const detail = reason instanceof Error
    ? `${reason.name}: ${reason.message}\n${reason.stack ?? ''}`
    : String(reason);
  console.error('Unhandled Promise Rejection:', detail);
  captureError(reason, { source: 'unhandledrejection' });
});

try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error('Root element not found!');
  }
  
  console.log('✅ Root element found, rendering app...');
  createRoot(rootElement).render(<App />);
  console.log('✅ App rendered successfully');
  
  reportWebVitals();
} catch (error) {
  console.error('❌ Failed to render app:', error);
  const wrap = document.createElement('div');
  wrap.setAttribute('style', 'padding:20px;font-family:sans-serif;background:#0a0a14;color:white;min-height:100vh');
  const h1 = document.createElement('h1');
  h1.textContent = '⚠️ App Initialization Error';
  const p = document.createElement('p');
  p.textContent = 'The app failed to start. Please check the console for details.';
  const pre = document.createElement('pre');
  pre.setAttribute('style', 'background:#1f2937;padding:15px;border-radius:8px;overflow:auto');
  pre.textContent = error instanceof Error ? error.message : String(error);
  const btn = document.createElement('button');
  btn.setAttribute('style', 'margin-top:20px;padding:10px 20px;background:#9E1B22;color:white;border:none;border-radius:8px;cursor:pointer');
  btn.textContent = 'Reload App';
  btn.addEventListener('click', () => location.reload());
  wrap.appendChild(h1);
  wrap.appendChild(p);
  wrap.appendChild(pre);
  wrap.appendChild(btn);
  document.body.innerHTML = '';
  document.body.appendChild(wrap);
}

const updateSW = registerSW({
  onNeedRefresh() {
    updateSW(true).then(() => {
      window.location.reload();
    });
  },
  onOfflineReady() {
    console.log('[SW] App ready for offline use');
  },
});
