# WiseHire Early Access Code Flow

## What & Why

HR testers who receive an early access code directly from the developer
should be able to bypass the invite-email flow entirely. Instead, they
enter their code on the WiseHire landing page, get validated, sign up via
Kinde, and land in the WiseHire dashboard — fully set up as HR with their
plan active. The code itself is a standard WiseHire coupon created in the
dev kit, so the developer controls duration, usage limits, and expiry from
one place they already have.

The waitlist confirmation email (`wisehire-waitlist-join`) already sends
correctly via Resend. No changes are needed there.

## Done looks like

- The WaitlistModal has a subtle "Already have an early access code?" link
  below the submit button. Clicking it replaces the form with a simple
  two-field input: work email + code.
- Submitting a valid code redirects to `/wisehire/signup-early-access/:code`
  with the email pre-filled as a query param. An invalid or expired code
  shows a clear inline error.
- The early access signup page shows a "Early access confirmed" banner,
  a short explanation, and a form (name, email pre-filled, company name,
  company size) with a "Create your WiseHire account" button.
- Clicking the button triggers Kinde sign-up. After Kinde completes, the
  backend sets `account_type = 'hr'`, creates the `wisehire_companies` row,
  and redeems the coupon (applying whatever plan and duration it carries).
- The user lands on WiseHire onboarding — never on the job seeker side.
- The existing invite-token signup path (`/wisehire/signup?invite=TOKEN`)
  is completely unchanged.
- A WiseHire coupon created in the dev kit (e.g. code `BETA2026`, tier
  `wisehire_professional`, 30 days) works end-to-end as an early access code.

## Out of scope

- Changes to the invite email flow or `admin-wisehire-invite`
- Any UI changes to the dev kit coupon panel (already supports WiseHire tiers)
- Waitlist confirmation email (already implemented and sending)
- Stripe or payment handling

## Tasks

1. **Public validation edge function** — Create `wisehire-validate-early-access`:
   a public endpoint (botGuard, no auth) that accepts a `code`, queries the
   `coupons` table for a row where `is_active = true`, not expired,
   `uses_count < max_uses` (when max_uses > 0), and `plan_override` starts
   with `wisehire_`. Returns `{ valid: boolean, error?: string }`.

2. **WaitlistModal early access toggle** — Add a "Already have an early access
   code?" link below the waitlist submit button. Clicking it swaps the view to
   a two-field form (email + code). On submit, call
   `wisehire-validate-early-access`; if valid, redirect to
   `/wisehire/signup-early-access/{code}?email={email}`; if invalid, show an
   inline error.

3. **Early access signup page** — Create `WiseHireEarlyAccessPage` at
   `/wisehire/signup-early-access/:code` (public route, no guard). On mount,
   re-validate the code via `wisehire-validate-early-access`; show a loading
   state then either a "confirmed" banner + sign-up form (name, email, company
   name, company size) or an error screen with a link back to the landing
   page. The "Create your WiseHire account" button triggers Kinde registration
   with the code and email stored in `sessionStorage` so they survive the
   Kinde redirect. Register the route in `App.tsx`.

4. **Extend `wisehire-complete-signup`** — Accept `early_access_code` as an
   alternative to `invite_token`. When `early_access_code` is present: validate
   the coupon using the service client, set `account_type = 'hr'`, create the
   `wisehire_companies` row (same as invite path), increment `uses_count` on
   the coupon, and upsert the user's subscription row with `plan_override` and
   `plan_days` from the coupon (this is the plan grant — skip the separate
   7-day trial grant for this path). If both params are absent, keep the
   existing 400 error. The invite path is completely unchanged.

## Relevant files

- `supabase/functions/wisehire-waitlist-join/index.ts`
- `supabase/functions/wisehire-validate-invite/index.ts`
- `supabase/functions/wisehire-complete-signup/index.ts`
- `supabase/functions/validate-coupon/index.ts`
- `supabase/functions/redeem-coupon/index.ts`
- `supabase/functions/_shared/botGuard.ts`
- `supabase/functions/_shared/cors.ts`
- `src/components/landing/WaitlistModal.tsx`
- `src/pages/wisehire/WiseHireSignupPage.tsx`
- `src/App.tsx`
