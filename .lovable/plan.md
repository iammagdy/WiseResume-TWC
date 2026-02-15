

## Enhance Design Customization with Line Spacing and Page Format

### What Already Exists

The app already has a comprehensive "Customize Template" sheet (`CustomizeSheet.tsx`) with:
- Color picker (8 preset swatches + custom hex input)
- Font selectors (heading + body, 6 font options)
- Font size control (Small / Medium / Large)
- Layout control (Single / Two Column)
- Spacing control (Compact / Normal / Spacious)
- Margins control (Narrow / Normal / Wide)
- Reset to Default button
- Live mini-preview

It's accessed from the AI Studio bar. This plan adds the two missing controls and a quicker access point.

### Changes

#### 1. Add `lineHeight` and `pageFormat` to the type system

**File: `src/types/resume.ts`** -- Update `TemplateCustomization`:
- Add `lineHeight: 'single' | '1.15' | '1.5' | 'double'`
- Add `pageFormat: 'a4' | 'letter'`

#### 2. Update defaults and CSS application

**File: `src/lib/templateCustomization.ts`**:
- Add `lineHeight: '1.15'` and `pageFormat: 'a4'` to `getDefaultCustomization()`
- Add a `LINE_HEIGHT_VALUES` map: `{ single: 1, '1.15': 1.15, '1.5': 1.5, double: 2 }`
- Add a `PAGE_FORMAT_PX` map: `{ a4: { width: 595, height: 842 }, letter: { width: 612, height: 792 } }` (PDF point sizes, also exported for PDF generation)
- Update `applyCustomizationCSS()` to include `lineHeight` in the returned style object

#### 3. Add controls to the CustomizeSheet UI

**File: `src/components/editor/CustomizeSheet.tsx`**:
- Add a "Line Spacing" segmented control under the existing "Fonts" accordion section with options: Single, 1.15, 1.5, Double
- Add a "Page Format" segmented control under the "Layout" accordion section with options: A4, Letter
- Both use the existing `SegmentedControl` component already in the file

#### 4. Add a "Design" shortcut button in the editor header

**File: `src/pages/EditorPage.tsx`**:
- Add a `Palette` icon button next to the Preview button in the header bar
- Tapping it opens the existing `CustomizeSheet` directly (reuses `handleCustomize`)
- Styled consistently with the Preview button (48px touch target, icon + label)

### What Does NOT Change

- All existing editor sections (Contact, Summary, Work, Education, Skills, More)
- Mobile bottom navigation bar
- AI features and Wise AI chat
- Progress tracking
- Form inputs and validation
- Template rendering logic (templates already read from `customization` prop)
- The existing CustomizeSheet access from the AI Studio bar (still works)

### Technical Notes

- The `lineHeight` CSS property is applied via `applyCustomizationCSS()`, which all templates already call
- The `pageFormat` value is consumed by the PDF generator (`pdfGenerator.ts`) when creating pages -- this will need a small update to read the format from customization instead of hardcoding A4
- All new controls use the existing `SegmentedControl` component and `haptics.selection()` pattern
- No new dependencies needed
