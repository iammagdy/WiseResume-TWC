# Mobile Performance & Responsiveness QA Checklist

Run through this checklist before each release.

## Device Widths to Test

Test in **Chrome DevTools → Device Mode** at these widths (portrait + landscape):

| Width | Device Example        | Portrait | Landscape | Notes |
|-------|-----------------------|----------|-----------|-------|
| 320px | iPhone SE / 5         | ☐        | ☐         |       |
| 360px | Galaxy S8 / S9        | ☐        | ☐         |       |
| 375px | iPhone 6/7/8 / SE 2   | ☐        | ☐         |       |
| 390px | iPhone 12/13/14       | ☐        | ☐         |       |
| 414px | iPhone 8 Plus         | ☐        | ☐         |       |
| 768px | iPad Mini (portrait)  | ☐        | ☐         |       |

## Flows to Verify

For **each width** above, walk through:

1. **Onboarding** — signup / login screens render correctly
2. **Create / Edit CV** — all form sections, drag handles, section reordering
3. **Export / Share** — PDF preview, share modal, QR code
4. **Settings / Developer Card** — ElectricBorder animation, toggle switches
5. **Bottom Tab Navigation** — all tabs reachable, active state visible

## What to Check

- [ ] No horizontal scroll on any screen
- [ ] No clipped or overlapping text
- [ ] All buttons/links have ≥ 44×44 px touch targets
- [ ] No white flashes on refresh or route change
- [ ] Animations (ElectricBorder, page transitions) remain smooth
- [ ] Modals / drawers don't overflow viewport
- [ ] Keyboard doesn't obscure active input fields

## Breakpoint Issues Log

| Breakpoint | Screen / Flow | Issue Description | Fix Applied? |
|------------|---------------|-------------------|--------------|
|            |               |                   |              |
