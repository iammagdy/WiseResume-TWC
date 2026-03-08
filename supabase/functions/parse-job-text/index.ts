import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { callAI, isAIError, parseAIJSON, toUserError } from "../_shared/aiClient.ts";
import { checkRateLimit, recordUsage } from "../_shared/rateLimiter.ts";
import { requireAuth, authErrorResponse } from "../_shared/authMiddleware.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId, client } = await requireAuth(req);

    const rateCheck = await checkRateLimit(userId, { maxRequests: 20, windowSeconds: 60, actionType: 'parse_job_text' });
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Try again in ${rateCheck.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { text } = await req.json();
    if (!text || typeof text !== 'string' || text.trim().length < 20) {
      return new Response(
        JSON.stringify({ error: 'Job description text must be at least 20 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const trimmedText = text.trim().slice(0, 20000);

    const systemPrompt = `You are an expert job market analyst. Extract structured job posting information from raw text. Return ONLY valid JSON with no markdown or code blocks.`;

    const userPrompt = `Extract job posting details from this text:

${trimmedText}

Return JSON:
{
  "title": "<job title>",
  "company": "<company name>",
  "description": "<the full job description text>",
  "experienceLevel": "<entry | mid | senior | executive>",
  "salaryRange": { "min": <number or null>, "max": <number or null>, "currency": "<USD etc.>" },
  "workMode": "<remote | hybrid | onsite | unknown>",
  "mustHaveSkills": ["<required skills>"],
  "niceToHaveSkills": ["<preferred skills>"],
  "yearsExperience": "<years requirement or null>",
  "companyCultureSignals": ["<culture indicators>"],
  "benefits": ["<benefits>"],
  "applicationDeadline": "<deadline or null>",
  "redFlags": ["<concerning patterns>"]
}

If you can't find certain fields, use null or empty arrays. Always extract title and company.`;

    let aiContent: string;
    let aiProviderUsed: string | undefined;
    try {
      const aiResponse = await callAI({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        userId,
      });
      aiContent = aiResponse.content || '';
      aiProviderUsed = aiResponse.providerUsed;
    } catch (aiErr: unknown) {
      if (isAIError(aiErr)) {
        return new Response(
          JSON.stringify({ error: aiErr.message }),
          { status: aiErr.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw aiErr;
    }

    let result = parseAIJSON<Record<string, unknown>>(aiContent);
    if (!result) {
      return new Response(
        JSON.stringify({ error: "Failed to parse job description" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    result = {
      ...result,
      title: result.title || 'Position',
      company: result.company || 'Unknown Company',
      description: result.description || trimmedText,
      experienceLevel: result.experienceLevel || 'mid',
      salaryRange: result.salaryRange || null,
      workMode: result.workMode || 'unknown',
      mustHaveSkills: result.mustHaveSkills || [],
      niceToHaveSkills: result.niceToHaveSkills || [],
      yearsExperience: result.yearsExperience || null,
      companyCultureSignals: result.companyCultureSignals || [],
      benefits: result.benefits || [],
      applicationDeadline: result.applicationDeadline || null,
      redFlags: result.redFlags || [],
    };

    await recordUsage(userId, 'parse_job_text', { provider: aiProviderUsed || 'unknown' });

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("parse-job-text error:", error);
    const userError = toUserError(error);
    return new Response(
      JSON.stringify({ error: userError.message }),
      { status: userError.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
