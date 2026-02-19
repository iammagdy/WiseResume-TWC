
# Shareable Career Card on the Public Portfolio Page

## What Already Exists (Don't Rebuild)

`CareerCardSheet` (`src/components/portfolio/CareerCardSheet.tsx`) is a complete, production-ready component with:
- Three visual themes: Cosmic (dark space), Aurora (blue-dark), Clean (light)
- Live-scaled preview of the 1200×630 card inside the sheet
- `handleDownload` — generates PNG via `html2canvas` and saves via `downloadFile`
- `handleShareImage` — Web Share API with file attachment (iOS/Android native share)
- `handleShareLinkedIn` — opens LinkedIn Share URL pointing to the user's portfolio
- `html2canvas` already imported and working
- A "WiseResume" watermark + portfolio URL in the bottom strip

It is already wired into `PortfolioEditorPage.tsx` for the portfolio **owner**. The task is to wire it into `PublicPortfolioPage.tsx` for **visitors**.

---

## What Changes

### 1. `src/pages/PublicPortfolioPage.tsx`

**Three additions, all isolated:**

**A — Import `CareerCardSheet`**

Add the import at the top of the file alongside the existing portfolio component imports.

**B — Add `showCareerCard` state**

Inside `PublicPortfolioContent`, add one state variable:
```tsx
const [showCareerCard, setShowCareerCard] = useState(false);
```

**C — Add "Share Card" CTA button in the hero**

Slot a new button into the existing CTA row at lines 1162–1190, right between "View Projects" and "Download CV":

```tsx
<button
  onClick={() => { haptics.light(); setShowCareerCard(true); }}
  className="inline-flex items-center gap-2 px-5 py-3 rounded-full font-semibold text-sm transition-all hover:scale-105 active:scale-95 border"
  style={{
    borderColor: `color-mix(in srgb, ${accentColor} 50%, transparent)`,
    color: accentColor,
    background: `color-mix(in srgb, ${accentColor} 8%, transparent)`,
  }}
>
  <Sparkles className="w-4 h-4" /> Share Card
</button>
```

The `Sparkles` icon is already imported in `PublicPortfolioPage.tsx` from the existing icon imports (confirm: line 11 imports `Send`, `Star` etc. — `Sparkles` may need adding). Actually checking line 11: it imports `Wrench, Layers, ArrowUpRight, Code2, Paintbrush, MessageSquare, PenLine, Star, Send` — `Sparkles` is not yet imported. It needs to be added to the `lucide-react` import.

**D — Mount `CareerCardSheet` at the bottom of the component**

Just before the closing `</div>` (line 1354, after the `ChatWidget`):

```tsx
<CareerCardSheet
  open={showCareerCard}
  onOpenChange={setShowCareerCard}
  profile={{
    fullName: profile.fullName,
    avatarUrl: profile.avatarUrl,
    jobTitle: profile.jobTitle,
    location: profile.location,
    openToWork: profile.openToWork,
    username: profile.username,
    portfolioAccentColor: profile.portfolioAccentColor,
  }}
  selectedResume={{
    id: resume.id,
    title: resume.title,
    skills: resume.skills,
    experience: resume.experience,
  }}
  accentColor={accentColor}
/>
```

The `CareerCardSheet`'s internal `Profile` and `DatabaseResume` interfaces are subsets of `PublicProfile` and `PublicResume` — all fields exist directly on those types. No adapter layer needed.

---

## Type Compatibility Check

| `CareerCardSheet` expects | `PublicProfile` / `PublicResume` provides |
|---|---|
| `profile.fullName` | `profile.fullName` ✓ |
| `profile.avatarUrl` | `profile.avatarUrl` ✓ |
| `profile.jobTitle` | `profile.jobTitle` ✓ |
| `profile.location` | `profile.location` ✓ |
| `profile.openToWork` | `profile.openToWork` ✓ |
| `profile.username` | `profile.username` ✓ |
| `profile.portfolioAccentColor` | `profile.portfolioAccentColor` ✓ |
| `resume.id` | `resume.id` ✓ |
| `resume.title` | `resume.title` ✓ |
| `resume.skills` | `resume.skills` (string[]) ✓ |
| `resume.experience[].position` | `resume.experience[].position` ✓ |
| `resume.experience[].company` | `resume.experience[].company` ✓ |
| `resume.experience[].achievements` | `resume.experience[].achievements` ✓ |

Zero new interfaces needed.

---

## Files Changed

| File | Action | Lines |
|---|---|---|
| `src/pages/PublicPortfolioPage.tsx` | MODIFY | Add import, 1 state var, 1 button, 1 `<CareerCardSheet />` mount |

That's the entire change — one file, four additions. No new components, no edge functions, no database changes.

---

## User Experience Flow

1. Visitor opens `wiseresume.app/p/johndoe`
2. In the hero CTA row they see: **"Get in Touch" · "View Projects" · ✦ Share Card · "Download CV"**
3. Tap "Share Card" → bottom sheet slides up with the live card preview
4. Visitor picks a theme variant (Cosmic / Aurora / Clean)
5. Options:
   - **Download** — saves the 1200×630 PNG to their device
   - **Share** — native OS share sheet (iOS/Android) with the image attached
   - **Share on LinkedIn** — opens LinkedIn share dialog pre-filled with the portfolio URL
6. Sheet closes; visitor returns to the portfolio

The sheet renders a hidden off-screen `CareerCardCanvas` div (positioned `left: -9999px`) which `html2canvas` captures — the visitor never sees the render artifact.

---

## Why the Button Is on the Public Portfolio (Not Just the Editor)

The intent is **viral**: when a recruiter or colleague visits a portfolio and finds it impressive, they can instantly generate and share the career card on behalf of the person. This creates organic distribution — the WiseResume watermark appears on every card, turning each share into marketing.

The portfolio owner already has the button in the Portfolio Editor for their own use. The public-facing button invites visitors to share on the owner's behalf.
