import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { callAI, isAIError } from "../_shared/aiClient.ts";

interface GapRequest {
  gap: { startDate: string; endDate: string; months: number };
  reason: string;
  previousJob?: { position: string; company: string };
  nextJob?: { position: string; company: string };
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

const MAX_CONTEXT_LENGTH = 2000;

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

    const { gap, reason, previousJob, nextJob, additionalContext, userGeminiKey }: GapRequest = await req.json();

    if (!gap || !reason) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: gap and reason" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (additionalContext && additionalContext.length > MAX_CONTEXT_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Additional context must be under ${MAX_CONTEXT_LENGTH} characters` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const reasonLabel = reasonLabels[reason] || reason;
    const durationText = gap.months === 1 ? "1 month" : `${gap.months} months`;

    let contextText = `The gap was ${durationText} (from ${gap.startDate} to ${gap.endDate}).`;
    if (previousJob) contextText += ` Before: ${previousJob.position} at ${previousJob.company}.`;
    if (nextJob) contextText += ` After: ${nextJob.position} at ${nextJob.company}.`;
    if (additionalContext) contextText += ` Additional context: ${additionalContext}`;

    const systemPrompt = `You are a professional career coach helping job seekers explain employment gaps. Your explanations should be honest but positive, concise (2-3 sentences), in first person, and frame the gap as a deliberate choice or valuable experience.`;

    const userPrompt = `Help me explain an employment gap.\n\n${contextText}\n\nReason: ${reasonLabel}\n\nGenerate a professional explanation and 2-3 tips for discussing this gap.`;

    const aiResponse = await callAI({
      model: 'google/gemini-2.5-flash',
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
                explanation: { type: "string", description: "A professional 2-3 sentence explanation in first person" },
                tips: { type: "array", items: { type: "string" }, description: "2-3 tips for discussing this gap" },
              },
              required: ["explanation", "tips"],
              additionalProperties: false,
            },
          },
        },
      ],
      toolChoice: { type: "function", function: { name: "provide_gap_explanation" } },
      userGeminiKey,
    });

    const toolCall = aiResponse.toolCalls?.[0];
    if (!toolCall?.function?.arguments) {
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
    console.error("explain-gap error:", error);
    const status = isAIError(error) ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
