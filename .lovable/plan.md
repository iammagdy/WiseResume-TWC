

## Fix Navigation: Allow Authenticated Users to Access Landing Page

### Overview
Authenticated users are currently trapped in the app shell with no way to visit the landing page (`/`). This fix adds multiple paths back to the landing page.

### Changes

---

### 1. Profile Dropdown Menu -- Add "About WiseResume" link

**File: `src/pages/DashboardPage.tsx` (~line 358)**

Add a new menu item between "Account Settings" and the separator:

```
<DropdownMenuItem onClick={() => navigate('/')}>
  <Home className="w-4 h-4 mr-2" />
  About WiseResume
</DropdownMenuItem>
```

This gives authenticated users an explicit way to visit the landing/marketing page.

### 2. Make Dashboard Header Logo Clickable

**File: `src/pages/DashboardPage.tsx` (~line 321)**

Wrap the existing `<AppLogo>` in a clickable element that navigates to `/`:

```
<button onClick={() => navigate('/')} aria-label="Back to home">
  <AppLogo size="sm" showTagline={false} hideText />
</button>
```

### 3. Ensure Route Logic Allows Access

**File: `src/App.tsx`** -- No changes needed. The `/` route already renders `<Index />` outside the `AppShell` and has no auth redirect guard. Authenticated users can already visit `/` if they have a way to navigate there (which this fix provides).

### 4. Bottom Tab Bar -- Keep As-Is

The "Home" tab stays linked to `/dashboard` since that is the app's functional home screen. Adding a landing page tab would be confusing in-app navigation. The profile dropdown and logo click provide the escape hatch instead.

---

### Technical Details

**Files modified:**
1. `src/pages/DashboardPage.tsx` -- Add "About WiseResume" menu item to profile dropdown; make header logo clickable to `/`

**No new files or dependencies needed.**

