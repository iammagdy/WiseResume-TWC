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
import App from "./App.tsx";
import "./index.css";
import { reportWebVitals } from "./lib/reportWebVitals";
/* Sentry (and its browserTracing + replay integrations) is heavy. Loading
   it synchronously here adds it to the entry chunk's modulepreload graph
   AND blocks first paint while Sentry.init() runs. We defer it to after
   createRoot — errors in that ~1-frame window are caught by the global
   handlers below via the dependency-free shim, buffered, and flushed once
   monitoring.ts loads and wires the real Sentry-backed capturer. */
import { captureError } from "./lib/captureErrorShim";
import { activityTracker } from "./lib/activityTracker";

console.log('🚀 WiseResume App Starting...', Date.now());
console.log('Environment:', {
  mode: import.meta.env.MODE,
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ? 'configured' : 'missing',
  sentry: import.meta.env.VITE_SENTRY_DSN ? 'configured' : 'disabled',
});

// Global error handler — captured by Sentry in production.
// Log message + stack explicitly: Error instances serialize to {} in JSON-based
// log collectors because their properties (message, stack) are non-enumerable.
window.addEventListener('error', (event) => {
  const err = event.error;
  const detail = err instanceof Error
    ? `${err.name}: ${err.message}\n${err.stack ?? ''}`
    : String(err ?? event.message ?? 'Unknown error');
  console.error('Global Error:', detail);
  captureError(err ?? event.message, { source: 'window.onerror' });
  if (err instanceof Error) {
    activityTracker.pushRecentError(err.message, err.stack);
  } else {
    const msg = typeof err === 'string' ? err : event.message;
    if (msg) activityTracker.pushRecentError(msg);
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const detail = reason instanceof Error
    ? `${reason.name}: ${reason.message}\n${reason.stack ?? ''}`
    : String(reason);
  console.error('Unhandled Promise Rejection:', detail);
  captureError(reason, { source: 'unhandledrejection' });
  if (reason instanceof Error) {
    activityTracker.pushRecentError(reason.message, reason.stack);
  } else if (typeof reason === 'string') {
    activityTracker.pushRecentError(reason);
  }
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

  /* Clear the lazyWithRetry one-shot reload guard once we've survived
     long enough to be confident the post-reload boot is stable. If a
     later chunk fetch fails (e.g. the user kept the tab open across
     another deploy) we want it to be allowed to silent-reload again. */
  setTimeout(() => {
    try { sessionStorage.removeItem('wr.chunk-reload-attempted'); } catch { /* private mode */ }
  }, 8000);

  /* Defer Sentry to idle so it doesn't compete with hero paint. The shim's
     buffer catches any errors that fire before this resolves; the real
     capturer is wired in via setRealCaptureError, then the buffer is
     drained through it. */
  const loadMonitoring = () => {
    void Promise.all([
      import("./lib/monitoring"),
      import("./lib/captureErrorShim"),
    ]).then(([mon, shim]) => {
      mon.initMonitoring();
      shim.setRealCaptureError(mon.captureError);
      shim.setRealCaptureFeedback(mon.captureFeedback);
      shim.setRealLastEventId(mon.getLastSentryEventId);
      while (shim.earlyCaptureBuffer.length > 0) {
        const entry = shim.earlyCaptureBuffer.shift();
        if (entry) mon.captureError(entry.err, entry.context);
      }
      while (shim.earlyFeedbackBuffer.length > 0) {
        const fb = shim.earlyFeedbackBuffer.shift();
        if (fb) mon.captureFeedback(fb);
      }
    }).catch(() => undefined);
  };
  type IdleWindow = Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number;
  };
  const w = window as IdleWindow;
  if (typeof w.requestIdleCallback === "function") {
    w.requestIdleCallback(loadMonitoring, { timeout: 2000 });
  } else {
    setTimeout(loadMonitoring, 1500);
  }
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

// PWA / service worker registration intentionally removed.
//
// The tombstone at /custom-sw.js handles cleanup for returning visitors
// whose previous service worker was registered AT that exact path. Some
// older builds registered the worker at a different scope (e.g. `/sw.js`
// from the Workbox era), so the tombstone never replaces those — the
// next visit can still be controlled by a stale SW that 404s on
// already-deleted chunk URLs and crashes the app on first load.
//
// As a belt-and-braces second line of defence (per
// docs/ops/pwa-removal-verification.md), unconditionally unregister
// every active service worker registration on boot. Wrapped in a guard
// so we never throw inside main.tsx — failure here must never prevent
// the app from rendering.
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((regs) => {
      for (const reg of regs) {
        // Fire-and-forget: a hung unregister must not delay first paint.
        reg.unregister().catch(() => undefined);
      }
    })
    .catch(() => undefined);
}
