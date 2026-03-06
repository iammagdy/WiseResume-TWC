import { createClient } from "npm:@supabase/supabase-js@2";
import { v5 as uuidv5 } from "npm:uuid@11";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Fixed namespace for deterministic UUID v5 generation from Clerk IDs
const CLERK_UUID_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8"; // DNS namespace

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    // ── Verify Clerk webhook signature ──
    const WEBHOOK_SECRET = Deno.env.get("CLERK_WEBHOOK_SECRET");
    if (!WEBHOOK_SECRET) {
      console.error("CLERK_WEBHOOK_SECRET not configured");
      return new Response("Server misconfigured", { status: 500, headers: corsHeaders });
    }

    const body = await req.text();
    const svixId = req.headers.get("svix-id");
    const svixTimestamp = req.headers.get("svix-timestamp");
    const svixSignature = req.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      return new Response("Missing svix headers", { status: 400, headers: corsHeaders });
    }

    // Verify timestamp is within 5 minutes to prevent replay attacks
    const timestampSec = parseInt(svixTimestamp, 10);
    const nowSec = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSec - timestampSec) > 300) {
      return new Response("Timestamp too old", { status: 400, headers: corsHeaders });
    }

    // Verify HMAC signature
    const signedContent = `${svixId}.${svixTimestamp}.${body}`;
    // Clerk webhook secrets are prefixed with "whsec_" and base64-encoded
    const secretBytes = Uint8Array.from(
      atob(WEBHOOK_SECRET.replace(/^whsec_/, "")),
      (c) => c.charCodeAt(0)
    );
    const key = await crypto.subtle.importKey(
      "raw",
      secretBytes,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBytes = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(signedContent)
    );
    const expectedSig = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));

    // Clerk sends multiple signatures separated by spaces, e.g. "v1,<sig1> v1,<sig2>"
    const signatures = svixSignature.split(" ");
    const verified = signatures.some((sig) => {
      const [, sigValue] = sig.split(",");
      return sigValue === expectedSig;
    });

    if (!verified) {
      console.error("Webhook signature verification failed");
      return new Response("Invalid signature", { status: 401, headers: corsHeaders });
    }

    // ── Parse event ──
    const event = JSON.parse(body);

    if (event.type !== "user.created") {
      // Acknowledge but ignore non-creation events
      return new Response(JSON.stringify({ ignored: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clerkUserId: string = event.data.id;
    const email: string | undefined =
      event.data.email_addresses?.[0]?.email_address;
    const firstName: string | undefined = event.data.first_name;
    const lastName: string | undefined = event.data.last_name;
    const fullName = [firstName, lastName].filter(Boolean).join(" ") || undefined;

    if (!clerkUserId) {
      return new Response("Missing user ID", { status: 400, headers: corsHeaders });
    }

    // ── Generate deterministic UUID v5 ──
    const supabaseUuid = uuidv5(clerkUserId, CLERK_UUID_NAMESPACE);
    console.log(`Mapping Clerk ${clerkUserId} → Supabase UUID ${supabaseUuid}`);

    // ── Create shadow auth.users row ──
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Try to create the auth user with the deterministic UUID
    const { error: createError } = await adminClient.auth.admin.createUser({
      id: supabaseUuid,
      email: email || `${clerkUserId}@clerk.placeholder`,
      email_confirm: true,
      user_metadata: {
        clerk_id: clerkUserId,
        full_name: fullName,
      },
    });

    if (createError) {
      // If user already exists (idempotency for Clerk retries), that's fine
      if (
        createError.message?.includes("already been registered") ||
        createError.message?.includes("duplicate") ||
        createError.message?.includes("already exists")
      ) {
        console.log(`Shadow user ${supabaseUuid} already exists — skipping creation`);
      } else {
        console.error("Failed to create shadow user:", createError.message);
        return new Response(
          JSON.stringify({ error: "Failed to create shadow user", detail: createError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      console.log(`Shadow user ${supabaseUuid} created successfully`);
      // The handle_new_user trigger will auto-create the profiles row
    }

    // If we have a name and email, update the profiles row
    if (fullName || email) {
      const profileUpdates: Record<string, string> = {};
      if (fullName) profileUpdates.full_name = fullName;
      if (email) profileUpdates.contact_email = email;

      await adminClient
        .from("profiles")
        .update(profileUpdates)
        .eq("user_id", supabaseUuid);
    }

    // ── Write UUID back to Clerk publicMetadata ──
    const CLERK_SECRET_KEY = Deno.env.get("CLERK_SECRET_KEY");
    if (!CLERK_SECRET_KEY) {
      console.error("CLERK_SECRET_KEY not configured — cannot write metadata back to Clerk");
      // Still return 200 so the webhook doesn't keep retrying
      return new Response(
        JSON.stringify({ success: true, supabaseUuid, warning: "CLERK_SECRET_KEY missing" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clerkRes = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${CLERK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        public_metadata: { supabaseUuid },
      }),
    });

    if (!clerkRes.ok) {
      const errText = await clerkRes.text();
      console.error(`Failed to update Clerk metadata: ${clerkRes.status} ${errText}`);
      // Return 200 anyway — the shadow user was created, metadata can be fixed manually
      return new Response(
        JSON.stringify({ success: true, supabaseUuid, warning: "Clerk metadata update failed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Clerk metadata updated for ${clerkUserId}: supabaseUuid=${supabaseUuid}`);

    return new Response(
      JSON.stringify({ success: true, supabaseUuid }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("clerk-webhook error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
