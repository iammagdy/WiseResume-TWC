

## Pre-Written Content Library + Template Customization

Two additive features for the resume editor: a searchable phrase library accessible via a "Get Ideas" button, and a per-document template customization panel. No existing files are deleted or broken.

---

### Part 1: Pre-Written Content Library

**New Files:**

1. **`src/lib/contentLibrary.ts`** -- Static data file with 500+ phrases
   - Categories: `action-verbs`, `achievements`, `skills-descriptions`, plus 10 industry-specific categories (tech, finance, healthcare, marketing, sales, education, engineering, legal, design, management)
   - Each phrase has: `id`, `text`, `category`, `industry` (optional), `variables` (array of placeholder names like `{number}`, `{percentage}`)
   - Example: `{ id: 'ach-1', text: 'Reduced costs by {percentage}% through {method}', category: 'achievements', variables: ['percentage', 'method'] }`
   - TypeScript interface: `ContentPhrase { id: string; text: string; category: ContentCategory; industry?: string; variables?: string[] }`

2. **`src/store/contentLibraryStore.ts`** -- Zustand store (persisted)
   - State: `favorites: string[]` (phrase IDs), `recentlyUsed: string[]` (last 20 used)
   - Actions: `toggleFavorite(id)`, `addToRecent(id)`, `clearRecents()`

3. **`src/components/editor/ContentLibrarySheet.tsx`** -- Bottom sheet (75% height)
   - Drag handle at top
   - Search bar with auto-focus on open
   - Horizontal scroll category chips: "All", "Action Verbs", "Achievements", "Skills", + industry chips
   - Two sub-tabs: "Browse" | "Favorites"
   - Vertical scroll phrase cards below:
     - Phrase text (16px, readable)
     - Category badge (small colored chip)
     - "Insert" button (right side, 44px touch target)
     - Star icon to toggle favorite (left of Insert)
   - Tap "Insert" -> calls `onInsert(phraseText)` callback, haptic feedback, toast "Phrase added"
   - Variables like `{number}` highlighted in primary color
   - Empty state for favorites tab

**Integration into Editor:**

4. **`src/pages/EditorPage.tsx`** -- Minor changes
   - Add `showContentLibrary` state
   - Add lazy import for `ContentLibrarySheet`
   - Add "Get Ideas" button in the AI assistant bar area or as a secondary floating action
   - `onInsert` callback: depending on active tab, appends phrase to the relevant field (summary textarea, experience description, or skills list)

5. **`src/components/editor/AIAssistantBar.tsx`** -- Add "Ideas" tool
   - Add a new tool entry to `secondaryTools`: `{ id: 'ideas', icon: Lightbulb, label: 'Ideas', color: 'text-yellow-500' }`
   - Wire click to `onGetIdeas` callback prop

**Phrase insertion logic:**
- `summary` tab: Append phrase to summary text with a newline
- `experience` tab: Append phrase as a new achievement bullet to the currently expanded experience entry
- `skills` tab: If phrase is a skill, add to skills array
- For other tabs: Copy phrase to clipboard with toast "Copied to clipboard"
- After insert, replace `{variable}` placeholders with highlighted inline editable spans (or leave as-is with instructions to edit)

---

### Part 2: Template Customization

**New Types:**

6. **`src/types/resume.ts`** -- Add customization types
   - `TemplateCustomization { accentColor: string; fontHeading: string; fontBody: string; fontSize: 'small' | 'medium' | 'large'; layout: 'single' | 'two-column'; spacing: 'compact' | 'normal' | 'spacious'; margins: 'narrow' | 'normal' | 'wide' }`
   - Add `customization?: TemplateCustomization` to `ResumeData` interface

**New Files:**

7. **`src/components/editor/CustomizeSheet.tsx`** -- Full-screen bottom sheet
   - Live preview at top (50% of screen, scaled-down template render)
   - Controls at bottom (50%, scrollable)
   - Accordion sections (one open at a time):
     - **Colors**: 8 preset palette swatches (44px each) + custom color picker input; palettes: Professional (navy/gray), Creative (teal/coral), Bold (red/black), Warm (brown/cream), Cool (blue/slate), Nature (green/earth), Royal (purple/gold), Mono (black/white)
     - **Fonts**: Heading font dropdown (Inter, Playfair Display, Roboto, Merriweather, Poppins, Lato) + Body font dropdown (same list); Size segmented control: Small | Medium | Large
     - **Layout**: Single/Two Column toggle switch; Spacing segmented control: Compact | Normal | Spacious; Margins segmented control: Narrow | Normal | Wide
   - Fixed bottom bar: "Apply" primary button + "Reset to Default" ghost button
   - Real-time preview updates as user changes controls
   - All changes stored in `ResumeData.customization` via `updateResume()`

8. **`src/lib/templateCustomization.ts`** -- Helper utilities
   - `getDefaultCustomization(): TemplateCustomization` -- returns sensible defaults
   - `applyCustomizationCSS(customization: TemplateCustomization): CSSProperties` -- converts customization to inline styles for template rendering
   - `PRESET_PALETTES` -- array of named color palettes
   - `FONT_OPTIONS` -- array of available fonts with display names

**Integration:**

9. **`src/pages/EditorPage.tsx`** -- Add customize button
   - Add `showCustomize` state
   - Lazy import `CustomizeSheet`
   - Add to sheets section

10. **`src/components/editor/AIAssistantBar.tsx`** -- Add "Customize" tool
    - Already has `Palette` icon imported
    - Add `onCustomize` callback prop
    - Wire to open the customize sheet

11. **Template rendering** -- Each template component receives `customization` from `ResumeData`
    - Templates apply accent color via inline `style` overrides (no Tailwind modification)
    - Font family applied via inline `style={{ fontFamily: customization.fontBody }}`
    - Font size scaled via a multiplier on base sizes
    - Spacing/margins applied via padding/gap adjustments
    - This is a non-breaking change: templates render normally when `customization` is undefined

12. **Database** -- No schema changes needed
    - `customization` object is stored as part of the resume JSON fields (contact_info, or as a new JSONB column)
    - Option: Add `customization jsonb DEFAULT '{}'` column to `resumes` table for clean separation

**Database migration (optional but recommended):**
```sql
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS customization jsonb DEFAULT '{}';
```

---

### Technical Details

**New files to create:**
- `src/lib/contentLibrary.ts` (phrase data, ~500 entries)
- `src/store/contentLibraryStore.ts` (favorites/recents store)
- `src/components/editor/ContentLibrarySheet.tsx` (bottom sheet UI)
- `src/components/editor/CustomizeSheet.tsx` (customization panel)
- `src/lib/templateCustomization.ts` (customization utilities)

**Files to modify:**
- `src/types/resume.ts` -- Add `TemplateCustomization` interface, add `customization?` to `ResumeData`
- `src/pages/EditorPage.tsx` -- Add states + lazy imports for both sheets, wire callbacks
- `src/components/editor/AIAssistantBar.tsx` -- Add "Ideas" and "Customize" tools, add callback props

**Mobile-first patterns:**
- Content library sheet: 75% height bottom sheet, horizontal scroll chips, 44px touch targets, haptic on insert
- Customize sheet: Full-screen bottom sheet, accordion sections, 44px color swatches, segmented controls
- All interactive elements: `active:scale-95`, `touch-manipulation`, `touchAction: 'pan-y'`
- Safe area padding: `pb-safe` on bottom-fixed buttons
- 16px minimum font on all inputs to prevent iOS zoom

**Implementation order:**
1. Content library data file (`contentLibrary.ts`)
2. Content library store (`contentLibraryStore.ts`)
3. Content library sheet component
4. Template customization types and utilities
5. Customize sheet component
6. Database migration for `customization` column
7. Wire both sheets into EditorPage + AIAssistantBar
8. Test on 375px viewport

