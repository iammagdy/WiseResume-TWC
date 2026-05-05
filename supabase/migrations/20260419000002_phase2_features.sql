-- Phase 2 feature tables: Resume Snapshots, Interview Answer Library, Interview Report Tokens
-- Idempotent: DROP POLICY IF EXISTS before each CREATE POLICY so re-application is safe.

-- ── Resume Snapshots ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.resume_snapshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resume_id     UUID REFERENCES public.resumes(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  resume_json   JSONB NOT NULL,
  ats_score     INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.resume_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own resume snapshots" ON public.resume_snapshots;
CREATE POLICY "Users can manage own resume snapshots"
  ON public.resume_snapshots
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS resume_snapshots_user_id_idx ON public.resume_snapshots(user_id);
CREATE INDEX IF NOT EXISTS resume_snapshots_resume_id_idx ON public.resume_snapshots(resume_id);

-- ── Interview Answer Library ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.interview_answers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id      UUID REFERENCES public.interview_sessions(id) ON DELETE SET NULL,
  question_text   TEXT NOT NULL,
  answer_text     TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'General',
  role_context    TEXT,
  score           INTEGER,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.interview_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own interview answers" ON public.interview_answers;
CREATE POLICY "Users can manage own interview answers"
  ON public.interview_answers
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS interview_answers_user_id_idx ON public.interview_answers(user_id);
CREATE INDEX IF NOT EXISTS interview_answers_session_id_idx ON public.interview_answers(session_id);

-- ── Interview Report Tokens (Shareable Report Cards) ─────────────────
CREATE TABLE IF NOT EXISTS public.interview_report_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id  UUID REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,
  report_data JSONB NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.interview_report_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own report tokens" ON public.interview_report_tokens;
CREATE POLICY "Users can manage own report tokens"
  ON public.interview_report_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Note: "Anyone can read non-expired report tokens" is intentionally NOT created here.
-- It was removed by 20260419000004_phase2_security_fix.sql for security reasons.
-- Do not add it back.

CREATE INDEX IF NOT EXISTS interview_report_tokens_token_idx ON public.interview_report_tokens(token);
CREATE INDEX IF NOT EXISTS interview_report_tokens_user_id_idx ON public.interview_report_tokens(user_id);
