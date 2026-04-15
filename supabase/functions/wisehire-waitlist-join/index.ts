import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { isMaliciousBot, botBlockedResponse } from "../_shared/botGuard.ts";

const ADMIN_EMAIL = "contact@thewise.cloud";
const WISEHIRE_BLUE = "#1D4ED8";

function buildConfirmationEmail(name: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f5ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f5ff;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(29,78,216,0.08);">
        <tr>
          <td style="background:${WISEHIRE_BLUE};padding:32px 40px;text-align:center;">
            <div style="font-size:24px;font-weight:800;color:#fff;letter-spacing:-0.5px;">WiseHire</div>
            <div style="font-size:13px;color:rgba(255,255,255,0.75);margin-top:4px;">AI-Powered Hiring Platform</div>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 32px;">
            <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0f172a;">
              You're on the list, ${name}! 🎉
            </h1>
            <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">
              Thanks for joining the WiseHire early access waitlist. We're building an AI hiring platform
              that screens candidates, writes job descriptions, and surfaces your best hires — in minutes, not hours.
            </p>
            <p style="margin:0 0 32px;font-size:15px;color:#475569;line-height:1.6;">
              We'll reach out with your invite as soon as a spot opens up. In the meantime, keep an eye
              on your inbox — we'll be in touch!
            </p>
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:${WISEHIRE_BLUE};border-radius:10px;">
                  <a href="https://resume.thewise.cloud/?for=companies"
                     style="display:inline-block;padding:12px 28px;color:#fff;font-size:14px;font-weight:600;text-decoration:none;">
                    Learn More About WiseHire →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px;border-top:1px solid #e2e8f0;background:#f8fafc;">
            <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
              You're receiving this because you signed up for the WiseHire waitlist at
              <a href="https://resume.thewise.cloud/?for=companies" style="color:${WISEHIRE_BLUE};text-decoration:none;">resume.thewise.cloud</a>.
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
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
        <tr>
          <td style="background:${WISEHIRE_BLUE};padding:20px 32px;">
            <div style="font-size:16px;font-weight:700;color:#fff;">🎯 New WiseHire Waitlist Signup</div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
                <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Name</span><br>
                <span style="font-size:15px;color:#0f172a;font-weight:600;">${name}</span>
              </td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
                <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Email</span><br>
                <a href="mailto:${email}" style="font-size:15px;color:${WISEHIRE_BLUE};font-weight:600;text-decoration:none;">${email}</a>
              </td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
                <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Company</span><br>
                <span style="font-size:15px;color:#0f172a;font-weight:600;">${company}</span>
              </td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
                <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Company Size</span><br>
                <span style="font-size:15px;color:#0f172a;">${size}</span>
              </td></tr>
              <tr><td style="padding:8px 0;">
                <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Submitted</span><br>
                <span style="font-size:14px;color:#64748b;">${submittedAt}</span>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;">
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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
          buildConfirmationEmail(name.trim())
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
