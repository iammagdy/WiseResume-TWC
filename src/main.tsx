import { createRoot } from "react-dom/client";
import { registerSW } from 'virtual:pwa-register';
import { Capacitor } from '@capacitor/core';
import App from "./App.tsx";
import "./index.css";
import { reportWebVitals } from "./lib/reportWebVitals";

// Tag body for native-specific CSS overrides (e.g. disable backdrop-blur)
if (Capacitor.isNativePlatform()) {
  document.body.classList.add('native-app');
}

createRoot(document.getElementById("root")!).render(<App />);
reportWebVitals();

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
