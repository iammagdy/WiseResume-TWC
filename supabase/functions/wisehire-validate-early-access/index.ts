import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { getCorsHeaders } from "../_shared/cors.ts";
import { isMaliciousBot, botBlockedResponse } from "../_shared/botGuard.ts";

import { wrapHandler } from '../_shared/fnLogger.ts';
function json(data: unknown, status = 200, corsHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(wrapHandler("wisehire-validate-early-access", async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ valid: false, error: "Method not allowed" }, 405, corsHeaders);

  const ua = req.headers.get("user-agent");
  if (isMaliciousBot(ua)) return botBlockedResponse(corsHeaders);

  try {
    const body = await req.json();
    const { code } = body as { code?: string };

    if (!code?.trim()) {
      return json({ valid: false, error: "Early access code is required" }, 400, corsHeaders);
    }

    const upperCode = code.trim().toUpperCase();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: coupon, error: dbErr } = await supabase
      .from("discount_codes")
      .select("id, code, is_active, expires_at, max_uses, uses_count, plan_override, plan_days")
      .eq("code", upperCode)
      .maybeSingle();

    if (dbErr) {
      console.error("[wisehire-validate-early-access] DB error:", dbErr.message);
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

    // Must be a WiseHire-tier coupon
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
    console.error("[wisehire-validate-early-access] unhandled error:", err);
    return json({ valid: false, error: "Internal server error" }, 500, corsHeaders);
  }
}));
