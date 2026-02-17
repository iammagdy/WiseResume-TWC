
## Revamp the "Get Help" Sheet

### Changes Overview

1. **Documentation & FAQ** -- Show a "Coming Soon" toast instead of opening a fake link
2. **Email Support** -- Remove entirely (already covered by Contact button in Developer Card)
3. **Feature Requests** -- Replace with a popup dialog (similar to Bug Report) that sends an email to `contact@magdysaber.com` via the existing Resend integration

---

### 1. Update HelpSheet (`src/components/settings/HelpSheet.tsx`)

- Change the "Documentation & FAQ" row's `onClick` to show a toast: `toast.info("Coming Soon", { description: "Documentation & FAQ is under construction." })`
- Remove the "Email Support" row and its separator entirely
- Change the "Feature Requests" row to open a new `FeatureRequestDialog` instead of linking externally
- Update the SheetDescription to remove "email support" wording

### 2. Create FeatureRequestDialog (`src/components/settings/FeatureRequestDialog.tsx`)

A new dialog component modeled after `BugReportDialog`, with these differences:

- **Icon**: Lightbulb (instead of HeartHandshake)
- **Title**: "Request a Feature"
- **Description**: Short text encouraging the user to describe the feature they want
- **Fields**:
  - Feature title (Input, required, max 100 chars)
  - Description (Textarea, required, max 500 chars)
- **Submit**: Calls a new edge function `send-feature-request`
- **Success state**: Same pattern as BugReportDialog with a thank-you message
- Collects the same metadata: user_id, user_email, app_version, route, user_agent, platform

### 3. Create Edge Function (`supabase/functions/send-feature-request/index.ts`)

Mirrors `send-bug-report` but tailored for feature requests:

- Accepts: `feature_title`, `feature_description`, `user_id`, `user_email`, `user_agent`, `app_version`, `route`
- Stores to a new `feature_requests` table
- Sends email to `contact@magdysaber.com` via Resend with:
  - Subject: `[Feature Request] <title>`
  - From: `Feature from <user_email> <contact@magdysaber.com>`
  - Reply-to: user's email
  - Professional HTML layout (blue/indigo gradient header instead of red, matching bug report style)
  - Includes: feature title, description, user metadata (ID, platform, version, user agent)

### 4. Create Database Table (`feature_requests`)

```text
feature_requests
  id              uuid (PK, default gen_random_uuid())
  user_id         uuid (NOT NULL)
  user_email      text (NOT NULL)
  feature_title   text (NOT NULL)
  feature_description text (NOT NULL)
  route           text
  user_agent      text
  app_version     text
  status          text (default 'new')
  created_at      timestamptz (default now())
```

RLS: Enable RLS, allow authenticated users to INSERT their own rows (`auth.uid() = user_id`).

### 5. Files Summary

| Action | File |
|--------|------|
| Modify | `src/components/settings/HelpSheet.tsx` |
| Create | `src/components/settings/FeatureRequestDialog.tsx` |
| Create | `supabase/functions/send-feature-request/index.ts` |
| Create | Database migration for `feature_requests` table |
