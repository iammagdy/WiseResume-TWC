import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { type, email, subject, message, metadata = {} } = body as {
      type: string;
      email: string;
      subject?: string;
      message: string;
      metadata?: Record<string, unknown>;
    };

    if (!type || !email || !message) {
      return new Response(
        JSON.stringify({ error: "Type, email, and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve User ID if authenticated
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));
      if (user) userId = user.id;
    }

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
    };

    const emailSubject = buildSubject(type, email, metadata);

    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="${LOGO_URL}" alt="WiseResume" width="50" style="border-radius: 10px;" />
          <h2 style="color: #1a1a2e; margin-top: 10px;">${typeLabels[type] || "Contact Request"}</h2>
        </div>
        <p><strong>From:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject || "No Subject"}</p>
        <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; white-space: pre-wrap;">
          ${message}
        </div>
        ${metadata.department ? `<p><strong>Department:</strong> ${metadata.department}</p>` : ""}
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
        <div style="font-size: 12px; color: #666;">
          <p><strong>IP:</strong> ${clientIp}</p>
          <p><strong>User ID:</strong> ${userId || "Anonymous"}</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          ${recordId ? `<p><strong>Record ID:</strong> ${recordId}</p>` : ""}
        </div>
      </div>
    `;

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
