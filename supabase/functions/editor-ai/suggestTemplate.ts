import { callAI, parseAIJSON } from '../_shared/aiClient.ts';
import { checkRateLimit, recordUsage } from '../_shared/rateLimiter.ts';
import { checkUserRateLimit } from '../_shared/userRateLimiter.ts';
import { checkAndDeductCredit, refundCredit } from '../_shared/creditUtils.ts';
import { logger } from '../_shared/logger.ts';

const log = logger('editor-ai');

const TEMPLATE_IDS = [
  'minimal', 'classic', 'modern', 'developer', 'executive', 'professional',
  'creative', 'compact', 'academic', 'healthcare', 'sales', 'elegant',
  'banking', 'consulting', 'federal', 'legal', 'marketing',
  'designer', 'portfolio', 'data-science',
  'devops', 'product', 'clean', 'swiss', 'bento', 'brutalist', 'bold-type',
];

export async function handleSuggestTemplate(
  req: Request,
  userId: string,
  bodyText: string,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const _fnStart = Date.now();

  const { allowed } = await checkRateLimit(userId, { actionType: 'suggest_template', maxRequests: 30, windowSeconds: 60 });
  if (!allowed) {
    log.warn('rate limit exceeded', { function_name: 'editor-ai', provider_used: null, error_type: 'RateLimitError', duration_ms: Date.now() - _fnStart });
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded. Please wait before requesting more template suggestions.' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const serverRateCheck = await checkUserRateLimit(userId, 'suggest_template', 30, 60);
  if (!serverRateCheck.allowed) {
    log.warn('server rate limit exceeded', { function_name: 'editor-ai', provider_used: null, error_type: 'RateLimitError', duration_ms: Date.now() - _fnStart });
    return new Response(
      JSON.stringify({ error: `Rate limit exceeded. Try again in ${serverRateCheck.retryAfterSeconds}s.` }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let body: { jobTitle?: string; industry?: string; careerLevel?: string; skills?: string[] };
  try {
    body = JSON.parse(bodyText);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const { jobTitle, industry, careerLevel, skills } = body;

  if (!jobTitle && !industry && (!skills || skills.length === 0)) {
    return new Response(
      JSON.stringify({ error: 'Provide at least a job title, industry, or skills' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const systemPrompt = `You are a resume design expert. Based on the user's industry, job title, career level, and skills, recommend the best resume template and customization settings.

Available template IDs: ${TEMPLATE_IDS.join(', ')}

Template categories:
- Professional: classic, professional, executive, banking, consulting, federal, legal, elegant
- Creative: creative, designer, marketing, portfolio, bento, brutalist, bold-type
- Tech: developer, data-science, devops, product
- Minimalist: minimal, modern, compact, clean, swiss, academic, healthcare, sales

Guidelines:
- Finance/Banking/Legal → banking, consulting, executive
- Tech/Engineering → developer, devops, data-science, product
- Creative/Design/Marketing → creative, designer, marketing, portfolio, bento, bold-type
- Healthcare → healthcare
- Academic/Research → academic
- Entry-level → clean, minimal, modern
- Executive/Senior → executive, elegant
- Bold/Modern 2026 → bento, brutalist, bold-type

For colors: use professional, muted tones for corporate roles; bolder accents for creative; dark tones for tech.
For fonts: serif pairs for traditional industries; sans-serif for modern/tech; display fonts for creative.`;

  const creditCheck = await checkAndDeductCredit(userId);
  if (!creditCheck.hasCredits) {
    log.warn('credit exhausted', { function_name: 'editor-ai', provider_used: null, error_type: 'CreditError', duration_ms: Date.now() - _fnStart });
    return new Response(
      JSON.stringify({ error: 'Daily AI credit limit reached. Upgrade your plan or use your own API key.' }),
      { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let aiResponse;
  try {
    aiResponse = await callAI({
      featureName: 'editor-ai',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Recommend a template for:
Job Title: ${jobTitle || 'Not specified'}
Industry: ${industry || 'Not specified'}
Career Level: ${careerLevel || 'Not specified'}
Key Skills: ${skills?.join(', ') || 'Not specified'}`,
        },
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'suggest_template',
            description: 'Return the recommended template and customization settings',
            parameters: {
              type: 'object',
              properties: {
                recommendedTemplateId: {
                  type: 'string',
                  description: 'The template ID from the available list',
                  enum: TEMPLATE_IDS,
                },
                customization: {
                  type: 'object',
                  properties: {
                    accentColor: { type: 'string', description: 'Hex color e.g. #1e3a5f' },
                    fontHeading: { type: 'string', enum: ['Inter', "'Playfair Display', serif", 'Roboto, sans-serif', "'Merriweather', serif", 'Poppins, sans-serif', 'Lato, sans-serif'] },
                    fontBody: { type: 'string', enum: ['Inter', 'Roboto, sans-serif', 'Poppins, sans-serif', 'Lato, sans-serif'] },
                    fontSize: { type: 'string', enum: ['small', 'medium', 'large'] },
                    spacing: { type: 'string', enum: ['compact', 'normal', 'spacious'] },
                  },
                  required: ['accentColor', 'fontHeading', 'fontBody', 'fontSize', 'spacing'],
                },
                reasoning: { type: 'string', description: 'Brief explanation of why this template fits (max 2 sentences)' },
              },
              required: ['recommendedTemplateId', 'customization', 'reasoning'],
              additionalProperties: false,
            },
          },
        },
      ],
      toolChoice: { type: 'function', function: { name: 'suggest_template' } },
      userId,
    });
  } catch (aiErr) {
    await refundCredit(userId, creditCheck, 1);
    throw aiErr;
  }

  const toolCall = aiResponse.toolCalls?.[0];
  let result: any = null;
  if ((toolCall as any)?.function?.arguments) {
    try { result = JSON.parse((toolCall as any).function.arguments); } catch {}
  }
  if (!result && aiResponse.content) {
    result = parseAIJSON(aiResponse.content);
  }
  if (!result) {
    await refundCredit(userId, creditCheck, 1);
    throw new Error('No structured result returned from AI');
  }

  const providerUsed = aiResponse.providerUsed || 'unknown';
  await recordUsage(userId, 'suggest_template', { provider: providerUsed });
  log.info('suggest-template completed', { function_name: 'editor-ai', provider_used: providerUsed, error_type: null, duration_ms: Date.now() - _fnStart });

  return new Response(JSON.stringify({
    ...result,
    _providerUsed: providerUsed,
    _fallbackUsed: aiResponse.fallbackUsed || false,
    _fallbackReason: aiResponse.fallbackReason || null,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
