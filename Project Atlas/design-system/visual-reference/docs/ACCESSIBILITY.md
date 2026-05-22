# Accessibility Rules

Accessibility is part of the production design system, not a final polish step.

---

## 1. Core requirements

Every interactive component must support:

- Keyboard navigation
- Visible focus state
- Accessible name/label
- Sufficient color contrast
- Disabled state semantics
- Screen-reader-friendly feedback when needed

---

## 2. Keyboard rules

- Buttons must be reachable by `Tab`.
- Links must be reachable by `Tab`.
- Dialogs and sheets must trap focus while open.
- `Esc` should close dismissible dialogs/sheets.
- Dropdowns, comboboxes, and menus should support arrow navigation where applicable.
- Do not use clickable `div`s when a button or link is correct.

---

## 3. Focus states

Default focus pattern:

```css
outline: none;
box-shadow: 0 0 0 2px hsl(var(--primary)), 0 0 0 4px hsl(var(--background));
```

Rules:

- Focus must be visible on light and dark backgrounds.
- Focus color should use active product primary.
- Do not remove outlines without replacing them.

---

## 4. Color contrast

Minimum targets:

- Normal body text: WCAG AA contrast.
- Large display text: WCAG AA contrast.
- Critical UI labels: WCAG AA contrast.
- Error/success states must not rely on color alone.

Use icon + label when color meaning is important.

Example:

- Good: red error icon + “Upload failed” text.
- Bad: red border only.

---

## 5. Form accessibility

Each input must have:

- Visible label or accessible label.
- Helper text connected where useful.
- Error text connected where useful.
- Clear required/optional indication.

Rules:

- Placeholder is not a label.
- Error messages should explain the fix.
- Preserve user input after validation errors.

---

## 6. Dialog and sheet accessibility

Must include:

- Accessible title.
- Close button with label.
- Focus trap.
- Return focus to trigger after close.
- Correct `aria-modal` behavior where applicable.

Avoid putting large, complex workflows in small dialogs. Use full-height mobile sheet when needed.

---

## 7. Loading and async feedback

For long-running actions:

- Show visual progress.
- Announce status where appropriate.
- Disable duplicate submit when necessary.
- Keep user input visible/preserved.

AI tasks should show specific progress language, not only a spinner.

---

## 8. Motion accessibility

Respect reduced motion:

- Disable typewriter animation.
- Disable shimmer loops.
- Disable count-up effects.
- Reduce large slide transitions.
- Avoid motion that blocks task completion.

---

## 9. Icon accessibility

- Decorative icons should be hidden from screen readers.
- Meaningful icons need text label or accessible label.
- Icon-only buttons require `aria-label`.

Bad:

```tsx
<button><Trash /></button>
```

Good:

```tsx
<button aria-label="Delete resume"><Trash aria-hidden="true" /></button>
```

---

## 10. AI content accessibility

AI suggestions must be understandable without relying only on visual diff colors.

For before/after changes:

- Label before content clearly.
- Label after content clearly.
- Explain why the change was suggested.
- Allow keyboard users to accept/reject/edit.

---

## 11. Accessibility acceptance checklist

For every new or changed screen:

- [ ] All controls are keyboard reachable.
- [ ] Focus order makes sense.
- [ ] Focus ring is visible.
- [ ] Inputs have labels.
- [ ] Errors are readable and specific.
- [ ] Color is not the only status indicator.
- [ ] Dialogs/sheets handle focus correctly.
- [ ] Icon-only buttons have labels.
- [ ] Reduced motion is respected.
- [ ] Mobile touch targets are at least 44px.
