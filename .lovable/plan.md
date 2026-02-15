

## Smart Gap Filler -- AI-Powered Employment Gap Resolution

### Overview

When the app detects employment gaps in a user's timeline, instead of just "explaining" the gap, the AI will now offer to **fill it** by generating a complete experience entry. The user provides a brief description (e.g., "I was in the military" or "I did HR at Whitewell"), and the AI returns 3 professional title suggestions with smart placement -- all insertable with a single tap.

### User Flow

1. User sees a gap detected in the Experience Timeline (already exists)
2. User taps **"Fill Gap"** (new button alongside existing "Explain" button)
3. A new **GapFillerSheet** opens showing:
   - The gap period (e.g., "Jan 2014 -- Mar 2016")
   - Quick-select chips for common reasons: **Military Service**, **Freelance/Contract**, **Education**, **Caregiving**, **Sabbatical**, **Other**
   - A text input: *"Tell us briefly what you did during this time"*
4. User selects a chip and/or types a brief description, taps **"Suggest Titles"**
5. AI returns **3 clickable title cards**, each showing:
   - Suggested job title (e.g., "Human Resources Coordinator")
   - Company/Organization name (from user input or generated)
   - A 2-sentence description with achievements
   - "Between [Previous Job] and [Next Job]" placement indicator
6. User taps one of the 3 cards to select it
7. Taps **"Add to Resume"** -- the experience entry is inserted at the correct chronological position
8. Toast: "Experience added! Gap resolved."

### Technical Changes

**1. New Component: `src/components/editor/GapFillerSheet.tsx`**

- Bottom sheet (85vh) with the "Vibrant Space" glass styling
- Props: `isOpen`, `onClose`, `gap: GapInfo`, `experiences: Experience[]`, `onAddExperience: (exp: Experience) => void`
- State: `category` (chip selection), `userDescription` (text input), `suggestions` (3 AI results), `selectedIndex`, `isGenerating`
- Quick-select chip grid (2 columns, 44px touch targets) for common gap categories
- Text input for free-form description
- AI suggestion cards rendered as selectable radio-style cards with `active:scale-95` haptic feedback
- "Add to Resume" button that creates a new `Experience` object with correct dates and inserts it

**2. New Edge Function: `supabase/functions/fill-gap/index.ts`**

- Accepts: `gap` (dates, months), `category`, `userDescription`, `previousJob`, `nextJob`
- Uses Lovable AI (`google/gemini-3-flash-preview`) via tool calling to return structured output:
  ```
  {
    suggestions: [
      {
        title: "Human Resources Coordinator",
        company: "Whitewell Group",
        description: "Managed employee onboarding...",
        achievements: ["Streamlined hiring process...", "Reduced turnover by 15%..."]
      },
      // ... 2 more options
    ]
  }
  ```
- Auth-protected, rate-limit aware (429/402 handling)
- The AI prompt instructs Gemini to:
  - Generate 3 distinct but plausible professional titles
  - Tailor descriptions to bridge the career narrative between the previous and next jobs
  - Handle special cases (military = rank/role, education = degree program, caregiving = volunteer framing)

**3. Update `src/components/editor/ExperienceTimeline.tsx`**

- Add a new "Fill Gap" button next to the existing "Explain" button on gap segments
- New prop: `onFillGap?: (gap: GapInfo) => void`
- Both mobile card view and desktop bar view get the new button

**4. Update `src/components/editor/ExperienceSection.tsx`**

- Import and render the new `GapFillerSheet`
- Add `showGapFiller` and `selectedGapForFill` state
- Wire `onFillGap` callback from the timeline to open the sheet
- `onAddExperience` callback inserts the new entry at the correct chronological position in the `experience` array and auto-expands it for review

**5. Update `supabase/config.toml`**

- Register the new `fill-gap` edge function with `verify_jwt = true`

### Smart Placement Logic

When inserting the new experience, the app will:
1. Parse all existing experience dates
2. Find the correct chronological position based on the gap's start date
3. Insert the new entry at that index in the array
4. Auto-expand the newly added entry so the user can review/edit immediately

### Edge Cases Handled

- **Military service**: AI generates rank-appropriate titles (e.g., "Logistics Specialist, U.S. Army")
- **Freelance/Contract**: AI frames it as self-employment with client-facing achievements
- **Education**: AI creates an education-framed entry or suggests adding to the Education section instead
- **Caregiving/Health**: AI creates a tasteful, professional framing without over-sharing
- **User provides company name**: AI uses it directly instead of generating one

