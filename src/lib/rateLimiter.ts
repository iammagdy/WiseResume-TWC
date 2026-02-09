class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  canMakeRequest(
    key: string,
    maxRequests: number = 10,
    windowMs: number = 60000
  ): boolean {
    const now = Date.now();
    const existing = this.requests.get(key) || [];
    const recent = existing.filter((t) => now - t < windowMs);

    if (recent.length >= maxRequests) {
      this.requests.set(key, recent);
      return false;
    }

    recent.push(now);
    this.requests.set(key, recent);
    return true;
  }

  getRemainingRequests(
    key: string,
    maxRequests: number = 10,
    windowMs: number = 60000
  ): number {
    const now = Date.now();
    const existing = this.requests.get(key) || [];
    const recent = existing.filter((t) => now - t < windowMs);
    return Math.max(0, maxRequests - recent.length);
  }

  getTimeUntilReset(key: string, windowMs: number = 60000): number {
    const existing = this.requests.get(key) || [];
    if (existing.length === 0) return 0;
    const oldest = Math.min(...existing);
    const resetAt = oldest + windowMs;
    return Math.max(0, resetAt - Date.now());
  }

  clear(key?: string) {
    if (key) {
      this.requests.delete(key);
    } else {
      this.requests.clear();
    }
  }
}

export const aiRateLimiter = new RateLimiter();

export const AI_RATE_LIMITS = {
  tailor: { maxRequests: 5, windowMs: 60000 },
  analyze: { maxRequests: 10, windowMs: 60000 },
  coverLetter: { maxRequests: 5, windowMs: 60000 },
  recruiterSim: { maxRequests: 5, windowMs: 60000 },
  linkedIn: { maxRequests: 5, windowMs: 60000 },
  aiDetector: { maxRequests: 10, windowMs: 60000 },
  onePage: { maxRequests: 5, windowMs: 60000 },
  enhance: { maxRequests: 10, windowMs: 60000 },
  careerPath: { maxRequests: 5, windowMs: 60000 },
  chat: { maxRequests: 20, windowMs: 60000 },
} as const;

export function checkAIRateLimit(
  feature: keyof typeof AI_RATE_LIMITS
): { allowed: boolean; waitSeconds: number } {
  const limit = AI_RATE_LIMITS[feature];
  const allowed = aiRateLimiter.canMakeRequest(
    `ai:${feature}`,
    limit.maxRequests,
    limit.windowMs
  );

  if (!allowed) {
    const waitMs = aiRateLimiter.getTimeUntilReset(
      `ai:${feature}`,
      limit.windowMs
    );
    return { allowed: false, waitSeconds: Math.ceil(waitMs / 1000) };
  }

  return { allowed: true, waitSeconds: 0 };
}
