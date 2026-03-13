import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEVELOPER_EMAIL = "contact@thewise.cloud";
const LOGO_URL = "https://jnsfmkzgxsviuthaqlyy.supabase.co/storage/v1/object/public/avatars/email-assets/wise-ai-logo.png";

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
    const { type, email, subject, message, metadata = {} } = body;

    // Validation
    if (!type || !email || !message) {
      return new Response(
        JSON.stringify({ error: "Type, email, and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate Limiting Check (3 per hour per IP)
    const clientIp = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for") || "unknown";
    const { data: isAllowed, error: rateLimitError } = await supabaseAdmin.rpc("check_email_rate_limit", {
      client_ip: clientIp,
    });

    if (rateLimitError) {
      // A1: Hard-fail when the rate limit DB check itself errors, to avoid silent bypass
      console.error("Rate limit check error:", rateLimitError);
      return new Response(
        JSON.stringify({ error: "Rate limit check failed. Please try again later.", details: rateLimitError.message }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (isAllowed === false) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve User ID if authenticated
    let userId = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));
      if (user) userId = user.id;
    }

    // Save to DB
    const { error: dbError } = await supabaseAdmin
      .from("contact_requests")
      .insert({
        type,
        user_id: userId,
        email,
        subject,
        message,
        metadata,
        ip_address: clientIp,
      });

    if (dbError) {
      console.error("DB insert error:", dbError);
      return new Response(
        JSON.stringify({ error: "Failed to save request", details: dbError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send Email via Resend
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Email service not configured (missing RESEND_API_KEY)" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const typeLabels: Record<string, string> = {
      bug: "🐛 Bug Report",
      feature: "✨ Feature Request",
      contact: "✉️ Contact Inquiry",
    };

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
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
        <div style="font-size: 12px; color: #666;">
          <p><strong>IP:</strong> ${clientIp}</p>
          <p><strong>User ID:</strong> ${userId || "Anonymous"}</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
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
        subject: `[${type.toUpperCase()}] ${subject || "New Request"}`,
        html: emailHtml,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error("Resend error:", resendData);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: resendData }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
