import { memo, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const MONTH_NAME_TO_SHORT: Record<string, string> = {
  january: 'Jan', february: 'Feb', march: 'Mar', april: 'Apr', may: 'May', june: 'Jun',
  july: 'Jul', august: 'Aug', september: 'Sep', october: 'Oct', november: 'Nov', december: 'Dec',
  jan: 'Jan', feb: 'Feb', mar: 'Mar', apr: 'Apr', jun: 'Jun',
  jul: 'Jul', aug: 'Aug', sep: 'Sep', oct: 'Oct', nov: 'Nov', dec: 'Dec',
};

const MONTH_NUM_TO_SHORT: Record<string, string> = {
  '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'May', '06': 'Jun',
  '07': 'Jul', '08': 'Aug', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
  '1': 'Jan', '2': 'Feb', '3': 'Mar', '4': 'Apr', '5': 'May', '6': 'Jun',
  '7': 'Jul', '8': 'Aug', '9': 'Sep',
};

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 60 }, (_, i) => String(CURRENT_YEAR + 5 - i));

/**
 * Robustly parses a legacy free-text date string into { month, year }.
 * Handles formats like: "Jan 2020", "January 2020", "2020", "01/2020",
 * "2020-01", "Present", "Current", "Now", "Q1 2020", ranges with "–"/"-",
 * and plain year-only values.
 */
export function parseDateString(raw: string): { month: string; year: string } {
  if (!raw) return { month: '', year: '' };
  const trimmed = raw.trim();

  if (/^(present|current|now|ongoing|to date)$/i.test(trimmed)) {
    return { month: '', year: '' };
  }

  // If it's a range like "Jan 2020 – Present" or "2018 - 2022", take the first part
  const rangeSplit = trimmed.split(/\s*[-–—]\s*/);
  const firstPart = rangeSplit[0].trim();

  // Try "MM/YYYY" or "M/YYYY"
  const slashMatch = firstPart.match(/^(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const m = MONTH_NUM_TO_SHORT[slashMatch[1]] || '';
    return { month: m, year: slashMatch[2] };
  }

  // Try "YYYY-MM" or "YYYY/MM"
  const isoMatch = firstPart.match(/^(\d{4})[-/](\d{1,2})$/);
  if (isoMatch) {
    const m = MONTH_NUM_TO_SHORT[isoMatch[2]] || '';
    return { month: m, year: isoMatch[1] };
  }

  // Try "YYYY" alone
  if (/^\d{4}$/.test(firstPart)) {
    return { month: '', year: firstPart };
  }

  // Split by whitespace and look for month name + year
  const parts = firstPart.split(/\s+/);

  // "Q1 2020" style — ignore quarter
  if (parts.length === 2 && /^Q[1-4]$/i.test(parts[0]) && /^\d{4}$/.test(parts[1])) {
    return { month: '', year: parts[1] };
  }

  // "Month Year" or "Month YYYY" (1 or 2 tokens)
  for (let i = 0; i < parts.length; i++) {
    const lower = parts[i].toLowerCase();
    if (MONTH_NAME_TO_SHORT[lower]) {
      const monthShort = MONTH_NAME_TO_SHORT[lower];
      const yearToken = parts.find(p => /^\d{4}$/.test(p)) || '';
      return { month: monthShort, year: yearToken };
    }
  }

  // Bare numeric year within part
  const yearMatch = firstPart.match(/\b(\d{4})\b/);
  if (yearMatch) {
    return { month: '', year: yearMatch[1] };
  }

  return { month: '', year: '' };
}

export function buildDateString(month: string, year: string): string {
  if (!month && !year) return '';
  if (month && year) return `${month} ${year}`;
  if (year) return year;
  return month;
}

interface MonthYearPickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const MonthYearPicker = memo(function MonthYearPicker({
  value,
  onChange,
  disabled = false,
}: MonthYearPickerProps) {
  const { month, year } = parseDateString(value);

  const handleMonthChange = useCallback((m: string) => {
    const newVal = m === '__clear__' ? buildDateString('', year) : buildDateString(m, year);
    onChange(newVal);
  }, [year, onChange]);

  const handleYearChange = useCallback((y: string) => {
    const newVal = y === '__clear__' ? buildDateString(month, '') : buildDateString(month, y);
    onChange(newVal);
  }, [month, onChange]);

  return (
    <div className="flex gap-2">
      <Select
        value={month || '__clear__'}
        onValueChange={handleMonthChange}
        disabled={disabled}
      >
        <SelectTrigger className="h-11 flex-1 min-w-0 text-sm">
          <SelectValue placeholder="Month" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__clear__">
            <span className="text-muted-foreground italic">Month</span>
          </SelectItem>
          {MONTHS_SHORT.map(m => (
            <SelectItem key={m} value={m}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={year || '__clear__'}
        onValueChange={handleYearChange}
        disabled={disabled}
      >
        <SelectTrigger className="h-11 flex-1 min-w-0 text-sm">
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__clear__">
            <span className="text-muted-foreground italic">Year</span>
          </SelectItem>
          {YEARS.map(y => (
            <SelectItem key={y} value={y}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
});
