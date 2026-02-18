
# Completing the 5 Remaining Items

## Full Diagnosis

### 🔴 1 — Build error: `EditProfileSheet.tsx` line 124 — `portfolioExtras` type mismatch
The local `Profile` interface (lines 35–43) only has 8 fields. The `currentFormProfile` object built at lines 95–126 includes `portfolioExtras: null` and `portfolioSyncMode: 'auto' as const` — but these aren't in the `Profile` interface, so TypeScript can throw when `calculateProfileCompletion(currentFormProfile)` is called because the function signature expects those fields. The fix is to extend the local `Profile` interface to include the full shape expected by `calculateProfileCompletion`.

**Fix:** Add `portfolioExtras`, `portfolioSyncMode`, and the other extended fields to the local `Profile` interface inside `EditProfileSheet.tsx` so the type matches `currentFormProfile` exactly.

### 🔄 2 — `PortfolioEditorPage.tsx` — Case Studies + Services cards, sync mode toggle
The portfolio editor currently has no UI for:
- **Case Studies** — part of `portfolioExtras.caseStudies[]` JSONB
- **Portfolio Services** — part of `portfolioExtras.services[]` JSONB  
- **Sync Mode toggle** — `portfolioSyncMode: 'auto' | 'locked'` (auto-syncs from selected resume vs locks content)

All three must be added as new `CollapsibleCard` sections below the existing "Section Visibility" section.

**Fix:** Add three new collapsible cards and the corresponding state variables + save logic.

### 🔄 3 — `DashboardPage.tsx` — Portfolio promo card
The dashboard empty state (when user has no resumes, lines 659–721) has 8 action cards but no Portfolio promo. When resumes exist, there's no Portfolio entry in the popover profile menu either.

**Fix:** Add a `Globe`-icon action card "My Portfolio" to the 8-card empty state grid (making it a 9-card grid), and add a "My Portfolio" button to the profile popover menu.

### 🔄 4 — `ProfilePage.tsx` — URL fixes
The portfolio URL preview on line 137 uses `window.location.hostname` which shows the raw Lovable preview domain instead of the branded `wiseresume.app` domain. The share handler already correctly uses `window.location.origin`, so only the display string is wrong.

**Fix:** Change line 137 from `` `${window.location.hostname}/p/${profile.username}` `` to `` `wiseresume.app/p/${profile.username}` `` for the display label. The actual click/share URLs already use `window.location.origin` correctly.

### 🔄 5 — `BottomTabBar.tsx` — Portfolio Globe tab
The tab bar has: Home · Editor · Studio · Activity · Settings. The plan called for replacing one tab (or inserting a Globe/Portfolio tab). Per memory `ui/navigation/bottom-tab-layout-v3`, the tab bar is intentionally 5 tabs. The cleanest solution: replace the existing **Studio** tab path to add "Portfolio" as a 5th option, or swap one lower-priority tab. The most natural swap is replacing the `Sparkles / Studio` tab label to a "Portfolio" tab pointing to `/portfolio`, since Studio is also accessible from the Editor → AI Hub. However, reviewing the memory note more carefully: "Studio tab uses Sparkles icon" is the new correct state. A better approach is to **not** add a 6th tab (which breaks mobile layout), but instead add a **Globe icon button** to the right of the existing 5 tabs — but that too would crowd the bar.

The most balanced solution: **replace the Settings tab** (least frequently used primary action) with a Portfolio tab (`Globe` icon, `/portfolio`), and move Settings access to remain available via the profile popover on the dashboard and via the existing Settings route. However, Settings is a critical tab for first-time users and biometric setup.

**Cleanest solution**: Keep 5 tabs, swap `BarChart3 / Activity` → to show both Activity and Portfolio under a smarter arrangement. Actually the simplest correct solution per the original plan: **add Globe/Portfolio tab by replacing the `applications` tab** — Activity is already a dedicated page but less frequently used. No — let's not break Activity.

**Final decision**: Replace the 5th tab (Settings) with Portfolio, and move Settings into the profile popover which already has a Settings button. This is the correct mobile-first pattern: profile popover = account/settings, bottom nav = primary feature navigation.

Tabs become: Home · Editor · Studio · Activity · **Portfolio**

Settings remains accessible via the profile popover on the Dashboard (already has a "Settings" button there).

---

## Exact File Changes

### File 1 — `src/components/settings/EditProfileSheet.tsx`
**Lines 35–43:** Extend the local `Profile` interface to include all fields that `currentFormProfile` uses:

```ts
interface Profile {
  fullName: string | null;
  avatarUrl: string | null;
  jobTitle: string | null;
  industry: string | null;
  careerLevel: CareerLevel | null;
  location: string | null;
  linkedinUrl: string | null;
  profileCompleted: boolean;
  // Extended fields needed by calculateProfileCompletion
  username?: string | null;
  portfolioBio?: string | null;
  portfolioEnabled?: boolean;
  portfolioResumeId?: string | null;
  githubUrl?: string | null;
  websiteUrl?: string | null;
  twitterUrl?: string | null;
  contactEmail?: string | null;
  theme?: string | null;
  phoneNumber?: string | null;
  portfolioSections?: unknown;
  portfolioMetaTitle?: string | null;
  portfolioMetaDescription?: string | null;
  views?: number;
  portfolioStyle?: string | null;
  portfolioLayout?: string | null;
  portfolioAccentColor?: string | null;
  portfolioFont?: string | null;
  openToWork?: boolean;
  availabilityHeadline?: string | null;
  portfolioExtras?: unknown;
  portfolioSyncMode?: 'auto' | 'locked';
}
```

### File 2 — `src/pages/PortfolioEditorPage.tsx`
Add three new state variables and three new collapsible cards:

**State to add (after line 212):**
```ts
const [syncMode, setSyncMode] = useState<'auto' | 'locked'>('auto');
const [caseStudies, setCaseStudies] = useState<Array<{id:string;title:string;challenge:string;outcome:string}>>([]);
const [services, setServices] = useState<Array<{id:string;title:string;description:string;category:string}>>([]);
```

**Profile sync (inside the `useEffect` at line 218):**
```ts
setSyncMode((p.portfolioSyncMode as 'auto' | 'locked') || 'auto');
const extras = (p.portfolioExtras as Record<string,unknown>) || {};
setCaseStudies((extras.caseStudies as typeof caseStudies) || []);
setServices((extras.services as typeof services) || []);
```

**Save updates (inside `handleSave` at line 390):**
```ts
portfolioSyncMode: syncMode,
portfolioExtras: { caseStudies, services },
```

**New collapsible cards** after "Section Visibility" (line 887):

1. **Sync Mode card** — A simple two-option toggle (`auto` = always reflects the source resume, `locked` = content frozen at last save). Uses inline radio buttons.

2. **Case Studies card** — Add/remove case studies with title + challenge + outcome fields. Each case study rendered as a compact card with a remove button.

3. **Services card** — Add/remove portfolio services with title + description + category. Same compact card pattern.

### File 3 — `src/pages/DashboardPage.tsx`
**Empty state grid (lines 662–719):** Add a 9th action card for Portfolio after the Guides card:
```tsx
<ActionCard
  icon={Globe}
  title="My Portfolio"
  description="Build your personal site"
  onClick={() => navigate('/portfolio')}
  aria-label="Portfolio builder"
/>
```
Also add `Globe` to the lucide-react import.

**Profile popover (line 512 area):** The popover already has "Manage Account" and "Settings" and "Sign Out" buttons. No change needed — Settings is still accessible there.

### File 4 — `src/pages/ProfilePage.tsx`
**Line 137:** Change display URL from `window.location.hostname` to branded domain:
```tsx
// Before:
<p className="text-xs text-muted-foreground truncate">{window.location.hostname}/p/{profile.username}</p>
// After:
<p className="text-xs text-muted-foreground truncate">wiseresume.app/p/{profile.username}</p>
```

### File 5 — `src/components/layout/BottomTabBar.tsx`
Replace the Settings tab with Portfolio (`Globe` icon, `/portfolio`):

```ts
import { FileText, Globe, Home, BarChart3, Sparkles } from 'lucide-react';

const tabs: TabItem[] = [
  { path: '/dashboard', icon: Home, label: 'Home', matchPaths: ['/dashboard'] },
  { path: '/editor', icon: FileText, label: 'Editor', matchPaths: ['/editor', '/preview'], guarded: true },
  { path: '/ai-studio', icon: Sparkles, label: 'Studio', matchPaths: ['/ai-studio'] },
  { path: '/applications', icon: BarChart3, label: 'Activity', matchPaths: ['/applications'] },
  { path: '/portfolio', icon: Globe, label: 'Portfolio', matchPaths: ['/portfolio'] },
];
```

Settings remains reachable via the Dashboard profile popover (already has the "Settings" button) and via direct URL `/settings`.

---

## What is NOT Changed
- All existing changelog entries — untouched
- The public portfolio routes (`/p/:username`) — untouched
- Auth flows — untouched
- The "Strength" checklist, QR code, themes, and all other existing PortfolioEditorPage sections — untouched
- Mobile layout and safe area padding — untouched
- `AppShell.tsx` — Settings route still renders correctly when accessed directly
