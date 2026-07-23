import { Client, Databases, Query } from 'node-appwrite';

const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID =
  process.env.APPWRITE_PROJECT_ID ||
  process.env.VITE_APPWRITE_PROJECT_ID ||
  process.env.APPWRITE_FUNCTION_PROJECT_ID ||
  '';
const API_KEY = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || '';
const DATABASE_ID = 'main';
const COLLECTION_ID = 'broadcasts';
const MAX_VISIBLE_BROADCASTS = 20;

export type BroadcastSeverity = 'info' | 'warning' | 'critical';

export interface VisibleBroadcast {
  id: string;
  title: string;
  body: string;
  severity: BroadcastSeverity;
}

const VALID_SEVERITIES = new Set<BroadcastSeverity>(['info', 'warning', 'critical']);

export function sanitizeVisibleBroadcast(
  document: Record<string, unknown>,
  nowMs = Date.now(),
): VisibleBroadcast | null {
  if (document.active !== true) return null;

  const id = typeof document.$id === 'string' ? document.$id : '';
  const title = typeof document.title === 'string' ? document.title.trim() : '';
  const body = typeof document.body === 'string' ? document.body.trim() : '';
  if (!id || !title || !body) return null;

  if (document.expires_at !== null && document.expires_at !== undefined && document.expires_at !== '') {
    if (typeof document.expires_at !== 'string') return null;
    const expiresAtMs = Date.parse(document.expires_at);
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= nowMs) return null;
  }

  const severity = VALID_SEVERITIES.has(document.severity as BroadcastSeverity)
    ? (document.severity as BroadcastSeverity)
    : 'info';

  return { id, title, body, severity };
}

export function selectVisibleBroadcasts(
  documents: Record<string, unknown>[],
  nowMs = Date.now(),
): VisibleBroadcast[] {
  return [...documents]
    .sort((a, b) => {
      const bCreated = Date.parse(String(b.created_at || b.$createdAt || ''));
      const aCreated = Date.parse(String(a.created_at || a.$createdAt || ''));
      return (Number.isFinite(bCreated) ? bCreated : 0) - (Number.isFinite(aCreated) ? aCreated : 0);
    })
    .map((document) => sanitizeVisibleBroadcast(document, nowMs))
    .filter((broadcast): broadcast is VisibleBroadcast => broadcast !== null)
    .slice(0, MAX_VISIBLE_BROADCASTS);
}

export async function fetchVisibleBroadcastsFromDb(
  nowMs = Date.now(),
): Promise<VisibleBroadcast[]> {
  if (!API_KEY || !PROJECT_ID) {
    throw new Error('Broadcast service is not configured');
  }

  const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
  const databases = new Databases(client);
  const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
    Query.limit(100),
  ]);

  return selectVisibleBroadcasts(
    response.documents as unknown as Record<string, unknown>[],
    nowMs,
  );
}
