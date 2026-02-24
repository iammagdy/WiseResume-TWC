import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI } from "../_shared/aiClient.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    console.log('Authenticated user:', userId);

    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    // Call Gemini directly with image input via the native Gemini API
    const geminiModel = 'gemini-2.5-flash';
    const geminiKey = Deno.env.get('GEMINI_API_KEY');

    if (!geminiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY is not configured. Please set it in Supabase Secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 30-second timeout for reliability
    const fetchController = new AbortController();
    const fetchTimeout = setTimeout(() => fetchController.abort(), 30_000);

    // Use Gemini native API for image generation (requires native endpoint, not OpenAI-compat)
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
    console.error("Error in generate-headshot:", error);
    return new Response(
      JSON.stringify({ error: "internal", message: "Failed to generate headshot. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
