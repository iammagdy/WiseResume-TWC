import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { callAI, isAIError, toUserError } from "../_shared/aiClient.ts";
import { checkRateLimit, recordUsage } from "../_shared/rateLimiter.ts";
import { requireAuth, authErrorResponse } from "../_shared/authMiddleware.ts";

interface GapRequest {
  gap: { startDate: string; endDate: string; months: number };
  reason: string;
  previousJob?: { position: string; company: string };
  nextJob?: { position: string; company: string };
  additionalContext?: string;
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
    let userId: string;
    try {
      const auth = await requireAuth(req);
      userId = auth.userId;
    } catch (authErr) {
      return authErrorResponse(authErr, req.headers.get("origin"));
    }

    const rateCheck = await checkRateLimit(userId, { maxRequests: 20, windowSeconds: 60, actionType: 'explain_gap' });
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Try again in ${rateCheck.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { gap, reason, previousJob, nextJob, additionalContext }: GapRequest = await req.json();

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
      userId: userId,
    });

    const toolCall = aiResponse.toolCalls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(
        JSON.stringify({ error: "Invalid AI response format" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);

    await recordUsage(userId, 'explain_gap');

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("explain-gap error:", error);
    const { status, error: code, message } = toUserError(error);
    return new Response(
      JSON.stringify({ error: code, message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
