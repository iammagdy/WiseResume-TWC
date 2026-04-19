-- Add reminder_sent_at to wisehire_invites
-- Tracks whether a 24-hour expiry reminder has already been sent for an invite.
-- NULL = no reminder sent yet. Populated by the wisehire-invite-reminder edge function.

ALTER TABLE public.wisehire_invites
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS wisehire_invites_reminder_idx
  ON public.wisehire_invites (reminder_sent_at)
  WHERE reminder_sent_at IS NULL;
