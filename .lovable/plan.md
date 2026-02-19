
# Weighted Skills Word Cloud on the Public Portfolio

## What Already Exists

The Skills section (lines 1333–1370 of `PublicPortfolioPage.tsx`) currently renders a flat `flex-wrap` grid of uniform pills using the `skillWave` + `skillPill` motion variants. Every skill is displayed at the same size with the same weight regardless of how prominently it appears in the user's actual work history.

The `Experience` interface exposes `description: string`, `achievements: string[]`, and `responsibilities?: string[]` — all rich free-text fields that mention technologies and skills by name. The `Project` interface has `technologies: string[]` which is explicit. This gives us everything needed for a client-side frequency count without any server round-trip.

## Design Goal

Replace the flat pill grid with a **bubble-style word cloud** where:
- Skills mentioned across more job descriptions / projects are rendered **larger and bolder**
- Skills on the `resume.skills[]` list that are never mentioned in experience text are still shown but at the baseline size
- The layout is a natural CSS `flex-wrap` cloud (no canvas, no D3, no SVG coordinate maths) — the size is simply driven by `font-size` + `padding` CSS properties, which means the browser handles all wrapping naturally

## Frequency Scoring Algorithm

A pure client-side `useMemo` computation inside `PublicPortfolioContent`:

```
for each skill in resume.skills:
  count = 0
  for each experience entry:
    corpusText = description + achievements.join(' ') + responsibilities?.join(' ')
    if corpusText.toLowerCase().includes(skill.toLowerCase()):
      count += 2   // experience mention = 2 pts (cross-role relevance)
  for each project entry:
    if project.technologies includes skill (exact match):
      count += 1   // technology tag = 1 pt
    if project.description mentions skill:
      count += 1

  skillScores[skill] = count
```

Score ranges map to 5 visual tiers:

| Score | Tier | Font size | Font weight | Padding | Opacity |
|---|---|---|---|---|---|
| 0 | xs | 11px | 400 | 6px 10px | 0.55 |
| 1 | sm | 12px | 500 | 7px 12px | 0.70 |
| 2–3 | md | 13px | 600 | 8px 14px | 0.85 |
| 4–6 | lg | 15px | 700 | 9px 16px | 1.0 |
| 7+ | xl | 17px | 800 | 10px 20px | 1.0 |

## Component Design

A new `SkillCloud` component function defined inline in `PublicPortfolioPage.tsx` (no new file needed — consistent with the existing pattern of inline helpers like `ExperienceCard`, `SectionHeader`, etc.):

```tsx
function SkillCloud({ skills, experience, projects, accentColor, pStyle }: SkillCloudProps)
```

It computes scores via `useMemo`, sorts skills by score descending (highest-weight skills cluster in the visual center since `flex-wrap` fills left-to-right), then renders a `flex-wrap gap-2` div of motion-animated pills.

Each pill uses the existing `skillPill` Framer Motion variant (staggered wave via `skillWave`) for the entry animation. Size tier is applied via inline style.

A subtle tooltip (`title` attribute) shows the skill name on hover for accessibility — no extra dependency needed.

## Replacing the Existing Skills Section

The current block (lines 1334–1370) is replaced in-place with `<SkillCloud>`. The "Show N more" toggle is preserved inside the cloud for skills lists over 28 items.

The `showMoreSkills` state and `hasMoreSkills` computed value remain as-is — they now gate how many `SkillCloud` nodes to render.

## Visual Result

For a typical resume:
- "React", "TypeScript", "Node.js" (mentioned in 5 job descriptions each) → render at 17px bold, full opacity
- "Jest", "Figma" (mentioned in 2 jobs) → 13px semi-bold
- "Photoshop" (listed as a skill, never in job text) → 11px light, 55% opacity

The resulting cloud immediately signals to a recruiter which skills are **core** vs peripheral, without any interaction — the size differential is the visual signal.

## Files Changed

| File | Action | What |
|---|---|---|
| `src/pages/PublicPortfolioPage.tsx` | MODIFY | Add `SkillCloud` component + `computeSkillFrequencies` helper + replace skills section |

No new components, no database changes, no edge functions, no new dependencies.

## Technical Details

### `computeSkillFrequencies` helper

```typescript
function computeSkillFrequencies(
  skills: string[],
  experience: Experience[],
  projects: Project[]
): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const skill of skills) {
    const lower = skill.toLowerCase();
    let score = 0;
    for (const exp of experience) {
      const corpus = [
        exp.description,
        ...(exp.achievements ?? []),
        ...(exp.responsibilities ?? []),
      ].join(' ').toLowerCase();
      if (corpus.includes(lower)) score += 2;
    }
    for (const proj of projects) {
      if (proj.technologies?.some(t => t.toLowerCase() === lower)) score += 1;
      if (proj.description?.toLowerCase().includes(lower)) score += 1;
    }
    scores[skill] = score;
  }
  return scores;
}
```

### Size tier resolver

```typescript
function getSkillTier(score: number): {
  fontSize: string; fontWeight: number; px: string; py: string; opacity: number;
} {
  if (score >= 7) return { fontSize: '17px', fontWeight: 800, px: '20px', py: '10px', opacity: 1 };
  if (score >= 4) return { fontSize: '15px', fontWeight: 700, px: '16px', py: '9px', opacity: 1 };
  if (score >= 2) return { fontSize: '13px', fontWeight: 600, px: '14px', py: '8px', opacity: 0.85 };
  if (score >= 1) return { fontSize: '12px', fontWeight: 500, px: '12px', py: '7px', opacity: 0.70 };
  return { fontSize: '11px', fontWeight: 400, px: '10px', py: '6px', opacity: 0.55 };
}
```

### `SkillCloud` component structure

```tsx
function SkillCloud({ skills, experience, projects, pStyle, showMore, onToggleMore, hasMore, moreCount }) {
  const scores = useMemo(() =>
    computeSkillFrequencies(skills, experience, projects),
    [skills, experience, projects]
  );

  // Sort: highest score first → big pills cluster at start (left/top of flex-wrap)
  const sorted = useMemo(() =>
    [...skills].sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0)),
    [skills, scores]
  );

  const visible = showMore ? sorted : sorted.slice(0, SKILL_LIMIT);

  return (
    <>
      <motion.div variants={skillWave} initial="hidden" whileInView="visible"
        viewport={{ once: true }}
        className="flex flex-wrap gap-2 items-baseline"  // ← items-baseline for natural cloud feel
      >
        {visible.map((skill, i) => {
          const tier = getSkillTier(scores[skill] ?? 0);
          return (
            <motion.span
              key={i}
              variants={skillPill}
              title={skill}
              style={{
                fontSize: tier.fontSize,
                fontWeight: tier.fontWeight,
                padding: `${tier.py} ${tier.px}`,
                opacity: tier.opacity,
                borderRadius: '9999px',
                background: 'color-mix(in srgb, var(--pf-accent) 12%, transparent)',
                color: 'var(--pf-accent)',
                border: '1px solid color-mix(in srgb, var(--pf-accent) 22%, transparent)',
                display: 'inline-flex',
                alignItems: 'center',
                transition: 'all 0.2s',
                lineHeight: 1.2,
              }}
            >
              {skill}
            </motion.span>
          );
        })}
      </motion.div>
      {hasMore && (
        <button onClick={onToggleMore} className="mt-3 text-xs font-medium flex items-center gap-1 ...">
          {showMore ? <><ChevronUp /> Show less</> : <><ChevronDown /> +{moreCount} more</>}
        </button>
      )}
    </>
  );
}
```

### Placement in the page

`SkillCloud` replaces the `motion.div` + pill mapping block at lines 1343–1368, called like:

```tsx
<SkillCloud
  skills={allSkills}
  experience={resume.experience}
  projects={resume.projects}
  pStyle={pStyle}
  showMore={showMoreSkills}
  onToggleMore={() => setShowMoreSkills(v => !v)}
  hasMore={hasMoreSkills}
  moreCount={allSkills.length - SKILL_LIMIT}
/>
```

The wrapping `motion.section` with `id="section-skills"` is unchanged — only the inner content is replaced.

## Why `items-baseline` Matters

Using `items-baseline` (instead of `items-center`) on the flex container means pills of different sizes align along their text baseline. This creates the classic word cloud look — larger pills sit taller, smaller ones sit lower, giving a natural undulation that reads as a visual hierarchy at a glance.

## Performance

`computeSkillFrequencies` runs at most once per portfolio load (wrapped in `useMemo` with `[skills, experience, projects]` deps). For a resume with 30 skills × 8 experience entries each with ~500 char descriptions: 30 × 8 × one `includes()` call = 240 string searches, sub-millisecond.
