import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { callAIWithRetry, isAIError, parseAIJSON, toUserError } from "../_shared/aiClient.ts";
import { checkRateLimit, recordUsage } from "../_shared/rateLimiter.ts";
import { requireAuth, authErrorResponse } from "../_shared/authMiddleware.ts";

const MAX_BODY_SIZE = 150 * 1024;

const safeSkillsString = (skills: any[] | undefined | null): string =>
  (skills || []).map((s: any) => (typeof s === 'string' ? s : s?.name || '')).filter(Boolean).join(', ');

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { userId, client } = await requireAuth(req);

    const rateCheck = await checkRateLimit(userId, { maxRequests: 10, windowSeconds: 60, actionType: 'career_assess' });
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

    const systemPrompt = `You are an expert career advisor and strategist. Analyze the resume and career quiz responses with deep precision. Base ALL recommendations strictly on the user's actual experience, skills, and education — do NOT fabricate or assume skills they don't have.

Return ONLY valid JSON with this exact structure:
{
  "currentLevel": "entry" | "mid" | "senior" | "lead" | "executive",
  "yearsExperience": <number>,
  "primaryField": "<career field>",
  "strengthSummary": "<2-3 sentences describing what makes this candidate strong, based only on their real experience>",
  "riskFactors": ["<risk 1>", "<risk 2>"],
  "careerMap": {
    "current": { "title": "<current or most recent role>", "level": "<entry|mid|senior|lead|executive>" },
    "branches": [
      {
        "direction": "<e.g. Vertical Growth, Lateral Move, Specialization, Management Track>",
        "roles": [
          { "title": "<role title>", "timeframe": "<e.g. 6-12 months>", "matchScore": <0-100>, "requiredSkills": ["<skill>"] }
        ]
      }
    ]
  },
  "nextRoles": [{"title":"","matchScore":0,"requiredSkills":[],"existingSkills":[],"timeToReady":"","description":""}],
  "skillGaps": [{"skill":"","priority":"critical|important|nice-to-have","forRoles":[],"suggestion":"","youtubeQuery":"<precise YouTube search query for a free tutorial or course on this skill, e.g. 'Python for data science free course 2025'>"}],
  "industryAlternatives": [{"industry":"","role":"","transferableSkills":[],"newSkillsNeeded":[],"salaryComparison":"higher|similar|lower"}],
  "actionPlan": [{"step":1,"action":"","timeframe":"","impact":"high|medium|low"}]
}

CRITICAL RULES:
- Generate 3-4 career map branches with 2-3 roles each
- Generate 4-5 next roles with realistic match scores based on actual skills
- Generate 4-6 skill gaps with REAL YouTube search queries that will find actual free courses/tutorials
- YouTube queries must be specific and include "free course" or "tutorial" and the current year
- Generate 3-4 industry alternatives
- Generate a 5-step action plan
- strengthSummary must reference specific skills/experience from the resume
- riskFactors should be 2-3 honest career risks based on their profile
- DO NOT invent skills or experience the candidate doesn't have
- Match scores must reflect realistic assessment of existing vs required skills`;

    const userPrompt = `Analyze this resume and provide a comprehensive career path analysis:
${quizContext}
Name: ${resume.contactInfo?.fullName || "Not provided"}
Summary: ${resume.summary || "Not provided"}
Skills: ${safeSkillsString(resume.skills) || "Not provided"}

Experience:
${resume.experience?.map((e: any) =>
  `- ${e.position} at ${e.company} (${e.startDate} - ${e.current ? "Present" : e.endDate})\n  ${e.description}\n  Achievements: ${e.achievements?.join("; ") || "None"}`
).join("\n") || "Not provided"}

Education:
${resume.education?.map((e: any) => `- ${e.degree} in ${e.field} from ${e.institution}`).join("\n") || "Not provided"}

Projects:
${resume.projects?.map((p: any) => `- ${p.name}: ${p.description} (Tech: ${(p.technologies || []).join(', ')})`).join("\n") || "Not provided"}

Certifications:
${resume.certifications?.map((c: any) => `- ${c.name} from ${c.issuer}`).join("\n") || "Not provided"}`;

    const aiResponse = await callAIWithRetry({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.5,
      maxTokens: 8000,
      userId: user.id,
      timeout: 45_000,
    });

    const rawContent = aiResponse.content || '{}';
    const result = parseAIJSON(rawContent);
    if (!result) {
      console.error("Failed to parse AI response. Raw content:", rawContent.substring(0, 500));
      throw new Error("Career assessment returned invalid data. Please try again.");
    }

    const sanitized = {
      currentLevel: (result as any).currentLevel || "mid",
      yearsExperience: (result as any).yearsExperience || 0,
      primaryField: (result as any).primaryField || "General",
      strengthSummary: (result as any).strengthSummary || "",
      riskFactors: (result as any).riskFactors || [],
      careerMap: (result as any).careerMap || null,
      nextRoles: (result as any).nextRoles || [],
      skillGaps: (result as any).skillGaps || [],
      industryAlternatives: (result as any).industryAlternatives || [],
      actionPlan: (result as any).actionPlan || [],
    };

    await recordUsage(user.id, 'career_assess', { provider: aiResponse.providerUsed || 'unknown' });

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
