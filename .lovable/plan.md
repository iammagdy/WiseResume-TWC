

# Fix: Half Black Screen on Editor (for real this time)

## Root Cause

Line 966 of `EditorPage.tsx` currently has:
```
min-h-0 overflow-hidden min-h-[calc(100dvh-10rem)]
```

Both `min-h-0` and `min-h-[calc(100dvh-10rem)]` compile to the same CSS property (`min-height`). Tailwind's class ordering means `min-h-0` can override the calc value, making the previous fix ineffective.

## Fix

**File: `src/pages/EditorPage.tsx` (line 966)**

Remove `min-h-0` and keep only `min-h-[calc(100dvh-10rem)]`:

```
Before: <main className="flex-1 flex flex-col min-h-0 overflow-hidden min-h-[calc(100dvh-10rem)]">
After:  <main className="flex-1 flex flex-col overflow-hidden min-h-[calc(100dvh-10rem)]">
```

This single class removal ensures the editor container correctly fills the viewport between the header and bottom tab bar, eliminating the black gap.

| Change | File | Line | What |
|--------|------|------|------|
| Remove conflicting `min-h-0` | `EditorPage.tsx` | 966 | Keep only `min-h-[calc(100dvh-10rem)]` |

No database changes. No new dependencies.
