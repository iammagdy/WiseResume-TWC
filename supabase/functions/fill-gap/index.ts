import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

interface FillGapRequest {
  gap: {
    startDate: string;
    endDate: string;
    months: number;
  };
  category: string;
  userDescription: string;
  previousJob?: {
    position: string;
    company: string;
  };
  nextJob?: {
    position: string;
    company: string;
  };
  userGeminiKey?: string;
}

const categoryLabels: Record<string, string> = {
  military: "Military Service",
  freelance: "Freelance/Contract Work",
  education: "Education or Training",
  caregiving: "Caregiving Responsibilities",
  sabbatical: "Sabbatical / Travel",
  other: "Other",
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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

    const { gap, category, userDescription, previousJob, nextJob, userGeminiKey }: FillGapRequest = await req.json();

    if (!gap || !category) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: gap and category" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (userDescription && userDescription.length > 500) {
      return new Response(
        JSON.stringify({ error: "Description must be under 500 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const useGeminiDirect = !!userGeminiKey;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!useGeminiDirect && !LOVABLE_API_KEY) {
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

    const categoryLabel = categoryLabels[category] || category;
    const durationText = gap.months === 1 ? "1 month" : `${gap.months} months`;

    let contextText = `The employment gap is ${durationText} (from ${gap.startDate} to ${gap.endDate}).`;
    contextText += `\nCategory: ${categoryLabel}`;
    if (userDescription) {
      contextText += `\nUser's description: "${userDescription}"`;
    }
    if (previousJob) {
      contextText += `\nJob before gap: ${previousJob.position} at ${previousJob.company}`;
    }
    if (nextJob) {
      contextText += `\nJob after gap: ${nextJob.position} at ${nextJob.company}`;
    }

    const systemPrompt = `You are a professional resume writer helping users fill employment gaps with realistic experience entries.

Rules:
- Generate exactly 3 distinct, plausible professional title suggestions
- Each suggestion should fit naturally between the previous and next jobs in the career narrative
- If the user mentions a company name, use it directly
- For military service: use rank-appropriate titles (e.g., "Logistics Specialist, U.S. Army")
- For freelance/contract: frame as self-employment with client-facing achievements
- For education: create education-framed entries (e.g., "Graduate Research Assistant")
- For caregiving: create tasteful professional framing without over-sharing
- Achievements should include metrics where plausible
- Each suggestion should represent a different angle or seniority level`;

    const userPrompt = `Fill this employment gap with realistic experience entries.

${contextText}

Generate 3 distinct professional experience suggestions that would fit this gap period.`;

    console.log("fill-gap: Calling AI gateway...");

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
              name: "suggest_gap_fill",
              description: "Return 3 professional experience suggestions to fill an employment gap",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Professional job title" },
                        company: { type: "string", description: "Company or organization name" },
                        description: { type: "string", description: "2-3 sentence role description" },
                        achievements: {
                          type: "array",
                          items: { type: "string" },
                          description: "2-3 achievement bullet points with metrics",
                        },
                      },
                      required: ["title", "company", "description", "achievements"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["suggestions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_gap_fill" } },
      }),
    });

    if (!response.ok) {
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
        JSON.stringify({ error: "Failed to generate suggestions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", data);
      return new Response(
        JSON.stringify({ error: "Invalid AI response format" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);
    console.log("fill-gap: Generated", result.suggestions?.length, "suggestions");

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in fill-gap function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
