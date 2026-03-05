import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { callAI, isAIError, parseAIJSON, toUserError } from "../_shared/aiClient.ts";
import { checkRateLimit, recordUsage } from "../_shared/rateLimiter.ts";

const MAX_RESUME_SIZE = 100 * 1024;

const safeSkillsString = (skills: any[] | undefined | null): string =>
  (skills || []).map((s: any) => (typeof s === 'string' ? s : s?.name || '')).filter(Boolean).join(', ');

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
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

    const rateCheck = await checkRateLimit(user.id, { maxRequests: 10, windowSeconds: 60, actionType: 'career_path' });
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Try again in ${rateCheck.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { resume } = await req.json();

    if (!resume || typeof resume !== "object") {
      return new Response(
        JSON.stringify({ error: "Resume data is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (JSON.stringify(resume).length > MAX_RESUME_SIZE) {
      return new Response(
        JSON.stringify({ error: "Resume data too large" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are an expert career advisor. Analyze the resume and generate career progression insights.

REASONING PROCESS:
1. First identify the candidate's current career stage based on their actual experience duration and seniority of roles held.
2. Map their existing skills to adjacent roles in the same and related industries.
3. Consider both vertical paths (promotion within their field) and lateral paths (industry switches leveraging transferable skills).
4. Create a concrete 90-day action plan with specific, achievable steps.

GROUNDING RULES:
- Base recommendations on established career frameworks and widely recognized industry roles only.
- Do not invent fictional certification names, company names, or specific salary figures.
- Use relative salary comparisons (higher/similar/lower) rather than inventing dollar amounts.
- All suggested skills must be real, widely recognized skills in the industry.

Return ONLY valid JSON with this structure:
{
  "currentLevel": "entry" | "mid" | "senior" | "lead" | "executive",
  "yearsExperience": <number>,
  "primaryField": "<field>",
  "nextRoles": [{"title":"","matchScore":0,"requiredSkills":[],"existingSkills":[],"timeToReady":"","description":""}],
  "skillGaps": [{"skill":"","priority":"critical|important|nice-to-have","forRoles":[],"suggestion":""}],
  "industryAlternatives": [{"industry":"","role":"","transferableSkills":[],"newSkillsNeeded":[],"salaryComparison":"higher|similar|lower"}],
  "actionPlan": [{"step":1,"action":"","timeframe":"","impact":"high|medium|low"}]
}

Generate 4-5 next roles, 4-6 skill gaps, 3-4 industry alternatives, and a 5-step action plan.`;

    const userPrompt = `Analyze this resume:

Name: ${resume.contactInfo?.fullName || "Not provided"}
Summary: ${resume.summary || "Not provided"}
Skills: ${safeSkillsString(resume.skills) || "Not provided"}

Experience:
${resume.experience?.map((e: any) =>
  `- ${e.position} at ${e.company} (${e.startDate} - ${e.current ? "Present" : e.endDate})\n  ${e.description}\n  Achievements: ${e.achievements?.join("; ") || "None"}`
).join("\n") || "Not provided"}

Education:
${resume.education?.map((e: any) => `- ${e.degree} in ${e.field} from ${e.institution}`).join("\n") || "Not provided"}`;

    const aiResponse = await callAI({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.6,
      maxTokens: 4000,
      userId: user.id,
    });

    const result = parseAIJSON(aiResponse.content || '{}');
    if (!result) throw new Error("Failed to parse career path analysis");

    const sanitized = {
      currentLevel: (result as any).currentLevel || "mid",
      yearsExperience: (result as any).yearsExperience || 0,
      primaryField: (result as any).primaryField || "General",
      nextRoles: (result as any).nextRoles || [],
      skillGaps: (result as any).skillGaps || [],
      industryAlternatives: (result as any).industryAlternatives || [],
      actionPlan: (result as any).actionPlan || [],
    };

    await recordUsage(user.id, 'career_path', { provider: aiResponse.providerUsed || 'unknown' });

    return new Response(JSON.stringify(sanitized), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("career-path-advisor error:", error);
    const { status, error: code, message } = toUserError(error);
    return new Response(
      JSON.stringify({ error: code, message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
