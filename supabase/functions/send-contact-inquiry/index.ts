import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEVELOPER_EMAIL = "contact@thewise.cloud";

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
    const { subject, message, user_id, user_email, user_agent, app_version, route } = body;

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
        const timestamp = new Date().toISOString();
        const formattedTime = new Date(timestamp).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
        const platform = parsePlatform(user_agent || "");
        const userIdDisplay = truncateUserId(resolvedUserId);

        const emailHtml = `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
            <div style="background:linear-gradient(135deg,#0ea5e9,#0284c7);padding:24px 28px;color:#ffffff">
              <h1 style="margin:0;font-size:20px;font-weight:700">📩 Contact Inquiry</h1>
              <p style="margin:6px 0 0;font-size:14px;opacity:0.9">from <strong>${resolvedEmail}</strong></p>
            </div>
            <div style="display:flex;gap:0;border-bottom:1px solid #f3f4f6">
              <div style="flex:1;padding:14px 28px;border-right:1px solid #f3f4f6">
                <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#9ca3af;font-weight:600">Route</p>
                <p style="margin:4px 0 0;font-size:14px;color:#111827;font-weight:500">${route || "N/A"}</p>
              </div>
              <div style="flex:1;padding:14px 28px;border-right:1px solid #f3f4f6">
                <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#9ca3af;font-weight:600">Version</p>
                <p style="margin:4px 0 0;font-size:14px;color:#111827;font-weight:500">${app_version || "unknown"}</p>
              </div>
              <div style="flex:1;padding:14px 28px">
                <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#9ca3af;font-weight:600">Time</p>
                <p style="margin:4px 0 0;font-size:14px;color:#111827;font-weight:500">${formattedTime}</p>
              </div>
            </div>
            <div style="padding:20px 28px;border-bottom:1px solid #f3f4f6">
              <p style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#9ca3af;font-weight:600">Subject</p>
              <div style="background:#e0f2fe;border:1px solid #7dd3fc;border-radius:8px;padding:14px 16px">
                <p style="margin:0;font-size:15px;color:#0c4a6e;font-weight:600;line-height:1.5">${subject.slice(0, 200)}</p>
              </div>
            </div>
            <div style="padding:20px 28px">
              <p style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#9ca3af;font-weight:600">Message</p>
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 16px">
                <p style="margin:0;font-size:14px;color:#166534;line-height:1.6;white-space:pre-wrap">${message.slice(0, 2000)}</p>
              </div>
            </div>
            <div style="padding:0 28px 20px">
              <p style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#9ca3af;font-weight:600">System Information</p>
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
                <table style="width:100%;border-collapse:collapse;font-size:13px">
                  <tr style="border-bottom:1px solid #e2e8f0">
                    <td style="padding:10px 14px;color:#64748b;font-weight:600;width:120px">User ID</td>
                    <td style="padding:10px 14px;color:#1e293b;font-family:ui-monospace,SFMono-Regular,monospace;font-size:12px">${userIdDisplay}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 14px;color:#64748b;font-weight:600">Platform</td>
                    <td style="padding:10px 14px;color:#1e293b">${platform}</td>
                  </tr>
                </table>
              </div>
            </div>
            <div style="background:#f9fafb;padding:16px 28px;border-top:1px solid #e5e7eb;text-align:center">
              <p style="margin:0;font-size:12px;color:#9ca3af">WiseResume Contact Inquiry • Reply to reach the user</p>
            </div>
          </div>`;

        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: `WiseResume Contact <contact@thewise.cloud>`,
            to: [DEVELOPER_EMAIL],
            reply_to: resolvedEmail,
            subject: `[Contact Inquiry] ${subject.slice(0, 80)}`,
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
