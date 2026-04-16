import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { callAI, getUserKeyAndUrlFromDB } from "../_shared/aiClient.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireAuth, authErrorResponse } from "../_shared/authMiddleware.ts";
import { checkRateLimit, recordUsage } from "../_shared/rateLimiter.ts";
import { checkAndDeductCredit } from "../_shared/creditUtils.ts";
import { getServiceClient } from "../_shared/dbClient.ts";
import { checkPayloadSize } from "../_shared/requestUtils.ts";
import { logger } from "../_shared/logger.ts";
const log = logger('generate-headshot');


serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const sizeError = checkPayloadSize(req, 500 * 1024);
  if (sizeError) return sizeError;

  try {
    const { userId, client } = await requireAuth(req);
    console.log('Authenticated user:', userId);

    const { allowed } = await checkRateLimit(userId, { actionType: 'generate_headshot', maxRequests: 10, windowSeconds: 60 });
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please wait before generating another headshot." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse and validate the input before any credit deduction
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Gemini directly with image input via the native Gemini API (requires multimodal support).
    // BYOK isolation: if user has a Gemini BYOK key, use it. If they have a different BYOK provider,
    // reject the request (platform keys must not be used as a silent fallback for BYOK-configured users).
    // This resolution happens BEFORE credit deduction so BYOK non-Gemini users are rejected without charge.
    const geminiModel = 'gemini-2.5-flash';

    let geminiKey: string | undefined;
    const userGeminiData = await getUserKeyAndUrlFromDB(userId, 'gemini');
    if (userGeminiData?.key) {
      // BYOK user with a Gemini key — use their key for image generation
      geminiKey = userGeminiData.key;
      console.log('[generate-headshot] Using user BYOK Gemini key');
    } else {
      // Check if user has a non-platform BYOK provider configured (but no Gemini key)
      const { data: prefs } = await getServiceClient()
        .from('user_preferences')
        .select('ai_provider')
        .eq('user_id', userId)
        .maybeSingle();
      const declaredProvider = prefs?.ai_provider;
      const isByokUser = declaredProvider && declaredProvider !== 'wiseresume';
      if (isByokUser) {
        // BYOK user without a Gemini key — headshots require Gemini. Reject rather than use platform key.
        return new Response(
          JSON.stringify({ error: `Headshot generation requires a Gemini API key. Please add your Gemini key in AI Settings → Gemini.` }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // Platform user — use managed Gemini key
      geminiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('WISE_AI_API_KEY') || Deno.env.get('VERTEX_API_KEY');
    }

    if (!geminiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY is not configured. Please set it in Supabase Secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Credit deduction happens right before the AI call, after all input validation and
    // BYOK key resolution. This ensures users are only charged when an AI call will actually be made.
    const creditCheck = await checkAndDeductCredit(userId);
    if (!creditCheck.hasCredits) {
      return new Response(
        JSON.stringify({ error: 'Daily AI credit limit reached. Upgrade your plan or add your own API key.' }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Generating professional headshot with AI...");

    const prompt = `Transform this photo into a professional corporate headshot. Requirements:
- The person should appear in professional business attire (suit, blazer, or professional dress shirt)
- Use a clean, neutral background suitable for a resume or LinkedIn profile (soft gray, light blue, or white gradient)
- Apply professional studio lighting with soft shadows
- Maintain the person's exact facial features, skin tone, and identity
- Professional grooming appearance
- Confident, approachable expression
- Head and shoulders composition
- High-quality, polished finish suitable for professional use`;

    const fetchController = new AbortController();
    const fetchTimeout = setTimeout(() => fetchController.abort(), 30_000);

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType: "image/jpeg", data: imageBase64.replace(/^data:image\/\w+;base64,/, '') } },
          ],
        }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
        },
      }),
      signal: fetchController.signal,
    });

    clearTimeout(fetchTimeout);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to generate headshot. This feature requires a Gemini API key with image generation support." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("Gemini response received");

    // Extract the generated image from the Gemini native response
    const parts = data.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p: any) => p.inlineData);

    if (!imagePart?.inlineData) {
      console.error("No image in response:", JSON.stringify(data).slice(0, 500));
      return new Response(
        JSON.stringify({ error: "No image generated. The AI might not have been able to process your photo. Note: image generation may require a paid Gemini API key." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const generatedImageUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
    console.log("Professional headshot generated successfully");

    await recordUsage(userId, 'generate_headshot');

    return new Response(
      JSON.stringify({ imageUrl: generatedImageUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.error("Generate headshot timed out after 30s");
      return new Response(
        JSON.stringify({ error: "Request timed out. Please try again." }),
        { status: 408, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    log.error("Unhandled error", error);
    return new Response(
      JSON.stringify({ error: "internal", message: "Failed to generate headshot. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
