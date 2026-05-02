/**
 * verify-email — Custom email verification for WiseResume's Kinde-to-Supabase bridge.
 *
 * Actions (POST body JSON):
 *
 *   { action: 'send', user_id, email, first_name? }
 *     — Generates a token, inserts it into email_verification_tokens, and sends
 *       the branded signup.tsx verification email via Resend.
 *       Requires: Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
 *       Called by: kinde-webhook (fire-and-forget after provisioning)
 *
 *   { action: 'resend' }
 *     — Re-sends the verification email for the currently authenticated user.
 *       Requires: Authorization: Bearer <user-supabase-jwt>
 *       Called by: AuthVerifyEmailPage (resend button)
 *
 *   { action: 'confirm', token }
 *     — Validates the token, marks email_verified = true, and sends the
 *       branded welcome.tsx email. No auth required (public confirmation link).
 *       Called by: AuthVerifyEmailPage (on mount when ?token=... is present)
 *
 * Required env vars:
 *   SUPABASE_URL / EXT_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   RESEND_API_KEY
 *   SITE_URL (optional, defaults to https://resume.thewise.cloud)
 */

import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { getCorsHeaders } from '../_shared/cors.ts'
import { getServiceClient } from '../_shared/dbClient.ts'
import { addContact } from '../_shared/resendAudiences.ts'
import { getAudienceId, AUDIENCE_KEYS } from '../_shared/resendConfig.ts'

import { wrapHandler } from '../_shared/fnLogger.ts';
const SITE_NAME = 'WiseResume'
const SITE_URL = 'https://resume.thewise.cloud'
const TOKEN_TTL_HOURS = 24
const RESEND_FROM = 'WiseResume <noreply@thewise.cloud>'

function json(data: unknown, status = 200, cors: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

async function sendResendEmail(opts: {
  to: string
  subject: string
  html: string
  text: string
  apiKey: string
}): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    }),
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => res.status.toString())
    throw new Error(`Resend error ${res.status}: ${errText}`)
  }
}

/** Generate a 36-char UUID token for the verification link. */
function generateToken(): string {
  return crypto.randomUUID()
}

/**
 * Upsert a verification token for the given user.
 * Marks any existing unused tokens as expired before inserting the new one.
 */
async function upsertToken(
  serviceClient: ReturnType<typeof getServiceClient>,
  userId: string,
): Promise<string> {
  // Invalidate old tokens for this user (set expires_at to now).
  await serviceClient
    .from('email_verification_tokens')
    .update({ expires_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('used_at', null)

  const token = generateToken()
  const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000).toISOString()

  const { error } = await serviceClient
    .from('email_verification_tokens')
    .insert({ user_id: userId, token, expires_at: expiresAt })

  if (error) throw new Error(`Failed to insert token: ${error.message}`)
  return token
}

Deno.serve(wrapHandler("verify-email", async (req) => {
  const origin = req.headers.get('origin')
  const cors = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, cors)

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')?.trim()
  const siteUrl = Deno.env.get('SITE_URL')?.trim() || SITE_URL
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim() || ''

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400, cors)
  }

  const action = body.action as string | undefined
  const serviceClient = getServiceClient()

  // ── action: send ──────────────────────────────────────────────────────────
  // Called by kinde-webhook (server-side) with service-role key.
  if (action === 'send') {
    const authHeader = req.headers.get('authorization') || ''
    const provided = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!serviceKey || provided !== serviceKey) {
      return json({ error: 'Unauthorized' }, 401, cors)
    }

    const userId = body.user_id as string | undefined
    const email = body.email as string | undefined
    const firstName = (body.first_name as string | undefined)?.trim() || undefined

    if (!userId || !email) return json({ error: 'user_id and email are required' }, 400, cors)
    if (email.endsWith('@kinde.placeholder')) {
      return json({ skipped: true, reason: 'placeholder email — SSO user, no verification needed' }, 200, cors)
    }

    if (!RESEND_API_KEY) return json({ error: 'Email service not configured' }, 503, cors)

    try {
      const token = await upsertToken(serviceClient, userId)
      const confirmationUrl = `${siteUrl}/auth/verify-email?token=${token}`

      const { SignupEmail } = await import('../_shared/email-templates/signup.tsx')
      const props = {
        siteName: SITE_NAME,
        siteUrl,
        recipient: email,
        confirmationUrl,
        token: token.slice(0, 6).toUpperCase(),
      }
      const html = await renderAsync(React.createElement(SignupEmail, props))
      const text = await renderAsync(React.createElement(SignupEmail, props), { plainText: true })

      await sendResendEmail({
        to: email,
        subject: 'Verify your email — WiseResume',
        html,
        text,
        apiKey: RESEND_API_KEY,
      })

      console.log(`[verify-email] send: sent to ${email} (userId=${userId})`)
      return json({ success: true }, 200, cors)
    } catch (err) {
      console.error('[verify-email] send error:', err)
      return json({ error: String(err) }, 500, cors)
    }
  }

  // ── action: resend ────────────────────────────────────────────────────────
  // Called by the authenticated user (bearer = user Supabase JWT).
  if (action === 'resend') {
    const authHeader = req.headers.get('authorization') || ''
    const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!bearerToken) return json({ error: 'Unauthorized' }, 401, cors)

    // Verify the user JWT and get their ID.
    const supabaseUrl = (Deno.env.get('EXT_SUPABASE_URL') || Deno.env.get('SUPABASE_URL') || '').trim()
    if (!supabaseUrl) return json({ error: 'Server configuration error' }, 500, cors)

    let userId: string
    try {
      const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
          apikey: serviceKey,
        },
      })
      if (!userRes.ok) return json({ error: 'Unauthorized' }, 401, cors)
      const userJson = await userRes.json() as { id?: string }
      if (!userJson.id) return json({ error: 'Unauthorized' }, 401, cors)
      userId = userJson.id
    } catch {
      return json({ error: 'Unauthorized' }, 401, cors)
    }

    // Load profile for email address.
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('contact_email, email, email_verified')
      .eq('user_id', userId)
      .maybeSingle()

    if (!profile) return json({ error: 'User not found' }, 404, cors)
    if (profile.email_verified) return json({ already_verified: true }, 200, cors)

    const email = profile.contact_email || profile.email
    if (!email || email.endsWith('@kinde.placeholder')) {
      return json({ skipped: true, reason: 'No verifiable email on file' }, 200, cors)
    }

    if (!RESEND_API_KEY) return json({ error: 'Email service not configured' }, 503, cors)

    try {
      const token = await upsertToken(serviceClient, userId)
      const confirmationUrl = `${siteUrl}/auth/verify-email?token=${token}`

      const { SignupEmail } = await import('../_shared/email-templates/signup.tsx')
      const props = {
        siteName: SITE_NAME,
        siteUrl,
        recipient: email,
        confirmationUrl,
        token: token.slice(0, 6).toUpperCase(),
      }
      const html = await renderAsync(React.createElement(SignupEmail, props))
      const text = await renderAsync(React.createElement(SignupEmail, props), { plainText: true })

      await sendResendEmail({
        to: email,
        subject: 'Verify your email — WiseResume',
        html,
        text,
        apiKey: RESEND_API_KEY,
      })

      console.log(`[verify-email] resend: sent to ${email} (userId=${userId})`)
      return json({ success: true }, 200, cors)
    } catch (err) {
      console.error('[verify-email] resend error:', err)
      return json({ error: String(err) }, 500, cors)
    }
  }

  // ── action: confirm ───────────────────────────────────────────────────────
  // Public — validates token and marks email as verified.
  if (action === 'confirm') {
    const token = body.token as string | undefined
    if (!token) return json({ error: 'token is required' }, 400, cors)

    // Fetch the token row.
    const { data: tokenRow, error: fetchErr } = await serviceClient
      .from('email_verification_tokens')
      .select('id, user_id, expires_at, used_at')
      .eq('token', token)
      .maybeSingle()

    if (fetchErr || !tokenRow) return json({ error: 'Invalid or expired token' }, 400, cors)
    if (tokenRow.used_at) return json({ error: 'Token already used' }, 400, cors)
    if (new Date(tokenRow.expires_at) < new Date()) {
      return json({ error: 'Token expired' }, 400, cors)
    }

    const userId = tokenRow.user_id as string

    // Mark token as used.
    await serviceClient
      .from('email_verification_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', tokenRow.id)

    // Set email_verified = true on the profile.
    const { error: updateErr } = await serviceClient
      .from('profiles')
      .update({ email_verified: true })
      .eq('user_id', userId)

    if (updateErr) {
      console.error('[verify-email] confirm: profile update failed', updateErr)
      return json({ error: 'Failed to verify email' }, 500, cors)
    }

    // Load profile for welcome email.
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('contact_email, email, full_name')
      .eq('user_id', userId)
      .maybeSingle()

    const email = profile?.contact_email || profile?.email
    const firstName = profile?.full_name?.split(' ')[0] || undefined

    // Fire-and-forget: welcome email + add to Onboarding audience
    if (email && !email.endsWith('@kinde.placeholder')) {
      if (RESEND_API_KEY) {
        try {
          const { WelcomeEmail } = await import('../_shared/email-templates/welcome.tsx')
          const props = { siteName: SITE_NAME, siteUrl, firstName }
          const html = await renderAsync(React.createElement(WelcomeEmail, props))
          const text = await renderAsync(React.createElement(WelcomeEmail, props), { plainText: true })
          await sendResendEmail({
            to: email,
            subject: `Welcome to WiseResume, ${firstName || 'there'}! 🎉`,
            html,
            text,
            apiKey: RESEND_API_KEY,
          })
          console.log(`[verify-email] confirm: welcome email sent to ${email}`)
        } catch (welcErr) {
          console.error('[verify-email] confirm: welcome email failed (non-fatal):', welcErr)
        }
      }
      // Add to Onboarding Resend Audience — triggers day-3/7/14 automation drip.
      const onboardingAudienceId = getAudienceId(AUDIENCE_KEYS.ONBOARDING)
      if (onboardingAudienceId) {
        addContact(onboardingAudienceId, {
          email,
          firstName: firstName || undefined,
        }).catch((err) => console.error('[verify-email] confirm: onboarding audience add failed (non-fatal):', err))
      }
    }

    console.log(`[verify-email] confirm: verified userId=${userId}`)
    return json({ success: true, verified: true }, 200, cors)
  }

  return json({ error: 'Unknown action' }, 400, cors)
}))
