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

type ResendContact = { id: string; email: string; first_name?: string; last_name?: string; unsubscribed?: boolean }

/**
 * List ALL contacts in a Resend audience, paginating until exhausted.
 *
 * Resend's contact list endpoint (`GET /audiences/{id}/contacts`) returns
 * `{ object: "list", data: [...] }`. The API does not document a pagination
 * cursor or `page` parameter — the response contains all contacts in one
 * payload (subject to Resend's internal limits, typically up to 50 000).
 * We request once and return the full set; if Resend ever adds cursor-based
 * pagination the `next` field will be present and we follow it here.
 *
 * Returns an empty array on any error.
 */
export async function listContacts(
  audienceId: string | null | undefined,
): Promise<ResendContact[]> {
  if (!audienceId) return [];
  const apiKey = getApiKey();
  if (!apiKey) return [];

  const allContacts: ResendContact[] = [];
  let url: string | null = `${RESEND_API_BASE}/audiences/${audienceId}/contacts`;

  while (url) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        console.warn(`[resendAudiences] listContacts ${audienceId} → ${res.status}: ${text}`)
        break
      }

      const data = await res.json() as { data?: ResendContact[]; next?: string | null }
      const page = data.data ?? []
      allContacts.push(...page)

      // Follow cursor-based pagination if Resend ever exposes it.
      url = data.next ?? null
    } catch (err) {
      console.error(`[resendAudiences] listContacts threw:`, err)
      break
    }
  }

  return allContacts
}

export interface BroadcastStats {
  id: string;
  name: string;
  status: string;
  sentAt: string | null;
  recipients: number | null;
  openRate: number | null;
  clickRate: number | null;
}

/**
 * Fetch recent email broadcasts from Resend with send metrics.
 *
 * Resend exposes broadcast-level stats (open rate, click rate, recipients, etc.)
 * via `GET /broadcasts`. Automation-triggered emails do NOT appear here —
 * those metrics are only available in the Resend dashboard UI.
 *
 * This function surfaces the closest available send data from the Resend API.
 * Returns the most recent `limit` broadcasts (default 5), sorted by sent date.
 * Returns an empty array on any error or when RESEND_API_KEY is not set.
 */
export async function listRecentBroadcasts(limit = 5): Promise<BroadcastStats[]> {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  try {
    const res = await fetch(`${RESEND_API_BASE}/broadcasts`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.warn(`[resendAudiences] listRecentBroadcasts → ${res.status}: ${text}`);
      return [];
    }

    const data = await res.json() as {
      data?: Array<{
        id: string;
        name?: string;
        status?: string;
        sent_at?: string | null;
        stats?: {
          recipients?: number;
          open_rate?: number;
          click_rate?: number;
        };
      }>;
    };

    const broadcasts = (data.data ?? [])
      .filter((b) => b.status === 'sent' || b.sent_at)
      .sort((a, b) => {
        const ta = a.sent_at ? new Date(a.sent_at).getTime() : 0;
        const tb = b.sent_at ? new Date(b.sent_at).getTime() : 0;
        return tb - ta; // newest first
      })
      .slice(0, limit);

    return broadcasts.map((b) => ({
      id: b.id,
      name: b.name ?? 'Broadcast',
      status: b.status ?? 'unknown',
      sentAt: b.sent_at ?? null,
      recipients: b.stats?.recipients ?? null,
      openRate: b.stats?.open_rate ?? null,
      clickRate: b.stats?.click_rate ?? null,
    }));
  } catch (err) {
    console.error('[resendAudiences] listRecentBroadcasts threw:', err);
    return [];
  }
}
