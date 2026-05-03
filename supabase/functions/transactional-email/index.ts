// transactional-email: consolidated router for the 3 Resend-backed
// transactional-email edge functions. See task #55 +
// EDGE_FUNCTION_AUDIT.md for rationale.
//
// Dispatch contract (per task spec):
//   PRIMARY:  body.action ∈ {
//     "contact-email", "contact-request", "resume-reminder"
//   }
//   FALLBACK: `x-transactional-email-action` request header. Used
//   when body.action is missing or names something else (e.g. the
//   pg_cron job that fires `resume-reminder` posts an empty body).
//
// Parity strategy: the router buffers the request body ONCE as text
// at the top, then hands the text string (NOT a parsed object) to
// each handler. Each handler does its OWN JSON.parse / req.text()
// equivalent inside its original try/catch wrapper, so each
// handler's parse-vs-validation-vs-throw semantics are preserved
// byte-for-byte against the originals.
//
// IMPORTANT: unlike other merged routers in this codebase, NO auth
// gate runs at the top. Each handler has its OWN auth posture and
// they intentionally differ:
//   - contact-email   → public; optional Bearer for user resolution;
//                       internal IP- and user-rate limiting.
//   - contact-request → public; honeypot; optional Bearer; rate-limited
//                       per IP.
//   - resume-reminder → CRON-SECRET gated via `x-cron-secret` header
//                       (`requireCronSecret`). Service-to-service only.
// Hoisting auth would have broken contact-email's dry_run + saved-but-
// not-sent semantics and contact-request's anonymous public path.
//
// Email content (subject, from, to, html body, text body) for each
// handler is a verbatim port of its original — DO NOT modify any
// template, copy, branding, or Resend account/domain in this file
// (out of scope per task #55).

import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { checkRateLimit, recordUsage } from "../_shared/rateLimiter.ts";
import { checkPayloadSize } from "../_shared/requestUtils.ts";
import { escapeHtml } from "../_shared/htmlEscape.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireCronSecret } from "../_shared/webhookAuth.ts";
import { wrapHandler } from "../_shared/fnLogger.ts";

// ─── contact-email (was send-contact-email) ────────────────────────────

const DEVELOPER_EMAIL = "contact@thewise.cloud";
const LOGO_URL = "https://jnsfmkzgxsviuthaqlyy.supabase.co/storage/v1/object/public/avatars/email-assets/wise-ai-logo.png";

// Adjust this constant to change the per-IP rate limit without touching SQL directly.
// The matching SQL function (check_email_rate_limit) uses 3 requests per hour per IP.
const RATE_LIMIT_REQUESTS_PER_HOUR = 3;

function buildSubject(type: string, email: string, metadata: Record<string, unknown>): string {
  switch (type) {
    case "bug":
      return `[Bug Report] ${email}`;
    case "auto-crash-report":
      return `[Auto Crash Report] ${email}`;
    case "contact": {
      const dept = typeof metadata.department === "string" && metadata.department
        ? metadata.department
        : "General";
      return `[Inquiry - ${dept}] ${email}`;
    }
    case "feature":
      return `[Feature Request] ${email}`;
    case "username-request": {
      const requested = typeof metadata.requested_username === "string" && metadata.requested_username
        ? metadata.requested_username
        : "unknown";
      return `Username Requested: ${requested}`;
    }
    default:
      return `[${type.toUpperCase()}] ${email}`;
  }
}

async function handleContactEmail(
  req: Request,
  bodyText: string,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = JSON.parse(bodyText);
    const { type, email, subject, message, metadata = {}, dry_run = false } = body as {
      type: string;
      email: string;
      subject?: string;
      message: string;
      metadata?: Record<string, unknown>;
      dry_run?: boolean;
    };

    if (!type || !email || !message) {
      return new Response(
        JSON.stringify({ error: "Type, email, and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (dry_run) {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      const hasKey = !!(RESEND_API_KEY && RESEND_API_KEY.trim().length > 0);
      return new Response(
        JSON.stringify({
          success: hasKey,
          reason: "dry_run",
          resend_api_key_configured: hasKey,
          note: hasKey
            ? "RESEND_API_KEY is configured. Email pipeline is ready."
            : "RESEND_API_KEY is NOT configured — emails will fail. Set it as a Supabase secret.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clientIp = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for") || "unknown";
    const windowStart = new Date(Date.now() - 3600_000).toISOString();

    const { count: recentCount, error: countError } = await supabaseAdmin
      .from("contact_requests")
      .select("*", { count: "exact", head: true })
      .eq("ip_address", clientIp)
      .gte("created_at", windowStart);

    if (countError) {
      console.warn("Rate limit count error (allowing request):", countError.message);
    } else if ((recentCount ?? 0) >= RATE_LIMIT_REQUESTS_PER_HOUR) {
      return new Response(
        JSON.stringify({ error: `Too many requests. Limit is ${RATE_LIMIT_REQUESTS_PER_HOUR} per hour per IP. Please try again later.` }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "3600" } }
      );
    }

    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));
      if (user) userId = user.id;
    }

    const rateLimitKey = userId ?? clientIp;
    const { allowed: rlAllowed } = await checkRateLimit(rateLimitKey, { actionType: 'contact_email', maxRequests: 5, windowSeconds: 300 });
    if (!rlAllowed) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please wait 5 minutes before sending another message." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "300" } }
      );
    }
    await recordUsage(rateLimitKey, 'contact_email');

    const { data: insertedRow, error: dbError } = await supabaseAdmin
      .from("contact_requests")
      .insert({
        type,
        user_id: userId,
        email,
        subject,
        message,
        metadata: { ...metadata, email_sent: false },
        ip_address: clientIp,
      })
      .select("id")
      .single();

    if (dbError) {
      console.error("DB insert error:", dbError);
      return new Response(
        JSON.stringify({ error: "Failed to save request", details: dbError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const recordId: string | null = insertedRow?.id ?? null;

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not configured — request saved to DB but email not sent.");
      return new Response(
        JSON.stringify({ success: false, reason: "email_not_configured", saved: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const typeLabels: Record<string, string> = {
      bug: "🐛 Bug Report",
      "auto-crash-report": "🚨 Auto Crash Report",
      feature: "✨ Feature Request",
      contact: "✉️ Contact Inquiry",
      "username-request": "🔖 Username Request",
    };

    const emailSubject = buildSubject(type, email, metadata);

    let emailHtml: string;
    if (type === "username-request") {
      const requested = String(metadata.requested_username ?? "");
      const fullName = String(metadata.full_name ?? "");
      const reason = String(metadata.reason ?? "");
      emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 24px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="${LOGO_URL}" alt="WiseResume" width="50" style="border-radius: 10px;" />
            <h2 style="color: #1a1a2e; margin-top: 12px;">🔖 Username Request</h2>
            <p style="color: #666; margin: 4px 0 0; font-size: 13px;">A user is requesting a reserved username</p>
          </div>
          <div style="background: #f4f6fb; padding: 16px 18px; border-radius: 8px; margin-bottom: 16px;">
            <p style="margin: 0 0 4px; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.4px;">Requested username</p>
            <p style="margin: 0; font-size: 20px; font-weight: 700; color: #1a1a2e; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;">${escapeHtml(requested)}</p>
          </div>
          <p><strong>Full name:</strong> ${escapeHtml(fullName || "—")}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p style="margin-bottom: 6px;"><strong>Reason:</strong></p>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; white-space: pre-wrap; font-size: 13px; color: #333;">
            ${escapeHtml(reason || message || "(no reason provided)")}
          </div>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
          <div style="font-size: 11px; color: #888;">
            <p><strong>IP:</strong> ${escapeHtml(clientIp)}</p>
            <p><strong>User ID:</strong> ${userId || "Anonymous"}</p>
            <p><strong>Time:</strong> ${new Date().toISOString()}</p>
            ${recordId ? `<p><strong>Record ID:</strong> ${recordId}</p>` : ""}
          </div>
        </div>
      `;
    } else {
      emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="${LOGO_URL}" alt="WiseResume" width="50" style="border-radius: 10px;" />
            <h2 style="color: #1a1a2e; margin-top: 10px;">${typeLabels[type] || "Contact Request"}</h2>
          </div>
          <p><strong>From:</strong> ${escapeHtml(email)}</p>
          <p><strong>Subject:</strong> ${escapeHtml(subject || "No Subject")}</p>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; white-space: pre-wrap;">
            ${escapeHtml(message)}
          </div>
          ${metadata.department ? `<p><strong>Department:</strong> ${escapeHtml(metadata.department)}</p>` : ""}
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
          <div style="font-size: 12px; color: #666;">
            <p><strong>IP:</strong> ${escapeHtml(clientIp)}</p>
            <p><strong>User ID:</strong> ${userId || "Anonymous"}</p>
            <p><strong>Time:</strong> ${new Date().toISOString()}</p>
            ${recordId ? `<p><strong>Record ID:</strong> ${recordId}</p>` : ""}
          </div>
        </div>
      `;
    }

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "WiseResume Support <notifications@thewise.cloud>",
        to: [DEVELOPER_EMAIL],
        reply_to: email,
        subject: emailSubject,
        html: emailHtml,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error("Resend error:", JSON.stringify(resendData));
      if (recordId) {
        await supabaseAdmin
          .from("contact_requests")
          .update({ metadata: { ...metadata, email_sent: false, email_error: String(resendData?.message ?? resendData) } })
          .eq("id", recordId);
      }
      return new Response(
        JSON.stringify({ success: false, reason: "email_delivery_failed", saved: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (recordId) {
      await supabaseAdmin
        .from("contact_requests")
        .update({ metadata: { ...metadata, email_sent: true, resend_id: resendData.id } })
        .eq("id", recordId);
    }

    return new Response(
      JSON.stringify({ success: true, messageId: resendData.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

// ─── contact-request (was submit-contact-request) ──────────────────────

const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const MIN_MESSAGE_LENGTH = 10;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_EMAIL_LENGTH = 254;
const MAX_SUBJECT_LENGTH = 200;

async function handleContactRequest(
  req: Request,
  bodyText: string,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  // Payload-size guard — verbatim port of the original
  // submit-contact-request behavior: same shared helper, same
  // Content-Length-based check, same 413 envelope. The helper-built
  // Response is returned directly (NO router CORS merge) to preserve
  // byte-for-byte parity with the original. Scoped to this handler
  // only; contact-email and resume-reminder had no payload guard
  // pre-merge.
  const oversized = checkPayloadSize(req, 64 * 1024);
  if (oversized) return oversized;

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = JSON.parse(bodyText);
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

    // Honeypot — fake-success on bot submissions.
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

    // Owner notification for portfolio contact messages
    if (type === "portfolio_contact" && metadata?.portfolio_username) {
      try {
        const portfolioUsername = String(metadata.portfolio_username);

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
}

// ─── resume-reminder (was send-resume-reminder) ────────────────────────

async function handleResumeReminder(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  // Cron-secret gate (service-to-service only). Mirrors the pre-merge
  // function exactly — including the fail-closed 503 when CRON_SECRET
  // is not configured (raised inside requireCronSecret).
  try {
    requireCronSecret(req, corsHeaders);
  } catch (resp) {
    if (resp instanceof Response) return resp;
    throw resp;
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: staleResumes, error } = await supabase
      .from("resumes")
      .select("id, user_id, title, updated_at, last_reminder_sent_at")
      .lt("updated_at", ninetyDaysAgo.toISOString())
      .or(`last_reminder_sent_at.is.null,last_reminder_sent_at.lt.${thirtyDaysAgo.toISOString()}`);

    if (error) {
      console.error("Error fetching stale resumes:", error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: corsHeaders });
    }

    let reminded = 0;

    for (const resume of (staleResumes ?? [])) {
      try {
        const daysStale = Math.floor(
          (Date.now() - new Date(resume.updated_at).getTime()) / (1000 * 60 * 60 * 24)
        );

        await supabase.from("notifications").insert({
          user_id: resume.user_id,
          type: "system",
          title: "📝 Your resume needs a refresh",
          message: `"${resume.title}" hasn't been updated in ${daysStale} days. Keep it current so you're always ready.`,
          link: `/resume/${resume.id}`,
        });

        await supabase
          .from("resumes")
          .update({ last_reminder_sent_at: new Date().toISOString() })
          .eq("id", resume.id);

        reminded++;
      } catch (err) {
        console.warn(`Failed to remind for resume ${resume.id}:`, err);
      }
    }

    return new Response(JSON.stringify({ ok: true, reminded }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Resume reminder error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

// ─── router ────────────────────────────────────────────────────────────

const VALID_ACTIONS = new Set([
  "contact-email",
  "contact-request",
  "resume-reminder",
]);

Deno.serve(wrapHandler("transactional-email", async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Buffer body once. Each handler will JSON.parse from this text
  // string with its own try/catch wrapper, so each handler preserves
  // its original parse-vs-validation semantics.
  let bodyText: string;
  try {
    bodyText = await req.text();
  } catch {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Soft-parse for dispatch only.
  let dispatchAction: string | undefined;
  try {
    const parsedForDispatch = JSON.parse(bodyText) as { action?: unknown };
    if (typeof parsedForDispatch?.action === "string") {
      dispatchAction = parsedForDispatch.action;
    }
  } catch {
    /* fall through to header fallback below */
  }

  let action: string;
  if (dispatchAction && VALID_ACTIONS.has(dispatchAction)) {
    action = dispatchAction;
  } else {
    action = req.headers.get("x-transactional-email-action") ?? "";
  }

  switch (action) {
    case "contact-email":
      return await handleContactEmail(req, bodyText, corsHeaders);
    case "contact-request":
      return await handleContactRequest(req, bodyText, corsHeaders);
    case "resume-reminder":
      return await handleResumeReminder(req, corsHeaders);
    default:
      return new Response(
        JSON.stringify({
          error: `Unknown action: ${action || "(missing)"}. Use one of: contact-email, contact-request, resume-reminder`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
  }
}));
