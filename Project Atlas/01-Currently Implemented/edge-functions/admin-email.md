# admin-email

  **Last verified:** 2026-04-30
  **Type:** reference card
  **Sources:**
  - `supabase/functions/admin-email/index.ts`
  - `supabase/config.toml` (JWT verification flag)
  - `supabase/functions/_shared/adminAuth.ts`
  - `project-governance/ARCHITECTURE.md` §7

  **Canonical owner:** `project-governance/ARCHITECTURE.md` §7 (Edge Functions)

  ---

  **What it does:** Merged admin email management function. Routes on `body.module`:
  - `'resend-stats'` — fetches Resend account stats (sent, bounced, delivered counts).
  - `'resend-sync'` — syncs Resend bounce/complaint events into the local `email_events` table.
  - `'email-actions'` — sends transactional emails to individual users on admin request. Internal routing via `body.action`: `resend_confirmation`, `send_magic_link`, `send_otp`, `send_password_reset`, `send_custom`. Audit-logs every send to `audit_logs` with `category='admin_email'`, `action=<the_action_name>`, and full metadata (`admin_email`, `audit_user_id_source`, `target_email`, `message_id`, `sent_at`).
  - `'broadcast'` — sends bulk emails to all users or a filtered segment via Resend.

  Replaces four former standalone functions: `admin-resend-stats`, `admin-resend-sync`, `admin-email-actions`, `admin-broadcast`.

  **Auth:** `requireAdminAuth` (admin DevKit password, all modules).

  **Routing discriminator:** `body.module: 'resend-stats' | 'resend-sync' | 'email-actions' | 'broadcast'`

  **Related:**
  - `Project Atlas/01-Currently Implemented/edge-functions/README.md`
  - `Project Atlas/01-Currently Implemented/critical-systems/06-admin-dev-kit.md`
  - `src/components/dev-kit/EmailAutomationsPanel.tsx`
  - `src/components/dev-kit/EmailManagementPanel.tsx`
  - `src/components/dev-kit/OwnerOpsPanel.tsx`
