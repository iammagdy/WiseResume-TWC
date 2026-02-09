/**
 * Date utilities for parsing resume dates, calculating durations, and detecting gaps
 */

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
  
  // Try "Month Year" format (e.g., "Jan 2020", "January 2020")
  const monthYearMatch = trimmed.match(/^([a-z]+)\s*(\d{4})$/);
  if (monthYearMatch) {
    const monthStr = monthYearMatch[1];
    const year = parseInt(monthYearMatch[2], 10);
    const month = MONTH_MAP[monthStr];
    if (month !== undefined && !isNaN(year)) {
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
    return { month: 0, year }; // Default to January
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
  if (months < 0) return '';
  if (months === 0) return '< 1 mo';
  
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  
  const parts: string[] = [];
  if (years > 0) {
    parts.push(`${years} yr${years > 1 ? 's' : ''}`);
  }
  if (remainingMonths > 0) {
    parts.push(`${remainingMonths} mo`);
  }
  
  return parts.join(' ');
}

/**
 * Format a date range for display
 */
export function formatDateRange(startDate: string, endDate: string, isCurrent: boolean): string {
  const start = parseResumeDate(startDate);
  const end = isCurrent ? parseResumeDate('Present') : parseResumeDate(endDate);
  
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
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.month]} ${date.year}`;
}

/**
 * Calculate duration string from start/end dates
 */
export function calculateDuration(startDate: string, endDate: string, isCurrent: boolean): string {
  const start = parseResumeDate(startDate);
  const end = isCurrent ? parseResumeDate('Present') : parseResumeDate(endDate);
  
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
    const gapMonths = getMonthsDifference(previousJob.end, currentJob.start);
    
    // Only count gaps of 1+ months
    if (gapMonths >= 1) {
      gaps.push({
        startDate: previousJob.end,
        endDate: currentJob.start,
        months: gapMonths,
      });
    }
  }
  
  return gaps;
}

/**
 * Get total months of gaps
 */
export function getTotalGapMonths(gaps: GapInfo[]): number {
  return gaps.reduce((sum, gap) => sum + gap.months, 0);
}
