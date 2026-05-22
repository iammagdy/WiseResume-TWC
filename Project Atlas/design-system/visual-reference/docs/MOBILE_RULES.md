# Mobile Rules

Mobile is a priority for WiseResume. The design system must make the main resume flows usable on small screens, not just visually responsive.

---

## 1. Mobile principles

1. Primary action should be obvious without scrolling too much.
2. Avoid desktop-only patterns like large side-by-side editors.
3. Use bottom sheets for contextual actions.
4. Keep touch targets at least 44px.
5. Avoid horizontal scroll except for controlled tab lists.
6. Use short copy and progressive disclosure.
7. Never make users compare dense before/after content in tiny columns.

---

## 2. Breakpoint behavior

### Mobile `< 640px`

- Single-column layout.
- Cards full width.
- Page padding: 12px.
- Sticky bottom action for long flows.
- Bottom sheet instead of side sheet.
- Tables become cards.
- Editor/preview becomes segmented control.

### Tablet `640px–1024px`

- One or two columns depending on content density.
- Drawer navigation is acceptable.
- Preview panels can become collapsible.

### Desktop `> 1024px`

- Sidebar + main content layout.
- Split editor/preview allowed.
- Side sheets allowed.
- Larger cards and multi-column dashboards allowed.

---

## 3. Navigation

### WiseResume mobile

Recommended:

- Top bar with logo and menu.
- Bottom nav for most-used areas if app complexity requires it.
- Drawer for secondary pages.

Primary mobile nav items should be limited to 4–5.

Suggested:

- Dashboard
- Resume
- Tailor
- Applications
- More

### WiseHire mobile

WiseHire may be less mobile-heavy, but must still support:

- Dashboard reading
- Candidate review
- Pipeline overview
- Basic actions

Complex recruiter workflows can use full-height sheets.

---

## 4. Buttons and CTAs

- Minimum height: 44px.
- Full-width primary buttons are acceptable on mobile.
- Sticky bottom CTA is recommended for:
  - Upload flow
  - Tailor flow
  - Review/apply changes
  - Export flow
  - Pricing checkout

Do not show multiple full-width primary-looking buttons stacked together.

---

## 5. Forms

Rules:

- One column only.
- Label above field.
- Helper/error text under field.
- Avoid tiny inline controls.
- Use native-friendly inputs where possible.
- Keep job description textarea at least 160px tall.

Long forms should be split into sections.

---

## 6. Resume editor mobile

Desktop split editor/preview should become:

- Segmented control: `Edit | Preview`
- Section accordion/list
- Sticky save state
- AI action available but not floating over critical inputs

Do not place editable form and resume preview side-by-side on mobile.

---

## 7. Tailor results mobile

Before/after comparisons should become:

- Stacked cards
- Toggle between before and after
- Highlight changed text if available
- Show reason below the change

Do not use two-column diff on small mobile screens.

---

## 8. Tables on mobile

Tables should become cards for:

- Applications
- Candidate lists
- Billing history
- Resume versions

Each card should show:

- Main label/title
- Status
- 2–4 key metadata fields
- Main action
- More menu for secondary actions

---

## 9. Sheets and dialogs

Mobile sheets:

- Prefer bottom sheet or full-height sheet.
- Header should stay visible.
- Main CTA should stay visible or appear at bottom.
- Content should scroll independently if long.

Avoid centered desktop dialogs for large mobile tasks.

---

## 10. Mobile accessibility

- Touch target minimum: 44px.
- Inputs must zoom safely; font size should not be below 16px for text fields.
- Focus states must be visible.
- Do not rely on hover.
- Use sufficient contrast.
- Avoid tiny close buttons.

---

## 11. Mobile QA checklist

Test these viewports:

- 360px width
- 390px width
- 430px width
- 768px width
- 1024px width

Test these flows:

- Sign in / onboarding
- Upload resume
- Parse resume
- Edit section
- Preview resume
- Tailor to job
- Review changes
- Apply changes
- Export resume
- Pricing/subscription

For each flow verify:

- [ ] No horizontal overflow.
- [ ] Primary CTA visible.
- [ ] Forms are usable.
- [ ] Keyboard does not hide the focused input or CTA.
- [ ] Error messages are visible.
- [ ] Sheets/dialogs can be closed.
- [ ] Long content scrolls naturally.
