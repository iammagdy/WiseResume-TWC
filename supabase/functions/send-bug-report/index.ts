import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEVELOPER_EMAIL = "bugs@magdysaber.com";

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

function truncateUserId(id: string): string {
  if (!id || id.length <= 12) return id || "N/A";
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
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
      const { data } = await supabaseAdmin.auth.getUser(token);
      if (data?.user) {
        resolvedUserId = resolvedUserId || data.user.id;
        resolvedEmail = resolvedEmail === "anonymous" ? (data.user.email || resolvedEmail) : resolvedEmail;
      }
    }

    if (!resolvedUserId) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
      });

    if (dbError) {
      console.error("DB insert error:", dbError);
      return new Response(
        JSON.stringify({ error: "Failed to save report" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY) {
      try {
        const timestamp = new Date().toISOString();
        const formattedTime = new Date(timestamp).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
        const versionDisplay = app_version || "unknown";
        const platform = parsePlatform(user_agent || "");
        const userIdDisplay = truncateUserId(resolvedUserId);
        const sessionIdDisplay = session_id || "N/A";
        const screenDisplay = selected_screen || "Not specified";
        const featureDisplay = active_feature || null;
        const recentErrorsDisplay = Array.isArray(recent_errors) ? recent_errors : [];
        const emailHtml = `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
            <!-- Header -->
            <div style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:24px 28px;color:#ffffff">
              <h1 style="margin:0;font-size:20px;font-weight:700">🐛 Bug Report</h1>
              <p style="margin:6px 0 0;font-size:14px;opacity:0.9">from <strong>${resolvedEmail}</strong></p>
            </div>

            <!-- Metadata -->
            <div style="display:flex;gap:0;border-bottom:1px solid #f3f4f6">
              <div style="flex:1;padding:14px 28px;border-right:1px solid #f3f4f6">
                <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#9ca3af;font-weight:600">Route</p>
                <p style="margin:4px 0 0;font-size:14px;color:#111827;font-weight:500">${route || "N/A"}</p>
              </div>
              <div style="flex:1;padding:14px 28px;border-right:1px solid #f3f4f6">
                <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#9ca3af;font-weight:600">Version</p>
                <p style="margin:4px 0 0;font-size:14px;color:#111827;font-weight:500">${versionDisplay}</p>
              </div>
              <div style="flex:1;padding:14px 28px">
                <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#9ca3af;font-weight:600">Time</p>
                <p style="margin:4px 0 0;font-size:14px;color:#111827;font-weight:500">${formattedTime}</p>
              </div>
            </div>

            <!-- Reported Screen -->
            <div style="padding:16px 28px;border-bottom:1px solid #f3f4f6;background:#fafafa">
              <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#9ca3af;font-weight:600">Reported Screen</p>
              <p style="margin:4px 0 0;font-size:15px;color:#111827;font-weight:600">${screenDisplay}</p>
            </div>

            ${featureDisplay ? `
            <!-- Active Feature -->
            <div style="padding:16px 28px;border-bottom:1px solid #f3f4f6;background:#fffbeb">
              <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#9ca3af;font-weight:600">Active Feature / Tool</p>
              <p style="margin:4px 0 0;font-size:15px;color:#92400e;font-weight:600">🔧 ${featureDisplay}</p>
            </div>` : ""}

            ${recentErrorsDisplay.length > 0 ? `
            <!-- Recent Errors -->
            <div style="padding:16px 28px;border-bottom:1px solid #f3f4f6">
              <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#9ca3af;font-weight:600">Recent Errors (last 60s)</p>
              ${recentErrorsDisplay.slice(0, 5).map((e: { message?: string; timestamp?: number }) => `
              <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:8px 12px;margin-bottom:6px">
                <p style="margin:0;font-size:12px;color:#991b1b;font-family:ui-monospace,SFMono-Regular,monospace;word-break:break-all">${(e.message || '').slice(0, 200)}</p>
              </div>`).join("")}
            </div>` : ""}

            <!-- Error Message -->
            <div style="padding:20px 28px">
              <p style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#9ca3af;font-weight:600">Error Message</p>
              <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px 16px">
                <p style="margin:0;font-size:14px;color:#991b1b;font-family:ui-monospace,SFMono-Regular,monospace;word-break:break-all;line-height:1.5">${error_message.slice(0, 500)}</p>
              </div>
            </div>

            ${additional_context ? `
            <!-- User Context -->
            <div style="padding:0 28px 20px">
              <p style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#9ca3af;font-weight:600">User's Note</p>
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 16px">
                <p style="margin:0;font-size:14px;color:#166534;line-height:1.5">${additional_context}</p>
              </div>
            </div>` : ""}

            <!-- System Information -->
            <div style="padding:0 28px 20px">
              <p style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#9ca3af;font-weight:600">System Information</p>
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
                <table style="width:100%;border-collapse:collapse;font-size:13px">
                  <tr style="border-bottom:1px solid #e2e8f0">
                    <td style="padding:10px 14px;color:#64748b;font-weight:600;width:120px">User ID</td>
                    <td style="padding:10px 14px;color:#1e293b;font-family:ui-monospace,SFMono-Regular,monospace;font-size:12px">${userIdDisplay}</td>
                  </tr>
                  <tr style="border-bottom:1px solid #e2e8f0">
                    <td style="padding:10px 14px;color:#64748b;font-weight:600">Session ID</td>
                    <td style="padding:10px 14px;color:#1e293b;font-family:ui-monospace,SFMono-Regular,monospace;font-size:12px">${sessionIdDisplay}</td>
                  </tr>
                  <tr style="border-bottom:1px solid #e2e8f0">
                    <td style="padding:10px 14px;color:#64748b;font-weight:600">Platform</td>
                    <td style="padding:10px 14px;color:#1e293b">${platform}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 14px;color:#64748b;font-weight:600;vertical-align:top">User Agent</td>
                    <td style="padding:10px 14px;color:#94a3b8;font-family:ui-monospace,SFMono-Regular,monospace;font-size:11px;line-height:1.4;word-break:break-all">${(user_agent || "N/A").slice(0, 300)}</td>
                  </tr>
                </table>
              </div>
            </div>

            ${error_stack ? `
            <!-- Stack Trace -->
            <div style="padding:0 28px 20px">
              <details>
                <summary style="cursor:pointer;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;font-weight:600;margin-bottom:8px">Stack Trace</summary>
                <pre style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;overflow-x:auto;font-size:12px;line-height:1.6;color:#374151;margin:0">${error_stack.slice(0, 3000)}</pre>
              </details>
            </div>` : ""}

            ${component_stack ? `
            <!-- Component Stack -->
            <div style="padding:0 28px 20px">
              <details>
                <summary style="cursor:pointer;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;font-weight:600;margin-bottom:8px">Component Stack</summary>
                <pre style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;overflow-x:auto;font-size:12px;line-height:1.6;color:#374151;margin:0">${component_stack.slice(0, 3000)}</pre>
              </details>
            </div>` : ""}

            <!-- Footer -->
            <div style="background:#f9fafb;padding:16px 28px;border-top:1px solid #e5e7eb;text-align:center">
              <p style="margin:0;font-size:12px;color:#9ca3af">WiseResume Bug Report System • Reply to reach the user</p>
            </div>
          </div>`;

        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: `Bug Reported by ${resolvedEmail} <bugs@magdysaber.com>`,
            to: [DEVELOPER_EMAIL],
            reply_to: resolvedEmail,
            subject: `[Bug Reported] ${screenDisplay} — ${error_message.slice(0, 50)}`,
            html: emailHtml,
          }),
        });
        const emailBody = await emailRes.text();
        if (!emailRes.ok) {
          console.error("Resend email failed:", emailRes.status, emailBody);
        } else {
          console.log("Bug report email sent:", emailBody);
        }
      } catch (emailErr) {
        console.error("Email send error:", emailErr);
      }
    } else {
      console.warn("RESEND_API_KEY not set, skipping email");
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
