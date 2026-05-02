import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { checkRateLimit, recordUsage } from "../_shared/rateLimiter.ts";
import { checkPayloadSize } from "../_shared/requestUtils.ts";

import { wrapHandler } from '../_shared/fnLogger.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const MIN_MESSAGE_LENGTH = 10;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_EMAIL_LENGTH = 254;
const MAX_SUBJECT_LENGTH = 200;

Deno.serve(wrapHandler("submit-contact-request", async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const sizeError = checkPayloadSize(req, 64 * 1024);
  if (sizeError) return sizeError;

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const {
      type,
      email,
      subject,
      message,
      metadata = {},
      website,
    } = body as {
      type: string;
      email: string;
      subject?: string;
      message: string;
      metadata?: Record<string, unknown>;
      website?: string;
    };

    // Honeypot: a legitimate user never sees the visually-hidden `website`
    // field, so any non-empty value indicates an automated bot.  Return a
    // fake-success response (200 + success body) so the spammer cannot
    // distinguish detection from acceptance and won't retry with variations.
    if (typeof website === "string" && website.trim().length > 0) {
      return new Response(
        JSON.stringify({ success: true, id: null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!type || !email || !message) {
      return new Response(
        JSON.stringify({ error: "type, email, and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typeof email !== "string" || email.length > MAX_EMAIL_LENGTH || !EMAIL_REGEX.test(email.trim())) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typeof message !== "string" || message.trim().length < MIN_MESSAGE_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Message must be at least ${MIN_MESSAGE_LENGTH} characters` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (message.trim().length > MAX_MESSAGE_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Message must not exceed ${MAX_MESSAGE_LENGTH} characters` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (subject && (typeof subject !== "string" || subject.length > MAX_SUBJECT_LENGTH)) {
      return new Response(
        JSON.stringify({ error: `Subject must not exceed ${MAX_SUBJECT_LENGTH} characters` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clientIp =
      req.headers.get("x-real-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

    const rateLimitKey = `contact_ip:${clientIp}`;
    const { allowed } = await checkRateLimit(rateLimitKey, {
      actionType: "submit_contact",
      maxRequests: 3,
      windowSeconds: 300,
    });

    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please wait 5 minutes before submitting again." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const { data: { user } } = await supabaseAdmin.auth.getUser(
          authHeader.replace("Bearer ", "")
        );
        if (user) userId = user.id;
      } catch {
        // Non-critical — anonymous submission is allowed
      }
    }

    const { data: insertedRow, error: dbError } = await supabaseAdmin
      .from("contact_requests")
      .insert({
        type,
        user_id: userId,
        email: email.trim(),
        subject: subject?.trim() || null,
        message: message.trim(),
        metadata,
        ip_address: clientIp,
      })
      .select("id")
      .single();

    if (dbError) {
      console.error("[submit-contact-request] DB insert error:", dbError);
      return new Response(
        JSON.stringify({ error: "Failed to save contact request" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await recordUsage(rateLimitKey, "submit_contact");

    // --- Owner notification for portfolio contact messages ---
    if (type === "portfolio_contact" && metadata?.portfolio_username) {
      try {
        const portfolioUsername = String(metadata.portfolio_username);

        // Resolve the owner's auth UUID from their portfolio username
        // profiles.user_id IS the auth UUID (not profiles.id which is a surrogate PK)
        const { data: profileRow } = await supabaseAdmin
          .from("profiles")
          .select("user_id")
          .eq("username", portfolioUsername)
          .single();

        if (profileRow?.user_id) {
          const senderLabel = email.trim();
          const snippet =
            message.trim().length > 120
              ? message.trim().slice(0, 117) + "…"
              : message.trim();

          await supabaseAdmin.from("notifications").insert({
            user_id: profileRow.user_id,
            type: "portfolio_contact",
            title: `New message from ${senderLabel}`,
            message: snippet,
            link: "/portfolio",
            is_read: false,
          });
        }
      } catch (notifyErr) {
        // Non-critical — log and continue; contact row is already saved
        console.warn("[submit-contact-request] Owner notification failed:", notifyErr);
      }
    }

    return new Response(
      JSON.stringify({ success: true, id: insertedRow?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[submit-contact-request] Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}));
