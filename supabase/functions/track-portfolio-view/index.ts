import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { username, ref, sectionsViewed, timeSpentSeconds } = body as {
      username: string;
      ref?: string;
      sectionsViewed?: string[];
      timeSpentSeconds?: number;
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

    // ── 2. Geolocate the visitor via IP ────────────────────────────────────
    let country: string | null = null;
    let city: string | null = null;

    try {
      // Cloudflare injects CF-IPCountry; fallback to x-forwarded-for lookup
      const cfCountry = req.headers.get("cf-ipcountry");
      if (cfCountry && cfCountry !== "XX") {
        country = cfCountry;
      }

      // Get IP for city lookup
      const forwarded = req.headers.get("x-forwarded-for");
      const ip = forwarded ? forwarded.split(",")[0].trim() : null;

      if (ip && ip !== "127.0.0.1" && ip !== "::1") {
        const geoRes = await Promise.race([
          fetch(`http://ip-api.com/json/${ip}?fields=country,city,status`),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200)),
        ]);

        if (geoRes && geoRes instanceof Response && geoRes.ok) {
          const geo = await geoRes.json();
          if (geo.status === "success") {
            if (!country) country = geo.country || null;
            city = geo.city || null;
          }
        }
      }
    } catch (geoErr) {
      console.warn("Geolocation failed (non-fatal):", geoErr);
    }

    // ── 3. Validate the portfolio exists before inserting visit ────────────
    const { data: profileRow } = await supabaseClient
      .from("profiles")
      .select("username, user_id")
      .eq("username", username.toLowerCase())
      .eq("portfolio_enabled", true)
      .single();

    if (!profileRow) {
      // Still succeed — just don't record an invalid visit
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 4. Insert detailed visit record ────────────────────────────────────
    const referrer = req.headers.get("referer") || null;

    const { error: insertError } = await supabaseClient
      .from("portfolio_visits")
      .insert({
        username: username.toLowerCase(),
        short_link_id: ref || null,
        country,
        city,
        time_spent_seconds: timeSpentSeconds ?? null,
        sections_viewed: sectionsViewed ?? [],
        referrer,
      });

    if (insertError) {
      console.error("Error inserting visit:", insertError);
    }

    // ── 5. Create in-app notification for portfolio owner ──────────────────
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

    // ── 5. Increment short link click count if ref provided ────────────────
    if (ref) {
      const { error: clickError } = await supabaseClient
        .from("short_links")
        .update({ click_count: supabaseClient.rpc("increment_short_link_count", { p_link_id: ref }) })
        .eq("id", ref);

      // If RPC doesn't exist yet, do a manual read-modify-write
      if (clickError) {
        const { data: link } = await supabaseClient
          .from("short_links")
          .select("click_count")
          .eq("id", ref)
          .single();

        if (link) {
          await supabaseClient
            .from("short_links")
            .update({ click_count: (link.click_count || 0) + 1 })
            .eq("id", ref);
        }
      }
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
