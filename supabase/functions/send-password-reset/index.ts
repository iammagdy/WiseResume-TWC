/**
 * send-password-reset — Public edge function for branded password reset emails.
 *
 * POST body: { email: string }
 *
 * Flow:
 *   1. Look up the user's kinde_sub via token_exchanges (joined with profiles).
 *   2. Verify the user exists in Kinde via Management API M2M token.
 *   3. Construct a Kinde-hosted login URL with login_hint so the user lands
 *      on Kinde's own reset flow — this resets the REAL Kinde credential, not
 *      the Supabase shadow-user password.
 *   4. Send the branded recovery.tsx email via Resend.
 *   5. Always return { success: true } to avoid email enumeration.
 *
 * Required env vars:
 *   SUPABASE_URL / EXT_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   KINDE_DOMAIN          — e.g. https://thewisecloud.kinde.com
 *   KINDE_M2M_CLIENT_ID   — M2M app client ID with read:users scope
 *   KINDE_M2M_CLIENT_SECRET
 *   RESEND_API_KEY
 *   SITE_URL (optional)
 */

import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { getCorsHeaders } from '../_shared/cors.ts'
import { getServiceClient } from '../_shared/dbClient.ts'

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

/** Verify a Kinde user exists by kinde_sub via the Management API. */
async function verifyKindeUser(
  kindeDomain: string,
  m2mToken: string,
  kindeSub: string,
): Promise<boolean> {
  try {
    const res = await fetch(
      `${kindeDomain}/api/v1/users/${encodeURIComponent(kindeSub)}`,
      {
        headers: {
          Authorization: `Bearer ${m2mToken}`,
          Accept: 'application/json',
        },
      },
    )
    return res.ok
  } catch {
    return false
  }
}

Deno.serve(async (req) => {
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
    console.error('[send-password-reset] RESEND_API_KEY not configured')
    return safeSuccess()
  }

  try {
    const serviceClient = getServiceClient()

    // ── Step 1: Look up user in DB and retrieve their kinde_sub ──────────────
    // Profiles stores contact_email; token_exchanges stores the kinde_sub keyed
    // by user_id. We join them to get the Kinde identity.
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

    // ── Step 2: Verify user in Kinde via Management API ───────────────────────
    // This ensures the password reset link targets a real Kinde credential.
    if (kindeSub && KINDE_DOMAIN && KINDE_M2M_CLIENT_ID && KINDE_M2M_CLIENT_SECRET) {
      const m2mToken = await getKindeM2MToken(KINDE_DOMAIN, KINDE_M2M_CLIENT_ID, KINDE_M2M_CLIENT_SECRET)
      if (m2mToken) {
        const exists = await verifyKindeUser(KINDE_DOMAIN, m2mToken, kindeSub)
        if (!exists) {
          console.warn(`[send-password-reset] Kinde user not found for sub=${kindeSub}`)
          return safeSuccess()
        }
        console.log(`[send-password-reset] Kinde user verified for sub=${kindeSub}`)
      } else {
        console.warn('[send-password-reset] Could not get Kinde M2M token — proceeding without Kinde verification')
      }
    } else if (!kindeSub) {
      console.warn('[send-password-reset] No kinde_sub found in token_exchanges — proceeding without Kinde verification')
    } else {
      console.warn('[send-password-reset] Kinde M2M env vars missing — skipping Kinde verification')
    }

    // ── Step 3: Construct Kinde-hosted reset URL ──────────────────────────────
    // Direct the user to Kinde's own login/reset flow so they reset their
    // actual Kinde credential (not a Supabase shadow-user password).
    // The login_hint pre-fills their email on Kinde's hosted login page where
    // they can use the "Forgot Password" option.
    let confirmationUrl: string
    if (KINDE_DOMAIN) {
      const params = new URLSearchParams({
        login_hint: email,
        redirect_uri: siteUrl,
        lang: 'default',
      })
      confirmationUrl = `${KINDE_DOMAIN}/login?${params.toString()}`
    } else {
      confirmationUrl = `${siteUrl}/auth?mode=login`
    }

    // ── Step 4: Send branded recovery email via Resend ────────────────────────
    const { RecoveryEmail } = await import('../_shared/email-templates/recovery.tsx')
    const props = { siteName: SITE_NAME, confirmationUrl }
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
      console.log(`[send-password-reset] sent Kinde reset email to ${email}`)
    }
  } catch (err) {
    console.error('[send-password-reset] unexpected error:', err)
  }

  return safeSuccess()
})
