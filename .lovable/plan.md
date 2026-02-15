

## Interview Prep Tab and Application Tracking Enhancements

### What Already Exists (will NOT be rebuilt)

The app already has comprehensive implementations for both features:

- **Interview Page** (`/interview`): Full AI mock interview with voice/text input, job-targeted mode, quick practice, session history, STAR tips, per-answer scoring, and summary reports
- **Applications Page** (`/applications`): Dual-tab layout (My Applications / Saved Jobs), add application sheet with URL auto-parsing, status tracking, linked resumes, notes, and deadlines
- **Application Tracker** (`/application/:id`): Visual pipeline with stages (Saved, Applied, Screening, Interviewing, Offer), notes editing, reminders, and status updates

### What Changes

---

#### 1. Add Interview Tab to Bottom Navigation

**File: `src/components/layout/BottomTabBar.tsx`**

- Add a 5th tab for Interview between Studio and Jobs
- Icon: `Mic` from lucide-react
- Path: `/interview`
- Guard: requires a resume (same as Editor tab -- shows toast if no resume)
- The tab bar already handles 5 items with `flex justify-around`

Updated tabs array:
```
Home | Editor | Studio | Interview | Jobs | Settings
```

Wait -- that's 6 tabs. The current layout has 5 (Home, Editor, Studio, Jobs, Settings). Adding Interview makes 6, which is too many for mobile. 

**Solution**: Replace the Settings tab icon with a "More" menu, or keep 5 tabs by nesting Interview under Studio. However, the user explicitly asked for 5 tabs with Interview between Studio and Jobs.

**Revised approach**: Move Settings out of the bottom bar (accessible via profile/gear icon in headers) and use 5 tabs: Home, Editor, Studio, Interview, Jobs. But this breaks existing navigation patterns.

**Simplest approach**: Use 5 tabs as requested -- Home, Editor, Studio, Interview, Jobs. Add a settings gear icon to the dashboard/home header instead. Settings is already accessible from multiple places.

Actually, re-reading the request: "Add 5th tab" -- current has 5 tabs already. The user wants a 6th but calls it "5th" perhaps counting differently. To avoid breaking the nav, I'll keep all 6 tabs but make them slightly narrower, which works fine at 375px (each tab = ~62px, well above 48px min touch target).

**Final approach**: Add Interview as 6th tab. At 375px viewport, 6 tabs at ~62px each fits. Each tab already uses `flex-1` so they auto-distribute.

---

#### 2. Status Filter on Applications Tab

**File: `src/pages/ApplicationsPage.tsx`**

- Import and add `StatusFilter` component (already exists at `src/components/applications/StatusFilter.tsx`)
- Add `statusFilter` state
- Pass filter to `useJobApplications(statusFilter)` -- the hook already supports filtering by status
- Place filter pills below the "My Applications" tab, above the stats card

---

#### 3. Follow-up Email Templates

**New file: `src/components/applications/FollowUpEmailSheet.tsx`**

- Bottom sheet with 3 template options: "Thank You", "Follow Up (1 week)", "Check In (2 weeks)"
- Each template pre-filled with company name and job title from the application
- AI-powered customization using the existing `generate-cover-letter` edge function (or a simpler prompt)
- Copy-to-clipboard button and option to open in email client (`mailto:`)
- Templates are simple string interpolations -- no AI call needed for basic versions

---

#### 4. Interview Prep Link from Application Cards

**File: `src/pages/ApplicationsPage.tsx`**

- When an application has status "interviewing", show a "Prep Materials" button on the card
- Button navigates to `/interview` with the job description pre-loaded (via URL search params or resume store)

**File: `src/pages/ApplicationTrackerPage.tsx`**

- Add "Interview Prep" action button when status is "interviewing" or "screening"
- Navigates to `/interview` with job context

---

#### 5. Enhanced Application Cards

**File: `src/pages/ApplicationsPage.tsx`**

- Show applied date on each card (already in data, just not displayed)
- Show interview date if status is "interviewing" and deadline is set
- Show "Follow-up due" reminder if `remind_at` is approaching
- Add "Draft Follow-up" button that opens `FollowUpEmailSheet`

---

### What Does NOT Change

- All existing interview functionality (voice, text, scoring, history, tips)
- All existing application tracking and mutations
- Resume editing, AI features, versions, data persistence
- Database schema (all needed columns exist)
- PDF generation, export, sharing
- Mobile preview and editor behavior

---

### Files Summary

| File | Action |
|------|--------|
| `src/components/layout/BottomTabBar.tsx` | Add Interview tab (6th tab) |
| `src/pages/ApplicationsPage.tsx` | Add StatusFilter, enhanced cards, prep link, follow-up button |
| `src/components/applications/FollowUpEmailSheet.tsx` | New -- email template generator |
| `src/pages/ApplicationTrackerPage.tsx` | Add "Interview Prep" and "Draft Follow-up" buttons |

### Implementation Order

1. `BottomTabBar.tsx` (add Interview tab)
2. `FollowUpEmailSheet.tsx` (new component)
3. `ApplicationsPage.tsx` (status filter + enhanced cards + follow-up)
4. `ApplicationTrackerPage.tsx` (prep link + follow-up button)

