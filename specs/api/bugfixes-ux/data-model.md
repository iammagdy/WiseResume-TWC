# Data Model & Interfaces: api/bugfixes-ux

## 1. Auth & Connection State Models
No new database entities are created in this phase. Existing data models and UUID relationships between Kinde and Supabase remain exactly as-is.

### State Enums
- `BridgeErrorType`: Differentiating between:
  - `OFFLINE_NETWORK` (Client has no internet)
  - `AUTH_REJECTION` (Supabase returning 401/403 despite token exchange attempt)

## 2. Resume UI State
- `is_active`: A boolean local and DB state. The mutation returning from `duplicateResume` or `createResume` will immediately seed the local state where `resumes.find(r => r.is_active)` resolves to true, rather than waiting for background generic refetches.

## 3. Client Export Pipeline Schema
### PDF Blob Construction
- **MIME type**: `application/pdf`
- **Filename generation pattern**: strictly `WiseResume.pdf` (or `WiseResume-[Job Title].pdf` if available).
- **Blob Anchorage**: HTML Anchor element `<a>` injected with `href={URL.createObjectURL(blob)}` and `download={filename}` natively, unmounting post-click.

## 4. UI Polish CSS Variables
- The application uses custom Tailwind configuration and global CSS to apply `shadow-glass`, `backdrop-blur-md`, and background opacities (`bg-background/80`, `bg-background/60`) specifically to `.glass-header`, `.glass-elevated`, and `.glass-panel` primitives globally. No new data models are required for this, only stylistic application.
