# Auth — Appwrite Account SDK

**Last verified:** 2026-05-09
**Type:** deep dive
**Sources:**
- `src/lib/appwrite.ts` — Appwrite client (`account`, `databases`, `functions`, `storage`)
- `src/contexts/AuthContext.tsx` — Appwrite-only auth context (`AppUser` shape)
- `src/pages/AuthPage.tsx` — sign-in, sign-up, forgot-password, claim-account views
- `src/pages/AuthResetPasswordPage.tsx` — password reset completion page
- `src/hooks/useAuth.ts` — thin hook over `AuthContext`

---

## Overview

Authentication is handled entirely by the **Appwrite Account SDK** (client-side, no proxy). The Kinde + Supabase token-exchange bridge documented in the previous version of this card has been removed.

## Sign-in / Sign-up

`AuthPage.tsx` manages four views via local state (`'login' | 'register' | 'forgot-password' | 'claim-account'`):

| View | Appwrite call |
|------|---------------|
| `login` | `account.createEmailPasswordSession(email, password)` |
| `register` | `account.create(ID.unique(), email, password, name)` then `createEmailPasswordSession` |
| `forgot-password` | `account.createRecovery(email, resetUrl)` — sends recovery email |
| `claim-account` | same as forgot-password — for migrated users whose Appwrite account doesn't exist yet |

## Password recovery flow

1. User clicks "Forgot password?" → enters email → `account.createRecovery(email, '/auth/reset-password')`.
2. Appwrite sends a recovery email containing a link like `https://thewise.cloud/auth/reset-password?userId=xxx&secret=yyy`.
3. `AuthResetPasswordPage` reads `userId` + `secret` from query params, shows a new-password form.
4. On submit → `account.updateRecovery(userId, secret, newPassword)`.
5. Success state → user redirected to `/auth?mode=login`.

The secret is single-use and time-limited by Appwrite (default 1 hour). If either param is missing the page shows an "invalid link" fallback.

## Session management

`AuthContext.tsx` calls `account.get()` on mount to restore the current session. Sign-out calls `account.deleteSession('current')` then hard-redirects to `/`.

## AppUser shape

```ts
interface AppUser {
  id: string;    // Appwrite $id
  email: string;
  name?: string;
}
```

## Impersonation

DevKit impersonation state is managed by `src/lib/impersonationStore.ts` and merged into `AuthContext` — if impersonating, `user.id` is the impersonated user's Appwrite `$id`.
