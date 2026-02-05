import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { messages, resumeData, jobDescription, endInterview } = await req.json();
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

    const systemPrompt = endInterview
      ? `You are a professional interview coach. The mock interview has just ended. Based on the conversation, provide a brief performance summary in this exact format:

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
      : `You are a professional, friendly interviewer conducting a mock interview. Your role:

1. Ask ONE question at a time and wait for the answer
2. After each answer, give brief feedback (1 sentence max), then ask the next question
3. Mix behavioral ("Tell me about a time..."), technical, and situational questions
4. Adapt difficulty based on the candidate's responses
5. Keep your responses concise (under 80 words)
6. Be warm and professional, like a real interviewer
7. NEVER break character — you ARE the interviewer

${resumeContext}${jobContext}

${jobDescription ? "Focus questions on the job requirements and how the candidate's experience aligns." : "Focus questions on the candidate's resume experience and skills."}

Start with a brief introduction and your first question. Do NOT list multiple questions at once.`;

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
