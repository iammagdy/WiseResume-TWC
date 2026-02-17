

## Client-Side PDF Download for Public Portfolio

### What We're Building
A "Download Resume (PDF)" button on the public portfolio page that generates a professional PDF using the same template engine the app already uses for resume exports.

---

### Current Gap
The existing `generatePDF` utility works by capturing a rendered resume template from the DOM via `html2canvas`. The public portfolio page currently:
- Has no rendered resume template (only the portfolio layout)
- Does not receive `template_id` from the backend RPC
- Has a placeholder comment where the download button should be

The same off-screen rendering pattern is already used successfully on the Resume Detail page.

---

### Implementation Steps

**Step 1: Database Migration -- Add `template_id` to RPC response**

Update the `get_public_portfolio` RPC to include `v_resume.template_id` in the returned JSON object. This is a single-line addition to the existing `jsonb_build_object` call.

**Step 2: Update `usePublicPortfolio.ts`**

- Add `templateId` field to the `PublicResume` interface
- Map it from the RPC response (`resume.templateId`)

**Step 3: Update `PublicPortfolioPage.tsx`**

Add the following:

1. **Hidden off-screen template**: Render the selected resume template in a fixed, off-screen `div` (same pattern as `ResumeDetailPage.tsx` -- `position: fixed; left: -9999px; width: 612px; height: 792px`). This provides the DOM node that `generatePDF` needs to capture.

2. **Convert PublicResume to ResumeData**: Create a mapping function that transforms the portfolio's `PublicResume` + `PublicProfile` data into a full `ResumeData` object (filling in `contactInfo` from the profile).

3. **Download button**: A prominent button with a loading spinner that:
   - Dynamically imports `pdfGenerator` (keeps initial bundle small)
   - Calls `generatePDF(resumeData, templateId, hiddenRef.current)`
   - Uses the existing `downloadFile` utility for cross-platform download
   - Shows a toast on success/failure
   - Uses the filename pattern: `{FullName}_Resume.pdf`

4. **Placement**: The button will sit between the social links and the "Hire Me" CTA, styled as an outlined/secondary button with a Download icon.

---

### Technical Details

**ResumeData mapping from PublicResume:**
```text
contactInfo: {
  fullName: profile.fullName,
  email: '' (stripped by RPC for privacy),
  phone: '',
  location: profile.location || '',
  linkedin: profile.linkedinUrl || ''
}
summary: resume.summary
experience: resume.experience
education: resume.education
skills: resume.skills
templateId: resume.templateId
(+ all other sections)
```

**Template lazy loading:**
Import `templateComponents` from `TemplateThumbnail.tsx` (already exports all 30 templates as lazy components). Wrap in `Suspense` with null fallback since it's off-screen.

**Files to change:**

| File | Change |
|------|--------|
| Database migration | Add `template_id` to RPC's resume JSON |
| `src/hooks/usePublicPortfolio.ts` | Add `templateId` to `PublicResume`, map from response |
| `src/pages/PublicPortfolioPage.tsx` | Add hidden template, download button, ResumeData mapping |

