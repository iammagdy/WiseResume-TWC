/**
 * wise-ai-chat — AI Studio edge function
 *
 * Accepts: `{ type, payload }` where `type` is one of the 7 AI Studio tool keys
 * and `payload` contains tool-specific input fields.
 *
 * Supported types:
 *   cold_email, job_rejection, personal_branding, portfolio_bio,
 *   reference_letter, salary_negotiation, skills_gap
 *
 * Returns: `{ content: string, providerUsed: string, fallbackUsed: boolean }`
 * The `content` field is consumed by `extractAIContent()` on the client.
 *
 * Called by all 7 AI Studio tool sheets.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { callWiseresumeAI, isAIError, sanitizeInputText } from "../_shared/aiClient.ts";
import { checkUserCreditBalance } from "../_shared/creditUtils.ts";
import { deductCredits } from "../_shared/deductCredits.ts";
import { checkRateLimit } from "../_shared/rateLimiter.ts";
import { checkUserRateLimit } from "../_shared/userRateLimiter.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkPayloadSize } from "../_shared/requestUtils.ts";
import { requireAuth } from "../_shared/authMiddleware.ts";

const MAX_PAYLOAD_BYTES = 200 * 1024;

type AIStudioType =
  | "cold_email"
  | "job_rejection"
  | "personal_branding"
  | "portfolio_bio"
  | "reference_letter"
  | "salary_negotiation"
  | "skills_gap";

const ALLOWED_TYPES = new Set<AIStudioType>([
  "cold_email",
  "job_rejection",
  "personal_branding",
  "portfolio_bio",
  "reference_letter",
  "salary_negotiation",
  "skills_gap",
]);

type Payload = Record<string, unknown>;

function s(v: unknown, max = 1000): string {
  return sanitizeInputText(String(v ?? ""), max);
}

function buildPrompt(type: AIStudioType, payload: Payload): string {
  switch (type) {
    case "personal_branding":
      return `You are a personal branding expert. Given this candidate's information, craft three distinct personal branding statements.

Name: ${s(payload.name, 100)}
Summary: ${s(payload.summary, 800)}
Top Skills: ${s(payload.topSkills, 400)}
Experience: ${s(payload.experience, 600)}

Return ONLY a JSON object with exactly these three keys:
{
  "formal": "<A polished, professional statement suitable for executive bios and LinkedIn>",
  "casual": "<A friendly, approachable statement suitable for networking events or portfolio About pages>",
  "bold": "<A confident, ambitious statement that highlights impact and unique value>"
}

Each statement must be 1-2 sentences (25-60 words). Do not include markdown, code blocks, or explanations — just the JSON.`;

    case "skills_gap":
      return `You are a career development expert. Analyze the gap between the candidate's current skills and the job requirements.

Candidate Skills: ${s(payload.skills, 800)}
Candidate Experience: ${s(payload.experience, 800)}
Candidate Summary: ${s(payload.summary, 400)}

Job Description:
${s(payload.jobDescription, 3000)}

Return ONLY a JSON object with exactly these keys:
{
  "matchedSkills": ["<skill>", ...],
  "missingSkills": [{"skill": "<skill>", "importance": "critical|high|medium|low"}, ...],
  "learningPlan": [{"week": "Week 1-2", "action": "<actionable step>"}, ...]
}

Rules:
- matchedSkills: skills the candidate already has that appear in the job (max 12)
- missingSkills: skills in the job the candidate lacks, each with an importance rating (max 10)
- learningPlan: 4 realistic 2-week chunks to close the most critical gaps
- Return no markdown, no code blocks — just the JSON.`;

    case "cold_email":
      return `You are a professional career coach writing cold outreach emails for job seekers.

Write a compelling cold email from ${s(payload.candidateName, 100)} to a recruiter at ${s(payload.company, 100)} for the role of ${s(payload.jobTitle, 100)}.

Candidate Summary: ${s(payload.summary, 600)}
Top Skills: ${s(payload.topSkills, 400)}
Recent Experience: ${s(payload.recentExperience, 400)}
${payload.jobSnippet ? `Job Description Snippet:\n${s(payload.jobSnippet, 800)}` : ""}

Return ONLY the email text (no subject line needed, no JSON, no markdown). The email should be:
- Professional yet warm
- 150-200 words
- Opens with a strong hook
- Mentions 1-2 specific relevant skills or achievements
- Has a clear call-to-action`;

    case "portfolio_bio":
      return `You are a professional bio writer. Create three portfolio bio variants for this person.

Name: ${s(payload.name, 100)}
Summary: ${s(payload.summary, 800)}
Top Skills: ${s(payload.topSkills, 400)}
Experience: ${s(payload.experience, 600)}

Return ONLY a JSON object with exactly these keys:
{
  "short": "<1 sentence (15-25 words) — ideal for taglines or Twitter/X bio>",
  "medium": "<2-3 sentences (40-70 words) — ideal for GitHub or portfolio header>",
  "full": "<4-5 sentences (80-120 words) — ideal for About page or LinkedIn summary>"
}

All bios should be written in third person and convey professional credibility. Return no markdown, no code blocks — just the JSON.`;

    case "salary_negotiation":
      return `You are a salary negotiation coach. Create a complete negotiation script for the following situation.

Candidate: ${s(payload.candidateName, 100)}
Job Title: ${s(payload.jobTitle, 100)}
Offered Salary: ${s(payload.offeredSalary, 50)} ${s(payload.currency, 10)}
Target Salary: ${s(payload.targetSalary, 50)} ${s(payload.currency, 10)}
Candidate Summary: ${s(payload.summary, 600)}

Return ONLY a JSON object with exactly these keys:
{
  "openingLine": "<A confident but respectful opening statement to kick off the negotiation>",
  "justifications": ["<specific justification 1>", "<specific justification 2>", "<specific justification 3>"],
  "counterOffer": "<A clear, professional counter-offer statement>",
  "emailTemplate": "<A complete email template to negotiate by email, 150-200 words>",
  "callScript": "<A concise phone/video call script, 100-150 words>"
}

Justifications should be concrete and tied to the candidate's skills/experience. Return no markdown, no code blocks — just the JSON.`;

    case "job_rejection":
      return `You are a compassionate career coach helping a job seeker analyze a rejection and plan next steps.

Rejection Email / Description:
${s(payload.rejectionText, 2000)}

Candidate Name: ${s(payload.candidateName, 100)}
Candidate Summary: ${s(payload.summary, 400)}

Return ONLY a JSON object with exactly these keys:
{
  "likelyReason": "<A thoughtful, non-judgmental analysis of why they may have been rejected (2-3 sentences)>",
  "improvementAreas": ["<actionable improvement area 1>", "<actionable improvement area 2>", "<actionable improvement area 3>"],
  "nextSteps": ["<concrete next step 1>", "<concrete next step 2>", "<concrete next step 3>", "<concrete next step 4>"],
  "encouragingReframe": "<An honest, encouraging perspective that helps them move forward (1-2 sentences)>"
}

Be empathetic and constructive. Return no markdown, no code blocks — just the JSON.`;

    case "reference_letter":
      return `You are a professional writing assistant drafting a reference letter.

Referee (the person writing the letter): ${s(payload.refereeName, 100)}, ${s(payload.refereeRole, 150)}
Candidate (the subject of the letter): ${s(payload.candidateName, 100)}
Relationship: ${s(payload.relationship, 200)}
${payload.context ? `Additional Context: ${s(payload.context, 600)}` : ""}
Candidate Summary: ${s(payload.summary, 500)}
Candidate Experience: ${s(payload.experience, 400)}

Write a complete, professional reference letter that:
- Is 250-350 words
- Opens with a formal salutation ("To Whom It May Concern," or "Dear Hiring Manager,")
- Includes 2-3 specific examples of the candidate's qualities or achievements
- Closes with a strong recommendation and contact offer
- Ends with "Sincerely,\\n${s(payload.refereeName, 100)}\\n${s(payload.refereeRole, 150)}"

Return ONLY the letter text with no JSON, no markdown, no code blocks.`;
  }
}

serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const sizeError = checkPayloadSize(req, MAX_PAYLOAD_BYTES);
  if (sizeError) return sizeError;

  let userId: string;
  let serviceClient: SupabaseClient;

  try {
    const auth = await requireAuth(req);
    userId = auth.userId;
    serviceClient = auth.client;
  } catch (err) {
    console.error("[wise-ai-chat] auth error:", err);
    return new Response(
      JSON.stringify({ error: "unauthorized", message: "Authentication required." }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json() as { type?: unknown; payload?: unknown };
    const type = body.type as string;
    const payload = (body.payload ?? {}) as Payload;

    if (!type || !ALLOWED_TYPES.has(type as AIStudioType)) {
      return new Response(
        JSON.stringify({
          error: "invalid_type",
          message: `Unknown request type "${type}". Valid: ${[...ALLOWED_TYPES].join(", ")}`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rateCheck = await checkRateLimit(userId, {
      maxRequests: 20,
      windowSeconds: 60,
      actionType: "wise_ai_chat",
    });
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: "rate_limit", message: `Rate limit exceeded. Try again in ${rateCheck.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serverRateCheck = await checkUserRateLimit(userId, "wise_ai_chat", 20, 60);
    if (!serverRateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: "rate_limit", message: `Rate limit exceeded. Try again in ${serverRateCheck.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const creditCheck = await checkUserCreditBalance(userId);
    const isByok = creditCheck.remaining === 9999;
    if (!creditCheck.hasCredits) {
      return new Response(
        JSON.stringify({
          error: "payment_required",
          message: "Daily AI credit limit reached. Upgrade your plan or try again tomorrow.",
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = buildPrompt(type as AIStudioType, payload);

    // Outer 90s timeout for the entire AI call chain (all model attempts combined).
    // Each individual model attempt has its own 15s timeout inside callWiseresumeAI.
    const outerCtrl = new AbortController();
    const outerTimeout = setTimeout(() => outerCtrl.abort(), 90_000);
    let aiResponse;
    try {
      aiResponse = await callWiseresumeAI(
        "auto",
        [{ role: "user", content: prompt }],
        0.7,
        1500,
        undefined,
        undefined,
        outerCtrl.signal,
      );
    } finally {
      clearTimeout(outerTimeout);
    }

    await deductCredits(userId, 1, isByok, serviceClient);

    return new Response(
      JSON.stringify({
        content: aiResponse.content ?? "",
        providerUsed: aiResponse.providerUsed ?? "wiseresume",
        fallbackUsed: aiResponse.fallbackUsed ?? false,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[wise-ai-chat] error:", error);

    if (isAIError(error)) {
      const errorMap: Record<string, { error: string; message: string; status: number }> = {
        rate_limit:       { error: "rate_limit",       message: "AI is busy right now. Please try again in a moment.", status: 429 },
        payment_required: { error: "payment_required", message: "AI credits exhausted. Please check your account.",    status: 402 },
        quota_exceeded:   { error: "quota_exceeded",   message: "Daily quota exceeded. Try again tomorrow.",            status: 429 },
        invalid_key:      { error: "invalid_key",      message: "AI service configuration error. Please contact support.", status: 500 },
      };
      const mapped = errorMap[error.type] ?? { error: error.type, message: error.message, status: error.status ?? 500 };
      return new Response(
        JSON.stringify({ error: mapped.error, message: mapped.message }),
        { status: mapped.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "ai_chat_failed", message: "Failed to generate content. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
