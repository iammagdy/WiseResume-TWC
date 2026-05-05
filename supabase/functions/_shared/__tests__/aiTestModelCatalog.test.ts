import { assertEquals } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import {
  curateOpenRouter,
  curateGroq,
  curateDeepSeek,
  mergeWithSeed,
  toIdList,
  PER_PROVIDER_CAPS,
} from "../aiTestModelCatalog.ts";

// To run:
//   deno test --allow-net --allow-env supabase/functions/_shared/__tests__/aiTestModelCatalog.test.ts

Deno.test("curateOpenRouter — sorts free :free models first", () => {
  const out = curateOpenRouter({
    data: [
      { id: "openai/gpt-4o", pricing: { prompt: "0.005", completion: "0.015" } },
      { id: "google/gemma-2-9b-it:free", pricing: { prompt: "0", completion: "0" } },
      { id: "meta-llama/llama-3.3-70b-instruct:free", pricing: { prompt: "0", completion: "0" } },
      { id: "anthropic/claude-3.5-sonnet", pricing: { prompt: "0.003", completion: "0.015" } },
    ],
  });
  assertEquals(out[0].id, "google/gemma-2-9b-it:free");
  assertEquals(out[0].tier, "free");
  assertEquals(out[0].hint, "Free tier");
  assertEquals(out[1].id, "meta-llama/llama-3.3-70b-instruct:free");
  // Paid models come after, alphabetical.
  assertEquals(out[2].id, "anthropic/claude-3.5-sonnet");
  assertEquals(out[2].tier, "paid");
  assertEquals(out[2].hint, undefined);
});

Deno.test("curateOpenRouter — flags zero-cost paid-tier slugs as free", () => {
  const out = curateOpenRouter({
    data: [
      { id: "promo/free-trial-model", pricing: { prompt: "0", completion: "0" } },
    ],
  });
  assertEquals(out[0].tier, "free");
  assertEquals(out[0].hint, "Free tier");
});

Deno.test("curateOpenRouter — caps the result at PER_PROVIDER_CAPS.openrouter (50)", () => {
  const data = Array.from({ length: 100 }, (_, i) => ({
    id: `vendor/model-${String(i).padStart(3, "0")}:free`,
    pricing: { prompt: "0", completion: "0" },
  }));
  const out = curateOpenRouter({ data });
  assertEquals(out.length, PER_PROVIDER_CAPS.openrouter);
});

Deno.test("curateOpenRouter — empty / malformed payload returns []", () => {
  assertEquals(curateOpenRouter(null), []);
  assertEquals(curateOpenRouter({}), []);
  assertEquals(curateOpenRouter({ data: "not-an-array" }), []);
  assertEquals(curateOpenRouter({ data: [{ pricing: {} }, { id: "" }] }), []);
});

Deno.test("curateGroq — skips non-chat model families", () => {
  const out = curateGroq({
    data: [
      { id: "llama-3.3-70b-versatile", active: true },
      { id: "whisper-large-v3", active: true },
      { id: "llama-guard-3-8b", active: true },
      { id: "llava-v1.5-7b-4096-preview", active: true },
      { id: "playai-tts", active: true },
      { id: "llama-3.1-8b-instant", active: true },
    ],
  });
  assertEquals(out.map(m => m.id), [
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
  ]);
});

Deno.test("curateGroq — flags inactive models as deprecated", () => {
  const out = curateGroq({
    data: [
      { id: "mixtral-8x7b-32768", active: false },
      { id: "llama-3.3-70b-versatile", active: true },
    ],
  });
  const mixtral = out.find(m => m.id === "mixtral-8x7b-32768");
  assertEquals(mixtral?.deprecated, true);
  assertEquals(mixtral?.hint, "Inactive upstream");
  const llama = out.find(m => m.id === "llama-3.3-70b-versatile");
  assertEquals(llama?.deprecated, false);
  assertEquals(llama?.hint, "Free tier");
});

Deno.test("curateGroq — defaults missing 'active' field to true", () => {
  const out = curateGroq({ data: [{ id: "llama-3.3-70b-versatile" }] });
  assertEquals(out[0].deprecated, false);
});

Deno.test("curateDeepSeek — preserves all chat slugs as paid tier", () => {
  const out = curateDeepSeek({
    data: [
      { id: "deepseek-chat" },
      { id: "deepseek-reasoner" },
      { id: "deepseek-v4-flash" },
    ],
  });
  assertEquals(out.map(m => m.id), ["deepseek-chat", "deepseek-reasoner", "deepseek-v4-flash"]);
  for (const m of out) assertEquals(m.tier, "paid");
});

Deno.test("mergeWithSeed — appends seed-only models with deprecated flag", () => {
  const fresh = [
    { id: "model-a", tier: "free" as const, hint: "Free tier" },
    { id: "model-b", tier: "paid" as const },
  ];
  const seed = ["model-a", "model-c", "model-d"] as const;
  const merged = mergeWithSeed(fresh, seed);
  assertEquals(merged.length, 4);
  assertEquals(merged[0].id, "model-a");
  assertEquals(merged[0].deprecated, undefined);
  assertEquals(merged[1].id, "model-b");
  assertEquals(merged[2].id, "model-c");
  assertEquals(merged[2].deprecated, true);
  assertEquals(merged[2].hint, "Deprecated upstream");
  assertEquals(merged[3].id, "model-d");
  assertEquals(merged[3].deprecated, true);
});

Deno.test("mergeWithSeed — empty fresh fetch returns seed without deprecated flags", () => {
  const merged = mergeWithSeed([], ["model-a", "model-b"]);
  assertEquals(merged, [{ id: "model-a" }, { id: "model-b" }]);
});

Deno.test("toIdList — returns id-only string array preserving order", () => {
  const ids = toIdList([
    { id: "a", tier: "free" },
    { id: "b", deprecated: true },
    { id: "c" },
  ]);
  assertEquals(ids, ["a", "b", "c"]);
});
