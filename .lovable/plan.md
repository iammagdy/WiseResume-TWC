

# Increase User Trust in WiseResume

## Problem

The app lacks visible trust signals beyond a generic "4.9 stars" and "12,000+ users" badge. There is no mention of data privacy, encryption, or AI transparency anywhere. Users interacting with AI features have no reassurance that their personal career data is handled securely. The footer has no privacy or terms links.

## Changes

### 1. Landing Page -- Trust & Security Section

Add a new section between the "Why WiseResume?" features and the footer on the landing page (`src/pages/Index.tsx`). This section will display 3-4 trust pillars:

| Pillar | Icon | Text |
|---|---|---|
| Data Encryption | ShieldCheck | Your data is encrypted at rest and in transit |
| Private by Default | Lock | Only you can see your resumes -- never shared or sold |
| AI Transparency | Brain | AI suggestions are generated fresh for you, never stored or used to train models |
| Delete Anytime | Trash2 | Full control -- delete your data permanently at any time |

Styled as a compact horizontal card row with muted backgrounds, matching the existing glass-surface aesthetic.

### 2. Enhanced Footer with Legal Links

Update `src/components/landing/Footer.tsx` to include:
- "Privacy Policy" and "Terms of Service" text links (pointing to `/privacy` and `/terms`)
- A small "Your data is encrypted and secure" line with a ShieldCheck icon
- Create two minimal static pages (`src/pages/PrivacyPage.tsx` and `src/pages/TermsPage.tsx`) with placeholder legal content and register them as routes in `App.tsx`

### 3. AI Processing Trust Indicator

Create a small reusable component `src/components/ui/AITrustBadge.tsx` that displays a subtle "Private and secure -- your data never leaves your session" message. This badge will appear:
- Inside the AgenticChatSheet header area
- At the top of TailorSheet results
- In the CompanyBriefingSheet

It will be a compact, dismissible inline banner (8-10px text, ShieldCheck icon, muted styling).

### 4. Dashboard Welcome Trust Banner

Add a one-time dismissible trust banner to the Dashboard (`src/pages/DashboardPage.tsx`) for new users (shown when `resumes.length === 0` or first visit). Content:
- "Your career data is encrypted, private, and never shared."
- "Powered by Wise AI -- built for accuracy, not guesswork."
- Dismiss stores `wr-trust-banner-seen` in localStorage.

### 5. "Powered by Wise AI" Contextual Badges

Add small "Powered by Wise AI" text badges (using the existing `AIEngineBadge` component or a lighter variant) to key AI result screens:
- Job Match Score detail sheet (when AI-verified)
- Interview feedback cards
- Tailor results header

This reinforces that results come from a real, named AI engine -- not generic automation.

## Files Created

| File | Purpose |
|---|---|
| `src/pages/PrivacyPage.tsx` | Static privacy policy page |
| `src/pages/TermsPage.tsx` | Static terms of service page |
| `src/components/ui/AITrustBadge.tsx` | Reusable trust indicator for AI features |

## Files Modified

| File | Changes |
|---|---|
| `src/pages/Index.tsx` | Add trust pillars section before footer |
| `src/components/landing/Footer.tsx` | Add privacy/terms links and security line |
| `src/App.tsx` | Register `/privacy` and `/terms` routes |
| `src/pages/DashboardPage.tsx` | Add dismissible trust banner for new users |
| `src/components/editor/AgenticChatSheet.tsx` | Add AITrustBadge in header |
| `src/components/editor/TailorSheet.tsx` | Add AITrustBadge above results |
| `src/components/interview/CompanyBriefingSheet.tsx` | Add AITrustBadge in header |
| `src/components/applications/JobMatchScore.tsx` | Add "Powered by Wise AI" on AI-verified scores |

