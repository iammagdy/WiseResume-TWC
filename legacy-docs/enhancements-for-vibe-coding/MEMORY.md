# MEMORY.md
> Persistent context for AI-assisted (vibe-coding) sessions. Update this file whenever a major decision is made or the project direction changes.

---

## 1. Project Vision
- Help users quickly create clean, professional, ATS-friendly resumes without needing design or writing skills.
- Provide a simple, focused experience: fill in sections, see a live preview, export or download.
- Keep the product lightweight, fast, and easy to understand for non-technical users.

---

## 2. Target Users
- **Job seekers & students** who need a modern resume fast, with no prior design knowledge.
- **Non-expert users** who may not understand resume best practices but want something that looks professional.
- **High-volume applicants** who are applying to many jobs and need to iterate on their resume quickly.

---

## 3. Tech Stack
| Layer | Technology |
|-------|-----------|
| Framework | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS + shadcn/ui (Radix UI primitives) |
| Client state | Zustand — `useResumeStore`, `useSettingsStore` |
| Server state | TanStack React Query v5 |
| Backend / DB | Supabase (Lovable Cloud) — Auth, Postgres, Storage, Edge Functions |
| Authentication | Clerk (`@clerk/clerk-react`) |
| Animations | Framer Motion |
| PDF export | `html2canvas` + `pdf-lib` + `pdfjs-dist` |
| DOCX export | `docx` library |
| Mobile wrapper | Capacitor (`@capacitor/core`, `@capacitor/android`, etc.) |
| PWA | `vite-plugin-pwa` |
| Form handling | React Hook Form + Zod |

---

## 4. Design & UX Rules
- **Clean, minimal, professional look** — no playful, childish, or loud styles.
- **Readability first** — good spacing, consistent typography, clear hierarchy of headings and sections.
- **Mobile-first** — fully responsive starting at `xs` (375 px, e.g. iPhone SE); no horizontal scrolling on mobile.
- **Bottom tab bar** (`BottomTabBar`) is the primary in-app navigation — no desktop-style top navbar inside the app.
- **No blank screens during data fetching** — always use shadcn `Skeleton` components that match the final UI layout.
- **SkyWallpaper** is the global fixed background (`z-0`) — all page content must sit at `z-10` or higher; never add `bg-background` back to `AppShell`.
- **Form UX** — clear labels, helpful placeholders, easy-to-understand validation messages; primary actions (edit, preview, download) must always be obvious.
- **No dark patterns** — keep navigation and CTAs straightforward.

---

## 5. Non-Negotiable Decisions
- The app **must remain a resume/CV builder** — not a general document editor.
- **Core resume sections must always exist**: Header (name, title, contact), Experience, Education, Skills. Additional sections (Projects, Summary, Certifications, etc.) are optional.
- The **resume preview layout must stay clean and printable** — no strange colors or backgrounds in the print/export view.
- **Export/download behavior** (PDF, DOCX, print) must remain stable and must not be removed or broken.
- **Existing create/edit resume flows must not be removed** — only improved.
- **SkyWallpaper is global** (`fixed z-0`) — do not revert this or add a solid background to `AppShell`.
- `src/integrations/supabase/types.ts` and `src/integrations/supabase/client.ts` are **auto-generated** — never edit them manually.

---

## 6. Tasks for Lovable
- [ ] Implement and refine UI for the resume builder (forms, preview, layout, responsiveness).
- [ ] Adjust and improve styling to look more polished and professional based on the existing design system.
- [ ] Implement or improve client-side logic for handling resume sections, validation, and preview rendering.
- [ ] Add small, well-scoped features such as new optional sections (e.g., Projects, Certifications) or simple settings (e.g., font size, spacing).
- [ ] Refactor UI components to be more modular and readable without changing functionality.

---

## 7. Tasks for External Tools
- [ ] Complex backend architecture decisions or migrations (handled outside Lovable).
- [ ] Deep performance tuning or heavy optimization beyond standard best practices.
- [ ] Security-critical features (authentication, multi-tenant access control, advanced data privacy logic).
- [ ] Any integration with external paid APIs or sensitive third-party services that require careful key handling.

---

## 8. Do Not Touch
- `src/integrations/supabase/types.ts` — auto-generated, read-only
- `src/integrations/supabase/client.ts` — auto-generated, read-only
- `.env` — auto-generated, read-only
- `supabase/config.toml` — auto-configured, read-only
- `supabase/migrations/` — read-only, managed by migration tool only
- `bun.lock` / `package-lock.json` — managed by package manager only
- Any env or config files containing API keys, secrets, or deployment settings
- `src/App.tsx` (core routing / app entry) — unless the task is specifically about it
- Any code block annotated with `// DO NOT CHANGE` comments
- Working PDF/print export logic — unless the task is specifically about improving that feature
