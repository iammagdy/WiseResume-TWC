import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEVELOPER_EMAIL = "contact@thewise.cloud";
const LOGO_URL = "https://jnsfmkzgxsviuthaqlyy.supabase.co/storage/v1/object/public/avatars/email-assets/wise-ai-logo.png";

function parsePlatform(ua: string): string {
  if (!ua) return "Unknown";
  if (ua.includes("iPhone")) return "iPhone";
  if (ua.includes("iPad")) return "iPad";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Macintosh") || ua.includes("Mac OS")) return "Mac";
  if (ua.includes("Linux")) return "Linux";
  if (ua.includes("CrOS")) return "ChromeOS";
  return "Unknown";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { subject, message, department, user_id, user_email, user_agent, app_version, route } = body;

    if (!subject || !message) {
      return new Response(
        JSON.stringify({ error: "subject and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let resolvedUserId = user_id;
    let resolvedEmail = user_email || "anonymous";

    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      try {
        const parts = token.split(".");
        if (parts.length === 3) {
          const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
          const json = atob(b64.padEnd(b64.length + (4 - b64.length % 4) % 4, "="));
          const claims = JSON.parse(json);
          if (claims.sub) {
            resolvedUserId = resolvedUserId || claims.sub;
            resolvedEmail = resolvedEmail === "anonymous" ? (claims.email || resolvedEmail) : resolvedEmail;
          }
        }
      } catch { /* ignore */ }
    }

    if (!resolvedUserId) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: dbError } = await supabaseAdmin
      .from("contact_inquiries")
      .insert({
        user_id: resolvedUserId,
        user_email: resolvedEmail,
        subject: subject.slice(0, 200),
        message: message.slice(0, 2000),
        route: route || null,
        user_agent: user_agent?.slice(0, 500) || null,
        app_version: app_version || "1.0.0",
      });

    if (dbError) {
      console.error("DB insert error:", dbError);
      return new Response(
        JSON.stringify({ error: "Failed to save inquiry" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY) {
      try {
        const formattedTime = new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
        const platform = parsePlatform(user_agent || "");

        const emailHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff"><tr><td align="center" style="padding:40px 20px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">

<!-- Header -->
<tr><td style="background-color:#1a1a2e;padding:32px 40px;border-radius:12px 12px 0 0" align="center">
  <img src="${LOGO_URL}" alt="WiseResume" width="48" height="48" style="display:block;margin:0 auto 12px;border-radius:12px">
  <h1 style="margin:0;font-size:20px;font-weight:700;color:#ffffff">📩 Contact Inquiry${department ? ` — ${department}` : ""}</h1>
  <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.7)">from <strong style="color:#ffffff">${resolvedEmail}</strong></p>
</td></tr>

<!-- Accent -->
<tr><td style="background-color:#e63946;height:4px;font-size:0;line-height:0">&nbsp;</td></tr>

<!-- Subject -->
<tr><td style="padding:24px 40px 0;background-color:#ffffff">
  <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;font-weight:600">Subject</p>
  <div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:8px;padding:14px 16px">
    <p style="margin:0;font-size:15px;color:#1a1a2e;font-weight:600;line-height:1.5">${subject.slice(0, 200)}</p>
  </div>
</td></tr>

<!-- Message -->
<tr><td style="padding:20px 40px;background-color:#ffffff">
  <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;font-weight:600">Message</p>
  <div style="background:#f8f9fa;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px">
    <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;white-space:pre-wrap">${message.slice(0, 2000)}</p>
  </div>
</td></tr>

<!-- Metadata -->
<tr><td style="padding:0 40px 24px;background-color:#ffffff">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;font-size:13px">
    <tr style="border-bottom:1px solid #e5e7eb">
      <td style="padding:10px 14px;color:#6b7280;font-weight:600;width:100px">Route</td>
      <td style="padding:10px 14px;color:#1a1a2e">${route || "N/A"}</td>
    </tr>
    <tr style="border-bottom:1px solid #e5e7eb">
      <td style="padding:10px 14px;color:#6b7280;font-weight:600">Version</td>
      <td style="padding:10px 14px;color:#1a1a2e">${app_version || "unknown"}</td>
    </tr>
    <tr style="border-bottom:1px solid #e5e7eb">
      <td style="padding:10px 14px;color:#6b7280;font-weight:600">Platform</td>
      <td style="padding:10px 14px;color:#1a1a2e">${platform}</td>
    </tr>
    <tr>
      <td style="padding:10px 14px;color:#6b7280;font-weight:600">Time</td>
      <td style="padding:10px 14px;color:#1a1a2e">${formattedTime}</td>
    </tr>
  </table>
</td></tr>

<!-- Footer -->
<tr><td style="background-color:#1a1a2e;padding:24px 40px;border-radius:0 0 12px 12px" align="center">
  <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.5)">WiseResume Contact Inquiry · Reply to reach the user</p>
</td></tr>

</table></td></tr></table></body></html>`;

        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: `${resolvedEmail} via WiseResume <notifications@thewise.cloud>`,
            to: [DEVELOPER_EMAIL],
            reply_to: resolvedEmail,
            subject: `[Contact] ${subject.slice(0, 80)}`,
            html: emailHtml,
          }),
        });
        if (!emailRes.ok) {
          console.error("Resend email failed:", emailRes.status, await emailRes.text());
        }
      } catch (emailErr) {
        console.error("Email send error:", emailErr);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-contact-inquiry error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
