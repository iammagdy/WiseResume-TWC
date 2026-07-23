import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchVisibleBroadcastsFromDb } from '../server/broadcastsFetch.js';

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID =
  process.env.APPWRITE_PROJECT_ID ||
  process.env.VITE_APPWRITE_PROJECT_ID ||
  process.env.APPWRITE_FUNCTION_PROJECT_ID ||
  '';

async function hasValidAppwriteSession(jwt: string): Promise<boolean> {
  if (!APPWRITE_PROJECT_ID) return false;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(`${APPWRITE_ENDPOINT}/account`, {
      headers: {
        'X-Appwrite-Project': APPWRITE_PROJECT_ID,
        'X-Appwrite-JWT': jwt,
      },
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const jwt = req.headers['x-appwrite-jwt'];
  if (!jwt || typeof jwt !== 'string' || !(await hasValidAppwriteSession(jwt))) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    const broadcasts = await fetchVisibleBroadcastsFromDb();
    return res.status(200).json({ broadcasts });
  } catch (error) {
    console.error(
      '[broadcasts] Failed to load visible broadcasts',
      error instanceof Error ? error.message : 'unknown error',
    );
    return res.status(500).json({ error: 'server_error' });
  }
}
