/**
 * auth-email-hook — Supabase Auth Hook for transactional emails
 *
 * REQUIRED CONFIGURATION (all must be in place for auth emails to work):
 *
 * 1. Supabase Auth settings:
 *    - Navigate to: Supabase Dashboard → Authentication → Hooks
 *    - Register this function as the hook for "Send Email" events.
 *    - Without this, Supabase will still use its default (unbranded) email templates.
 *
 * 2. Resend sending domain:
 *    - `thewise.cloud` must be a verified sender domain in your Resend dashboard.
 *    - Auth emails are sent from:  noreply@thewise.cloud
 *    - Contact/support emails are sent from: notifications@thewise.cloud
 *    - Both sub-paths share the same domain verification.
 *
 * 3. Supabase secret:
 *    - `RESEND_API_KEY` must be set as a Supabase secret (not a regular env var).
 *    - Set via: supabase secrets set RESEND_API_KEY=re_xxxx
 *    - This same key is used by `send-contact-email` for outbound contact emails.
 *
 * Supported email types (mapped to React Email templates in _shared/email-templates/):
 *   signup, invite, magiclink, recovery, email_change, reauthentication
 *
 * Preview endpoint:
 *   POST /auth-email-hook/preview  { type: "signup" }
 *   Authorization: Bearer <RESEND_API_KEY>
 *   Returns rendered HTML without sending an email.
 */
import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { requireStandardWebhookSignature } from '../_shared/webhookAuth.ts'
import { SignupEmail } from '../_shared/email-templates/signup.tsx'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'
import { EmailChangeEmail } from '../_shared/email-templates/email-change.tsx'
import { ReauthenticationEmail } from '../_shared/email-templates/reauthentication.tsx'
import { wrapHandler } from '../_shared/fnLogger.ts';
// This hook is called server-to-server by Supabase Auth internals; CORS is not
// enforced by browsers for these calls. The restricted origin list below prevents
// any browser-based cross-origin access to this endpoint.
const HOOK_ALLOWED_ORIGINS = [
  'https://supabase.com',
  'https://api.supabase.com',
  'https://resume.thewise.cloud',
  'https://thewise.cloud',
];

function getHookCorsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && HOOK_ALLOWED_ORIGINS.includes(origin);
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  if (allowed && origin) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

const EMAIL_SUBJECTS: Record<string, string> = {
  signup: 'Confirm your email',
  invite: "You've been invited",
  magiclink: 'Your login link',
  recovery: 'Reset your password',
  email_change: 'Confirm your new email',
  reauthentication: 'Your verification code',
}

// Template mapping
const EMAIL_TEMPLATES: Record<string, React.ComponentType<any>> = {
  signup: SignupEmail,
  invite: InviteEmail,
  magiclink: MagicLinkEmail,
  recovery: RecoveryEmail,
  email_change: EmailChangeEmail,
  reauthentication: ReauthenticationEmail,
}

// Configuration
const SITE_NAME = "wiseresume"
const SENDER_DOMAIN = "notify.thewise.cloud"
const FROM_DOMAIN = "thewise.cloud"

// Sample data for preview mode
const SAMPLE_PROJECT_URL = "https://resume.thewise.cloud"
const SAMPLE_EMAIL = "user@example.test"
const SAMPLE_DATA: Record<string, object> = {
  signup: {
    siteName: SITE_NAME,
    siteUrl: SAMPLE_PROJECT_URL,
    recipient: SAMPLE_EMAIL,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  magiclink: {
    siteName: SITE_NAME,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  recovery: {
    siteName: SITE_NAME,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  invite: {
    siteName: SITE_NAME,
    siteUrl: SAMPLE_PROJECT_URL,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  email_change: {
    siteName: SITE_NAME,
    email: SAMPLE_EMAIL,
    newEmail: SAMPLE_EMAIL,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  reauthentication: {
    token: '123456',
  },
}

/**
 * Send email via Resend API.
 * @see https://resend.com/docs/api-reference/emails/send-email
 */
async function sendResendEmail(options: {
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
  apiKey: string;
}): Promise<{ id: string }> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${options.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: options.from,
      to: [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend API error (${response.status}): ${errorText}`);
  }

  return await response.json();
}

// Preview endpoint handler - returns rendered HTML without sending email
async function handlePreview(req: Request): Promise<Response> {
  const previewCorsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: previewCorsHeaders })
  }

  const apiKey = Deno.env.get('RESEND_API_KEY')
  const authHeader = req.headers.get('Authorization')

  if (!apiKey || authHeader !== `Bearer ${apiKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...previewCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let type: string
  try {
    const body = await req.json()
    type = body.type
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
      status: 400,
      headers: { ...previewCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const EmailTemplate = EMAIL_TEMPLATES[type]

  if (!EmailTemplate) {
    return new Response(JSON.stringify({ error: `Unknown email type: ${type}` }), {
      status: 400,
      headers: { ...previewCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const sampleData = SAMPLE_DATA[type] || {}
  const html = await renderAsync(React.createElement(EmailTemplate, sampleData))

  return new Response(html, {
    status: 200,
    headers: { ...previewCorsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
  })
}

// Webhook handler - receives Supabase auth hook payload and sends email via Resend
async function handleWebhook(req: Request): Promise<Response> {
  const hookCors = getHookCorsHeaders(req.headers.get('origin'))
  const apiKey = Deno.env.get('RESEND_API_KEY')

  if (!apiKey) {
    console.error('RESEND_API_KEY not configured')
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { ...hookCors, 'Content-Type': 'application/json' } }
    )
  }

  // Verify the Standard Webhooks signature against SUPABASE_AUTH_HOOK_SECRET
  // BEFORE doing any application work. Reads the raw body once for HMAC, then
  // we JSON.parse it below — the request body must not be re-read.
  let rawBody: string
  try {
    rawBody = await requireStandardWebhookSignature(
      req,
      Deno.env.get('SUPABASE_AUTH_HOOK_SECRET'),
      hookCors,
    )
  } catch (resp) {
    if (resp instanceof Response) return resp
    throw resp
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch (error) {
    console.error('Invalid JSON in webhook payload')
    return new Response(
      JSON.stringify({ error: 'Invalid webhook payload' }),
      { status: 400, headers: { ...hookCors, 'Content-Type': 'application/json' } }
    )
  }

  // The email action type is in different places depending on the hook format
  // Supabase Auth Hooks send: { user, email_data { token, token_hash, redirect_to, email_action_type } }
  let emailType = payload.email_data?.email_action_type || payload.data?.action_type || payload.type
  const recipientEmail = payload.email_data?.email || payload.user?.email || payload.data?.email
  const token = payload.email_data?.token || payload.data?.token
  const tokenHash = payload.email_data?.token_hash
  const redirectTo = payload.email_data?.redirect_to || payload.data?.url

  console.log('Received auth event', { emailType, email: recipientEmail })

  if (!recipientEmail) {
    console.error('No recipient email in payload')
    return new Response(
      JSON.stringify({ error: 'No recipient email' }),
      { status: 400, headers: { ...hookCors, 'Content-Type': 'application/json' } }
    )
  }

  // Normalize email type
  if (emailType === 'signup' && redirectTo?.includes('verify_method=link')) {
    emailType = 'magiclink'
  }

  const EmailTemplate = EMAIL_TEMPLATES[emailType]
  if (!EmailTemplate) {
    console.error('Unknown email type', { emailType })
    return new Response(
      JSON.stringify({ error: `Unknown email type: ${emailType}` }),
      { status: 400, headers: { ...hookCors, 'Content-Type': 'application/json' } }
    )
  }

  // Build confirmation URL
  let confirmationUrl = redirectTo || `https://resume.thewise.cloud`
  if (tokenHash && !confirmationUrl.includes('token_hash')) {
    const separator = confirmationUrl.includes('?') ? '&' : '?'
    confirmationUrl = `${confirmationUrl}${separator}token_hash=${tokenHash}&type=${emailType}`
  }

  // Build template props
  const templateProps = {
    siteName: SITE_NAME,
    siteUrl: `https://resume.thewise.cloud`,
    recipient: recipientEmail,
    confirmationUrl,
    token,
    email: recipientEmail,
    newEmail: payload.email_data?.new_email || payload.data?.new_email,
  }

  // Render React Email to HTML and plain text
  const html = await renderAsync(React.createElement(EmailTemplate, templateProps))
  const text = await renderAsync(React.createElement(EmailTemplate, templateProps), {
    plainText: true,
  })

  try {
    const result = await sendResendEmail({
      to: recipientEmail,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      subject: EMAIL_SUBJECTS[emailType] || 'Notification',
      html,
      text,
      apiKey,
    })

    console.log('Email sent successfully via Resend', { message_id: result.id })

    return new Response(
      JSON.stringify({ success: true, message_id: result.id }),
      { status: 200, headers: { ...hookCors, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send email'
    console.error('Resend API error', { error: message })
    return new Response(JSON.stringify({ error: 'Failed to send email' }), {
      status: 500,
      headers: { ...hookCors, 'Content-Type': 'application/json' },
    })
  }
}

Deno.serve(wrapHandler("auth-email-hook", async (req) => {
  const url = new URL(req.url)
  const hookCors = getHookCorsHeaders(req.headers.get('origin'))

  // Handle CORS preflight for main endpoint
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: hookCors })
  }

  // Route to preview handler for /preview path
  if (url.pathname.endsWith('/preview')) {
    return handlePreview(req)
  }

  // Main webhook handler
  try {
    return await handleWebhook(req)
  } catch (error) {
    console.error('Webhook handler error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...hookCors, 'Content-Type': 'application/json' },
    })
  }
}))
