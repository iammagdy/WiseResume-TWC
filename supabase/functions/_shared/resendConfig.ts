/**
 * Resend Audiences configuration.
 *
 * Audience IDs are read from Supabase edge function secrets at runtime so they
 * are never hardcoded. Add the following secrets in the Supabase dashboard
 * (Project → Edge Functions → Secrets):
 *
 *   RESEND_AUDIENCE_ONBOARDING      — "Onboarding" audience
 *   RESEND_AUDIENCE_LOW_CREDITS     — "Low Credits" audience
 *   RESEND_AUDIENCE_HANDLE_INTEREST — "Premium Handle Interest" audience
 *   RESEND_AUDIENCE_WISEHIRE        — "WiseHire Waitlist" audience
 *   RESEND_AUDIENCE_ALL_USERS       — "All Users" audience
 *
 * How to get an audience ID:
 *   1. Open https://resend.com/audiences
 *   2. Create the audience if it doesn't exist.
 *   3. Click the audience → copy the ID from the URL
 *      (e.g. https://resend.com/audiences/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
 *
 * Resend Automation setup checklist (configure in Resend UI → Automations):
 *
 *   1. Onboarding drip
 *      Trigger:  Contact added to "Onboarding" audience
 *      Emails:
 *        • Day 0  — "Welcome! Here's how to get the most from WiseResume"
 *        • Day 3  — "Pro tip: use the AI assistant to tailor your resume"
 *        • Day 7  — "Ready to stand out? Try our premium templates"
 *        • Day 14 — "Your resume performance check-in"
 *
 *   2. Low Credits nudge
 *      Trigger: Contact added to "Low Credits" audience
 *      Emails:
 *        • Immediate — "You're running low on AI credits — top up here"
 *
 *   3. Premium Handle Interest
 *      Trigger: Contact added to "Premium Handle Interest" audience
 *      Delay:   1 day
 *      Emails:
 *        • Day 1 — "Still thinking about that premium handle?"
 *
 *   4. WiseHire Waitlist drip
 *      Trigger: Contact added to "WiseHire Waitlist" audience
 *      Emails:
 *        • Day 0  — "You're on the WiseHire waitlist!" (already sent by wisehire-waitlist-join)
 *        • Day 7  — "Here's what WiseHire can do for your team"
 *        • Day 30 — "WiseHire launch update"
 *
 *   5. Re-engagement (All Users)
 *      Trigger: Custom / date-based — 30 days since last login (use Resend's
 *               filter conditions on custom contact attributes, or segment via
 *               the Resend dashboard's audience filter tools)
 *      Emails:
 *        • "We miss you — here's what's new on WiseResume"
 *
 * Deep link: https://resend.com/automations
 */

export function getAudienceId(
  key: 'RESEND_AUDIENCE_ONBOARDING' | 'RESEND_AUDIENCE_LOW_CREDITS' | 'RESEND_AUDIENCE_HANDLE_INTEREST' | 'RESEND_AUDIENCE_WISEHIRE' | 'RESEND_AUDIENCE_ALL_USERS',
): string | null {
  return Deno.env.get(key)?.trim() || null;
}

export const AUDIENCE_KEYS = {
  ONBOARDING: 'RESEND_AUDIENCE_ONBOARDING',
  LOW_CREDITS: 'RESEND_AUDIENCE_LOW_CREDITS',
  HANDLE_INTEREST: 'RESEND_AUDIENCE_HANDLE_INTEREST',
  WISEHIRE: 'RESEND_AUDIENCE_WISEHIRE',
  ALL_USERS: 'RESEND_AUDIENCE_ALL_USERS',
} as const;

export const AUDIENCE_LABELS: Record<string, string> = {
  RESEND_AUDIENCE_ONBOARDING: 'Onboarding',
  RESEND_AUDIENCE_LOW_CREDITS: 'Low Credits',
  RESEND_AUDIENCE_HANDLE_INTEREST: 'Premium Handle Interest',
  RESEND_AUDIENCE_WISEHIRE: 'WiseHire Waitlist',
  RESEND_AUDIENCE_ALL_USERS: 'All Users',
};

export const AUTOMATION_CHECKLIST = [
  {
    key: 'onboarding',
    name: 'Onboarding Drip',
    audienceKey: 'RESEND_AUDIENCE_ONBOARDING',
    trigger: 'Contact added to "Onboarding" audience',
    emails: ['Day 0: Welcome + getting started', 'Day 3: AI assistant tip', 'Day 7: Premium templates', 'Day 14: Performance check-in'],
  },
  {
    key: 'low_credits',
    name: 'Low Credits Nudge',
    audienceKey: 'RESEND_AUDIENCE_LOW_CREDITS',
    trigger: 'Contact added to "Low Credits" audience',
    emails: ['Immediate: Low credits — top up here'],
  },
  {
    key: 'handle_interest',
    name: 'Premium Handle Follow-up',
    audienceKey: 'RESEND_AUDIENCE_HANDLE_INTEREST',
    trigger: 'Contact added to "Premium Handle Interest" audience (delay 1 day)',
    emails: ['Day 1: Still thinking about that premium handle?'],
  },
  {
    key: 'wisehire',
    name: 'WiseHire Waitlist Drip',
    audienceKey: 'RESEND_AUDIENCE_WISEHIRE',
    trigger: 'Contact added to "WiseHire Waitlist" audience',
    emails: ['Day 0: You\'re on the waitlist! (auto-sent)', 'Day 7: What WiseHire can do for your team', 'Day 30: Launch update'],
  },
  {
    key: 're_engagement',
    name: 'Re-engagement',
    audienceKey: 'RESEND_AUDIENCE_ALL_USERS',
    trigger: 'Date-based / 30 days since last login (configure in Resend dashboard)',
    emails: ['We miss you — here\'s what\'s new on WiseResume'],
  },
] as const;
