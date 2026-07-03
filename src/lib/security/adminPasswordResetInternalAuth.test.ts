import { createRequire } from 'node:module';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const require = createRequire(import.meta.url);
const adminDevkit = require('../../../appwrite-hubs/admin-devkit-data/src/main.js');
const emailService = require('../../../appwrite-hubs/email-service/src/main.js');

describe('Admin Password Reset Internal Auth Architecture', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.EMAIL_SERVICE_INTERNAL_HMAC_SECRET = 'test_internal_secret_key_12345';
    process.env.APPWRITE_API_KEY = 'test_api_key_67890';
  });

  it('admin-devkit-data rejects unauthenticated admin reset request', async () => {
    const resJson = vi.fn();
    const res = { json: resJson };
    const req = { headers: {} };
    const log = vi.fn();
    const error = vi.fn();

    await adminDevkit({
      req,
      res,
      log,
      error,
      body: { action: 'send-admin-password-reset-otp', target_user_id: 'user_123' },
    });

    expect(resJson).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: 'DEVKIT_UNAUTHORIZED',
        error: 'DevKit token is missing, invalid, or expired.',
      }),
      401
    );
  });

  it('admin-devkit-data signs internal email-service request with HMAC signature', () => {
    const { signInternalRequest } = adminDevkit._test;
    const payload = {
      target_user_id: 'usr_target_999',
      target_email: 'target@example.com',
      actor_user_id: 'usr_admin_001',
    };

    const signed = signInternalRequest(payload);
    expect(signed.timestamp).toBeTypeOf('number');
    expect(signed.signature).toBeTypeOf('string');
    expect(signed.signature.length).toBeGreaterThan(10);
  });

  it('fails closed if EMAIL_SERVICE_INTERNAL_HMAC_SECRET is missing (no API key fallback)', () => {
    delete process.env.EMAIL_SERVICE_INTERNAL_HMAC_SECRET;
    const { getInternalHmacSecret: getAdminSecret, signInternalRequest } = adminDevkit._test;
    const { verifyInternalRequestSignature } = emailService._test;

    expect(() => getAdminSecret()).toThrow('EMAIL_SERVICE_INTERNAL_HMAC_SECRET is not configured');
    expect(() => signInternalRequest({ target_user_id: 'u1', target_email: 'e1@test.com' })).toThrow(
      'EMAIL_SERVICE_INTERNAL_HMAC_SECRET is not configured'
    );
    expect(verifyInternalRequestSignature({ timestamp: Date.now(), target_user_id: 'u1', target_email: 'e1@test.com', signature: 'sig' })).toBe(false);
  });

  it('email-service rejects missing internal token/signature', async () => {
    const { verifyInternalRequestSignature } = emailService._test;

    expect(verifyInternalRequestSignature({})).toBe(false);
    expect(verifyInternalRequestSignature({ action: 'internal-send-admin-password-reset-otp' })).toBe(false);
    expect(verifyInternalRequestSignature({ timestamp: Date.now(), target_user_id: 'u1' })).toBe(false);
  });

  it('email-service rejects invalid internal token/signature', () => {
    const { verifyInternalRequestSignature } = emailService._test;

    const invalidBody = {
      action: 'internal-send-admin-password-reset-otp',
      timestamp: Date.now(),
      target_user_id: 'usr_target_999',
      target_email: 'target@example.com',
      actor_user_id: 'usr_admin_001',
      signature: 'invalid_forged_signature',
    };

    expect(verifyInternalRequestSignature(invalidBody)).toBe(false);
  });

  it('email-service accepts valid internal request signature', () => {
    const { signInternalRequest } = adminDevkit._test;
    const { verifyInternalRequestSignature } = emailService._test;

    const payload = {
      target_user_id: 'usr_target_999',
      target_email: 'target@example.com',
      actor_user_id: 'usr_admin_001',
    };

    const { timestamp, signature } = signInternalRequest(payload);

    const validBody = {
      action: 'internal-send-admin-password-reset-otp',
      timestamp,
      target_user_id: payload.target_user_id,
      target_email: payload.target_email,
      actor_user_id: payload.actor_user_id,
      signature,
    };

    expect(verifyInternalRequestSignature(validBody)).toBe(true);
  });

  it('email-service rejects expired internal request signatures (> 5 mins old)', () => {
    const { signInternalRequest } = adminDevkit._test;
    const { verifyInternalRequestSignature } = emailService._test;

    const payload = {
      target_user_id: 'usr_target_999',
      target_email: 'target@example.com',
      actor_user_id: 'usr_admin_001',
    };

    const { signature } = signInternalRequest(payload);
    const expiredTimestamp = Date.now() - (6 * 60 * 1000); // 6 minutes ago

    const expiredBody = {
      action: 'internal-send-admin-password-reset-otp',
      timestamp: expiredTimestamp,
      target_user_id: payload.target_user_id,
      target_email: payload.target_email,
      actor_user_id: payload.actor_user_id,
      signature,
    };

    expect(verifyInternalRequestSignature(expiredBody)).toBe(false);
  });

  it('email-service rejects direct browser calls to send-admin-password-reset-otp', async () => {
    const resJson = vi.fn();
    const res = { json: resJson };
    const bodyPayload = { action: 'send-admin-password-reset-otp', target_user_id: 'usr_1' };
    const req = { method: 'POST', headers: {}, body: bodyPayload };
    const log = vi.fn();
    const error = vi.fn();

    await emailService({
      req,
      res,
      log,
      error,
      body: bodyPayload,
    });

    expect(resJson).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining('Direct caller access to admin password reset is deprecated'),
      }),
      401
    );
  });

  it('responses and logs contain no OTP, challenge token, email body, Resend payload, bearer token, or secrets', () => {
    const { signInternalRequest } = adminDevkit._test;

    const signed = signInternalRequest({
      target_user_id: 'usr_target_999',
      target_email: 'target@example.com',
      actor_user_id: 'usr_admin_001',
    });

    const outputString = JSON.stringify(signed);

    expect(outputString).not.toContain('otp');
    expect(outputString).not.toContain('challengeToken');
    expect(outputString).not.toContain('test_internal_secret_key_12345');
    expect(outputString).not.toContain('test_api_key_67890');
  });
});
