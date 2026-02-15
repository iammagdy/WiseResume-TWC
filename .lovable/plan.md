

## Fix Notification Badge Sync and Add Resume Card Quick Actions

### Part 1: Fix Notification Badge

**Current state**: The notification badge code in `ApplicationsPage.tsx` (line 194) already correctly checks `unreadCount > 0` before showing the badge. The `useUnreadNotificationCount` hook queries the database properly with `user_id` filtering. The database currently has 0 notifications.

**Root cause**: The badge logic is already correct. The issue is likely stale cached data or a race condition. To make this bulletproof:

**File: `src/hooks/useNotifications.ts`**
- Add `refetchInterval: 30000` (30s) to `useUnreadNotificationCount` so badge auto-refreshes
- Add `staleTime: 10000` to prevent serving stale cache indefinitely
- Ensure the query returns `0` (not `null`) as default when there's no data

**File: `src/pages/ApplicationsPage.tsx`**
- No changes needed -- the badge rendering logic is already correct (only shows when `unreadCount > 0`, shows "9+" for 10+)

---

### Part 2: Add Quick Actions to Resume Cards

#### A. Enhance `ResumeListCard` dropdown menu

**File: `src/components/dashboard/ResumeListCard.tsx`**

Add these actions to the existing three-dot dropdown menu:
- **Preview** (Eye icon) -- navigates to `/resume/{id}` (already the card click behavior)
- **Download PDF** (Download icon) -- generates and downloads PDF inline
- **Share** (Share2 icon) -- creates a share link and copies to clipboard
- Keep existing: Rename, Edit, Duplicate, Practice Interview, Delete

Add required imports: `Download, Share2, Eye` from lucide-react, plus `generatePDF`, `downloadFile`, `useResumeShareMutations`, and `toast`.

New props needed: none -- we can use the existing `resume` prop to generate PDF and share directly from the card.

#### B. Add quick actions to Home page `ResumeCard`

**File: `src/components/home/ResumeCard.tsx`**

Add a three-dot menu button (top-right, alongside the existing delete button):
- Preview Resume
- Edit Resume
- Download PDF
- Duplicate Resume
- Delete Resume (with existing confirmation)

New props needed: `onDuplicate`, `onPreview`, `onDownload` callbacks (or handle internally with navigation).

Since `ResumeCard` uses `ResumeData` (not `DatabaseResume`), and doesn't have a resume ID, the parent component needs to pass these handlers. We'll add `resumeId?: string` and `templateId?: string` props for PDF generation and navigation.

#### C. Add quick actions to `ResumeListSheet` items

**File: `src/components/applications/ResumeListSheet.tsx`**

Each resume item in the modal list currently just navigates on tap. Add a small three-dot menu on the right side of each item with:
- Preview
- Edit
- Download PDF
- Duplicate

---

### Files Summary

| File | Change |
|------|--------|
| `src/hooks/useNotifications.ts` | Add `refetchInterval` and `staleTime` to unread count query |
| `src/components/dashboard/ResumeListCard.tsx` | Add Download PDF, Share, Preview to dropdown menu |
| `src/components/home/ResumeCard.tsx` | Add three-dot menu with quick actions, accept new props |
| `src/components/applications/ResumeListSheet.tsx` | Add three-dot menu to each resume list item |

### Implementation Order

1. `useNotifications.ts` -- harden notification count query
2. `ResumeListCard.tsx` -- add Download/Share/Preview to existing menu
3. `ResumeCard.tsx` -- add three-dot menu with quick actions
4. `ResumeListSheet.tsx` -- add per-item action menu

### Technical Notes

- PDF generation uses the existing `generatePDF` + `downloadFile` utilities
- Share uses the existing `useResumeShareMutations().createShare` mutation
- All new menu items include `e.stopPropagation()` to prevent card click from firing
- Touch targets maintain 44px minimum for all new buttons
- `active:scale-95` applied to new interactive elements per project guidelines

