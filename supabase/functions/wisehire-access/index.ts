// wisehire-access: consolidated router for the 5 anonymous / user-gated
// wisehire onboarding & access functions.
//
// Routes on body.action ∈ {
//   "waitlist-check-email", "waitlist-join", "validate-early-access",
//   "validate-invite", "complete-signup"
// }.
//
// Each sub-handler is a byte-for-byte port of the original function:
//   - same auth posture (anonymous for waitlist-check / waitlist-join /
//     validate-early-access / validate-invite; bearer-required for
//     complete-signup)
//   - same validation, response shape, error codes, status codes
//   - same shared helpers (_shared/cors, botGuard, rateLimiter, dbClient,
//     resendAudiences, etc.)
//
// See task #50 + EDGE_FUNCTION_AUDIT.md for the merge rationale.

import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { getCorsHeaders } from "../_shared/cors.ts";
import { isMaliciousBot, botBlockedResponse } from "../_shared/botGuard.ts";
import { checkIpRateLimit } from "../_shared/rateLimiter.ts";
import { escapeHtml } from "../_shared/htmlEscape.ts";
import { addContact } from "../_shared/resendAudiences.ts";
import { getAudienceId, AUDIENCE_KEYS } from "../_shared/resendConfig.ts";
import { getServiceClient } from "../_shared/dbClient.ts";
import { wrapHandler } from "../_shared/fnLogger.ts";

const ADMIN_EMAIL = "contact@thewise.cloud";
const WISEHIRE_BLUE = "#1D4ED8";
const EMAIL_LOGO_URL = "https://jnsfmkzgxsviuthaqlyy.supabase.co/storage/v1/object/public/emails/email-logo.png";

const CONSUMER_DOMAINS = new Set([
  "gmail.com","googlemail.com",
  "yahoo.com","yahoo.co.uk","yahoo.co.in","yahoo.fr","yahoo.de","yahoo.es",
  "yahoo.it","yahoo.com.au","yahoo.com.br","yahoo.ca","yahoo.com.mx","yahoo.com.ar",
  "ymail.com",
  "hotmail.com","hotmail.co.uk","hotmail.fr","hotmail.de","hotmail.es",
  "hotmail.it","hotmail.com.br","hotmail.com.ar","hotmail.com.mx",
  "outlook.com","outlook.co.uk","outlook.fr","outlook.de","outlook.es","outlook.it",
  "live.com","live.co.uk","live.fr","live.de",
  "icloud.com","me.com","mac.com",
  "aol.com","aim.com",
  "mail.com","email.com",
  "protonmail.com","proton.me",
  "gmx.com","gmx.de","gmx.net",
  "web.de","t-online.de",
  "comcast.net","verizon.net","att.net","sbcglobal.net","cox.net","charter.net",
  "earthlink.net","optonline.net",
  "qq.com","163.com","126.com","sina.com",
  "naver.com","hanmail.net","daum.net",
]);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(data: unknown, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ════════════════════════════════════════════════════════════════════
// waitlist-check-email  (was wisehire-waitlist-check-email)
// Method posture: 405 on non-POST (matches original).
// Malformed-body posture: original wrapped req.json() in try/catch and
// returned the 500 internal-server-error envelope — preserved here.
// ════════════════════════════════════════════════════════════════════
async function handleWaitlistCheckEmail(
  req: Request,
  body: { email?: string } | null,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, corsHeaders);

  if (body === null) {
    return json({ error: "Internal server error" }, 500, corsHeaders);
  }

  const ua = req.headers.get("user-agent");
  if (isMaliciousBot(ua)) return botBlockedResponse(corsHeaders);

  const clientIp =
    (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    null;

  if (clientIp) {
    const ipLimit = await checkIpRateLimit(clientIp, "wisehire-waitlist-check-email", 30, 60);
    if (!ipLimit.allowed) {
      return new Response(JSON.stringify({ error: "Too Many Requests" }), {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Retry-After": String(ipLimit.retryAfterSeconds),
        },
      });
    }
  }

  try {
    const rawEmail = ((body as { email?: string }).email ?? "").trim();

    const valid_format = EMAIL_REGEX.test(rawEmail);
    if (!valid_format) {
      return json(
        {
          valid_format: false,
          is_consumer_domain: false,
          existing_wiseresume_user: false,
          already_on_waitlist: false,
        },
        200,
        corsHeaders,
      );
    }

    const normalizedEmail = rawEmail.toLowerCase();
    const domain = normalizedEmail.split("@")[1] ?? "";
    const is_consumer_domain = CONSUMER_DOMAINS.has(domain);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: emailExists, error: rpcError } = await supabase.rpc(
      "check_email_exists",
      { p_email: normalizedEmail },
    );
    if (rpcError) {
      console.error("[wisehire-access:waitlist-check-email] check_email_exists RPC error:", rpcError.message);
      return json(
        { error: "Service temporarily unavailable. Please try again in a moment." },
        503,
        corsHeaders,
      );
    }

    const existing_wiseresume_user = emailExists === true;

    if (is_consumer_domain) {
      return json(
        {
          valid_format: true,
          is_consumer_domain: true,
          existing_wiseresume_user,
          already_on_waitlist: false,
        },
        200,
        corsHeaders,
      );
    }

    let already_on_waitlist = false;
    if (!existing_wiseresume_user) {
      const { data: existing, error: waitlistErr } = await supabase
        .from("wisehire_waitlist")
        .select("id")
        .eq("email", normalizedEmail)
        .maybeSingle();
      if (waitlistErr) {
        console.error("[wisehire-access:waitlist-check-email] waitlist lookup error:", waitlistErr.message);
        return json(
          { error: "Service temporarily unavailable. Please try again in a moment." },
          503,
          corsHeaders,
        );
      }
      already_on_waitlist = !!existing;
    }

    return json(
      {
        valid_format: true,
        is_consumer_domain: false,
        existing_wiseresume_user,
        already_on_waitlist,
      },
      200,
      corsHeaders,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[wisehire-access:waitlist-check-email] unhandled error:", msg);
    return json({ error: "Internal server error" }, 500, corsHeaders);
  }
}

// ════════════════════════════════════════════════════════════════════
// waitlist-join  (was wisehire-waitlist-join)
// ════════════════════════════════════════════════════════════════════
function buildConfirmationEmail(name: string, position: number): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!--[if !mso]><!-->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap">
  <!--<![endif]-->
  <style>
    @media only screen and (max-width: 560px) {
      .px-wide { padding-left: 20px !important; padding-right: 20px !important; }
      .cta-table { width: 100% !important; }
      .cta-td { width: 100% !important; text-align: center !important; border-radius: 10px !important; }
      .cta-link { display: block !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#eef3ff;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef3ff;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(29,78,216,0.10);">

        <tr>
          <td class="px-wide" bgcolor="#e8efff" style="background:linear-gradient(160deg,#e8efff 0%,#f0f6ff 100%);border-bottom:1px solid #dce8ff;padding:32px 24px 24px;text-align:center;">
            <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
              <tr>
                <td style="vertical-align:middle;padding-right:10px;">
                  <img src="${EMAIL_LOGO_URL}"
                       alt="WiseHire"
                       width="38" height="38"
                       style="display:block;border:0;" />
                </td>
                <td style="vertical-align:middle;">
                  <span style="font-size:21px;font-weight:900;color:${WISEHIRE_BLUE};letter-spacing:-0.5px;">WiseHire</span>
                </td>
              </tr>
            </table>
            <div style="margin-top:8px;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:1.2px;">by thewise.cloud</div>
          </td>
        </tr>

        <tr>
          <td class="px-wide" style="padding:28px 24px 0;text-align:center;">
            <span style="display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:100px;padding:7px 16px;font-size:12px;font-weight:600;color:#15803d;">
              <svg width="13" height="13" viewBox="0 0 13 13" xmlns="http://www.w3.org/2000/svg" style="vertical-align:-2px;display:inline-block;"><path fill="none" stroke="#15803d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M1.5 6.5l3 3 6.5-6"/></svg>
              Position #${position} on the waitlist
            </span>
          </td>
        </tr>

        <tr>
          <td class="px-wide" style="padding:24px 24px 40px;">
            <h1 style="margin:0 0 18px;font-size:24px;font-weight:800;color:#0f172a;line-height:1.25;letter-spacing:-0.5px;">
              You're #${position} on the list, <span style="color:${WISEHIRE_BLUE};">${escapeHtml(name)}</span>
            </h1>

            <p style="margin:0 0 16px;font-size:15px;color:#4b5563;line-height:1.7;">
              You've secured spot #${position} on the WiseHire waitlist. We're building something that genuinely
              changes how companies hire — and you're among the first to know about it.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
              <tr>
                <td bgcolor="#f0f6ff" style="background:#f0f6ff;border:1px solid #dbeafe;border-radius:12px;padding:18px 20px;">
                  <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;">
                    WiseHire is an <strong style="color:${WISEHIRE_BLUE};">AI-powered hiring platform</strong> for HR teams
                    and recruiters. It handles the heavy lifting — screening candidates, writing job descriptions,
                    tracking pipelines, and scoring interviews — so your team can focus on the decisions that actually matter.
                  </p>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 28px;font-size:15px;color:#4b5563;line-height:1.7;">
              We're rolling out access in small batches so every team gets a smooth onboarding experience.
              <strong style="color:#0f172a;">You don't have access yet</strong> — but when your spot is ready,
              we'll email you directly at this address. Keep an eye on this inbox.
            </p>

            <!--[if mso]>
            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
              href="https://resume.thewise.cloud/?for=companies"
              style="height:48px;v-text-anchor:middle;width:230px;"
              arcsize="13%"
              stroke="f"
              fillcolor="${WISEHIRE_BLUE}">
              <w:anchorlock/>
              <center style="color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;font-weight:700;">
                See WiseHire in action &#x2192;
              </center>
            </v:roundrect>
            <![endif]-->
            <!--[if !mso]><!-->
            <table class="cta-table" cellpadding="0" cellspacing="0">
              <tr>
                <td class="cta-td" style="background:${WISEHIRE_BLUE};border-radius:10px;box-shadow:0 4px 14px rgba(29,78,216,0.28);">
                  <a class="cta-link" href="https://resume.thewise.cloud/?for=companies"
                     style="display:inline-block;padding:14px 30px;color:#fff;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:-0.2px;">
                    See WiseHire in action &#x2192;
                  </a>
                </td>
              </tr>
            </table>
            <!--<![endif]-->
            <div style="margin-top:10px;font-size:12px;color:#94a3b8;">No account needed — takes 2 minutes</div>
          </td>
        </tr>

        <tr>
          <td class="px-wide" bgcolor="#f8fafc" style="padding:18px 24px 22px;border-top:1px solid #e9eef6;background:#f8fafc;">
            <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
              You're receiving this because you joined the WiseHire waitlist at
              <a href="https://resume.thewise.cloud/?for=companies" style="color:${WISEHIRE_BLUE};text-decoration:none;font-weight:500;">resume.thewise.cloud</a>.
              No spam — ever.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildNotificationEmail(
  name: string,
  email: string,
  company: string,
  size: string,
  submittedAt: string,
): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @media only screen and (max-width: 560px) {
      .notif-header { padding: 16px 20px !important; }
      .notif-body   { padding: 20px 20px !important; }
      .notif-footer { padding: 14px 20px 20px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
        <tr>
          <td class="notif-header" style="background:${WISEHIRE_BLUE};padding:20px 32px;">
            <div style="font-size:16px;font-weight:700;color:#fff;">New WiseHire Waitlist Signup</div>
          </td>
        </tr>
        <tr>
          <td class="notif-body" style="padding:28px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
                <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Name</span><br>
                <span style="font-size:15px;color:#0f172a;font-weight:600;">${escapeHtml(name)}</span>
              </td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
                <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Email</span><br>
                <a href="mailto:${escapeHtml(email)}" style="font-size:15px;color:${WISEHIRE_BLUE};font-weight:600;text-decoration:none;">${escapeHtml(email)}</a>
              </td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
                <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Company</span><br>
                <span style="font-size:15px;color:#0f172a;font-weight:600;">${escapeHtml(company)}</span>
              </td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
                <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Company Size</span><br>
                <span style="font-size:15px;color:#0f172a;">${escapeHtml(size)}</span>
              </td></tr>
              <tr><td style="padding:8px 0;">
                <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Submitted</span><br>
                <span style="font-size:14px;color:#64748b;">${submittedAt}</span>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td class="notif-footer" style="padding:16px 32px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;">
            <a href="https://resume.thewise.cloud/dashboard" style="font-size:13px;color:${WISEHIRE_BLUE};text-decoration:none;">
              View in Dev Kit →
            </a>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function handleWaitlistJoin(
  req: Request,
  body: {
    name?: string;
    email?: string;
    company_name?: string;
    company_size?: string;
  } | null,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  // Original returned 405 on non-POST.
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ua = req.headers.get("user-agent");
  if (isMaliciousBot(ua)) {
    return botBlockedResponse(corsHeaders);
  }

  // Original wrapped req.json() in try/catch and returned 500 internal server error.
  if (body === null) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const { name, email, company_name, company_size } = body;

    if (!name?.trim() || !email?.trim() || !company_name?.trim() || !company_size?.trim()) {
      return new Response(
        JSON.stringify({ error: "All fields are required: name, email, company_name, company_size" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return new Response(
        JSON.stringify({ error: "Please enter a valid email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const emailDomain = email.trim().toLowerCase().split("@")[1] ?? "";
    if (CONSUMER_DOMAINS.has(emailDomain)) {
      return new Response(
        JSON.stringify({ error: "Please use a work email address." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const normalizedEmail = email.trim().toLowerCase();
    const { data: emailExists, error: rpcError } = await supabase.rpc(
      "check_email_exists",
      { p_email: normalizedEmail },
    );
    if (rpcError) {
      console.error("[wisehire-access:waitlist-join] check_email_exists RPC error:", rpcError.message);
      return new Response(
        JSON.stringify({ error: "Service temporarily unavailable. Please try again in a moment." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (emailExists === true) {
      return new Response(
        JSON.stringify({
          success: true,
          existing_wiseresume_user: true,
          message: "This email is already registered on WiseResume. Sign in instead.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: existing } = await supabase
      .from("wisehire_waitlist")
      .select("id")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({
          success: true,
          already_registered: true,
          message: "You're already on the list! We'll be in touch when your invite is ready.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const submittedAt = new Date().toISOString();

    const { error: insertError } = await supabase
      .from("wisehire_waitlist")
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        company_name: company_name.trim(),
        company_size: company_size.trim(),
        submitted_at: submittedAt,
      });

    if (insertError) {
      console.error("DB insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save your registration. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let waitlistPosition = 1;
    try {
      const { count } = await supabase
        .from("wisehire_waitlist")
        .select("*", { count: "exact", head: true })
        .lte("submitted_at", submittedAt);
      if (count && count > 0) waitlistPosition = count;
    } catch (e) {
      console.warn("Could not query waitlist position:", e);
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (RESEND_API_KEY) {
      const sendEmail = async (to: string, subject: string, html: string) => {
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "WiseHire <notifications@thewise.cloud>",
              to: [to],
              subject,
              html,
            }),
          });
          if (!res.ok) {
            const errData = await res.json();
            console.warn(`Email to ${to} failed:`, JSON.stringify(errData));
          }
        } catch (e) {
          console.warn(`Email send exception to ${to}:`, e);
        }
      };

      await Promise.all([
        sendEmail(
          email.trim(),
          "You're on the WiseHire waitlist 🎉",
          buildConfirmationEmail(name.trim(), waitlistPosition),
        ),
        sendEmail(
          ADMIN_EMAIL,
          `[WiseHire Waitlist] ${name.trim()} — ${company_name.trim()}`,
          buildNotificationEmail(
            name.trim(),
            email.trim(),
            company_name.trim(),
            company_size.trim(),
            new Date(submittedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }),
          ),
        ),
      ]);
    } else {
      console.warn("RESEND_API_KEY not configured — row inserted but no emails sent.");
    }

    const wisehireAudienceId = getAudienceId(AUDIENCE_KEYS.WISEHIRE);
    if (wisehireAudienceId) {
      const [firstName, ...rest] = name.trim().split(' ');
      addContact(wisehireAudienceId, {
        email: email.trim().toLowerCase(),
        firstName,
        lastName: rest.join(' ') || undefined,
      }).catch((e) => console.warn("[wisehire-access:waitlist-join] audience add failed (non-fatal):", e));
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "You're on the list! We'll be in touch when your invite is ready.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("wisehire-access:waitlist-join unhandled error:", msg);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
}

// ════════════════════════════════════════════════════════════════════
// validate-early-access  (was wisehire-validate-early-access)
// ════════════════════════════════════════════════════════════════════
async function handleValidateEarlyAccess(
  req: Request,
  body: { code?: string } | null,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  // Original returned 405 on non-POST with the {valid:false, error} envelope.
  if (req.method !== "POST") {
    return json({ valid: false, error: "Method not allowed" }, 405, corsHeaders);
  }

  const ua = req.headers.get("user-agent");
  if (isMaliciousBot(ua)) return botBlockedResponse(corsHeaders);

  // Original wrapped req.json() in try/catch and returned the 500
  // {valid:false, error:"Internal server error"} envelope on parse failure.
  if (body === null) {
    return json({ valid: false, error: "Internal server error" }, 500, corsHeaders);
  }

  try {
    const { code } = body;

    if (!code?.trim()) {
      return json({ valid: false, error: "Early access code is required" }, 400, corsHeaders);
    }

    const upperCode = code.trim().toUpperCase();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: coupon, error: dbErr } = await supabase
      .from("discount_codes")
      .select("id, code, is_active, expires_at, max_uses, uses_count, plan_override, plan_days")
      .eq("code", upperCode)
      .maybeSingle();

    if (dbErr) {
      console.error("[wisehire-access:validate-early-access] DB error:", dbErr.message);
      return json({ valid: false, error: "Failed to validate code. Please try again." }, 500, corsHeaders);
    }

    if (!coupon || !coupon.is_active) {
      return json({ valid: false, error: "Invalid or inactive early access code." }, 200, corsHeaders);
    }

    if (coupon.expires_at && new Date(coupon.expires_at as string) < new Date()) {
      return json({ valid: false, error: "This early access code has expired." }, 200, corsHeaders);
    }

    if ((coupon.max_uses as number) > 0 && (coupon.uses_count as number) >= (coupon.max_uses as number)) {
      return json({ valid: false, error: "This early access code has reached its maximum uses." }, 200, corsHeaders);
    }

    const planOverride = coupon.plan_override as string | null;
    if (!planOverride || !planOverride.startsWith("wisehire_")) {
      return json({ valid: false, error: "This code is not a valid WiseHire early access code." }, 200, corsHeaders);
    }

    return json(
      {
        valid: true,
        plan_override: planOverride,
        plan_days: coupon.plan_days ?? null,
      },
      200,
      corsHeaders,
    );
  } catch (err) {
    console.error("[wisehire-access:validate-early-access] unhandled error:", err);
    return json({ valid: false, error: "Internal server error" }, 500, corsHeaders);
  }
}

// ════════════════════════════════════════════════════════════════════
// validate-invite  (was wisehire-validate-invite)
// ════════════════════════════════════════════════════════════════════
async function hmacVerify(message: string, signature: string, secret: string): Promise<boolean> {
  const keyData = new TextEncoder().encode(secret);
  const msgData = new TextEncoder().encode(message);
  const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, msgData);
  const expected = [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
  return expected === signature;
}

async function handleValidateInvite(
  _req: Request,
  body: { token?: string } | null,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  // Original had no method check (any non-OPTIONS method fell into the
  // try block; req.json() failure landed in catch → 500 server_error).
  if (body === null) {
    return json({ valid: false, reason: 'server_error' }, 500, corsHeaders);
  }

  try {
    const { token } = body;

    if (!token?.trim()) {
      return json({ valid: false, reason: 'missing_token' }, 400, corsHeaders);
    }

    const WISEHIRE_INVITE_SECRET =
      Deno.env.get('WISEHIRE_INVITE_SECRET') ?? Deno.env.get('DEV_KIT_PASSWORD') ?? '';

    if (!WISEHIRE_INVITE_SECRET) {
      console.error('[wisehire-access:validate-invite] WISEHIRE_INVITE_SECRET not configured');
      return json({ valid: false, reason: 'server_error' }, 500, corsHeaders);
    }

    const supabase = getServiceClient();

    const { data: invite, error: fetchErr } = await supabase
      .from('wisehire_invites')
      .select('token, token_signature, recipient_email, expires_at, used_at, is_revoked')
      .eq('token', token.trim())
      .maybeSingle();

    if (fetchErr) {
      console.error('[wisehire-access:validate-invite] DB fetch error:', fetchErr.message);
      return json({ valid: false, reason: 'server_error' }, 500, corsHeaders);
    }

    if (!invite) {
      return json({ valid: false, reason: 'not_found' }, 200, corsHeaders);
    }

    if (invite.is_revoked) {
      return json({ valid: false, reason: 'revoked' }, 200, corsHeaders);
    }

    if (invite.used_at) {
      return json({ valid: false, reason: 'already_used' }, 200, corsHeaders);
    }

    if (new Date(invite.expires_at) < new Date()) {
      return json({ valid: false, reason: 'expired' }, 200, corsHeaders);
    }

    const signatureOk = await hmacVerify(invite.token, invite.token_signature, WISEHIRE_INVITE_SECRET);
    if (!signatureOk) {
      console.warn('[wisehire-access:validate-invite] HMAC signature mismatch for token', token);
      return json({ valid: false, reason: 'invalid_signature' }, 200, corsHeaders);
    }

    return json(
      { valid: true, recipient_email: invite.recipient_email, expires_at: invite.expires_at },
      200,
      corsHeaders,
    );
  } catch (err) {
    console.error('[wisehire-access:validate-invite]', err);
    return json({ valid: false, reason: 'server_error' }, 500, corsHeaders);
  }
}

// ════════════════════════════════════════════════════════════════════
// complete-signup  (was wisehire-complete-signup)
// AUTHENTICATED: requires Supabase session Bearer token.
// ════════════════════════════════════════════════════════════════════
async function handleCompleteSignup(
  req: Request,
  body: {
    invite_token?: string;
    early_access_code?: string;
    full_name?: string;
    company_name?: string;
    company_size?: string;
  } | null,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  // Original had no method check; req.json() failure landed in the
  // outer catch → 500 {success:false, error:'server_error'}.
  if (body === null) {
    return json({ success: false, error: 'server_error' }, 500, corsHeaders);
  }

  try {
    const authHeader = req.headers.get('authorization') ?? '';
    const bridgeToken = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!bridgeToken) {
      return json({ success: false, error: 'unauthorized' }, 401, corsHeaders);
    }

    const serviceClient = getServiceClient();

    const { data: { user }, error: userErr } = await serviceClient.auth.getUser(bridgeToken);
    if (userErr || !user?.id) {
      console.error('[wisehire-access:complete-signup] getUser failed:', userErr?.message);
      return json({ success: false, error: 'unauthorized' }, 401, corsHeaders);
    }

    const userId = user.id;

    const { invite_token, early_access_code, full_name, company_name, company_size } = body;

    const hasInvite = !!invite_token?.trim();
    const hasEarlyAccess = !!early_access_code?.trim();

    if (!hasInvite && !hasEarlyAccess) {
      return json({ success: false, error: 'invite_token or early_access_code is required' }, 400, corsHeaders);
    }

    const { data: existingProfile } = await serviceClient
      .from('profiles')
      .select('account_type')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingProfile?.account_type === 'hr') {
      return json({ success: true, already_completed: true }, 200, corsHeaders);
    }

    if (hasInvite) {
      const WISEHIRE_INVITE_SECRET =
        Deno.env.get('WISEHIRE_INVITE_SECRET') ?? Deno.env.get('DEV_KIT_PASSWORD') ?? '';

      const { data: invite, error: fetchErr } = await serviceClient
        .from('wisehire_invites')
        .select('token, token_signature, recipient_email, expires_at, used_at, is_revoked')
        .eq('token', invite_token!.trim())
        .maybeSingle();

      if (fetchErr) {
        console.error('[wisehire-access:complete-signup] DB fetch error:', fetchErr.message);
        return json({ success: false, error: 'server_error' }, 500, corsHeaders);
      }

      if (!invite) return json({ success: false, error: 'invite_not_found' }, 404, corsHeaders);
      if (invite.is_revoked) return json({ success: false, error: 'invite_revoked' }, 400, corsHeaders);
      if (invite.used_at) return json({ success: false, error: 'invite_already_used' }, 400, corsHeaders);
      if (new Date(invite.expires_at) < new Date()) {
        return json({ success: false, error: 'invite_expired' }, 400, corsHeaders);
      }

      const signatureOk = await hmacVerify(invite.token, invite.token_signature, WISEHIRE_INVITE_SECRET);
      if (!signatureOk) {
        return json({ success: false, error: 'invalid_signature' }, 400, corsHeaders);
      }

      const profileUpdates: Record<string, unknown> = { account_type: 'hr' };
      if (full_name?.trim()) profileUpdates.full_name = full_name.trim();

      const { error: profileErr } = await serviceClient
        .from('profiles')
        .update(profileUpdates)
        .eq('user_id', userId);

      if (profileErr) {
        console.error('[wisehire-access:complete-signup] profile update failed:', profileErr.message);
        return json({ success: false, error: 'profile_update_failed' }, 500, corsHeaders);
      }

      const { error: inviteErr } = await serviceClient
        .from('wisehire_invites')
        .update({ used_at: new Date().toISOString() })
        .eq('token', invite_token!.trim());

      if (inviteErr) {
        console.error('[wisehire-access:complete-signup] invite update failed:', inviteErr.message);
      }

      const inviteCompanyName = company_name?.trim() || 'My Company';
      const { error: companyErr } = await serviceClient
        .from('wisehire_companies')
        .upsert(
          { owner_id: userId, name: inviteCompanyName, size: company_size?.trim() ?? '1-10', onboarding_completed: false },
          { onConflict: 'owner_id', ignoreDuplicates: true },
        );
      if (companyErr) {
        console.warn('[wisehire-access:complete-signup] company upsert error (non-fatal):', companyErr.message);
      }

      const inviteNow = new Date().toISOString();
      const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { error: subErr } = await serviceClient
        .from('subscriptions')
        .upsert(
          {
            user_id: userId,
            plan_name: 'wisehire_starter',
            trial_plan: 'wisehire_professional',
            trial_expires_at: trialEnd,
            status: 'active',
            current_period_start: inviteNow,
            current_period_end: trialEnd,
          },
          { onConflict: 'user_id', ignoreDuplicates: true },
        );
      if (subErr) {
        console.warn('[wisehire-access:complete-signup] trial grant error (non-fatal):', subErr.message);
      }

      try {
        await serviceClient.from('audit_logs').insert({
          user_id: userId,
          category: 'auth',
          action: 'wisehire_signup_complete',
          metadata: {
            invite_token: invite_token!.trim(),
            recipient_email: invite.recipient_email,
            company_name: company_name ?? null,
            completed_at: new Date().toISOString(),
          },
        });
      } catch { /* non-fatal */ }

      return json({ success: true }, 200, corsHeaders);
    }

    // Early access code path
    const { data: rpcRows, error: rpcErr } = await serviceClient
      .rpc('wisehire_activate_early_access', {
        p_user_id:      userId,
        p_code:         early_access_code!.trim(),
        p_full_name:    full_name?.trim() ?? null,
        p_company_name: company_name?.trim() ?? null,
        p_company_size: company_size?.trim() ?? null,
        p_now:          new Date().toISOString(),
      })
      .returns<{ success: boolean; error_code: string | null; plan_override: string | null }[]>();

    if (rpcErr) {
      console.error('[wisehire-access:complete-signup] EA activate RPC error:', rpcErr.message);
      return json({ success: false, error: 'server_error' }, 500, corsHeaders);
    }

    const rpcResult = rpcRows?.[0];
    if (!rpcResult?.success) {
      const errCode = rpcResult?.error_code ?? 'invalid_early_access_code';
      const status = errCode === 'early_access_code_exhausted' ? 409 : 400;
      return json({ success: false, error: errCode }, status, corsHeaders);
    }

    const planOverride = rpcResult.plan_override ?? '';
    if (!planOverride.startsWith('wisehire_')) {
      console.error('[wisehire-access:complete-signup] EA plan_override not a wisehire plan:', planOverride);
      return json({ success: false, error: 'invalid_early_access_code' }, 400, corsHeaders);
    }

    return json({ success: true }, 200, corsHeaders);
  } catch (err) {
    console.error('[wisehire-access:complete-signup]', err);
    return json({ success: false, error: 'server_error' }, 500, corsHeaders);
  }
}

// ════════════════════════════════════════════════════════════════════
// Router entry point
// ════════════════════════════════════════════════════════════════════
Deno.serve(wrapHandler('wisehire-access', async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // OPTIONS handled centrally — every original did the same.
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  // Parse body once for dispatch. We pass the parsed object (or null on
  // failure) into each sub-handler so it can return its own original
  // parse-failure envelope — preserving byte-for-byte parity. Method
  // enforcement (405) is also delegated per-handler because the originals
  // were not uniform: 3 returned 405 on non-POST, 2 had no method check.
  let body: Record<string, unknown> | null = null;
  try {
    const raw = await req.text();
    if (raw) {
      body = JSON.parse(raw) as Record<string, unknown>;
    } else if (req.method === 'POST') {
      // Empty body on POST: treat as parsed-empty so handlers see {} and
      // run their own field-validation, matching pre-merge behaviour.
      body = {};
    }
  } catch (err) {
    console.error('[wisehire-access] body parse error:', err);
    body = null;
  }

  const action = typeof body?.action === 'string' ? body.action : '';

  switch (action) {
    case 'waitlist-check-email':
      return await handleWaitlistCheckEmail(req, body as { email?: string } | null, corsHeaders);
    case 'waitlist-join':
      return await handleWaitlistJoin(req, body as Parameters<typeof handleWaitlistJoin>[1], corsHeaders);
    case 'validate-early-access':
      return await handleValidateEarlyAccess(req, body as { code?: string } | null, corsHeaders);
    case 'validate-invite':
      return await handleValidateInvite(req, body as { token?: string } | null, corsHeaders);
    case 'complete-signup':
      return await handleCompleteSignup(req, body as Parameters<typeof handleCompleteSignup>[1], corsHeaders);
    default:
      // No action could be determined — either body was malformed (body
      // is null) or no `action` field was supplied. Either way the caller
      // is not a real wisehire client. Return a generic 400 — this is a
      // router-boundary case that no pre-merge function ever served.
      if (body === null) {
        return json({ error: 'Invalid JSON body' }, 400, corsHeaders);
      }
      return json({ error: `Unknown action: ${action || '(empty)'}` }, 400, corsHeaders);
  }
}));
