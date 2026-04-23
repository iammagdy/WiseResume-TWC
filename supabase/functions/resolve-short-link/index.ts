import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { checkIpRateLimit } from "../_shared/rateLimiter.ts";
import { getServiceClient } from "../_shared/dbClient.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

// Slug format: 5-char alphanumeric (see migration 20260219095357). Anything
// shorter is either a typo or an enumeration probe — reject before hitting the DB.
const SLUG_MIN_LENGTH = 5;
const SLUG_MAX_LENGTH = 20;
const SLUG_RE = /^[A-Za-z0-9_-]+$/;

// 404 lockout: after this many recent 404s from the same IP, lock the IP out
// for an exponentially-growing duration (capped). Discourages slug enumeration.
const NOT_FOUND_THRESHOLD = 10;
const NOT_FOUND_WINDOW_SECONDS = 600; // 10 minutes
const NOT_FOUND_LOCKOUT_BASE_SECONDS = 60;
const NOT_FOUND_LOCKOUT_MAX_SECONDS = 3600;

async function count404s(ip: string): Promise<number> {
  try {
    const supabase = getServiceClient();
    const since = new Date(Date.now() - NOT_FOUND_WINDOW_SECONDS * 1000).toISOString();
    const { count } = await supabase
      .from('rpc_rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', ip)
      .eq('endpoint', 'resolve-short-link:404')
      .gte('created_at', since);
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function record404(ip: string): Promise<void> {
  try {
    const supabase = getServiceClient();
    await supabase
      .from('rpc_rate_limits')
      .insert({ ip_address: ip, endpoint: 'resolve-short-link:404' });
  } catch (err) {
    console.warn('record404 failed (non-fatal):', err);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  const clientIp =
    (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    null;

  if (clientIp) {
    const ipLimit = await checkIpRateLimit(clientIp, "resolve-short-link", 60, 60);
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

    // Exponential-backoff lockout for IPs that keep hitting 404s
    // (slug enumeration probes).
    const recent404s = await count404s(clientIp);
    if (recent404s >= NOT_FOUND_THRESHOLD) {
      const overflow = recent404s - NOT_FOUND_THRESHOLD + 1;
      const backoff = Math.min(
        NOT_FOUND_LOCKOUT_BASE_SECONDS * Math.pow(2, overflow - 1),
        NOT_FOUND_LOCKOUT_MAX_SECONDS,
      );
      return new Response(JSON.stringify({ error: "Too Many Requests" }), {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Retry-After": String(backoff),
        },
      });
    }
  }

  try {
    const url = new URL(req.url);
    const linkId = url.searchParams.get("id");

    if (
      !linkId ||
      typeof linkId !== "string" ||
      linkId.length < SLUG_MIN_LENGTH ||
      linkId.length > SLUG_MAX_LENGTH ||
      !SLUG_RE.test(linkId)
    ) {
      return new Response(JSON.stringify({ error: "Missing or invalid id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to bypass RLS — this is a public lookup by id only
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data, error } = await supabaseClient.rpc("resolve_short_link", {
      p_link_id: linkId,
    });

    if (error) {
      console.error("Error resolving short link:", error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!data) {
      if (clientIp) {
        await record404(clientIp);
      }
      return new Response(JSON.stringify({ error: "Link not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Security: strip any target_url that is not a relative path to prevent
    // open-redirect payloads from ever reaching the client.
    if (data.target_url && !String(data.target_url).startsWith('/')) {
      data.target_url = null;
    }

    // The RPC also returns `portfolio_id` (Phase 3 cutover). It is safe to
    // expose to the client — it is the stable analytics FK and is not
    // sensitive on its own.

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
