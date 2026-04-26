# wallpaper

**Last verified:** 2026-04-26
**Type:** reference card
**Sources:**
- `src/pages/WallpaperPage.tsx`

**Canonical owner:** `project-governance/ARCHITECTURE.md` §3 (Frontend routes)

---

**What it is:** Standalone marketing / lock-screen page featuring the WiseResume aurora background and logo. Served at `/wallpaper`.

**Where it lives:** `src/pages/WallpaperPage.tsx`

**Key facts:**
- Renders `AuroraBackground` full-screen with the WiseResume light logo centred. → `src/pages/WallpaperPage.tsx`
- No authentication required; no Supabase calls.
- Intended as a shareable visual / social-media asset for the brand.

**Related cards:**
- `Project Atlas/01-Currently Implemented/pages/README.md`
