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

// Global error handler — captured by Sentry in production
window.addEventListener('error', (event) => {
  console.error('Global Error:', event.error);
  captureError(event.error, { source: 'window.onerror' });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Promise Rejection:', event.reason);
  captureError(event.reason, { source: 'unhandledrejection' });
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
  // Display error on screen
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: sans-serif; background: #0a0a14; color: white; min-height: 100vh;">
      <h1>⚠️ App Initialization Error</h1>
      <p>The app failed to start. Please check the console for details.</p>
      <pre style="background: #1f2937; padding: 15px; border-radius: 8px; overflow: auto;">${error instanceof Error ? error.message : String(error)}</pre>
      <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #9E1B22; color: white; border: none; border-radius: 8px; cursor: pointer;">
        Reload App
      </button>
    </div>
  `;
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
