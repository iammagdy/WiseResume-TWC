import { createRoot } from "react-dom/client";
import { registerSW } from 'virtual:pwa-register';
import { Capacitor } from '@capacitor/core';
import App from "./App.tsx";
import "./index.css";
import { reportWebVitals } from "./lib/reportWebVitals";

console.log('🚀 WiseResume App Starting...', Date.now());
console.log('Environment:', {
  mode: import.meta.env.MODE,
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ? 'configured' : 'missing',
  isNative: Capacitor.isNativePlatform()
});

// Tag body for native-specific CSS overrides (e.g. disable backdrop-blur)
if (Capacitor.isNativePlatform()) {
  document.body.classList.add('native-app');
}

// Global error handler
window.addEventListener('error', (event) => {
  console.error('❌ Global Error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Unhandled Promise Rejection:', event.reason);
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
      <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #6366f1; color: white; border: none; border-radius: 8px; cursor: pointer;">
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
