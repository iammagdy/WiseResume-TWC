import { createClient } from "npm:@supabase/supabase-js@2";
import { v5 as uuidv5 } from "npm:uuid@11";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CLERK_UUID_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const { clerkUserId } = await req.json();

    if (!clerkUserId || typeof clerkUserId !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing clerkUserId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the Clerk user exists via Clerk API
    const CLERK_SECRET_KEY = Deno.env.get("CLERK_SECRET_KEY");
    if (!CLERK_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: "CLERK_SECRET_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clerkRes = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
      headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` },
    });

    if (!clerkRes.ok) {
      return new Response(
        JSON.stringify({ error: "Invalid Clerk user" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clerkUser = await clerkRes.json();

    // Check if already provisioned
    const existingUuid = clerkUser.public_metadata?.supabaseUuid;
    if (existingUuid) {
      return new Response(
        JSON.stringify({ supabaseUuid: existingUuid, alreadyProvisioned: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate deterministic UUID
    const supabaseUuid = uuidv5(clerkUserId, CLERK_UUID_NAMESPACE);
    console.log(`Provisioning Clerk ${clerkUserId} → Supabase UUID ${supabaseUuid}`);

    const email = clerkUser.email_addresses?.[0]?.email_address;
    const fullName = [clerkUser.first_name, clerkUser.last_name].filter(Boolean).join(" ") || undefined;

    // Create shadow auth.users row
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error: createError } = await adminClient.auth.admin.createUser({
      id: supabaseUuid,
      email: email || `${clerkUserId}@clerk.placeholder`,
      email_confirm: true,
      user_metadata: { clerk_id: clerkUserId, full_name: fullName },
    });

    if (createError) {
      if (
        createError.message?.includes("already been registered") ||
        createError.message?.includes("duplicate") ||
        createError.message?.includes("already exists")
      ) {
        console.log(`Shadow user ${supabaseUuid} already exists`);
      } else {
        console.error("Failed to create shadow user:", createError.message);
        return new Response(
          JSON.stringify({ error: "Failed to create shadow user", detail: createError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Update profiles
    if (fullName || email) {
      const updates: Record<string, string> = {};
      if (fullName) updates.full_name = fullName;
      if (email) updates.contact_email = email;
      await adminClient.from("profiles").update(updates).eq("user_id", supabaseUuid);
    }

    // Write supabaseUuid to Clerk publicMetadata
    const patchRes = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${CLERK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ public_metadata: { supabaseUuid } }),
    });

    if (!patchRes.ok) {
      const errText = await patchRes.text();
      console.error(`Failed to update Clerk metadata: ${patchRes.status} ${errText}`);
      return new Response(
        JSON.stringify({ error: "Failed to update Clerk metadata" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Provisioned ${clerkUserId}: supabaseUuid=${supabaseUuid}`);

    return new Response(
      JSON.stringify({ supabaseUuid }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("provision-clerk-user error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
