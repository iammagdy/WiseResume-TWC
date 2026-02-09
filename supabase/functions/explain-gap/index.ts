import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GapRequest {
  gap: {
    startDate: string;
    endDate: string;
    months: number;
  };
  reason: string;
  previousJob?: {
    position: string;
    company: string;
  };
  nextJob?: {
    position: string;
    company: string;
  };
  additionalContext?: string;
  userGeminiKey?: string;
}

const reasonLabels: Record<string, string> = {
  career_transition: "Career transition / exploring new paths",
  personal_development: "Personal development / skill building",
  family_caregiving: "Family or caregiving responsibilities",
  health_related: "Health-related leave",
  relocation: "Relocation",
  education_training: "Education or training",
  entrepreneurial: "Entrepreneurial venture",
  volunteer_sabbatical: "Volunteer work / sabbatical",
  other: "Other",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { gap, reason, previousJob, nextJob, additionalContext, userGeminiKey }: GapRequest = await req.json();

    if (!gap || !reason) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: gap and reason" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine which AI gateway to use
    const useGeminiDirect = !!userGeminiKey;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!useGeminiDirect && !LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiUrl = useGeminiDirect
      ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
      : "https://ai.gateway.lovable.dev/v1/chat/completions";

    const apiKey = useGeminiDirect ? userGeminiKey : LOVABLE_API_KEY;
    const modelName = useGeminiDirect ? "gemini-2.0-flash" : "google/gemini-3-flash-preview";

    console.log(`explain-gap: Using ${useGeminiDirect ? 'Gemini Direct' : 'Lovable Gateway'}`);

    const reasonLabel = reasonLabels[reason] || reason;
    const durationText = gap.months === 1 ? "1 month" : `${gap.months} months`;

    let contextText = `The gap was ${durationText} (from ${gap.startDate} to ${gap.endDate}).`;
    if (previousJob) {
      contextText += ` Before this gap, they worked as ${previousJob.position} at ${previousJob.company}.`;
    }
    if (nextJob) {
      contextText += ` After this gap, they worked as ${nextJob.position} at ${nextJob.company}.`;
    }
    if (additionalContext) {
      contextText += ` Additional context: ${additionalContext}`;
    }

    const systemPrompt = `You are a professional career coach helping job seekers explain employment gaps on their resumes. 
Your explanations should be:
- Honest but positive and professional
- Concise (2-3 sentences maximum)
- Focus on growth, learning, or intentional choices
- Written in first person (I, my, me)
- Ready to be added to a resume summary or used in an interview

Do NOT be apologetic or defensive. Frame the gap as a deliberate choice or valuable experience.`;

    const userPrompt = `Help me explain an employment gap on my resume.

${contextText}

The reason for the gap was: ${reasonLabel}

Generate a professional explanation I can use on my resume or in interviews. Also provide 2-3 brief tips for discussing this gap.`;

    console.log("Calling AI gateway for gap explanation...");

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
        tools: [
          {
            type: "function",
            function: {
              name: "provide_gap_explanation",
              description: "Provide a professional explanation for an employment gap",
              parameters: {
                type: "object",
                properties: {
                  explanation: {
                    type: "string",
                    description: "A professional 2-3 sentence explanation for the employment gap, written in first person",
                  },
                  tips: {
                    type: "array",
                    items: { type: "string" },
                    description: "2-3 brief tips for discussing this gap in interviews",
                  },
                },
                required: ["explanation", "tips"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "provide_gap_explanation" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return new Response(
          JSON.stringify({ error: "Invalid API key. Please check your AI settings." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 429) {
        const errorMsg = useGeminiDirect
          ? "Rate limit exceeded. Your Gemini key may have hit its quota."
          : "Rate limit exceeded. Please try again in a moment.";
        return new Response(
          JSON.stringify({ error: errorMsg }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to generate explanation" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("AI response received:", JSON.stringify(data, null, 2));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", data);
      return new Response(
        JSON.stringify({ error: "Invalid AI response format" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in explain-gap function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
