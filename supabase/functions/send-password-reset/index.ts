/**
 * send-password-reset — Public edge function for branded password reset emails.
 *
 * POST body: { email: string }
 *
 * Flow:
 *   1. Look up the user's kinde_sub via token_exchanges (joined with profiles).
 *   2. Obtain a Kinde Management API M2M token (client_credentials).
 *   3. Call POST /api/v1/users/{kinde_sub}/password_reset to generate a
 *      tokenized Kinde password reset link. Kinde returns the reset URL in the
 *      response body (it does NOT send its own email for this API call).
 *   4. Inject the Kinde reset link into the branded recovery.tsx template and
 *      send via Resend.
 *   5. Always return { success: true } — prevents email enumeration.
 *
 * Required env vars:
 *   SUPABASE_URL / EXT_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   KINDE_DOMAIN          — e.g. https://thewisecloud.kinde.com
 *   KINDE_M2M_CLIENT_ID   — M2M app client ID with manage:users scope
 *   KINDE_M2M_CLIENT_SECRET
 *   RESEND_API_KEY
 *   SITE_URL (optional)
 */

import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/render@0.0.17'
import { getCorsHeaders } from '../_shared/cors.ts'
import { getServiceClient } from '../_shared/dbClient.ts'

import { wrapHandler } from '../_shared/fnLogger.ts';
const SITE_NAME = 'WiseResume'
const SITE_URL = 'https://resume.thewise.cloud'
const RESEND_FROM = 'WiseResume <noreply@thewise.cloud>'

function json(data: unknown, status = 200, cors: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

/** Obtain a Kinde Management API access token via client_credentials. */
async function getKindeM2MToken(
  kindeDomain: string,
  clientId: string,
  clientSecret: string,
): Promise<string | null> {
  try {
    const res = await fetch(`${kindeDomain}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        audience: `${kindeDomain}/api`,
      }).toString(),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error(`[send-password-reset] Kinde M2M token error ${res.status}: ${text}`)
      return null
    }
    const data = await res.json() as { access_token?: string }
    return data.access_token ?? null
  } catch (err) {
    console.error('[send-password-reset] Kinde M2M token fetch failed:', err)
    return null
  }
}

/**
 * Generate a password reset link via Kinde Management API.
 *
 * Calls POST /api/v1/users/{kinde_sub}/password_reset which returns a
 * tokenized reset URL. Kinde does NOT send its own reset email for this call —
 * it only returns the link, which we embed in our branded recovery.tsx email.
 *
 * Returns the reset URL string, or null if the user was not found or the
 * API call failed.
 */
async function generateKindeResetLink(
  kindeDomain: string,
  m2mToken: string,
  kindeSub: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      `${kindeDomain}/api/v1/users/${encodeURIComponent(kindeSub)}/password_reset`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${m2mToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({}),
      },
    )

    if (res.status === 404) {
      console.warn(`[send-password-reset] Kinde user not found: ${kindeSub}`)
      return null
    }

    if (!res.ok) {
      const text = await res.text().catch(() => res.status.toString())
      console.error(`[send-password-reset] Kinde password_reset error ${res.status}: ${text}`)
      return null
    }

    // Kinde returns the tokenized reset link in the response body.
    // Field name may be `link`, `reset_link`, or `url` depending on API version.
    const data = await res.json() as Record<string, unknown>
    const resetLink =
      (data.link as string | undefined) ||
      (data.reset_link as string | undefined) ||
      (data.url as string | undefined)

    if (resetLink) {
      console.log(`[send-password-reset] Kinde reset link generated for ${kindeSub}`)
      return resetLink
    }

    // If no link in body, the API may have a different response format.
    // Log the full response so ops can debug, then return null.
    console.warn(
      `[send-password-reset] Kinde password_reset returned 2xx but no link field. Body: ${JSON.stringify(data)}`,
    )
    return null
  } catch (err) {
    console.error('[send-password-reset] Kinde generateResetLink failed:', err)
    return null
  }
}

Deno.serve(wrapHandler("send-password-reset", async (req) => {
  const origin = req.headers.get('origin')
  const cors = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, cors)

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')?.trim()
  const KINDE_DOMAIN = Deno.env.get('KINDE_DOMAIN')?.trim()
  const KINDE_M2M_CLIENT_ID = Deno.env.get('KINDE_M2M_CLIENT_ID')?.trim()
  const KINDE_M2M_CLIENT_SECRET = Deno.env.get('KINDE_M2M_CLIENT_SECRET')?.trim()
  const siteUrl = Deno.env.get('SITE_URL')?.trim() || SITE_URL

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400, cors)
  }

  const email = (body.email as string | undefined)?.trim().toLowerCase()
  if (!email) return json({ error: 'email is required' }, 400, cors)

  // Always respond with success to prevent email enumeration.
  const safeSuccess = () => json({ success: true }, 200, cors)

  if (!RESEND_API_KEY) {
    console.error('[send-password-reset] RESEND_API_KEY not configured — cannot send email')
    return safeSuccess()
  }

  if (!KINDE_DOMAIN || !KINDE_M2M_CLIENT_ID || !KINDE_M2M_CLIENT_SECRET) {
    console.error('[send-password-reset] Kinde M2M env vars not configured — cannot generate reset link')
    return safeSuccess()
  }

  try {
    const serviceClient = getServiceClient()

    // ── Step 1: Look up user in DB and retrieve their kinde_sub ──────────────
    const { data: profileRow } = await serviceClient
      .from('profiles')
      .select('user_id')
      .or(`contact_email.eq.${email},email.eq.${email}`)
      .single()

    if (!profileRow?.user_id) {
      console.warn('[send-password-reset] no profile found for email — silently returning success')
      return safeSuccess()
    }

    const userId = profileRow.user_id as string

    // Find the most recent kinde_sub from token_exchanges for this user.
    const { data: tokenRow } = await serviceClient
      .from('token_exchanges')
      .select('kinde_sub')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const kindeSub = tokenRow?.kinde_sub as string | undefined

    if (!kindeSub) {
      // Account predates token_exchanges or is an SSO-only account.
      console.warn('[send-password-reset] no kinde_sub for user — cannot generate Kinde reset link')
      return safeSuccess()
    }

    // ── Step 2: Get Kinde M2M token ───────────────────────────────────────────
    const m2mToken = await getKindeM2MToken(KINDE_DOMAIN, KINDE_M2M_CLIENT_ID, KINDE_M2M_CLIENT_SECRET)
    if (!m2mToken) {
      console.error('[send-password-reset] Failed to obtain Kinde M2M token — aborting')
      return safeSuccess()
    }

    // ── Step 3: Generate a tokenized reset link via Kinde Management API ─────
    const resetLink = await generateKindeResetLink(KINDE_DOMAIN, m2mToken, kindeSub)
    if (!resetLink) {
      // User not found in Kinde or API error — return success silently.
      console.warn('[send-password-reset] Could not generate Kinde reset link — aborting email send')
      return safeSuccess()
    }

    // ── Step 4: Send branded recovery email via Resend ────────────────────────
    // The tokenized Kinde reset link takes the user directly to Kinde's password
    // reset screen (no login required) where they enter and confirm a new password.
    const { RecoveryEmail } = await import('../_shared/email-templates/recovery.tsx')
    const props = { siteName: SITE_NAME, confirmationUrl: resetLink }
    const html = await renderAsync(React.createElement(RecoveryEmail, props))
    const text = await renderAsync(React.createElement(RecoveryEmail, props), { plainText: true })

    const sendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [email],
        subject: 'Reset your WiseResume password',
        html,
        text,
      }),
    })

    if (!sendRes.ok) {
      const errText = await sendRes.text().catch(() => sendRes.status.toString())
      console.error(`[send-password-reset] Resend error ${sendRes.status}: ${errText}`)
    } else {
      console.log(`[send-password-reset] sent Kinde reset link email to ${email}`)
    }
  } catch (err) {
    console.error('[send-password-reset] unexpected error:', err)
  }

  return safeSuccess()
}))
