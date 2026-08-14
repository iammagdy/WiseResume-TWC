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
    expect(workflow).toContain("contains(fromJSON(steps.targets.outputs.targets_json), 'admin-devkit-data')");
    expect(workflow).toContain("contains(fromJSON(steps.targets.outputs.targets_json), 'admin-impersonate')");
  });

  it('creates security schema compatibly and waits for attribute readiness before indexes', () => {
    const schema = read('scripts/setup-security-collections.cjs');
    const readinessWait = schema.indexOf('await waitForAttribute(collectionId, attr.key);');
    const indexLoop = schema.indexOf('for (const idx of indexes)');

    expect(schema).toContain("{ type: 'integer', key: 'question_count', required: false, min: 0, max: 10 }");
    expect(schema).not.toContain("key: 'question_count', required: true, min: 0, max: 10, defaultVal: 0");
    expect(read('appwrite-hubs/ai-gateway/src/main.js')).toContain('db.updateDocument(DB_ID, collectionId, documentId, { [attribute]: 0 })');
    expect(schema).toContain('const ATTRIBUTE_WAIT_ATTEMPTS = 60;');
    expect(schema).toContain("attribute?.status === 'available'");
    expect(readinessWait).toBeGreaterThan(-1);
    expect(indexLoop).toBeGreaterThan(readinessWait);
    expect(schema).toContain('Run before deploying affected hubs');
    expect(schema).not.toContain('Run once after deployment');
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

  it('uses an authenticated send-link admin reset action routed through admin-devkit-data', () => {
    const devkitData = read('appwrite-hubs/admin-devkit-data/src/main.js');
    const emailService = read('appwrite-hubs/email-service/src/main.js');
    const drawer = read('src/components/dev-kit/UserDetailDrawer.tsx');

    expect(drawer).toContain("action: 'send-admin-password-reset-link'");
    expect(drawer).toContain("target_user_id: user.user_id");
    expect(drawer).toContain("unwrapAdminResponse<{ warning?: string }>(tuple, 'admin-devkit-data')");

    expect(devkitData).toContain("action === 'send-admin-password-reset-link'");
    expect(devkitData).toContain('signInternalRequest');
    expect(devkitData).toContain("action: 'internal-send-admin-password-reset-link'");

    expect(emailService).toContain("case 'internal-send-admin-password-reset-link'");
    expect(emailService).toContain('handleInternalSendAdminPasswordResetLink');
    expect(emailService).toContain('verifyInternalRequestSignature');
    expect(emailService).toContain("action: 'admin-password-reset-link-sent'");
    expect(emailService).toContain('Password reset link sent, but audit logging failed.');
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
