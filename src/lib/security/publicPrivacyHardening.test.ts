import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const emailService = readFileSync('appwrite-hubs/email-service/src/main.js', 'utf8');
const publicPortfolio = readFileSync('api/public-portfolio.ts', 'utf8');
const trackView = readFileSync('api/track-portfolio-view.ts', 'utf8');

describe('public privacy hardening', () => {
  it('requires a current-user JWT for email verification status and does not return email', () => {
    const handler = emailService.match(/async function handleGetVerificationStatus[\s\S]*?\n\}/)?.[0] ?? '';
    expect(handler).toContain("headerValue(req, body, ['x-appwrite-user-jwt', 'X-Appwrite-JWT'])");
    expect(handler).toContain("String(user.$id || '') !== userId");
    expect(handler).toContain('emailVerification: user.emailVerification === true');
    expect(handler).not.toContain('new sdk.Users');
    expect(handler).not.toContain('email: user.email');
  });

  it('persists public portfolio password failures by username and client IP hash', () => {
    expect(publicPortfolio).toContain("const PORTFOLIO_RATE_LIMIT_COLLECTION = 'portfolio_session_rate_limits';");
    expect(publicPortfolio).toContain('portfolioPasswordAttemptId');
    expect(publicPortfolio).toContain('recordPasswordFailure(db, username, clientIp)');
    expect(publicPortfolio).toContain('clearPasswordFailures(db, username, clientIp)');
    expect(publicPortfolio).toContain("return res.status(429).json({ error: 'rate_limited'");
  });

  it('serves portfolio-visit analytics from a server-side Vercel route that validates input and stores no visitor IP', () => {
    // The route must exist as a real api/ serverless function (not only in the
    // non-deployed Express server), validate the username, write server-side
    // with the Appwrite key, and never persist a raw IP or any email.
    expect(trackView).toContain('export default async function handler');
    expect(trackView).toContain('USERNAME_PATTERN.test(username)');
    expect(trackView).toContain('createDocument');
    expect(trackView).toContain('VISITS_COLLECTION');
    // Allowlists / clamps preserved from the validated server logic.
    expect(trackView).toContain('VALID_DEVICES');
    expect(trackView).toContain('VALID_SECTION_NAMES');
    // The persisted document must not include a raw IP or any email field.
    const dataBlock = trackView.match(/const data = \{[\s\S]*?\};/)?.[0] ?? '';
    expect(dataBlock).not.toMatch(/\bip\b/i);
    expect(dataBlock).not.toMatch(/email/i);
    expect(trackView).not.toContain('contactEmail');
  });
});
