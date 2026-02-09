import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MAX_RESUME_SIZE = 100 * 1024;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { resume } = await req.json();

    if (!resume || typeof resume !== "object") {
      return new Response(
        JSON.stringify({ error: "Resume data is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resumeStr = JSON.stringify(resume);
    if (resumeStr.length > MAX_RESUME_SIZE) {
      return new Response(
        JSON.stringify({ error: "Resume data too large" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert career advisor and workforce analyst. Analyze the provided resume and generate comprehensive career progression insights.

Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:

{
  "currentLevel": "entry" | "mid" | "senior" | "lead" | "executive",
  "yearsExperience": <estimated number>,
  "primaryField": "<detected career field>",
  "nextRoles": [
    {
      "title": "<role title>",
      "matchScore": <0-100 how well their current experience matches>,
      "requiredSkills": ["<skill they need>"],
      "existingSkills": ["<skills they already have for this role>"],
      "timeToReady": "<realistic estimate like '6-12 months'>",
      "description": "<brief description of what this role involves>"
    }
  ],
  "skillGaps": [
    {
      "skill": "<missing skill>",
      "priority": "critical" | "important" | "nice-to-have",
      "forRoles": ["<which next roles need this>"],
      "suggestion": "<how to acquire this skill>"
    }
  ],
  "industryAlternatives": [
    {
      "industry": "<alternative industry>",
      "role": "<equivalent role in that industry>",
      "transferableSkills": ["<skills that transfer>"],
      "newSkillsNeeded": ["<new skills to learn>"],
      "salaryComparison": "higher" | "similar" | "lower"
    }
  ],
  "actionPlan": [
    {
      "step": <number 1-5>,
      "action": "<specific action to take>",
      "timeframe": "<when to do it>",
      "impact": "high" | "medium" | "low"
    }
  ]
}

Generate 4-5 next roles, 4-6 skill gaps, 3-4 industry alternatives, and a 5-step action plan.
Be realistic and specific. Don't suggest roles that are unrealistically above their current level.`;

    const userPrompt = `Analyze this resume and provide career path advice:

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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.6,
        max_tokens: 4000,
      }),
    });

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

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      throw new Error(`AI request failed: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

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
      throw new Error("Failed to parse career path analysis");
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
    console.error("career-path-advisor error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
