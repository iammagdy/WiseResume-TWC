-- Edge function invocation telemetry log.
-- Written fire-and-forget by _shared/fnLogger.ts on every handled request.
-- Used by admin-observability to compute p50/p95 latency, error rates,
-- and hourly sparkline data for the DevKit Observability panel.

CREATE TABLE IF NOT EXISTS public.edge_function_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT        NOT NULL,
  status_code   INTEGER     NOT NULL DEFAULT 200,
  latency_ms    INTEGER     NOT NULL DEFAULT 0,
  error         BOOLEAN     NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_edge_function_logs_fn_created
  ON public.edge_function_logs (function_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_edge_function_logs_created
  ON public.edge_function_logs (created_at DESC);

ALTER TABLE public.edge_function_logs ENABLE ROW LEVEL SECURITY;

-- Service role only: no public read, no public write.
-- Edge functions use the service key; the admin panel reads via admin-observability.

-- Add reviewed_at to error_log so the Observability panel can mark errors reviewed.
-- This is a nullable column so existing rows are unaffected.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'error_log'
      AND column_name  = 'reviewed_at'
  ) THEN
    ALTER TABLE public.error_log ADD COLUMN reviewed_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
END;
$$;
