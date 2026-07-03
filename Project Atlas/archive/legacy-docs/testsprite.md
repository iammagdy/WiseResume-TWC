> [!CAUTION]
> Historical / archived document. Do not treat as current project truth. Use Project Atlas/SOURCE_OF_TRUTH_MAP.md and living specs for current references.

# TestSprite Testing Brief — WiseResume

## App Name
WiseResume (by TheWise.Cloud)

## App URL
- Production: https://wiseresume.app
- Local dev: http://localhost:3000 (run `npm start` first)

## App Description
WiseResume is a SaaS career platform that lets users build, tailor, and publish
resumes with AI assistance. It supports structured resume editing, AI-powered
rewriting/tailoring for specific job descriptions, CV import (PDF/DOCX),
portfolio publishing, QR code sharing, and a job application tracker.
A recruiter-facing surface (WiseHire) shares the same codebase.

## Tech Stack
- Frontend: React 18, TypeScript 5, Vite 6, Tailwind CSS, Radix UI / shadcn/ui
- State: TanStack Query, Zustand
- Backend/Auth: Appwrite (Cloud) — Auth, Databases, Storage, Functions
- AI: Appwrite ai-gateway with failover across OpenRouter, Groq, DeepSeek, NVIDIA
- Build/Deploy: Vite + GitHub Actions → Hostinger (frontend), Appwrite Cloud (functions)

## Pages / Screens to Test
1. Landing / Auth page (`/auth`) — login & signup tabs
2. Onboarding flow (`/onboarding`) — profile setup & CV import step
3. Dashboard (`/dashboard`) — resume cards, quick actions
4. Resume Editor (`/editor/:id`) — section editing, formatting, AI toolbar
5. Templates Gallery (`/templates`)
6. AI Studio (`/ai-studio`) — rewrite, bullet improve, proofread
7. Tailoring Hub (`/tailoring`) — paste job description, generate tailored version
8. Upload / CV Import (`/upload`) — PDF and DOCX parsing
9. Preview & Export (`/preview/:id`) — PDF download, share link
10. Cover Letter Editor (`/cover-letters`)
11. Application Tracker (`/applications`)
12. Interview Prep (`/interview`, `/interview-report/:id`)
13. Portfolio Editor (`/portfolio-editor`)
14. Public Portfolio (`/p/:username`) — unauthenticated view
15. Share / QR Code pages (`/share/:id`, `/qr/:id`)
16. Pricing page (`/pricing`)
17. Notifications (`/notifications`)

## Key User Flows to Test
1. **Sign Up → Onboard → First Resume**
   - Register with email → verify → complete profile → import CV or start blank
     → save resume → preview PDF

2. **AI Tailoring**
   - Open existing resume → Tailoring Hub → paste job description → generate
     tailored version → review diff → apply changes → export

3. **AI Studio Rewrite**
   - Select a bullet point → open AI Studio → choose "Improve" → accept suggestion

4. **CV Import**
   - Upload PDF/DOCX on Upload page → confirm parsed sections → save as new resume

5. **Portfolio Publishing**
   - Enable public portfolio → set username → view `/p/<username>` while logged out
   → generate QR code

6. **Application Tracker**
   - Add job application → set status → generate tailored resume for that role

7. **Interview Prep**
   - Select a job application → generate interview brief → view company + role info

8. **Login / Logout / Session Persistence**
   - Log in → refresh page → confirm session retained → log out → confirm redirect

## Expected Behaviors / Success Criteria
- Auth gate: unauthenticated users redirect to `/auth` from protected routes
- Resume saves persist across page refresh (Appwrite DB sync)
- PDF export produces a downloadable file with correct formatting
- AI suggestions return within 15 seconds under normal load
- Public portfolio renders correctly without a logged-in session
- CV import correctly maps sections (experience, education, skills) from PDF
- All forms show inline validation errors on bad input (no silent failures)
- Responsive layout works on 375px (mobile) and 1280px (desktop) viewports
- No console errors on any page during normal navigation

## Areas to Skip / Ignore
- DevTools page (`/dev-tools`) — internal admin panel, requires special password
- Analytics page (`/analytics`) — internal only
- WiseHire recruiter surface — separate audience, out of scope for this run
- Password reset email delivery (third-party email, untestable in automation)
- Stripe payment flows beyond the pricing page UI

## Bug Severity Preference
- **Fail on Critical only** for the initial run:
  - Auth bypass or data loss
  - PDF export completely broken
  - AI calls returning hard errors (not timeouts)
  - Resume sections failing to save
- Log Minor/Moderate issues (broken layouts, slow AI, cosmetic glitches) as
  warnings but do not fail the suite on them
