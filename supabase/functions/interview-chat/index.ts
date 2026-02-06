import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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
    const { data: claimsData, error: authError } = await supabaseClient.auth.getClaims(token);
    if (authError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log('Authenticated user:', userId);

    const { messages, resumeData, jobDescription, endInterview, analyzeRole } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const resumeContext = resumeData
      ? `
CANDIDATE RESUME:
Name: ${resumeData.contactInfo?.fullName || "Unknown"}
Summary: ${resumeData.summary || "N/A"}
Skills: ${(resumeData.skills || []).join(", ")}
Experience: ${(resumeData.experience || [])
          .map(
            (e: any) =>
              `${e.position} at ${e.company} (${e.startDate}-${e.endDate || "Present"}): ${e.description}. Achievements: ${(e.achievements || []).join("; ")}`
          )
          .join("\n")}
Education: ${(resumeData.education || [])
          .map((e: any) => `${e.degree} in ${e.field} from ${e.institution}`)
          .join(", ")}
`
      : "";

    const jobContext = jobDescription
      ? `\nTARGET JOB DESCRIPTION:\n${jobDescription}\n`
      : "";

    // Role analysis mode — return structured analysis before interview starts
    if (analyzeRole && jobDescription) {
      const analyzePrompt = `You are Wise AI, the intelligent interview coach. Analyze the following job description and candidate resume to prepare for a mock interview.

${resumeContext}${jobContext}

Return your analysis as a JSON object with this exact structure (no markdown, just valid JSON):
{
  "title": "the job title from the description",
  "keySkills": ["skill1", "skill2", "skill3", "skill4", "skill5"],
  "questionCategories": ["category1", "category2", "category3", "category4"],
  "industryInsights": "A 2-3 sentence insight about what companies hiring for this role typically look for, current market trends, and what will make a candidate stand out."
}

Focus on:
- The most critical skills being tested
- Categories should be like: Technical, Behavioral, Situational, Culture Fit, System Design, Leadership, etc. — pick 3-4 most relevant
- Industry insights should reference real trends and expectations for this role`;

      const response = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [{ role: "user", content: analyzePrompt }],
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        return new Response(
          JSON.stringify({ error: "AI service error" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || "";
      
      // Parse the JSON from the reply
      try {
        // Strip any markdown code fences if present
        const jsonStr = reply.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim();
        const roleAnalysis = JSON.parse(jsonStr);
        return new Response(JSON.stringify({ reply: "Role analyzed", roleAnalysis }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        return new Response(JSON.stringify({ 
          reply: "Role analyzed",
          roleAnalysis: {
            title: "Position",
            keySkills: ["Communication", "Problem Solving", "Teamwork"],
            questionCategories: ["Behavioral", "Technical", "Situational"],
            industryInsights: "Interviewers will focus on your practical experience and problem-solving approach."
          }
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const systemPrompt = endInterview
      ? `You are Wise AI, the intelligent interview coach powered by WiseResume. The mock interview has just ended. Based on the conversation, provide a brief performance summary in this exact format:

**Overall Assessment:** [1-2 sentences]

**Strengths:**
- [strength 1]
- [strength 2]
- [strength 3]

**Areas to Improve:**
- [area 1]
- [area 2]

**Score: [X]/10**

**Tip:** [One actionable tip for their next interview]

Be encouraging but honest.`
      : `You are Wise AI, the intelligent interview coach powered by WiseResume — part of the WiseUniverse. You speak naturally and warmly, like a real human interviewer having a conversation. Your role:

1. Ask ONE question at a time and wait for the answer
2. After each answer, give brief, constructive feedback (1-2 sentences), then ask the next question
3. Mix behavioral ("Tell me about a time..."), technical, and situational questions
4. Adapt difficulty based on the candidate's responses
5. Keep your spoken responses concise (under 80 words for the conversational part)
6. Be warm, encouraging, and professional — like a supportive interviewer who genuinely wants the candidate to succeed
7. Use natural language — say things like "Great point!", "I appreciate that perspective", "That's an interesting approach"
8. NEVER break character — you ARE the interviewer
9. Always refer to yourself as "Wise AI" when introducing yourself
10. After the candidate answers (not the first message), ALWAYS include a scoring block at the very end of your response in this exact format:

---SCORE---
{"score": [1-10], "tip": "[specific actionable tip to improve this answer]", "improved_answer": "[a stronger version of their answer using STAR method or better structure, max 2-3 sentences]"}
---END_SCORE---

The score block must be valid JSON. Score fairly: 1-3 = weak, 4-5 = needs work, 6-7 = good, 8-9 = excellent, 10 = outstanding.

${resumeContext}${jobContext}

${jobDescription ? `IMPORTANT: You have analyzed the job description thoroughly. Ask questions that real interviewers for this specific role would ask. Reference industry-specific scenarios, technical challenges, and evaluate answers against what hiring managers in this field actually look for. Focus on the key requirements mentioned in the job description.` : "Focus questions on the candidate's resume experience and skills."}

Start with a warm introduction as Wise AI and your first question. Do NOT list multiple questions at once. Do NOT include a score block in your very first message (since the candidate hasn't answered yet).`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{ role: "system", content: systemPrompt }, ...messages],
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please top up your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "I couldn't generate a response. Let's try again.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("interview-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
