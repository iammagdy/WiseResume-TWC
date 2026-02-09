import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MAX_MESSAGE_SIZE = 10 * 1024;
const MAX_HISTORY_SIZE = 200 * 1024;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  message: string;
  conversationHistory: ChatMessage[];
  currentResume: unknown;
  userGeminiKey?: string;
}

interface FunctionCallResult {
  type: "function_call";
  functionName: string;
  args: Record<string, unknown>;
  message: string;
}

interface TextResult {
  type: "text";
  content: string;
}

type ChatResponse = FunctionCallResult | TextResult;

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
      name: "proofread",
      description: "Proofreads the entire resume and returns corrections. Use when user asks to check for errors.",
      parameters: {
        type: "object",
        properties: {
          fixes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                section: { type: "string" },
                original: { type: "string" },
                corrected: { type: "string" },
                reason: { type: "string" },
              },
              required: ["section", "original", "corrected", "reason"],
            },
          },
        },
        required: ["fixes"],
      },
    },
  },
];

const SYSTEM_PROMPT = `You are MegZone AI, an expert resume copilot integrated into the WiseResume editor. You help users improve their resumes through natural conversation.

You have access to tools that can DIRECTLY modify the user's resume. When the user asks you to make changes, USE the tools - don't just describe what to do.

## Personality
- Friendly, encouraging, but honest
- Give specific, actionable advice
- When the user asks you to DO something (add, change, write), use the appropriate tool
- When the user asks for ADVICE (should I, what do you think), provide guidance first

## Resume Context
The user's current resume data is provided. Reference it when giving advice.

## Tool Usage Rules
1. update_summary: When user wants to change/write/improve their summary
2. add_experience: When user wants to add a new job or project
3. update_skills: When user wants to completely replace their skills
4. add_skills: When user wants to add specific new skills
5. update_contact: When user wants to change contact information
6. proofread: When user asks to check for errors, typos, or grammar

Always explain what you did after making a change. Keep responses concise (2-4 sentences max for tool responses).`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { message, conversationHistory, currentResume, userGeminiKey } = (await req.json()) as ChatRequest;

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

    const historyStr = JSON.stringify(conversationHistory || []);
    if (historyStr.length > MAX_HISTORY_SIZE) {
      return new Response(
        JSON.stringify({ error: "Conversation history too large" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine which AI gateway to use
    const useGeminiDirect = !!userGeminiKey;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!useGeminiDirect && !LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const apiUrl = useGeminiDirect
      ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
      : "https://ai.gateway.lovable.dev/v1/chat/completions";

    const apiKey = useGeminiDirect ? userGeminiKey : LOVABLE_API_KEY;
    const modelName = useGeminiDirect ? "gemini-2.5-flash-preview-05-20" : "google/gemini-2.5-flash";

    console.log(`agentic-chat: Using ${useGeminiDirect ? 'Gemini Direct' : 'Lovable Gateway'}`);

    const resumeContext = currentResume
      ? `\n\nCurrent Resume:\n${JSON.stringify(currentResume, null, 2).slice(0, 4000)}`
      : "\n\nNo resume loaded yet.";

    const messages = [
      { role: "system", content: SYSTEM_PROMPT + resumeContext },
      ...(conversationHistory || []).slice(-10),
      { role: "user", content: message },
    ];

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelName,
        messages,
        tools: TOOLS,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return new Response(
          JSON.stringify({ error: "Invalid API key. Please check your AI settings." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 429) {
        const errorMsg = useGeminiDirect
          ? "Rate limit exceeded. Your Gemini key may have hit its quota."
          : "Rate limit exceeded. Please wait a moment.";
        return new Response(
          JSON.stringify({ error: errorMsg }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      throw new Error(`AI request failed: ${response.status}`);
    }

    const aiResponse = await response.json();
    const choice = aiResponse.choices?.[0];

    if (!choice) {
      throw new Error("No response from AI");
    }

    const assistantMessage = choice.message;

    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      const toolCall = assistantMessage.tool_calls[0];
      let args: Record<string, unknown> = {};
      try {
        args = typeof toolCall.function.arguments === "string"
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments;
      } catch {
        args = {};
      }

      const result: FunctionCallResult = {
        type: "function_call",
        functionName: toolCall.function.name,
        args,
        message: assistantMessage.content || `I'll ${toolCall.function.name.replace(/_/g, " ")} for you.`,
      };

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result: TextResult = {
      type: "text",
      content: assistantMessage.content || "I'm not sure how to help with that. Could you rephrase?",
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("agentic-chat error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
