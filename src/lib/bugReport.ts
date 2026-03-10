import type { LucideIcon } from 'lucide-react';
import { Wifi, Sparkles, Save, FileDown, ShieldAlert, AlertCircle } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────

export interface BugReportData {
  errorMessage: string;
  errorStack?: string;
  componentStack?: string;
  route: string;
  action?: string; // e.g. "saving resume", "generating AI content"
  source?: 'shake' | 'error' | 'manual';
  detectedContext?: {
    activeFeature: string | null;
    recentErrors: Array<{ message: string; stack?: string; timestamp: number }>;
  };
}

export type ErrorCategory = 'network' | 'ai' | 'save' | 'export' | 'auth' | 'general';

export interface ErrorCategoryInfo {
  category: ErrorCategory;
  label: string;
  icon: LucideIcon;
}

// ── Screen matching ────────────────────────────────────────────────────────

const SCREEN_MAP: { prefix: string; label: string }[] = [
  { prefix: '/editor', label: 'Resume Editor' },
  { prefix: '/preview', label: 'Preview' },
  { prefix: '/upload', label: 'Upload' },
  { prefix: '/settings', label: 'Settings' },
  { prefix: '/applications', label: 'Applications' },
  { prefix: '/cover-letters', label: 'Cover Letters' },
  { prefix: '/interview', label: 'Interview Prep' },
  { prefix: '/career', label: 'Career Tools' },
  { prefix: '/ai-studio', label: 'AI Studio' },
  { prefix: '/templates', label: 'Templates' },
  { prefix: '/examples', label: 'Examples' },
  { prefix: '/guides', label: 'Guides' },
  { prefix: '/guide', label: 'Guide' },
  { prefix: '/resignation-letters', label: 'Resignation Letters' },
  { prefix: '/profile', label: 'Profile' },
  { prefix: '/notifications', label: 'Notifications' },
  { prefix: '/dashboard', label: 'Dashboard' },
  { prefix: '/terms-of-service', label: 'Terms of Service' },
  { prefix: '/privacy-policy', label: 'Privacy Policy' },
  { prefix: '/help', label: 'Help Center' },
  { prefix: '/portfolio', label: 'Portfolio Editor' },
  { prefix: '/p/', label: 'Public Portfolio' },
  { prefix: '/qr', label: 'QR Code' },
  { prefix: '/share', label: 'Shared Resume' },
  { prefix: '/subscription', label: 'Subscription' },
  { prefix: '/analytics', label: 'Analytics' },
  { prefix: '/achievements', label: 'Achievements' },
  { prefix: '/referral', label: 'Referral' },
  { prefix: '/onboarding', label: 'Onboarding' },
];

export function detectScreen(pathname: string): string {
  const match = SCREEN_MAP.find((s) => pathname.startsWith(s.prefix));
  return match?.label || 'General';
}

// ── Error categorization ───────────────────────────────────────────────────

/** Feature-name-to-category hints for better auto-detection */
const FEATURE_CATEGORY_HINTS: Record<string, ErrorCategory> = {
  'Smart Tailor': 'ai',
  'AI Enhance': 'ai',
  'AI Humanizer': 'ai',
  'Recruiter Simulator': 'ai',
  'LinkedIn Optimizer': 'ai',
  'Mock Interview': 'ai',
  'A/B Compare': 'ai',
  'Gap Filler': 'ai',
  'Job Match Analysis': 'ai',
};

export function categorizeError(message: string, activeFeature?: string | null): ErrorCategoryInfo {
  const m = message.toLowerCase();
  if (/fetch|network|timeout|cors|50[234]|load failed|econnrefused/i.test(m))
    return { category: 'network', label: 'Network Issue', icon: Wifi };
  if (/\bai\b|generat|gemini|openai|credit|enhance|tailor|llm/i.test(m))
    return { category: 'ai', label: 'AI Feature', icon: Sparkles };
  if (/save|update|insert|sync|persist|write/i.test(m))
    return { category: 'save', label: 'Save / Sync', icon: Save };
  if (/pdf|export|download|docx/i.test(m))
    return { category: 'export', label: 'PDF / Export', icon: FileDown };
  if (/auth|session|token|sign|login|password/i.test(m))
    return { category: 'auth', label: 'Authentication', icon: ShieldAlert };
  // Fall back to feature hint if no keyword match
  if (activeFeature && FEATURE_CATEGORY_HINTS[activeFeature]) {
    const cat = FEATURE_CATEGORY_HINTS[activeFeature];
    const info = {
      network: { label: 'Network Issue', icon: Wifi },
      ai: { label: 'AI Feature', icon: Sparkles },
      save: { label: 'Save / Sync', icon: Save },
      export: { label: 'PDF / Export', icon: FileDown },
      auth: { label: 'Authentication', icon: ShieldAlert },
      general: { label: 'General Error', icon: AlertCircle },
    }[cat];
    return { category: cat, ...info };
  }
  return { category: 'general', label: 'General Error', icon: AlertCircle };
}

// ── Event system ───────────────────────────────────────────────────────────

type BugReportListener = (data: BugReportData) => void;

let listener: BugReportListener | null = null;

export function onBugReport(cb: BugReportListener) {
  listener = cb;
  return () => { listener = null; };
}

export function triggerBugReport(data: BugReportData) {
  listener?.(data);
}

/**
 * Convenience: call from any catch block or toast action.
 * Usage: reportBug(error)  or  reportBug(error, 'while saving resume')
 */
export function reportBug(error: unknown, context?: string) {
  const err = error instanceof Error ? error : new Error(String(error));
  triggerBugReport({
    errorMessage: context ? `${context}: ${err.message}` : err.message,
    errorStack: err.stack,
    route: window.location.pathname,
    action: context,
  });
}
