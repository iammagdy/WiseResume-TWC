import { getServiceClient } from '../_shared/dbClient.ts';
import { requireAdminAuth } from '../_shared/adminAuth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

function json(data: unknown, status = 200, corsHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function generateUUID(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

async function hmacSign(message: string, secret: string): Promise<string> {
  const keyData = new TextEncoder().encode(secret);
  const msgData = new TextEncoder().encode(message);
  const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, msgData);
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function buildInviteEmail(recipientEmail: string, inviteUrl: string, expiresAt: string): string {
  const expiryDate = new Date(expiresAt).toLocaleString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  });
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f0f5ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:32px 16px;">
    <div style="background:#1D4ED8;padding:28px 32px;text-align:center;border-radius:16px 16px 0 0;">
      <span style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-0.03em;">WiseHire</span>
      <p style="color:rgba(255,255,255,0.75);font-size:12px;margin:6px 0 0;">by thewise.cloud</p>
    </div>
    <div style="background:#fff;padding:40px 32px 36px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
      <h1 style="font-size:24px;font-weight:800;color:#0f172a;margin:0 0 12px;letter-spacing:-0.03em;text-align:center;">
        You're invited to WiseHire
      </h1>
      <p style="font-size:15px;color:#475569;line-height:1.65;text-align:center;margin:0 0 28px;">
        You've been selected for early access to WiseHire — AI-powered hiring tools that help you hire smarter, faster. Click below to set up your account.
      </p>
      <div style="text-align:center;margin-bottom:28px;">
        <a href="${inviteUrl}" style="display:inline-block;background:#1D4ED8;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;letter-spacing:-0.01em;">
          Accept Invite &amp; Set Up Your Account
        </a>
      </div>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;text-align:center;">
        <p style="font-size:12px;color:#64748b;margin:0;">
          This invite expires on <strong>${expiryDate}</strong>.<br/>
          Only <strong>${recipientEmail}</strong> can use this link.
        </p>
      </div>
    </div>
    <div style="background:#1e293b;padding:20px 32px;text-align:center;border-radius:0 0 16px 16px;">
      <p style="font-size:11px;color:#64748b;margin:0;">If you didn't expect this invite, you can safely ignore it.</p>
      <p style="font-size:11px;color:#475569;margin:4px 0 0;">thewise.cloud</p>
    </div>
  </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { password, recipient_email, waitlist_id } = body as {
      password: string;
      recipient_email: string;
      waitlist_id?: string;
    };

    let callerEmail: string;
    try {
      callerEmail = await requireAdminAuth(req, password);
    } catch (authErr) {
      if (authErr instanceof Response) return authErr;
      throw authErr;
    }

    if (!recipient_email?.trim()) {
      return json({ success: false, error: 'recipient_email is required' }, 400, corsHeaders);
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const WISEHIRE_INVITE_SECRET = Deno.env.get('WISEHIRE_INVITE_SECRET') ?? Deno.env.get('DEV_KIT_PASSWORD') ?? '';
    const APP_URL = Deno.env.get('WISEHIRE_APP_URL') ?? 'https://resume.thewise.cloud';

    if (!RESEND_API_KEY) {
      return json({ success: false, error: 'RESEND_API_KEY not configured' }, 503, corsHeaders);
    }

    const supabase = getServiceClient();
    const email = recipient_email.trim().toLowerCase();

    const token = generateUUID();
    const signature = await hmacSign(token, WISEHIRE_INVITE_SECRET);
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
    const inviteUrl = `${APP_URL}/wisehire/signup?invite=${token}`;

    const { error: insertErr } = await supabase.from('wisehire_invites').insert({
      token,
      token_signature: signature,
      recipient_email: email,
      expires_at: expiresAt,
      is_revoked: false,
    });
    if (insertErr) throw new Error(`Failed to store invite: ${insertErr.message}`);

    if (waitlist_id) {
      await supabase
        .from('wisehire_waitlist')
        .update({ invited_at: new Date().toISOString() })
        .eq('id', waitlist_id);
    } else {
      await supabase
        .from('wisehire_waitlist')
        .update({ invited_at: new Date().toISOString() })
        .eq('email', email);
    }

    const html = buildInviteEmail(email, inviteUrl, expiresAt);
    const text = `You're invited to WiseHire!\n\nAccept your invite and set up your account:\n${inviteUrl}\n\nThis link expires 72 hours from now and can only be used by ${email}.\n\n—\nthewise.cloud`;

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'WiseHire <notifications@thewise.cloud>',
        to: [email],
        subject: "You're invited to WiseHire — early access",
        html,
        text,
      }),
    });

    let messageId: string | null = null;
    if (emailRes.ok) {
      const emailData = await emailRes.json();
      messageId = emailData.id ?? null;
    } else {
      const errText = await emailRes.text();
      console.error('[admin-wisehire-invite] Email send failed:', errText);
    }

    await supabase.from('audit_logs').insert({
      user_id: (await supabase.from('profiles').select('id').eq('email', callerEmail).maybeSingle()).data?.id ?? undefined,
      category: 'admin_email',
      action: 'wisehire_invite',
      metadata: {
        recipient_email: email,
        performed_by: callerEmail,
        invite_url: inviteUrl,
        expires_at: expiresAt,
        message_id: messageId,
        waitlist_id: waitlist_id ?? null,
        sent_at: new Date().toISOString(),
      },
    });

    return json({
      success: true,
      invite_url: inviteUrl,
      expires_at: expiresAt,
      message_id: messageId,
    }, 200, corsHeaders);
  } catch (err) {
    console.error('[admin-wisehire-invite]', err);
    return json(
      { success: false, error: err instanceof Error ? err.message : 'Internal server error' },
      500,
      corsHeaders
    );
  }
});
