/**
 * admin-resend-sync — One-time / on-demand backfill of all existing users
 * into the "All Users" Resend Audience.
 *
 * Called from the DevKit "Email Automations" panel.
 * Requires admin auth (DEV_KIT_PASSWORD via requireAdminAuth).
 *
 * Pages through all profiles rows, skips placeholder emails and contacts
 * already in the audience (Resend upserts safely), and returns a summary.
 *
 * Required env vars:
 *   RESEND_API_KEY, RESEND_AUDIENCE_ALL_USERS
 *   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
 *   DEV_KIT_PASSWORD
 */

import { requireAdminAuth } from '../_shared/adminAuth.ts'
import { getCorsHeaders } from '../_shared/cors.ts'
import { getServiceClient } from '../_shared/dbClient.ts'
import { addContact } from '../_shared/resendAudiences.ts'
import { getAudienceId, AUDIENCE_KEYS } from '../_shared/resendConfig.ts'

const BATCH_SIZE = 50
const BATCH_DELAY_MS = 300

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const cors = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

  // Body is optional for this endpoint; discard without error.
  await req.json().catch(() => null);

  try {
    await requireAdminAuth(req)
  } catch (authErr) {
    if (authErr instanceof Response) return authErr
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const audienceId = getAudienceId(AUDIENCE_KEYS.ALL_USERS)
  if (!audienceId) {
    return new Response(
      JSON.stringify({ error: 'RESEND_AUDIENCE_ALL_USERS secret not configured' }),
      { status: 503, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }

  const supabase = getServiceClient()

  // Page through profiles to collect all real email addresses.
  const emails: Array<{ email: string; firstName?: string; lastName?: string }> = []
  let from = 0
  const PAGE = 1000

  while (true) {
    const { data, error } = await supabase
      .from('profiles')
      .select('contact_email, email, full_name')
      .range(from, from + PAGE - 1)

    if (error) {
      console.error('[admin-resend-sync] profiles fetch error:', error)
      break
    }
    if (!data || data.length === 0) break

    for (const row of data) {
      const email = (row.contact_email || row.email || '') as string
      if (!email || email.endsWith('@kinde.placeholder')) continue
      const parts = (row.full_name || '').trim().split(' ')
      emails.push({
        email,
        firstName: parts[0] || undefined,
        lastName: parts.slice(1).join(' ') || undefined,
      })
    }

    if (data.length < PAGE) break
    from += PAGE
  }

  // Deduplicate by email
  const seen = new Set<string>()
  const unique = emails.filter(({ email }) => {
    if (seen.has(email)) return false
    seen.add(email)
    return true
  })

  let added = 0
  let failed = 0

  // Upsert in batches with rate-limit delay
  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    const batch = unique.slice(i, i + BATCH_SIZE)
    await Promise.all(
      batch.map(async (contact) => {
        const ok = await addContact(audienceId, contact)
        if (ok) added++; else failed++
      }),
    )
    if (i + BATCH_SIZE < unique.length) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS))
    }
  }

  console.log(`[admin-resend-sync] done: ${added} added, ${failed} failed, ${unique.length} total`)

  return new Response(
    JSON.stringify({ success: true, total: unique.length, added, failed }),
    { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
  )
})
