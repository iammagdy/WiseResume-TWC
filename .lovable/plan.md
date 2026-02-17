

## Implement 5 User Flow Fixes

### 1. Editor Tab -> Most Recent Resume (`BottomTabBar.tsx`)
- Import `useResumes` hook
- In `handleTabPress`, when `guarded && !currentResumeId`: check if resumes exist, navigate to `/resume/{first.id}` (already sorted by `updated_at` desc), else fall back to `/dashboard?action=create`

### 2. Hide Application Tracking Zeros (`JobActivityStats.tsx`)
- Wrap the "Application Tracking" section in a conditional: only render when at least one of `applicationsSubmitted`, `interviewsScheduled`, or `offersReceived` is non-zero

### 3. Sync Onboarding State (`DashboardPage.tsx`)
- In `handleOnboardingComplete`, add `localStorage.setItem('wr-onboarding-completed', 'true')` to sync both systems

### 4. Pass Template to Create Dialog (`DashboardPage.tsx` + `CreateResumeDialog.tsx`)
- Store consumed `savedTemplate` in state (`onboardingTemplateId`)
- Pass as `defaultTemplateId` prop to `CreateResumeDialog`
- In `CreateResumeDialog`, accept prop, use it to set initial `templateId` in the blank resume creation flow (set it on the resume data when creating)

### 5. AI Studio Creation Shortcut (`AIStudioPage.tsx`)
- Update the `requireResume` function to include an action button in the toast: `toast.info('...', { action: { label: 'Create', onClick: () => navigate('/dashboard?action=create') } })`
- In the "no resume" context bar, add a second "Create" button alongside "Select or create..."

### Technical Details

**Files modified:**
- `src/components/layout/BottomTabBar.tsx` -- add `useResumes` import, update guard logic
- `src/components/applications/JobActivityStats.tsx` -- conditional render for app tracking section
- `src/pages/DashboardPage.tsx` -- localStorage sync + template state management
- `src/components/dashboard/CreateResumeDialog.tsx` -- accept `defaultTemplateId` prop, apply to creation
- `src/pages/AIStudioPage.tsx` -- toast action button + context bar update

