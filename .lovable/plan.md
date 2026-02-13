

## Update Version to v1.5.0 with 5-Feature Changelog

### Changes in `src/pages/SettingsPage.tsx`

**1. Update version label (line 871)**
Change `WiseResume v1.0.0` to `WiseResume v1.5.0`

**2. Expand changelog dialog (lines 993-1000)**
Replace the single v1.0.0 entry with a scrollable changelog containing:

**v1.5.0 (Latest)** with a "Latest" badge -- 5 feature entries:

1. **Polished Tailor Loading Screen** -- Smooth real-feel progress animation with cubic ease-out curve, animated percentage counter, glowing progress bar, estimated time remaining, and fun facts carousel.
2. **Mobile Scroll Fixes** -- Fixed non-scrollable pages on mobile for Job Details, Application Details, Cover Letters, and Notifications pages.
3. **Enhanced Tailor Step Visualization** -- Redesigned step list with vertical connecting lines, spring-animated checkmarks, and highlighted active step with loading spinner.
4. **Projected Score Preview** -- Live projected ATS score comparison (before vs. after) and skill gap count displayed during the tailoring process.
5. **Smart Progress Estimation** -- Estimated time remaining countdown and percentage-based step transitions that adapt to actual backend response time.

**v1.0.0** (existing entry, kept as-is):
- Initial release with all original features.

The changelog container will use `max-h-[50vh] overflow-y-auto` for future scalability, and a separator will visually divide version sections.

### Technical Details

Only one file changes: `src/pages/SettingsPage.tsx`
- Line 871: version string `v1.0.0` to `v1.5.0`
- Lines 993-1000: changelog content expanded with v1.5.0 section (5 bullet items with bold titles), a separator, and the existing v1.0.0 section

