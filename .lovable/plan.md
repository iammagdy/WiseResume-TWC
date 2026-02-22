

# Full Rewrite: Portfolio Editor Tab UI

## Current Problems

1. **Giant hero card** -- The "Portfolio Overview" card crams 10+ elements into one card: title, badge, URL row, stats, strength tips, publish toggle, save button, unpublish button, career card button, AND a live preview. This creates visual overload.
2. **Save button buried** -- The most important action (Save) is hidden inside the hero card, requiring scrolling back up after editing sections below.
3. **Too many collapsible sections** -- 8+ collapsible cards stacked vertically feel like a settings dump, not a clean editor.
4. **No visual breathing room** -- Everything is glass-elevated cards with no hierarchy distinction between primary and secondary content.
5. **Redundant elements** -- Strength tips, career card button, and live preview all compete for attention inside one card.

## Redesign Approach

### Layout Structure

```text
+----------------------------------+
| Header: "Portfolio" + Save btn   |
+----------------------------------+
| Status Bar (Live/Draft + URL)    |
+----------------------------------+
|                                  |
| Live Preview Card (compact)      |
|                                  |
+----------------------------------+
| Tab Row: [Setup] [Design] [More] |
+----------------------------------+
|                                  |
|   Tab Content (scrollable)       |
|   - Setup: username, resume,     |
|     bio, socials, availability   |
|   - Design: theme, accent,       |
|     font, layout                 |
|   - More: sections, case studies,|
|     testimonials, SEO, analytics |
|                                  |
+----------------------------------+
| Sticky Bottom: [Save Portfolio]  |
+----------------------------------+
```

### Key Design Decisions

1. **Sticky Save Bar** -- Save button moves to a sticky bottom bar (above BottomTabBar). Always visible, never lost.
2. **3-tab layout** -- Instead of 8 collapsible cards, group everything into 3 tabs: "Setup", "Design", "More". This reduces cognitive load massively.
3. **Compact status bar** -- The Live/Draft badge + URL + copy button become a thin strip at the top, not a giant card.
4. **Live preview stays** -- But becomes smaller and sits between the status bar and tabs as a visual anchor.
5. **Remove strength tips from main view** -- The strength score becomes a small badge on the status bar. Tips show in a tooltip/popover if tapped.
6. **Remove career card from hero** -- Move it into the "More" tab as a simple button.

### What Goes Where

**Status Bar (always visible):**
- Live/Draft badge
- Portfolio URL (truncated) + copy button
- QR button
- Strength score badge

**Live Preview Card:**
- Compact avatar + name + job title preview (existing component, kept small)

**Setup Tab:**
- Username input
- Source resume selector
- Bio textarea + AI generate
- Social links (GitHub, website, Twitter, email)
- Open to Work toggle + availability headline

**Design Tab:**
- Theme store picker (existing grid)
- Accent color presets
- Font style selector
- Desktop layout selector
- Page color mode

**More Tab:**
- Content visibility toggles (which sections show)
- Sync mode (auto/locked)
- Case studies
- Services
- Testimonials
- Highlight metrics
- SEO & Sharing
- Visitors & Analytics
- Career Card button

**Sticky Bottom Bar:**
- "Save Portfolio" primary button (full width)
- Publish/Unpublish toggle integrated as a secondary action

## Technical Details

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/portfolio/editor/StatusBar.tsx` | Compact status strip with URL, badge, copy, QR, strength |
| `src/components/portfolio/editor/SetupTab.tsx` | Username, resume, bio, socials, availability |
| `src/components/portfolio/editor/DesignTab.tsx` | Theme, accent, font, layout, color mode |
| `src/components/portfolio/editor/MoreTab.tsx` | Sections visibility, extras, SEO, analytics, career card |
| `src/components/portfolio/editor/SaveBar.tsx` | Sticky bottom save/publish bar |

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/PortfolioEditorPage.tsx` | Complete rewrite of the render section. Keep all state/logic, replace the JSX with new tabbed layout using the new components. Remove the `FloatingViewLivePill` (replaced by View Live link in status bar). |

### Files to Delete

None -- existing editor sub-components (`ProfileSection.tsx`, `AppearanceSection.tsx`, `ContentVisibilitySection.tsx`) will be kept as they can still be imported by the new tab components or gradually deprecated. The `CollapsibleCard` and `SubSectionHeading` shared components remain useful inside the "More" tab.

### Tab Implementation

Use a simple `useState<'setup' | 'design' | 'more'>` with conditional rendering (no router). Tab row uses pill-style buttons matching the app's existing pattern with 44px min touch targets.

### Save Bar Positioning

The sticky save bar uses `fixed bottom-[calc(5rem+env(safe-area-inset-bottom))]` to sit above the BottomTabBar, with `left-0 right-0 px-4` for full-width alignment. The publish toggle becomes a small switch inline with the save button text.

### View Live

Instead of a floating pill, the status bar URL becomes tappable -- tapping it opens the live portfolio. A small external link icon indicates this.
