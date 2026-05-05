import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.49.1';
import { getCorsHeaders } from '../_shared/cors.ts';
import { requireAuth, AuthError } from '../_shared/authMiddleware.ts';
import { wrapHandler } from '../_shared/fnLogger.ts';
import { renderArtifactPdf } from '../_shared/pdfRenderer.ts';
import { callAI, parseAIJSON, isAIError, toUserError } from '../_shared/aiClient.ts';
import { checkAndDeductCredit, refundCredit } from '../_shared/creditUtils.ts';

/**
 * Consolidated router for every mobile-only Supabase edge function.
 *
 * The Expo client (`/mobile`) calls this single function with
 * `{ action, ...payload }` instead of 6 separate functions, so the
 * deployment count stays under Supabase's 100-function project limit.
 *
 * Actions (every one requires a Kinde-bridge JWT via requireAuth):
 *   - register-push-token         ← was register-push-token
 *   - export-pdf {kind,id}        ← was export-{resume,cover-letter,resignation-letter}-pdf
 *   - interview-next-question     ← was interview-next-question
 *   - interview-grade-answer      ← was interview-grade-answer
 *
 * All reads/writes use PROD column names (content, template_id,
 * current_role, notice_period, recipient_name) — verified against the
 * `jnsfmkzgxsviuthaqlyy` project on 2026-05-03.
 */

interface ActionBody {
  action?: string;
  [k: string]: unknown;
}

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

function jsonResp(corsHeaders: Record<string, string>, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ─── action handlers ─────────────────────────────────────────────────────

async function handleRegisterPushToken(
  client: SupabaseClient,
  userId: string,
  body: ActionBody,
  cors: Record<string, string>,
): Promise<Response> {
  const token = typeof body.token === 'string' ? body.token : '';
  const platform = typeof body.platform === 'string' ? body.platform : '';
  if (!token) return jsonResp(cors, { error: 'token is required' }, 400);
  if (!['ios', 'android', 'web'].includes(platform)) {
    return jsonResp(cors, { error: 'platform must be ios|android|web' }, 400);
  }

  const { error } = await client.from('device_push_tokens').upsert(
    {
      user_id: userId,
      token,
      platform,
      app_version: typeof body.app_version === 'string' ? body.app_version : null,
      device_id: typeof body.device_id === 'string' ? body.device_id : null,
      locale: typeof body.locale === 'string' ? body.locale : null,
      last_seen_at: new Date().toISOString(),
      revoked_at: null,
    },
    { onConflict: 'user_id,token' },
  );

  if (error) return jsonResp(cors, { error: error.message }, 500);
  return jsonResp(cors, { ok: true });
}

async function handleExportPdf(
  client: SupabaseClient,
  userId: string,
  body: ActionBody,
  cors: Record<string, string>,
): Promise<Response> {
  const kind = String(body.kind ?? '');
  const id = String(body.id ?? '');
  if (!id) return jsonResp(cors, { error: 'id is required' }, 400);
  if (!['resume', 'cover_letter', 'resignation_letter'].includes(kind)) {
    return jsonResp(cors, { error: 'kind must be resume|cover_letter|resignation_letter' }, 400);
  }

  // Prod column names verified 2026-05-03 against project jnsfmkzgxsviuthaqlyy.
  // The `resumes` table has NO `content` column — every section is its own
  // jsonb column (contact_info, summary, experience, etc). The renderer
  // accepts the full row and templatizes per `kind`.
  let table: string;
  let select: string;
  if (kind === 'resume') {
    table = 'resumes';
    select =
      'id, user_id, title, template_id, contact_info, summary, experience, education, skills, certifications, awards, projects, publications, volunteering, hobbies, languages, "references", customization, target_job_title, target_company';
  } else if (kind === 'cover_letter') {
    table = 'cover_letters';
    select =
      'id, user_id, title, content, job_title, position, company, tone, template_style, model_used, metadata';
  } else {
    table = 'resignation_letters';
    select =
      'id, user_id, title, content, company, position, current_role, recipient_name, notice_period, last_working_day, effective_date, reason, reason_category, tone, template_style, additions';
  }

  const { data: row, error } = await client
    .from(table)
    .select(select)
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return jsonResp(cors, { error: error.message }, 500);
  if (!row) return jsonResp(cors, { error: `${kind} not found` }, 404);

  const titleVal = (row as { title?: unknown }).title;
  const title = typeof titleVal === 'string' && titleVal.length > 0 ? titleVal : kind;

  // Renderer accepts the row as-is and is template-aware via `kind`.
  const { url } = await renderArtifactPdf(client, {
    kind: kind as 'resume' | 'cover_letter' | 'resignation_letter',
    ownerUserId: userId,
    title,
    payload: row,
  });

  return jsonResp(cors, { url });
}

async function handleInterviewNextQuestion(
  client: SupabaseClient,
  userId: string,
  body: ActionBody,
  cors: Record<string, string>,
): Promise<Response> {
  const track = String(body.track ?? 'general').toLowerCase();
  const sessionId = typeof body.session_id === 'string' ? body.session_id : null;

  const { data: bankRows } = await client
    .from('interview_question_bank')
    .select('id, prompt')
    .eq('track', track)
    .order('created_at', { ascending: false })
    .limit(20);

  let prompt: string;
  let questionId: string;

  if (bankRows && bankRows.length > 0) {
    const pick = bankRows[Math.floor(Math.random() * bankRows.length)];
    prompt = String((pick as { prompt?: unknown }).prompt ?? '');
    questionId = String((pick as { id?: unknown }).id);
  } else {
    const pool = FALLBACK_BANK[track] ?? FALLBACK_BANK.general;
    prompt = pool[Math.floor(Math.random() * pool.length)];
    questionId = `fallback:${track}:${Date.now()}`;
  }

  // Best-effort attempt log — never blocks the question.
  await client
    .from('interview_attempts')
    .insert({
      user_id: userId,
      session_id: sessionId,
      track,
      question_id: questionId,
      prompt,
      asked_at: new Date().toISOString(),
    })
    .then((r) => r, () => null);

  return jsonResp(cors, { id: questionId, prompt, track });
}

async function handleInterviewGradeAnswer(
  client: SupabaseClient,
  userId: string,
  body: ActionBody,
  cors: Record<string, string>,
): Promise<Response> {
  const transcript = typeof body.transcript === 'string' ? body.transcript : '';
  const audioPath = typeof body.audio_path === 'string' ? body.audio_path : '';
  const audioUrlIn = typeof body.audio_url === 'string' ? body.audio_url : '';
  const questionId = typeof body.question_id === 'string' ? body.question_id : '';
  const prompt = typeof body.prompt === 'string' ? body.prompt : '';
  const track = typeof body.track === 'string' ? body.track : 'general';

  if (!transcript && !audioPath && !audioUrlIn) {
    return jsonResp(
      cors,
      { error: 'transcript, audio_path, or audio_url is required' },
      400,
    );
  }

  // Sign the audio_path so a future STT-capable provider can fetch it.
  let audioReference: string | null = audioUrlIn || null;
  if (!audioReference && audioPath) {
    const { data: signed } = await client.storage
      .from('interview-audio')
      .createSignedUrl(audioPath, 60 * 30);
    audioReference = signed?.signedUrl ?? null;
  }

  const charged = await checkAndDeductCredit(userId, 1);
  if (!charged.hasCredits) {
    return jsonResp(
      cors,
      { error: 'Daily AI credit limit reached. Upgrade your plan or add your own API key.' },
      402,
    );
  }

  try {
    const sys =
      'You are an interview coach. Grade the candidate answer using the STAR method. Respond ONLY in strict JSON: {"score": int 0-100, "summary": string, "strengths": string[], "improvements": string[]}.';
    const userMsg = `Track: ${track}\nQuestion: ${prompt || '(unknown)'}\nAnswer transcript:\n${
      transcript ||
      `(audio recording — STT not yet wired; signed URL: ${audioReference ?? 'none'})`
    }`;

    const ai = await callAI({
      featureName: 'interview-grade-answer',
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: userMsg },
      ],
      jsonMode: true,
      userId,
    });

    const parsed = parseAIJSON<{
      score: number;
      summary: string;
      strengths: string[];
      improvements: string[];
    }>(ai.content);

    if (!parsed || typeof parsed.score !== 'number') {
      throw new Error('AI returned malformed feedback');
    }

    await client
      .from('interview_attempts')
      .update({
        transcript: transcript || null,
        audio_url: audioUrlIn || null,
        score: parsed.score,
        feedback: parsed,
        graded_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('question_id', questionId)
      .then((r) => r, () => null);

    return jsonResp(cors, parsed);
  } catch (err) {
    await refundCredit(userId, charged, 1).catch(() => null);
    if (isAIError(err)) {
      const friendly = toUserError(err);
      return jsonResp(cors, { error: friendly.message }, friendly.status ?? 502);
    }
    throw err;
  }
}

// ─── router ──────────────────────────────────────────────────────────────

Deno.serve(wrapHandler('mobile-api', async (req) => {
  const cors = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return jsonResp(cors, { error: 'Method not allowed' }, 405);

  try {
    const { userId, client } = await requireAuth(req);
    const body = (await req.json().catch(() => ({}))) as ActionBody;
    const action = String(body.action ?? '');

    switch (action) {
      case 'register-push-token':
        return await handleRegisterPushToken(client, userId, body, cors);
      case 'export-pdf':
        return await handleExportPdf(client, userId, body, cors);
      case 'interview-next-question':
        return await handleInterviewNextQuestion(client, userId, body, cors);
      case 'interview-grade-answer':
        return await handleInterviewGradeAnswer(client, userId, body, cors);
      default:
        return jsonResp(cors, { error: `Unknown action: ${action || '(empty)'}` }, 400);
    }
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonResp(cors, { error: err.message }, err.status);
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    return jsonResp(cors, { error: message }, 500);
  }
}));
