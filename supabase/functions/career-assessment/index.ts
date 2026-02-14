import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const MAX_BODY_SIZE = 150 * 1024;

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

    const body = await req.text();
    if (body.length > MAX_BODY_SIZE) {
      return new Response(
        JSON.stringify({ error: "Request too large" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { resume, quizAnswers, userGeminiKey } = JSON.parse(body);

    if (!resume || typeof resume !== "object") {
      return new Response(
        JSON.stringify({ error: "Resume data is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const useGeminiDirect = !!userGeminiKey;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!useGeminiDirect && !LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const apiUrl = useGeminiDirect
      ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
      : "https://ai.gateway.lovable.dev/v1/chat/completions";

    const apiKey = useGeminiDirect ? userGeminiKey : LOVABLE_API_KEY;
    const modelName = useGeminiDirect ? "gemini-2.5-flash-preview-05-20" : "google/gemini-2.5-flash";

    const quizContext = quizAnswers ? `
Career Quiz Responses:
- Role Satisfaction: ${quizAnswers.roleSatisfaction || 'N/A'}/5
- Career Goal: ${quizAnswers.careerGoal || 'N/A'}
- Skills to Develop: ${(quizAnswers.skillsToDevelop || []).join(', ') || 'N/A'}
- Work Preference: ${quizAnswers.workPreference || 'N/A'}
- Timeline for Next Move: ${quizAnswers.timeline || 'N/A'}
- Salary Priority: ${quizAnswers.salaryPriority || 'N/A'}
- Industry Interests: ${(quizAnswers.industryInterests || []).join(', ') || 'N/A'}
- Biggest Challenge: ${quizAnswers.biggestChallenge || 'N/A'}
- Learning Preference: ${quizAnswers.learningPreference || 'N/A'}
- Geographic Flexibility: ${quizAnswers.geographicFlexibility || 'N/A'}
` : '';

    const systemPrompt = `You are an expert career advisor. Analyze the resume and career quiz responses to generate a comprehensive career plan.

Return ONLY valid JSON (no markdown, no code blocks) with this structure:

{
  "currentLevel": "entry" | "mid" | "senior" | "lead" | "executive",
  "yearsExperience": <number>,
  "primaryField": "<career field>",
  "nextRoles": [
    {
      "title": "<role>",
      "matchScore": <0-100>,
      "requiredSkills": ["<skill>"],
      "existingSkills": ["<skill>"],
      "timeToReady": "<e.g. 6-12 months>",
      "description": "<brief description>"
    }
  ],
  "skillGaps": [
    {
      "skill": "<skill>",
      "priority": "critical" | "important" | "nice-to-have",
      "forRoles": ["<role>"],
      "suggestion": "<how to learn>"
    }
  ],
  "industryAlternatives": [
    {
      "industry": "<industry>",
      "role": "<role>",
      "transferableSkills": ["<skill>"],
      "newSkillsNeeded": ["<skill>"],
      "salaryComparison": "higher" | "similar" | "lower"
    }
  ],
  "actionPlan": [
    {
      "step": <1-5>,
      "action": "<specific action>",
      "timeframe": "<when>",
      "impact": "high" | "medium" | "low"
    }
  ]
}

Generate 4-5 next roles, 4-6 skill gaps, 3-4 industry alternatives, and a 5-step action plan.
${quizAnswers ? 'Prioritize the user\'s stated career goals and preferences from the quiz.' : ''}
Be realistic and specific.`;

    const userPrompt = `Analyze this resume and provide career path advice:
${quizContext}
Name: ${resume.contactInfo?.fullName || "Not provided"}
Summary: ${resume.summary || "Not provided"}
Skills: ${resume.skills?.join(", ") || "Not provided"}

Experience:
${resume.experience?.map((e: { position: string; company: string; startDate: string; endDate: string; current: boolean; description: string; achievements?: string[] }) =>
  `- ${e.position} at ${e.company} (${e.startDate} - ${e.current ? "Present" : e.endDate})\n  ${e.description}\n  Achievements: ${e.achievements?.join("; ") || "None listed"}`
).join("\n") || "Not provided"}

Education:
${resume.education?.map((e: { degree: string; field: string; institution: string }) =>
  `- ${e.degree} in ${e.field} from ${e.institution}`
).join("\n") || "Not provided"}`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.6,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      throw new Error(`AI request failed: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) throw new Error("No content in AI response");

    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch {
      console.error("Failed to parse:", content.slice(0, 500));
      throw new Error("Failed to parse career assessment");
    }

    result = {
      currentLevel: result.currentLevel || "mid",
      yearsExperience: result.yearsExperience || 0,
      primaryField: result.primaryField || "General",
      nextRoles: result.nextRoles || [],
      skillGaps: result.skillGaps || [],
      industryAlternatives: result.industryAlternatives || [],
      actionPlan: result.actionPlan || [],
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("career-assessment error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
