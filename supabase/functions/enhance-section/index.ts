import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnhanceRequest {
  section: 'summary' | 'experience' | 'education' | 'skills' | 'contact';
  action: 'generate' | 'improve' | 'ats_optimize' | 'shorten' | 'expand' | 'add_metrics' | 'generate_bullets';
  currentContent: unknown;
  context: {
    resume: unknown;
    jobDescription?: string;
  };
}

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const LOVABLE_URL = 'https://api.lovable.dev/v1';

async function callLovableAI(messages: { role: string; content: string }[], tools?: unknown[]) {
  const response = await fetch(`${LOVABLE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages,
      tools,
      tool_choice: tools ? { type: 'function', function: { name: 'enhance_content' } } : undefined,
      temperature: 0.7,
    }),
  });

  if (response.status === 429) {
    throw new Error('RATE_LIMIT');
  }

  if (response.status === 402) {
    throw new Error('PAYMENT_REQUIRED');
  }

  if (!response.ok) {
    const text = await response.text();
    console.error('Lovable AI error:', response.status, text);
    throw new Error(`AI request failed: ${response.status}`);
  }

  return response.json();
}

function buildPrompt(section: string, action: string, currentContent: unknown, context: unknown): string {
  const baseContext = `You are an expert resume writer and career coach. Your goal is to help users create compelling, ATS-friendly resume content.

Current resume context:
${JSON.stringify(context, null, 2)}

Section to enhance: ${section}
Current content:
${JSON.stringify(currentContent, null, 2)}
`;

  const actionPrompts: Record<string, string> = {
    generate: `Generate compelling, professional content for this section from scratch based on the resume context. Use strong action verbs, quantify achievements where possible, and ensure ATS compatibility.`,
    
    improve: `Improve the existing content to be more impactful and professional. Use stronger action verbs, better phrasing, and ensure it's concise yet comprehensive. Keep the same information but express it more effectively.`,
    
    ats_optimize: `Optimize this content for Applicant Tracking Systems (ATS). Add relevant industry keywords, use standard section headers, avoid special characters, and ensure the format is easily parseable by automated systems.`,
    
    shorten: `Make this content more concise while retaining the most impactful information. Remove filler words, combine related points, and prioritize the most impressive achievements.`,
    
    expand: `Expand this content with more detail. Add context, specific achievements, technologies used, and measurable outcomes where appropriate.`,
    
    add_metrics: `Add quantifiable metrics and numbers to this content. Suggest specific percentages, dollar amounts, time saved, team sizes, or other measurable outcomes based on the role and industry.`,
    
    generate_bullets: `Convert this description into powerful bullet points. Each bullet should start with a strong action verb and include a specific achievement or responsibility.`,
  };

  return baseContext + '\n\nTask: ' + (actionPrompts[action] || actionPrompts.improve);
}

function getToolSchema(section: string) {
  const schemas: Record<string, unknown> = {
    summary: {
      type: 'object',
      properties: {
        improved: { type: 'string', description: 'The enhanced summary text' },
        changes: { type: 'array', items: { type: 'string' }, description: 'List of changes made' },
        suggestions: { type: 'array', items: { type: 'string' }, description: 'Additional suggestions' },
      },
      required: ['improved', 'changes'],
    },
    experience: {
      type: 'object',
      properties: {
        improved: {
          type: 'object',
          properties: {
            description: { type: 'string' },
            achievements: { type: 'array', items: { type: 'string' } },
          },
        },
        changes: { type: 'array', items: { type: 'string' } },
        suggestions: { type: 'array', items: { type: 'string' } },
      },
      required: ['improved', 'changes'],
    },
    education: {
      type: 'object',
      properties: {
        improved: {
          type: 'object',
          properties: {
            relevantCoursework: { type: 'array', items: { type: 'string' } },
            honorsAwards: { type: 'array', items: { type: 'string' } },
          },
        },
        changes: { type: 'array', items: { type: 'string' } },
        suggestions: { type: 'array', items: { type: 'string' } },
      },
      required: ['improved', 'changes'],
    },
    skills: {
      type: 'object',
      properties: {
        improved: { type: 'array', items: { type: 'string' }, description: 'Enhanced skills list' },
        changes: { type: 'array', items: { type: 'string' } },
        suggestions: { type: 'array', items: { type: 'string' } },
        categories: {
          type: 'object',
          properties: {
            technical: { type: 'array', items: { type: 'string' } },
            soft: { type: 'array', items: { type: 'string' } },
            tools: { type: 'array', items: { type: 'string' } },
          },
        },
      },
      required: ['improved', 'changes'],
    },
    contact: {
      type: 'object',
      properties: {
        improved: {
          type: 'object',
          properties: {
            linkedin: { type: 'string' },
            portfolio: { type: 'string' },
          },
        },
        changes: { type: 'array', items: { type: 'string' } },
        suggestions: { type: 'array', items: { type: 'string' } },
      },
      required: ['improved', 'changes'],
    },
  };

  return schemas[section] || schemas.summary;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { section, action, currentContent, context } = await req.json() as EnhanceRequest;

    console.log(`Enhancing ${section} with action: ${action}`);

    const prompt = buildPrompt(section, action, currentContent, context);
    const toolSchema = getToolSchema(section);

    const tools = [{
      type: 'function',
      function: {
        name: 'enhance_content',
        description: 'Return the enhanced resume content',
        parameters: toolSchema,
      },
    }];

    const result = await callLovableAI([
      { role: 'user', content: prompt },
    ], tools);

    // Extract the tool call result
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      // Fallback to parsing the message content
      const content = result.choices?.[0]?.message?.content;
      console.log('No tool call, using message content:', content);
      
      return new Response(JSON.stringify({
        improved: content,
        changes: ['AI enhanced the content'],
        suggestions: [],
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const enhancedContent = JSON.parse(toolCall.function.arguments);

    console.log('Enhancement complete:', JSON.stringify(enhancedContent).slice(0, 200));

    return new Response(JSON.stringify(enhancedContent), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Enhancement error:', error);

    if (error.message === 'RATE_LIMIT') {
      return new Response(JSON.stringify({
        error: 'rate_limit',
        message: 'Too many requests. Please wait a moment and try again.',
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (error.message === 'PAYMENT_REQUIRED') {
      return new Response(JSON.stringify({
        error: 'payment_required',
        message: 'AI credits exhausted. Please check your account.',
      }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      error: 'enhancement_failed',
      message: 'Failed to enhance content. Please try again.',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
