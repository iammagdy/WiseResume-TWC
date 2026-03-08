import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const { fromUuid, toUuid, contextToken } = await req.json();

    const EXPECTED_TOKEN = "8F42B1C3-5D9E-4A7B-B2E1-9C3F4D5A6E7B";
    if (!contextToken || contextToken !== EXPECTED_TOKEN) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(fromUuid) || !uuidRegex.test(toUuid)) {
      return new Response(
        JSON.stringify({ error: "Invalid UUID format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const results: Record<string, number> = {};

    // Step 0: Ensure shadow auth.users row exists for toUuid
    const { error: createUserErr } = await admin.auth.admin.createUser({
      id: toUuid,
      email: "magdy.saber@outlook.com",
      email_confirm: true,
      user_metadata: { migrated: true },
    });
    // Ignore "User already registered" / "already been registered" — it's fine
    if (createUserErr && !createUserErr.message?.toLowerCase().includes("already")) {
      console.error("createUser error:", createUserErr);
      // non-fatal — proceed anyway; row may already exist
    } else if (!createUserErr) {
      console.log(`Shadow auth.users row created for ${toUuid}`);
    } else {
      console.log(`Shadow auth.users row already exists for ${toUuid} — continuing`);
    }

    // 1. Delete orphaned profile at toUuid (empty row from prior provision)
    const { data: toProfile } = await admin
      .from("profiles")
      .select("user_id, full_name, contact_email")
      .eq("user_id", toUuid)
      .maybeSingle();

    if (toProfile && !toProfile.full_name) {
      console.log(`Deleting orphaned empty profile at ${toUuid}`);
      await admin.from("profiles").delete().eq("user_id", toUuid);
    }

    // 2. Migrate profiles
    const { data: profileUpdate, error: profileErr } = await admin
      .from("profiles")
      .update({ user_id: toUuid })
      .eq("user_id", fromUuid)
      .select();
    if (profileErr) console.error("profiles error:", profileErr);
    results.profiles = profileUpdate?.length ?? 0;

    // 3. Migrate resumes
    const { data: resumesUpdate, error: resumesErr } = await admin
      .from("resumes")
      .update({ user_id: toUuid })
      .eq("user_id", fromUuid)
      .select("id");
    if (resumesErr) console.error("resumes error:", resumesErr);
    results.resumes = resumesUpdate?.length ?? 0;

    // 4. Migrate cover_letters
    const { data: coverLetters, error: clErr } = await admin
      .from("cover_letters")
      .update({ user_id: toUuid })
      .eq("user_id", fromUuid)
      .select("id");
    if (clErr) console.error("cover_letters error:", clErr);
    results.cover_letters = coverLetters?.length ?? 0;

    // 5. Migrate job_applications
    const { data: jobApps, error: jaErr } = await admin
      .from("job_applications")
      .update({ user_id: toUuid })
      .eq("user_id", fromUuid)
      .select("id");
    if (jaErr) console.error("job_applications error:", jaErr);
    results.job_applications = jobApps?.length ?? 0;

    // 6. Migrate resume_versions
    const { data: versions, error: rvErr } = await admin
      .from("resume_versions")
      .update({ user_id: toUuid })
      .eq("user_id", fromUuid)
      .select("id");
    if (rvErr) console.error("resume_versions error:", rvErr);
    results.resume_versions = versions?.length ?? 0;

    // 7. Migrate tailor_history
    const { data: tailor, error: thErr } = await admin
      .from("tailor_history")
      .update({ user_id: toUuid })
      .eq("user_id", fromUuid)
      .select("id");
    if (thErr) console.error("tailor_history error:", thErr);
    results.tailor_history = tailor?.length ?? 0;

    // 8. Migrate interview_sessions
    const { data: interviews, error: isErr } = await admin
      .from("interview_sessions")
      .update({ user_id: toUuid })
      .eq("user_id", fromUuid)
      .select("id");
    if (isErr) console.error("interview_sessions error:", isErr);
    results.interview_sessions = interviews?.length ?? 0;

    // 9. Migrate career_assessments
    const { data: assessments, error: caErr } = await admin
      .from("career_assessments")
      .update({ user_id: toUuid })
      .eq("user_id", fromUuid)
      .select("id");
    if (caErr) console.error("career_assessments error:", caErr);
    results.career_assessments = assessments?.length ?? 0;

    // 10. Migrate ai_usage_logs
    const { data: aiLogs, error: alErr } = await admin
      .from("ai_usage_logs")
      .update({ user_id: toUuid })
      .eq("user_id", fromUuid)
      .select("id");
    if (alErr) console.error("ai_usage_logs error:", alErr);
    results.ai_usage_logs = aiLogs?.length ?? 0;

    console.log(`Migration complete from ${fromUuid} → ${toUuid}:`, results);

    return new Response(
      JSON.stringify({ success: true, fromUuid, toUuid, migrated: results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("migrate-user-data error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
