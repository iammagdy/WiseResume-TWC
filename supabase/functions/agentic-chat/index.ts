import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { callAI, isAIError, parseAIJSON, toUserError } from "../_shared/aiClient.ts";
import { checkRateLimit, recordUsage } from "../_shared/rateLimiter.ts";

const MAX_MESSAGE_SIZE = 10 * 1024;
const MAX_HISTORY_SIZE = 200 * 1024;

interface ChatMessage {
  role: "user" | "assistant" | "function";
  content: string;
  name?: string;
}

interface ChatRequest {
  message: string;
  conversationHistory: ChatMessage[];
  currentResume: unknown;
  functionResponse?: {
    name: string;
    result: Record<string, unknown>;
  };
}

interface FunctionCallResult {
  type: "function_call";
  functionName: string;
  args: Record<string, unknown>;
  message: string;
}

interface SuggestionResult {
  type: "suggestion";
  proposals: Array<{
    section: string;
    original: string;
    suggested: string;
    explanation: string;
    itemId?: string;
  }>;
  message: string;
}

interface TextResult {
  type: "text";
  content: string;
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "update_summary",
      description: "Updates the resume professional summary. Use when the user asks to change, write, or improve their summary.",
      parameters: {
        type: "object",
        properties: {
          newSummary: { type: "string", description: "The new professional summary text" },
        },
        required: ["newSummary"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_experience",
      description: "Adds a new work experience entry to the resume.",
      parameters: {
        type: "object",
        properties: {
          company: { type: "string" },
          position: { type: "string" },
          startDate: { type: "string", description: "Start date in YYYY-MM format" },
          endDate: { type: "string", description: "End date in YYYY-MM format or empty for current" },
          current: { type: "boolean" },
          description: { type: "string" },
          achievements: { type: "array", items: { type: "string" } },
        },
        required: ["company", "position", "startDate"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_experience",
      description: "Updates an existing work experience entry by company name or position. Use when user wants to modify an existing job.",
      parameters: {
        type: "object",
        properties: {
          identifier: { type: "string", description: "Company name or position to find and update" },
          updates: {
            type: "object",
            properties: {
              description: { type: "string" },
              achievements: { type: "array", items: { type: "string" } },
              position: { type: "string" },
              startDate: { type: "string" },
              endDate: { type: "string" },
              current: { type: "boolean" },
            },
          },
        },
        required: ["identifier", "updates"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_skills",
      description: "Replaces the entire skills list with the provided skills array.",
      parameters: {
        type: "object",
        properties: {
          skills: { type: "array", items: { type: "string" }, description: "Complete list of skills" },
        },
        required: ["skills"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_skills",
      description: "Adds new skills to the existing skills list without removing any.",
      parameters: {
        type: "object",
        properties: {
          skills: { type: "array", items: { type: "string" }, description: "Skills to add" },
        },
        required: ["skills"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_contact",
      description: "Updates one or more contact info fields.",
      parameters: {
        type: "object",
        properties: {
          fullName: { type: "string" },
          email: { type: "string" },
          phone: { type: "string" },
          location: { type: "string" },
          linkedin: { type: "string" },
          portfolio: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "suggest_edits",
      description: "For subjective or risky changes, propose edits for user approval instead of directly applying. Use when the request is vague (e.g., 'make it better', 'more leadership-focused') or when multiple sections would change.",
      parameters: {
        type: "object",
        properties: {
          proposals: {
            type: "array",
            items: {
              type: "object",
              properties: {
                section: { type: "string", description: "summary, experience, skills, or education" },
                itemId: { type: "string", description: "For experience/education: company name or school to identify the item" },
                original: { type: "string", description: "Current text being replaced" },
                suggested: { type: "string", description: "Proposed new text" },
                explanation: { type: "string", description: "Why this change improves the resume (1 sentence)" },
              },
              required: ["section", "original", "suggested", "explanation"],
            },
          },
        },
        required: ["proposals"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "proofread_and_fix",
      description: "Scans the resume for spelling, grammar, and clarity issues. Returns structured fixes that can be auto-applied or shown for review.",
      parameters: {
        type: "object",
        properties: {
          fixes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                section: { type: "string", description: "summary, experience, education, or skills" },
                itemId: { type: "string", description: "For array items: company name or school name" },
                original: { type: "string", description: "Text with the error" },
                corrected: { type: "string", description: "Fixed text" },
                reason: { type: "string", description: "Grammar, Spelling, Clarity, or Punctuation" },
              },
              required: ["section", "original", "corrected", "reason"],
            },
          },
          autoApply: { type: "boolean", description: "If true, apply all fixes automatically. If false, show for user review." },
        },
        required: ["fixes"],
      },
    },
  },
];

const SYSTEM_PROMPT = `You are Wise AI, an expert resume assistant integrated into the WiseResume editor. You help users improve their resumes through natural conversation.

You have access to tools that can DIRECTLY modify the user's resume. When the user asks you to make changes, USE the tools - don't just describe what to do.

## Personality
- Friendly, encouraging, but honest
- Give specific, actionable advice
- When the user asks you to DO something (add, change, write), use the appropriate tool
- When the user asks for ADVICE (should I, what do you think), provide guidance first

## Resume Context
The user's current resume data is provided. Reference it when giving advice.

## Tool Usage Rules
1. **update_summary**: When user wants to change/write/improve their summary
2. **add_experience**: When user wants to add a NEW job or project
3. **update_experience**: When user wants to MODIFY an EXISTING job (e.g., "update my Google job", "change my current role description")
4. **update_skills**: When user wants to completely replace their skills
5. **add_skills**: When user wants to add specific new skills
6. **update_contact**: When user wants to change contact information
7. **suggest_edits**: For SUBJECTIVE changes like "make it more leadership-focused", "improve it", "make it better". Show proposals instead of auto-applying.
8. **proofread_and_fix**: When user asks to check for errors, typos, grammar, or spelling. Return structured fixes.

## Critical Rules
- For vague requests like "improve my resume" or "make it more X", use suggest_edits to propose changes for approval
- For specific requests like "change my title to X" or "add React to my skills", apply directly
- When proofreading, set autoApply: false to let the user review fixes
- Always explain what you did after making a change (2-4 sentences max)
- Use **bold** and *italics* for emphasis in your responses`;

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
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

    const rateCheck = await checkRateLimit(user.id, { maxRequests: 30, windowSeconds: 60, actionType: 'chat' });
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Try again in ${rateCheck.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { message, conversationHistory, currentResume, functionResponse } = (await req.json()) as ChatRequest;

    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (message.length > MAX_MESSAGE_SIZE) {
      return new Response(
        JSON.stringify({ error: "Message too long" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (JSON.stringify(conversationHistory || []).length > MAX_HISTORY_SIZE) {
      return new Response(
        JSON.stringify({ error: "Conversation history too large" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resumeContext = currentResume
      ? `\n\nCurrent Resume:\n${JSON.stringify(currentResume, null, 2).slice(0, 4000)}`
      : "\n\nNo resume loaded yet.";

    // Build messages array
    const messages: any[] = [
      { role: "system", content: SYSTEM_PROMPT + resumeContext },
      ...(conversationHistory || []).slice(-10).map(m => ({
        role: m.role,
        content: m.content,
        ...(m.name ? { name: m.name } : {}),
      })),
      { role: "user", content: message },
    ];

    if (functionResponse) {
      messages.push({
        role: "function",
        name: functionResponse.name,
        content: JSON.stringify(functionResponse.result),
      });
    }

    // Call AI with tools
    const aiResponse = await callAI({
      model: 'google/gemini-2.5-flash',
      messages,
      tools: TOOLS as any[],
      temperature: 0.7,
      maxTokens: 2000,
      userId: user.id,
    });

    const toolCall = aiResponse.toolCalls?.[0];
    const content = aiResponse.content;

    if (toolCall) {
      const functionName = toolCall.function.name;
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch {
        args = {};
      }

      // Handle suggest_edits
      if (functionName === "suggest_edits") {
        const result: SuggestionResult = {
          type: "suggestion",
          proposals: (args.proposals as SuggestionResult["proposals"]) || [],
          message: content || "I have some suggestions for your resume. Please review and accept or reject each change.",
        };
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Handle proofread_and_fix
      if (functionName === "proofread_and_fix" && args.autoApply === false) {
        const fixes = (args.fixes as Array<{ section: string; itemId?: string; original: string; corrected: string; reason: string }>) || [];
        const proposals = fixes.map(fix => ({
          section: fix.section,
          itemId: fix.itemId,
          original: fix.original,
          suggested: fix.corrected,
          explanation: `${fix.reason}: ${fix.original} → ${fix.corrected}`,
        }));
        const result: SuggestionResult = {
          type: "suggestion",
          proposals,
          message: content || `I found ${fixes.length} issue(s) to fix. Please review each correction.`,
        };
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result: FunctionCallResult = {
        type: "function_call",
        functionName,
        args,
        message: content || `I'll ${functionName.replace(/_/g, " ")} for you.`,
      };

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await recordUsage(user.id, 'chat', { provider: aiResponse.providerUsed || 'unknown' });

    const result: TextResult = {
      type: "text",
      content: content || "I'm not sure how to help with that. Could you rephrase?",
    };

    return new Response(JSON.stringify({ ...result, _providerUsed: aiResponse.providerUsed || 'unknown' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("agentic-chat error:", error);
    const { status, error: code, message } = toUserError(error);
    return new Response(
      JSON.stringify({ error: code, message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
