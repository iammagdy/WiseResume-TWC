-- Add wiseresume_sub_provider column to user_preferences
-- Stores which managed AI engine the user prefers: 'auto', 'openrouter', or 'groq'
-- auto = try OpenRouter first, fall back to Groq

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS wiseresume_sub_provider TEXT DEFAULT 'auto';
