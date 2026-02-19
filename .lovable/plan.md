
# Career Card Feature — Shareable 1200×630 Image from Portfolio

## What We're Building

A "Career Card" — a beautiful, Spotify Wrapped-style image (1200×630px) generated client-side using `html2canvas` from the user's portfolio data. Users tap "Share Career Card" inside the Portfolio Editor, choose their layout, preview it, then Download or Share to LinkedIn. The image is generated from a hidden off-screen div that renders a pixel-perfect card design.

---

## Data Available (No New DB Schema Needed)

From `profile` (via `useProfile`):
- `fullName`, `avatarUrl`, `jobTitle`, `location`, `portfolioAccentColor`, `portfolioStyle`, `openToWork`, `availabilityHeadline`, `linkedinUrl`

From the selected resume (`selectedResume` already computed in the editor):
- `skills` → top 5
- `experience[0].achievements[0]` → key achievement
- `experience[0].position` + `experience[0].company` → most recent role context

---

## Files to Create

### 1. `src/components/portfolio/CareerCardSheet.tsx` — The main sheet

A bottom Sheet with 3 sections:
1. **Card Preview** — a scaled-down live preview of the actual card canvas div (CSS `transform: scale(0.32)` from 1200px → ~384px display width, no html2canvas needed for the preview).
2. **Style Picker** — 3 card variants: `cosmic` (dark purple gradient), `aurora` (teal/indigo gradient), `clean` (white/light, good for Classic Clean theme). Each variant uses the user's `portfolioAccentColor` as the primary accent.
3. **Action buttons** — "Download Image" + "Share on LinkedIn" + "Copy Link" buttons.

**Props:**
```typescript
interface CareerCardSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profile: Profile | null;
  selectedResume: DatabaseResume | undefined;
  accentColor: string;
}
```

**Card variants:**

| Variant | Background | Feel |
|---|---|---|
| `cosmic` | `#0a0a1f` → `#1a0a2e` radial gradient | Dark space, glowing accent |
| `aurora` | `#0d1117` → `#0a1628` + teal aurora | Dark, modern, professional |
| `clean` | `#ffffff` → `#f8faff` | Light, minimal, LinkedIn-ready |

**The hidden off-screen card div** (1200×630, positioned off-screen via `position:absolute; left:-9999px`):
```
┌────────────────────────────────────────────────────────────┐
│  [accent glow blob top-left]         [WiseResume logo top-right] │
│                                                            │
│  ┌──────┐  Name (bold, 48px)                              │
│  │ IMG  │  Job Title (24px, accent color)                 │
│  │ 80px │  Location • Open to Work badge                  │
│  └──────┘                                                  │
│                                                            │
│  ──────────── Key Achievement ────────────────────────    │
│  "Led team of 12 to deliver $2M project 3 weeks early"    │
│                                                            │
│  Top Skills ─────────────────────────────────────────     │
│  [React] [TypeScript] [Node.js] [AWS] [PostgreSQL]        │
│                                                            │
│  ─────────────────────────────────────────────────────── │
│  Made with WiseResume · wiseresume.app/p/{username}        │
└────────────────────────────────────────────────────────────┘
```

**Generation flow:**
```typescript
const handleGenerate = async () => {
  setGenerating(true);
  haptics.light();
  const el = cardRef.current;
  const canvas = await html2canvas(el, {
    scale: 1,             // Already 1200×630 native — no scaling needed
    useCORS: true,        // For avatar image cross-origin
    allowTaint: false,
    backgroundColor: null,
    logging: false,
  });
  canvas.toBlob(async (blob) => {
    if (!blob) { toast.error('Failed to generate card'); return; }
    await downloadFile({ blob, fileName: `${name}-career-card.png`, mimeType: 'image/png' });
    toast.success('Career Card saved!');
    setGenerating(false);
  }, 'image/png', 1.0);
};
```

**Share to LinkedIn:**
LinkedIn supports sharing via their share URL with `url` param:
```typescript
const handleShareLinkedIn = () => {
  const portfolioUrl = username ? `https://wiseresume.app/p/${username}` : 'https://wiseresume.app';
  const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(portfolioUrl)}`;
  window.open(shareUrl, '_blank', 'noopener,noreferrer');
};
```

**Share image via Web Share API:**
On mobile (iOS/Android), use `navigator.share({ files: [imageFile] })` so users can share the PNG directly to WhatsApp, Twitter, or LinkedIn.

---

## Files to Modify

### 2. `src/pages/PortfolioEditorPage.tsx`

**Where:** Inside the "Status" section (lines 518–562), after the existing "Preview" and "Get QR Code" buttons — add a third button "Career Card":

```tsx
<Button
  variant="outline"
  className="h-11 min-h-[44px] rounded-xl active:scale-95 touch-manipulation text-xs col-span-2"
  onClick={() => { haptics.light(); setShowCareerCard(true); }}
>
  <Sparkles className="w-4 h-4 mr-1.5" /> Share Career Card
</Button>
```

And at the bottom of the JSX, add:
```tsx
<CareerCardSheet
  open={showCareerCard}
  onOpenChange={setShowCareerCard}
  profile={profile}
  selectedResume={selectedResume}
  accentColor={portfolioAccentColor}
/>
```

Add state: `const [showCareerCard, setShowCareerCard] = useState(false);`

Add import: `CareerCardSheet` from the new component file.

---

## Detailed Component Design

### `CareerCardSheet.tsx` Full Structure

```
Sheet (side="bottom")
  SheetContent (h-auto max-h-[92vh])
    SheetHeader
      Title: "Career Card"
      Description: "Share your professional identity in one beautiful image"

    Section: Preview (scaled card)
      div.overflow-hidden.rounded-2xl.border (w-full, aspect-ratio 1200/630)
        div (transform scale origin-top-left — shows real card at 32% scale)
          <CareerCardCanvas ref={cardRef} ... />  ← the actual 1200×630 div

    Section: Style
      3 variant buttons in a row (cosmic / aurora / clean)

    Section: Actions
      Button "Download Image"  →  html2canvas → downloadFile
      Button "Share on LinkedIn" → opens LinkedIn share URL
      Button "Share Image"  →  navigator.share with PNG file (mobile only, hidden on desktop)
```

### `CareerCardCanvas` (internal component, ref-forwarded)

This is the **actual 1200×630 div** that `html2canvas` captures. It renders pure inline styles (no Tailwind classes — they won't resolve in html2canvas without extra config). All styling is via `style={{}}` props so it renders correctly:

```
position: absolute, left: -9999px, top: 0
width: 1200px, height: 630px
background: [gradient based on variant]
font-family: 'Inter', sans-serif
padding: 64px

Layout (flexbox):
  Left column (flex: 1):
    Avatar (80×80 rounded-full, 4px accent border)
    Name (fontSize: 52, fontWeight: 800, color: white/dark)
    Job Title (fontSize: 26, color: accent)
    Location + OpenToWork badge (fontSize: 16, muted)

    Divider

    "Key Achievement" label (10px uppercase tracking)
    Achievement text (fontSize: 20, italic, max 2 lines)

    "Top Skills" label
    Skills chips (5 max, pill shape, accent bg at 20% opacity, accent text)

  Branding strip (bottom):
    WiseResume logo text (left)
    Portfolio URL (right, mono font)
```

**Avatar rendering note:** `html2canvas` requires `useCORS: true` and the image server must allow CORS. Supabase Storage serves avatars with permissive CORS headers — this is already fine. If avatar fails to load (CORS block on external OAuth avatars), gracefully fall back to a monogram circle (first letter of name in accent color).

---

## Implementation Sequence

1. Create `src/components/portfolio/CareerCardSheet.tsx` — the full sheet + canvas
2. Modify `src/pages/PortfolioEditorPage.tsx` — add state, import, button, and mount the sheet

---

## Technical Notes

- **html2canvas is already installed** (`html2canvas version ^1.4.1` in `package.json`) — no new dependencies needed.
- **downloadFile is already implemented** in `src/lib/downloadUtils.ts` — handles iOS/Android/desktop cross-platform.
- **No new DB tables** — reads only from existing `profile` and `resume` data already loaded on this page.
- **The hidden card div** is `position: absolute; left: -9999px` so it's off-screen but still in the DOM for `html2canvas` to capture. It must NOT be inside a `overflow: hidden` parent or `html2canvas` will clip it — we'll append it directly inside the Sheet's portal which renders at `<body>` level.
- **Scale math:** The preview shows the card at `transform: scale(containerWidth / 1200)`. On mobile (container ~343px wide), that's `scale(0.285)`. We'll use a `ResizeObserver` on the preview wrapper to compute the exact scale ratio dynamically.
- **Font rendering:** `html2canvas` captures whatever CSS font is loaded at capture time. Since Inter is loaded globally in the app, it will render correctly.
- **LinkedIn image sharing:** LinkedIn's share dialog does NOT accept image files directly via URL — it scrapes OG tags from the shared URL. So the "Share on LinkedIn" button shares the portfolio URL, letting LinkedIn scrape the portfolio's OG image (meta tags already set). The "Download Image" + "Share Image" (Web Share API) let users manually post the PNG to LinkedIn as a post attachment.
