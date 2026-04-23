import type { Page, Response } from '@playwright/test';
import { test, expect } from '../fixtures/auth-required';
import { attachObservers, DEMO_JOB_DESCRIPTION } from '../fixtures/observers';

/**
 * Deep AI-tool assertions. Each test:
 *   1. Navigates to the tool surface.
 *   2. Performs the user action (fill + submit).
 *   3. Awaits the real edge-function response (no mocking).
 *   4. Asserts 2xx + non-empty + structurally plausible body.
 */

interface DeepAssertion {
  fnRegex: RegExp;
  responseValidator?: (body: string) => string | null; // returns failure reason or null
}

async function awaitEdgeFn(page: Page, regex: RegExp, timeoutMs = 90_000): Promise<Response> {
  return page.waitForResponse(
    (res: Response) => regex.test(res.url()) && res.request().method() !== 'OPTIONS',
    { timeout: timeoutMs },
  );
}

function nonEmptyJsonValidator(minChars = 20): (body: string) => string | null {
  return (body: string) => {
    if (body.length < minChars) return `body too short: ${body.length} chars`;
    try {
      const parsed = JSON.parse(body);
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length === 0) {
        return 'response object is empty';
      }
      if (typeof parsed === 'string' && parsed.length < minChars) {
        return 'response string too short';
      }
    } catch {
      // not JSON — that's fine, the length check above already passed
    }
    return null;
  };
}

const DEEP_TOOLS: Array<{
  name: string;
  url: string;
  textareaText?: string;
  triggerName: RegExp;
  assertion: DeepAssertion;
}> = [
  {
    name: 'tailor-resume / parse-job-text via /tailor',
    url: '/tailor',
    textareaText: DEMO_JOB_DESCRIPTION,
    triggerName: /analyze|tailor|score|run|continue|submit/i,
    assertion: {
      fnRegex: /tailor-resume|parse-job-text|score-resume|analyze-resume/,
      responseValidator: nonEmptyJsonValidator(50),
    },
  },
  {
    name: 'generate-cover-letter via /cover-letter/new',
    url: '/cover-letter/new',
    textareaText: DEMO_JOB_DESCRIPTION,
    triggerName: /generate|create|next|submit/i,
    assertion: {
      fnRegex: /generate-cover-letter/,
      responseValidator: nonEmptyJsonValidator(50),
    },
  },
  {
    name: 'generate-resignation-letter via /resignation-letter/new',
    url: '/resignation-letter/new',
    textareaText: 'Please draft a respectful two-week resignation letter for Jane Doe leaving Acme Corp on 2026-05-07 to pursue a senior role elsewhere.',
    triggerName: /generate|create|submit/i,
    assertion: {
      fnRegex: /generate-resignation-letter/,
      responseValidator: nonEmptyJsonValidator(50),
    },
  },
];

for (const tool of DEEP_TOOLS) {
  test(`Deep: ${tool.name}`, async ({ page }) => {
    const obs = attachObservers(page);
    const responsePromise = awaitEdgeFn(page, tool.assertion.fnRegex);

    await page.goto(tool.url);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    if (tool.textareaText) {
      const ta = page.locator('textarea').first();
      if (await ta.count()) await ta.fill(tool.textareaText);
    }
    const trigger = page.getByRole('button', { name: tool.triggerName }).first();
    if (await trigger.count()) {
      await trigger.click().catch(() => null);
    } else {
      test.info().annotations.push({ type: 'note', description: `No trigger button matched ${tool.triggerName} on ${tool.url}` });
    }

    const res = await responsePromise.catch(() => null);
    test.info().annotations.push({ type: 'edge-fn-calls', description: JSON.stringify(obs.edgeFnCalls.slice(0, 20)) });

    expect(res, `Edge function ${tool.assertion.fnRegex} was never called`).not.toBeNull();
    expect(res!.ok(), `Edge function returned ${res!.status()}`).toBe(true);

    const body = await res!.text();
    test.info().annotations.push({ type: 'response-snippet', description: body.slice(0, 500) });

    if (tool.assertion.responseValidator) {
      const failureReason = tool.assertion.responseValidator(body);
      expect(failureReason, `Body validation failed: ${failureReason}`).toBeNull();
    }
  });
}
