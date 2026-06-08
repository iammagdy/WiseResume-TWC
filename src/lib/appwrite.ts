import { Client, Account, Databases, Functions, Storage, ID, Query, Permission, Role } from 'appwrite';

// 1. Environment Config
const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID || '';

// 2. Initialize Client
export const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID);

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
