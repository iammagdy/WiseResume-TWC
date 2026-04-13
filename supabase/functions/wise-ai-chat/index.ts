/**
 * wise-ai-chat — AI Studio edge function
 *
 * Accepts either:
 *   - Typed API: `{ type, payload }` where `type` is one of the 7 AI Studio tool keys
 *     and `payload` contains tool-specific input fields. The function routes to a
 *     type-specific system prompt and returns `{ result: string }`.
 *   - Legacy message API: `{ messages, resumeContext }` for backward compatibility.
 *     Returns `{ result: string }` (also includes `content` alias for extractAIContent).
 *
 * Auth, rate-limiting, and AI-credit deduction follow the same pattern as
 * agentic-chat. Credit cost is 1 per call.
 *
 * Supported type values:
 *   cold_email, job_rejection, personal_branding, portfolio_bio,
 *   reference_letter, salary_negotiation, skills_gap
 *
 * Called by all 7 AI Studio tools:
 *   ColdEmailSheet, JobRejectionSheet, PersonalBrandingSheet, PortfolioBioSheet,
 *   ReferenceLetterSheet, SalaryNegotiationSheet, SkillsGapSheet
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { callAI, toUserError } from "../_shared/aiClient.ts";
import { checkRateLimit } from "../_shared/rateLimiter.ts";
import { checkUserRateLimit } from "../_shared/userRateLimiter.ts";
import { requireAuth } from "../_shared/authMiddleware.ts";
import { checkUserCreditBalance } from "../_shared/creditUtils.ts";
import { deductCredits } from "../_shared/deductCredits.ts";
import { getServiceClient } from "../_shared/dbClient.ts";
import { checkPayloadSize } from "../_shared/requestUtils.ts";

const MAX_PAYLOAD_BYTES = 200 * 1024;
const MAX_MESSAGES_BYTES = 50 * 1024;

type AIStudioType =
  | "cold_email"
  | "job_rejection"
  | "personal_branding"
  | "portfolio_bio"
  | "reference_letter"
  | "salary_negotiation"
  | "skills_gap";

const ALLOWED_TYPES = new Set<string>([
  "cold_email",
  "job_rejection",
  "personal_branding",
  "portfolio_bio",
  "reference_letter",
  "salary_negotiation",
  "skills_gap",
]);

interface TypedRequest {
  type: AIStudioType;
  payload: Record<string, unknown>;
}

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface LegacyRequest {
  messages: ChatMessage[];
  resumeContext?: unknown;
}

type WiseAIChatRequest = TypedRequest | LegacyRequest;

function isTypedRequest(body: WiseAIChatRequest): body is TypedRequest {
  return "type" in body && typeof (body as TypedRequest).type === "string";
}

function buildSystemPrompt(type: AIStudioType, payload: Record<string, unknown>): string {
  const resumeCtx = payload.resumeContext != null
    ? `\n\nCandidate Resume Context:\n${JSON.stringify(payload.resumeContext, null, 2).slice(0, 3000)}`
    : "";

  switch (type) {
    case "cold_email":
      return `You are an expert recruiter outreach writer. Write a short, personalized cold email to a recruiter at ${payload.company ?? "the company"} for the ${payload.jobTitle ?? "open"} role.

Candidate Name: ${payload.candidateName ?? "the candidate"}
Candidate Summary: ${payload.summary ?? "Experienced professional"}
Top Skills: ${payload.topSkills ?? ""}
Recent Experience: ${payload.recentExperience ?? ""}
${payload.jobSnippet ? `Job Description Snippet: ${payload.jobSnippet}` : ""}

Write a compelling cold email that:
- Is short (150-200 words max)
- Has a strong subject line
- Opens with a personalized hook referencing ${payload.company ?? "the company"}
- Highlights 2-3 relevant achievements/skills
- Has a clear, low-friction CTA
- Feels human and not template-like

Format:
Subject: [subject line]

[email body]${resumeCtx}`;

    case "job_rejection":
      return `You are a career coach specializing in turning job rejections into learning opportunities. Analyze this rejection and provide constructive feedback.

Rejection Details:
${payload.rejectionText ?? ""}

${payload.candidateName ? `Candidate Background: ${payload.candidateName}${payload.summary ? `, ${payload.summary}` : ""}` : ""}

Respond ONLY with valid JSON in this exact format:
{
  "likelyReason": "string - the most probable reason for rejection",
  "improvementAreas": ["string", "string", "string"],
  "nextSteps": ["string", "string", "string"],
  "encouragingReframe": "string - an encouraging honest reframe"
}${resumeCtx}`;

    case "personal_branding":
      return `You are a personal branding expert. Based on this resume, generate 3 one-sentence personal branding statements.

Name: ${payload.name ?? "Professional"}
Summary: ${payload.summary ?? ""}
Top Skills: ${payload.topSkills ?? ""}
Experience: ${payload.experience ?? ""}

Generate 3 variants:
1. Formal - polished and professional for corporate settings
2. Casual - friendly and approachable for networking
3. Bold - assertive and memorable, makes a strong impression

Respond ONLY with valid JSON:
{
  "formal": "string - one sentence, formal tone",
  "casual": "string - one sentence, casual tone",
  "bold": "string - one sentence, bold/punchy tone"
}${resumeCtx}`;

    case "portfolio_bio":
      return `You are a portfolio bio writer. Generate 3 bio variants for a portfolio "About" section based on this resume.

Name: ${payload.name ?? "Professional"}
Summary: ${payload.summary ?? ""}
Top Skills: ${payload.topSkills ?? ""}
Experience: ${payload.experience ?? ""}

Generate 3 bio variants optimized for a portfolio About section:
1. Short: 1 compelling sentence that captures who they are and what they do
2. Medium: 2-3 sentences expanding on their expertise and value
3. Full: A complete paragraph (4-5 sentences) covering background, expertise, passion, and what they bring

Respond ONLY with valid JSON:
{
  "short": "string - 1 sentence bio",
  "medium": "string - 2-3 sentence bio",
  "full": "string - full paragraph bio"
}${resumeCtx}`;

    case "reference_letter":
      return `You are an expert at writing professional reference letters. Generate a formal reference letter template.

Referee Name: ${payload.refereeName ?? ""}
Referee Role/Title: ${payload.refereeRole ?? ""}
Relationship to Candidate: ${payload.relationship ?? ""}
${payload.context ? `Additional Context: ${payload.context}` : ""}
Candidate Name: ${payload.candidateName ?? "the candidate"}
${payload.summary ? `Candidate Summary: ${payload.summary}` : ""}
${payload.experience ? `Candidate Experience: ${payload.experience}` : ""}

Write a complete, professional reference letter that:
1. Is from ${payload.refereeName ?? "the referee"}'s perspective as a ${payload.refereeRole ?? "professional"}
2. Addresses the hiring manager
3. Highlights the candidate's key strengths relevant to their experience
4. Includes specific examples where possible
5. Has a professional closing

Return ONLY the letter text, no JSON, no explanation. Start with "Dear Hiring Manager," and end with a proper signature block for ${payload.refereeName ?? "the referee"}.${resumeCtx}`;

    case "salary_negotiation":
      return `You are a salary negotiation expert. Generate a comprehensive negotiation script for the following situation:

Job Title: ${payload.jobTitle ?? ""}
Offered Salary: ${payload.currency ?? "USD"} ${payload.offeredSalary ?? ""}
Target Salary: ${payload.currency ?? "USD"} ${payload.targetSalary ?? ""}
${payload.candidateName ? `Candidate Background: ${payload.candidateName}${payload.summary ? `, ${payload.summary}` : ""}` : ""}

Respond ONLY with valid JSON in this exact format:
{
  "openingLine": "string - the first thing to say when negotiating",
  "justifications": ["string", "string", "string"],
  "counterOffer": "string - the specific counter-offer framing sentence",
  "emailTemplate": "string - a professional negotiation email template",
  "callScript": "string - a phone/video call talking script"
}${resumeCtx}`;

    case "skills_gap":
      return `You are a career skills gap analyzer. Compare the candidate's resume against the job description and identify matched and missing skills.

CANDIDATE RESUME SKILLS: ${payload.skills ?? "Not listed"}
CANDIDATE EXPERIENCE: ${payload.experience ?? ""}
CANDIDATE SUMMARY: ${payload.summary ?? ""}

JOB DESCRIPTION:
${payload.jobDescription ?? ""}

Analyze the gap and respond ONLY with valid JSON:
{
  "matchedSkills": ["skill1", "skill2"],
  "missingSkills": [
    { "skill": "skill name", "importance": "critical|high|medium|low" }
  ],
  "learningPlan": [
    { "week": "Week 1-2", "action": "actionable learning step" },
    { "week": "Week 3-4", "action": "actionable learning step" },
    { "week": "Week 5-6", "action": "actionable learning step" },
    { "week": "Week 7-8", "action": "actionable learning step" }
  ]
}${resumeCtx}`;

    default:
      return `You are Wise AI, an expert career assistant. Provide helpful, specific, and actionable career guidance.${resumeCtx}`;
  }
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const sizeError = checkPayloadSize(req, MAX_PAYLOAD_BYTES);
  if (sizeError) return sizeError;

  try {
    const { userId } = await requireAuth(req);

    const rateCheck = await checkRateLimit(userId, {
      maxRequests: 30,
      windowSeconds: 60,
      actionType: "wise_ai_chat",
    });
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: `Rate limit exceeded. Try again in ${rateCheck.retryAfterSeconds}s.`,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serverRateCheck = await checkUserRateLimit(userId, "wise_ai_chat", 30, 60);
    if (!serverRateCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: `Rate limit exceeded. Try again in ${serverRateCheck.retryAfterSeconds}s.`,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const creditCheck = await checkUserCreditBalance(userId);
    if (!creditCheck.hasCredits) {
      return new Response(
        JSON.stringify({
          error: "Insufficient AI credits. Add your own Gemini API key for unlimited access.",
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const isByok = creditCheck.remaining === 9999;

    const body = (await req.json()) as WiseAIChatRequest;

    let finalMessages: Array<{ role: string; content: string }>;

    if (isTypedRequest(body)) {
      // Typed API: { type, payload }
      const { type, payload } = body;

      if (!ALLOWED_TYPES.has(type)) {
        return new Response(
          JSON.stringify({
            error: `Unknown type "${type}". Must be one of: ${[...ALLOWED_TYPES].join(", ")}`,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const systemPrompt = buildSystemPrompt(type, payload ?? {});
      finalMessages = [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Please generate the ${type.replace(/_/g, " ")} content based on the information provided.`,
        },
      ];
    } else {
      // Legacy messages API: { messages, resumeContext }
      const { messages, resumeContext } = body as LegacyRequest;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return new Response(
          JSON.stringify({ error: "Either 'type'+'payload' or a 'messages' array is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (JSON.stringify(messages).length > MAX_MESSAGES_BYTES) {
        return new Response(
          JSON.stringify({ error: "Messages payload too large" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const resumeContextStr =
        resumeContext != null
          ? `\n\nCandidate Resume Context:\n${JSON.stringify(resumeContext, null, 2).slice(0, 3000)}`
          : "";

      const existingSystem = messages.find((m) => m.role === "system");
      const defaultSystemContent = `You are Wise AI, an expert career assistant. Provide helpful, specific, and actionable career guidance.`;
      const systemContent = existingSystem
        ? existingSystem.content + resumeContextStr
        : defaultSystemContent + resumeContextStr;

      finalMessages = [
        { role: "system", content: systemContent },
        ...messages.filter((m) => m.role !== "system"),
      ];
    }

    const aiResponse = await callAI({
      model: "google/gemini-3-flash-preview",
      messages: finalMessages as Array<{ role: "system" | "user" | "assistant"; content: string }>,
      temperature: 0.7,
      maxTokens: 1500,
      userId,
    });

    await deductCredits(userId, 1, isByok, getServiceClient());

    const resultText = aiResponse.content ?? "";

    return new Response(
      // Return both `result` (spec) and `content` (extractAIContent compat)
      JSON.stringify({ result: resultText, content: resultText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("wise-ai-chat error:", error);
    const { status, error: code, message } = toUserError(error);
    return new Response(JSON.stringify({ error: code, message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
