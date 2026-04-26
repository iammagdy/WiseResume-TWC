/**
 * admin-resend-stats — Returns live stats for all five Resend Audiences and
 * a contact lookup capability.
 *
 * Actions (POST body JSON):
 *
 *   { action: 'stats' }
 *     — Returns audience name + contact count for all configured audiences.
 *       Also returns `checklist` for the automation setup guide.
 *
 *   { action: 'lookup', email: string }
 *     — Returns which audiences the given email appears in (by scanning the
 *       first page of each audience's contact list).
 *
 *   { action: 'add', audienceKey: string, email: string }
 *     — Manually add a contact to an audience.
 *
 *   { action: 'remove', audienceKey: string, email: string }
 *     — Manually remove a contact from an audience.
 *
 * Requires admin auth (DEV_KIT_PASSWORD via requireAdminAuth).
 *
 * Required env vars:
 *   RESEND_API_KEY, RESEND_AUDIENCE_* (see resendConfig.ts)
 *   DEV_KIT_PASSWORD
 *
 * ── CONFIRMED API LIMITATION — per-automation send metrics ──────────────────
 * Resend's REST API (as of 2024-Q4) does NOT expose per-automation send
 * statistics (open rates, click rates, delivery counts, etc.) for Automation
 * workflows. The available `GET /audiences/{id}` endpoint returns only the
 * audience name and total contact count.
 *
 * Resend does expose send stats for one-off Broadcasts via `GET /broadcasts`,
 * but Automation workflows have no equivalent API surface.
 *
 * Resolution: email send metrics for Automation workflows must be viewed
 * directly in the Resend dashboard at https://resend.com/automations.
 * The DevKit panel links directly to that URL. This is an upstream API
 * limitation, not an implementation gap.
 * ────────────────────────────────────────────────────────────────────────────
 */

import { requireAdminAuth } from '../_shared/adminAuth.ts'
import { getCorsHeaders } from '../_shared/cors.ts'
import { addContact, removeContact, getAudienceStats, listContacts, listRecentBroadcasts } from '../_shared/resendAudiences.ts'
import { getAudienceId, AUDIENCE_KEYS, AUDIENCE_LABELS, AUTOMATION_CHECKLIST } from '../_shared/resendConfig.ts'

type AudienceKey = keyof typeof AUDIENCE_KEYS

const ALL_AUDIENCE_KEYS = Object.keys(AUDIENCE_KEYS) as AudienceKey[]

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const cors = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch { /* empty body ok */ }

  try {
    await requireAdminAuth(req)
  } catch (authErr) {
    if (authErr instanceof Response) return authErr
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const action = (body.action as string | undefined) ?? 'stats'

  // ── action: stats ─────────────────────────────────────────────────────────
  if (action === 'stats') {
    // Fetch audience stats and recent broadcasts in parallel.
    // NOTE: Resend's REST API does not expose per-automation send metrics.
    // `recentBroadcasts` surfaces send stats for one-off broadcast campaigns
    // (the closest available API data). Automation email stats are only
    // accessible in the Resend dashboard (https://resend.com/automations).
    const [statsResults, recentBroadcasts] = await Promise.all([
      Promise.all(
        ALL_AUDIENCE_KEYS.map(async (key) => {
          const envKey = AUDIENCE_KEYS[key]
          const audienceId = getAudienceId(envKey)
          const label = AUDIENCE_LABELS[envKey] ?? key
          if (!audienceId) {
            return { key, label, configured: false, id: null, contactCount: null }
          }
          const stats = await getAudienceStats(audienceId)
          return {
            key,
            label,
            configured: true,
            id: audienceId,
            contactCount: stats?.contactCount ?? null,
            name: stats?.name ?? label,
          }
        }),
      ),
      listRecentBroadcasts(5),
    ])

    return new Response(
      JSON.stringify({
        success: true,
        audiences: statsResults,
        checklist: AUTOMATION_CHECKLIST,
        recentBroadcasts,
        broadcastsNote: 'Resend API does not expose per-automation send metrics. recentBroadcasts shows one-off campaign stats only. View automation email stats at https://resend.com/automations.',
      }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }

  // ── action: lookup ────────────────────────────────────────────────────────
  if (action === 'lookup') {
    const email = (body.email as string | undefined)?.trim().toLowerCase()
    if (!email) {
      return new Response(JSON.stringify({ error: 'email is required' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const foundIn: string[] = []

    await Promise.all(
      ALL_AUDIENCE_KEYS.map(async (key) => {
        const envKey = AUDIENCE_KEYS[key]
        const audienceId = getAudienceId(envKey)
        if (!audienceId) return
        const contacts = await listContacts(audienceId)
        const match = contacts.find(
          (c) => (c.email ?? '').toLowerCase() === email,
        )
        if (match) foundIn.push(AUDIENCE_LABELS[envKey] ?? key)
      }),
    )

    return new Response(
      JSON.stringify({ success: true, email, foundIn }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }

  // ── action: add ───────────────────────────────────────────────────────────
  if (action === 'add') {
    const audienceKey = (body.audienceKey as string | undefined)?.trim()
    const email = (body.email as string | undefined)?.trim().toLowerCase()
    const firstName = (body.firstName as string | undefined)?.trim() || undefined

    if (!audienceKey || !email) {
      return new Response(JSON.stringify({ error: 'audienceKey and email are required' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const audienceId = getAudienceId(audienceKey as Parameters<typeof getAudienceId>[0])
    if (!audienceId) {
      return new Response(
        JSON.stringify({ error: `Audience ${audienceKey} not configured` }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const ok = await addContact(audienceId, { email, firstName })
    return new Response(
      JSON.stringify({ success: ok }),
      { status: ok ? 200 : 502, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }

  // ── action: remove ────────────────────────────────────────────────────────
  if (action === 'remove') {
    const audienceKey = (body.audienceKey as string | undefined)?.trim()
    const email = (body.email as string | undefined)?.trim().toLowerCase()

    if (!audienceKey || !email) {
      return new Response(JSON.stringify({ error: 'audienceKey and email are required' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const audienceId = getAudienceId(audienceKey as Parameters<typeof getAudienceId>[0])
    if (!audienceId) {
      return new Response(
        JSON.stringify({ error: `Audience ${audienceKey} not configured` }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const ok = await removeContact(audienceId, email)
    return new Response(
      JSON.stringify({ success: ok }),
      { status: ok ? 200 : 502, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), {
    status: 400,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
})
