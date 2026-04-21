// AI-1 integration smoke test: a "malicious row inserted directly via SQL"
// (modelled here as a base_url that points at cloud metadata, RFC1918,
// link-local, an http scheme, or a DNS-rebinding hostname) MUST yield a
// 400-class AIError and MUST NOT trigger any outbound network attempt.
//
// Run with:
//   deno test --allow-env --allow-net supabase/functions/_shared/__tests__/ollamaSsrf.integration.test.ts
//
// We exercise the read-time enforcement path inside `callOllamaDirect`
// (exposed as `__test_callOllamaDirect`) — the same code path that the
// BYOK Ollama branch of `callAI` invokes after pulling base_url straight
// from `user_api_keys`. Validation now happens BEFORE `pinnedFetch` is
// invoked, so a malicious row can never reach the outbound transport at
// all. We assert that:
//   1. an AIError with status 400 is thrown, and
//   2. the global `fetch` is never reached (which, combined with the fact
//      that `pinnedFetch` is the only other outbound primitive and lives
//      strictly downstream of the validation, proves no socket is opened).

import {
  assert,
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.224.0/testing/asserts.ts";
import { __test_callOllamaDirect, isAIError } from "../aiClient.ts";

interface DenoResolveAccess {
  resolveDns?: (hostname: string, recordType: "A" | "AAAA") => Promise<string[]>;
}

Deno.test("AI-1 smoke: malicious base_url → 400 + zero outbound fetches", async (t) => {
  const originalFetch = globalThis.fetch;
  const denoResolver = Deno as DenoResolveAccess;
  const originalResolveDns = denoResolver.resolveDns;

  let fetchCallCount = 0;
  globalThis.fetch = ((..._args: unknown[]) => {
    fetchCallCount++;
    throw new Error("AI-1 violation: globalThis.fetch was called for a malicious base_url");
  }) as typeof fetch;

  const expectAIErrorBeforeFetch = async (baseUrl: string) => {
    fetchCallCount = 0;
    const err = await assertRejects(
      () => __test_callOllamaDirect(
        "fake-bearer-token",
        baseUrl,
        "llama3",
        [{ role: "user", content: "hi" }],
        0.7,
      ),
      Error,
    );
    assert(isAIError(err), `expected AIError for ${baseUrl}, got ${String(err)}`);
    const status = (err as { status?: number }).status;
    assertEquals(status, 400, `expected status 400 for ${baseUrl}`);
    assertEquals(fetchCallCount, 0, `expected zero fetch calls for ${baseUrl}`);
  };

  try {
    await t.step("169.254.169.254 cloud metadata literal is rejected pre-fetch", async () => {
      await expectAIErrorBeforeFetch("https://169.254.169.254");
    });

    await t.step("RFC1918 literal (10.x) is rejected pre-fetch", async () => {
      await expectAIErrorBeforeFetch("https://10.0.0.5:11434");
    });

    await t.step("link-local 169.254.x literal is rejected pre-fetch", async () => {
      await expectAIErrorBeforeFetch("https://169.254.10.20:11434");
    });

    await t.step("IPv6 loopback literal is rejected pre-fetch", async () => {
      await expectAIErrorBeforeFetch("https://[::1]:443");
    });

    await t.step("IPv4-mapped private IPv6 is rejected pre-fetch", async () => {
      await expectAIErrorBeforeFetch("https://[::ffff:127.0.0.1]:443");
    });

    await t.step("non-https scheme on a public host is rejected pre-fetch", async () => {
      denoResolver.resolveDns = async (hostname: string, type: "A" | "AAAA") => {
        if (hostname === "ollama.example.com" && type === "A") return ["93.184.216.34"];
        return [];
      };
      try {
        await expectAIErrorBeforeFetch("http://ollama.example.com:11434");
      } finally {
        denoResolver.resolveDns = originalResolveDns;
      }
    });

    await t.step("disallowed port (5432) is rejected pre-fetch", async () => {
      denoResolver.resolveDns = async (hostname: string, type: "A" | "AAAA") => {
        if (hostname === "ollama.example.com" && type === "A") return ["93.184.216.34"];
        return [];
      };
      try {
        await expectAIErrorBeforeFetch("https://ollama.example.com:5432");
      } finally {
        denoResolver.resolveDns = originalResolveDns;
      }
    });

    await t.step("hostname that resolves to a private IP is rejected pre-fetch", async () => {
      denoResolver.resolveDns = async (hostname: string, type: "A" | "AAAA") => {
        if (hostname === "evil.example.test" && type === "A") return ["169.254.169.254"];
        return [];
      };
      try {
        await expectAIErrorBeforeFetch("https://evil.example.test");
      } finally {
        denoResolver.resolveDns = originalResolveDns;
      }
    });

    await t.step("DNS-rebinding: passes validateBaseUrl, but assertSameSafeIps re-check rejects, no fetch", async () => {
      let lookupCount = 0;
      denoResolver.resolveDns = async (hostname: string, type: "A" | "AAAA") => {
        if (hostname !== "rebind.example.test" || type !== "A") return [];
        lookupCount++;
        // 1st call (validateBaseUrl): public.
        // 2nd call (assertSameSafeIps right before fetch): metadata.
        return lookupCount === 1 ? ["93.184.216.34"] : ["169.254.169.254"];
      };
      try {
        await expectAIErrorBeforeFetch("https://rebind.example.test");
      } finally {
        denoResolver.resolveDns = originalResolveDns;
      }
    });
  } finally {
    globalThis.fetch = originalFetch;
    if (originalResolveDns) denoResolver.resolveDns = originalResolveDns;
  }
});
