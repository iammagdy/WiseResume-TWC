-- Add persisted draft storage to profiles
-- portfolio_draft: JSONB snapshot of all editor state, written on "Save Draft"
-- portfolio_draft_saved_at: timestamp of last draft save
-- When "Publish" is clicked, the draft is expanded into live columns and both columns are cleared.
-- The public portfolio page always reads from the live columns, never from portfolio_draft.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS portfolio_draft JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS portfolio_draft_saved_at TIMESTAMPTZ DEFAULT NULL;

-- Index so we can efficiently find profiles with pending drafts (admin tooling, cleanup jobs)
CREATE INDEX IF NOT EXISTS idx_profiles_portfolio_draft_not_null
  ON profiles (user_id)
  WHERE portfolio_draft IS NOT NULL;
