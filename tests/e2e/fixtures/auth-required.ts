import { test as base, expect } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';

interface AuthStatus { signedIn: boolean; blockerReason: string | null }

/**
 * Tests imported from this fixture skip themselves with a clear reason
 * when global-setup could not establish an authenticated session
 * (Kinde captcha, network blocker, etc.). This keeps the suite green-
 * or-explicitly-skipped instead of producing a flood of cascade failures.
 */
export const test = base.extend<{ authStatus: AuthStatus }>({
  authStatus: async ({}, use, testInfo) => {
    const path = 'tests/e2e/.auth/auth-status.json';
    const status: AuthStatus = existsSync(path)
      ? JSON.parse(readFileSync(path, 'utf8'))
      : { signedIn: false, blockerReason: 'auth-status.json missing' };
    if (!status.signedIn) {
      testInfo.skip(true, `Auth not established: ${status.blockerReason}`);
    }
    await use(status);
  },
});

export { expect };
