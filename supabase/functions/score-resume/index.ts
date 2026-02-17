import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI, isAIError, parseAIJSON } from "../_shared/aiClient.ts";
import { checkRateLimit, recordUsage } from "../_shared/rateLimiter.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const MAX_RESUME_SIZE = 100 * 1024;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Server-side rate limiting
    const rateCheck = await checkRateLimit(user.id, { maxRequests: 30, windowSeconds: 60, actionType: 'score' });
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Try again in ${rateCheck.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { resume, background } = await req.json();

    if (!resume || typeof resume !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Resume is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resumeStr = JSON.stringify(resume);
    if (resumeStr.length > MAX_RESUME_SIZE) {
      return new Response(
        JSON.stringify({ error: 'Resume data too large' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are an expert resume quality analyzer. Score a resume's quality WITHOUT a job description. Evaluate it purely on best practices, ATS readability, and professional standards.

IMPORTANT: Respond ONLY with valid JSON, no markdown or code blocks.
IMPORTANT: Be consistent — identical resume content must always receive the same score.`;

    const userPrompt = `Score this resume's overall quality:

Name: ${resume.contactInfo?.fullName || 'Not provided'}
Email: ${resume.contactInfo?.email || 'Not provided'}
Phone: ${resume.contactInfo?.phone || 'Not provided'}
Location: ${resume.contactInfo?.location || 'Not provided'}
LinkedIn: ${resume.contactInfo?.linkedin || 'Not provided'}
Summary: ${resume.summary || 'Not provided'}
Skills: ${Array.isArray(resume.skills) ? resume.skills.map((s: unknown) => typeof s === 'string' ? s : (s as Record<string, string>)?.name || String(s)).join(', ') : 'Not provided'}
Experience: ${resume.experience?.map((e: any) => `${e.position || 'Untitled'} at ${e.company || 'Unknown'} (${e.startDate || '?'} - ${e.endDate || 'Present'}): ${e.description || 'No description'}`).join('\n') || 'Not provided'}
Education: ${resume.education?.map((e: any) => `${e.degree || ''} in ${e.field || ''} from ${e.institution || 'Unknown'}`).join('\n') || 'Not provided'}

Evaluate and return JSON:
{
  "overallScore": <0-100>,
  "categories": {
    "completeness": <0-100>,
    "atsReadiness": <0-100>,
    "impactLanguage": <0-100>,
    "formatting": <0-100>
  },
  "topStrength": "<one short sentence>",
  "topImprovement": "<one short sentence>"
}

Scoring guide:
- completeness: Does it have all key sections filled with meaningful content?
- atsReadiness: Are there clear section headers, standard formatting, relevant keywords?
- impactLanguage: Do bullets use strong action verbs, quantified achievements?
- formatting: Is contact info complete, dates consistent, no obvious issues?`;

    const aiResponse = await callAI({
      model: 'google/gemini-2.5-flash-lite',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0,
      userId: user.id,
    });

    const content = aiResponse.content;
    if (!content) {
      throw new Error('No content in AI response');
    }

    const result = parseAIJSON(content);
    if (!result || typeof result.overallScore !== 'number') {
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI scoring response. Please try again.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Record usage for rate limiting (skip for background calls)
    if (!background) {
      await recordUsage(user.id, 'score');
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("score-resume error:", error);

    if (isAIError(error)) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: error.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
