// Explain-gap handler — extracted from supabase/functions/explain-gap/index.ts
// for the Task #56 resume-section-ai router merge. Behaviour byte-for-byte
// identical to the pre-merge `explain-gap` function except:
//   - `serve(wrapHandler('explain-gap', …))` is replaced by the exported
//     `handleExplainGap(req, userId, bodyText, corsHeaders)` function. The
//     router handles CORS preflight, body buffering, dispatch, and
//     `requireAuth` once at the top.
//   - `await req.json()` is replaced by `JSON.parse(bodyText)`.
// All prompts, validators, error envelopes, status codes, credit
// deduction and refund paths, rate-limit keys, tool/function-call schema,
// and response shapes are preserved verbatim.
import { callAI, toUserError, parseAIJSON } from "../_shared/aiClient.ts";
import { selectProviderForTool } from "../_shared/modelRouter.ts";
const __ROUTE = selectProviderForTool('explain-gap');
import { checkRateLimit, recordUsage } from "../_shared/rateLimiter.ts";
import { checkUserRateLimit } from "../_shared/userRateLimiter.ts";
import { checkAndDeductCredit, refundCredit } from "../_shared/creditUtils.ts";
import { checkPayloadSize } from "../_shared/requestUtils.ts";
import { logger } from "../_shared/logger.ts";
const log = logger('explain-gap');


interface GapRequest {
  gap: { startDate: string; endDate: string; months: number };
  reason: string;
  previousJob?: { position: string; company: string };
  nextJob?: { position: string; company: string };
  additionalContext?: string;
  targetRole?: string;
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

export async function handleExplainGap(
  req: Request,
  userId: string,
  bodyText: string,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const sizeError = checkPayloadSize(req, 500 * 1024);
  if (sizeError) return sizeError;

  try {
    const rateCheck = await checkRateLimit(userId, { maxRequests: 20, windowSeconds: 60, actionType: 'explain_gap' });
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Try again in ${rateCheck.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serverRateCheck = await checkUserRateLimit(userId, 'explain_gap', 20, 60);
    if (!serverRateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Try again in ${serverRateCheck.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { gap, reason, previousJob, nextJob, additionalContext, targetRole }: GapRequest = JSON.parse(bodyText);

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

    const sanitizedTargetRole = targetRole ? targetRole.substring(0, 200) : null;
    const roleContext = sanitizedTargetRole ? `\nTarget Role: ${sanitizedTargetRole}` : "";
    const userPrompt = `Help me explain an employment gap.\n\n${contextText}${roleContext}\n\nReason: ${reasonLabel}\n\nGenerate a professional explanation and 2-3 tips for discussing this gap${sanitizedTargetRole ? ` in the context of applying for a ${sanitizedTargetRole} position` : ""}.`;


    const creditCheck = await checkAndDeductCredit(userId);
    if (!creditCheck.hasCredits) {
      return new Response(
        JSON.stringify({ error: 'Insufficient AI credits. Add your own Gemini API key for unlimited access.' }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    await recordUsage(userId, 'explain_gap', { provider: aiResponse.providerUsed || 'unknown' });


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
