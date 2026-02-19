
# Three High-Impact Portfolio Enhancements

Based on a deep read of the entire `PublicPortfolioPage.tsx` (1,031 lines), `PortfolioEditorPage.tsx` (1,121 lines), and all supporting components, here is exactly what exists and what will be added.

## Current State — What Already Exists

The portfolio already has:
- Framer Motion with a single `fadeUp` variant and `staggerChildren: 0.08` applied uniformly to every section
- A static tagline: `profile.availabilityHeadline` rendered as a static italic `<p>` tag
- Avatar glow ring via CSS `conic-gradient` + `animate-pulse`
- `openToWork` pill with a CSS `animate-pulse` dot
- 4 themes (minimal, bold-dark, glass-pro, classic-clean) — all using same entrance animations

## The Three Features to Build

---

### Feature 1 — Cinematic Scroll-Based Section Entrances

**What changes:** Replace the single generic `fadeUp` variant applied to every card with **section-specific entrance animations** using `whileInView` + `viewport={{ once: true }}` (so they trigger as the user scrolls, not all at once on load).

**Current behavior:** All sections animate together on initial page load via the parent `motion.div initial="hidden" animate="visible"`. The stagger is barely noticeable because everything loads at once.

**New behavior:** Each section type has its own cinematic entrance:

| Section | Animation |
|---|---|
| Experience cards | Slide in from alternating left/right sides (`x: [-60, 0]` / `x: [60, 0]`) with blur dissolve |
| Project cards | Scale pop from `scale(0.88)` with a subtle `rotateX(8deg)` perspective flip |
| Skill pills | Wave animation — pills enter individually left-to-right with `staggerChildren: 0.04` |
| Education cards | Simple `fadeUp` but with a spring easing (feels distinct from experience) |
| Case Study cards | "Unfold" from top-left — `transformOrigin: 'top left'`, scale from `0.92` to `1` |
| Section headers | `x: -20 → 0` slide-in with the accent line growing from width 0 to full |
| About bio | Simple fade with a slight `blur(4px) → blur(0)` dissolve |

**Implementation approach:**
- Add new motion variant constants at the top of `PublicPortfolioPage.tsx`:
  ```typescript
  const slideFromLeft = { hidden: { opacity: 0, x: -60 }, visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: [0.25, 0, 0, 1] } } }
  const slideFromRight = { hidden: { opacity: 0, x: 60 }, visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: [0.25, 0, 0, 1] } } }
  const scalePop = { hidden: { opacity: 0, scale: 0.88, rotateX: 6 }, visible: { opacity: 1, scale: 1, rotateX: 0, transition: { duration: 0.45, ease: [0, 0, 0.2, 1] } } }
  const skillWave = { hidden: {}, visible: { transition: { staggerChildren: 0.035 } } }
  const skillPill = { hidden: { opacity: 0, y: 12, scale: 0.9 }, visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3 } } }
  const unfold = { hidden: { opacity: 0, scale: 0.92, originX: 0, originY: 0 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'backOut' } } }
  ```
- Convert `ExperienceCard`, `ProjectCard`, `EducationCard`, `CaseStudyCard`, `ServiceCard` to use `whileInView` with `viewport={{ once: true, margin: "-60px" }}` instead of being driven by parent stagger
- Alternate left/right for experience cards based on index parity
- Wrap the skills section pills in `motion.div` with `skillWave` / `skillPill` variants
- Keep the hero section using the existing `animate="visible"` on mount — only body sections switch to `whileInView`

**Files changed:** `src/pages/PublicPortfolioPage.tsx` only.

---

### Feature 2 — Typewriter Hero Effect

**What changes:** The static `tagline` paragraph in the hero (line 802–806 of `PublicPortfolioPage.tsx`) becomes an animated typewriter that cycles through 3–5 AI-generated phrase variants.

**Current code (lines 801–806):**
```tsx
{tagline && (
  <p className="text-sm italic mb-5 max-w-md leading-relaxed" style={{ color: 'var(--pf-muted, #9ca3af)' }}>
    "{tagline}"
  </p>
)}
```

**New behavior:** A cycling typewriter that:
1. Generates 4 phrase variants from the `availabilityHeadline`, `portfolioBio`, `jobTitle`, and top skills at render time (pure client-side string manipulation — no AI call)
2. Types each phrase character-by-character at 40ms/char
3. Pauses for 2.5s at the end of each phrase
4. Backspaces at 20ms/char to erase
5. Cycles to the next phrase
6. Has a blinking cursor `|` using a CSS keyframe

**Phrase variants generated from existing data:**
```typescript
function buildTypewriterPhrases(profile: PublicProfile, skills: string[]): string[] {
  const phrases: string[] = [];
  if (profile.availabilityHeadline) phrases.push(profile.availabilityHeadline);
  if (profile.jobTitle && skills[0]) phrases.push(`${profile.jobTitle} specializing in ${skills[0]}`);
  if (skills.length >= 3) phrases.push(`Expert in ${skills[0]}, ${skills[1]} & ${skills[2]}`);
  if (profile.location && profile.jobTitle) phrases.push(`${profile.jobTitle} based in ${profile.location}`);
  if (profile.openToWork) phrases.push('Open to new opportunities');
  return phrases.filter(Boolean).slice(0, 5);
}
```

**Implementation:** A self-contained `TypewriterText` component at the top of the file:
```typescript
function TypewriterText({ phrases, accentColor }: { phrases: string[]; accentColor: string })
```
- Uses `useState` for `displayed`, `phraseIndex`, `charIndex`, `isDeleting`
- Uses `useEffect` with `setTimeout` for the character-by-character tick
- Renders the text + a blinking cursor `span` with `animation: blink 1s step-end infinite`
- Gracefully falls back to the static tagline if only 1 phrase exists

**Files changed:** `src/pages/PublicPortfolioPage.tsx` only.

---

### Feature 3 — AI "Ask Me Anything" Widget

**What changes:** A floating chat button in the bottom-right corner of every public portfolio. When tapped, a compact bottom sheet appears where visitors can ask questions about the portfolio owner — answered exclusively from the portfolio data (no hallucination possible).

**Architecture:**

```text
Visitor types: "Do you have experience with Kubernetes?"
      ↓
Frontend: sends question + serialized resume context to edge function
      ↓
ask-portfolio edge function:
  - system prompt = full resume JSON rendered as human-readable text
  - model: google/gemini-2.5-flash-lite (fast, cheap)
  - temperature: 0.3 (factual)
  ↓
Returns answer grounded ONLY in provided context
      ↓
Visitor sees: "Based on the profile, John has 4 years of container orchestration experience 
              at Acme Corp, primarily with Docker and ECS — Kubernetes isn't listed directly 
              but they have strong adjacent skills in infrastructure."
```

**New edge function: `supabase/functions/ask-portfolio/index.ts`**
- Accepts: `{ username, question, conversationHistory }`
- Fetches profile via `get_public_portfolio` RPC (service role)
- Builds a system prompt from the resume data as readable text
- Calls `LOVABLE_API_KEY` gateway with `google/gemini-2.5-flash-lite`
- Returns the answer
- Rate limiting: max 10 questions per visitor per session (enforced client-side via `sessionStorage` count)
- `verify_jwt = false` in config.toml (public endpoint — no auth needed)

**UI in `PublicPortfolioPage.tsx`:**
- A `ChatWidget` component rendered at the very bottom of `PublicPortfolioContent`
- Float button: circular, 56px, accent color background, `MessageSquare` icon, positioned `fixed bottom-6 right-4 z-40`
- On click: animates up a compact sheet (max-h 60vh) with:
  - Header: "Ask about [Name]'s background" + close button
  - Scrollable message list (visitor / AI bubbles)
  - Input bar + Send button
  - Disclaimer: "Answers are generated from public portfolio data only"
- Messages stored in component state (session only — not persisted)
- Loading state shows 3-dot typing indicator
- The widget is only shown if `portfolioEnabled === true` (which is guaranteed since the page only loads for enabled portfolios) — no backend check needed beyond the edge function call

**Data passed as context to the AI:**
```typescript
function buildPortfolioContext(profile: PublicProfile, resume: PublicResume): string {
  return `
Name: ${profile.fullName}
Role: ${profile.jobTitle}
Location: ${profile.location}
Bio: ${profile.portfolioBio}
Open to Work: ${profile.openToWork ? 'Yes' : 'No'}

Experience:
${resume.experience.map(e => `- ${e.position} at ${e.company} (${e.startDate}–${e.current ? 'Present' : e.endDate}): ${e.description} Achievements: ${e.achievements?.join('; ')}`).join('\n')}

Skills: ${resume.skills.join(', ')}

Education:
${resume.education.map(e => `- ${e.degree} from ${e.institution} (${e.endDate})`).join('\n')}

Projects:
${resume.projects?.map(p => `- ${p.name}: ${p.description}`).join('\n')}
  `.trim();
}
```

---

## Files to Create/Modify

| File | Action | What Changes |
|---|---|---|
| `src/pages/PublicPortfolioPage.tsx` | MODIFY | Add cinematic entrance variants, `TypewriterText` component, `ChatWidget` component |
| `supabase/functions/ask-portfolio/index.ts` | CREATE | AI question-answering edge function using Lovable AI gateway |
| `supabase/config.toml` | MODIFY | Add `[functions.ask-portfolio] verify_jwt = false` |

No database migrations needed — the AI widget uses existing profile data already loaded on the page.

---

## Implementation Sequence

1. Add the 6 new Framer Motion variant constants + update `ExperienceCard`, `ProjectCard`, `EducationCard`, `CaseStudyCard`, `ServiceCard` to use `whileInView` (pure refactor, no functional risk)
2. Add `TypewriterText` component and replace the static tagline paragraph
3. Create `ask-portfolio` edge function
4. Add `ChatWidget` component at the bottom of `PublicPortfolioContent`

---

## Design Notes

- The chat widget uses the portfolio's own `accentColor` for its button and message bubbles — it feels native to the portfolio, not bolted on
- On `classic-clean` theme, the chat button uses a light card style with a dark text color instead of white-on-accent
- The typewriter cursor blinks using the existing `@keyframes twinkle` pattern already in the app — no new CSS needed
- All three features are purely additive — zero risk of breaking existing portfolio rendering

