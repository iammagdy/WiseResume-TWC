
# Skill Frequency Panel in Portfolio Editor

## What Already Exists

`PortfolioEditorPage.tsx` already has:
- `selectedResume` derived at line 488: `resumes.find(r => r.id === selectedResumeId) || resumes[0]`
- A `CollapsibleCard` for **Portfolio Strength** (lines 646–671) that shows tips for missing content — this is the perfect sibling for a new "Skills Visibility" card
- The `computeSkillFrequencies` and `getSkillTier` helpers live in `PublicPortfolioPage.tsx` and are private to that file

The Editor page imports `Experience` and `Project` types are NOT yet imported there — but `selectedResume` already exposes `.skills`, `.experience`, and `.projects` as the same raw data shape (coming from the same `useResumes()` hook that feeds the public portfolio).

---

## Plan

### Step 1 — Extract scoring helpers to a shared module

Move `computeSkillFrequencies` and `getSkillTier` from `PublicPortfolioPage.tsx` into a new file **`src/lib/skillCloud.ts`** so both the public page and the editor can import them cleanly.

```
src/lib/skillCloud.ts
  export function computeSkillFrequencies(skills, experience, projects): Record<string, number>
  export function getSkillTier(score): { fontSize, fontWeight, px, py, opacity }
  export const TIER_NAMES: Record<string, string>  // for label display
```

`PublicPortfolioPage.tsx` is updated to import from this new module (removing the inline definitions).

---

### Step 2 — Add `SkillVisibilityPanel` collapsible card to Portfolio Editor

A new `CollapsibleCard` with id `"skill-cloud"` inserted **between "Portfolio Strength" and "Visual Theme"** — the most logical spot since it's a content quality/strength signal.

The card header hint shows the number of "well-covered" skills (score ≥ 2) vs total: e.g. `7 of 18 strong`.

**Inside the card, two sections:**

#### A — Skill Score Table

A scrollable list of all skills in the selected resume, sorted highest score first. Each row:

```
┌──────────────────────────────────────────────────────────┐
│  React                [████████░░]  ●●  8 pts  [xl]      │
│  TypeScript           [██████░░░░]  ●●  5 pts  [lg]      │
│  Jest                 [██░░░░░░░░]  ●   2 pts  [md]      │
│  Photoshop            [░░░░░░░░░░]  ○   0 pts  [xs] dim  │
└──────────────────────────────────────────────────────────┘
```

Concretely:
- **Skill name** (left, truncated)
- **Thin progress bar** (0–max score, accent color)
- **Score number** ("8 mentions")
- **Tier badge** ("xl" / "lg" / "md" / "sm" / "xs") in matching color

Tier badge colors:
- xl (≥7): `bg-emerald-400/15 text-emerald-400`
- lg (≥4): `bg-blue-400/15 text-blue-400`
- md (≥2): `bg-amber-400/15 text-amber-400`
- sm (≥1): `bg-muted text-muted-foreground`
- xs (0): `bg-muted/50 text-muted-foreground/50`

Max 20 rows shown to keep the list compact; a "Show all" toggle for more.

#### B — Improvement Hint Banner

Below the list, a contextual hint card (only shown when `zeroScoreSkills.length > 0`):

```
┌──────────────────────────────────────────────────────────┐
│  💡  7 skills aren't mentioned in your experience        │
│      Add them to your job descriptions to make them      │
│      appear larger in your Skills word cloud.            │
│                                          [Go to Resume →]│
└──────────────────────────────────────────────────────────┘
```

The "Go to Resume → Skills" button navigates to `/editor` (the resume editor). No backend changes required.

---

### Step 3 — Summary stat in card header hint

The `CollapsibleCard` hint prop shows: `7 strong · 4 dim` — giving a glanceable quality signal even when collapsed.

---

## Files Changed

| File | Action | Detail |
|---|---|---|
| `src/lib/skillCloud.ts` | **CREATE** | Extracted `computeSkillFrequencies`, `getSkillTier`, tier label helpers |
| `src/pages/PublicPortfolioPage.tsx` | **MODIFY** | Import from `@/lib/skillCloud` instead of inline definitions (delete ~35 lines, add 1 import) |
| `src/pages/PortfolioEditorPage.tsx` | **MODIFY** | Import `computeSkillFrequencies`, `getSkillTier` from skillCloud; add `useMemo` for skill scores; add new `CollapsibleCard` for "Skills Visibility"; add navigate import for the CTA button |

No database changes. No edge functions. No new dependencies.

---

## Technical Details

### `src/lib/skillCloud.ts`

```typescript
import type { Experience, Project } from '@/types/resume';

export function computeSkillFrequencies(
  skills: string[],
  experience: Experience[],
  projects: Project[]
): Record<string, number> { /* ... existing algorithm ... */ }

export function getSkillTier(score: number) {
  if (score >= 7) return { tier: 'xl', fontSize: '17px', fontWeight: 800, px: '20px', py: '10px', opacity: 1 };
  if (score >= 4) return { tier: 'lg', fontSize: '15px', fontWeight: 700, px: '16px', py: '9px',  opacity: 1 };
  if (score >= 2) return { tier: 'md', fontSize: '13px', fontWeight: 600, px: '14px', py: '8px',  opacity: 0.85 };
  if (score >= 1) return { tier: 'sm', fontSize: '12px', fontWeight: 500, px: '12px', py: '7px',  opacity: 0.70 };
  return           { tier: 'xs', fontSize: '11px', fontWeight: 400, px: '10px', py: '6px', opacity: 0.55 };
}

export const TIER_STYLES: Record<string, string> = {
  xl: 'bg-emerald-400/15 text-emerald-400 border-emerald-400/20',
  lg: 'bg-blue-400/15 text-blue-400 border-blue-400/20',
  md: 'bg-amber-400/15 text-amber-400 border-amber-400/20',
  sm: 'bg-muted text-muted-foreground border-border/30',
  xs: 'bg-muted/50 text-muted-foreground/50 border-border/20',
};
```

### Skill score derivation in `PortfolioEditorPage`

```typescript
// After selectedResume is derived (line 488)
const skillScores = useMemo(() => {
  const skills = (selectedResume?.skills ?? []) as string[];
  const experience = (selectedResume?.experience ?? []) as Experience[];
  const projects = (selectedResume?.projects ?? []) as Project[];
  if (!skills.length) return {};
  return computeSkillFrequencies(skills, experience, projects);
}, [selectedResume]);

const sortedSkillScores = useMemo(() =>
  Object.entries(skillScores).sort(([, a], [, b]) => b - a),
  [skillScores]
);

const maxScore = sortedSkillScores[0]?.[1] ?? 1;
const strongSkillCount = sortedSkillScores.filter(([, s]) => s >= 2).length;
const dimSkillCount = sortedSkillScores.filter(([, s]) => s === 0).length;
```

### Skill row JSX (inside the new CollapsibleCard)

```tsx
{sortedSkillScores.slice(0, showAllSkills ? 999 : 20).map(([skill, score]) => {
  const { tier } = getSkillTier(score);
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
  return (
    <div key={skill} className="flex items-center gap-2 py-1.5">
      <span className="text-sm text-foreground truncate flex-1 min-w-0">{skill}</span>
      <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden shrink-0">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground w-14 text-right shrink-0">
        {score > 0 ? `${score} mention${score !== 1 ? 's' : ''}` : 'not found'}
      </span>
      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${TIER_STYLES[tier]}`}>
        {tier.toUpperCase()}
      </span>
    </div>
  );
})}
```

### Improvement hint (when dim skills exist)

```tsx
{dimSkillCount > 0 && (
  <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 space-y-1.5">
    <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
      <span>💡</span>
      {dimSkillCount} skill{dimSkillCount !== 1 ? 's' : ''} not found in your experience
    </p>
    <p className="text-xs text-muted-foreground">
      Mention them in your job descriptions to make them appear larger in your public Skills word cloud.
    </p>
    <Button
      variant="ghost"
      size="sm"
      className="h-7 text-xs text-primary px-2 gap-1 active:scale-95"
      onClick={() => { haptics.light(); navigate('/editor'); }}
    >
      Go to Resume Editor <ArrowRight className="w-3 h-3" />
    </Button>
  </div>
)}
```

### CollapsibleCard header hint

```tsx
hint={
  sortedSkillScores.length > 0
    ? <span className="text-[10px] text-muted-foreground">
        <span className="text-emerald-400 font-medium">{strongSkillCount} strong</span>
        {dimSkillCount > 0 && <> · <span className="text-muted-foreground/60">{dimSkillCount} dim</span></>}
      </span>
    : undefined
}
```

### Position in the page

Inserted between **Portfolio Strength** (line 671) and **Visual Theme** (line 673):

```text
Portfolio Strength card   ← existing
Skills Visibility card    ← NEW (id="skill-cloud")
Visual Theme card         ← existing
```

This ordering makes sense: strength → content quality → visual presentation.
