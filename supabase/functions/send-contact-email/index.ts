import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, recordUsage } from "../_shared/rateLimiter.ts";
import { escapeHtml } from "../_shared/htmlEscape.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEVELOPER_EMAIL = "contact@thewise.cloud";
const LOGO_URL = "https://jnsfmkzgxsviuthaqlyy.supabase.co/storage/v1/object/public/avatars/email-assets/wise-ai-logo.png";

// Adjust this constant to change the per-IP rate limit without touching SQL directly.
// The matching SQL function (check_email_rate_limit) uses 3 requests per hour per IP.
const RATE_LIMIT_REQUESTS_PER_HOUR = 3;

function buildSubject(type: string, email: string, metadata: Record<string, unknown>): string {
  switch (type) {
    case "bug":
      return `[Bug Report] ${email}`;
    case "auto-crash-report":
      return `[Auto Crash Report] ${email}`;
    case "contact": {
      const dept = typeof metadata.department === "string" && metadata.department
        ? metadata.department
        : "General";
      return `[Inquiry - ${dept}] ${email}`;
    }
    case "feature":
      return `[Feature Request] ${email}`;
    case "username-request": {
      const requested = typeof metadata.requested_username === "string" && metadata.requested_username
        ? metadata.requested_username
        : "unknown";
      return `Username Requested: ${requested}`;
    }
    default:
      return `[${type.toUpperCase()}] ${email}`;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { type, email, subject, message, metadata = {}, dry_run = false } = body as {
      type: string;
      email: string;
      subject?: string;
      message: string;
      metadata?: Record<string, unknown>;
      dry_run?: boolean;
    };

    if (!type || !email || !message) {
      return new Response(
        JSON.stringify({ error: "Type, email, and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Dry-run mode: validate configuration and return success/failure without sending a real email
    if (dry_run) {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      const hasKey = !!(RESEND_API_KEY && RESEND_API_KEY.trim().length > 0);
      return new Response(
        JSON.stringify({
          success: hasKey,
          reason: "dry_run",
          resend_api_key_configured: hasKey,
          note: hasKey
            ? "RESEND_API_KEY is configured. Email pipeline is ready."
            : "RESEND_API_KEY is NOT configured — emails will fail. Set it as a Supabase secret.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting — controlled by RATE_LIMIT_REQUESTS_PER_HOUR above.
    // We count recent submissions from this IP directly in the DB so that
    // changing the constant actually changes enforcement without any SQL edits.
    const clientIp = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for") || "unknown";
    const windowStart = new Date(Date.now() - 3600_000).toISOString();

    const { count: recentCount, error: countError } = await supabaseAdmin
      .from("contact_requests")
      .select("*", { count: "exact", head: true })
      .eq("ip_address", clientIp)
      .gte("created_at", windowStart);

    if (countError) {
      console.warn("Rate limit count error (allowing request):", countError.message);
    } else if ((recentCount ?? 0) >= RATE_LIMIT_REQUESTS_PER_HOUR) {
      return new Response(
        JSON.stringify({ error: `Too many requests. Limit is ${RATE_LIMIT_REQUESTS_PER_HOUR} per hour per IP. Please try again later.` }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "3600" } }
      );
    }

    // Resolve User ID if authenticated
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));
      if (user) userId = user.id;
    }

    // Per-user/IP rate limiting (5 requests per 5 minutes)
    // Use verified user ID when authenticated, otherwise fall back to caller IP
    const rateLimitKey = userId ?? clientIp;
    const { allowed: rlAllowed } = await checkRateLimit(rateLimitKey, { actionType: 'contact_email', maxRequests: 5, windowSeconds: 300 });
    if (!rlAllowed) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please wait 5 minutes before sending another message." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "300" } }
      );
    }
    await recordUsage(rateLimitKey, 'contact_email');

    // Save to DB first — always, even if email sending fails
    const { data: insertedRow, error: dbError } = await supabaseAdmin
      .from("contact_requests")
      .insert({
        type,
        user_id: userId,
        email,
        subject,
        message,
        metadata: { ...metadata, email_sent: false },
        ip_address: clientIp,
      })
      .select("id")
      .single();

    if (dbError) {
      console.error("DB insert error:", dbError);
      return new Response(
        JSON.stringify({ error: "Failed to save request", details: dbError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const recordId: string | null = insertedRow?.id ?? null;

    // Send Email via Resend
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not configured — request saved to DB but email not sent.");
      return new Response(
        JSON.stringify({ success: false, reason: "email_not_configured", saved: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const typeLabels: Record<string, string> = {
      bug: "🐛 Bug Report",
      "auto-crash-report": "🚨 Auto Crash Report",
      feature: "✨ Feature Request",
      contact: "✉️ Contact Inquiry",
      "username-request": "🔖 Username Request",
    };

    const emailSubject = buildSubject(type, email, metadata);

    let emailHtml: string;
    if (type === "username-request") {
      const requested = String(metadata.requested_username ?? "");
      const fullName = String(metadata.full_name ?? "");
      const reason = String(metadata.reason ?? "");
      emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 24px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="${LOGO_URL}" alt="WiseResume" width="50" style="border-radius: 10px;" />
            <h2 style="color: #1a1a2e; margin-top: 12px;">🔖 Username Request</h2>
            <p style="color: #666; margin: 4px 0 0; font-size: 13px;">A user is requesting a reserved username</p>
          </div>
          <div style="background: #f4f6fb; padding: 16px 18px; border-radius: 8px; margin-bottom: 16px;">
            <p style="margin: 0 0 4px; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.4px;">Requested username</p>
            <p style="margin: 0; font-size: 20px; font-weight: 700; color: #1a1a2e; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;">${escapeHtml(requested)}</p>
          </div>
          <p><strong>Full name:</strong> ${escapeHtml(fullName || "—")}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p style="margin-bottom: 6px;"><strong>Reason:</strong></p>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; white-space: pre-wrap; font-size: 13px; color: #333;">
            ${escapeHtml(reason || message || "(no reason provided)")}
          </div>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
          <div style="font-size: 11px; color: #888;">
            <p><strong>IP:</strong> ${escapeHtml(clientIp)}</p>
            <p><strong>User ID:</strong> ${userId || "Anonymous"}</p>
            <p><strong>Time:</strong> ${new Date().toISOString()}</p>
            ${recordId ? `<p><strong>Record ID:</strong> ${recordId}</p>` : ""}
          </div>
        </div>
      `;
    } else {
      emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="${LOGO_URL}" alt="WiseResume" width="50" style="border-radius: 10px;" />
            <h2 style="color: #1a1a2e; margin-top: 10px;">${typeLabels[type] || "Contact Request"}</h2>
          </div>
          <p><strong>From:</strong> ${escapeHtml(email)}</p>
          <p><strong>Subject:</strong> ${escapeHtml(subject || "No Subject")}</p>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; white-space: pre-wrap;">
            ${escapeHtml(message)}
          </div>
          ${metadata.department ? `<p><strong>Department:</strong> ${escapeHtml(metadata.department)}</p>` : ""}
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
          <div style="font-size: 12px; color: #666;">
            <p><strong>IP:</strong> ${escapeHtml(clientIp)}</p>
            <p><strong>User ID:</strong> ${userId || "Anonymous"}</p>
            <p><strong>Time:</strong> ${new Date().toISOString()}</p>
            ${recordId ? `<p><strong>Record ID:</strong> ${recordId}</p>` : ""}
          </div>
        </div>
      `;
    }

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "WiseResume Support <notifications@thewise.cloud>",
        to: [DEVELOPER_EMAIL],
        reply_to: email,
        subject: emailSubject,
        html: emailHtml,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error("Resend error:", JSON.stringify(resendData));
      // Update the record to reflect that email was not sent
      if (recordId) {
        await supabaseAdmin
          .from("contact_requests")
          .update({ metadata: { ...metadata, email_sent: false, email_error: String(resendData?.message ?? resendData) } })
          .eq("id", recordId);
      }
      return new Response(
        JSON.stringify({ success: false, reason: "email_delivery_failed", saved: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update the record to mark email as sent
    if (recordId) {
      await supabaseAdmin
        .from("contact_requests")
        .update({ metadata: { ...metadata, email_sent: true, resend_id: resendData.id } })
        .eq("id", recordId);
    }

    return new Response(
      JSON.stringify({ success: true, messageId: resendData.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
