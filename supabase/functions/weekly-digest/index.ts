// weekly-digest: Sends in-app weekly career digest notifications to users who
// have digest_enabled=true and have been inactive for 5+ days. Intended to be
// triggered by a scheduled cron job, not by end users.
//
// Auth posture: CRON-SECRET-GATED (service-to-service only).
//   The caller must supply the CRON_SECRET value in the Authorization header
//   as "Bearer <CRON_SECRET>". This prevents arbitrary web clients from
//   triggering bulk notification writes. The Supabase cron scheduler (or any
//   trusted internal caller) must be configured with this secret.
//   If CRON_SECRET is not set in the environment the check is skipped with a
//   warning, so existing deployments without the secret do not break — but
//   setting CRON_SECRET is strongly recommended.
import { getCorsHeaders } from '../_shared/cors.ts';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";

const TIPS = [
  "Quantify your achievements — numbers make bullets 3x more impactful.",
  "Tailor your resume to each job posting. ATS systems rank keyword matches.",
  "Keep your portfolio updated — recruiters check it even when you're not job hunting.",
  "Practice answering behavioral questions out loud, not just in your head.",
  "A clean LinkedIn profile doubles your chances of recruiter outreach.",
  "Use action verbs: 'Led', 'Built', 'Reduced', 'Grew' — not 'Responsible for'.",
  "Add a summary section. Recruiters spend only 7 seconds scanning a resume.",
];

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // ── Cron-secret gate ──
  // This function must only be triggered by the Supabase cron scheduler or a
  // trusted internal caller. Callers must supply the CRON_SECRET value in the
  // Authorization header as "Bearer <CRON_SECRET>".
  // Fails closed (503) if CRON_SECRET is not configured — do not deploy without it.
  const CRON_SECRET = Deno.env.get('CRON_SECRET');
  if (!CRON_SECRET) {
    console.error('[weekly-digest] CRON_SECRET is not configured. Set it in Supabase Edge Function Secrets before enabling this function.');
    return new Response(JSON.stringify({ error: 'Function not configured' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const authHeader = req.headers.get('Authorization') ?? '';
  const provided = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (provided !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    const { data: dormantProfiles, error } = await supabase
      .from("profiles")
      .select("user_id, username, full_name, portfolio_enabled, digest_enabled")
      .eq("digest_enabled", true)
      .or(`last_active_at.is.null,last_active_at.lt.${fiveDaysAgo.toISOString()}`);

    if (error) {
      console.error("Error fetching dormant profiles:", error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: corsHeaders });
    }

    const tip = TIPS[new Date().getDay() % TIPS.length];
    let notified = 0;

    for (const profile of (dormantProfiles ?? [])) {
      try {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        let portfolioViews = 0;

        if (profile.portfolio_enabled && profile.username) {
          const { count } = await supabase
            .from("portfolio_visits")
            .select("id", { count: "exact", head: true })
            .eq("username", profile.username)
            .gte("visited_at", weekAgo.toISOString());
          portfolioViews = count ?? 0;
        }

        const { count: pendingCount } = await supabase
          .from("job_applications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", profile.user_id)
          .in("status", ["applied", "screening", "interviewing"]);

        const parts: string[] = [];
        if (portfolioViews > 0) parts.push(`${portfolioViews} portfolio view${portfolioViews > 1 ? 's' : ''} this week`);
        if ((pendingCount ?? 0) > 0) parts.push(`${pendingCount} application${(pendingCount ?? 0) > 1 ? 's' : ''} awaiting response`);
        parts.push(`Tip: ${tip}`);

        const firstName = profile.full_name?.split(" ")[0] ?? "there";

        await supabase.from("notifications").insert({
          user_id: profile.user_id,
          type: "system",
          title: `📬 Your weekly career digest, ${firstName}`,
          message: parts.join(" · "),
          link: "/dashboard",
        });

        notified++;
      } catch (err) {
        console.warn(`Failed to notify user ${profile.user_id}:`, err);
      }
    }

    return new Response(JSON.stringify({ ok: true, notified }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Weekly digest error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
