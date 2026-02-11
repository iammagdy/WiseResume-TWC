

# Replace Owl with Animated Monkey Character

## Overview

Replace the current scary owl SVG with a cute, friendly monkey character that reacts to user interactions on the auth page.

## Monkey Behavior

| State | What the Monkey Does |
|-------|---------------------|
| Idle (no field focused) | Looks straight at the user, friendly smile, maybe a subtle idle breathing animation |
| Email/Phone field focused | Looks downward toward the input field, curious expression, pupils track text as user types |
| Password field focused | Raises both hands to cover eyes (privacy gesture), cute shy expression |
| Show password toggled | Peeks through fingers with one eye, cheeky grin |
| Error (wrong credentials) | Shakes head side-to-side, sad/embarrassed look |
| Success (login works) | Happy bounce, big smile, throws hands up in celebration with sparkles |

## File Changes

### Replace: `src/components/auth/AuthOwl.tsx`

Complete rewrite of the SVG character. The component keeps the **exact same props interface** (`focusedField`, `showPassword`, `textLength`, `shake`, `success`) so `AuthPage.tsx` needs zero changes.

The monkey design:
- **Head**: Large round circle in warm brown (`#8B6914` / `#C4943D`) with a lighter face area
- **Ears**: Two circles on the sides with pink inner ears
- **Eyes**: Large friendly eyes with animated pupils that look down when typing, close when password is focused
- **Mouth**: Friendly smile that changes to a wide grin on success
- **Hands/Arms**: Animate upward to cover eyes during password entry, peek through on show-password
- **Body**: Simple rounded torso below the head

All animations continue using `framer-motion` spring physics for smooth, playful movement.

### No changes to `src/pages/AuthPage.tsx`

The props interface stays identical, so the AuthPage import (`AuthOwl` name) just works. We will rename the component internally to `AuthMonkey` and update the import in AuthPage for clarity.

### Update: `src/pages/AuthPage.tsx`

- Change import from `AuthOwl` to `AuthMonkey`
- Update the JSX component name from `<AuthOwl>` to `<AuthMonkey>`

## Technical Details

### SVG Structure (approx 160x160 viewBox)

```text
Layer order (back to front):
1. Body (ellipse, warm brown)
2. Arms/Hands (paths, animate Y position)
3. Head (large circle, brown)
4. Face area (lighter oval)
5. Ears (circles with pink inners)
6. Eyes (white circles + animated pupils)
7. Eyebrows (animated arcs)
8. Nose (small oval)
9. Mouth (animated path - smile/grin)
10. Eyelids (animated rects for closing eyes)
11. Success sparkles (conditional)
```

### Animation Details

- **Pupil tracking**: Same logic as before -- maps `textLength` 0-30 to horizontal offset, but also adds a downward Y offset when email/phone is focused (monkey looks down at the field)
- **Hands covering eyes**: Arms animate from resting position (sides of body) upward to cover the eye area using `motion.path` with spring transition
- **Peeking**: When `showPassword` is true and field is password, one hand lowers slightly and one eye opens with a squint (scaleY: 0.4)
- **Head shake on error**: Same `x: [0, -8, 8, -6, 6, 0]` keyframes
- **Success bounce**: `y: [0, -16, 0]` with scale pulse and sparkle circles

### Color Palette (hardcoded for the monkey, not theme-dependent)
- Body/Head: `#8B6914` (dark brown)
- Face/Belly: `#DEB860` (light tan)
- Ears inner: `#E8A0A0` (pink)
- Nose: `#5C4033` (dark brown)
- Eyes: white with `#3D2B1F` pupils
- Mouth: `#5C4033` stroke

This keeps the monkey looking consistent across light and dark themes.
