/**
 * Date utilities for parsing resume dates, calculating durations, and detecting gaps
 */

import { format as dateFnsFormat, formatDistanceToNow as dateFnsDistanceToNow, isValid, parseISO } from 'date-fns';
import { LOCALE_STORAGE_KEY, normalizeLocale } from '@/i18n/core';

const MONTH_MAP: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

export interface ParsedDate {
  month: number; // 0-11
  year: number;
  isPresent?: boolean;
  /** True when the source string was year-only (e.g. "2020") — display as year, not Jan */
  yearOnly?: boolean;
}

export interface DateRange {
  start: ParsedDate | null;
  end: ParsedDate | null;
}

export interface GapInfo {
  startDate: ParsedDate;
  endDate: ParsedDate;
  months: number;
}

/**
 * Parse a date string like "Jan 2020", "January 2020", "2020-01", or "Present"
 */
export function parseResumeDate(dateStr: string): ParsedDate | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  
  const trimmed = dateStr.trim().toLowerCase();
  
  // Handle "Present" or "Current"
  if (trimmed === 'present' || trimmed === 'current' || trimmed === 'now') {
    const now = new Date();
    return { month: now.getMonth(), year: now.getFullYear(), isPresent: true };
  }
  
  // Try "Month Year" format (e.g., "Jan 2020", "Jan, 2020", "Jan. 2020")
  const monthYearMatch = trimmed.match(/^([a-z]+)[.,]?\s*(\d{4})$/);
  if (monthYearMatch) {
    const monthStr = monthYearMatch[1];
    const year = parseInt(monthYearMatch[2], 10);
    const month = MONTH_MAP[monthStr];
    if (month !== undefined && !isNaN(year)) {
      return { month, year };
    }
  }

  // Try "MM/YYYY" format (e.g., "05/2020", "5/2020")
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const month = parseInt(slashMatch[1], 10) - 1; // Convert 1-12 to 0-11
    const year = parseInt(slashMatch[2], 10);
    if (!isNaN(year) && month >= 0 && month <= 11) {
      return { month, year };
    }
  }
  
  // Try "Year-Month" format (e.g., "2020-01")
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1; // Convert 1-12 to 0-11
    if (!isNaN(year) && month >= 0 && month <= 11) {
      return { month, year };
    }
  }
  
  // Try just year (e.g., "2020")
  const yearMatch = trimmed.match(/^(\d{4})$/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1], 10);
    return { month: 0, year, yearOnly: true };
  }
  
  return null;
}

/**
 * Calculate the difference in months between two dates
 */
export function getMonthsDifference(start: ParsedDate, end: ParsedDate): number {
  return (end.year - start.year) * 12 + (end.month - start.month);
}

/**
 * Format a duration in months to a human-readable string
 */
export function formatDuration(months: number): string {
  const m = Math.round(months);
  if (m < 0) return '';
  if (m === 0) return 'Less than 1 month';
  
  const years = Math.floor(m / 12);
  const remainingMonths = m % 12;
  
  const parts: string[] = [];
  if (years > 0) {
    parts.push(`${years} ${years === 1 ? 'year' : 'years'}`);
  }
  if (remainingMonths > 0) {
    parts.push(`${remainingMonths} ${remainingMonths === 1 ? 'month' : 'months'}`);
  }
  
  return parts.join(' ');
}

/**
 * Format a date range for display
 */
export function formatDateRange(startDate: string, endDate: string, isCurrent: boolean): string {
  const ongoing = isOngoingDateRange(startDate, endDate, isCurrent);
  const start = parseResumeDate(startDate);
  const end = ongoing ? parseResumeDate('Present') : parseResumeDate(endDate);

  if (!start) return '';

  const startStr = formatMonthYear(start);
  const endStr = end?.isPresent ? 'Present' : (end ? formatMonthYear(end) : '');

  if (!endStr) {
    return startStr;
  }

  return `${startStr} – ${endStr}`;
}

/**
 * Format a ParsedDate as "Mon YYYY"
 */
function formatMonthYear(date: ParsedDate): string {
  if (date.yearOnly) return String(date.year);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.month]} ${date.year}`;
}

function isPresentEndDate(endDate: string): boolean {
  const t = endDate.trim().toLowerCase();
  return t === 'present' || t === 'current' || t === 'now';
}

/** Ongoing role: explicit flag, Present end string, or open-ended (start with no end). */
export function isOngoingDateRange(
  startDate: string,
  endDate: string,
  isCurrent: boolean,
): boolean {
  if (isCurrent || isPresentEndDate(endDate)) return true;
  return !!startDate.trim() && !endDate.trim();
}

/**
 * Format a raw date string (e.g. "2013-12", "Jan 2020", "Present") into "Mon YYYY" for display
 */
export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const parsed = parseResumeDate(dateStr);
  if (!parsed) return dateStr;
  if (parsed.isPresent) return 'Present';
  return formatMonthYear(parsed);
}

/**
 * Format a date range for inline display, returning null when both dates are
 * empty so callers can avoid orphaned separators (e.g. " – Present" with an
 * empty start). When only one side is present, only that side is rendered.
 */
export function formatDateRangeDisplay(
  startDate: string,
  endDate: string,
  isCurrent: boolean,
  options: { separator?: string; presentLabel?: string } = {}
): string | null {
  const separator = options.separator ?? '–';
  const presentLabel = options.presentLabel ?? 'Present';
  const ongoing = isOngoingDateRange(startDate, endDate, isCurrent);
  const start = formatDisplayDate(startDate);
  const end = ongoing ? presentLabel : formatDisplayDate(endDate);
  if (!start && !end) return null;
  if (start && end) return `${start} ${separator} ${end}`;
  return start || end;
}

/**
 * Calculate duration string from start/end dates
 */
export function calculateDuration(startDate: string, endDate: string, isCurrent: boolean): string {
  const start = parseResumeDate(startDate);
  const ongoing = isOngoingDateRange(startDate, endDate, isCurrent);
  const end = ongoing ? parseResumeDate('Present') : parseResumeDate(endDate);
  
  if (!start || !end) return '';
  
  const months = getMonthsDifference(start, end);
  return formatDuration(months);
}

/**
 * Compare two ParsedDates (for sorting)
 */
export function compareDates(a: ParsedDate, b: ParsedDate): number {
  if (a.year !== b.year) return a.year - b.year;
  return a.month - b.month;
}

/**
 * B14: true when an end date is chronologically before its start date (and the
 * entry is not marked current). Used to surface a soft, non-blocking warning in
 * the editor section forms so reversed ranges aren't silently exported.
 */
export function isReversedDateRange(
  startDate?: string,
  endDate?: string,
  isCurrent?: boolean,
): boolean {
  if (isCurrent || !startDate || !endDate) return false;
  const start = parseResumeDate(startDate);
  const end = parseResumeDate(endDate);
  if (!start || !end) return false;
  return compareDates(end, start) < 0;
}

/**
 * Detect gaps between jobs
 */
export function detectGaps(
  experiences: Array<{ startDate: string; endDate: string; current: boolean }>
): GapInfo[] {
  const gaps: GapInfo[] = [];
  
  // Parse and sort experiences by start date (most recent first)
  const parsed = experiences
    .map((exp) => ({
      start: parseResumeDate(exp.startDate),
      end: exp.current ? parseResumeDate('Present') : parseResumeDate(exp.endDate),
    }))
    .filter((p): p is { start: ParsedDate; end: ParsedDate } => p.start !== null && p.end !== null)
    .sort((a, b) => compareDates(b.start, a.start)); // Sort descending (most recent first)
  
  // Find gaps between consecutive jobs
  for (let i = 0; i < parsed.length - 1; i++) {
    const currentJob = parsed[i];
    const previousJob = parsed[i + 1];
    
    // Gap is between previous job's end and current job's start
    // Subtract 1 because adjacent months (diff=1) means 0 months gap
    const gapMonths = getMonthsDifference(previousJob.end, currentJob.start) - 1;
    
    // Only flag gaps of 3+ months — shorter gaps are normal job-transition breaks
    if (gapMonths >= 3) {
      gaps.push({
        startDate: previousJob.end,
        endDate: currentJob.start,
        months: gapMonths,
      });
    }
  }
  
  return gaps;
}

/** Match a detected gap to the interval between two consecutive jobs (chronological order). */
export function findGapBetweenJobs(
  gaps: GapInfo[],
  previousJobEnd: ParsedDate,
  nextJobStart: ParsedDate,
): GapInfo | undefined {
  return gaps.find((g) => gapsAreSame(g, { startDate: previousJobEnd, endDate: nextJobStart, months: 0 }));
}

export function gapsAreSame(a: GapInfo, b: GapInfo): boolean {
  return (
    compareDates(a.startDate, b.startDate) === 0 && compareDates(a.endDate, b.endDate) === 0
  );
}

export function findGapIndexInList(gaps: GapInfo[], target: GapInfo): number {
  return gaps.findIndex((g) => gapsAreSame(g, target));
}

/** Oldest gap first — matches left-to-right timeline reading order. */
export function sortGapsChronologically(gaps: GapInfo[]): GapInfo[] {
  return [...gaps].sort((a, b) => compareDates(a.startDate, b.startDate));
}

const MONTH_LABELS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Display a ParsedDate from Gap Finder (respects year-only). */
export function formatParsedGapDate(date: ParsedDate): string {
  if (date.isPresent) return 'Present';
  if (date.yearOnly) return String(date.year);
  return `${MONTH_LABELS_SHORT[date.month]} ${date.year}`;
}

/**
 * Get total months of gaps
 */
export function getTotalGapMonths(gaps: GapInfo[]): number {
  if (!gaps || !Array.isArray(gaps)) return 0;
  return gaps.reduce((sum, gap) => sum + Math.max(0, gap.months), 0);
}

// ---------------------------------------------------------------------------
// Safe date-fns wrappers — never throw RangeError on null/undefined/invalid
// ---------------------------------------------------------------------------

function toValidDate(value: string | number | Date | null | undefined): Date | null {
  if (value == null) return null;
  let d: Date;
  if (value instanceof Date) {
    d = value;
  } else if (typeof value === 'number') {
    d = new Date(value);
  } else {
    d = parseISO(String(value));
    if (!isValid(d)) d = new Date(String(value));
  }
  return isValid(d) ? d : null;
}

function readRelativeLocale(): 'en' | 'ar' {
  if (typeof document !== 'undefined') {
    const fromDom = normalizeLocale(document.documentElement.lang || document.documentElement.dataset.locale);
    if (fromDom) return fromDom;
  }
  if (typeof localStorage !== 'undefined') {
    try {
      const stored = normalizeLocale(localStorage.getItem(LOCALE_STORAGE_KEY));
      if (stored) return stored;
    } catch {
      // ignore storage access failures
    }
  }
  if (typeof navigator !== 'undefined') {
    for (const lang of navigator.languages ?? []) {
      const normalized = normalizeLocale(lang);
      if (normalized) return normalized;
    }
  }
  return 'en';
}

function formatRelativeTimeIntl(target: Date, locale: 'en' | 'ar', addSuffix: boolean): string {
  const diffSeconds = Math.round((target.getTime() - Date.now()) / 1000);
  const absSeconds = Math.abs(diffSeconds);

  const unitTable: Array<{ limit: number; divisor: number; unit: Intl.RelativeTimeFormatUnit }> = [
    { limit: 60, divisor: 1, unit: 'second' },
    { limit: 3600, divisor: 60, unit: 'minute' },
    { limit: 86400, divisor: 3600, unit: 'hour' },
    { limit: 2592000, divisor: 86400, unit: 'day' },
    { limit: 31536000, divisor: 2592000, unit: 'month' },
    { limit: Number.POSITIVE_INFINITY, divisor: 31536000, unit: 'year' },
  ];

  const match = unitTable.find((entry) => absSeconds < entry.limit) ?? unitTable[unitTable.length - 1];
  const value = Math.round(diffSeconds / match.divisor);
  const rtf = new Intl.RelativeTimeFormat(locale === 'ar' ? 'ar' : 'en', {
    numeric: 'auto',
    style: 'long',
  });
  return addSuffix ? rtf.format(value, match.unit) : rtf.formatToParts(value, match.unit).map((part) => part.value).join('');
}

/**
 * Safe wrapper around date-fns `format`. Returns `fallback` when `value` is
 * null, undefined, or cannot be parsed into a valid Date.
 */
export function safeFormatDate(
  value: string | number | Date | null | undefined,
  fmt: string,
  fallback = '—',
): string {
  const d = toValidDate(value);
  return d ? dateFnsFormat(d, fmt) : fallback;
}

/**
 * Safe wrapper around date-fns `formatDistanceToNow`. Returns `fallback` when
 * `value` is null, undefined, or cannot be parsed into a valid Date.
 */
export function safeFormatDistanceToNow(
  value: string | number | Date | null | undefined,
  opts?: Parameters<typeof dateFnsDistanceToNow>[1],
  fallback = '—',
): string {
  const d = toValidDate(value);
  if (!d) return fallback;
  const locale = readRelativeLocale();
  if (locale === 'ar') {
    return formatRelativeTimeIntl(d, locale, Boolean(opts?.addSuffix));
  }
  return dateFnsDistanceToNow(d, opts);
}
