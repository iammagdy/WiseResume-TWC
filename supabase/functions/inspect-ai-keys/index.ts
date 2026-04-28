import { requireAdminAuth } from '../_shared/adminAuth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

/**
 * Admin-only endpoint that reports which of the 9 AI keys are present on
 * the server (3 OpenRouter + 3 Groq + 3 DeepSeek), with a tail-only mask
 * preview. The raw key value is NEVER returned.
 *
 * DeepSeek slot 1 reads DEEPSEEK_KEY first, then DEEPSEEK_KEY_1.
 * The envName returned for slot 1 reflects which var is actually set.
 *
 * Response shape:
 *   { success: true, keys: [{ provider, slot, configured, masked, model, envName }] }
 */

const OPENROUTER_FREE_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';
const GROQ_FREE_MODEL = 'llama-3.3-70b-versatile';
const DEEPSEEK_MODEL = 'deepseek-chat';

function mask(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const tail = trimmed.length >= 4 ? trimmed.slice(-4) : trimmed;
  return `••••${tail}`;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    try {
      await requireAdminAuth(req, corsHeaders);
    } catch (authErr) {
      if (authErr instanceof Response) return authErr;
      throw authErr;
    }

    const keys: Array<{
      provider: 'openrouter' | 'groq' | 'deepseek';
      slot: 1 | 2 | 3;
      configured: boolean;
      masked: string | null;
      model: string;
      envName: string;
    }> = [];

    for (const slot of [1, 2, 3] as const) {
      const raw = Deno.env.get(`OPENROUTER_KEY_${slot}`)?.trim();
      keys.push({
        provider: 'openrouter',
        slot,
        configured: !!raw,
        masked: mask(raw),
        model: OPENROUTER_FREE_MODEL,
        envName: `OPENROUTER_KEY_${slot}`,
      });
    }

    for (const slot of [1, 2, 3] as const) {
      const raw = Deno.env.get(`GROQ_KEY_${slot}`)?.trim();
      keys.push({
        provider: 'groq',
        slot,
        configured: !!raw,
        masked: mask(raw),
        model: GROQ_FREE_MODEL,
        envName: `GROQ_KEY_${slot}`,
      });
    }

    // DeepSeek: slot 1 checks DEEPSEEK_KEY first, then DEEPSEEK_KEY_1
    for (const slot of [1, 2, 3] as const) {
      let raw: string | undefined;
      let envName: string;
      if (slot === 1) {
        const primary = Deno.env.get('DEEPSEEK_KEY')?.trim();
        const fallback = Deno.env.get('DEEPSEEK_KEY_1')?.trim();
        raw = primary || fallback;
        envName = primary ? 'DEEPSEEK_KEY' : 'DEEPSEEK_KEY_1';
      } else {
        raw = Deno.env.get(`DEEPSEEK_KEY_${slot}`)?.trim();
        envName = `DEEPSEEK_KEY_${slot}`;
      }
      keys.push({
        provider: 'deepseek',
        slot,
        configured: !!raw,
        masked: mask(raw),
        model: DEEPSEEK_MODEL,
        envName,
      });
    }

    return new Response(
      JSON.stringify({ success: true, keys }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
