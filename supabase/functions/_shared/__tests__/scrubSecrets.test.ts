import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import { scrubSecrets, scrubAndCap, REDACTED_MARKER } from "../scrubSecrets.ts";
import { toUserError } from "../aiClient.ts";

// To run: deno test --allow-net --allow-env supabase/functions/_shared/__tests__/scrubSecrets.test.ts

Deno.test("scrubSecrets — every documented pattern is redacted", async (t) => {
  await t.step("Google AIza key in URL query string", () => {
    const out = scrubSecrets(
      "TypeError: Failed to fetch https://generativelanguage.googleapis.com/v1beta/models/x:generateContent?key=AIzaSyDABCDEF1234567890abcdEFGH",
    );
    assertStringIncludes(out, "key=" + REDACTED_MARKER);
    assertEquals(/AIza[A-Za-z0-9]{20,}/.test(out), false);
  });

  await t.step("Bearer token in Authorization header echo", () => {
    const out = scrubSecrets("Authorization: Bearer abc.def.ghijklmnopqrstuvwxyz");
    assertStringIncludes(out, "Bearer " + REDACTED_MARKER);
  });

  await t.step("OpenAI sk- key", () => {
    const out = scrubSecrets("Invalid key sk-proj-AAAA1111BBBB2222CCCC3333DDDD");
    assertStringIncludes(out, REDACTED_MARKER);
    assertEquals(/sk-[A-Za-z0-9]{20,}/.test(out), false);
  });

  await t.step("Anthropic sk-ant- key (more specific than openai prefix)", () => {
    const out = scrubSecrets("error: sk-ant-AAAA1111BBBB2222CCCC3333DDDD echoed");
    assertStringIncludes(out, REDACTED_MARKER);
    assertEquals(/sk-ant-[A-Za-z0-9]{16,}/.test(out), false);
  });

  await t.step("Groq gsk_ key", () => {
    const out = scrubSecrets("auth: gsk_ABCDEFGHIJ1234567890klmn echoed");
    assertStringIncludes(out, REDACTED_MARKER);
    assertEquals(/gsk_[A-Za-z0-9]{20,}/.test(out), false);
  });

  await t.step("xAI xai- key", () => {
    const out = scrubSecrets("auth: xai-1234567890abcdefghijklmn echoed");
    assertStringIncludes(out, REDACTED_MARKER);
  });

  await t.step("Slack xoxb- token", () => {
    const out = scrubSecrets("Slack token xoxb-1234567890-AAAA-BBBB echoed");
    assertStringIncludes(out, REDACTED_MARKER);
  });

  await t.step("Idempotency — scrub(scrub(x)) === scrub(x)", () => {
    const inputs = [
      "?key=AIzaSyDABCDEF1234567890abcdEFGH",
      "Bearer abc.def.ghijklmnopqrstuvwxyz",
      "sk-proj-AAAA1111BBBB2222CCCC3333DDDD",
      "sk-ant-AAAA1111BBBB2222CCCC3333DDDD",
      "gsk_ABCDEFGHIJ1234567890klmn",
      "ordinary error message with no secret",
    ];
    for (const inp of inputs) {
      const once = scrubSecrets(inp);
      assertEquals(scrubSecrets(once), once, `not idempotent for: ${inp}`);
    }
  });

  await t.step("Non-string inputs do not throw", () => {
    assertEquals(scrubSecrets(null), "");
    assertEquals(scrubSecrets(undefined), "");
    assertEquals(scrubSecrets(42), "42");
  });

  await t.step("scrubAndCap caps length at 100 by default and still scrubs", () => {
    const long = "x".repeat(500) + " ?key=AIzaSyDABCDEF1234567890abcdEFGH";
    const out = scrubAndCap(long);
    assertEquals(out.length <= 101, true); // 100 + ellipsis
    // Even when truncated, the scrubbed portion is the prefix; the secret
    // sits past the cap so it is dropped entirely.
    assertEquals(/AIza[A-Za-z0-9]{20,}/.test(out), false);
  });
});

Deno.test("toUserError — Deno-style fetch error containing a fake Gemini key in the URL is redacted", async () => {
  // Simulate the exact shape Deno produces when Gemini's TLS / DNS fails
  // and the URL (which used to embed ?key=...) ends up in the message.
  const fakeKey = "AIzaSyDFAKE1234567890abcdefghijFAKE";
  const err = new TypeError(
    `error sending request for url (https://generativelanguage.googleapis.com/v1beta/models/x:generateContent?key=${fakeKey}): connection refused`,
  );

  // Capture stderr from the toUserError console.error path.
  const origConsoleError = console.error;
  let stderr = "";
  console.error = (...args: unknown[]) => {
    stderr += args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ") + "\n";
  };

  try {
    const out = toUserError(err);
    // 1. JSON envelope returned to the browser must not contain the key.
    assertEquals(out.error, "internal");
    assertEquals(out.status, 500);
    assertEquals(out.message.includes(fakeKey), false);
    assertStringIncludes(out.message, REDACTED_MARKER);

    // 2. stderr must not contain the key either.
    assertEquals(stderr.includes(fakeKey), false);
    assertStringIncludes(stderr, REDACTED_MARKER);
  } finally {
    console.error = origConsoleError;
  }
});
