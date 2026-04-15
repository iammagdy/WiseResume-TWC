-- WiseHire — Drop overly-restrictive CHECK constraint on wisehire_waitlist.company_size
-- The original constraint only accepted short codes ('1-10', '11-50', '51-200', '200+')
-- but the waitlist form sends human-readable labels. Dropping the constraint allows any
-- non-empty string from the form to be stored without a DB-level rejection.

ALTER TABLE public.wisehire_waitlist
  DROP CONSTRAINT IF EXISTS wisehire_waitlist_company_size_check;
