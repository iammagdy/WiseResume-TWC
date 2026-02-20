

# Extract Portfolio Editor Sections into Separate Components

## Overview

The `PortfolioEditorPage.tsx` file is 1068 lines. We will extract the three largest section bodies into dedicated components, keeping the page file as the orchestrator for state and layout.

## New Files

### 1. `src/components/portfolio/editor/ProfileSection.tsx`
Extracts lines 671-760 (the Profile `CollapsibleCard` and all its contents).

**Props interface:**
```typescript
interface ProfileSectionProps {
  openSections: Set<string>;
  toggleSection: (id: string) => void;
  username: string;
  onUsernameChange: (val: string) => void;
  usernameError: string;
  usernameAvailable: boolean | null;
  checkingUsername: boolean;
  resumes: Array<{ id: string; title: string; is_primary?: boolean }>;
  selectedResumeId: string;
  onSelectedResumeIdChange: (id: string) => void;
  bio: string;
  onBioChange: (val: string) => void;
  onGenerateBio: () => void;
  generatingBio: boolean;
  githubUrl: string;
  onGithubUrlChange: (val: string) => void;
  websiteUrl: string;
  onWebsiteUrlChange: (val: string) => void;
  twitterUrl: string;
  onTwitterUrlChange: (val: string) => void;
  contactEmail: string;
  onContactEmailChange: (val: string) => void;
  openToWork: boolean;
  onOpenToWorkChange: (val: boolean) => void;
  availabilityHeadline: string;
  onAvailabilityHeadlineChange: (val: string) => void;
  onGenerateAvailability: () => void;
  generatingAvailability: boolean;
  currentUsername: string | null;
}
```

Contains: `CollapsibleCard` with id `profile`, username input with availability check, source resume select, bio textarea with AI generate, social link inputs, availability toggle and headline.

### 2. `src/components/portfolio/editor/AppearanceSection.tsx`
Extracts lines 765-851 (the Appearance `CollapsibleCard` and all its contents).

**Props interface:**
```typescript
interface AppearanceSectionProps {
  openSections: Set<string>;
  toggleSection: (id: string) => void;
  portfolioStyle: PortfolioStyle;
  onPortfolioStyleChange: (val: PortfolioStyle) => void;
  portfolioAccentColor: string;
  onPortfolioAccentColorChange: (val: string) => void;
  portfolioFont: PortfolioFont;
  onPortfolioFontChange: (val: PortfolioFont) => void;
  portfolioLayout: PortfolioLayout;
  onPortfolioLayoutChange: (val: PortfolioLayout) => void;
  selectedTheme: string;
  onSelectedThemeChange: (val: string) => void;
}
```

Contains: `CollapsibleCard` with id `appearance`, theme picker (horizontal scroll), accent color presets + custom picker, font style grid, desktop layout grid, page color mode select.

Moves `ThemePreviewCard`, `THEMES`, `ACCENT_PRESETS`, and the type aliases (`PortfolioStyle`, `PortfolioLayout`, `PortfolioFont`) into this file and re-exports the types for use by the parent page.

### 3. `src/components/portfolio/editor/ContentVisibilitySection.tsx`
Extracts lines 856-898 (the Content & Visibility `CollapsibleCard`).

**Props interface:**
```typescript
interface ContentVisibilitySectionProps {
  openSections: Set<string>;
  toggleSection: (id: string) => void;
  sections: PortfolioSections;
  onToggleSectionVisibility: (key: keyof PortfolioSections) => void;
  syncMode: 'auto' | 'locked';
  onSyncModeChange: (val: 'auto' | 'locked') => void;
}
```

Contains: `CollapsibleCard` with id `content`, section visibility toggles, sync mode radio buttons.

Moves `PortfolioSections`, `DEFAULT_SECTIONS`, and `SECTION_LABELS` into this file and re-exports them.

## Changes to `src/pages/PortfolioEditorPage.tsx`

1. **Add imports** for `ProfileSection`, `AppearanceSection`, `ContentVisibilitySection` and the re-exported types/constants.
2. **Remove** the inline JSX for the three CollapsibleCards (Profile lines 671-760, Appearance lines 765-851, Content lines 856-898) and replace each with a single component tag passing the required props.
3. **Remove** `ThemePreviewCard`, `THEMES`, `ACCENT_PRESETS`, type aliases, `PortfolioSections`, `DEFAULT_SECTIONS`, `SECTION_LABELS` from the page file (import them from the new components instead).
4. **Keep** `CollapsibleCard` and `SubSectionHeading` in the page file since they are also used by the remaining sections (Visitors, Case Studies, Services, SEO). Alternatively, move them to a shared file -- but to minimize scope, we keep them in-place for now.

## Shared Utilities

`CollapsibleCard` and `SubSectionHeading` are used by both the parent page (for Visitors, Case Studies, Services, SEO) and the new extracted components. To avoid circular imports:
- Create `src/components/portfolio/editor/shared.tsx` containing `CollapsibleCard` and `SubSectionHeading`.
- All files import from this shared module.

## Result

- `PortfolioEditorPage.tsx` drops from ~1068 lines to ~650 lines
- Each extracted section is self-contained and independently testable
- No behavioral changes -- purely a structural refactor
