// Fill-gap handler — extracted from supabase/functions/fill-gap/index.ts
// for the Task #56 resume-section-ai router merge. Behaviour byte-for-byte
// identical to the pre-merge `fill-gap` function except:
//   - `serve(wrapHandler('fill-gap', …))` is replaced by the exported
//     `handleFillGap(req, userId, bodyText, corsHeaders)` function. The
//     router handles CORS preflight, body buffering, dispatch, and
//     `requireAuth` once at the top.
//   - `await req.json()` is replaced by `JSON.parse(bodyText)`.
// All prompts, validators, error envelopes, status codes, credit
// deduction and refund paths, rate-limit keys, tool/function-call schema,
// and response shapes are preserved verbatim.
import { callAI, toUserError, parseAIJSON } from "../_shared/aiClient.ts";
import { selectProviderForTool } from "../_shared/modelRouter.ts";
const __ROUTE = selectProviderForTool('fill-gap');
import { checkRateLimit, recordUsage } from "../_shared/rateLimiter.ts";
import { checkUserRateLimit } from "../_shared/userRateLimiter.ts";
import { checkPayloadSize } from "../_shared/requestUtils.ts";
import { checkAndDeductCredit, refundCredit } from "../_shared/creditUtils.ts";
import { logger } from "../_shared/logger.ts";
const log = logger('fill-gap');


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

export async function handleFillGap(
  req: Request,
  userId: string,
  bodyText: string,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const sizeError = checkPayloadSize(req, 500 * 1024);
  if (sizeError) return sizeError;

  try {
    const rateCheck = await checkRateLimit(userId, { maxRequests: 20, windowSeconds: 60, actionType: 'fill_gap' });
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Try again in ${rateCheck.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serverRateCheck = await checkUserRateLimit(userId, 'fill_gap', 20, 60);
    if (!serverRateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Try again in ${serverRateCheck.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { gap, category, userDescription, previousJob, nextJob }: FillGapRequest = JSON.parse(bodyText);

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


    const creditCheck = await checkAndDeductCredit(userId);
    if (!creditCheck.hasCredits) {
      return new Response(
        JSON.stringify({ error: 'Insufficient AI credits. Add your own Gemini API key for unlimited access.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    let aiResponse;
    try {
      aiResponse = await callAI({
        model: __ROUTE.model,
        wiseresumeSubProvider: __ROUTE.provider,
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
        userId,
      });
    } catch (aiErr) {
      await refundCredit(userId, creditCheck, 1);
      throw aiErr;
    }

    const toolCall = aiResponse.toolCalls?.[0];
    // deno-lint-ignore no-explicit-any
    let result: any = null;
    if (toolCall?.function?.arguments) {
      try { result = JSON.parse(toolCall.function.arguments); } catch { /* ignore */ }
    }
    if (!result && aiResponse.content) {
      result = parseAIJSON(aiResponse.content);
    }
    if (!result) {
      await refundCredit(userId, creditCheck, 1);
      return new Response(
        JSON.stringify({ error: "Invalid AI response format" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await recordUsage(userId, 'fill_gap', { provider: aiResponse.providerUsed || 'unknown' });


    return new Response(JSON.stringify({ ...result, _providerUsed: aiResponse.providerUsed || 'unknown' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    log.error("Unhandled error", error);
    const { status, error: code, message } = toUserError(error);
    return new Response(
      JSON.stringify({ error: code, message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}
