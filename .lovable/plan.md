
# Visitor Intelligence Panel — Full Upgrade

## What Already Exists (Keep, Don't Break)

The `VisitorsPanel` component (`src/components/portfolio/VisitorsPanel.tsx`) and its data layer (`src/hooks/usePortfolioAnalytics.ts`) are already wired up and working. The `PortfolioVisit` type already has `referrer`, `sections_viewed`, `time_spent_seconds`, `country`, `city`, and `short_link_id`. The `get_portfolio_analytics` RPC already returns all of this data for the last 50 visits.

**No database changes needed.** All required data is already being fetched. This is a pure UI upgrade.

## What's Missing / Needs Building

| Field | Current State | After |
|---|---|---|
| `referrer` | Never shown | Parsed into source label + icon (LinkedIn, Google, Direct, etc.) |
| `sections_viewed` | Up to 5 tiny chips, all equal | Ordered progress bar showing scroll depth; section names as readable labels |
| Engagement quality | Nothing | Color-coded engagement badge (High / Medium / Low) based on time + sections |
| Visit detail | Single-density card, no expand | Tappable → expanded drawer showing full referrer URL, exact timestamp, all sections |
| Section scroll coverage | Nothing | "Scrolled X of Y sections" summary line |
| Traffic source breakdown | Nothing | At the top: mini donut/bar showing LinkedIn vs Direct vs Other distribution |

## Architecture — One File Changed

Only `src/components/portfolio/VisitorsPanel.tsx` changes. The data hook is unchanged.

---

## 1. Referrer Parser — `parseReferrer()`

```typescript
function parseReferrer(referrer: string | null): { label: string; icon: LucideIcon; color: string } {
  if (!referrer) return { label: 'Direct', icon: Globe2, color: 'text-muted-foreground' };
  if (/linkedin/i.test(referrer)) return { label: 'LinkedIn', icon: Linkedin, color: 'text-[#0a66c2]' };
  if (/google/i.test(referrer)) return { label: 'Google', icon: Search, color: 'text-[#ea4335]' };
  if (/twitter|x\.com/i.test(referrer)) return { label: 'Twitter/X', icon: Twitter, color: 'text-[#1d9bf0]' };
  if (/github/i.test(referrer)) return { label: 'GitHub', icon: Github, color: 'text-foreground' };
  // Parse hostname for any other referrer
  try { return { label: new URL(referrer).hostname, icon: ExternalLink, color: 'text-muted-foreground' }; }
  catch { return { label: 'Unknown', icon: Globe2, color: 'text-muted-foreground' }; }
}
```

Lucide doesn't have brand icons. For LinkedIn/Twitter/GitHub we'll use `ExternalLink` + a colored dot indicator, since importing brand SVGs would require a new dependency. The referrer hostname label is the key information.

---

## 2. Engagement Badge — `getEngagementTier()`

Scores time + section coverage to return a tier:

```typescript
function getEngagementTier(seconds: number | null, sectionCount: number): {
  label: string; className: string;
} {
  const timeScore = !seconds ? 0 : seconds >= 120 ? 2 : seconds >= 30 ? 1 : 0;
  const sectionScore = sectionCount >= 4 ? 2 : sectionCount >= 2 ? 1 : 0;
  const total = timeScore + sectionScore;
  if (total >= 3) return { label: 'High', className: 'text-emerald-400 bg-emerald-400/10' };
  if (total >= 1) return { label: 'Med', className: 'text-amber-400 bg-amber-400/10' };
  return { label: 'Low', className: 'text-muted-foreground bg-muted' };
}
```

---

## 3. Section Label Map — `SECTION_LABELS`

```typescript
const SECTION_DISPLAY: Record<string, string> = {
  'section-hero': 'Hero', 'section-about': 'About', 'section-experience': 'Experience',
  'section-education': 'Education', 'section-skills': 'Skills',
  'section-projects': 'Projects', 'section-certifications': 'Certs',
  'section-awards': 'Awards', 'section-publications': 'Publications',
  'section-volunteering': 'Volunteering', 'section-contact': 'Contact',
};
function sectionLabel(s: string) { return SECTION_DISPLAY[s] ?? s.replace('section-', ''); }
```

---

## 4. Upgraded `VisitCard` with Expand/Collapse

The card becomes tappable. On tap, it expands to reveal:
- Full referrer URL (tappable link)
- Exact visit timestamp  
- All sections viewed as a horizontal scroll of chips
- Engagement tier badge

**Collapsed view** (always visible):
```
🇪🇬 Cairo, Egypt           [High] [2m 30s]
3 hours ago
[Experience] [Skills] [Projects] +2 more
```

**Expanded view** (after tap, animated via `AnimatePresence`):
```
↳ Source:  LinkedIn  (linkedin.com/feed)
   Time:   2m 30s  · Feb 19 2026, 10:45 AM
   Sections scrolled (5/7):
   [Hero] [About] [Experience] [Skills] [Projects]
```

The expand toggle uses a `useState<string | null>` in the parent (keyed by `visit.id`) to keep only one expanded at a time — same pattern as `InterviewHistorySheet`.

---

## 5. Traffic Source Summary Bar (Top of Visits Section)

A compact horizontal breakdown above the visit list, showing the split of traffic sources for the last 50 visits. This replaces the bare "Recent Visitors" header:

```
Traffic Sources:  Direct 12  ·  LinkedIn 8  ·  Google 3  ·  Other 2
```

Implemented as a single `useMemo` over `visits` that buckets referrers into categories.

A thin proportional bar (like a segmented progress bar) below the labels visualizes the split — green for LinkedIn, blue for Google, gray for Direct.

---

## 6. Sections Scroll Coverage Line

In the collapsed card, instead of showing raw section IDs, show a friendlier summary:

> **Scrolled 4 sections** — Experience, Skills, Projects, Contact

The full section list only appears when expanded.

---

## Files Changed

| File | Change |
|---|---|
| `src/components/portfolio/VisitorsPanel.tsx` | Full upgrade: `parseReferrer`, `getEngagementTier`, `sectionLabel`, traffic source bar, expandable `VisitCard` |

No database changes. No new edge functions. No new dependencies.

---

## Layout of the Upgraded `VisitCard`

```text
┌──────────────────────────────────────────────────────────┐
│  🇬🇧  London, United Kingdom            [High]  [1m 45s] │
│       2 hours ago                                        │
│  Scrolled 5 sections: Experience, Skills, Projects …    │
│                                              [chevron ↓] │
├── expanded ──────────────────────────────────────────────┤
│  📎 Source   linkedin.com/feed                           │
│  🕐 Time     Feb 19, 2026 at 10:45 AM                   │
│  📋 All sections: [Hero][Experience][Skills]…            │
└──────────────────────────────────────────────────────────┘
```

---

## Technical Details

### Traffic Source Bucketing
```typescript
const trafficSources = useMemo(() => {
  const buckets = { LinkedIn: 0, Google: 0, GitHub: 0, Direct: 0, Other: 0 };
  for (const v of visits) {
    const r = v.referrer ?? '';
    if (!r) buckets.Direct++;
    else if (/linkedin/i.test(r)) buckets.LinkedIn++;
    else if (/google/i.test(r)) buckets.Google++;
    else if (/github/i.test(r)) buckets.GitHub++;
    else buckets.Other++;
  }
  return Object.entries(buckets).filter(([, n]) => n > 0)
    .sort(([, a], [, b]) => b - a);
}, [visits]);
```

### Expand State — Single-Open Pattern
```typescript
// In VisitorsPanel
const [expandedVisitId, setExpandedVisitId] = useState<string | null>(null);

// In each VisitCard
const isExpanded = expandedVisitId === visit.id;
const toggle = () => setExpandedVisitId(isExpanded ? null : visit.id);
```

### Referrer Display in Expanded View
Since the referrer is a full URL (e.g. `https://www.linkedin.com/feed/`), show:
1. The parsed label ("LinkedIn") as a colored pill
2. The hostname in monospace (`linkedin.com`) as the secondary line
3. A small external link icon that opens the referrer URL in a new tab (for debugging)

### `VisitorsPanelProps` — No Change
The props interface is unchanged. The only new internal state is `expandedVisitId`.
