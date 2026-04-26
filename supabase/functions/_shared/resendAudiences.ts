/**
 * Resend Audiences helper — typed wrappers around the Resend Audiences API.
 *
 * All functions are fire-and-forget safe: they log errors but never throw,
 * so callers can call them without wrapping in try/catch.
 *
 * Resend Audiences API reference:
 *   POST   /audiences/{id}/contacts         — create / upsert contact
 *   DELETE /audiences/{id}/contacts/{email} — remove contact
 *   GET    /audiences/{id}                  — audience metadata + contact count
 */

/**
 * Optional metadata for a Resend audience contact.
 * Mapped to Resend's supported contact fields (first_name, last_name, unsubscribed).
 * Reserved for future Resend API extensions (e.g. custom attributes) when supported.
 */
export interface AudienceContactMetadata {
  firstName?: string;
  lastName?: string;
  unsubscribed?: boolean;
}

export interface AudienceContactOptions {
  email: string;
  firstName?: string;
  lastName?: string;
  unsubscribed?: boolean;
  /** Additional typed metadata forwarded to Resend (firstName/lastName/unsubscribed). */
  metadata?: AudienceContactMetadata;
}

export interface AudienceStats {
  id: string;
  name: string;
  contactCount: number | null;
}

const RESEND_API_BASE = 'https://api.resend.com';

function getApiKey(): string | null {
  return Deno.env.get('RESEND_API_KEY')?.trim() || null;
}

/**
 * Add (or upsert) a contact to a Resend audience.
 * Skips silently when audienceId is null/empty or RESEND_API_KEY is not set.
 * Returns true on success, false on any error.
 */
export async function addContact(
  audienceId: string | null | undefined,
  opts: AudienceContactOptions,
): Promise<boolean> {
  if (!audienceId) return false;
  const apiKey = getApiKey();
  if (!apiKey) return false;

  try {
    // Merge top-level fields with metadata (top-level takes precedence).
    const meta = opts.metadata ?? {};
    const firstName = opts.firstName ?? meta.firstName;
    const lastName  = opts.lastName  ?? meta.lastName;
    const unsubscribed = opts.unsubscribed ?? meta.unsubscribed ?? false;

    const body: Record<string, unknown> = {
      email: opts.email,
      unsubscribed,
    };
    if (firstName) body.first_name = firstName;
    if (lastName)  body.last_name  = lastName;

    const res = await fetch(`${RESEND_API_BASE}/audiences/${audienceId}/contacts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.warn(`[resendAudiences] addContact ${audienceId} → ${res.status}: ${text}`)
      return false
    }

    return true
  } catch (err) {
    console.error(`[resendAudiences] addContact threw:`, err)
    return false
  }
}

/**
 * Remove a contact from a Resend audience by email.
 * Skips silently when audienceId is null/empty or RESEND_API_KEY is not set.
 * Returns true on success, false on any error or 404.
 */
export async function removeContact(
  audienceId: string | null | undefined,
  email: string,
): Promise<boolean> {
  if (!audienceId) return false;
  const apiKey = getApiKey();
  if (!apiKey) return false;

  try {
    const res = await fetch(
      `${RESEND_API_BASE}/audiences/${audienceId}/contacts/${encodeURIComponent(email)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${apiKey}` },
      },
    )

    if (res.status === 404) return true // already removed — treat as success
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.warn(`[resendAudiences] removeContact ${audienceId} → ${res.status}: ${text}`)
      return false
    }

    return true
  } catch (err) {
    console.error(`[resendAudiences] removeContact threw:`, err)
    return false
  }
}

/**
 * Fetch audience metadata (name + contact count) from Resend.
 * Returns null when audienceId is empty, RESEND_API_KEY is missing, or the
 * API call fails. Never throws.
 */
export async function getAudienceStats(
  audienceId: string | null | undefined,
): Promise<AudienceStats | null> {
  if (!audienceId) return null;
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const res = await fetch(`${RESEND_API_BASE}/audiences/${audienceId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.warn(`[resendAudiences] getAudienceStats ${audienceId} → ${res.status}: ${text}`)
      return null
    }

    const data = await res.json() as {
      id?: string
      name?: string
      contacts?: { total?: number }
    }

    return {
      id: data.id ?? audienceId,
      name: data.name ?? 'Unknown',
      contactCount: data.contacts?.total ?? null,
    }
  } catch (err) {
    console.error(`[resendAudiences] getAudienceStats threw:`, err)
    return null
  }
}

/**
 * List contacts in a Resend audience (up to the first page, max 100).
 * Returns an empty array on any error.
 */
export async function listContacts(
  audienceId: string | null | undefined,
): Promise<Array<{ id: string; email: string; first_name?: string; last_name?: string; unsubscribed?: boolean }>> {
  if (!audienceId) return [];
  const apiKey = getApiKey();
  if (!apiKey) return [];

  try {
    const res = await fetch(`${RESEND_API_BASE}/audiences/${audienceId}/contacts`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.warn(`[resendAudiences] listContacts ${audienceId} → ${res.status}: ${text}`)
      return []
    }

    const data = await res.json() as { data?: unknown[] }
    return (data.data ?? []) as ReturnType<typeof listContacts> extends Promise<infer T> ? T : never
  } catch (err) {
    console.error(`[resendAudiences] listContacts threw:`, err)
    return []
  }
}
