import { useCallback } from 'react';
import { databases, DATABASE_ID, Query, ID } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';
import { useAuth } from './useAuth';

const TOOL_TTL_DAYS: Record<string, number> = {
  get_company_briefing: 7,
};

function normalizeCacheKey(key: string): string {
  return key.trim().toLowerCase().replace(/\s+/g, '_');
}

/**
 * Appwrite upsert pattern:
 * - Try to find the existing row by compound query.
 * - If found, updateDocument; if not, createDocument.
 * Appwrite does not have a native upsert operation.
 */
export function useToolCache() {
  const { user } = useAuth();

  const getCache = useCallback(async <T>(
    toolName: string,
    rawKey: string,
  ): Promise<T | null> => {
    if (!user) return null;
    const cacheKey = normalizeCacheKey(rawKey);
    try {
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.tool_cache, [
        Query.equal('user_id', user.id),
        Query.equal('tool_name', toolName),
        Query.equal('cache_key', cacheKey),
        Query.limit(1),
      ]);
      if (res.documents.length === 0) return null;
      const doc = res.documents[0] as unknown as Record<string, unknown>;
      const expiresAt = doc.expires_at as string;
      if (new Date(expiresAt) < new Date()) return null;
      const raw = doc.output;
      return (typeof raw === 'string' ? JSON.parse(raw) : raw) as T;
    } catch {
      return null;
    }
  }, [user]);

  const setCache = useCallback(async (
    toolName: string,
    rawKey: string,
    output: unknown,
  ): Promise<void> => {
    if (!user) return;
    const cacheKey = normalizeCacheKey(rawKey);
    const ttlDays = TOOL_TTL_DAYS[toolName] ?? 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + ttlDays);

    try {
      // Try to find existing document
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.tool_cache, [
        Query.equal('user_id', user.id),
        Query.equal('tool_name', toolName),
        Query.equal('cache_key', cacheKey),
        Query.limit(1),
      ]);

      const payload = {
        user_id: user.id,
        tool_name: toolName,
        cache_key: cacheKey,
        output: typeof output === 'string' ? output : JSON.stringify(output),
        expires_at: expiresAt.toISOString(),
      };

      if (res.documents.length > 0) {
        await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.tool_cache,
          res.documents[0].$id,
          payload,
        );
      } else {
        await databases.createDocument(DATABASE_ID, COLLECTIONS.tool_cache, ID.unique(), payload);
      }
    } catch {
      // Best-effort cache write — silently ignore failures
    }
  }, [user]);

  const deleteCache = useCallback(async (
    toolName: string,
    rawKey: string,
  ): Promise<void> => {
    if (!user) return;
    const cacheKey = normalizeCacheKey(rawKey);
    try {
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.tool_cache, [
        Query.equal('user_id', user.id),
        Query.equal('tool_name', toolName),
        Query.equal('cache_key', cacheKey),
        Query.limit(1),
      ]);
      if (res.documents.length > 0) {
        await databases.deleteDocument(DATABASE_ID, COLLECTIONS.tool_cache, res.documents[0].$id);
      }
    } catch {
      // Best-effort
    }
  }, [user]);

  const getCacheAge = useCallback(async (
    toolName: string,
    rawKey: string,
  ): Promise<number | null> => {
    if (!user) return null;
    const cacheKey = normalizeCacheKey(rawKey);
    try {
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.tool_cache, [
        Query.equal('user_id', user.id),
        Query.equal('tool_name', toolName),
        Query.equal('cache_key', cacheKey),
        Query.limit(1),
      ]);
      if (res.documents.length === 0) return null;
      const doc = res.documents[0] as unknown as Record<string, unknown>;
      const expiresAt = doc.expires_at as string;
      if (new Date(expiresAt) < new Date()) return null;
      const ageDays =
        (Date.now() - new Date(doc.$createdAt as string).getTime()) / (1000 * 60 * 60 * 24);
      return Math.floor(ageDays);
    } catch {
      return null;
    }
  }, [user]);

  return { getCache, setCache, deleteCache, getCacheAge };
}
