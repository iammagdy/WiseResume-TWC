import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEVELOPER_EMAIL = "contact@magdysaber.com";

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

    // Log for developer (email integration can be added later)
    console.log(
      `[BUG REPORT] To: ${DEVELOPER_EMAIL} | From: ${resolvedEmail} | Error: ${error_message.slice(0, 200)} | Route: ${route}`
    );

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
