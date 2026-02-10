
# Fix Landing Page Template Gallery

## Problems
1. The template gallery only shows 3 out of 12 available templates (Modern, Executive, Creative)
2. The template previews are just gray skeleton placeholder bars on a dark background -- they look broken/empty as seen in the screenshot
3. The placeholders have very low contrast (`bg-muted-foreground/8`) making them nearly invisible on the dark space theme

## Solution

### Redesign TemplateGallery.tsx with rich, visible previews

**Show more templates:** Expand from 3 to 6 representative templates (Modern, Classic, Creative, Executive, Developer, Elegant) to better showcase the "12 Pro Templates" claim.

**Replace skeleton placeholders with styled mini-previews:** Instead of barely-visible gray bars, render each template card with:
- A white/light background (like a real resume page) so content is visible against the dark space theme
- Colored accent bars and section headers matching each template's style
- Visible placeholder text lines with proper contrast
- Each card styled to hint at its template's unique layout (e.g., Creative shows a sidebar, Professional shows a two-column layout)

**Improve the carousel UX:**
- Show template count badge ("6 of 12 templates")
- Add a "See all templates" link that navigates to the editor
- Better snap scrolling with proper gap and sizing

### Technical Changes

**File: `src/components/landing/TemplateGallery.tsx`**
- Expand `templates` array from 3 to 6 entries with distinct accent colors
- Change the card inner background from `bg-card/80` (dark) to `bg-white` so it looks like an actual resume page
- Use visible placeholder colors (`bg-gray-200`, `bg-gray-300`) instead of near-transparent ones (`bg-muted-foreground/8`)
- Add unique layout hints per template (e.g., sidebar for Creative, two-column grid for Professional)
- Add a "See all 12 templates" link below the dots
- Add subtitle text: "Pick a design, customize it with AI"

**No new files needed. No backend changes.**
