/**
 * Schema-tolerant inserts for `cover_letters` and `resignation_letters`.
 *
 * Two schema shapes exist for these tables in the wild:
 *
 *   "old" (live in production today, created in the early 2026-02 migrations):
 *     cover_letters       — content TEXT, requires job_title NOT NULL
 *     resignation_letters — content TEXT, last_working_day, reason, additions jsonb
 *
 *   "new" (described in 20260418195802_letters_persistence.sql, applied with
 *          IF NOT EXISTS so it's a no-op when the old tables already exist):
 *     cover_letters       — content JSONB, title NOT NULL DEFAULT, position,
 *                           job_description, job_application_id, model_used,
 *                           metadata
 *     resignation_letters — content JSONB, current_role, reason_category,
 *                           effective_date, model_used, metadata
 *
 * To work in both worlds, we attempt the old-shape insert first (matches the
 * deployed schema), and on a missing-column error retry with the new-shape
 * payload. Returns the inserted row id, or throws.
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

function isMissingColumnError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  // PostgREST reports "column ... does not exist" with code 42703 (Postgres
  // undefined_column) or PGRST204 (column not found in schema cache).
  const code = (err as { code?: string }).code;
  const message = String((err as { message?: string }).message || '');
  return (
    code === '42703' ||
    code === 'PGRST204' ||
    /column .* does not exist/i.test(message) ||
    /Could not find .* column/i.test(message)
  );
}

export interface CoverLetterInput {
  userId: string;
  content: string;
  jobTitle?: string;
  company?: string;
  tone?: string;
  templateStyle?: string;
  resumeId?: string;
  jobApplicationId?: string;
  jobDescription?: string;
  title?: string;
  modelUsed?: string;
}

export async function insertCoverLetter(
  db: SupabaseClient,
  input: CoverLetterInput,
): Promise<string> {
  const resolvedTitle =
    input.title ||
    (input.jobTitle ? `${input.jobTitle}${input.company ? ` - ${input.company}` : ''}` : null);

  // ── Attempt 1: old schema (production today) ─────────────────────────────
  const oldRow: Record<string, unknown> = {
    user_id: input.userId,
    job_title: input.jobTitle?.trim() || 'Untitled',
    company: input.company || null,
    tone: input.tone || 'professional',
    content: input.content,
  };
  if (input.resumeId) oldRow.resume_id = input.resumeId;
  if (resolvedTitle) oldRow.title = resolvedTitle;
  if (input.templateStyle) oldRow.template_style = input.templateStyle;

  const first = await db
    .from('cover_letters')
    .insert(oldRow)
    .select('id')
    .single();
  if (!first.error) return first.data!.id as string;
  if (!isMissingColumnError(first.error)) throw first.error;

  // ── Attempt 2: new schema (jsonb content, title NOT NULL, no job_title) ──
  const newRow: Record<string, unknown> = {
    user_id: input.userId,
    title: resolvedTitle || input.jobTitle || 'Cover Letter',
    company: input.company || null,
    position: input.jobTitle || null,
    tone: input.tone || 'professional',
    content: { text: input.content },
  };
  if (input.resumeId) newRow.resume_id = input.resumeId;
  if (input.jobApplicationId) newRow.job_application_id = input.jobApplicationId;
  if (input.jobDescription) newRow.job_description = input.jobDescription;
  if (input.modelUsed) newRow.model_used = input.modelUsed;

  const second = await db
    .from('cover_letters')
    .insert(newRow)
    .select('id')
    .single();
  if (second.error) throw second.error;
  return second.data!.id as string;
}

export interface ResignationLetterInput {
  userId: string;
  content: string;
  company: string;
  title?: string;
  recipientName?: string;
  position?: string;
  noticePeriod?: string;
  reason?: string;
  tone?: string;
  templateStyle?: string;
  effectiveDate?: string; // yyyy-MM-dd
  additions?: string[];
  modelUsed?: string;
}

export async function insertResignationLetter(
  db: SupabaseClient,
  input: ResignationLetterInput,
): Promise<string> {
  const title = input.title || `${input.company} Resignation`;

  // ── Attempt 1: old schema ────────────────────────────────────────────────
  const oldRow: Record<string, unknown> = {
    user_id: input.userId,
    title,
    recipient_name: input.recipientName || null,
    company: input.company,
    position: input.position || null,
    notice_period: input.noticePeriod || '2_weeks',
    reason: input.reason || null,
    tone: input.tone || 'professional',
    template_style: input.templateStyle || 'standard',
    additions: input.additions || [],
    content: input.content,
  };
  if (input.effectiveDate && /^\d{4}-\d{2}-\d{2}$/.test(input.effectiveDate)) {
    oldRow.last_working_day = input.effectiveDate;
  }

  const first = await db
    .from('resignation_letters')
    .insert(oldRow)
    .select('id')
    .single();
  if (!first.error) return first.data!.id as string;
  if (!isMissingColumnError(first.error)) throw first.error;

  // ── Attempt 2: new schema (jsonb content, current_role, reason_category, effective_date) ──
  const newRow: Record<string, unknown> = {
    user_id: input.userId,
    title,
    recipient_name: input.recipientName || null,
    current_role: input.position || null,
    company: input.company,
    notice_period: input.noticePeriod || '2_weeks',
    reason_category: input.reason || null,
    tone: input.tone || 'professional',
    content: { text: input.content },
  };
  if (input.effectiveDate && /^\d{4}-\d{2}-\d{2}$/.test(input.effectiveDate)) {
    newRow.effective_date = input.effectiveDate;
  }
  if (input.modelUsed) newRow.model_used = input.modelUsed;
  if (input.additions && input.additions.length > 0) {
    newRow.metadata = { additions: input.additions, template_style: input.templateStyle };
  }

  const second = await db
    .from('resignation_letters')
    .insert(newRow)
    .select('id')
    .single();
  if (second.error) throw second.error;
  return second.data!.id as string;
}
