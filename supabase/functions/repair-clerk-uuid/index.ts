import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// One-shot repair: patches Clerk public_metadata.supabaseUuid to the correct UUID.
// Protected by a context token passed in the request body.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const { clerkUserId, correctSupabaseUuid, contextToken } = await req.json();

    // Validate context token
    const EXPECTED_TOKEN = "8F42B1C3-5D9E-4A7B-B2E1-9C3F4D5A6E7B";
    if (!contextToken || contextToken !== EXPECTED_TOKEN) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!clerkUserId || !correctSupabaseUuid || !uuidRegex.test(correctSupabaseUuid)) {
      return new Response(
        JSON.stringify({ error: "Invalid input: clerkUserId and correctSupabaseUuid (UUID) required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const CLERK_SECRET_KEY = Deno.env.get("CLERK_SECRET_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!CLERK_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: "CLERK_SECRET_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Verify the profile exists for correctSupabaseUuid
    const { data: profile } = await adminClient
      .from("profiles")
      .select("user_id, full_name, contact_email")
      .eq("user_id", correctSupabaseUuid)
      .maybeSingle();

    if (!profile) {
      return new Response(
        JSON.stringify({ error: `No profile found for UUID ${correctSupabaseUuid}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found profile for ${correctSupabaseUuid}: ${profile.full_name}`);

    // Patch Clerk public_metadata with the correct UUID
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

    console.log(`Repaired ${clerkUserId}: supabaseUuid → ${updatedUuid}`);

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
    console.error("repair-clerk-uuid error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
