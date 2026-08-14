import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const crypto = require('node:crypto');
const adminDevkit = require('../../../appwrite-hubs/admin-devkit-data/src/main.js');
const emailService = require('../../../appwrite-hubs/email-service/src/main.js');

describe('password reset security remediation', () => {
  it('generates six-digit OTPs in the documented range through crypto.randomInt', () => {
    const randomInt = vi.spyOn(crypto, 'randomInt');
    randomInt.mockReturnValue(123456);

    expect(emailService._test.generatePasswordResetOtp()).toBe('123456');
    expect(randomInt).toHaveBeenCalledWith(100000, 1000000);

    randomInt.mockRestore();
    for (let index = 0; index < 100; index += 1) {
      const otp = emailService._test.generatePasswordResetOtp();
      expect(otp).toMatch(/^\d{6}$/);
      expect(Number(otp)).toBeGreaterThanOrEqual(100000);
      expect(Number(otp)).toBeLessThan(1000000);
    }
  });

  it('accepts a valid internal request once and rejects an exact replay', async () => {
    process.env.EMAIL_SERVICE_INTERNAL_HMAC_SECRET = 'test_internal_secret_key_12345';
    const payload = {
      target_user_id: 'usr_target_999',
      target_email: 'target@example.com',
      actor_user_id: 'usr_admin_001',
    };
    const signed = adminDevkit._test.signInternalRequest(payload);
    const body = { ...payload, ...signed };
    const db = new NonceLedgerDb();

    expect(emailService._test.verifyInternalRequestSignature(body)).toBe(true);
    expect(await emailService._test.consumeInternalRequestNonce(body, db)).toBe(true);
    expect(await emailService._test.consumeInternalRequestNonce(body, db)).toBe(false);
  });

  it('rejects expired, modified-target, and invalid-signature internal reset requests', () => {
    process.env.EMAIL_SERVICE_INTERNAL_HMAC_SECRET = 'test_internal_secret_key_12345';
    const payload = {
      target_user_id: 'usr_target_999',
      target_email: 'target@example.com',
      actor_user_id: 'usr_admin_001',
    };
    const signed = adminDevkit._test.signInternalRequest(payload);

    expect(emailService._test.verifyInternalRequestSignature({
      ...payload,
      ...signed,
      timestamp: Date.now() - (6 * 60 * 1000),
    })).toBe(false);
    expect(emailService._test.verifyInternalRequestSignature({
      ...payload,
      ...signed,
      target_user_id: 'usr_other_000',
    })).toBe(false);
    expect(emailService._test.verifyInternalRequestSignature({
      ...payload,
      ...signed,
      signature: 'invalid_signature',
    })).toBe(false);
  });
});

class NonceLedgerDb {
  private readonly nonces = new Set<string>();

  async createDocument(_databaseId: string, _collectionId: string, documentId: string) {
    if (this.nonces.has(documentId)) {
      throw Object.assign(new Error('already exists'), { code: 409 });
    }
    this.nonces.add(documentId);
    return { $id: documentId };
  }

  async listDocuments() {
    return { documents: [] };
  }
}
