import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

interface DetectAndHumanizeRequest {
  text: string;
  action: 'detect' | 'humanize' | 'both';
  tone?: 'professional' | 'confident' | 'friendly';
  userGeminiKey?: string;
}

interface DetectionResult {
  aiScore: number;
  humanScore: number;
  confidence: string;
  flags: {
    phrase: string;
    reason: string;
    severity: 'high' | 'medium' | 'low';
  }[];
  verdict: string;
}

interface HumanizeResult {
  original: string;
  humanized: string;
  changes: string[];
}

const MAX_TEXT_LENGTH = 50000;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { text, action, tone = 'professional', userGeminiKey }: DetectAndHumanizeRequest = await req.json();

    if (!text || !action) {
      return new Response(
        JSON.stringify({ error: 'Text and action are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Input size validation
    if (text.length > MAX_TEXT_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Text must be under ${MAX_TEXT_LENGTH} characters` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine which AI gateway to use
    const useGeminiDirect = !!userGeminiKey;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!useGeminiDirect && !LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiUrl = useGeminiDirect
      ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
      : "https://ai.gateway.lovable.dev/v1/chat/completions";

    const apiKey = useGeminiDirect ? userGeminiKey : LOVABLE_API_KEY;
    const modelName = useGeminiDirect ? "gemini-2.0-flash" : "google/gemini-3-flash-preview";

    console.log(`detect-and-humanize: Using ${useGeminiDirect ? 'Gemini Direct' : 'Lovable Gateway'}`);

    let result: { detection?: DetectionResult; humanized?: HumanizeResult } = {};

    // Detection
    if (action === 'detect' || action === 'both') {
      const detectPrompt = `You are an expert at detecting AI-generated text. Analyze the following text for signs of AI authorship.

Look for these common AI patterns:
- Overused words: "delve", "tapestry", "synergy", "leverage", "spearheaded", "multifaceted", "seamlessly", "paradigm", "holistic", "robust"
- Formulaic structure: lists of exactly 3-5 items, overly balanced sentence lengths
- Lack of personal voice: generic phrasing, no unique perspectives or specific anecdotes
- Perfect grammar and punctuation with no natural variations
- Buzzword density and corporate jargon overuse
- Generic quantification: "increased by X%", "reduced by X%"
- Passive voice overuse

Return a JSON object with this structure:
{
  "aiScore": <0-100, where 100 = definitely AI>,
  "humanScore": <0-100, where 100 = definitely human>,
  "confidence": "<high|medium|low>",
  "flags": [
    {
      "phrase": "<exact problematic phrase>",
      "reason": "<why this suggests AI>",
      "severity": "<high|medium|low>"
    }
  ],
  "verdict": "<brief 1-2 sentence assessment>"
}

Analyze this text:
"""
${text}
"""`;

      const detectResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          messages: [{ role: 'user', content: detectPrompt }],
          temperature: 0.3,
        }),
      });

      if (!detectResponse.ok) {
        const errorText = await detectResponse.text();
        console.error('Detection API error:', errorText);
        
        if (detectResponse.status === 401 || detectResponse.status === 403) {
          return new Response(
            JSON.stringify({ error: 'Invalid API key. Please check your AI settings.' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (detectResponse.status === 429) {
          const errorMsg = useGeminiDirect
            ? 'Rate limit exceeded. Your Gemini key may have hit its quota.'
            : 'Too many requests. Please try again later.';
          return new Response(
            JSON.stringify({ error: 'rate_limit', message: errorMsg }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (detectResponse.status === 402) {
          return new Response(
            JSON.stringify({ error: 'payment_required', message: 'AI credits exhausted.' }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        throw new Error('Detection failed');
      }

      const detectData = await detectResponse.json();
      const detectContent = detectData.choices?.[0]?.message?.content;

      if (detectContent) {
        try {
          const jsonMatch = detectContent.match(/```json\s*([\s\S]*?)\s*```/) || detectContent.match(/```\s*([\s\S]*?)\s*```/);
          const jsonString = jsonMatch ? jsonMatch[1] : detectContent;
          result.detection = JSON.parse(jsonString.trim());
        } catch (e) {
          console.error('Failed to parse detection response:', e);
        }
      }
    }

    // Humanization
    if (action === 'humanize' || action === 'both') {
      const toneInstructions = {
        professional: 'Maintain a professional tone while making it sound more natural and personal. Use varied sentence structures and add subtle personality.',
        confident: 'Write with confident, assertive language. Use active voice, strong verbs, and direct statements. Show personality through conviction.',
        friendly: 'Make it warm and approachable while still professional. Use more conversational language and show genuine enthusiasm.',
      };

      const humanizePrompt = `You are an expert editor who specializes in making AI-generated text sound naturally human. Your goal is to preserve the meaning and impact while removing AI "tells".

Guidelines:
1. Replace overused AI words (delve, tapestry, synergy, spearheaded, leverage) with more natural alternatives
2. Vary sentence length and structure - mix short punchy sentences with longer ones
3. Add subtle imperfections humans naturally make (occasional contractions, sentence fragments for emphasis)
4. Replace generic phrases with specific, personal-sounding alternatives
5. Keep key achievements and metrics but frame them more naturally
6. ${toneInstructions[tone]}

Original text:
"""
${text}
"""

Return a JSON object with this structure:
{
  "original": "<the original text>",
  "humanized": "<your rewritten version>",
  "changes": ["<list of key changes you made>"]
}

Make the rewrite feel genuinely human while preserving the professional quality and key information.`;

      const humanizeResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          messages: [{ role: 'user', content: humanizePrompt }],
          temperature: 0.7,
        }),
      });

      if (!humanizeResponse.ok) {
        const errorText = await humanizeResponse.text();
        console.error('Humanize API error:', errorText);
        
        if (humanizeResponse.status === 401 || humanizeResponse.status === 403) {
          return new Response(
            JSON.stringify({ error: 'Invalid API key. Please check your AI settings.' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (humanizeResponse.status === 429) {
          const errorMsg = useGeminiDirect
            ? 'Rate limit exceeded. Your Gemini key may have hit its quota.'
            : 'Too many requests. Please try again later.';
          return new Response(
            JSON.stringify({ error: 'rate_limit', message: errorMsg }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (humanizeResponse.status === 402) {
          return new Response(
            JSON.stringify({ error: 'payment_required', message: 'AI credits exhausted.' }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        throw new Error('Humanization failed');
      }

      const humanizeData = await humanizeResponse.json();
      const humanizeContent = humanizeData.choices?.[0]?.message?.content;

      if (humanizeContent) {
        try {
          const jsonMatch = humanizeContent.match(/```json\s*([\s\S]*?)\s*```/) || humanizeContent.match(/```\s*([\s\S]*?)\s*```/);
          const jsonString = jsonMatch ? jsonMatch[1] : humanizeContent;
          result.humanized = JSON.parse(jsonString.trim());
        } catch (e) {
          console.error('Failed to parse humanize response:', e);
        }
      }
    }

    console.log('AI Detection/Humanization completed successfully');

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Detect and humanize error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
