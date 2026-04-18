import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";
import { checkIpRateLimit } from "../_shared/rateLimiter.ts";
import { isMaliciousBot, hasForeignReferer, botBlockedResponse } from "../_shared/botGuard.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/** Convert an IPv4 address to the in-addr.arpa format for PTR lookup */
function toArpa(ip: string): string | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  return `${parts[3]}.${parts[2]}.${parts[1]}.${parts[0]}.in-addr.arpa`;
}

/** Extract meaningful company/domain name from a PTR hostname.
 *  Returns null if the result looks like a residential or hosting provider. */
function parseCompanyFromPtr(ptr: string): string | null {
  // PTR records often look like "ec2-1-2-3-4.compute.amazonaws.com" or
  // "mail.company.com". We want to extract the second-level domain (company.com)
  // and skip known infrastructure providers.
  const SKIP_DOMAINS = /\b(amazonaws|azure|googleusercontent|cloudfront|akamai|fastly|cloudflare|linode|vultr|digitalocean|hetzner|ovh|comcast|verizon|att\.net|spectrum|xfinity|tmobile|t-mobile|comcast|sbcglobal|bellsouth|dsl|dialup|pool|dynamic|dhcp|broadband|cable|fiber|fios|residential|static\.isp|no-reverse|ptr\.not|rdns\.not)\b/i;
  if (!ptr || SKIP_DOMAINS.test(ptr)) return null;
  const labels = ptr.toLowerCase().replace(/\.$/, "").split(".");
  if (labels.length < 2) return null;
  // Grab sld.tld (e.g., "google.com" from "mail.google.com")
  const sld = labels[labels.length - 2];
  const tld = labels[labels.length - 1];
  // Skip IP-like PTR results (all digits or starts with a number)
  if (/^\d+$/.test(sld)) return null;
  // Capitalize for display ("google" → "Google")
  return sld.charAt(0).toUpperCase() + sld.slice(1) + "." + tld;
}

/** Generic ISP org names that don't represent a real company visiting. */
const GENERIC_ISP_RE = /\b(telecom|mobile|wireless|broadband|cable|internet|isp|fiber|fios|comcast|verizon|at&t|spectrum|xfinity|tmobile|t-mobile|residential|networks|hosting|cloud|amazonaws|azure|google cloud|digitalocean|linode|vultr|hetzner|ovh)\b/i;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  // Layer 1: block known scraper tools by User-Agent
  const ua = req.headers.get("user-agent");
  if (isMaliciousBot(ua)) {
    return botBlockedResponse(corsHeaders);
  }

  // Layer 2: block requests whose Referer is clearly from a foreign domain
  const referer = req.headers.get("referer");
  if (hasForeignReferer(referer, ["thewise.cloud", "localhost"])) {
    return botBlockedResponse(corsHeaders);
  }

  const clientIp =
    (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    null;

  if (clientIp) {
    const ipLimit = await checkIpRateLimit(clientIp, "track-portfolio-view", 30, 60);
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
    const body = await req.json();
    const { username, ref, sectionsViewed, sectionsTiming, timeSpentSeconds, device, abVariant } = body as {
      username: string;
      ref?: string;
      sectionsViewed?: string[];
      sectionsTiming?: Record<string, number>;
      timeSpentSeconds?: number;
      device?: 'mobile' | 'desktop' | 'tablet';
      abVariant?: 'a' | 'b';
    };

    if (!username || typeof username !== "string") {
      return new Response(JSON.stringify({ error: "Missing username" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // ── 1. Increment the simple profile view counter (existing behavior) ──
    const { error: rpcError } = await supabaseClient.rpc("increment_portfolio_views", {
      p_username: username.toLowerCase(),
    });

    if (rpcError) {
      console.error("Error incrementing view count:", rpcError);
    }

    // ── 2. Geolocate + company detection ──────────────────────────────────
    let country: string | null = null;
    let city: string | null = null;
    let companyName: string | null = null;

    try {
      // Cloudflare injects CF-IPCountry; fallback to x-forwarded-for lookup
      const cfCountry = req.headers.get("cf-ipcountry");
      if (cfCountry && cfCountry !== "XX") {
        country = cfCountry;
      }

      const forwarded = req.headers.get("x-forwarded-for");
      const ip = forwarded ? forwarded.split(",")[0].trim() : null;

      if (ip && ip !== "127.0.0.1" && ip !== "::1") {
        // ── 2a. Reverse DNS (PTR lookup via Google Public DNS) ──────────────
        const arpa = toArpa(ip);
        if (arpa) {
          try {
            const ptrRes = await Promise.race([
              fetch(`https://dns.google/resolve?name=${arpa}&type=PTR`),
              new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000)),
            ]);
            if (ptrRes instanceof Response && ptrRes.ok) {
              const ptrData = await ptrRes.json();
              const answers: Array<{ data: string }> = ptrData?.Answer ?? [];
              for (const ans of answers) {
                const parsed = parseCompanyFromPtr(ans.data ?? "");
                if (parsed) {
                  companyName = parsed;
                  break;
                }
              }
            }
          } catch {
            // PTR lookup failed — fall through to ip-api.com
          }
        }

        // ── 2b. Fallback: ip-api.com org field ───────────────────────────────
        if (!companyName) {
          const geoRes = await Promise.race([
            fetch(`http://ip-api.com/json/${ip}?fields=country,city,org,status`),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
          ]);

          if (geoRes instanceof Response && geoRes.ok) {
            const geo = await geoRes.json();
            if (geo.status === "success") {
              if (!country) country = geo.country || null;
              city = geo.city || null;

              // Strip ASN prefix (e.g. "AS15169 Google LLC" → "Google LLC")
              if (geo.org && typeof geo.org === "string") {
                const cleaned = geo.org.replace(/^AS\d+\s+/i, "").trim();
                if (cleaned && !GENERIC_ISP_RE.test(cleaned)) {
                  companyName = cleaned;
                }
              }
            }
          }
        } else {
          // We have company from PTR — still fetch geo for country/city
          const geoRes = await Promise.race([
            fetch(`http://ip-api.com/json/${ip}?fields=country,city,status`),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
          ]);
          if (geoRes instanceof Response && geoRes.ok) {
            const geo = await geoRes.json();
            if (geo.status === "success") {
              if (!country) country = geo.country || null;
              city = geo.city || null;
            }
          }
        }
      }
    } catch (geoErr) {
      console.warn("Geolocation failed (non-fatal):", geoErr);
    }

    // ── 3. Look up portfolio_id (stable across rename) + owner ──────────
    // portfolio_id is the new analytics FK target — it does NOT change when
    // an admin renames a username, so passing it to the RPC ensures the
    // visit history follows the user across renames. We still pass the
    // username so the RPC can populate the legacy column during the soak.
    const { data: profileRow } = await supabaseClient
      .from("profiles")
      .select("user_id")
      .eq("username", username.toLowerCase())
      .eq("portfolio_enabled", true)
      .single();

    let portfolioId: string | null = null;
    if (profileRow?.user_id) {
      const { data: portfolioRow } = await supabaseClient
        .from("portfolios")
        .select("id")
        .eq("user_id", profileRow.user_id)
        .maybeSingle();
      portfolioId = portfolioRow?.id ?? null;
    }

    // ── 4. Insert visit via RPC ─────────────────────────────────────────
    const referrer = req.headers.get("referer") || null;

    // Sanitise sectionsTiming: only keep string keys with positive integer values
    const sanitisedTiming: Record<string, number> = {};
    if (sectionsTiming && typeof sectionsTiming === "object") {
      for (const [k, v] of Object.entries(sectionsTiming)) {
        if (typeof k === "string" && typeof v === "number" && v > 0) {
          sanitisedTiming[k] = Math.round(v);
        }
      }
    }

    const { error: visitError } = await supabaseClient.rpc("record_portfolio_visit", {
      p_username: username.toLowerCase(),
      p_country: country,
      p_city: city,
      p_referrer: referrer,
      p_short_link_id: ref || null,
      p_sections_viewed: sectionsViewed ?? [],
      p_time_spent_seconds: timeSpentSeconds ?? null,
      p_device: device ?? null,
      p_company_name: companyName,
      p_ab_variant: (abVariant === 'a' || abVariant === 'b') ? abVariant : null,
      p_sections_timing: Object.keys(sanitisedTiming).length > 0 ? sanitisedTiming : null,
      p_portfolio_id: portfolioId,
    });

    if (visitError) {
      console.error("Error recording visit via RPC:", visitError);
    }

    // ── 5. Create in-app notification for portfolio owner ──────────────────
    if (profileRow?.user_id) {
      try {
        const locationParts = [city, country].filter(Boolean);
        const locationStr = locationParts.length > 0 ? ` from ${locationParts.join(", ")}` : "";
        await supabaseClient.from("notifications").insert({
          user_id: profileRow.user_id,
          type: "portfolio_view",
          title: "👀 Someone viewed your portfolio",
          message: `A visitor${locationStr} just checked out your portfolio.`,
          link: "/portfolio?tab=analytics",
        });
      } catch (notifErr) {
        console.warn("Notification creation failed (non-fatal):", notifErr);
      }
    }

    // ── 6. Increment short link click count if ref provided ────────────────
    if (ref) {
      await supabaseClient.rpc("increment_short_link_clicks", { 
        p_id: ref 
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
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
