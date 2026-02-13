

## Add Interactive Editor Demo to Landing Page

Since we can't embed an actual video or GIF in a code-only project without hosting external assets, we'll build an **animated interactive demo component** that simulates the resume editor in action. This creates a "live demo" feel that's more engaging than a static video and loads instantly with zero external dependencies.

### What the Demo Will Look Like

A phone-frame mockup card showing an animated sequence that loops:

1. **Typing animation** -- A cursor types out a resume bullet point ("Managed team projects...")
2. **AI enhance trigger** -- A sparkle button pulses and "clicks" automatically
3. **Transform animation** -- The text fades out and is replaced with an enhanced version ("Led cross-functional team of 8, delivering 3 projects 2 weeks ahead of schedule, saving $120K in operational costs")
4. **ATS score animation** -- A score ring animates from 45 to 92
5. **Brief pause, then loops**

The whole sequence runs on a ~8-second loop using framer-motion and CSS animations.

### Placement

Inserted between the **Steps Row** and the **Social Proof Bar** sections -- right after the user understands the 3-step flow, they see it in action.

### Technical Details

**New file: `src/components/landing/EditorDemo.tsx`**
- Self-contained component with all animation logic
- Uses framer-motion's `animate` with `useEffect` for the typing + transform sequence
- Phone-frame mockup using rounded card with a fake status bar and toolbar
- Simulated editor UI: contact header area, a bullet point area where typing happens, and a floating AI button
- Score ring that animates up using framer-motion's `useMotionValue` + `useTransform`
- Respects `useReducedMotion` -- shows static "after" state if reduced motion is preferred
- No external assets needed -- pure CSS/JSX

**Modified file: `src/pages/Index.tsx`**
- Import `EditorDemo` component
- Add a new section between Steps Row (line 166) and Social Proof Bar (line 168) with heading "See It in Action"
- Uses the same `inView` animation pattern as other sections

### Demo UI Elements (all CSS-drawn, no images)

- Mini phone frame with rounded corners and subtle shadow
- Fake status bar (time, battery icon as simple shapes)
- Resume header area with placeholder lines (name, email)
- Editable bullet area where the typing animation plays
- Small floating "AI" button that glows when activated
- Score badge in the corner that counts up

