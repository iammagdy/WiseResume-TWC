import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { getCorsHeaders } from "../_shared/cors.ts";
import { isMaliciousBot, botBlockedResponse } from "../_shared/botGuard.ts";
import { escapeHtml } from "../_shared/htmlEscape.ts";
import { addContact } from "../_shared/resendAudiences.ts";
import { getAudienceId, AUDIENCE_KEYS } from "../_shared/resendConfig.ts";

const ADMIN_EMAIL = "contact@thewise.cloud";
const WISEHIRE_BLUE = "#1D4ED8";

// Stable Supabase CDN URL — not tied to web-app deployment.
// SETUP: create a public `emails` bucket in the Supabase dashboard and upload
// public/email-logo.png there once. The URL below never changes.
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

        <!-- Header — bgcolor="#e8efff" is the Outlook solid fallback for the gradient -->
        <tr>
          <td class="px-wide" bgcolor="#e8efff" style="background:linear-gradient(160deg,#e8efff 0%,#f0f6ff 100%);border-bottom:1px solid #dce8ff;padding:32px 24px 24px;text-align:center;">
            <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
              <tr>
                <td style="vertical-align:middle;padding-right:10px;">
                  <!-- border-radius removed: Outlook ignores it on img; modern clients render it via CSS if added to a wrapper -->
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

        <!-- Position pill -->
        <tr>
          <td class="px-wide" style="padding:28px 24px 0;text-align:center;">
            <span style="display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:100px;padding:7px 16px;font-size:12px;font-weight:600;color:#15803d;">
              <svg width="13" height="13" viewBox="0 0 13 13" xmlns="http://www.w3.org/2000/svg" style="vertical-align:-2px;display:inline-block;"><path fill="none" stroke="#15803d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M1.5 6.5l3 3 6.5-6"/></svg>
              Position #${position} on the waitlist
            </span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td class="px-wide" style="padding:24px 24px 40px;">
            <h1 style="margin:0 0 18px;font-size:24px;font-weight:800;color:#0f172a;line-height:1.25;letter-spacing:-0.5px;">
              You're #${position} on the list, <span style="color:${WISEHIRE_BLUE};">${escapeHtml(name)}</span>
            </h1>

            <p style="margin:0 0 16px;font-size:15px;color:#4b5563;line-height:1.7;">
              You've secured spot #${position} on the WiseHire waitlist. We're building something that genuinely
              changes how companies hire — and you're among the first to know about it.
            </p>

            <!-- Platform description box -->
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

            <!-- CTA button — VML for Outlook, table-based for everyone else -->
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

        <!-- Footer -->
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
  submittedAt: string
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

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

  try {
    const body = await req.json() as {
      name?: string;
      email?: string;
      company_name?: string;
      company_size?: string;
    };

    const { name, email, company_name, company_size } = body;

    if (!name?.trim() || !email?.trim() || !company_name?.trim() || !company_size?.trim()) {
      return new Response(
        JSON.stringify({ error: "All fields are required: name, email, company_name, company_size" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return new Response(
        JSON.stringify({ error: "Please enter a valid email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailDomain = email.trim().toLowerCase().split("@")[1] ?? "";
    if (CONSUMER_DOMAINS.has(emailDomain)) {
      return new Response(
        JSON.stringify({ error: "Please use a work email address." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if this email already has a WiseResume account via a direct SQL lookup
    // on auth.users. Using supabase.rpc() is bulletproof: exact-match, no pagination
    // edge cases, and no reliance on undocumented GoTrue query params.
    const normalizedEmail = email.trim().toLowerCase();
    const { data: emailExists, error: rpcError } = await supabase.rpc(
      "check_email_exists",
      { p_email: normalizedEmail }
    );
    if (rpcError) {
      // DB unavailable — fail closed to avoid inserting a user who may already
      // have a WiseResume account. The client can retry.
      console.error("[wisehire-waitlist-join] check_email_exists RPC error:", rpcError.message);
      return new Response(
        JSON.stringify({ error: "Service temporarily unavailable. Please try again in a moment." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (emailExists === true) {
      return new Response(
        JSON.stringify({
          success: true,
          existing_wiseresume_user: true,
          message: "This email is already registered on WiseResume. Sign in instead.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine waitlist position: count rows submitted at or before this one
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
          buildConfirmationEmail(name.trim(), waitlistPosition)
        ),
        sendEmail(
          ADMIN_EMAIL,
          `[WiseHire Waitlist] ${name.trim()} — ${company_name.trim()}`,
          buildNotificationEmail(
            name.trim(),
            email.trim(),
            company_name.trim(),
            company_size.trim(),
            new Date(submittedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })
          )
        ),
      ]);
    } else {
      console.warn("RESEND_API_KEY not configured — row inserted but no emails sent.");
    }

    // Add to WiseHire Waitlist Resend Audience — triggers drip automation.
    const wisehireAudienceId = getAudienceId(AUDIENCE_KEYS.WISEHIRE);
    if (wisehireAudienceId) {
      const [firstName, ...rest] = name.trim().split(' ');
      addContact(wisehireAudienceId, {
        email: email.trim().toLowerCase(),
        firstName,
        lastName: rest.join(' ') || undefined,
      }).catch((e) => console.warn("[wisehire-waitlist-join] audience add failed (non-fatal):", e));
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "You're on the list! We'll be in touch when your invite is ready.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("wisehire-waitlist-join unhandled error:", msg);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
