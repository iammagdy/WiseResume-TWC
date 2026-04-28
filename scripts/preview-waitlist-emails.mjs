#!/usr/bin/env node
/**
 * preview-waitlist-emails.mjs
 * ───────────────────────────
 * Generates HTML previews of the two WiseHire waitlist emails and
 * (optionally) sends them to a sandbox inbox via Resend, with NO
 * database writes.
 *
 * USAGE
 * ─────
 * 1. Local HTML preview only (no API key required):
 *
 *      node scripts/preview-waitlist-emails.mjs
 *
 *    Opens email-previews/confirmation.html and
 *             email-previews/notification.html
 *    in your default browser.
 *
 * 2. Send to a sandbox / personal test inbox:
 *
 *      RESEND_API_KEY=re_xxxx \
 *      PREVIEW_TO=you@example.com \
 *      node scripts/preview-waitlist-emails.mjs
 *
 *    RESEND_API_KEY – Resend API key (test keys start with re_test_…)
 *    PREVIEW_TO     – YOUR own email address or a test inbox address.
 *                     Both the confirmation and the notification preview
 *                     are sent here; NO production addresses are ever
 *                     used as a send target in this script.
 *
 *    IMPORTANT: With a live Resend key + a verified domain the emails
 *    will land in a real inbox at PREVIEW_TO. Use a personal or
 *    throwaway address. For pure dashboard-only testing obtain a
 *    Resend "test" key (re_test_…) — those emails only appear in the
 *    Resend Logs view and are never delivered.
 *
 * OUTPUT
 * ──────
 * email-previews/confirmation.html  – user-facing waitlist confirmation
 * email-previews/notification.html  – admin new-signup notification
 *
 * HOW IT WORKS
 * ────────────
 * The builder functions are copied verbatim from
 * supabase/functions/wisehire-waitlist-join/index.ts (JS translation).
 * Sample fixture data is used — no Supabase connection, no DB insert.
 */

import fs   from "node:fs";
import path from "node:path";
import { exec } from "node:child_process";

// ── Config ──────────────────────────────────────────────────────────────────
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
// Both preview emails go here — never to a hardcoded production address.
const PREVIEW_TO     = process.env.PREVIEW_TO ?? "";
const FROM_ADDRESS   = "WiseHire <contact@thewise.cloud>";
const WISEHIRE_BLUE  = "#1D4ED8";
const OUT_DIR        = path.resolve("email-previews");

// ── Fixture data (mirrors what a real signup would supply) ───────────────────
const FIXTURE = {
  name:         "Taylor Morgan",
  email:        PREVIEW_TO || "preview@example.com",
  company_name: "Acme Corp",
  company_size: "51–200",
  position:     42,
  submittedAt:  new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }),
};

// ── HTML escape (mirrors supabase/functions/_shared/htmlEscape.ts) ────────────
function escapeHtml(str) {
  return str
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&#39;");
}

// ── Email builders (JS translation of the Deno originals) ────────────────────
function buildConfirmationEmail(name, position) {
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

        <!-- Header -->
        <tr>
          <td class="px-wide" bgcolor="#e8efff" style="background:linear-gradient(160deg,#e8efff 0%,#f0f6ff 100%);border-bottom:1px solid #dce8ff;padding:32px 24px 24px;text-align:center;">
            <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
              <tr>
                <td style="vertical-align:middle;padding-right:10px;">
                  <img src="https://resume.thewise.cloud/email-logo.png"
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
              &#10003; Position #${position} on the waitlist
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

            <!-- CTA button -->
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

function buildNotificationEmail(name, email, company, size, submittedAt) {
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
            <div style="font-size:16px;font-weight:700;color:#fff;">🎯 New WiseHire Waitlist Signup</div>
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

// ── Build emails ─────────────────────────────────────────────────────────────
const confirmationHtml  = buildConfirmationEmail(FIXTURE.name, FIXTURE.position);
const notificationHtml  = buildNotificationEmail(
  FIXTURE.name,
  FIXTURE.email,
  FIXTURE.company_name,
  FIXTURE.company_size,
  FIXTURE.submittedAt,
);

// ── Write HTML files ─────────────────────────────────────────────────────────
fs.mkdirSync(OUT_DIR, { recursive: true });

const confirmationPath = path.join(OUT_DIR, "confirmation.html");
const notificationPath = path.join(OUT_DIR, "notification.html");

fs.writeFileSync(confirmationPath, confirmationHtml, "utf8");
fs.writeFileSync(notificationPath, notificationHtml, "utf8");

console.log("✓ HTML previews written:");
console.log(`  ${confirmationPath}`);
console.log(`  ${notificationPath}`);

// ── Open in browser (best-effort) ────────────────────────────────────────────
const opener =
  process.platform === "darwin" ? "open" :
  process.platform === "win32"  ? "start" :
  "xdg-open";

exec(`${opener} "${confirmationPath}"`);
exec(`${opener} "${notificationPath}"`);

// ── Optionally send via Resend ───────────────────────────────────────────────
if (!RESEND_API_KEY) {
  console.log("\n⚠  No RESEND_API_KEY set — skipping live send.");
  console.log("   To send to a sandbox inbox, run:");
  console.log("   RESEND_API_KEY=re_xxxx PREVIEW_TO=you@example.com node scripts/preview-waitlist-emails.mjs");
  process.exit(0);
}

// Safety guard: PREVIEW_TO must be explicitly provided.
// The script never falls back to any production address.
if (!PREVIEW_TO) {
  console.error("\n✗  RESEND_API_KEY is set but PREVIEW_TO is missing.");
  console.error("   Set PREVIEW_TO to your own email address (or a throwaway inbox).");
  console.error("   Example:");
  console.error("   RESEND_API_KEY=re_xxxx PREVIEW_TO=you@example.com node scripts/preview-waitlist-emails.mjs");
  process.exit(1);
}

async function sendViaResend(to, subject, html) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to: [to], subject, html }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error(`  ✗ Failed to send to ${to}:`, JSON.stringify(data));
  } else {
    console.log(`  ✓ Sent to ${to}  (id: ${data.id})`);
  }
}

// Both preview emails go to PREVIEW_TO — no production address is used.
console.log(`\nSending via Resend (both emails → ${PREVIEW_TO}) …`);

await Promise.all([
  sendViaResend(
    PREVIEW_TO,
    "[PREVIEW] You're on the WiseHire waitlist 🎉",
    confirmationHtml,
  ),
  sendViaResend(
    PREVIEW_TO,
    `[PREVIEW] [WiseHire Waitlist] ${FIXTURE.name} — ${FIXTURE.company_name}`,
    notificationHtml,
  ),
]);

console.log("\nDone. Check the Resend dashboard or your inbox for the previews.");
