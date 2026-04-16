import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { getServiceClient } from '../_shared/dbClient.ts'
import { requireAdminAuth } from '../_shared/adminAuth.ts'
import { getCorsHeaders } from '../_shared/cors.ts';

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

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const {
      password,
      action,
      target_user_id,
      target_email,
      custom_subject,
      custom_body,
      admin_email: adminEmailFromBody,
    } = body as {
      password: string
      action: EmailAction
      target_user_id?: string
      target_email?: string
      custom_subject?: string
      custom_body?: string
      admin_email?: string
    }

    let callerEmail: string
    try {
      callerEmail = await requireAdminAuth(req, password)
    } catch (authErr) {
      if (authErr instanceof Response) return authErr
      throw authErr
    }

    const supabase = getServiceClient()
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

    // Preflight diagnostic — returns config status without sending any email
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

    if (!target_user_id && !target_email) {
      return new Response(
        JSON.stringify({ success: false, error: 'target_user_id or target_email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Resolve target email if not provided
    let resolvedEmail = target_email
    let resolvedUserId = target_user_id

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

    // If we only have email (no user_id), try to resolve via listUsers.
    // The target user is always captured in metadata.target_email for audit reliability.
    // audit_logs.user_id has a FK to auth.users(id) NOT NULL, so we need a valid UUID.
    // If the target user cannot be found, we use the admin caller's own user ID as
    // the audit subject (caller is always a valid auth user from requireAdminAuth).
    let callerUserId: string | null = null
    if (!resolvedUserId) {
      // Resolve the caller's own user ID from the bearer token using the service client
      const bearerToken = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
      const callerClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: `Bearer ${bearerToken}` } } },
      )
      const { data: callerData } = await callerClient.auth.getUser()
      callerUserId = callerData?.user?.id ?? null

      // Try a targeted page of listUsers to find the target user by email
      // (Supabase admin SDK has no getUserByEmail; listUsers is the only option)
      const { data: listData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
      const found = (listData?.users ?? []).find((u) => u.email === resolvedEmail)
      resolvedUserId = found?.id ?? callerUserId
    }

    let resultMessageId: string | null = null

    switch (action) {
      case 'resend_confirmation': {
        const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
          type: 'signup',
          email: resolvedEmail,
        })
        if (linkErr) {
          return new Response(
            JSON.stringify({ success: false, error: linkErr.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          )
        }
        const confirmationUrl = linkData?.properties?.action_link
        if (!confirmationUrl) {
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to generate confirmation link: action_link missing in response' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          )
        }

        if (!RESEND_API_KEY) {
          return new Response(
            JSON.stringify({ success: false, error: 'RESEND_API_KEY not configured' }),
            { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          )
        }

        const { SignupEmail } = await import('../_shared/email-templates/signup.tsx')
        const html = await renderAsync(React.createElement(SignupEmail, {
          siteName: SITE_NAME,
          siteUrl: SITE_URL,
          recipient: resolvedEmail,
          confirmationUrl,
        }))
        const text = await renderAsync(React.createElement(SignupEmail, {
          siteName: SITE_NAME,
          siteUrl: SITE_URL,
          recipient: resolvedEmail,
          confirmationUrl,
        }), { plainText: true })

        const sent = await sendResendEmail({
          to: resolvedEmail,
          from: SENDER_FROM,
          subject: 'Confirm your email',
          html,
          text,
          apiKey: RESEND_API_KEY,
        })
        resultMessageId = sent.id
        break
      }

      case 'send_magic_link': {
        const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: resolvedEmail,
        })
        if (linkErr) {
          return new Response(
            JSON.stringify({ success: false, error: linkErr.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          )
        }
        const confirmationUrl = linkData?.properties?.action_link
        if (!confirmationUrl) {
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to generate magic link: action_link missing in response' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          )
        }

        if (!RESEND_API_KEY) {
          return new Response(
            JSON.stringify({ success: false, error: 'RESEND_API_KEY not configured' }),
            { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          )
        }

        const { MagicLinkEmail } = await import('../_shared/email-templates/magic-link.tsx')
        const html = await renderAsync(React.createElement(MagicLinkEmail, {
          siteName: SITE_NAME,
          confirmationUrl,
        }))
        const text = await renderAsync(React.createElement(MagicLinkEmail, {
          siteName: SITE_NAME,
          confirmationUrl,
        }), { plainText: true })

        const sent = await sendResendEmail({
          to: resolvedEmail,
          from: SENDER_FROM,
          subject: 'Your login link',
          html,
          text,
          apiKey: RESEND_API_KEY,
        })
        resultMessageId = sent.id
        break
      }

      case 'send_otp': {
        const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
          type: 'reauthentication',
          email: resolvedEmail,
        })
        if (linkErr) {
          return new Response(
            JSON.stringify({ success: false, error: linkErr.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          )
        }
        const token = linkData?.properties?.email_otp
        if (!token) {
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to generate OTP: email_otp missing in response' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          )
        }

        if (!RESEND_API_KEY) {
          return new Response(
            JSON.stringify({ success: false, error: 'RESEND_API_KEY not configured' }),
            { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          )
        }

        const { ReauthenticationEmail } = await import('../_shared/email-templates/reauthentication.tsx')
        const html = await renderAsync(React.createElement(ReauthenticationEmail, { token }))
        const text = await renderAsync(React.createElement(ReauthenticationEmail, { token }), { plainText: true })

        const sent = await sendResendEmail({
          to: resolvedEmail,
          from: SENDER_FROM,
          subject: 'Your verification code',
          html,
          text,
          apiKey: RESEND_API_KEY,
        })
        resultMessageId = sent.id
        break
      }

      case 'send_password_reset': {
        const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
          type: 'recovery',
          email: resolvedEmail,
        })
        if (linkErr) {
          return new Response(
            JSON.stringify({ success: false, error: linkErr.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          )
        }
        const confirmationUrl = linkData?.properties?.action_link
        if (!confirmationUrl) {
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to generate password reset link: action_link missing in response' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          )
        }

        if (!RESEND_API_KEY) {
          return new Response(
            JSON.stringify({ success: false, error: 'RESEND_API_KEY not configured' }),
            { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          )
        }

        const { RecoveryEmail } = await import('../_shared/email-templates/recovery.tsx')
        const html = await renderAsync(React.createElement(RecoveryEmail, {
          siteName: SITE_NAME,
          confirmationUrl,
        }))
        const text = await renderAsync(React.createElement(RecoveryEmail, {
          siteName: SITE_NAME,
          confirmationUrl,
        }), { plainText: true })

        const sent = await sendResendEmail({
          to: resolvedEmail,
          from: SENDER_FROM,
          subject: 'Reset your password',
          html,
          text,
          apiKey: RESEND_API_KEY,
        })
        resultMessageId = sent.id
        break
      }

      case 'send_custom': {
        if (!custom_subject?.trim() || !custom_body?.trim()) {
          return new Response(
            JSON.stringify({ success: false, error: 'custom_subject and custom_body are required for send_custom' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          )
        }

        if (!RESEND_API_KEY) {
          return new Response(
            JSON.stringify({ success: false, error: 'RESEND_API_KEY not configured' }),
            { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          )
        }

        const escapedBody = custom_body
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br/>')

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

        const sent = await sendResendEmail({
          to: resolvedEmail,
          from: SENDER_FROM,
          subject: custom_subject,
          html,
          text,
          apiKey: RESEND_API_KEY,
        })
        resultMessageId = sent.id
        break
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    }

    // Write audit log — non-fatal but failure is surfaced in server logs.
    // user_id MUST be a valid FK uuid: use target user if resolved, else caller's own id.
    if (resolvedUserId) {
      const { error: auditErr } = await supabase.from('audit_logs').insert({
        user_id: resolvedUserId,
        category: 'admin_email',
        action,
        metadata: {
          target_email: resolvedEmail,
          performed_by: callerEmail,
          admin_email: adminEmailFromBody ?? callerEmail,
          message_id: resultMessageId,
          audit_user_id_source: callerUserId && resolvedUserId === callerUserId
            ? 'caller_fallback'
            : 'target_user',
          ...(action === 'send_custom'
            ? { custom_subject, custom_body_preview: custom_body?.slice(0, 200) }
            : {}),
          sent_at: new Date().toISOString(),
        },
      })
      if (auditErr) {
        console.error('[admin-email-actions] Audit log write failed:', auditErr.message)
      }
    } else {
      console.error('[admin-email-actions] Skipped audit log: could not resolve any valid user_id')
    }

    return new Response(
      JSON.stringify({ success: true, message_id: resultMessageId, email: resolvedEmail }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('[admin-email-actions] Unexpected error:', err)
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
