import { callAI, parseAIJSON, sanitizeInputText } from '../_shared/aiClient.ts';
import { checkRateLimit, recordUsage } from '../_shared/rateLimiter.ts';
import { checkUserRateLimit } from '../_shared/userRateLimiter.ts';
import { checkAndDeductCredit, refundCredit } from '../_shared/creditUtils.ts';
import { logger } from '../_shared/logger.ts';

const log = logger('editor-ai');

interface ResumeData {
  contactInfo: { fullName: string; email: string; phone: string; location: string; linkedin?: string; portfolio?: string; };
  summary: string;
  experience: { id: string; company: string; position: string; startDate: string; endDate: string; current: boolean; description: string; achievements: string[]; }[];
  education: { id: string; institution: string; degree: string; field: string; startDate: string; endDate: string; gpa?: string; }[];
  skills: (string | { name?: string })[];
}

function safeSkillsString(skills: unknown): string {
  if (!Array.isArray(skills)) return 'Not listed';
  return skills.map(s => typeof s === 'string' ? s : (s as any)?.name || String(s)).join(', ') || 'Not listed';
}

export async function handleOptimizeLinkedIn(
  req: Request,
  userId: string,
  bodyText: string,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const _fnStart = Date.now();

  const rateCheck = await checkRateLimit(userId, { maxRequests: 10, windowSeconds: 60, actionType: 'linkedin_opt' });
  if (!rateCheck.allowed) {
    log.warn('rate limit exceeded', { function_name: 'editor-ai', provider_used: null, error_type: 'RateLimitError', duration_ms: Date.now() - _fnStart });
    return new Response(
      JSON.stringify({ error: `Rate limit exceeded. Try again in ${rateCheck.retryAfterSeconds}s.` }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const serverRateCheck = await checkUserRateLimit(userId, 'linkedin_opt', 10, 60);
  if (!serverRateCheck.allowed) {
    log.warn('server rate limit exceeded', { function_name: 'editor-ai', provider_used: null, error_type: 'RateLimitError', duration_ms: Date.now() - _fnStart });
    return new Response(
      JSON.stringify({ error: `Rate limit exceeded. Try again in ${serverRateCheck.retryAfterSeconds}s.` }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let body: { resume?: ResumeData; targetRole?: string; region?: string };
  try {
    body = JSON.parse(bodyText);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const { resume, targetRole, region = 'global' } = body;

  if (!resume) {
    return new Response(
      JSON.stringify({ error: 'Resume data is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const regionContext: Record<string, string> = {
    global: 'Use internationally recognized terminology and avoid region-specific idioms.',
    gcc: 'Consider Gulf Cooperation Council business culture. Emphasize stability, respect for hierarchy, and relationship building.',
    emea: 'Balance European formality with Middle Eastern relationship focus. Highlight international experience.',
    apac: 'Consider Asia-Pacific business values: collective achievement, continuous learning, and respect for experience.',
    americas: 'Use direct, achievement-focused language common in North and South American business culture.',
  };

  const resumeContext = sanitizeInputText(`
Name: ${resume.contactInfo.fullName}
Current/Recent Role: ${resume.experience?.[0]?.position || 'Not specified'} at ${resume.experience?.[0]?.company || 'Not specified'}
Summary: ${resume.summary || 'Not provided'}
Skills: ${safeSkillsString(resume.skills)}
Experience Highlights: ${resume.experience?.slice(0, 3).map(e => `${e.position} at ${e.company}`).join('; ') || 'Not listed'}
Education: ${resume.education?.[0]?.degree} in ${resume.education?.[0]?.field} from ${resume.education?.[0]?.institution || 'Not listed'}
${targetRole ? `Target Role: ${targetRole}` : ''}
`, 5000);

  const systemPrompt = `You are an expert LinkedIn profile writer and personal branding specialist.

${regionContext[region] || regionContext.global}

WRITING RULES — apply to every section you generate:
1. Headlines: structure each as [Role] + [one differentiator] + [value proposition]. Maximum 120 characters. Do not repeat the same differentiator across options. No generic phrases like "results-oriented" or "passionate professional".
2. About sections: write entirely in first person ("I", "my"). Open with a strong hook, not the candidate's name or job title. Quantify achievements wherever the resume data supports it. Close with a forward-looking sentence. No clichés.
3. Suggested skills: use ONLY the exact skill terms from the "Skills" list provided in the candidate's resume. Do not infer, add, or paraphrase skills.
4. Experience rewrites: reframe the original bullet-point style into LinkedIn's narrative paragraph style — storytelling tone, first person, emphasis on impact and context. Do not fabricate metrics or responsibilities not present in the original.
5. Keywords: use only terms that appear verbatim in the candidate's provided skills list, job titles, or summary.
6. Do not fabricate companies, credentials, awards, or any experience not stated in the resume.`;

  const userPrompt = `Optimize the LinkedIn profile for this candidate:

${resumeContext}

Generate a complete LinkedIn optimization package following the rules above.`;

  const creditCheck = await checkAndDeductCredit(userId);
  if (!creditCheck.hasCredits) {
    log.warn('credit exhausted', { function_name: 'editor-ai', provider_used: null, error_type: 'CreditError', duration_ms: Date.now() - _fnStart });
    return new Response(
      JSON.stringify({ error: 'Insufficient AI credits. Add your own Gemini API key for unlimited access.' }),
      { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let aiResponse;
  try {
    aiResponse = await callAI({
      featureName: 'editor-ai',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      userId,
      tools: [{
        type: 'function',
        function: {
          name: 'generate_linkedin_package',
          description: 'Generate a structured LinkedIn optimization package',
          parameters: {
            type: 'object',
            properties: {
              headlines: { type: 'array', items: { type: 'string' }, description: '5 compelling LinkedIn headline options, 120 chars max each' },
              aboutSections: {
                type: 'object',
                properties: {
                  short: { type: 'string', description: '150 word about section' },
                  medium: { type: 'string', description: '300 word about section' },
                  long: { type: 'string', description: '500 word about section' },
                },
                required: ['short', 'medium', 'long'],
                additionalProperties: false,
              },
              experienceRewrites: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    original: { type: 'string' },
                    linkedin: { type: 'string' },
                    position: { type: 'string' },
                    company: { type: 'string' },
                  },
                  required: ['original', 'linkedin', 'position', 'company'],
                  additionalProperties: false,
                },
              },
              suggestedSkills: { type: 'array', items: { type: 'string' }, description: '15-20 skills' },
              keywords: { type: 'array', items: { type: 'string' }, description: '10-15 keywords' },
              tips: { type: 'array', items: { type: 'string' }, description: '3-5 tips' },
            },
            required: ['headlines', 'aboutSections', 'experienceRewrites', 'suggestedSkills', 'keywords', 'tips'],
            additionalProperties: false,
          },
        },
      }],
      toolChoice: { type: 'function', function: { name: 'generate_linkedin_package' } },
    });
  } catch (aiErr) {
    await refundCredit(userId, creditCheck, 1);
    throw aiErr;
  }

  let result: any = null;
  if ((aiResponse.toolCalls as any)?.length) {
    try { result = JSON.parse((aiResponse.toolCalls as any)[0].function.arguments); } catch {}
  }
  if (!result && aiResponse.content) {
    result = parseAIJSON(aiResponse.content);
  }
  if (!result) {
    await refundCredit(userId, creditCheck, 1);
    return new Response(
      JSON.stringify({ error: 'Failed to parse AI response' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  await recordUsage(userId, 'linkedin_opt', { provider: aiResponse.providerUsed || 'unknown' });
  log.info('optimize-linkedin completed', { function_name: 'editor-ai', provider_used: aiResponse.providerUsed || 'unknown', error_type: null, duration_ms: Date.now() - _fnStart });

  return new Response(
    JSON.stringify({ success: true, ...result }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
