import { databases, DATABASE_ID, Query, ID } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';

/** Upsert core identity fields on the profiles row (never overwrites an existing full_name). */
export async function upsertProfileIdentity({
  userId,
  email,
  fullName,
}: {
  userId: string;
  email?: string | null;
  fullName?: string | null;
}): Promise<string | null> {
  const trimmedName = fullName?.trim() || '';
  const normalizedEmail = email?.trim().toLowerCase() || '';

  const existing = await databases.listDocuments(DATABASE_ID, COLLECTIONS.profiles, [
    Query.equal('user_id', userId),
    Query.limit(1),
  ]);

  if (existing.documents.length > 0) {
    const doc = existing.documents[0];
    const updates: Record<string, unknown> = {};
    if (trimmedName && !doc.full_name) updates.full_name = trimmedName;
    if (trimmedName && !doc.display_name) updates.display_name = trimmedName;
    if (normalizedEmail && !doc.email) updates.email = normalizedEmail;

    if (Object.keys(updates).length > 0) {
      try {
        await databases.updateDocument(DATABASE_ID, COLLECTIONS.profiles, doc.$id, updates);
      } catch (err) {
        // If writing display_name fails (e.g. schema restriction), retry without it
        if (updates.display_name) {
          console.warn('[profileSeed] Failed to write display_name, retrying with full_name only:', err);
          delete updates.display_name;
          if (Object.keys(updates).length > 0) {
            await databases.updateDocument(DATABASE_ID, COLLECTIONS.profiles, doc.$id, updates);
          }
        } else {
          throw err;
        }
      }
    }
    return doc.$id as string;
  }

  try {
    const created = await databases.createDocument(DATABASE_ID, COLLECTIONS.profiles, ID.unique(), {
      user_id: userId,
      email: normalizedEmail || null,
      ...(trimmedName ? { full_name: trimmedName, display_name: trimmedName } : {}),
    });
    return created.$id as string;
  } catch (err) {
    if (trimmedName) {
      console.warn('[profileSeed] Failed to create with display_name, retrying with full_name only:', err);
      try {
        const created = await databases.createDocument(DATABASE_ID, COLLECTIONS.profiles, ID.unique(), {
          user_id: userId,
          email: normalizedEmail || null,
          full_name: trimmedName,
        });
        return created.$id as string;
      } catch (retryErr) {
        throw retryErr;
      }
    }
    throw err;
  }
}
