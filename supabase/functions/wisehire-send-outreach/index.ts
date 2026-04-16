import { getCorsHeaders } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/dbClient.ts';
import { requireAuth, AuthError, authErrorResponse } from '../_shared/authMiddleware.ts';
import { checkRateLimit, getUserPlan } from '../_shared/rateLimiter.ts';

const AI_DRAFT_SYSTEM = `You are a professional recruiter writing a concise outreach email to a candidate.
Rules: friendly yet professional tone, 3–5 sentences, no generic filler, personalise using the candidate name and role title provided, end with a clear call to action.
Output ONLY the email body (no subject line, no signature).`;

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
    const { userId } = await requireAuth(req);
    const supabase = getServiceClient();

    // HR guard + plan
    const { data: profile } = await supabase
      .from('profiles')
      .select('account_type')
      .eq('user_id', userId)
      .single();

    if (profile?.account_type !== 'hr') {
      return json({ error: 'WiseHire HR account required' }, 403, cors);
    }

    // Resolve profiles.id (PK) for FK joins (wisehire_* tables FK to profiles.id, not user_id)
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();
    const profileId = profileRow?.id ?? userId;

    // Rate limit: Starter 10/day, Pro 100/day (plan from subscriptions)
    const effectivePlan = await getUserPlan(userId);
    const limit = ['wisehire_professional', 'wisehire_business', 'wisehire_enterprise'].includes(effectivePlan) ? 100 : 10;
    const rl = await checkRateLimit(userId, {
      actionType: 'wisehire_send_outreach',
      maxRequests: limit,
      windowSeconds: 86_400,
    });
    if (!rl.allowed) {
      return json({ error: 'Daily outreach limit reached', remaining: 0 }, 429, cors);
    }

    const { candidate_id, subject, body, to_email, ai_draft, candidate_name, role_title } =
      await req.json();

    if (!candidate_id || !to_email) {
      return json({ error: 'candidate_id and to_email are required' }, 400, cors);
    }

    // Verify candidate belongs to this HR user
    const { data: candidate, error: candErr } = await supabase
      .from('wisehire_candidates')
      .select('id, name')
      .eq('id', candidate_id)
      .eq('owner_id', profileId)
      .single();

    if (candErr || !candidate) {
      return json({ error: 'Candidate not found' }, 404, cors);
    }

    // AI draft mode — return draft without sending
    if (ai_draft) {
      const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
      const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');

      let draftBody = '';
      const userPrompt = `Candidate name: ${candidate_name ?? candidate.name ?? 'the candidate'}\nRole: ${role_title ?? 'an open position'}\nWrite the outreach email body.`;

      if (OPENAI_API_KEY || OPENROUTER_API_KEY) {
        const apiKey = OPENAI_API_KEY ?? OPENROUTER_API_KEY!;
        const baseUrl = OPENAI_API_KEY ? 'https://api.openai.com/v1' : 'https://openrouter.ai/api/v1';
        const model = OPENAI_API_KEY ? 'gpt-4o-mini' : 'openai/gpt-4o-mini';

        try {
          const aiRes = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: AI_DRAFT_SYSTEM },
                { role: 'user', content: userPrompt },
              ],
              max_tokens: 300,
              temperature: 0.7,
            }),
          });

          if (aiRes.ok) {
            const aiData = await aiRes.json();
            draftBody = aiData.choices?.[0]?.message?.content?.trim() ?? '';
          }
        } catch (aiErr) {
          console.warn('[wisehire-send-outreach] AI draft fetch failed:', aiErr);
        }
      }

      return json({
        draft: draftBody || `Hi ${candidate_name ?? 'there'},\n\nI came across your profile and was impressed by your background. We have an exciting opportunity at our company that I think you'd be a great fit for.\n\nWould you be open to a quick chat this week?\n\nBest regards`,
      }, 200, cors);
    }

    // Send mode — requires subject + body
    if (!subject || !body) {
      return json({ error: 'subject and body required to send' }, 400, cors);
    }

    // Get company name for "from" label
    const { data: company } = await supabase
      .from('wisehire_companies')
      .select('name')
      .eq('owner_id', profileId)
      .single();

    const fromLabel = company?.name ? `${company.name} via WiseHire` : 'WiseHire';

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return json({ error: 'Email delivery is not configured. RESEND_API_KEY is not set — contact your administrator.' }, 503, cors);
    }

    let resendMessageId: string | null = null;
    let emailStatus = 'saved';

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${fromLabel} <noreply@thewise.cloud>`,
        to: [to_email],
        subject,
        text: body,
      }),
    });

    const resendData = await resendRes.json();
    if (resendRes.ok) {
      resendMessageId = resendData.id;
      emailStatus = 'sent';
    } else {
      console.error('[wisehire-send-outreach] Resend error:', JSON.stringify(resendData));
      emailStatus = 'failed';
    }

    // Persist email record regardless of send status
    const { data: record, error: insertErr } = await supabase
      .from('wisehire_outreach_emails')
      .insert({
        owner_id: profileId,
        candidate_id,
        to_email,
        subject,
        body,
        status: emailStatus,
        resend_message_id: resendMessageId,
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    return json({ ok: true, id: record.id, status: emailStatus, remaining: rl.remaining }, 200, cors);
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, origin);
    console.error('[wisehire-send-outreach]', err);
    return json({ error: 'Internal error' }, 500, getCorsHeaders(origin));
  }
});
