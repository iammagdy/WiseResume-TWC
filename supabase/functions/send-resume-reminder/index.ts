import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
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

        // Mark reminder sent to prevent spam
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
