import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEVELOPER_EMAIL = "contact@thewise.cloud";
const LOGO_URL = "https://jnsfmkzgxsviuthaqlyy.supabase.co/storage/v1/object/public/screenshots/icon-512.png";

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

function parseBrowser(ua: string): string {
  if (!ua) return "Unknown";
  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("OPR/") || ua.includes("Opera")) return "Opera";
  if (ua.includes("Chrome/") && !ua.includes("Edg/")) return "Chrome";
  if (ua.includes("Safari/") && !ua.includes("Chrome")) return "Safari";
  if (ua.includes("Firefox/")) return "Firefox";
  return "Other";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const {
      error_message,
      error_stack,
      component_stack,
      route,
      selected_screen,
      error_category,
      user_id,
      user_email,
      session_id,
      user_agent,
      app_version,
      additional_context,
      active_feature,
      recent_errors,
    } = body;

    if (!error_message) {
      return new Response(
        JSON.stringify({ error: "error_message is required" }),
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
            resolvedUserId = claims.sub;
            resolvedEmail = claims.email || resolvedEmail;
          }
        }
      } catch { /* ignore decode errors */ }
    }

    if (!resolvedUserId) {
      resolvedUserId = crypto.randomUUID();
    }

    const screenDisplay = selected_screen || "Not specified";
    const categoryDisplay = error_category || "general";

    const { error: dbError } = await supabaseAdmin
      .from("bug_reports")
      .insert({
        user_id: resolvedUserId,
        user_email: resolvedEmail,
        error_message: error_message.slice(0, 2000),
        error_stack: error_stack?.slice(0, 5000) || null,
        component_stack: component_stack?.slice(0, 5000) || null,
        route: route || null,
        session_id: session_id || null,
        user_agent: user_agent?.slice(0, 500) || null,
        additional_context: additional_context?.slice(0, 1000) || null,
        app_version: app_version || "1.0.0",
        active_feature: active_feature || null,
        recent_errors: recent_errors || null,
        screen: screenDisplay,
        error_category: categoryDisplay,
      });

    if (dbError) {
      console.error("DB insert error:", JSON.stringify(dbError));
      return new Response(
        JSON.stringify({ error: "Failed to save report", code: dbError.code, detail: dbError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY) {
      try {
        const formattedTime = new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
        const platform = parsePlatform(user_agent || "");
        const browser = parseBrowser(user_agent || "");
        const featureDisplay = active_feature || null;
        const recentErrorsDisplay = Array.isArray(recent_errors) ? recent_errors : [];

        const emailHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff"><tr><td align="center" style="padding:40px 20px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">

<!-- Header -->
<tr><td style="background-color:#1a1a2e;padding:32px 40px;border-radius:12px 12px 0 0" align="center">
  <img src="${LOGO_URL}" alt="WiseResume" width="48" height="48" style="display:block;margin:0 auto 12px;border-radius:12px">
  <h1 style="margin:0;font-size:20px;font-weight:700;color:#ffffff">🐛 Bug Report</h1>
  <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.7)">from <strong style="color:#ffffff">${resolvedEmail}</strong></p>
</td></tr>

<!-- Red accent -->
<tr><td style="background-color:#e63946;height:4px;font-size:0;line-height:0">&nbsp;</td></tr>

<!-- Screen & Category -->
<tr><td style="background-color:#f8f9fa;padding:20px 40px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td width="50%" style="padding-right:12px">
        <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;font-weight:600">Screen</p>
        <p style="margin:4px 0 0;font-size:15px;color:#1a1a2e;font-weight:600">${screenDisplay}</p>
      </td>
      <td width="50%">
        <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;font-weight:600">Category</p>
        <p style="margin:4px 0 0;font-size:15px;color:#e63946;font-weight:600">${categoryDisplay}</p>
      </td>
    </tr>
  </table>
</td></tr>

${featureDisplay ? `
<!-- Active Feature -->
<tr><td style="background-color:#fffbeb;padding:12px 40px;border-bottom:1px solid #fde68a">
  <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;font-weight:600">Active Feature</p>
  <p style="margin:4px 0 0;font-size:14px;color:#92400e;font-weight:600">🔧 ${featureDisplay}</p>
</td></tr>` : ""}

<!-- Error Message -->
<tr><td style="padding:24px 40px;background-color:#ffffff">
  <p style="margin:0 0 10px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;font-weight:600">Error Message</p>
  <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px 16px">
    <p style="margin:0;font-size:13px;color:#991b1b;font-family:ui-monospace,SFMono-Regular,monospace;word-break:break-all;line-height:1.5">${error_message.slice(0, 500)}</p>
  </div>
</td></tr>

${recentErrorsDisplay.length > 0 ? `
<!-- Recent Errors -->
<tr><td style="padding:0 40px 20px;background-color:#ffffff">
  <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;font-weight:600">Recent Errors (last 60s)</p>
  ${recentErrorsDisplay.slice(0, 3).map((e: { message?: string }) => `
  <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:8px 12px;margin-bottom:6px">
    <p style="margin:0;font-size:12px;color:#991b1b;font-family:ui-monospace,SFMono-Regular,monospace;word-break:break-all">${(e.message || '').slice(0, 150)}</p>
  </div>`).join("")}
</td></tr>` : ""}

${additional_context ? `
<!-- User Note -->
<tr><td style="padding:0 40px 24px;background-color:#ffffff">
  <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;font-weight:600">User's Note</p>
  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 16px">
    <p style="margin:0;font-size:14px;color:#166534;line-height:1.5">${additional_context}</p>
  </div>
</td></tr>` : ""}

<!-- Metadata Table -->
<tr><td style="padding:0 40px 24px;background-color:#ffffff">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;font-size:13px">
    <tr style="border-bottom:1px solid #e5e7eb">
      <td style="padding:10px 14px;color:#6b7280;font-weight:600;width:100px">Route</td>
      <td style="padding:10px 14px;color:#1a1a2e;font-family:ui-monospace,SFMono-Regular,monospace;font-size:12px">${route || "N/A"}</td>
    </tr>
    <tr style="border-bottom:1px solid #e5e7eb">
      <td style="padding:10px 14px;color:#6b7280;font-weight:600">Version</td>
      <td style="padding:10px 14px;color:#1a1a2e">${app_version || "unknown"}</td>
    </tr>
    <tr style="border-bottom:1px solid #e5e7eb">
      <td style="padding:10px 14px;color:#6b7280;font-weight:600">Platform</td>
      <td style="padding:10px 14px;color:#1a1a2e">${platform} · ${browser}</td>
    </tr>
    <tr>
      <td style="padding:10px 14px;color:#6b7280;font-weight:600">Time</td>
      <td style="padding:10px 14px;color:#1a1a2e">${formattedTime}</td>
    </tr>
  </table>
</td></tr>

${error_stack ? `
<!-- Stack Trace -->
<tr><td style="padding:0 40px 24px;background-color:#ffffff">
  <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;font-weight:600">Stack Trace</p>
  <pre style="background:#f8f9fa;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;overflow-x:auto;font-size:11px;line-height:1.5;color:#374151;margin:0;white-space:pre-wrap;word-break:break-all">${error_stack.slice(0, 2000)}</pre>
</td></tr>` : ""}

<!-- Footer -->
<tr><td style="background-color:#1a1a2e;padding:24px 40px;border-radius:0 0 12px 12px" align="center">
  <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.5)">WiseResume Bug Report · Reply to reach the user</p>
</td></tr>

</table></td></tr></table></body></html>`;

        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: `${resolvedEmail} via WiseResume <notifications@thewise.cloud>`,
            to: [DEVELOPER_EMAIL],
            reply_to: resolvedEmail,
            subject: `[Bug] ${screenDisplay} · ${categoryDisplay} — ${error_message.slice(0, 50)}`,
            html: emailHtml,
          }),
        });
        const emailBody = await emailRes.text();
        if (!emailRes.ok) {
          console.error("Resend email failed:", emailRes.status, emailBody);
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
    console.error("send-bug-report error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
