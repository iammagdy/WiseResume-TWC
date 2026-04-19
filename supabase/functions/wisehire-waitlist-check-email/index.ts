import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { isMaliciousBot, botBlockedResponse } from "../_shared/botGuard.ts";
import { checkIpRateLimit } from "../_shared/rateLimiter.ts";

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

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, corsHeaders);

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
    const body = await req.json() as { email?: string };
    const rawEmail = (body.email ?? "").trim();

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
      console.error("[wisehire-waitlist-check-email] check_email_exists RPC error:", rpcError.message);
      return json(
        { error: "Service temporarily unavailable. Please try again in a moment." },
        503,
        corsHeaders,
      );
    }

    const existing_wiseresume_user = emailExists === true;

    // For consumer-domain emails, we don't need to check the waitlist —
    // they can't join anyway. Return both signals so the frontend can
    // surface the appropriate combination of messages.
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
        console.error("[wisehire-waitlist-check-email] waitlist lookup error:", waitlistErr.message);
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
    console.error("[wisehire-waitlist-check-email] unhandled error:", msg);
    return json({ error: "Internal server error" }, 500, corsHeaders);
  }
});
