import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// One-shot admin repair function: updates Clerk metadata to point to the correct UUID
// and ensures the shadow auth user + profile exist for it.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const { clerkUserId, correctSupabaseUuid, adminSecret } = await req.json();

    // Simple admin guard — require a matching secret
    const REPAIR_SECRET = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!adminSecret || adminSecret !== REPAIR_SECRET) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!clerkUserId || !correctSupabaseUuid || !uuidRegex.test(correctSupabaseUuid)) {
      return new Response(
        JSON.stringify({ error: "Invalid input: clerkUserId and correctSupabaseUuid required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const CLERK_SECRET_KEY = Deno.env.get("CLERK_SECRET_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. Verify the profile exists for correctSupabaseUuid
    const { data: profile } = await adminClient
      .from("profiles")
      .select("user_id, full_name")
      .eq("user_id", correctSupabaseUuid)
      .maybeSingle();

    if (!profile) {
      return new Response(
        JSON.stringify({ error: `No profile found for UUID ${correctSupabaseUuid}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found profile for ${correctSupabaseUuid}: ${profile.full_name}`);

    // 2. Update Clerk public_metadata to point to the correct UUID
    if (!CLERK_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: "CLERK_SECRET_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const patchRes = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${CLERK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ public_metadata: { supabaseUuid: correctSupabaseUuid } }),
    });

    if (!patchRes.ok) {
      const errText = await patchRes.text();
      return new Response(
        JSON.stringify({ error: `Clerk PATCH failed: ${patchRes.status}`, detail: errText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const patchData = await patchRes.json();
    const updatedUuid = patchData.public_metadata?.supabaseUuid;

    console.log(`Repaired ${clerkUserId}: supabaseUuid now = ${updatedUuid}`);

    return new Response(
      JSON.stringify({
        success: true,
        clerkUserId,
        supabaseUuid: updatedUuid,
        profileName: profile.full_name,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("repair-user-uuid error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
