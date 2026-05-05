-- tool_cache: server-side cache for expensive AI tool outputs (Phase 3)
-- Stores results keyed by tool_name + cache_key (e.g. normalized company name) with a TTL.
CREATE TABLE tool_cache (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_name   TEXT        NOT NULL,
  cache_key   TEXT        NOT NULL,
  output      JSONB       NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL
);

ALTER TABLE tool_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tool_cache_owner_all" ON tool_cache;
CREATE POLICY "tool_cache_owner_all"
  ON tool_cache FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Unique active entry per user + tool + key (upsert-friendly)
CREATE UNIQUE INDEX tool_cache_user_tool_key_idx
  ON tool_cache (user_id, tool_name, cache_key);

-- Fast lookup by expiry for pruning expired rows
CREATE INDEX tool_cache_expires_idx
  ON tool_cache (expires_at);
