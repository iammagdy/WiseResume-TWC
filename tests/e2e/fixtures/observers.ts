import type { Page, Request, Response } from '@playwright/test';

export interface NetworkRecord {
  url: string;
  method: string;
  status: number;
  ok: boolean;
  durationMs: number;
}

export interface ConsoleRecord { type: string; text: string }

export function attachObservers(page: Page) {
  const consoleErrors: ConsoleRecord[] = [];
  const networkErrors: NetworkRecord[] = [];
  const edgeFnCalls: NetworkRecord[] = [];
  const pageErrors: string[] = [];
  const startTimes = new Map<Request, number>();

  page.on('console', m => {
    if (m.type() === 'error' || m.type() === 'warning') {
      consoleErrors.push({ type: m.type(), text: m.text().slice(0, 500) });
    }
  });
  page.on('pageerror', e => pageErrors.push(e.message));
  page.on('request', req => startTimes.set(req, Date.now()));
  page.on('response', async (res: Response) => {
    const req = res.request();
    const url = res.url();
    const isEdgeFn = /\/api\/fn\/|\/functions\/v1\//.test(url);
    const rec: NetworkRecord = {
      url,
      method: req.method(),
      status: res.status(),
      ok: res.ok(),
      durationMs: Date.now() - (startTimes.get(req) ?? Date.now()),
    };
    if (isEdgeFn) edgeFnCalls.push(rec);
    if (!res.ok() && (isEdgeFn || /supabase|kinde/.test(url))) {
      networkErrors.push(rec);
    }
  });

  return {
    consoleErrors,
    pageErrors,
    networkErrors,
    edgeFnCalls,
    snapshot() {
      return {
        consoleErrors: consoleErrors.slice(),
        pageErrors: pageErrors.slice(),
        networkErrors: networkErrors.slice(),
        edgeFnCalls: edgeFnCalls.slice(),
      };
    },
  };
}

export const DEMO_JOB_DESCRIPTION = `Senior Software Engineer — Remote
We are hiring a Senior Software Engineer to lead the development of our
React + TypeScript SaaS platform. Required: 5+ years of professional
experience shipping React, TypeScript, Node.js, and PostgreSQL. Strong
familiarity with AWS, Docker, CI/CD, and microservices architecture.
Bonus: experience with AI/LLM integrations, Supabase, and HR-tech
domain. Responsibilities include mentoring engineers, owning the
roadmap for the editor module, and partnering with product to ship
weekly. Compensation: $160-200k plus equity.`;
