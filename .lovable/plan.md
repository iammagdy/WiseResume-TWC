

# Unify All Loading Spinners Across the App

## Overview
There are **61 files** using the generic `Loader2` spinning icon from Lucide. This plan creates a branded `MiniSpinner` component that mirrors the futuristic concentric-ring style of the `PageLoadingSpinner`, then replaces every `Loader2 animate-spin` usage across the entire app.

## What Gets Created

### New Component: `src/components/ui/MiniSpinner.tsx`
A small, branded spinner using pure CSS animations (no framer-motion needed for inline spinners). It renders two concentric spinning rings matching the primary color, at any size.

- Accepts a `size` prop (default: 16) and optional `className`
- Uses CSS `@keyframes` for two counter-rotating rings (matching the PageLoadingSpinner look)
- Works at all sizes: 12px (tiny badges), 16px (buttons), 20px (medium), 32px (section loaders)
- Drop-in replacement anywhere `Loader2 className="w-4 h-4 animate-spin"` is used

Visual: Two concentric rings spinning in opposite directions with primary-colored arcs -- the same visual DNA as the full-page spinner, just miniaturized.

## What Gets Updated

All **61 files** that currently use `Loader2` with `animate-spin` will be updated:
- Replace `import { ..., Loader2, ... } from 'lucide-react'` with `import { MiniSpinner } from '@/components/ui/MiniSpinner'`
- Replace `<Loader2 className="w-4 h-4 animate-spin" />` with `<MiniSpinner size={16} />`
- Replace `<Loader2 className="w-5 h-5 animate-spin" />` with `<MiniSpinner size={20} />`
- Replace `<Loader2 className="w-8 h-8 animate-spin" />` with `<MiniSpinner size={32} />`
- Preserve any extra classes like `mr-2`, `text-primary`, `inline` by passing them via `className`

### Size Mapping
| Old Tailwind Class | Pixel Size | New Component |
|---|---|---|
| `w-3 h-3` | 12px | `<MiniSpinner size={12} />` |
| `w-3.5 h-3.5` | 14px | `<MiniSpinner size={14} />` |
| `w-4 h-4` | 16px | `<MiniSpinner size={16} />` |
| `w-5 h-5` | 20px | `<MiniSpinner size={20} />` |
| `w-6 h-6` | 24px | `<MiniSpinner size={24} />` |
| `w-8 h-8` | 32px | `<MiniSpinner size={32} />` |
| `w-16 h-16` | 64px | `<MiniSpinner size={64} />` |

## Files to Update (all 61)

Pages: `PreviewPage`, `ResumeDetailPage`, `AuthPage`, `CoverLetterNewPage`, `CoverLetterEditPage`, `ResignationLetterEditPage`, `ResignationLetterNewPage`, `EditorPage`, `InterviewPage`, `DashboardPage`, `SettingsPage`, `ApplicationsPage`, `UploadPage`, `TemplatesPage`, `ProfilePage`, `CareerPage`, `PortfolioEditorPage`, `OnboardingPage`, `AIStudioPage`, `NotificationsPage`

Components: `LoginForm`, `SignupForm`, `MagicLinkForm`, `SocialAuthButtons`, `BugReportDialog`, `EditProfileSheet`, `AvatarCropSheet`, `AnalyzeJobSheet`, `GapExplainerSheet`, `ExportOptionsSheet`, `UnsavedChangesDialog`, `OfflineIndicator`, `UploadProgressSteps`, `InterviewToggle`, `ATSScoreBreakdown`, `JobUrlParser`, `VisitorsPanel`, `FollowUpEmailSheet`, `SaveJobSheet`, `JobSearchSheet`, `CareerCardSheet`, and many more AI/editor tool sheets.

## Result
- Every loading state in the app uses the same branded concentric-ring spinner
- Consistent visual language from the full-page spinner down to button-level loading indicators
- The app feels polished and cohesive -- no more generic Lucide circles

