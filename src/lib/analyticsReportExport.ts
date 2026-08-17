export interface AnalyticsReportSummary {
  totalResumes: number;
  averageReadiness: number;
  averageCompleteness: number;
  totalApplications: number;
  dayStreak: number;
  activeInterviewOfferShare: number | null;
  highestReadinessTitle?: string;
  highestReadiness?: number;
  lowestReadinessTitle?: string;
  lowestReadiness?: number;
}

export interface AnalyticsReportInput {
  generatedAt: string;
  summary: AnalyticsReportSummary;
  funnel: Array<{ stage: string; count: number; pct: number }>;
  resumes: Array<{ title: string; readiness: number | null }>;
}

function csvCell(value: string | number | null | undefined): string {
  let text = value == null ? '' : String(value);
  // Prevent spreadsheet software from treating user-controlled resume titles as formulas.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildAnalyticsReportCsv(input: AnalyticsReportInput): string {
  const { summary } = input;
  const rows: Array<Array<string | number | null | undefined>> = [
    ['WiseResume Analytics Report'],
    ['Generated at', input.generatedAt],
    [],
    ['Summary', 'Value'],
    ['Resumes', summary.totalResumes],
    ['Average local readiness', `${summary.averageReadiness}%`],
    ['Average completeness', `${summary.averageCompleteness}%`],
    ['Tracked applications', summary.totalApplications],
    ['Login streak (days)', summary.dayStreak],
    ['Current interview or offer share', summary.activeInterviewOfferShare == null ? 'N/A' : `${summary.activeInterviewOfferShare}%`],
  ];

  if (summary.highestReadinessTitle && summary.highestReadiness != null) {
    rows.push(['Highest readiness resume', summary.highestReadinessTitle]);
    rows.push(['Highest readiness', `${summary.highestReadiness}%`]);
  }
  if (summary.lowestReadinessTitle && summary.lowestReadiness != null) {
    rows.push(['Lowest readiness resume', summary.lowestReadinessTitle]);
    rows.push(['Lowest readiness', `${summary.lowestReadiness}%`]);
  }

  rows.push([], ['Current application statuses', 'Count', 'Share of tracked applications']);
  input.funnel.forEach((stage) => rows.push([stage.stage, stage.count, `${stage.pct}%`]));

  rows.push([], ['Resume', 'Local readiness']);
  input.resumes.forEach((resume) => rows.push([
    resume.title,
    resume.readiness == null ? 'Not calculated' : `${resume.readiness}%`,
  ]));

  return `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
}
