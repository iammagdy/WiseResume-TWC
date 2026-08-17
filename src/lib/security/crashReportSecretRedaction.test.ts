import { beforeEach, describe, expect, it, vi } from 'vitest';

import { activityTracker } from '@/lib/activityTracker';
import { clearCrashReporterContext } from '@/lib/crashReportContext';
import { buildCrashReportMetadata, serializeCrashContextForDb } from '@/lib/crashReportPayload';

const feedbackMocks = vi.hoisted(() => ({
  captureFeedback: vi.fn(() => true),
  invoke: vi.fn(async () => ({ data: { success: true }, error: null })),
}));

vi.mock('@/lib/captureErrorShim', () => ({
  captureFeedback: feedbackMocks.captureFeedback,
}));

vi.mock('@/lib/appwrite-functions', () => ({
  appwriteFunctions: { invoke: feedbackMocks.invoke },
}));

describe('crash report credential redaction', () => {
  beforeEach(() => {
    activityTracker.clearErrors();
    clearCrashReporterContext();
    window.history.replaceState({}, '', '/');
    feedbackMocks.captureFeedback.mockClear();
    feedbackMocks.invoke.mockClear();
  });

  it('keeps URL credentials out of metadata, AI prompts, and serialized crash context', () => {
    const secrets = {
      verification: 'verification-secret-unique',
      challenge: 'challenge-token-unique',
      access: 'access-token-unique',
      oauthState: 'oauth-state-unique',
      authCode: 'authorization-code-unique',
      recent: 'recent-error-token-unique',
      note: 'user-note-secret-unique',
    };

    const error = new Error(
      `Callback failed at https://example.test/oauth?authorization_code=${secrets.authCode}`,
    );
    error.stack = `Error: failed\n at /callback#access_token=${secrets.access}`;
    activityTracker.pushRecentError(
      `Previous request failed?token=${secrets.recent}`,
      `at /previous?state=${secrets.oauthState}`,
    );

    const metadata = buildCrashReportMetadata({
      error,
      componentStack: `Component at /verify?secret=${secrets.verification}`,
      route:
        `/auth/reset-password?secret=${secrets.verification}` +
        `&challengeToken=${secrets.challenge}&safe=1#?access_token=${secrets.access}` +
        `&oauth_state=${secrets.oauthState}`,
      userNote: `See https://example.test/reset?recovery_secret=${secrets.note}`,
      source: 'error_boundary_auto',
      reportType: 'auto-crash-report',
    });

    const payloads = [JSON.stringify(metadata), metadata.ai_fix_prompt, serializeCrashContextForDb(metadata)];
    for (const payload of payloads) {
      for (const secret of Object.values(secrets)) {
        expect(payload).not.toContain(secret);
      }
    }

    expect(metadata.route).toContain('safe=1');
    expect(metadata.ai_fix_prompt).toContain('[REDACTED]');
  });

  it('sanitizes the final Sentry and email crash payload messages', async () => {
    const { sendFeedback } = await import('@/lib/sendFeedback');
    const messageSecret = 'final-message-token-unique';
    const subjectSecret = 'final-subject-state-unique';

    await sendFeedback({
      type: 'auto-crash-report',
      email: 'anonymous@wiseresume.app',
      subject: `Crash at /callback?state=${subjectSecret}`,
      message: `Request failed?challenge_token=${messageSecret}`,
    });

    const deliveredPayloads = JSON.stringify([
      feedbackMocks.captureFeedback.mock.calls,
      feedbackMocks.invoke.mock.calls,
    ]);
    expect(deliveredPayloads).not.toContain(messageSecret);
    expect(deliveredPayloads).not.toContain(subjectSecret);
    expect(deliveredPayloads).toContain('[REDACTED]');
  });
});
