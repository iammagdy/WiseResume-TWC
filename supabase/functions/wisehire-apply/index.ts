import { getCorsHeaders } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/dbClient.ts';
import { requireAuth, AuthError, authErrorResponse } from '../_shared/authMiddleware.ts';

function json(data: unknown, status = 200, cors: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const cors = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  try {
    const { userId, client: userClient } = await requireAuth(req);
    const supabase = getServiceClient();

    // Block HR users from applying
    const { data: profile } = await supabase
      .from('profiles')
      .select('account_type, full_name, email')
      .eq('user_id', userId)
      .single();

    if (profile?.account_type === 'hr') {
      return json({ error: 'HR accounts cannot apply to roles.' }, 403, cors);
    }

    const { role_id, cover_note } = await req.json();
    if (!role_id) {
      return json({ error: 'role_id is required.' }, 400, cors);
    }

    // Verify role is published
    const { data: role, error: roleErr } = await supabase
      .from('wisehire_roles')
      .select('id, title, owner_id, published, is_deleted')
      .eq('id', role_id)
      .single();

    if (roleErr || !role || !role.published || role.is_deleted) {
      return json({ error: 'Role not found or not open for applications.' }, 404, cors);
    }

    // Check for duplicate application
    const { data: existing } = await supabase
      .from('wisehire_applications')
      .select('id')
      .eq('role_id', role_id)
      .eq('applicant_user_id', userId)
      .maybeSingle();

    if (existing) {
      return json({ error: 'You have already applied to this role.' }, 409, cors);
    }

    // Pull applicant's latest resume text from resume store
    const { data: resumes } = await supabase
      .from('resumes')
      .select('content')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1);

    const resumeText = resumes?.[0]?.content
      ? JSON.stringify(resumes[0].content).slice(0, 6000)
      : null;

    // Get email from auth user
    const { data: { user: authUser } } = await userClient.auth.getUser();
    const applicantName = profile?.full_name ?? authUser?.email ?? 'Applicant';
    const applicantEmail = profile?.email ?? authUser?.email ?? '';

    // Create application row
    const { data: application, error: appErr } = await supabase
      .from('wisehire_applications')
      .insert({
        role_id,
        applicant_user_id: userId,
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

    return json({ ok: true, application_id: application.id }, 200, cors);
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, origin);
    console.error('[wisehire-apply]', err);
    return json({ error: 'Internal error' }, 500, getCorsHeaders(origin));
  }
});
