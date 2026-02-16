## Landing Page Full Redesign

### Current Problems

- Template wireframes section looks cheap and unfinished
- Social proof bar has fabricated stats (removing)
- No sign-in/avatar in header (confusing for returning users)
- Bottom CTA is a duplicate of hero CTA with zero new persuasion
- Logo glow uses purple hues (270/330) but brand color is red (355)
- 6 feature cards is a lot of content before the user reaches a CTA
- Steps row adds clutter without strong value (users already understand "create, polish, export")

### New Page Flow

```text
+------------------------------------------+
| [WiseResume logo]        [Sign In/Avatar] |  <-- sticky mini header
+------------------------------------------+
|                                          |
|     Build Your Dream Resume              |
|     AI-powered. ATS-optimized.           |
|     [Get Started Free]                   |
|     Free forever . No credit card        |
|                                          |
+------------------------------------------+
|     See It in Action (EditorDemo)        |
|     (existing phone mockup animation)    |
+------------------------------------------+
|     Why WiseResume?                      |
|     4 feature cards (reduced from 6)     |
|     - AI Writing Assistant               |
|     - ATS Score Checker                  |
|     - Smart Job Tailoring                |
|     - Voice Mock Interviews              |
|     + "12 templates, 4 AI recruiters"    |
|       as a subtitle/chip row below       |
+------------------------------------------+

```

### Key Changes

**1. Add a sticky mini-header with sign-in/avatar**

- Small bar at the top with the WiseResume logo (24px icon) on the left
- Sign In button (ghost style) or avatar dropdown (for logged-in users) on the right
- Uses `glass-header` backdrop blur, fades in on scroll past the hero logo
- Reuses avatar/dropdown pattern from existing `HeroSection.tsx`

**2. Simplify Hero**

- Fix the logo glow gradient to use brand red (hue 355) instead of purple (270)
- Tighter copy: "Build Your Dream Resume" stays, subtitle becomes "AI-powered. ATS-optimized. Ready in 5 minutes."
- Remove the trust bar below -- fold it into a single line under the CTA button
- Remove the "Already have an account?" text link (the header has Sign In now)

**3. Remove Steps Row**

- The 3-step "Create / AI Polish / Export" row adds little value. The EditorDemo below already demonstrates the flow visually. Removing it shortens the page and reduces cognitive load.

**4. Keep EditorDemo as-is**

- It's the strongest section. No changes needed.

**5. Remove Social Proof Bar**

- Per your choice, removing the fabricated stats entirely.

**6. Reduce Features from 6 to 4 cards + bonus row**

- Keep the 4 strongest: AI Writing Assistant, ATS Score Checker, Smart Job Tailoring, Voice Mock Interviews
- Below the 4-card grid, add a subtle "bonus" row: two chips reading "12 Templates" and "4 AI Recruiter Views" linking to `/templates` and the features respectively
- This merges the template section into the features area (per your choice)

**7. Remove Template Preview Section**

- The 3 wireframe thumbnails are eliminated. The "12 Templates" chip in the features section serves this purpose.

**8. Revamp Bottom CTA**

- Different heading: "Your Next Career Move Starts Here"
- Add a subtle differentiator: show a mini ATS score ring animation or a one-liner testimonial-style quote
- Keep the gradient CTA button

### Files to Modify


| File                  | Change                                                                                                                                                    |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/Index.tsx` | Full rewrite of the landing page structure: remove steps row, social proof, template section; add header; reduce features to 4 + chips; revamp bottom CTA |


No new files needed. We reuse existing components (`EditorDemo`, `SpaceBackground`, `AppIcon`, UI primitives). The `HeroSection.tsx`, `FeatureGrid.tsx`, and `BottomCTA.tsx` component files in `/landing/` are not used by Index.tsx currently and won't be changed.

### Technical Details

- The header uses `useAuth()` and `useProfile()` for the avatar, same pattern as `HeroSection.tsx`
- Sign-in dropdown uses existing `DropdownMenu` from Radix
- All animations continue using `framer-motion` with `useReducedMotion` support
- Feature chips use the existing `Badge` component or inline styled pills
- Logo glow gradient changes from `hsl(270 70% 60%)` to `hsl(355 70% 50%)` to match brand red
- The "12 Templates" chip navigates to `/templates` on tap
- Touch targets remain 44px minimum per project guidelines