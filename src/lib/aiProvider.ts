/**
 * Stub — BYOK provider plumbing has been removed.
 * The single managed engine (server-side flat 6-key pool) handles every call.
 */
export type AIProviderId = 'wiseresume';

export const AI_PROVIDERS: Array<{ id: AIProviderId; label: string }> = [
  { id: 'wiseresume', label: 'WiseResume AI (managed)' },
];

export function getDefaultProvider(): AIProviderId {
  return 'wiseresume';
}

export function isManagedProvider(_id: string | null | undefined): boolean {
  return true;
}

export function trackGeminiUsage(..._args: unknown[]): void {
  // No-op: Gemini provider has been removed.
}
