import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { callAI, isAIError } from "../_shared/aiClient.ts";

const MAX_TEXT_SIZE = 10 * 1024;

const VALID_TONES = ['formal', 'professional', 'balanced', 'friendly', 'grateful', 'direct'];
const VALID_TEMPLATES = ['standard', 'short', 'grateful', 'career_growth', 'immediate', 'retirement'];
const VALID_REASONS = ['new_opportunity', 'career_growth', 'relocation', 'personal_reasons', 'back_to_school', 'health_reasons', 'retirement', 'prefer_not_to_say'];
const VALID_NOTICE_PERIODS = ['2_weeks', '1_month', 'immediate', 'custom'];

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { recipientName, company, position, lastWorkingDay, noticePeriod, reason, tone, templateStyle, additions, userName, userGeminiKey } = body;

    if (!company || typeof company !== 'string' || company.length > MAX_TEXT_SIZE) {
      return new Response(
        JSON.stringify({ error: 'Company name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validTone = VALID_TONES.includes(tone) ? tone : 'professional';
    const validTemplate = VALID_TEMPLATES.includes(templateStyle) ? templateStyle : 'standard';
    const validReason = VALID_REASONS.includes(reason) ? reason : 'prefer_not_to_say';
    const validNoticePeriod = VALID_NOTICE_PERIODS.includes(noticePeriod) ? noticePeriod : '2_weeks';

    const toneDescriptions: Record<string, string> = {
      formal: 'highly formal and professional with traditional business language',
      professional: 'professional, polished, and respectful',
      balanced: 'balanced between professional and warm',
      friendly: 'warm, personable, and appreciative while maintaining professionalism',
      grateful: 'deeply appreciative and focused on positive experiences',
      direct: 'clear, concise, and straightforward',
    };

    const templateDescriptions: Record<string, string> = {
      standard: 'traditional professional resignation letter format',
      short: 'brief and to the point, 3-4 paragraphs maximum',
      grateful: 'emphasizing gratitude, positive memories, and appreciation for growth',
      career_growth: 'focusing on exciting new opportunity and career progression',
      immediate: 'urgent tone explaining immediate departure with professionalism',
      retirement: 'warm, reflective tone celebrating career accomplishments and transitions',
    };

    const reasonDescriptions: Record<string, string> = {
      new_opportunity: 'pursuing a new career opportunity',
      career_growth: 'seeking career growth and professional development',
      relocation: 'relocating to a different area',
      personal_reasons: 'personal reasons (keep it vague and professional)',
      back_to_school: 'returning to school for further education',
      health_reasons: 'health-related reasons (keep it brief and private)',
      retirement: 'retiring from professional career',
      prefer_not_to_say: 'do not specify a reason, keep it general',
    };

    const additionsText = Array.isArray(additions) && additions.length > 0
      ? `\n\nInclude the following elements naturally in the letter:\n${additions.map((a: string) => `- ${a}`).join('\n')}`
      : '';

    const systemPrompt = `You are an expert professional letter writer specializing in resignation letters. Write resignation letters that are professional, clear about the departure date, appropriately toned, and properly formatted. Never include placeholder brackets like [Your Name]. Use the actual provided information.`;

    const userPrompt = `Write a resignation letter:

FROM: ${userName || 'Employee'}
POSITION: ${position || 'Current Position'}
COMPANY: ${company}
TO: ${recipientName || 'Manager'}
LAST WORKING DAY: ${lastWorkingDay || 'To be determined'}
NOTICE PERIOD: ${validNoticePeriod.replace('_', ' ')}
REASON: ${reasonDescriptions[validReason]}

TONE: ${toneDescriptions[validTone]}
TEMPLATE STYLE: ${templateDescriptions[validTemplate]}
${additionsText}

Write the complete letter with proper business letter formatting.`;

    const aiResponse = await callAI({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      userGeminiKey,
    });

    const letter = aiResponse.content;
    if (!letter) throw new Error("No content in AI response");

    return new Response(
      JSON.stringify({ letter }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-resignation-letter error:", error);
    const status = isAIError(error) ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
