import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { requireAuth, AuthError } from '../_shared/authMiddleware.ts';
import { wrapHandler } from '../_shared/fnLogger.ts';
import { callAI, parseAIJSON, isAIError, toUserError } from '../_shared/aiClient.ts';
import { selectProviderForTool } from '../_shared/modelRouter.ts';
import { checkAndDeductCredit, refundCredit } from '../_shared/creditUtils.ts';

/**
 * Grades a single interview answer and returns structured feedback.
 *
 * Mobile passes either a transcript (preferred — they did STT
 * locally) or a remote audio_url. We route through the project's
 * shared AI client so cost attribution + provider failover work the
 * same as every other AI call. One credit is charged on success and
 * refunded on AI failure.
 */
interface Body {
  question_id?: string;
  prompt?: string;
  transcript?: string;
  /** Storage path inside the `interview-audio` bucket. Server signs it. */
  audio_path?: string;
  /** Pre-signed audio URL (rare — only used for back-compat). */
  audio_url?: string;
  track?: string;
}

interface Feedback {
  score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
}

const ROUTE = selectProviderForTool('interview-grade-answer');

serve(wrapHandler('interview-grade-answer', async (req) => {
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

    if (!body.transcript && !body.audio_path && !body.audio_url) {
      return new Response(
        JSON.stringify({ error: 'transcript, audio_path, or audio_url is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Sign the audio_path so a future STT-capable provider can fetch
    // it. Today the AI prompt only sees the transcript; signing here
    // means we don't have to re-deploy when STT lands.
    let audioReference = body.audio_url ?? null;
    if (!audioReference && body.audio_path) {
      const { data: signed } = await client.storage
        .from('interview-audio')
        .createSignedUrl(body.audio_path, 60 * 30);
      audioReference = signed?.signedUrl ?? null;
    }

    const charged = await checkAndDeductCredit(client, userId, 1, 'interview-grade-answer');
    if (!charged.ok) {
      return new Response(JSON.stringify({ error: charged.reason ?? 'Insufficient credits' }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      const sys =
        'You are an interview coach. Grade the candidate answer using the STAR method. Respond ONLY in strict JSON: {"score": int 0-100, "summary": string, "strengths": string[], "improvements": string[]}.';
      const user = `Track: ${body.track ?? 'general'}\nQuestion: ${body.prompt ?? '(unknown)'}\nAnswer transcript:\n${body.transcript ?? '(audio recording — STT not yet wired; signed URL: ' + audioReference + ')'}`;

      const ai = await callAI({
        route: ROUTE,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: user },
        ],
        tool: 'interview-grade-answer',
        userId,
      });

      const parsed = parseAIJSON<Feedback>(ai.content);
      if (!parsed || typeof parsed.score !== 'number') {
        throw new Error('AI returned malformed feedback');
      }

      // Best-effort attempt update
      await client
        .from('interview_attempts')
        .update({
          transcript: body.transcript ?? null,
          audio_url: body.audio_url ?? null,
          score: parsed.score,
          feedback: parsed,
          graded_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('question_id', body.question_id ?? '')
        .then((r) => r, () => null);

      return new Response(JSON.stringify(parsed), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (err) {
      await refundCredit(client, userId, 1, 'interview-grade-answer').catch(() => null);
      if (isAIError(err)) {
        const friendly = toUserError(err);
        return new Response(JSON.stringify({ error: friendly.message }), {
          status: friendly.status ?? 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw err;
    }
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
