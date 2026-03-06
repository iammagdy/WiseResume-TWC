import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { callAIWithRetry, isAIError, parseAIJSON, sanitizeInputText, toUserError } from "../_shared/aiClient.ts";
import { checkRateLimit, recordUsage } from "../_shared/rateLimiter.ts";

// ============= SECURITY: Input validation limits =============
const MAX_RESUME_SIZE = 100 * 1024; // 100KB
const MAX_JOB_DESCRIPTION_SIZE = 50 * 1024; // 50KB

/** Safely extract skills as a comma-separated string */
function safeSkillsString(skills: unknown): string {
  if (!Array.isArray(skills)) return 'Not provided';
  return skills.map(s => typeof s === 'string' ? s : (s as any)?.name || String(s)).join(', ') || 'Not provided';
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authentication check
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
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    const rateCheck = await checkRateLimit(user.id, { maxRequests: 10, windowSeconds: 60, actionType: 'analyze' });
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Try again in ${rateCheck.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const resume = body.resume;
    const rawJobDescription = body.jobDescription;
    
    // ============= SECURITY: Input validation =============
    if (!resume || typeof resume !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Resume is required and must be an object' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!rawJobDescription || typeof rawJobDescription !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Job description is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize and truncate job description
    const jobDescription = sanitizeInputText(rawJobDescription, 15_000);
    if (jobDescription.length < rawJobDescription.length) {
      console.log(`[analyze] Job description truncated from ${rawJobDescription.length} to ${jobDescription.length} chars`);
    }

    const resumeStr = JSON.stringify(resume);
    if (resumeStr.length > MAX_RESUME_SIZE) {
      return new Response(
        JSON.stringify({ error: `Resume data is too large. Maximum size is ${MAX_RESUME_SIZE / 1024}KB.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (jobDescription.length > MAX_JOB_DESCRIPTION_SIZE) {
      return new Response(
        JSON.stringify({ error: `Job description is too large. Maximum size is ${MAX_JOB_DESCRIPTION_SIZE / 1024}KB.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are an expert ATS (Applicant Tracking System) analyzer and resume consultant. Analyze the provided resume against the job description and provide detailed scoring and gap analysis.

IMPORTANT: Respond ONLY with valid JSON, no markdown or code blocks. The response must be parseable JSON.`;

    const userPrompt = `Analyze this resume against the job description:

RESUME:
Name: ${resume.contactInfo?.fullName || 'Not provided'}
Summary: ${resume.summary || 'Not provided'}
Skills: ${safeSkillsString(resume.skills)}
Experience: ${resume.experience?.map((e: any) => `${e.position} at ${e.company}: ${e.description}${e.achievements?.length ? '\n  Achievements: ' + e.achievements.join('; ') : ''}`).join('\n') || 'Not provided'}
Education: ${resume.education?.map((e: any) => `${e.degree} in ${e.field} from ${e.institution}`).join('\n') || 'Not provided'}
Projects: ${resume.projects?.map((p: any) => `${p.name}: ${p.description}`).join('\n') || 'Not provided'}
Certifications: ${resume.certifications?.map((c: any) => `${c.name} by ${c.issuer}`).join(', ') || 'Not provided'}
Awards: ${resume.awards?.map((a: any) => `${a.title} from ${a.issuer}`).join(', ') || 'Not provided'}

JOB DESCRIPTION:
${jobDescription}

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

    const aiResponse = await callAIWithRetry({
      model: 'google/gemini-3-flash-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      userId: user.id,
    });

    if (!aiResponse.content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON from the AI response — never return fake scores
    const analysisResult = parseAIJSON(aiResponse.content);

    if (!analysisResult) {
      console.error("Failed to parse AI analysis response:", aiResponse.content?.slice(0, 500));
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response. Please try again." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await recordUsage(user.id, 'analyze', { provider: aiResponse.providerUsed || 'unknown' });

    return new Response(
      JSON.stringify({ ...analysisResult as Record<string, unknown>, _providerUsed: aiResponse.providerUsed || 'unknown' }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("analyze-resume error:", error);

    const userError = toUserError(error);
    return new Response(
      JSON.stringify({ error: userError.message }),
      { status: userError.status, headers: { ...getCorsHeaders(req.headers.get('origin')), "Content-Type": "application/json" } }
    );
  }
});
