/**
 * Shared user provisioning helper for Kinde-to-Supabase identity bridging.
 *
 * Called by:
 *   - token-exchange/index.ts  (JIT provisioning on first login)
 *   - kinde-webhook/index.ts   (instant provisioning on Kinde signup event)
 *   - admin-kinde-reconcile/index.ts (backfill for existing Kinde users)
 *
 * Guarantees that after a successful call, the following rows exist:
 *   auth.users, public.profiles, public.user_preferences
 *
 * Cleanup contract: if auth.users is freshly created but the profile or
 * preferences upsert subsequently fails, the orphaned auth.users row is
 * deleted before the error is thrown so callers always see a clean state.
 */

import { getServiceClient } from './dbClient.ts';

/** DNS namespace UUID used for deterministic v5 generation (RFC 4122). */
export const KINDE_UUID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

/** Generate a deterministic UUID v5 from a Kinde sub + fixed namespace. */
export async function uuidV5(name: string, namespace: string): Promise<string> {
  const nsBytes = new Uint8Array(16);
  const hex = namespace.replace(/-/g, '');
  for (let i = 0; i < 16; i++) {
    nsBytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  const nameBytes = new TextEncoder().encode(name);
  const data = new Uint8Array(nsBytes.length + nameBytes.length);
  data.set(nsBytes);
  data.set(nameBytes, nsBytes.length);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashBytes = new Uint8Array(hashBuffer);
  hashBytes[6] = (hashBytes[6] & 0x0f) | 0x50;
  hashBytes[8] = (hashBytes[8] & 0x3f) | 0x80;
  const hex2 = Array.from(hashBytes.slice(0, 16))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${hex2.slice(0, 8)}-${hex2.slice(8, 12)}-${hex2.slice(12, 16)}-${hex2.slice(16, 20)}-${hex2.slice(20, 32)}`;
}

/** Derive the deterministic Supabase UUID from a Kinde subject claim. */
export async function kindeSubToUserId(kindeSub: string): Promise<string> {
  return uuidV5(kindeSub, KINDE_UUID_NAMESPACE);
}

export type ProvisionResult = {
  userId: string;
  /** true when the auth.users row already existed before this call */
  alreadyExisted: boolean;
};

export class ProvisionError extends Error {
  constructor(
    public readonly code: string,
    public readonly httpStatus: number,
    message: string,
  ) {
    super(message);
    this.name = 'ProvisionError';
  }
}

/**
 * Idempotently provision all required rows for a Kinde user.
 *
 * @param serviceClient  Service-role Supabase client.
 * @param kindeSub       Kinde `sub` claim (e.g. "kp_...").
 * @param email          User's email address, or empty string if unknown.
 * @param emailVerified  Whether Kinde has verified the email address.
 *
 * @throws ProvisionError on non-recoverable failures.
 */
export async function provisionUser(
  serviceClient: ReturnType<typeof getServiceClient>,
  kindeSub: string,
  email: string,
  emailVerified: boolean,
): Promise<ProvisionResult> {
  const userId = await kindeSubToUserId(kindeSub);
  const targetEmail = email || `${kindeSub}@kinde.placeholder`;

  // ── Step 1: create shadow user in auth.users ──────────────────────────────
  const createPayload: { id: string; email: string; email_confirm?: boolean } = {
    id: userId,
    email: targetEmail,
  };
  if (emailVerified) {
    createPayload.email_confirm = true;
  }

  const { data: createData, error: createError } =
    await serviceClient.auth.admin.createUser(createPayload);

  let alreadyExisted = false;
  let freshlyCreated = false;

  if (createError) {
    const msg = createError.message?.toLowerCase() ?? '';
    const isDuplicate =
      msg.includes('already') || msg.includes('duplicate') || msg.includes('exists');

    if (isDuplicate) {
      // Confirm the duplicate really is our deterministic row (not an email collision).
      const { data: existing, error: getErr } =
        await serviceClient.auth.admin.getUserById(userId);
      if (getErr || !existing?.user) {
        // A different row owns this email — deterministic-ID collision.
        console.error(
          '[provisionUser] EMAIL_COLLISION: createUser reported duplicate but getUserById missing',
          { kindeSub, userId, email: targetEmail },
        );
        throw new ProvisionError(
          'EMAIL_COLLISION',
          409,
          'An existing account uses this email. Please contact support.',
        );
      }
      alreadyExisted = true;
    } else {
      // Unexpected createUser failure — verify whether the row appeared anyway.
      const { data: existing, error: getErr } =
        await serviceClient.auth.admin.getUserById(userId);
      if (getErr || !existing?.user) {
        console.error('[provisionUser] SHADOW_USER_FAILED', {
          kindeSub,
          userId,
          errorMsg: createError.message,
        });
        throw new ProvisionError(
          'SHADOW_USER_FAILED',
          500,
          'Could not create or verify shadow user account',
        );
      }
      // Row exists despite the error (race condition / transient) — treat as existing.
      alreadyExisted = true;
    }
  } else {
    freshlyCreated = true;
    console.log('[provisionUser] shadow user created', {
      userId,
      id: createData?.user?.id,
    });
  }

  // ── Step 2: upsert public.profiles ───────────────────────────────────────
  const profileRow: Record<string, unknown> = { user_id: userId };
  if (email) profileRow.contact_email = email;

  const { error: profileError } = await serviceClient
    .from('profiles')
    .upsert(profileRow, { onConflict: 'user_id' });

  if (profileError) {
    console.error('[provisionUser] PROFILE_UPSERT_FAILED', {
      userId,
      errorMsg: profileError.message,
    });
    if (freshlyCreated) {
      // Clean up the orphaned auth.users row so the user can retry cleanly.
      await serviceClient.auth.admin.deleteUser(userId).catch((e) =>
        console.warn('[provisionUser] cleanup deleteUser failed', e)
      );
    }
    throw new ProvisionError('PROFILE_UPSERT_FAILED', 500, 'Could not create user profile');
  }

  // ── Step 3: upsert public.user_preferences ────────────────────────────────
  const { error: prefsError } = await serviceClient
    .from('user_preferences')
    .upsert({ user_id: userId }, { onConflict: 'user_id' });

  if (prefsError) {
    console.error('[provisionUser] PREFS_UPSERT_FAILED', {
      userId,
      errorMsg: prefsError.message,
    });
    if (freshlyCreated) {
      await serviceClient.auth.admin.deleteUser(userId).catch((e) =>
        console.warn('[provisionUser] cleanup deleteUser failed', e)
      );
    }
    throw new ProvisionError(
      'PREFS_UPSERT_FAILED',
      500,
      'Could not create user preferences',
    );
  }

  // ── Step 4: upsert public.subscriptions (free plan default) ──────────────
  // On conflict we do nothing so existing paid/trial rows are never overwritten.
  const { error: subError } = await serviceClient
    .from('subscriptions')
    .upsert(
      { user_id: userId, plan_name: 'free', status: 'active' },
      { onConflict: 'user_id', ignoreDuplicates: true },
    );

  if (subError) {
    // Non-fatal: a missing subscriptions row is handled gracefully elsewhere
    // (admin-list-users defaults to free). Log but do not fail or roll back.
    console.warn('[provisionUser] subscriptions upsert failed (non-fatal)', {
      userId,
      errorMsg: subError.message,
    });
  }

  return { userId, alreadyExisted };
}
