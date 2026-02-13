

## Settings Page Enhancement

### Overview
Restructure the Settings page for better visual hierarchy, reduced redundancy, and a more polished mobile-first experience. The changes focus on removing duplicate sign-up prompts, consolidating help resources, compacting the developer section, and improving spacing and footer presentation.

### Changes

**File: `src/pages/SettingsPage.tsx`**

#### 1. Remove Duplicate Guest Upselling
- **Delete** the top dismissible guest banner (lines 215-230) entirely
- **Keep** the welcome card (lines 276-306) as the sole guest CTA -- it's more visually appealing and informative
- Remove the `guestBannerDismissed` state and `dismissGuestBanner` function (lines 99-104) and the `X` icon import since they become unused

#### 2. Improve Section Headers
- Increase section icon size from `w-3.5 h-3.5` to `w-4 h-4` across all 8 section headers
- Add a `<Separator>` between each major section for visual separation
- Increase inter-section spacing from `space-y-6` (line 213) to `space-y-8`

#### 3. Compact Developer Info
- Replace the large `DeveloperCreditCard` component and its surrounding contact links (lines 550-575) with a single compact `SettingsRow` of type `navigation`:
  - Label: "Created by Magdy Saber"
  - Description: "Creator & Developer"
  - Icon: developer avatar (small round image)
  - onClick: opens `https://magdysaber.com` in new tab
- Remove the `DeveloperCreditCard` import and `developerPhoto` import
- This saves significant vertical space while still crediting the developer

#### 4. Consolidate Help Section
- Replace the three separate "Docs", "Email Support", "Community" buttons (lines 623-658) with a single `SettingsRow` navigation item:
  - Label: "Get Help"
  - Description: "Docs, email support, and community"
  - Icon: `BookOpen`
  - onClick: opens a new `HelpSheet` bottom sheet
- Create a new lightweight `HelpSheet` component that presents the three options as `SettingsRow` navigation items inside a bottom sheet

#### 5. Hide Non-Functional Biometric Row on Web
- Conditionally render the Biometric Lock toggle only when `biometricAvailable` is true (lines 471-499)
- This removes the confusing disabled "Available on mobile app" row from web users

#### 6. ElevenLabs Connect Button Enhancement
- Change the "Connect" button variant from `outline` to `default` (line 385) to make it more prominent with the primary color

#### 7. Move Version to Footer
- Remove the version info card (lines 612-621)
- Add a simple centered footer below all sections:
  ```
  WiseResume v1.0.0
  Made with love in Egypt
  ```
  Using `text-xs text-muted-foreground` styling, centered, with proper bottom padding

#### 8. Increase Container Padding
- Change main container padding from `px-4` to `px-5` (line 213) for more breathing room

### New File

**`src/components/settings/HelpSheet.tsx`**
- A simple bottom sheet with three navigation rows: Docs, Email Support, Community
- Each row opens the respective URL/mailto link
- Uses existing `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle` components
- Follows the standardized bottom sheet layout pattern (flex-based with Header/Body)

### Technical Details

**Imports to remove from SettingsPage:**
- `DeveloperCreditCard` component
- `developerPhoto` asset
- `X` icon (only used in guest banner)

**Imports to add:**
- `HelpSheet` (lazy-loaded)

**State changes:**
- Remove: `guestBannerDismissed`, `dismissGuestBanner`
- Add: `helpSheetOpen` boolean state

**No breaking changes** -- all existing sheets and dialogs remain functional. The developer credit and help resources are preserved, just reorganized for better UX.

### Files Modified
1. `src/pages/SettingsPage.tsx` -- main restructuring
2. `src/components/settings/HelpSheet.tsx` -- new file for consolidated help options

