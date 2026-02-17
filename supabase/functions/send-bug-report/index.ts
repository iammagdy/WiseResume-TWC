import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEVELOPER_EMAIL = "bugs@magdysaber.com";

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
      user_id,
      user_email,
      session_id,
      user_agent,
      app_version,
      additional_context,
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

    // Resolve user_id from auth header if not provided
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

    // Save to database
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
      });

    if (dbError) {
      console.error("DB insert error:", dbError);
      return new Response(
        JSON.stringify({ error: "Failed to save report" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send email via Resend
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY) {
      try {
        const timestamp = new Date().toISOString();
        const emailHtml = `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#e11d48">🐛 Bug Report</h2>
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:6px;font-weight:bold;color:#666">Error</td><td style="padding:6px">${error_message.slice(0, 500)}</td></tr>
              <tr><td style="padding:6px;font-weight:bold;color:#666">Route</td><td style="padding:6px">${route || "N/A"}</td></tr>
              <tr><td style="padding:6px;font-weight:bold;color:#666">User</td><td style="padding:6px">${resolvedEmail}</td></tr>
              <tr><td style="padding:6px;font-weight:bold;color:#666">Context</td><td style="padding:6px">${additional_context || "None"}</td></tr>
              <tr><td style="padding:6px;font-weight:bold;color:#666">App Version</td><td style="padding:6px">${app_version || "1.0.0"}</td></tr>
              <tr><td style="padding:6px;font-weight:bold;color:#666">Time</td><td style="padding:6px">${timestamp}</td></tr>
            </table>
            ${error_stack ? `<details><summary style="cursor:pointer;margin-top:12px;font-weight:bold">Stack Trace</summary><pre style="background:#f5f5f5;padding:12px;overflow-x:auto;font-size:12px">${error_stack.slice(0, 3000)}</pre></details>` : ""}
            ${component_stack ? `<details><summary style="cursor:pointer;margin-top:8px;font-weight:bold">Component Stack</summary><pre style="background:#f5f5f5;padding:12px;overflow-x:auto;font-size:12px">${component_stack.slice(0, 3000)}</pre></details>` : ""}
          </div>`;

        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: `Bug from ${resolvedEmail} <bugs@magdysaber.com>`,
            to: [DEVELOPER_EMAIL],
            reply_to: resolvedEmail,
            subject: `[Bug Report] ${error_message.slice(0, 60)}`,
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
