/**
 * admin-email — Admin-side email management surface (Resend audiences,
 * broadcast/transactional sends, contact list management) used by the
 * DevKit "Email" pane.
 *
 * Trigger: invoked from the DevKit Email pane (audience CRUD, broadcast
 *   send, single-user transactional resend) and from a couple of admin
 *   automations (e.g. plan-change announcements).
 * Auth: ADMIN ONLY (`requireAdminAuth` — DevKit session token).
 * Dispatch contract: POST `{action, ...args}` where `action` selects one of
 *   the audience helpers (`add-contact | remove-contact | list-contacts |
 *   audience-stats | list-broadcasts`) or a send action (`send-broadcast |
 *   send-transactional`). Each branch returns its own `{success, ...}`
 *   envelope; failures map upstream Resend status codes onto 4xx/5xx
 *   responses.
 */
import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/render@0.0.17'
import { getServiceClient } from '../_shared/dbClient.ts'
import { requireAdminAuth } from '../_shared/adminAuth.ts'
import { getCorsHeaders } from '../_shared/cors.ts'
import { addContact, removeContact, getAudienceStats, listContacts, listRecentBroadcasts } from '../_shared/resendAudiences.ts'
import { getAudienceId, AUDIENCE_KEYS, AUDIENCE_LABELS, AUTOMATION_CHECKLIST } from '../_shared/resendConfig.ts'

import { wrapHandler } from '../_shared/fnLogger.ts';
// ── admin-resend-stats module-level ───────────────────────────────────────────
type AudienceKey = keyof typeof AUDIENCE_KEYS
const ALL_AUDIENCE_KEYS = Object.keys(AUDIENCE_KEYS) as AudienceKey[]

// ── admin-resend-sync module-level ────────────────────────────────────────────
const SYNC_BATCH_SIZE = 50
const SYNC_BATCH_DELAY_MS = 300

// ── admin-email-actions module-level ─────────────────────────────────────────
const SENDER_FROM = 'WiseResume <noreply@thewise.cloud>'
const SITE_NAME = 'wiseresume'
const SITE_URL = 'https://resume.thewise.cloud'

type EmailAction =
  | 'diagnose'
  | 'resend_confirmation'
  | 'send_magic_link'
  | 'send_otp'
  | 'send_password_reset'
  | 'send_custom'
  | 'send_email_broadcast'
  | 'estimate_broadcast_recipients'

async function sendResendEmail(options: {
  to: string
  from: string
  subject: string
  html: string
  text: string
  apiKey: string
}): Promise<{ id: string }> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: options.from,
      to: [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
    }),
  })
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Resend API error (${response.status}): ${errorText}`)
  }
  return await response.json()
}

const EMAIL_BATCH_SIZE = 50
const EMAIL_BATCH_DELAY_MS = 1100

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(wrapHandler("admin-email", async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch { /* empty body ok */ }

  const module = (body.module as string | undefined)

  if (!module) {
    return new Response(
      JSON.stringify({ success: false, error: 'module is required: resend-stats | resend-sync | email-actions | broadcast' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  // ── MODULE: resend-stats ──────────────────────────────────────────────────
  if (module === 'resend-stats') {
    try {
      await requireAdminAuth(req)
    } catch (authErr) {
      if (authErr instanceof Response) return authErr
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const action = (body.action as string | undefined) ?? 'stats'

    if (action === 'stats') {
      const [statsResults, recentBroadcasts] = await Promise.all([
        Promise.all(
          ALL_AUDIENCE_KEYS.map(async (key) => {
            const envKey = AUDIENCE_KEYS[key]
            const audienceId = getAudienceId(envKey)
            const label = AUDIENCE_LABELS[envKey] ?? key
            if (!audienceId) return { key, label, configured: false, id: null, contactCount: null }
            const stats = await getAudienceStats(audienceId)
            return { key, label, configured: true, id: audienceId, contactCount: stats?.contactCount ?? null, name: stats?.name ?? label }
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
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (action === 'lookup') {
      const email = (body.email as string | undefined)?.trim().toLowerCase()
      if (!email) {
        return new Response(JSON.stringify({ success: false, error: 'email is required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const foundIn: string[] = []
      await Promise.all(
        ALL_AUDIENCE_KEYS.map(async (key) => {
          const envKey = AUDIENCE_KEYS[key]
          const audienceId = getAudienceId(envKey)
          if (!audienceId) return
          const contacts = await listContacts(audienceId)
          const match = contacts.find((c) => (c.email ?? '').toLowerCase() === email)
          if (match) foundIn.push(AUDIENCE_LABELS[envKey] ?? key)
        }),
      )
      return new Response(
        JSON.stringify({ success: true, email, foundIn }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (action === 'add') {
      const audienceKey = (body.audienceKey as string | undefined)?.trim()
      const email = (body.email as string | undefined)?.trim().toLowerCase()
      const firstName = (body.firstName as string | undefined)?.trim() || undefined
      if (!audienceKey || !email) {
        return new Response(JSON.stringify({ success: false, error: 'audienceKey and email are required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const audienceId = getAudienceId(audienceKey as Parameters<typeof getAudienceId>[0])
      if (!audienceId) {
        return new Response(
          JSON.stringify({ success: false, error: `Audience ${audienceKey} not configured` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      const ok = await addContact(audienceId, { email, firstName })
      return new Response(
        JSON.stringify({ success: ok }),
        { status: ok ? 200 : 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (action === 'remove') {
      const audienceKey = (body.audienceKey as string | undefined)?.trim()
      const email = (body.email as string | undefined)?.trim().toLowerCase()
      if (!audienceKey || !email) {
        return new Response(JSON.stringify({ success: false, error: 'audienceKey and email are required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const audienceId = getAudienceId(audienceKey as Parameters<typeof getAudienceId>[0])
      if (!audienceId) {
        return new Response(
          JSON.stringify({ success: false, error: `Audience ${audienceKey} not configured` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      const ok = await removeContact(audienceId, email)
      return new Response(
        JSON.stringify({ success: ok }),
        { status: ok ? 200 : 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(JSON.stringify({ success: false, error: 'Unknown action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // ── MODULE: resend-sync ───────────────────────────────────────────────────
  if (module === 'resend-sync') {
    try {
      await requireAdminAuth(req)
    } catch (authErr) {
      if (authErr instanceof Response) return authErr
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const audienceId = getAudienceId(AUDIENCE_KEYS.ALL_USERS)
    if (!audienceId) {
      return new Response(
        JSON.stringify({ success: false, error: 'RESEND_AUDIENCE_ALL_USERS secret not configured' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabase = getServiceClient()
    const emails: Array<{ email: string; firstName?: string; lastName?: string }> = []
    let from = 0
    const PAGE = 1000

    while (true) {
      const { data, error } = await supabase
        .from('profiles')
        .select('contact_email, email, full_name')
        .range(from, from + PAGE - 1)
      if (error) { console.error('[admin-email/resend-sync] profiles fetch error:', error); break }
      if (!data || data.length === 0) break
      for (const row of data) {
        const email = (row.contact_email || row.email || '') as string
        if (!email || email.endsWith('@kinde.placeholder')) continue
        const parts = (row.full_name || '').trim().split(' ')
        emails.push({ email, firstName: parts[0] || undefined, lastName: parts.slice(1).join(' ') || undefined })
      }
      if (data.length < PAGE) break
      from += PAGE
    }

    const seen = new Set<string>()
    const unique = emails.filter(({ email }) => {
      if (seen.has(email)) return false
      seen.add(email)
      return true
    })

    let added = 0
    let failed = 0

    for (let i = 0; i < unique.length; i += SYNC_BATCH_SIZE) {
      const batch = unique.slice(i, i + SYNC_BATCH_SIZE)
      await Promise.all(
        batch.map(async (contact) => {
          const ok = await addContact(audienceId, contact)
          if (ok) added++; else failed++
        }),
      )
      if (i + SYNC_BATCH_SIZE < unique.length) {
        await new Promise((r) => setTimeout(r, SYNC_BATCH_DELAY_MS))
      }
    }

    console.log(`[admin-email/resend-sync] done: ${added} added, ${failed} failed, ${unique.length} total`)
    return new Response(
      JSON.stringify({ success: true, total: unique.length, added, failed }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  // ── MODULE: email-actions ─────────────────────────────────────────────────
  if (module === 'email-actions') {
    try {
      const {
        action,
        target_user_id,
        target_email,
        custom_subject,
        custom_body,
        admin_email: adminEmailFromBody,
      } = body as {
        action: EmailAction
        target_user_id?: string
        target_email?: string
        custom_subject?: string
        custom_body?: string
        admin_email?: string
      }

      let callerEmail: string
      try {
        callerEmail = await requireAdminAuth(req)
      } catch (authErr) {
        if (authErr instanceof Response) return authErr
        throw authErr
      }

      const supabase = getServiceClient()
      const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

      if (action === 'diagnose') {
        const hasKey = !!(RESEND_API_KEY && RESEND_API_KEY.trim().length > 0)
        return new Response(
          JSON.stringify({
            success: true,
            resend_api_key_configured: hasKey,
            sender_from: SENDER_FROM,
            site_url: SITE_URL,
            note: hasKey
              ? 'RESEND_API_KEY is set. Email delivery also requires the sending domain to be verified in Resend.'
              : 'RESEND_API_KEY is NOT configured — emails will fail. Set it as a Supabase secret in the project dashboard.',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      if (!action) {
        return new Response(
          JSON.stringify({ success: false, error: 'action is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      if (action === 'estimate_broadcast_recipients' || action === 'send_email_broadcast') {
        const { audience = 'all', broadcast_subject, broadcast_body } = body as {
          audience?: 'all' | 'pro' | 'free' | 'trial'
          broadcast_subject?: string
          broadcast_body?: string
        }

        let recipientEmails: string[] = []
        const PER_PAGE = 1000
        const PAID_PLANS = ['pro', 'premium', 'enterprise', 'pro_annual']

        const collectEmails = async (filter?: (uid: string) => boolean): Promise<string[]> => {
          const emails: string[] = []
          let page = 1
          while (true) {
            const { data: listData, error: listErr } = await supabase.auth.admin.listUsers({ page, perPage: PER_PAGE })
            if (listErr) throw listErr
            const users = listData?.users ?? []
            for (const u of users) {
              if (u.email && (!filter || filter(u.id))) emails.push(u.email)
            }
            if (users.length < PER_PAGE) break
            page++
          }
          return emails
        }

        if (audience === 'all') {
          recipientEmails = await collectEmails()
        } else if (audience === 'pro') {
          const { data: subs, error: subErr } = await supabase.from('subscriptions').select('user_id').in('plan_name', PAID_PLANS)
          if (subErr) throw subErr
          const targetIds = new Set((subs ?? []).map((s: { user_id: string }) => s.user_id))
          recipientEmails = await collectEmails((uid) => targetIds.has(uid))
        } else if (audience === 'trial') {
          const now = new Date().toISOString()
          const { data: subs, error: subErr } = await supabase.from('subscriptions').select('user_id')
            .not('trial_plan', 'is', null).gt('trial_expires_at', now)
          if (subErr) throw subErr
          const targetIds = new Set((subs ?? []).map((s: { user_id: string }) => s.user_id))
          recipientEmails = await collectEmails((uid) => targetIds.has(uid))
        } else if (audience === 'free') {
          const now = new Date().toISOString()
          const { data: allSubs, error: subErr } = await supabase.from('subscriptions').select('user_id, plan_name, trial_plan, trial_expires_at')
          if (subErr) throw subErr
          const excludedIds = new Set(
            (allSubs ?? [])
              .filter((s: { user_id: string; plan_name: string; trial_plan: string | null; trial_expires_at: string | null }) =>
                PAID_PLANS.includes(s.plan_name) ||
                (s.trial_plan != null && s.trial_expires_at != null && s.trial_expires_at > now)
              )
              .map((s: { user_id: string }) => s.user_id)
          )
          recipientEmails = await collectEmails((uid) => !excludedIds.has(uid))
        }

        recipientEmails = [...new Set(recipientEmails)]

        if (action === 'estimate_broadcast_recipients') {
          return new Response(
            JSON.stringify({ success: true, count: recipientEmails.length, audience }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          )
        }

        if (!broadcast_subject?.trim() || !broadcast_body?.trim()) {
          return new Response(
            JSON.stringify({ success: false, error: 'broadcast_subject and broadcast_body are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          )
        }

        if (!RESEND_API_KEY) {
          return new Response(
            JSON.stringify({ success: false, error: 'RESEND_API_KEY not configured' }),
            { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          )
        }

        if (recipientEmails.length === 0) {
          return new Response(
            JSON.stringify({ success: true, sent: 0, failed: 0, audience }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          )
        }

        const escapedBody = broadcast_body
          .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')

        const htmlTemplate = (subject: string, bodyHtml: string) => `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#fff;padding:0;margin:0;">
  <div style="max-width:520px;margin:0 auto;">
    <div style="background:#1a1a2e;padding:28px 32px;text-align:center;border-radius:16px 16px 0 0;">
      <span style="color:#fff;font-size:18px;font-weight:700;">WiseResume</span>
    </div>
    <div style="height:3px;background:#e63946;"></div>
    <div style="background:#f8f9fa;padding:40px 32px 32px;">
      <h1 style="font-size:22px;font-weight:800;color:#1a1a2e;margin:0 0 16px;text-align:center;">${subject.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</h1>
      <div style="font-size:15px;color:#4b5563;line-height:1.7;">${bodyHtml}</div>
    </div>
    <div style="background:#1a1a2e;padding:24px 32px;text-align:center;border-radius:0 0 16px 16px;">
      <p style="font-size:11px;color:#6b7280;margin:0;">WiseResume — Build your career story</p>
      <p style="font-size:11px;color:#4b5563;margin:4px 0 0;">thewise.cloud</p>
    </div>
  </div>
</body>
</html>`

        let sent = 0
        let failed = 0
        const failedEmails: string[] = []

        for (let i = 0; i < recipientEmails.length; i += EMAIL_BATCH_SIZE) {
          const batch = recipientEmails.slice(i, i + EMAIL_BATCH_SIZE)
          await Promise.all(batch.map(async (to) => {
            try {
              await sendResendEmail({
                to, from: SENDER_FROM, subject: broadcast_subject,
                html: htmlTemplate(broadcast_subject, escapedBody),
                text: `${broadcast_subject}\n\n${broadcast_body}\n\n—\nWiseResume (thewise.cloud)`,
                apiKey: RESEND_API_KEY!,
              })
              sent++
            } catch (e) {
              failed++
              failedEmails.push(to)
              console.error(`[admin-email/email-actions] Broadcast send failed for ${to}:`, e)
            }
          }))
          if (i + EMAIL_BATCH_SIZE < recipientEmails.length) {
            await new Promise((r) => setTimeout(r, EMAIL_BATCH_DELAY_MS))
          }
        }

        try {
          await supabase.from('audit_logs').insert({
            user_id: null, category: 'admin_email', action: 'email_broadcast_sent',
            metadata: {
              performed_by: callerEmail, audience,
              total_recipients: recipientEmails.length, sent, failed,
              broadcast_subject, broadcast_body_preview: broadcast_body.slice(0, 200),
              sent_at: new Date().toISOString(),
            },
          })
        } catch (e) {
          console.error('[admin-email/email-actions] Broadcast audit failed:', (e as Error).message)
        }

        return new Response(
          JSON.stringify({ success: true, sent, failed, audience, total: recipientEmails.length }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      if (!target_user_id && !target_email) {
        return new Response(
          JSON.stringify({ success: false, error: 'target_user_id or target_email is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      let resolvedEmail = target_email
      let resolvedUserId: string | null | undefined = target_user_id

      if (!resolvedEmail && resolvedUserId) {
        const { data: authUser, error: userErr } = await supabase.auth.admin.getUserById(resolvedUserId)
        if (userErr || !authUser?.user?.email) {
          return new Response(
            JSON.stringify({ success: false, error: 'User not found or has no email' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          )
        }
        resolvedEmail = authUser.user.email
      }

      if (!resolvedEmail) {
        return new Response(
          JSON.stringify({ success: false, error: 'Could not resolve target email' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      let targetFound = false
      if (!resolvedUserId) {
        const { data: listData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
        const found = (listData?.users ?? []).find((u) => u.email === resolvedEmail)
        if (found?.id) {
          resolvedUserId = found.id
          targetFound = true
        } else {
          resolvedUserId = null
          targetFound = false
          console.warn(`[admin-email/email-actions] Target email "${resolvedEmail}" not found in auth.users`)
        }
      } else {
        targetFound = true
      }

      let resultMessageId: string | null = null

      switch (action) {
        case 'resend_confirmation': {
          const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({ type: 'signup', email: resolvedEmail } as any)
          if (linkErr) return new Response(JSON.stringify({ success: false, error: linkErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
          const confirmationUrl = linkData?.properties?.action_link
          if (!confirmationUrl) return new Response(JSON.stringify({ success: false, error: 'Failed to generate confirmation link: action_link missing in response' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
          if (!RESEND_API_KEY) return new Response(JSON.stringify({ success: false, error: 'RESEND_API_KEY not configured' }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
          const { SignupEmail } = await import('../_shared/email-templates/signup.tsx')
          const html = await renderAsync(React.createElement(SignupEmail, { siteName: SITE_NAME, siteUrl: SITE_URL, recipient: resolvedEmail, confirmationUrl }))
          const text = await renderAsync(React.createElement(SignupEmail, { siteName: SITE_NAME, siteUrl: SITE_URL, recipient: resolvedEmail, confirmationUrl }), { plainText: true })
          const sent = await sendResendEmail({ to: resolvedEmail, from: SENDER_FROM, subject: 'Confirm your email', html, text, apiKey: RESEND_API_KEY })
          resultMessageId = sent.id
          break
        }
        case 'send_magic_link': {
          const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({ type: 'magiclink', email: resolvedEmail })
          if (linkErr) return new Response(JSON.stringify({ success: false, error: linkErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
          const confirmationUrl = linkData?.properties?.action_link
          if (!confirmationUrl) return new Response(JSON.stringify({ success: false, error: 'Failed to generate magic link: action_link missing in response' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
          if (!RESEND_API_KEY) return new Response(JSON.stringify({ success: false, error: 'RESEND_API_KEY not configured' }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
          const { MagicLinkEmail } = await import('../_shared/email-templates/magic-link.tsx')
          const html = await renderAsync(React.createElement(MagicLinkEmail, { siteName: SITE_NAME, confirmationUrl }))
          const text = await renderAsync(React.createElement(MagicLinkEmail, { siteName: SITE_NAME, confirmationUrl }), { plainText: true })
          const sent = await sendResendEmail({ to: resolvedEmail, from: SENDER_FROM, subject: 'Your login link', html, text, apiKey: RESEND_API_KEY })
          resultMessageId = sent.id
          break
        }
        case 'send_otp': {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({ type: 'reauthentication' as any, email: resolvedEmail })
          if (linkErr) return new Response(JSON.stringify({ success: false, error: linkErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
          const token = linkData?.properties?.email_otp
          if (!token) return new Response(JSON.stringify({ success: false, error: 'Failed to generate OTP: email_otp missing in response' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
          if (!RESEND_API_KEY) return new Response(JSON.stringify({ success: false, error: 'RESEND_API_KEY not configured' }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
          const { ReauthenticationEmail } = await import('../_shared/email-templates/reauthentication.tsx')
          const html = await renderAsync(React.createElement(ReauthenticationEmail, { token }))
          const text = await renderAsync(React.createElement(ReauthenticationEmail, { token }), { plainText: true })
          const sent = await sendResendEmail({ to: resolvedEmail, from: SENDER_FROM, subject: 'Your verification code', html, text, apiKey: RESEND_API_KEY })
          resultMessageId = sent.id
          break
        }
        case 'send_password_reset': {
          const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({ type: 'recovery', email: resolvedEmail })
          if (linkErr) return new Response(JSON.stringify({ success: false, error: linkErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
          const confirmationUrl = linkData?.properties?.action_link
          if (!confirmationUrl) return new Response(JSON.stringify({ success: false, error: 'Failed to generate password reset link: action_link missing in response' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
          if (!RESEND_API_KEY) return new Response(JSON.stringify({ success: false, error: 'RESEND_API_KEY not configured' }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
          const { RecoveryEmail } = await import('../_shared/email-templates/recovery.tsx')
          const html = await renderAsync(React.createElement(RecoveryEmail, { siteName: SITE_NAME, confirmationUrl }))
          const text = await renderAsync(React.createElement(RecoveryEmail, { siteName: SITE_NAME, confirmationUrl }), { plainText: true })
          const sent = await sendResendEmail({ to: resolvedEmail, from: SENDER_FROM, subject: 'Reset your password', html, text, apiKey: RESEND_API_KEY })
          resultMessageId = sent.id
          break
        }
        case 'send_custom': {
          if (!custom_subject?.trim() || !custom_body?.trim()) {
            return new Response(JSON.stringify({ success: false, error: 'custom_subject and custom_body are required for send_custom' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
          }
          if (!RESEND_API_KEY) return new Response(JSON.stringify({ success: false, error: 'RESEND_API_KEY not configured' }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
          const escapedBody = custom_body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')
          const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#fff;padding:0;margin:0;">
  <div style="max-width:520px;margin:0 auto;">
    <div style="background:#1a1a2e;padding:28px 32px;text-align:center;border-radius:16px 16px 0 0;">
      <span style="color:#fff;font-size:18px;font-weight:700;">WiseResume</span>
    </div>
    <div style="height:3px;background:#e63946;"></div>
    <div style="background:#f8f9fa;padding:40px 32px 32px;">
      <h1 style="font-size:24px;font-weight:800;color:#1a1a2e;margin:0 0 16px;text-align:center;">${custom_subject.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</h1>
      <div style="font-size:15px;color:#4b5563;line-height:1.7;">${escapedBody}</div>
    </div>
    <div style="background:#1a1a2e;padding:24px 32px;text-align:center;border-radius:0 0 16px 16px;">
      <p style="font-size:11px;color:#6b7280;margin:0;">WiseResume — Build your career story</p>
      <p style="font-size:11px;color:#4b5563;margin:4px 0 0;">thewise.cloud</p>
    </div>
  </div>
</body>
</html>`
          const text = `${custom_subject}\n\n${custom_body}\n\n—\nWiseResume (thewise.cloud)`
          const sent = await sendResendEmail({ to: resolvedEmail, from: SENDER_FROM, subject: custom_subject, html, text, apiKey: RESEND_API_KEY })
          resultMessageId = sent.id
          break
        }
        default:
          return new Response(
            JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          )
      }

      try {
        await supabase.from('audit_logs').insert({
          user_id: targetFound ? resolvedUserId : null,
          category: 'admin_email',
          action: action,
          metadata: {
            admin_email: callerEmail,
            audit_user_id_source: targetFound ? 'found' : 'not_found',
            target_email: resolvedEmail,
            ...(action === 'send_custom' && custom_subject ? { custom_subject } : {}),
            message_id: resultMessageId,
            sent_at: new Date().toISOString(),
          },
        })
      } catch (e) {
        console.error('[admin-email/email-actions] Audit log failed:', (e as Error).message)
      }

      return new Response(
        JSON.stringify({ success: true, message_id: resultMessageId, email: resolvedEmail }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    } catch (err) {
      console.error('[admin-email/email-actions] Error:', err)
      return new Response(
        JSON.stringify({ success: false, error: err instanceof Error ? err.message : 'Internal server error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
  }

  // ── MODULE: broadcast ─────────────────────────────────────────────────────
  if (module === 'broadcast') {
    try {
      let callerEmail: string
      try {
        callerEmail = await requireAdminAuth(req, corsHeaders)
      } catch (authErr) {
        if (authErr instanceof Response) return authErr
        throw authErr
      }

      const { action, id, title, body: msgBody, severity, expires_at, active_only } = body as {
        action: string
        id?: string
        title?: string
        body?: string
        severity?: string
        expires_at?: string | null
        active_only?: boolean
      }

      const supabase = getServiceClient()

      if (action === 'list') {
        let q = supabase.from('broadcasts').select('*').order('created_at', { ascending: false }).limit(100)
        if (active_only === true) q = q.eq('active', true)
        const { data, error } = await q
        if (error) throw error
        return new Response(
          JSON.stringify({ success: true, broadcasts: data ?? [] }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      if (action === 'publish') {
        if (!title?.trim() || !msgBody?.trim()) {
          return new Response(
            JSON.stringify({ success: false, error: 'title and body are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          )
        }
        const validSeverities = ['info', 'warning', 'critical']
        const resolvedSeverity = validSeverities.includes(severity ?? '') ? severity : 'info'
        const { data: inserted, error: insertErr } = await supabase.from('broadcasts')
          .insert({ title: title.trim(), body: msgBody.trim(), severity: resolvedSeverity, active: true, created_by: callerEmail, expires_at: expires_at ?? null })
          .select().maybeSingle()
        if (insertErr) throw insertErr
        if (!inserted) {
          return new Response(
            JSON.stringify({ success: false, error: 'not_found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          )
        }
        const { error: auditErr } = await supabase.from('audit_logs').insert({
          user_id: null, category: 'admin_broadcast', action: 'broadcast_published',
          metadata: { broadcast_id: inserted.id, title, severity: resolvedSeverity, performed_by: callerEmail },
        })
        if (auditErr) console.error('[admin-email/broadcast] Audit log failed:', auditErr.message)
        return new Response(
          JSON.stringify({ success: true, broadcast: inserted }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      if (action === 'expire') {
        if (!id) {
          return new Response(
            JSON.stringify({ success: false, error: 'id is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          )
        }
        const { error: expireErr } = await supabase.from('broadcasts').update({ active: false }).eq('id', id)
        if (expireErr) throw expireErr
        const { error: auditErr } = await supabase.from('audit_logs').insert({
          user_id: null, category: 'admin_broadcast', action: 'broadcast_expired',
          metadata: { broadcast_id: id, performed_by: callerEmail },
        })
        if (auditErr) console.error('[admin-email/broadcast] Audit log failed:', auditErr.message)
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      return new Response(
        JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    } catch (err) {
      console.error('[admin-email/broadcast] Error:', err)
      return new Response(
        JSON.stringify({ success: false, error: err instanceof Error ? err.message : 'Internal server error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
  }

  return new Response(
    JSON.stringify({ success: false, error: `Unknown module: ${module}. Valid values: resend-stats | resend-sync | email-actions | broadcast` }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
}))
