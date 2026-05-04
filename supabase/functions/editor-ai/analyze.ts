import { isFeatureEnabled } from '../_shared/featureFlags.ts';
import { callAIWithRetry, parseAIJSONWithRetry, sanitizeInputText } from '../_shared/aiClient.ts';
import { checkRateLimit, recordUsage, getUserPlan } from '../_shared/rateLimiter.ts';
import { checkUserRateLimit } from '../_shared/userRateLimiter.ts';
import { checkAndDeductCredit, refundCredit } from '../_shared/creditUtils.ts';
import { getProfileContext } from '../_shared/profileContext.ts';
import { INDUSTRY_KEYWORDS, detectIndustryCategory } from '../_shared/industryKeywords.ts';
import { logger } from '../_shared/logger.ts';

const log = logger('editor-ai');

const MAX_RESUME_SIZE = 100 * 1024;
const MAX_JOB_DESCRIPTION_SIZE = 50 * 1024;

function safeSkillsString(skills: unknown): string {
  if (!Array.isArray(skills)) return 'Not provided';
  return skills.map(s => typeof s === 'string' ? s : (s as any)?.name || String(s)).join(', ') || 'Not provided';
}

export async function handleAnalyze(
  req: Request,
  userId: string,
  bodyText: string,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const _fnStart = Date.now();

  const userPlan = await getUserPlan(userId);

  if (!(await isFeatureEnabled('ai_studio', userId, userPlan))) {
    log.warn('feature gate rejected', { function_name: 'editor-ai', provider_used: null, error_type: 'FeatureGateError', duration_ms: Date.now() - _fnStart });
    return new Response(
      JSON.stringify({ success: false, error: 'This feature is not available on your current plan' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const rateCheck = await checkRateLimit(userId, { maxRequests: 10, proMaxRequests: 50, windowSeconds: 60, actionType: 'analyze', plan: userPlan });
  if (!rateCheck.allowed) {
    log.warn('rate limit exceeded', { function_name: 'editor-ai', provider_used: null, error_type: 'RateLimitError', duration_ms: Date.now() - _fnStart });
    return new Response(
      JSON.stringify({ error: `Rate limit exceeded. Try again in ${rateCheck.retryAfterSeconds}s.` }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const serverRateCheck = await checkUserRateLimit(userId, 'analyze', 10, 60);
  if (!serverRateCheck.allowed) {
    log.warn('server rate limit exceeded', { function_name: 'editor-ai', provider_used: null, error_type: 'RateLimitError', duration_ms: Date.now() - _fnStart });
    return new Response(
      JSON.stringify({ error: `Rate limit exceeded. Try again in ${serverRateCheck.retryAfterSeconds}s.` }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const profileCtx = await getProfileContext(userId);

  let body: { resume?: unknown; jobDescription?: unknown };
  try {
    body = JSON.parse(bodyText);
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const resume = body.resume;
  const rawJobDescription = body.jobDescription;

  if (!resume || typeof resume !== 'object') {
    return new Response(
      JSON.stringify({ error: 'Resume is required and must be an object' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const rawJD = typeof rawJobDescription === 'string' ? rawJobDescription : '';
  const jobDescription = rawJD ? sanitizeInputText(rawJD, 15_000) : '';
  if (rawJD && jobDescription.length < rawJD.length) {
    console.log(`[editor-ai/analyze] Job description truncated from ${rawJD.length} to ${jobDescription.length} chars`);
  }

  if (jobDescription && jobDescription.length > MAX_JOB_DESCRIPTION_SIZE) {
    return new Response(
      JSON.stringify({ error: `Job description is too large. Maximum size is ${MAX_JOB_DESCRIPTION_SIZE / 1024}KB.` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const jdWordCount = jobDescription.split(/\s+/).filter(Boolean).length;
  const category = detectIndustryCategory(resume);
  const baselineKeywords = INDUSTRY_KEYWORDS[category] || INDUSTRY_KEYWORDS.general;
  let baselineKeywordsNote = '';
  if (jdWordCount < 150) {
    const reason = jdWordCount === 0 ? 'No job description provided.' : `The job description is brief (${jdWordCount} words).`;
    baselineKeywordsNote = `\n\nINDUSTRY BASELINE (${category} sector): ${reason} Evaluate the candidate against these standard ${category} industry keywords when identifying gaps and scoring: ${baselineKeywords.join(', ')}.`;
    console.log(`[editor-ai/analyze] Short/missing JD (${jdWordCount} words), injecting ${category} baseline keywords`);
  }

  const resumeStr = JSON.stringify(resume);
  if (resumeStr.length > MAX_RESUME_SIZE) {
    return new Response(
      JSON.stringify({ error: `Resume data is too large. Maximum size is ${MAX_RESUME_SIZE / 1024}KB.` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const profileNote = profileCtx.contextString
    ? ` ${profileCtx.contextString} Calibrate your feedback and scoring to this seniority level — for example, do not penalize an Entry-level candidate for lacking executive leadership experience, and hold a Senior candidate to a higher standard of impact and scope.`
    : '';

  const systemPrompt = `You are an expert ATS (Applicant Tracking System) analyzer and resume consultant. Analyze the provided resume against the job description and provide detailed scoring and gap analysis.${profileNote}

IMPORTANT: Respond ONLY with valid JSON, no markdown or code blocks. The response must be parseable JSON.`;

  const r = resume as any;
  const userPrompt = `Analyze this resume against the job description:

RESUME:
Name: ${r.contactInfo?.fullName || 'Not provided'}
Summary: ${r.summary || 'Not provided'}
Skills: ${safeSkillsString(r.skills)}
Experience: ${r.experience?.map((e: any) => `${e.position} at ${e.company}: ${e.description}${e.achievements?.length ? '\n  Achievements: ' + e.achievements.join('; ') : ''}`).join('\n') || 'Not provided'}
Education: ${r.education?.map((e: any) => `${e.degree} in ${e.field} from ${e.institution}`).join('\n') || 'Not provided'}
Projects: ${r.projects?.map((p: any) => `${p.name}: ${p.description}`).join('\n') || 'Not provided'}
Certifications: ${r.certifications?.map((c: any) => `${c.name} by ${c.issuer}`).join(', ') || 'Not provided'}
Awards: ${r.awards?.map((a: any) => `${a.title} from ${a.issuer}`).join(', ') || 'Not provided'}

JOB DESCRIPTION:
${jobDescription || '(No job description provided — use industry baseline keywords above to assess the candidate)'}${baselineKeywordsNote}

Provide analysis in this exact JSON format:
{
  "score": {
    "overallScore": <number 0-100>,
    "skillsMatch": <number 0-100>,
    "experienceRelevance": <number 0-100>,
    "keywordAlignment": <number 0-100>,
    "atsCompatibility": <number 0-100>,
    "strengths": ["<strength1>", "<strength2>", "<strength3>"],
    "improvements": ["<improvement1>", "<improvement2>"]
  },
  "gaps": {
    "missingKeywords": ["<keyword1>", "<keyword2>"],
    "missingSkills": ["<skill1>", "<skill2>"],
    "suggestedSections": ["<section1>"],
    "recommendedPhrases": ["<phrase1>", "<phrase2>"],
    "priorityImprovements": [
      {"priority": "high", "suggestion": "<suggestion>", "impact": "<impact>"},
      {"priority": "medium", "suggestion": "<suggestion>", "impact": "<impact>"}
    ]
  }
}`;

  const creditCheck = await checkAndDeductCredit(userId);
  if (!creditCheck.hasCredits) {
    log.warn('credit exhausted', { function_name: 'editor-ai', provider_used: null, error_type: 'CreditError', duration_ms: Date.now() - _fnStart });
    return new Response(
      JSON.stringify({ error: 'Insufficient AI credits.' }),
      { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let aiResponse;
  try {
    aiResponse = await callAIWithRetry({
      featureName: 'editor-ai',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      userId,
    });
  } catch (aiErr) {
    await refundCredit(userId, creditCheck, 1);
    throw aiErr;
  }

  if (!aiResponse.content) {
    await refundCredit(userId, creditCheck, 1);
    throw new Error('No content in AI response');
  }

  const analysisResult = await parseAIJSONWithRetry(aiResponse.content, {
    model: aiResponse.model,
    userId,
  });

  if (!analysisResult) {
    console.error('[editor-ai/analyze] Failed to parse AI analysis response:', aiResponse.content?.slice(0, 500));
    await refundCredit(userId, creditCheck, 1);
    return new Response(
      JSON.stringify({ error: 'Failed to parse AI response. Please try again.' }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  await recordUsage(userId, 'analyze', { provider: aiResponse.providerUsed || 'unknown' });
  log.info('analyze completed', { function_name: 'editor-ai', provider_used: aiResponse.providerUsed || 'unknown', error_type: null, duration_ms: Date.now() - _fnStart });

  return new Response(
    JSON.stringify({ ...analysisResult as Record<string, unknown>, _providerUsed: aiResponse.providerUsed || 'unknown' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
