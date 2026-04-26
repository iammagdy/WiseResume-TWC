/**
 * send-password-reset — Public edge function for branded password reset emails.
 *
 * POST body: { email: string }
 *
 * Flow:
 *   1. Look up the user's Supabase shadow-user UUID by email.
 *   2. Generate a Supabase recovery link via auth.admin.generateLink.
 *   3. Send the branded recovery.tsx email via Resend.
 *   4. Always return { success: true } to avoid email enumeration.
 *
 * This resets the user's Supabase shadow-user password. For Kinde-managed
 * email/password users, the reset link arrives in our branded template and
 * redirects through Supabase's recovery flow.
 *
 * Required env vars:
 *   SUPABASE_URL / EXT_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   RESEND_API_KEY
 *   SITE_URL (optional)
 *
 * Rate limiting: rely on Supabase Auth's own rate limits for generateLink.
 * This endpoint is intentionally public (no auth required) — safe because
 * we always return { success: true } regardless of whether the email exists.
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

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const cors = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, cors)

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')?.trim()
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

    // Generate a Supabase recovery link for the shadow user.
    const { data: linkData, error: linkErr } = await serviceClient.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${siteUrl}/auth/reset-password`,
      },
    })

    if (linkErr || !linkData?.properties?.action_link) {
      // User may not exist — return success silently.
      console.warn('[send-password-reset] generateLink failed (user may not exist):', linkErr?.message)
      return safeSuccess()
    }

    const confirmationUrl = linkData.properties.action_link

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
      console.log(`[send-password-reset] sent reset email to ${email}`)
    }
  } catch (err) {
    // Non-fatal — return success to prevent enumeration.
    console.error('[send-password-reset] unexpected error:', err)
  }

  return safeSuccess()
})
