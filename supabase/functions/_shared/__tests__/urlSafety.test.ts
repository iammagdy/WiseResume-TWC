// AI-1: Tests for the Ollama BYOK URL safety helper.
//
// Run with:
//   deno test --allow-env supabase/functions/_shared/__tests__/urlSafety.test.ts
//
// Tests are hermetic: every DNS lookup is injected via the `resolveDns`
// option so no real network is touched.

import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/testing/asserts.ts";
import {
  assertSameSafeIps,
  isPrivateIPv4,
  isPrivateIPv6,
  MAX_URL_LENGTH,
  validateBaseUrl,
} from "../urlSafety.ts";

function fakeResolver(map: Record<string, { A?: string[]; AAAA?: string[] }>) {
  return async (hostname: string, type: "A" | "AAAA"): Promise<string[]> => {
    return map[hostname]?.[type] ?? [];
  };
}

Deno.test("isPrivateIPv4 covers RFC1918 + loopback + link-local + cloud metadata", () => {
  for (const ip of [
    "10.0.0.1",
    "10.255.255.255",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "127.0.0.1",
    "169.254.169.254", // AWS / GCP metadata
    "0.0.0.0",
    "100.64.0.1", // CGNAT
    "224.0.0.1", // multicast
  ]) {
    assert(isPrivateIPv4(ip), `expected ${ip} to be private`);
  }
  for (const ip of ["8.8.8.8", "1.1.1.1", "203.0.114.1", "142.251.32.46"]) {
    // 203.0.114.1 isn't TEST-NET-3 (that's 203.0.113.0/24) — should be public.
    assert(!isPrivateIPv4(ip), `expected ${ip} to be public`);
  }
});

Deno.test("isPrivateIPv6 covers loopback, ULA, link-local, IPv4-mapped private", () => {
  for (const ip of [
    "::1",
    "::",
    "fc00::1",
    "fd12:3456:789a::1",
    "fe80::1",
    "ff02::1",
    "::ffff:127.0.0.1",
    "::ffff:169.254.169.254",
    "::ffff:10.0.0.1",
  ]) {
    assert(isPrivateIPv6(ip), `expected ${ip} to be private IPv6`);
  }
  for (const ip of ["2606:4700:4700::1111", "2001:4860:4860::8888"]) {
    assert(!isPrivateIPv6(ip), `expected ${ip} to be public IPv6`);
  }
});

Deno.test("validateBaseUrl: rejects non-https schemes", async () => {
  for (const url of [
    "ftp://example.com",
    "file:///etc/passwd",
    "gopher://example.com",
    "http://public.example.com", // http on non-loopback denied
  ]) {
    const result = await validateBaseUrl(url, {
      resolveDns: fakeResolver({ "public.example.com": { A: ["8.8.8.8"] } }),
    });
    assertEquals(result.ok, false, `expected reject for ${url}`);
    if (!result.ok) {
      assertEquals(result.code, "bad_scheme", `for ${url}`);
    }
  }
});

Deno.test("validateBaseUrl: rejects cloud metadata IP literal", async () => {
  const result = await validateBaseUrl("https://169.254.169.254");
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.code, "private_ip");
});

Deno.test("validateBaseUrl: rejects RFC1918 IP literal", async () => {
  for (const url of ["https://10.0.0.5", "https://192.168.1.1", "https://172.16.0.1"]) {
    const result = await validateBaseUrl(url);
    assertEquals(result.ok, false, `for ${url}`);
    if (!result.ok) assertEquals(result.code, "private_ip", `for ${url}`);
  }
});

Deno.test("validateBaseUrl: rejects link-local IPv4", async () => {
  const result = await validateBaseUrl("https://169.254.1.2");
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.code, "private_ip");
});

Deno.test("validateBaseUrl: rejects IPv6 loopback literal", async () => {
  const result = await validateBaseUrl("https://[::1]:443");
  assertEquals(result.ok, false);
  if (!result.ok) assert(["private_ip", "loopback"].includes(result.code));
});

Deno.test("validateBaseUrl: rejects IPv4-mapped private IPv6", async () => {
  const result = await validateBaseUrl("https://[::ffff:127.0.0.1]:443");
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.code, "private_ip");
});

Deno.test("validateBaseUrl: rejects oversize URL", async () => {
  const giant = "https://example.com/" + "a".repeat(MAX_URL_LENGTH);
  const result = await validateBaseUrl(giant);
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.code, "too_long");
});

Deno.test("validateBaseUrl: rejects unusual ports", async () => {
  const result = await validateBaseUrl("https://example.com:5432", {
    resolveDns: fakeResolver({ "example.com": { A: ["93.184.216.34"] } }),
  });
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.code, "bad_port");
});

Deno.test("validateBaseUrl: rejects userinfo", async () => {
  const result = await validateBaseUrl("https://user:pass@example.com", {
    resolveDns: fakeResolver({ "example.com": { A: ["93.184.216.34"] } }),
  });
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.code, "has_userinfo");
});

Deno.test("validateBaseUrl: rejects garbage / non-URL strings", async () => {
  for (const url of ["", "   ", "not-a-url", "javascript:alert(1)"]) {
    const result = await validateBaseUrl(url);
    assertEquals(result.ok, false, `for "${url}"`);
  }
});

Deno.test("validateBaseUrl: rejects hostname that resolves to private IP (DNS-pinning)", async () => {
  const result = await validateBaseUrl("https://internal.attacker.example", {
    resolveDns: fakeResolver({
      "internal.attacker.example": { A: ["169.254.169.254"] },
    }),
  });
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.code, "private_ip");
});

Deno.test("validateBaseUrl: rejects hostname with mixed public+private resolution", async () => {
  const result = await validateBaseUrl("https://mixed.example", {
    resolveDns: fakeResolver({
      "mixed.example": { A: ["8.8.8.8", "10.0.0.5"] },
    }),
  });
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.code, "private_ip");
});

Deno.test("validateBaseUrl: accepts a public https hostname on default port", async () => {
  const result = await validateBaseUrl("https://ollama.example.com", {
    resolveDns: fakeResolver({ "ollama.example.com": { A: ["93.184.216.34"] } }),
  });
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.hostname, "ollama.example.com");
    assertEquals(result.port, 443);
  }
});

Deno.test("validateBaseUrl: accepts custom Ollama port 11434", async () => {
  const result = await validateBaseUrl("https://ollama.example.com:11434", {
    resolveDns: fakeResolver({ "ollama.example.com": { A: ["93.184.216.34"] } }),
  });
  assertEquals(result.ok, true);
});

Deno.test("validateBaseUrl: dev escape hatch allows http://localhost when flag set", async () => {
  const result = await validateBaseUrl("http://localhost:11434", {
    allowDevLoopback: true,
  });
  assertEquals(result.ok, true);
});

Deno.test("validateBaseUrl: localhost rejected without dev flag", async () => {
  const result = await validateBaseUrl("http://localhost:11434", {
    allowDevLoopback: false,
  });
  assertEquals(result.ok, false);
  if (!result.ok) {
    // Either bad_scheme (http) or loopback — both are correct rejections.
    assert(["bad_scheme", "loopback"].includes(result.code));
  }
});

Deno.test("validateBaseUrl: returns trailing-slash-stripped url", async () => {
  const result = await validateBaseUrl("https://ollama.example.com:11434/", {
    resolveDns: fakeResolver({ "ollama.example.com": { A: ["93.184.216.34"] } }),
  });
  assert(result.ok);
  if (result.ok) assert(!result.url.endsWith("/"), `got ${result.url}`);
});

Deno.test("DNS-rebinding: validateBaseUrl passes, then assertSameSafeIps rejects when IP flips private", async () => {
  // Step 1: at save time the host resolves public.
  let lookupCount = 0;
  const rebindingResolver = async (hostname: string, type: "A" | "AAAA"): Promise<string[]> => {
    if (hostname !== "rebind.attacker.example") return [];
    if (type !== "A") return [];
    lookupCount++;
    if (lookupCount === 1) return ["93.184.216.34"]; // public
    return ["169.254.169.254"]; // attacker flips to metadata
  };

  const first = await validateBaseUrl("https://rebind.attacker.example", {
    resolveDns: rebindingResolver,
  });
  assert(first.ok, "first lookup should pass");

  // Step 2: just before fetch, we re-check.
  const second = await assertSameSafeIps("rebind.attacker.example", {
    resolveDns: rebindingResolver,
  });
  assertEquals(second.ok, false);
  if (!second.ok) {
    assertEquals(second.code, "rebind_detected");
    assertStringIncludes(second.message, "169.254.169.254");
  }
});

Deno.test("DNS-rebinding: assertSameSafeIps passes when IPs remain public on second lookup", async () => {
  const stableResolver = fakeResolver({
    "stable.example": { A: ["93.184.216.34"] },
  });
  const result = await assertSameSafeIps("stable.example", { resolveDns: stableResolver });
  assertEquals(result.ok, true);
});
