import { getCorsHeaders } from "../_shared/cors.ts";
import { callAI, isAIError, parseAIJSON, toUserError } from "../_shared/aiClient.ts";
import { checkRateLimit, recordUsage } from "../_shared/rateLimiter.ts";
import { requireAuth, authErrorResponse } from "../_shared/authMiddleware.ts";

interface DetectAndHumanizeRequest {
  text: string;
  action: 'detect' | 'humanize' | 'both';
  tone?: 'professional' | 'confident' | 'friendly';
}

const MAX_TEXT_LENGTH = 50000;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let userId: string;
    try {
      const auth = await requireAuth(req);
      userId = auth.userId;
    } catch (authErr) {
      return authErrorResponse(authErr, req.headers.get('origin'));
    }

    const rateCheck = await checkRateLimit(userId, { maxRequests: 15, windowSeconds: 60, actionType: 'detect_humanize' });
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Try again in ${rateCheck.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { text, action, tone = 'professional' }: DetectAndHumanizeRequest = await req.json();

    if (!text || !action) {
      return new Response(
        JSON.stringify({ error: 'Text and action are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Text must be under ${MAX_TEXT_LENGTH} characters` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result: Record<string, unknown> = {};
    let lastProviderUsed: string | undefined;

    // Detection
    if (action === 'detect' || action === 'both') {
      const detectPrompt = `You are an expert at detecting AI-generated text. Analyze the following text for signs of AI authorship.

Look for these common AI patterns:
- Overused words: "delve", "tapestry", "synergy", "leverage", "spearheaded", "multifaceted", "seamlessly", "paradigm", "holistic", "robust"
- Formulaic structure: lists of exactly 3-5 items, overly balanced sentence lengths
- Lack of personal voice: generic phrasing, no unique perspectives
- Perfect grammar with no natural variations
- Buzzword density and corporate jargon overuse

Return a JSON object:
{
  "aiScore": <0-100>,
  "humanScore": <0-100>,
  "confidence": "<high|medium|low>",
  "flags": [{"phrase": "<exact phrase>", "reason": "<why>", "severity": "<high|medium|low>"}],
  "verdict": "<1-2 sentence assessment>"
}

Analyze this text:
"""
${text}
"""`;

      const detectResponse = await callAI({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: detectPrompt }],
        temperature: 0.3,
        userId: userId,
      });

      result.detection = parseAIJSON(detectResponse.content || '{}');
    }

    // Humanization
    if (action === 'humanize' || action === 'both') {
      const toneInstructions: Record<string, string> = {
        professional: 'Maintain a professional tone while making it sound more natural and personal.',
        confident: 'Write with confident, assertive language. Use active voice and strong verbs.',
        friendly: 'Make it warm and approachable while still professional.',
      };

      const humanizePrompt = `You are an expert editor who makes AI-generated text sound naturally human.

Guidelines:
1. Replace overused AI words with natural alternatives
2. Vary sentence length and structure
3. Add subtle imperfections humans naturally make
4. ${toneInstructions[tone]}

Original text:
"""
${text}
"""

Return a JSON object:
{
  "original": "<the original text>",
  "humanized": "<your rewritten version>",
  "changes": ["<key changes made>"]
}`;

      const humanizeResponse = await callAI({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: humanizePrompt }],
        temperature: 0.7,
        userId: userId,
      });

      result.humanized = parseAIJSON(humanizeResponse.content || '{}');
    }

    const providerMeta = { provider: (result.detection as any)?.providerUsed || (result.humanized as any)?.providerUsed || 'unknown' };
    await recordUsage(userId, 'detect_humanize', providerMeta);

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Detect and humanize error:', error);
    const { status, error: code, message } = toUserError(error);
    return new Response(
      JSON.stringify({ error: code, message }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
