import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { callAI, isAIError, toUserError } from "../_shared/aiClient.ts";
import { checkRateLimit, recordUsage } from "../_shared/rateLimiter.ts";
import { requireAuth, authErrorResponse } from "../_shared/authMiddleware.ts";

interface FillGapRequest {
  gap: { startDate: string; endDate: string; months: number };
  category: string;
  userDescription: string;
  previousJob?: { position: string; company: string };
  nextJob?: { position: string; company: string };
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
    const { userId, client } = await requireAuth(req);

    const rateCheck = await checkRateLimit(userId, { maxRequests: 20, windowSeconds: 60, actionType: 'fill_gap' });
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Try again in ${rateCheck.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { gap, category, userDescription, previousJob, nextJob }: FillGapRequest = await req.json();

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

    const categoryLabel = categoryLabels[category] || category;
    const durationText = gap.months === 1 ? "1 month" : `${gap.months} months`;

    let contextText = `The employment gap is ${durationText} (from ${gap.startDate} to ${gap.endDate}).`;
    contextText += `\nCategory: ${categoryLabel}`;
    if (userDescription) contextText += `\nUser's description: "${userDescription}"`;
    if (previousJob) contextText += `\nJob before gap: ${previousJob.position} at ${previousJob.company}`;
    if (nextJob) contextText += `\nJob after gap: ${nextJob.position} at ${nextJob.company}`;

    const systemPrompt = `You are a professional resume writer helping users fill employment gaps with realistic experience entries. Generate exactly 3 distinct, plausible professional title suggestions. Each should fit naturally between the previous and next jobs.

FACTUAL CONSTRAINTS:
- All suggested titles and companies must be generic/descriptive (e.g., "Freelance Web Developer", "Self-Employed Consultant", "Independent Contractor"), not invented real-company names.
- Achievements must be plausible templates the user can customize with their own metrics, not fabricated statistics.
- Do not invent specific revenue figures, client counts, or company names the user didn't provide.`;

    const userPrompt = `Fill this employment gap with realistic experience entries.\n\n${contextText}\n\nGenerate 3 distinct professional experience suggestions.`;

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
                      title: { type: "string" },
                      company: { type: "string" },
                      description: { type: "string" },
                      achievements: { type: "array", items: { type: "string" } },
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
      toolChoice: { type: "function", function: { name: "suggest_gap_fill" } },
      userId: user.id,
    });

    const toolCall = aiResponse.toolCalls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(
        JSON.stringify({ error: "Invalid AI response format" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);

    await recordUsage(user.id, 'fill_gap', { provider: aiResponse.providerUsed || 'unknown' });

    return new Response(JSON.stringify({ ...result, _providerUsed: aiResponse.providerUsed || 'unknown' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("fill-gap error:", error);
    const { status, error: code, message } = toUserError(error);
    return new Response(
      JSON.stringify({ error: code, message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
