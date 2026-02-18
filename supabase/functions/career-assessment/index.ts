import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { callAI, isAIError, parseAIJSON, toUserError } from "../_shared/aiClient.ts";
import { checkRateLimit, recordUsage } from "../_shared/rateLimiter.ts";

const MAX_BODY_SIZE = 150 * 1024;

const safeSkillsString = (skills: any[] | undefined | null): string =>
  (skills || []).map((s: any) => (typeof s === 'string' ? s : s?.name || '')).filter(Boolean).join(', ');

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rateCheck = await checkRateLimit(user.id, { maxRequests: 10, windowSeconds: 60, actionType: 'career_assess' });
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Try again in ${rateCheck.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.text();
    if (body.length > MAX_BODY_SIZE) {
      return new Response(
        JSON.stringify({ error: "Request too large" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { resume, quizAnswers } = JSON.parse(body);

    if (!resume || typeof resume !== "object") {
      return new Response(
        JSON.stringify({ error: "Resume data is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const quizContext = quizAnswers ? `
Career Quiz Responses:
- Role Satisfaction: ${quizAnswers.roleSatisfaction || 'N/A'}/5
- Career Goal: ${quizAnswers.careerGoal || 'N/A'}
- Skills to Develop: ${(quizAnswers.skillsToDevelop || []).join(', ') || 'N/A'}
- Work Preference: ${quizAnswers.workPreference || 'N/A'}
- Timeline: ${quizAnswers.timeline || 'N/A'}
- Salary Priority: ${quizAnswers.salaryPriority || 'N/A'}
- Industry Interests: ${(quizAnswers.industryInterests || []).join(', ') || 'N/A'}
- Biggest Challenge: ${quizAnswers.biggestChallenge || 'N/A'}
- Learning Preference: ${quizAnswers.learningPreference || 'N/A'}
- Geographic Flexibility: ${quizAnswers.geographicFlexibility || 'N/A'}
` : '';

    const systemPrompt = `You are an expert career advisor. Analyze the resume and career quiz responses.

Return ONLY valid JSON with this structure:
{
  "currentLevel": "entry" | "mid" | "senior" | "lead" | "executive",
  "yearsExperience": <number>,
  "primaryField": "<career field>",
  "nextRoles": [{"title":"","matchScore":0,"requiredSkills":[],"existingSkills":[],"timeToReady":"","description":""}],
  "skillGaps": [{"skill":"","priority":"critical|important|nice-to-have","forRoles":[],"suggestion":""}],
  "industryAlternatives": [{"industry":"","role":"","transferableSkills":[],"newSkillsNeeded":[],"salaryComparison":"higher|similar|lower"}],
  "actionPlan": [{"step":1,"action":"","timeframe":"","impact":"high|medium|low"}]
}

Generate 4-5 next roles, 4-6 skill gaps, 3-4 industry alternatives, and a 5-step action plan.`;

    const userPrompt = `Analyze this resume and provide career path advice:
${quizContext}
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
    if (!result) throw new Error("Failed to parse career assessment");

    const sanitized = {
      currentLevel: (result as any).currentLevel || "mid",
      yearsExperience: (result as any).yearsExperience || 0,
      primaryField: (result as any).primaryField || "General",
      nextRoles: (result as any).nextRoles || [],
      skillGaps: (result as any).skillGaps || [],
      industryAlternatives: (result as any).industryAlternatives || [],
      actionPlan: (result as any).actionPlan || [],
    };

    await recordUsage(user.id, 'career_assess');

    return new Response(JSON.stringify(sanitized), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("career-assessment error:", error);
    const { status, error: code, message } = toUserError(error);
    return new Response(
      JSON.stringify({ error: code, message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
