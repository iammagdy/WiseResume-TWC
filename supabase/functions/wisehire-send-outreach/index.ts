import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getAuthUser } from '../_shared/authMiddleware.ts';
import { checkRateLimit } from '../_shared/rateLimiter.ts';

const AI_DRAFT_SYSTEM = `You are a professional recruiter writing a concise outreach email to a candidate.
Rules: friendly yet professional tone, 3–5 sentences, no generic filler, personalise using the candidate name and role title provided, end with a clear call to action.
Output ONLY the email body (no subject line, no signature).`;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const user = await getAuthUser(req);
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // HR guard + plan
    const { data: profile } = await supabase
      .from('profiles')
      .select('account_type, plan')
      .eq('user_id', user.id)
      .single();

    if (profile?.account_type !== 'hr') {
      return new Response(JSON.stringify({ error: 'WiseHire HR account required' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Rate limit: Starter 10/day, Pro 100/day
    const limit = profile.plan === 'pro' ? 100 : 10;
    const rl = await checkRateLimit(user.id, 'wisehire-send-outreach', limit, 86400);
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: 'Daily outreach limit reached', remaining: 0 }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { candidate_id, subject, body, to_email, ai_draft, candidate_name, role_title } =
      await req.json();

    if (!candidate_id || !to_email) {
      return new Response(JSON.stringify({ error: 'candidate_id and to_email are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Verify candidate belongs to this HR user
    const { data: candidate, error: candErr } = await supabase
      .from('wisehire_candidates')
      .select('id, full_name')
      .eq('id', candidate_id)
      .eq('owner_id', user.id)
      .single();

    if (candErr || !candidate) {
      return new Response(JSON.stringify({ error: 'Candidate not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // AI draft mode — return draft without sending
    if (ai_draft) {
      const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
      const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');

      let draftBody = '';
      const userPrompt = `Candidate name: ${candidate_name ?? candidate.full_name ?? 'the candidate'}\nRole: ${role_title ?? 'an open position'}\nWrite the outreach email body.`;

      if (OPENAI_API_KEY || OPENROUTER_API_KEY) {
        const apiKey = OPENAI_API_KEY ?? OPENROUTER_API_KEY!;
        const baseUrl = OPENAI_API_KEY ? 'https://api.openai.com/v1' : 'https://openrouter.ai/api/v1';
        const model = OPENAI_API_KEY ? 'gpt-4o-mini' : 'openai/gpt-4o-mini';

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
      }

      return new Response(
        JSON.stringify({ draft: draftBody || `Hi ${candidate_name ?? 'there'},\n\nI came across your profile and was impressed by your background. We have an exciting opportunity at our company that I think you'd be a great fit for.\n\nWould you be open to a quick chat this week?\n\nBest regards` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Send mode — requires subject + body
    if (!subject || !body) {
      return new Response(JSON.stringify({ error: 'subject and body required to send' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get company name for "from" label
    const { data: company } = await supabase
      .from('wisehire_companies')
      .select('name')
      .eq('owner_id', user.id)
      .single();

    const fromLabel = company?.name ? `${company.name} via WiseHire` : 'WiseHire';

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    let resendMessageId: string | null = null;
    let status = 'saved';

    if (RESEND_API_KEY) {
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
        status = 'sent';
      } else {
        console.error('[wisehire-send-outreach] Resend error:', JSON.stringify(resendData));
        status = 'failed';
      }
    }

    // Persist email record regardless of send status
    const { data: record, error: insertErr } = await supabase
      .from('wisehire_outreach_emails')
      .insert({
        owner_id: user.id,
        candidate_id,
        to_email,
        subject,
        body,
        status,
        resend_message_id: resendMessageId,
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    return new Response(
      JSON.stringify({ ok: true, id: record.id, status, remaining: rl.remaining }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[wisehire-send-outreach]', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
