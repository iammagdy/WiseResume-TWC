import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('DevKit admin operations contracts', () => {
  it('provisions server-only impersonation storage for targeted workflows', () => {
    const schema = read('scripts/setup_impersonation_sessions_schema.cjs');
    const workflow = read('.github/workflows/deploy-appwrite-hubs.yml');

    expect(schema).toContain("const COLL_ID = 'admin_impersonation_sessions'");
    expect(schema).toContain("createCollection(DB_ID, COLL_ID, 'Admin Impersonation Sessions', [], true)");
    expect(schema).toContain("'target_user_id'");
    expect(schema).toContain("'expires_at'");
    expect(schema).toContain("'revoked_at'");
    expect(schema).toContain("{ key: 'target_user_id_idx', attributes: ['target_user_id'], required: true }");
    expect(schema).toContain('if (index.required) throw error;');
    expect(schema).not.toContain('nonce_unique');
    expect(workflow).toContain('node scripts/setup_impersonation_sessions_schema.cjs');
    expect(workflow).toContain("contains(github.event.inputs.target, 'admin-devkit-data')");
    expect(workflow).toContain("contains(github.event.inputs.target, 'admin-impersonate')");
  });

  it('keeps identity collision behavior suspension-only and guarded', () => {
    const backend = read('appwrite-hubs/admin-devkit-data/src/main.js');
    const panel = read('src/components/dev-kit/AdminUsersPanel.tsx');
    const drawer = read('src/components/dev-kit/UserDetailDrawer.tsx');

    expect(backend).toContain("action === 'suspend-collision-identity'");
    expect(backend).toContain('Only confirmed duplicate/collision identities can be suspended.');
    expect(panel).not.toContain('Merge Identity');
    expect(panel).not.toContain('transfer all data');
    expect(drawer).toContain('Suspend duplicate identity');
    expect(drawer).toContain('Only use this for confirmed duplicate/collision identities.');
    expect(drawer).not.toContain("Copy the orphan account's plan and profile fields");
  });

  it('uses an authenticated send-code-only admin reset action routed through admin-devkit-data', () => {
    const devkitData = read('appwrite-hubs/admin-devkit-data/src/main.js');
    const emailService = read('appwrite-hubs/email-service/src/main.js');
    const drawer = read('src/components/dev-kit/UserDetailDrawer.tsx');

    expect(drawer).toContain("body: { action: 'send-admin-password-reset-otp', target_user_id: user.user_id }");
    expect(drawer).toContain("unwrapAdminResponse<{ warning?: string }>(tuple, 'admin-devkit-data')");

    expect(devkitData).toContain("action === 'send-admin-password-reset-otp'");
    expect(devkitData).toContain('signInternalRequest');
    expect(devkitData).toContain("action: 'internal-send-admin-password-reset-otp'");

    expect(emailService).toContain("case 'internal-send-admin-password-reset-otp'");
    expect(emailService).toContain('handleInternalSendAdminPasswordResetOtp');
    expect(emailService).toContain('verifyInternalRequestSignature');
    expect(emailService).toContain("action: 'admin-password-reset-code-sent'");
    expect(emailService).toContain('Password reset code sent, but audit logging failed.');
    expect(emailService).not.toContain('temporary_password');
  });

  it('returns a safe impersonation schema remediation message', () => {
    const expected = 'Impersonation storage schema is missing. Run the Appwrite Hubs workflow for admin-devkit-data/admin-impersonate or run the setup_impersonation_sessions_schema script.';
    expect(read('appwrite-hubs/admin-devkit-data/src/main.js')).toContain(expected);
    expect(read('appwrite-hubs/admin-impersonate/src/main.js')).toContain(expected);
    expect(read('appwrite-hubs/admin-impersonate/src/main.js')).not.toContain('sessionErr.message');
    expect(read('appwrite-hubs/admin-impersonate/src/main.js')).not.toContain('revokeErr.message');
  });
});
