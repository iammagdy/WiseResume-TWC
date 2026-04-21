// AI-4 (Task #24) drift-detection regression tests.
//
// These tests assert the invariants that previously had to be hand-maintained
// across three duplicate copies of the BYOK allow-list and OpenRouter curated
// list. With the consolidation onto `_shared/aiProviders.json` the lists are
// physically the same array — these tests guard against future regressions
// where someone adds a provider to the allow-list but forgets to:
//   - add a routing branch in `callAI` (which would silently grant free
//     managed-AI calls because credit util thinks the request is BYOK), or
//   - add a base URL for OpenAI-compatible providers, or
//   - keep the curated OpenRouter slugs in sync with the validator.
//
// Run with:
//   deno test --allow-env supabase/functions/_shared/__tests__/aiProvidersDrift.test.ts

import { assert, assertEquals } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import {
  BYOK_PROVIDER_ALLOWLIST,
  OPENAI_COMPAT_BASE_URLS,
  OPENROUTER_AUTO_SENTINEL,
  OPENROUTER_CURATED_MODELS,
  hasRoutingBranch,
  isAllowedOpenRouterModel,
  NON_OPENAI_COMPAT_BYOK_PROVIDERS,
} from "../aiProviders.ts";

Deno.test("AI-4: every BYOK-allow-listed provider has a routing branch", () => {
  const missing: string[] = [];
  for (const provider of BYOK_PROVIDER_ALLOWLIST) {
    if (!hasRoutingBranch(provider)) missing.push(provider);
  }
  assertEquals(
    missing,
    [],
    `BYOK_PROVIDER_ALLOWLIST contains providers with no routing branch: ${missing.join(", ")}. ` +
      `Add them to NON_OPENAI_COMPAT_BYOK_PROVIDERS or to openaiCompatibleBaseUrls in aiProviders.json.`,
  );
});

Deno.test("AI-4: every OpenAI-compatible base URL is BYOK-allow-listed", () => {
  const orphaned: string[] = [];
  for (const provider of Object.keys(OPENAI_COMPAT_BASE_URLS)) {
    if (!BYOK_PROVIDER_ALLOWLIST.has(provider)) orphaned.push(provider);
  }
  assertEquals(
    orphaned,
    [],
    `OPENAI_COMPAT_BASE_URLS has providers missing from BYOK_PROVIDER_ALLOWLIST: ${orphaned.join(", ")}.`,
  );
});

Deno.test("AI-4: every dedicated routing branch provider is BYOK-allow-listed", () => {
  const orphaned: string[] = [];
  for (const provider of NON_OPENAI_COMPAT_BYOK_PROVIDERS) {
    if (!BYOK_PROVIDER_ALLOWLIST.has(provider)) orphaned.push(provider);
  }
  assertEquals(orphaned, [], `Routing branches without BYOK allow-list entry: ${orphaned.join(", ")}.`);
});

Deno.test("AI-4: every curated OpenRouter slug passes the validator", () => {
  assert(OPENROUTER_CURATED_MODELS.length > 0, "curated list is empty");
  for (const slug of OPENROUTER_CURATED_MODELS) {
    assert(
      isAllowedOpenRouterModel(slug),
      `Curated slug "${slug}" is not recognised by isAllowedOpenRouterModel`,
    );
  }
});

Deno.test("AI-4: validator behaviour at the edges", () => {
  assert(isAllowedOpenRouterModel(OPENROUTER_AUTO_SENTINEL));
  assert(!isAllowedOpenRouterModel(""));
  assert(!isAllowedOpenRouterModel(null));
  assert(!isAllowedOpenRouterModel(undefined));
  assert(!isAllowedOpenRouterModel("nonexistent/model:free"));
});

Deno.test("AI-4: aiClient re-exports stay in lockstep with aiProviders", async () => {
  const ai = await import("../aiClient.ts");
  // Identity check: the re-exported constants are the same array/value
  // reference as in the single source of truth.
  assertEquals(ai.OPENROUTER_CURATED_MODELS, OPENROUTER_CURATED_MODELS);
  assertEquals(ai.OPENROUTER_AUTO_SENTINEL, OPENROUTER_AUTO_SENTINEL);
  assert(typeof ai.isAllowedOpenRouterModel === "function");
});
