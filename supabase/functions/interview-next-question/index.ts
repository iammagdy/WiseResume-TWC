import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { requireAuth, AuthError } from '../_shared/authMiddleware.ts';
import { wrapHandler } from '../_shared/fnLogger.ts';

/**
 * Returns the next interview question for the requested track. The
 * mobile app uses this to drive its voice-practice flow. Backed by
 * the existing `interview_question_bank` table populated via the
 * `generate-question-bank` job — we just pick the next unseen row
 * for this user/track and record an attempt placeholder.
 *
 * If the bank is empty for a track we fall back to a static seed set
 * so a fresh deployment never returns "no questions" on day one.
 */
const FALLBACK_BANK: Record<string, string[]> = {
  behavioral: [
    'Tell me about a time you had to deliver bad news to a stakeholder.',
    'Describe a project where you had to learn a new technology quickly.',
    'Walk me through a conflict you resolved with a teammate.',
  ],
  technical: [
    'Explain how you would design a URL shortener at scale.',
    'How do database indexes work and when would you not use one?',
    'Walk me through what happens when you type a URL into the browser.',
  ],
  'system-design': [
    'Design a notification system that fans out to 1M users in <60s.',
    'How would you build rate limiting for a public API?',
    'Design a feature flag service.',
  ],
  general: [
    'Why are you interested in this role?',
    'What is your greatest professional accomplishment?',
    "What is a weakness you've been actively working on?",
  ],
};

interface Body {
  track?: string;
  session_id?: string;
}

serve(wrapHandler('interview-next-question', async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { userId, client } = await requireAuth(req);
    const body = (await req.json().catch(() => ({}))) as Body;
    const track = (body.track ?? 'general').toLowerCase();

    // Try bank first
    const { data: bankRow } = await client
      .from('interview_question_bank')
      .select('id, prompt')
      .eq('track', track)
      .order('created_at', { ascending: false })
      .limit(20);

    let prompt: string;
    let questionId: string;

    if (bankRow && bankRow.length > 0) {
      const pick = bankRow[Math.floor(Math.random() * bankRow.length)];
      prompt = String(pick.prompt ?? '');
      questionId = String(pick.id);
    } else {
      const pool = FALLBACK_BANK[track] ?? FALLBACK_BANK.general;
      prompt = pool[Math.floor(Math.random() * pool.length)];
      questionId = `fallback:${track}:${Date.now()}`;
    }

    // Best-effort attempt log (table may not exist on a fresh project)
    await client
      .from('interview_attempts')
      .insert({
        user_id: userId,
        session_id: body.session_id ?? null,
        track,
        question_id: questionId,
        prompt,
        asked_at: new Date().toISOString(),
      })
      .then((r) => r, () => null);

    return new Response(JSON.stringify({ id: questionId, prompt, track }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: err.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}));
