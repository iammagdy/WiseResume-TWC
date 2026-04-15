-- chat_sessions: stores per-user Wise AI chat sessions with optional resume link
CREATE TABLE chat_sessions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resume_id   UUID        REFERENCES resumes(id) ON DELETE SET NULL,
  title       TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_sessions_owner_all"
  ON chat_sessions FOR ALL
  USING (auth.uid() = user_id);

-- chat_messages: individual messages within a session
CREATE TABLE chat_messages (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID        NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role          TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
  content       TEXT        NOT NULL,
  function_call JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_messages_owner_all"
  ON chat_messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM chat_sessions cs
      WHERE cs.id = chat_messages.session_id
        AND cs.user_id = auth.uid()
    )
  );

-- Indexes for read performance
CREATE INDEX chat_sessions_user_updated_idx
  ON chat_sessions (user_id, updated_at DESC);

CREATE INDEX chat_messages_session_created_idx
  ON chat_messages (session_id, created_at ASC);

-- Trigger: enforce 50-session cap per user after insert
CREATE OR REPLACE FUNCTION enforce_session_cap()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM chat_sessions
  WHERE id IN (
    SELECT id FROM chat_sessions
    WHERE user_id = NEW.user_id
    ORDER BY updated_at DESC
    OFFSET 50
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_session_cap
  AFTER INSERT ON chat_sessions
  FOR EACH ROW EXECUTE FUNCTION enforce_session_cap();
