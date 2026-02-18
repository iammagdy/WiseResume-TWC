
# Portfolio Bug Fixes + UX Overhaul

## Root Cause Analysis (4 confirmed bugs)

### Bug 1 — New fields never saved to DB
`useProfile.ts` has a hard-coded `dbUpdates` object in `updateMutation` that only maps the original 14 profile fields. The 6 new fields (`portfolio_style`, `portfolio_layout`, `portfolio_accent_color`, `portfolio_font`, `open_to_work`, `availability_headline`) are passed from the editor's `handleSave` under camelCase keys, but `updateMutation` ignores any key it doesn't explicitly map. The DB never receives these values.

### Bug 2 — New fields never read from DB
The `fetchProfile` SELECT query only fetches 14 columns — it does not include `portfolio_style`, `portfolio_layout`, `portfolio_accent_color`, `portfolio_font`, `open_to_work`, `availability_headline`, or `views`. The local state in the editor syncs from the profile object, which is missing these keys — so after a page reload the editor shows stale/default values and the profile.portfolioStyle etc. always come back as undefined.

### Bug 3 — Download generates a resume PDF, not a portfolio screenshot
`handleDownload` in PublicPortfolioPage imports `generatePDF` with `hiddenTemplateRef` (an off-screen resume template render). This produces a multi-page, formatted resume document. The user wants a single-page screenshot of the actual portfolio web page as it appears visually, and visitors should NOT get access to the resume template output. The button text is "Download CV" instead of "Download Portfolio PDF".

### Bug 4 — Editor page is a wall of cards with no collapse
All 9 cards in `PortfolioEditorPage` are always fully expanded. On a mobile screen this creates an enormous scroll — users get lost. All cards except "Status" and "Publish" need to be collapsible accordions, collapsed by default.

---

## What Gets Fixed: File by File

### File 1: `src/hooks/useProfile.ts`

**Change 1a — Extend the Profile interface** with the 6 new fields plus `views`:
```typescript
interface Profile {
  // ... existing fields ...
  views: number;
  portfolioStyle: string | null;
  portfolioLayout: string | null;
  portfolioAccentColor: string | null;
  portfolioFont: string | null;
  openToWork: boolean;
  availabilityHeadline: string | null;
}
```

**Change 1b — Extend `fetchProfile` SELECT string** to include the new columns:
```
'..., portfolio_style, portfolio_layout, portfolio_accent_color, portfolio_font, open_to_work, availability_headline, views'
```
And map them in the return object:
```typescript
portfolioStyle: data.portfolio_style ?? null,
portfolioLayout: data.portfolio_layout ?? null,
portfolioAccentColor: data.portfolio_accent_color ?? null,
portfolioFont: data.portfolio_font ?? null,
openToWork: data.open_to_work ?? false,
availabilityHeadline: data.availability_headline ?? null,
views: data.views ?? 0,
```

**Change 1c — Extend `updateMutation` `dbUpdates` map** to write the new fields:
```typescript
portfolio_style: updates.portfolioStyle !== undefined ? updates.portfolioStyle : (profile?.portfolioStyle ?? null),
portfolio_layout: updates.portfolioLayout !== undefined ? updates.portfolioLayout : (profile?.portfolioLayout ?? null),
portfolio_accent_color: updates.portfolioAccentColor !== undefined ? updates.portfolioAccentColor : (profile?.portfolioAccentColor ?? null),
portfolio_font: updates.portfolioFont !== undefined ? updates.portfolioFont : (profile?.portfolioFont ?? null),
open_to_work: updates.openToWork !== undefined ? updates.openToWork : (profile?.openToWork ?? false),
availability_headline: updates.availabilityHeadline !== undefined ? updates.availabilityHeadline : (profile?.availabilityHeadline ?? null),
```

**Change 1d — Remove staleTime** or reduce it to 0 so profile data is always fresh after a save:
The current `staleTime: 5 * 60 * 1000` means after saving, the editor will show the old cached values for 5 minutes. Change it to `staleTime: 0` so the profile is always re-fetched when needed.

**Also fix the `onSuccess` toast** — currently `updateMutation.onSuccess` calls `toast.success('Profile updated successfully')`. But `handleSave` in the editor already shows its own `toast.success('Portfolio saved!')` — this causes a double toast. Remove the toast from `useProfile`'s `onSuccess`.

---

### File 2: `src/pages/PublicPortfolioPage.tsx`

**Change 2a — Replace `handleDownload` with a portfolio screenshot PDF:**

Remove the hidden template reference entirely. Instead, use `html2canvas` (already installed) to capture the portfolio page's main content div, then write it onto a single A4/letter PDF page using `pdf-lib` (also already installed). The image scales to fill the page width.

```typescript
const handleDownload = async () => {
  setIsDownloading(true);
  try {
    const [{ default: html2canvas }, { PDFDocument }] = await Promise.all([
      import('html2canvas'),
      import('pdf-lib').then(m => ({ default: m.PDFDocument })),
    ]);

    // Target the visible portfolio content (not the hidden template)
    const portfolioEl = document.getElementById('portfolio-content');
    if (!portfolioEl) throw new Error('Content not found');

    const canvas = await html2canvas(portfolioEl, {
      scale: 1.5,
      useCORS: true,
      logging: false,
      backgroundColor: rootBgColor, // matches theme background
    });

    // Create PDF with the canvas as a single page scaled to A4
    const pdfDoc = await PDFDocument.create();
    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    const imgBytes = await fetch(imgData).then(r => r.arrayBuffer());
    const img = await pdfDoc.embedJpg(imgBytes);

    const pageWidth = 595;  // A4 points width
    const pageHeight = Math.round((canvas.height / canvas.width) * pageWidth);
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    page.drawImage(img, { x: 0, y: 0, width: pageWidth, height: pageHeight });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const { downloadFile } = await import('@/lib/downloadUtils');
    await downloadFile({ blob, fileName: `${profile.fullName?.replace(/\s+/g, '_') || 'Portfolio'}_Portfolio.pdf` });
    toast.success('Portfolio PDF downloaded!');
  } catch {
    toast.error('Failed to generate PDF');
  } finally {
    setIsDownloading(false);
  }
};
```

**Change 2b — Remove the hidden off-screen template div entirely.** No more resume template rendering on the public page. Remove `hiddenTemplateRef`, `resumeData`, `TemplateComponent`, `templateComponents` import, `toResumeData` function, `Suspense`, and the hidden div at the bottom. This is a security improvement — visitors can no longer access the raw resume data or trigger a resume PDF.

**Change 2c — Change button label** from "Download CV" to "Download Portfolio PDF".

**Change 2d — Add `id="portfolio-content"`** to the main content `<motion.div>` wrapper so `html2canvas` can target it.

---

### File 3: `src/pages/PortfolioEditorPage.tsx`

**Change 3a — Add collapsible accordion behavior to all cards except Status and Publish.**

Add a local state `openSections` (a Set) and a `toggleSectionOpen(name)` helper. Each card gets a header row with a `ChevronDown/ChevronUp` toggle. Collapsed by default except Status (always open) and Publish (always open). The collapsed state is determined by whether the section name is in `openSections`.

Default open on first load: Status (always), Publish (always). Collapsed by default: Portfolio Strength, Visual Theme, Customization, Availability, Identity, About Me Bio, Social Links, Visible Sections, SEO & Sharing.

Card header pattern (applied to all collapsible cards):
```tsx
<button
  onClick={() => toggleSectionOpen('theme')}
  className="flex items-center justify-between w-full"
>
  <div className="flex items-center gap-2">
    <Palette className="w-4 h-4 text-primary" />
    <h3 className="font-semibold text-foreground">Visual Theme</h3>
  </div>
  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openSections.has('theme') ? 'rotate-180' : ''}`} />
</button>
{openSections.has('theme') && (
  // ... card content ...
)}
```

**Change 3b — Show summary hints in collapsed state** so users know the current value without expanding:
- Visual Theme card: when collapsed, show the current theme name as a small badge
- Availability: when collapsed, show "Open to Work ✓" or the headline preview
- Bio: when collapsed, show first 40 chars of bio
- Identity: when collapsed, show the username

This makes the collapsed state informative, not just blank.

**Change 3c — Reduce save button duplication.** Currently "Unpublish Portfolio" calls `setPortfolioEnabled(false); handleSave();` — but `handleSave` runs immediately with the old `portfolioEnabled` value before the setState has updated (React batches). Fix by passing `false` directly into the save payload.

---

## Files Changed Summary

| File | Changes |
|------|---------|
| `src/hooks/useProfile.ts` | Add 7 new fields to Profile type, SELECT, and dbUpdates map; set staleTime to 0; remove duplicate toast |
| `src/pages/PublicPortfolioPage.tsx` | Replace resume PDF download with html2canvas portfolio screenshot PDF; remove hidden template; rename button; add id to content div |
| `src/pages/PortfolioEditorPage.tsx` | Add collapsible accordion behavior to 7 cards; show summary hints in collapsed state; fix Unpublish button race condition |

No database changes needed — the DB columns already exist from the previous migration.
No edge function changes needed.
No new dependencies needed — html2canvas and pdf-lib are already installed.

---

## Risk Assessment

| Change | Risk | Notes |
|--------|------|-------|
| useProfile SELECT + dbUpdates | Low | Additive only — existing columns unchanged, new columns nullable |
| Remove hidden template from public page | Low | Public URL unchanged; portfolio still renders; only the PDF mechanism changes |
| html2canvas screenshot PDF | Low | html2canvas already used in the rest of the app for resume PDFs |
| Collapsible editor cards | Very low | UI-only change; no data logic affected |
| staleTime: 0 | Low | Slightly more DB reads on profile pages but ensures fresh data always |
