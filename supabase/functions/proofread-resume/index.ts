import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { callAI, parseAIJSON } from "../_shared/aiClient.ts";

serve(async (req) => {
  const origin = req.headers.get("origin");
  const cors = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  try {
    const { sections, userGeminiKey } = await req.json();

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
      userGeminiKey,
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
      return new Response(
        JSON.stringify({ issues: [], score: { overall: 80, spelling: 90, grammar: 85, style: 75, tone: "professional" } }),
        { headers: { ...cors, "Content-Type": "application/json" } }
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
      overall: Math.min(100, Math.max(0, parsed.score?.overall ?? 80)),
      spelling: Math.min(100, Math.max(0, parsed.score?.spelling ?? 90)),
      grammar: Math.min(100, Math.max(0, parsed.score?.grammar ?? 85)),
      style: Math.min(100, Math.max(0, parsed.score?.style ?? 75)),
      tone: ["professional", "casual", "mixed"].includes(parsed.score?.tone || "")
        ? parsed.score!.tone
        : "professional",
    };

    return new Response(JSON.stringify({ issues, score }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("proofread-resume error:", error);
    const status = (error as any)?.status || 500;
    const message = error instanceof Error ? error.message : "Proofread failed";
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
