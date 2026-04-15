import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getAuthUser } from '../_shared/authMiddleware.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const user = await getAuthUser(req);
    if (!user) {
      return new Response(JSON.stringify({ error: 'You must be signed in to apply.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Block HR users from applying
    const { data: profile } = await supabase
      .from('profiles')
      .select('account_type, full_name, email')
      .eq('user_id', user.id)
      .single();

    if (profile?.account_type === 'hr') {
      return new Response(JSON.stringify({ error: 'HR accounts cannot apply to roles.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { role_id, cover_note } = await req.json();
    if (!role_id) {
      return new Response(JSON.stringify({ error: 'role_id is required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify role is published
    const { data: role, error: roleErr } = await supabase
      .from('wisehire_roles')
      .select('id, title, owner_id, published, is_deleted')
      .eq('id', role_id)
      .single();

    if (roleErr || !role || !role.published || role.is_deleted) {
      return new Response(JSON.stringify({ error: 'Role not found or not open for applications.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check for duplicate application
    const { data: existing } = await supabase
      .from('wisehire_applications')
      .select('id')
      .eq('role_id', role_id)
      .eq('applicant_user_id', user.id)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: 'You have already applied to this role.' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Pull applicant's latest resume text from resume store
    const { data: resumes } = await supabase
      .from('resumes')
      .select('content')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1);

    const resumeText = resumes?.[0]?.content
      ? JSON.stringify(resumes[0].content).slice(0, 6000)
      : null;

    const applicantName = profile?.full_name ?? user.email ?? 'Applicant';
    const applicantEmail = profile?.email ?? user.email ?? '';

    // Create application row
    const { data: application, error: appErr } = await supabase
      .from('wisehire_applications')
      .insert({
        role_id,
        applicant_user_id: user.id,
        applicant_name: applicantName,
        applicant_email: applicantEmail,
        resume_text: resumeText,
        cover_note: cover_note ?? null,
        status: 'applied',
      })
      .select('id')
      .single();

    if (appErr) throw appErr;

    // Create wisehire_candidates row for HR pipeline
    const { data: candidate } = await supabase
      .from('wisehire_candidates')
      .insert({
        owner_id: role.owner_id,
        role_id: role.id,
        name: applicantName,
        email: applicantEmail,
        pipeline_stage: 'shortlisted',
        resume_text: resumeText,
        source: 'job_board',
        is_deleted: false,
      })
      .select('id')
      .single();

    // Link candidate to application
    if (candidate) {
      await supabase
        .from('wisehire_applications')
        .update({ candidate_id: candidate.id })
        .eq('id', application.id);
    }

    // Notify HR via Resend (best-effort)
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (RESEND_API_KEY) {
      const { data: hrProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_id', role.owner_id)
        .single();

      if (hrProfile?.email) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'WiseHire <noreply@thewise.cloud>',
            to: [hrProfile.email],
            subject: `New application: ${applicantName} for ${role.title}`,
            text: `${applicantName} (${applicantEmail}) applied to ${role.title} via WiseHire Job Board.\n\nThey have been automatically added to your pipeline under Shortlisted.\n\nView in WiseHire: https://thewise.cloud/wisehire/pipeline`,
          }),
        }).catch(() => {});
      }
    }

    return new Response(
      JSON.stringify({ ok: true, application_id: application.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[wisehire-apply]', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
