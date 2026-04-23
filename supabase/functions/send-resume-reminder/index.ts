// send-resume-reminder: Scans for stale resumes and inserts in-app reminder
// notifications for their owners. Intended to be triggered by a scheduled
// cron job, not by end users.
//
// Auth posture: CRON-SECRET-GATED (service-to-service only).
//   The caller must supply the CRON_SECRET value in the `x-cron-secret`
//   header. This prevents arbitrary web clients from triggering bulk
//   notification writes. The Supabase cron scheduler (or any trusted internal
//   caller) must be configured with this secret. Fails closed (503) if
//   CRON_SECRET is not set.
import { getCorsHeaders } from '../_shared/cors.ts';
import { requireCronSecret } from '../_shared/webhookAuth.ts';
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // ── Cron-secret gate ──
  // Callers must supply the CRON_SECRET value in the `x-cron-secret` header.
  // Fails closed (503) if CRON_SECRET is not configured.
  try {
    requireCronSecret(req, corsHeaders);
  } catch (resp) {
    if (resp instanceof Response) return resp;
    throw resp;
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    // Find resumes that haven't been updated in 90+ days and haven't had a reminder sent in 30 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: staleResumes, error } = await supabase
      .from("resumes")
      .select("id, user_id, title, updated_at, last_reminder_sent_at")
      .lt("updated_at", ninetyDaysAgo.toISOString())
      .or(`last_reminder_sent_at.is.null,last_reminder_sent_at.lt.${thirtyDaysAgo.toISOString()}`);

    if (error) {
      console.error("Error fetching stale resumes:", error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: corsHeaders });
    }

    let reminded = 0;

    for (const resume of (staleResumes ?? [])) {
      try {
        const daysStale = Math.floor(
          (Date.now() - new Date(resume.updated_at).getTime()) / (1000 * 60 * 60 * 24)
        );

        await supabase.from("notifications").insert({
          user_id: resume.user_id,
          type: "system",
          title: "📝 Your resume needs a refresh",
          message: `"${resume.title}" hasn't been updated in ${daysStale} days. Keep it current so you're always ready.`,
          link: `/resume/${resume.id}`,
        });

        await supabase
          .from("resumes")
          .update({ last_reminder_sent_at: new Date().toISOString() })
          .eq("id", resume.id);

        reminded++;
      } catch (err) {
        console.warn(`Failed to remind for resume ${resume.id}:`, err);
      }
    }

    return new Response(JSON.stringify({ ok: true, reminded }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Resume reminder error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
