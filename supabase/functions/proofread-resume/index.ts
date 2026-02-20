import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { callAI, parseAIJSON, toUserError } from "../_shared/aiClient.ts";
import { checkRateLimit, recordUsage } from "../_shared/rateLimiter.ts";

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const cors = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...cors, "Content-Type": "application/json" } }
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
        { status: 401, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const rateCheck = await checkRateLimit(user.id, { maxRequests: 15, windowSeconds: 60, actionType: 'proofread' });
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Try again in ${rateCheck.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const { sections } = await req.json();

    if (!sections || !Array.isArray(sections) || sections.length === 0) {
      return new Response(JSON.stringify({ error: "No sections provided" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Build combined text for checking (max 50KB)
    const combinedText = sections
      .map((s: { id: string; name: string; text: string }) => `[${s.name}]\n${s.text}`)
      .join("\n\n");

    if (new TextEncoder().encode(combinedText).length > 50_000) {
      return new Response(JSON.stringify({ error: "Text too long (max 50KB)" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a professional resume proofreader. Analyze the following resume text for spelling, grammar, and style issues.

Rules:
- Be lenient with industry jargon, technical terms, company names, and proper nouns
- Consider the candidate's industry when evaluating terminology. Technical resumes may use standard abbreviations (e.g., "K8s", "CI/CD", "SaaS", "B2B") that are correct in context. Do not flag industry-standard acronyms.
- For resumes, prefer action verbs at the start of bullets
- Flag passive voice in achievement bullets as a "style" issue
- Score professional writing quality (action verbs, quantified achievements, professional tone)
- Each issue must reference its section by the [SectionName] header
- Return ONLY valid JSON, no markdown

Return this exact JSON structure:
{
  "issues": [
    {
      "id": "unique-id",
      "sectionId": "section-id-from-input",
      "sectionName": "Section Name",
      "type": "spelling" | "grammar" | "style",
      "original": "the problematic text",
      "suggestions": ["suggestion1", "suggestion2"],
      "explanation": "Brief explanation",
      "offset": 0,
      "length": 0
    }
  ],
  "score": {
    "overall": 85,
    "spelling": 95,
    "grammar": 90,
    "style": 70,
    "tone": "professional"
  }
}

If no issues found, return empty issues array with high scores.`;

    const sectionMeta = sections.map((s: { id: string; name: string }) => ({
      id: s.id,
      name: s.name,
    }));

    const userPrompt = `Section metadata: ${JSON.stringify(sectionMeta)}

Resume text to proofread:
${combinedText}`;

    const response = await callAI({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      userId: user.id,
    });

    const parsed = parseAIJSON<{
      issues: Array<{
        id: string;
        sectionId: string;
        sectionName: string;
        type: string;
        original: string;
        suggestions: string[];
        explanation: string;
        offset: number;
        length: number;
      }>;
      score: {
        overall: number;
        spelling: number;
        grammar: number;
        style: number;
        tone: string;
      };
    }>(response.content || "{}");

    if (!parsed) {
      console.error("Failed to parse proofread AI response");
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response. Please try again." }),
        { status: 502, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // Validate and sanitize
    const issues = (parsed.issues || []).map((issue, i) => ({
      id: issue.id || `issue-${i}`,
      sectionId: issue.sectionId || "",
      sectionName: issue.sectionName || "",
      type: ["spelling", "grammar", "style"].includes(issue.type) ? issue.type : "grammar",
      original: issue.original || "",
      suggestions: Array.isArray(issue.suggestions) ? issue.suggestions.slice(0, 3) : [],
      explanation: issue.explanation || "",
      offset: typeof issue.offset === "number" ? issue.offset : 0,
      length: typeof issue.length === "number" ? issue.length : 0,
    }));

    const score = {
      overall: Math.min(100, Math.max(0, parsed.score?.overall ?? 0)),
      spelling: Math.min(100, Math.max(0, parsed.score?.spelling ?? 0)),
      grammar: Math.min(100, Math.max(0, parsed.score?.grammar ?? 0)),
      style: Math.min(100, Math.max(0, parsed.score?.style ?? 0)),
      tone: ["professional", "casual", "mixed"].includes(parsed.score?.tone || "")
        ? parsed.score!.tone
        : "professional",
    };

    await recordUsage(user.id, 'proofread');

    return new Response(JSON.stringify({ issues, score }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("proofread-resume error:", error);
    const userError = toUserError(error);
    return new Response(JSON.stringify({ error: userError.message }), {
      status: userError.status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
