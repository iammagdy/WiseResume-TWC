import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const adminDevkit = readFileSync('appwrite-hubs/admin-devkit-data/src/main.js', 'utf8');
const adminDeployHubs = readFileSync('appwrite-hubs/admin-deploy-hubs/src/main.js', 'utf8');
const adminImpersonate = readFileSync('appwrite-hubs/admin-impersonate/src/main.js', 'utf8');

describe('admin DevKit hardening', () => {
  it('requires a dedicated impersonation HMAC secret in admin-devkit-data', () => {
    const secretFunction = adminDevkit.match(/function getImpersonationSecret\(\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(secretFunction).toContain('IMPERSONATION_HMAC_SECRET');
    expect(secretFunction).not.toContain('APPWRITE_API_KEY');
    expect(secretFunction).not.toContain('APPWRITE_FUNCTION_API_KEY');
  });

  it('uses one-hour DevKit tokens with a jti', () => {
    expect(adminDevkit).toContain('const SESSION_TTL_MS = 60 * 60 * 1000;');
    expect(adminDevkit).toContain('jti: crypto.randomUUID()');
  });

  it('includes admin-sentry in diagnostics and deploy hub inventory', () => {
    expect(adminDevkit).toContain("'admin-sentry'");
    expect(adminDeployHubs).toContain("'admin-sentry'");
  });

  it('stores and revokes Act As nonces server-side', () => {
    expect(adminDevkit).toContain("const IMPERSONATION_SESSIONS_COLLECTION = 'admin_impersonation_sessions';");
    expect(adminDevkit).toContain('databases.createDocument(DB_ID, IMPERSONATION_SESSIONS_COLLECTION, nonce');
    expect(adminImpersonate).toContain("const IMPERSONATION_SESSIONS_COLLECTION = 'admin_impersonation_sessions';");
    expect(adminImpersonate).toContain('validateStoredImpersonationSession');
    expect(adminImpersonate).toContain("Query.equal('target_user_id', target_user_id)");
    expect(adminImpersonate).toContain('revoked_at');
  });
});
