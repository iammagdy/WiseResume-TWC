import { createClient } from "npm:@supabase/supabase-js@2";
import { v5 as uuidv5 } from "npm:uuid@11";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CLERK_UUID_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

async function patchClerkMetadata(clerkUserId: string, supabaseUuid: string, clerkSecretKey: string) {
  const patchRes = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${clerkSecretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ public_metadata: { supabaseUuid } }),
  });
  if (!patchRes.ok) {
    const errText = await patchRes.text();
    console.error(`Failed to update Clerk metadata: ${patchRes.status} ${errText}`);
    return false;
  }
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const { clerkUserId, forceReprovision } = await req.json();

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

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const email = clerkUser.email_addresses?.[0]?.email_address as string | undefined;
    const fullName = [clerkUser.first_name, clerkUser.last_name].filter(Boolean).join(" ") || undefined;

    // Check if already provisioned in Clerk metadata
    const existingUuid = clerkUser.public_metadata?.supabaseUuid as string | undefined;
    if (existingUuid) {
      // Verify the profile exists AND has real data (not an orphaned empty row)
      const { data: existingProfile } = await adminClient
        .from("profiles")
        .select("user_id, full_name, job_title")
        .eq("user_id", existingUuid)
        .maybeSingle();

      if (existingProfile) {
        // Check if it's an orphaned empty profile (no name, no job title)
        const isOrphaned = !existingProfile.full_name && !existingProfile.job_title;

        if (!isOrphaned) {
          // Profile exists with real data — truly already provisioned
          console.log(`User ${clerkUserId} already provisioned with uuid ${existingUuid}`);
          return new Response(
            JSON.stringify({ supabaseUuid: existingUuid, alreadyProvisioned: true }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Orphaned empty profile found — fall through to email-based repair
        console.log(`Orphaned empty profile detected for ${existingUuid}, searching for real profile...`);
      }

      // Profile missing for existingUuid — search for an existing profile
      console.log(`Profile missing for existingUuid ${existingUuid}, searching for existing profile...`);

      let correctUuid: string | null = null;

      // Step 1: Search profiles by contact_email
      if (email) {
        const { data: profileByEmail } = await adminClient
          .from("profiles")
          .select("user_id")
          .eq("contact_email", email)
          .maybeSingle();

        if (profileByEmail && profileByEmail.user_id !== existingUuid) {
          correctUuid = profileByEmail.user_id;
          console.log(`Found profile by contact_email under ${correctUuid}`);
        }
      }

      // Step 2: Fallback — search auth.users by email (handles profiles with NULL contact_email)
      if (!correctUuid && email) {
        console.log(`Searching auth.users by email ${email}...`);
        const { data: authUsersData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
        const matchingAuthUser = authUsersData?.users?.find((u: { email?: string; id: string }) => u.email === email);

        if (matchingAuthUser && matchingAuthUser.id !== existingUuid) {
          // Verify this auth user has a profile
          const { data: profileForAuthUser } = await adminClient
            .from("profiles")
            .select("user_id")
            .eq("user_id", matchingAuthUser.id)
            .maybeSingle();

          if (profileForAuthUser) {
            correctUuid = matchingAuthUser.id;
            console.log(`Found existing profile via auth.users email lookup: ${correctUuid}`);
          }
        }
      }

      if (correctUuid) {
        // Update Clerk metadata to point to correct UUID
        await patchClerkMetadata(clerkUserId, correctUuid, CLERK_SECRET_KEY);

        // Also update the profile's contact_email so future lookups work
        if (email) {
          await adminClient
            .from("profiles")
            .update({ contact_email: email })
            .eq("user_id", correctUuid)
            .is("contact_email", null);
        }

        return new Response(
          JSON.stringify({ supabaseUuid: correctUuid, repaired: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // No existing profile found — create a new one for existingUuid
      console.log(`No existing profile found, creating new profile for ${existingUuid}`);
      const { error: createError } = await adminClient.auth.admin.createUser({
        id: existingUuid,
        email: email || `${clerkUserId}@clerk.placeholder`,
        email_confirm: true,
        user_metadata: { clerk_id: clerkUserId, full_name: fullName },
      });

      if (createError && !createError.message?.includes("already") && !createError.message?.includes("duplicate")) {
        console.error("Failed to create shadow user:", createError.message);
        return new Response(
          JSON.stringify({ error: "Failed to create shadow user", detail: createError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const profileData: Record<string, string> = { user_id: existingUuid };
      if (fullName) profileData.full_name = fullName;
      if (email) profileData.contact_email = email;
      await adminClient
        .from("profiles")
        .upsert(profileData, { onConflict: "user_id", ignoreDuplicates: false });

      console.log(`Re-provisioned profile for ${clerkUserId} under uuid ${existingUuid}`);
      return new Response(
        JSON.stringify({ supabaseUuid: existingUuid, reprovisioned: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate deterministic UUID for new provisioning
    const supabaseUuid = uuidv5(clerkUserId, CLERK_UUID_NAMESPACE);
    console.log(`Provisioning Clerk ${clerkUserId} → Supabase UUID ${supabaseUuid}`);

    // Check if a profile already exists under this deterministic UUID or by email
    let finalUuid = supabaseUuid;

    if (email) {
      // Check auth.users for this email first
      const { data: authUsersData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      const matchingAuthUser = authUsersData?.users?.find((u: { email?: string; id: string }) => u.email === email);
      if (matchingAuthUser && matchingAuthUser.id !== supabaseUuid) {
        const { data: profileForAuthUser } = await adminClient
          .from("profiles")
          .select("user_id")
          .eq("user_id", matchingAuthUser.id)
          .maybeSingle();
        if (profileForAuthUser) {
          finalUuid = matchingAuthUser.id;
          console.log(`Found existing profile via email during new provision, using ${finalUuid}`);
          await patchClerkMetadata(clerkUserId, finalUuid, CLERK_SECRET_KEY);
          return new Response(
            JSON.stringify({ supabaseUuid: finalUuid, repaired: true }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Create shadow auth.users row
    const { error: createError } = await adminClient.auth.admin.createUser({
      id: finalUuid,
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
        console.log(`Shadow user ${finalUuid} already exists`);
      } else {
        console.error("Failed to create shadow user:", createError.message);
        return new Response(
          JSON.stringify({ error: "Failed to create shadow user", detail: createError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Upsert profile row
    const profileData: Record<string, string> = { user_id: finalUuid };
    if (fullName) profileData.full_name = fullName;
    if (email) profileData.contact_email = email;
    await adminClient
      .from("profiles")
      .upsert(profileData, { onConflict: "user_id", ignoreDuplicates: false });

    // Write supabaseUuid to Clerk publicMetadata
    const patched = await patchClerkMetadata(clerkUserId, finalUuid, CLERK_SECRET_KEY);
    if (!patched) {
      return new Response(
        JSON.stringify({ error: "Failed to update Clerk metadata" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Provisioned ${clerkUserId}: supabaseUuid=${finalUuid}`);

    return new Response(
      JSON.stringify({ supabaseUuid: finalUuid }),
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
