import { Client, Account, Databases, Functions, Storage, ID, Query, Permission, Role } from 'appwrite';

// 1. Environment Config
function sanitizeEndpoint(endpoint: string): string {
  if (!endpoint) return 'https://fra.cloud.appwrite.io/v1';
  let clean = endpoint.trim();
  // On HTTPS web pages (e.g. https://resume.thewise.cloud), enforce https:// to ensure wss:// is used for WebSockets.
  // Using http:// on an https:// site produces ws:// which triggers SecurityError: The operation is insecure in WebKit/browsers.
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && clean.startsWith('http://')) {
    clean = clean.replace(/^http:\/\//i, 'https://');
  }
  return clean;
}

const RAW_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const APPWRITE_ENDPOINT = sanitizeEndpoint(RAW_ENDPOINT);
const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID || '';

// 2. Initialize Client
export const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID);

// 2b. Harden Realtime WebSocket creation against DOMException (SecurityError: The operation is insecure)
// WebKit / Chrome Mobile iOS throws DOMException code 18 if WebSockets are restricted or insecure.
const realtime = (client as any).realtime;
if (realtime) {
  if (typeof realtime.createSocket === 'function') {
    const originalCreateSocket = realtime.createSocket.bind(realtime);
    realtime.createSocket = () => {
      try {
        originalCreateSocket();
      } catch (err) {
        console.warn('[Appwrite Realtime] WebSocket connection suppressed security/network error:', err);
      }
    };
  }

  if (typeof realtime.connect === 'function') {
    const originalConnect = realtime.connect.bind(realtime);
    realtime.connect = () => {
      try {
        originalConnect();
      } catch (err) {
        console.warn('[Appwrite Realtime] WebSocket connect suppressed security/network error:', err);
      }
    };
  }
}

// Wrap client.subscribe to guarantee calling client.subscribe never throws synchronously
const originalSubscribe = client.subscribe.bind(client);
client.subscribe = (...args: Parameters<typeof originalSubscribe>) => {
  try {
    return originalSubscribe(...args);
  } catch (err) {
    console.warn('[Appwrite Realtime] client.subscribe failed to initialize realtime socket:', err);
    return () => {};
  }
};

// 3. Export Global Instances
export const account = new Account(client);
export const databases = new Databases(client);
export const functions = new Functions(client);
export const storage = new Storage(client);

// Helper for Database ID
export const DATABASE_ID = 'main';

// 4. Export Appwrite Types/Utilities for convenience
export { ID, Query, Permission, Role };

export const isAppwriteEnabled = !!APPWRITE_PROJECT_ID && !!APPWRITE_ENDPOINT;

if (import.meta.env.DEV) {
  console.log('--- [Appwrite Universal Client] ---');
  console.log('Status:', isAppwriteEnabled ? 'CONNECTED ✅' : 'NOT CONFIGURED ❌');
}

