

# Redesign Auth Page with Animated Character + Phone Signup

## Overview

A complete redesign of the auth page featuring an SVG animated character (a cute owl/mascot) that reacts to user input -- looking at the active field and covering its eyes during password entry. Phone number signup will also be added as a new option.

## The Animated Character

A custom SVG owl character built with framer-motion animations:
- **Idle state**: Owl sits centered above the form, eyes open, looking forward
- **Email/Phone focused**: Eyes track left-right as the user types (pupil position tied to text length)
- **Password focused**: Hands/wings slide up to cover eyes -- a "peeking through fingers" pose
- **Show password toggled**: Hands drop, one eye squints suspiciously
- **Error state**: Owl shakes head side-to-side, looks embarrassed
- **Success (login)**: Owl does a happy bounce with sparkle eyes

All animations use framer-motion `animate` with spring physics for a playful feel.

## Phone Number Signup

- Add a toggle between "Email" and "Phone" signup methods (pill-style switcher)
- Phone field uses `type="tel"` with a phone icon
- On signup with phone: calls `supabase.auth.signUp({ phone, password })`
- On login with phone: calls `supabase.auth.signInWithPassword({ phone, password })`
- Validation: phone must match international format pattern

## New Files

### `src/components/auth/AuthOwl.tsx`
The animated SVG owl character component. Accepts props:
- `focusedField`: `'email' | 'phone' | 'password' | null`
- `showPassword`: boolean
- `textLength`: number (for eye tracking)
- `shake`: boolean (for error animation)
- `success`: boolean (for celebration)

The owl is drawn with SVG paths and animated using framer-motion's `motion.circle`, `motion.path`, `motion.g` for smooth transitions between states.

### `src/components/auth/AuthMethodToggle.tsx`
A pill-style toggle to switch between Email and Phone signup.

## Modified Files

### `src/pages/AuthPage.tsx`
Major rewrite:
- Import and render `AuthOwl` above the form
- Add state for `authMethod: 'email' | 'phone'` and `phone` field
- Pass `focusedField`, `showPassword`, `textLength` to the owl
- Add `onFocus` handlers to each input to update `focusedField`
- Add phone validation with zod (`z.string().regex(/^\+?[1-9]\d{6,14}$/)`)
- Update `handleSubmit` to branch on `authMethod` for phone vs email signup
- Trigger owl shake on auth errors, owl celebration on success
- Add the `AuthMethodToggle` above the form fields

## Technical Details

### SVG Owl Design (pure code, no external assets)
The owl is ~120x120px SVG with these animated parts:
- **Body**: Rounded rectangle with gradient fill
- **Eyes**: Two circles with animated pupil circles inside (pupils move via `cx` based on `textLength`)
- **Wings/Hands**: Two path elements that animate `y` position up to cover eyes
- **Eyebrows**: Small arcs that raise/lower for expressions
- **Beak**: Small triangle, static

### Animation Map

| State | Eyes | Hands | Expression |
|-------|------|-------|------------|
| Idle | Center, open | Down | Neutral |
| Typing email/phone | Pupils track text | Down | Curious |
| Password focus | Open briefly then... | Slide up to cover | Shy |
| Show password on | One eye squints | Drop down | Suspicious |
| Error | Wide open | Flap once | Head shake |
| Success | Sparkle/stars | Wave | Bounce up |

### Phone Auth Integration
```typescript
// Signup with phone
const { data, error } = await supabase.auth.signUp({
  phone: phoneNumber,
  password,
});

// Login with phone  
const { error } = await supabase.auth.signInWithPassword({
  phone: phoneNumber,
  password,
});
```

### State Flow
- `focusedField` updates on `onFocus` of each input, resets on blur with a small delay (to avoid flicker between fields)
- `textLength` is derived from the current active field's value length
- `shake` triggers on auth error, auto-resets after 600ms
- `success` triggers on successful login/signup, plays before navigation

