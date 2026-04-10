-- Add wiseresume_sub_provider column to user_preferences
-- Stores which managed AI engine the user prefers: 'auto', 'openrouter', or 'groq'
-- auto = try OpenRouter first, fall back to Groq

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS wiseresume_sub_provider TEXT DEFAULT 'auto';

ALTER TABLE user_preferences
  DROP CONSTRAINT IF EXISTS user_preferences_wiseresume_sub_provider_check;

ALTER TABLE user_preferences
  ADD CONSTRAINT user_preferences_wiseresume_sub_provider_check
    CHECK (wiseresume_sub_provider IN ('auto', 'openrouter', 'groq'));
