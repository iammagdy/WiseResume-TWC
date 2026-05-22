# Design System Audit Checklist

Use this checklist before implementing the design system in the app.

---

## 1. Brand consistency

### WiseResume

- [ ] Primary color is crimson, not blue.
- [ ] CTAs use crimson.
- [ ] Focus rings use crimson.
- [ ] Active nav uses crimson.
- [ ] Hero/pill/glow uses crimson.
- [ ] Copy speaks to job seekers.

### WiseHire

- [ ] Primary color is blue, not crimson.
- [ ] CTAs use blue.
- [ ] Focus rings use blue.
- [ ] Active nav uses blue.
- [ ] Hero/pill/glow uses blue.
- [ ] Copy speaks to recruiters/hiring teams.

---

## 2. Tokens

- [ ] Colors use CSS variables/Tailwind tokens.
- [ ] No repeated hardcoded brand hex values in screens.
- [ ] Typography uses the defined scale.
- [ ] Spacing follows the 4px grid.
- [ ] Radius uses system values.
- [ ] Shadows use system values.
- [ ] Motion durations are consistent.

---

## 3. Core components

- [ ] Buttons are consistent.
- [ ] Inputs are consistent.
- [ ] Cards are consistent.
- [ ] Badges are consistent.
- [ ] Dialogs/sheets are consistent.
- [ ] Tabs are consistent.
- [ ] Toasts are consistent.
- [ ] Tables/lists are consistent.

---

## 4. Product components

### WiseResume

- [ ] Resume cards are consistent.
- [ ] ATS score rings are consistent.
- [ ] Resume section cards are consistent.
- [ ] AI suggestion panels are consistent.
- [ ] Tailor result cards are consistent.
- [ ] Keyword badges are consistent.
- [ ] Upload resume boxes are consistent.
- [ ] Export panels are consistent.

### WiseHire

- [ ] Candidate cards are consistent.
- [ ] Candidate score cards are consistent.
- [ ] Pipeline columns are consistent.
- [ ] Bulk upload panels are consistent.
- [ ] JD writer panels are consistent.

---

## 5. Main flows

### WiseResume

- [ ] Upload CV flow has all states.
- [ ] Parse flow has progress and errors.
- [ ] Editor flow has save/unsaved states.
- [ ] Tailor flow has clear input and loading states.
- [ ] Tailor results explain before/after changes.
- [ ] Apply changes flow confirms success/failure.
- [ ] Export flow is clear.
- [ ] Onboarding guides user to first useful outcome.

### WiseHire

- [ ] Create role/JD flow is clear.
- [ ] Bulk CV upload supports progress/errors.
- [ ] Candidate scores are explainable.
- [ ] Pipeline is usable.
- [ ] Empty states exist.

---

## 6. Mobile

- [ ] No horizontal overflow at 360px.
- [ ] Cards are full width on mobile.
- [ ] Tables become cards where needed.
- [ ] Side sheets become bottom/full sheets.
- [ ] Editor and preview do not appear side-by-side.
- [ ] Primary CTA is easy to reach.
- [ ] Inputs are at least 16px font size.
- [ ] Touch targets are at least 44px.

---

## 7. Accessibility

- [ ] Keyboard navigation works.
- [ ] Focus states are visible.
- [ ] Inputs have labels.
- [ ] Icon-only buttons have aria labels.
- [ ] Dialogs trap focus.
- [ ] Error messages are clear.
- [ ] Color is not the only status indicator.
- [ ] Reduced motion is respected.

---

## 8. State coverage

For each major screen:

- [ ] Empty state.
- [ ] Loading state.
- [ ] Error state.
- [ ] Success state.
- [ ] Disabled state where applicable.
- [ ] Mobile state.

---

## 9. Risk review

Before implementation:

- [ ] Identify files likely to be touched.
- [ ] Identify shared components with wide impact.
- [ ] Avoid changing backend/API logic.
- [ ] Avoid changing auth.
- [ ] Avoid changing database schema.
- [ ] Plan rollback per phase.
- [ ] Test one flow before expanding to all screens.
