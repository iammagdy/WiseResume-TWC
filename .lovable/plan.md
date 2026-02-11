

# Replace Monkey with Animated Panda Character

## Overview

Replace the current monkey mascot with a cute panda character matching the reference images -- clean black and white design, round body, sitting pose with visible paw pads, and the same interactive animations.

## Panda Design (based on reference images)

The panda from the references has these key features:
- **Round white head** with black ear circles on top
- **Black eye patches** (teardrop/oval shapes) with white eyes and dark pupils inside
- **Small black nose** with a cute smile below
- **White body** with black arms/sides wrapping around
- **White belly patch** visible in the center
- **Feet** showing outward with oval paw pads and toe dots
- **Hair tuft** -- small spiky lines on top of the head
- Simple, clean lines -- minimal detail, maximum cuteness

## Animation Behaviors (same as before)

| State | Panda Action |
|-------|-------------|
| Idle | Looks at user, friendly smile |
| Email/Phone focused | Pupils look down, tracking text length |
| Password focused | Paws come up to cover eyes (like the 3rd reference image -- panda covering face) |
| Show password | One paw drops, peeks with one eye |
| Error | Head shakes side-to-side |
| Success | Happy bounce with sparkles |

## File Changes

| File | Change |
|------|--------|
| `src/components/auth/AuthMonkey.tsx` | Complete SVG rewrite to panda design. Same props interface. Renamed component to `AuthPanda`. |
| `src/pages/AuthPage.tsx` | Update import and JSX from `AuthMonkey` to `AuthPanda` |

## Technical Details

### SVG Structure (200x220 viewBox)

Back to front layer order:
1. **Body** -- white ellipse with black side patches
2. **Feet** -- two ovals at bottom with paw pad details (dark circles for toes)
3. **Arms/Paws** -- black paths that animate Y upward to cover eyes on password focus
4. **Head** -- large white circle
5. **Ears** -- two black circles overlapping the top of head
6. **Eye patches** -- dark teardrop/oval shapes on the face
7. **Eyes** -- white circles inside patches with animated dark pupils
8. **Nose** -- small black oval
9. **Mouth** -- animated smile path
10. **Hair tuft** -- small spiky strokes on top
11. **Success sparkles** -- conditional animated circles

### Color Palette
- Body/Head: `white` (#FFFFFF)
- Ears, eye patches, arms, nose: `#1A1A2E` (near-black, slightly warm)
- Paw pads: `#2D2D44` (dark)
- Pupils: `#1A1A2E`
- Mouth: `#1A1A2E` stroke
- Cheek blush: `#FFB7C5` (soft pink, subtle)

### Animation Logic (unchanged interface)
- Same props: `focusedField`, `showPassword`, `textLength`, `shake`, `success`
- Same `pupilOffsetX/Y` tracking for eye movement
- Same `handY` / `leftHandY` spring animations for paws covering eyes
- Same `eyesClosed` / `leftEyeScaleY` for peeking
- Same `smilePath` for expression changes
- Same shake and bounce via `controls`
