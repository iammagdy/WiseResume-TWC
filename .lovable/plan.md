

## Contextual AI Nudges -- Compact Chip Redesign and Expanded Coverage

### Overview

The existing nudge system (`useResumeNudges` + `AIContextualNudge`) already works across Summary, Experience, Skills, and Education. This plan redesigns the visual component into a compact inline chip and adds smarter, more granular detection rules plus Contact section coverage.

### What Changes

**1. Redesign `AIContextualNudge` as a compact chip (not a card)**

Replace the current large card-style banner with a slim, single-line chip that feels native and non-intrusive:

```text
Before:  [  icon  |  multi-line message  |  CTA button  |  Dismiss button  |  X  ]
After:   [ Sparkles icon  "AI can add metrics"  [Fix]  X ]
```

- Single row, `rounded-full`, `bg-primary/5 border-primary/20`
- Sparkles icon (not Lightbulb) to match the AI branding used elsewhere
- Short message (max ~40 chars) + small action button + dismiss X
- `animate-in fade-in-0 slide-in-from-left-2` for a subtle entrance
- `active:scale-95` on the action button for haptic consistency

**2. Add new nudge triggers to `useResumeNudges`**

| Trigger | Section | Condition | Message | Action |
|---------|---------|-----------|---------|--------|
| `weak_verbs` | experience | Description starts with passive words (managed, responsible for) instead of action verbs | "AI can strengthen your bullet points" | `improve` |
| `no_action_verbs` | experience | No recognized action verbs in any description | "Add impactful action verbs" | `improve` |
| `missing_contact` | contact | Email or phone missing | "Complete your contact info" | `improve` |
| `no_linkedin` | contact | LinkedIn field empty | "Add LinkedIn to boost visibility" | `generate` |
| `generic_skills` | skills | Skills are too generic (e.g., "Microsoft Office", "Communication") | "AI can suggest role-specific skills" | `generate` |

**3. Wire Contact section into the nudge system**

ContactSection currently has no nudge integration. Add `useResumeNudges` and `AIContextualNudge` to it, showing nudges for missing email/phone/LinkedIn.

**4. Per-entry nudge chips in Experience**

Instead of one nudge for the whole Experience section, show a small inline chip *inside each expanded experience card* when that specific entry has no metrics. This makes it clear which job needs improvement.

### Files to Modify

| File | Change |
|------|--------|
| `src/components/editor/AIContextualNudge.tsx` | Redesign from card to compact chip; add `compact` prop for per-entry usage |
| `src/hooks/useResumeNudges.ts` | Add `weak_verbs`, `no_action_verbs`, `missing_contact`, `no_linkedin`, `generic_skills` triggers; add `contact` section nudges; add `getNudgesForExperience(expId)` helper |
| `src/components/editor/ContactSection.tsx` | Import and render `AIContextualNudge` with contact nudges |
| `src/components/editor/ExperienceSection.tsx` | Add per-entry inline chip nudges inside expanded cards |

### Technical Details

**Action verb detection** (for `weak_verbs` / `no_action_verbs`):
- A small set of ~30 strong action verbs (Led, Developed, Implemented, Increased, etc.) checked against the first word of each bullet/description line
- Passive indicators: starts with "Responsible for", "Managed", "Helped", "Assisted"

**Generic skills detection**:
- A blocklist of ~15 overly common skills ("Microsoft Office", "Communication", "Teamwork", "Problem Solving") that add little ATS value

**Per-entry experience nudges**:
- New `getNudgesForExperience(expId: string)` function in the hook returns nudges specific to one experience entry
- Uses a compact variant of `AIContextualNudge` (smaller text, no dismiss button, just chip + action)

**Dismissed state**:
- Dismissals remain in React state (reset on page reload), keeping the current behavior
- Per-entry dismissals use a key like `no_metrics_${expId}`
