import { assertEquals, assertRejects } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { callAI, toUserError, isAIError } from "../aiClient.ts";
import * as dbClient from "../dbClient.ts";

// Note: To run this test, use: 
// deno test --allow-net --allow-env supabase/functions/_shared/__tests__/aiClient.test.ts

Deno.test("BYOK Edge Cases - AI Client", async (t) => {
  
  // Save original globals
  const originalFetch = globalThis.fetch;
  const originalDenoEnvGet = Deno.env.get;

  await t.step("Scenario 3.1: Expected AIError mapping for invalid/expired BYOK", () => {
    // Assert that the graceful mapping to user messages works
    const mockError = new Error("Custom Error");
    (mockError as any).type = "invalid_key";
    (mockError as any).status = 401;
    
    const userError = toUserError(mockError);
    assertEquals(userError.status, 401);
    assertEquals(userError.message, "Invalid API key. Please check your settings.");
    
    const mockRateLimit = new Error("Rate limit");
    (mockRateLimit as any).type = "rate_limit";
    (mockRateLimit as any).status = 429;
    
    const userError2 = toUserError(mockRateLimit);
    assertEquals(userError2.status, 429);
    assertEquals(userError2.message, "Rate limit reached. Please try again in a moment.");
  });

  await t.step("Scenario 3.2: Graceful failure when external AI provider fails with invalid BYOK", async () => {
    // We will set up Deno.env.get to return a mock GEMINI_API_KEY (with no WISE_AI_API_KEY)
    // so it falls through to the global GEMINI_API_KEY path
    Deno.env.get = (key: string) => {
      if (key === 'GEMINI_API_KEY') return 'mock-invalid-key';
      return originalDenoEnvGet(key);
    };

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = input.toString();
      if (urlStr.includes('aiplatform.googleapis.com')) {
        return new Response(JSON.stringify({ error: { message: "API key not valid. Please pass a valid API key." } }), {
          status: 401,
          headers: new Headers({ "Content-Type": "application/json" })
        });
      }
      return new Response("Not found", { status: 404 });
    };

    try {
      await assertRejects(
        async () => {
          await callAI({
            model: 'gemini-2.5-flash',
            messages: [{ role: 'user', content: 'test' }],
          });
        },
        Error,
        "Invalid Gemini API key. Please check your settings."
      );
    } finally {
      // Restore
      globalThis.fetch = originalFetch;
      Deno.env.get = originalDenoEnvGet;
    }
  });

  await t.step("Scenario 3.3: Successful AI action with valid BYOK", async () => {
    Deno.env.get = (key: string) => {
      if (key === 'GEMINI_API_KEY') return 'mock-valid-key';
      return originalDenoEnvGet(key);
    };

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      return new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: "Enhancement success" }] } }],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 }
      }), { status: 200, headers: new Headers({ "Content-Type": "application/json" }) });
    };

    try {
      const response = await callAI({
        model: 'gemini-2.5-flash',
        messages: [{ role: 'user', content: 'test' }],
      });
      
      assertEquals(response.content, "Enhancement success");
      assertEquals(response.providerUsed, "gemini_global");
    } finally {
      globalThis.fetch = originalFetch;
      Deno.env.get = originalDenoEnvGet;
    }
  });
});
