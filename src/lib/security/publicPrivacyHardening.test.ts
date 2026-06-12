import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const emailService = readFileSync('appwrite-hubs/email-service/src/main.js', 'utf8');
const publicPortfolio = readFileSync('api/public-portfolio.ts', 'utf8');

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
});
