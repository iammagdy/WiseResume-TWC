
# Update About Card Tagline

## Change
In `src/pages/SettingsPage.tsx` (lines 941-945), replace the current tagline block with the new text.

**Before:**
```
Crafted with vision in Egypt 🇪🇬
```

**After:**
```
Made with ❤️ in Egypt
```

The heart emoji will be wrapped in `<span className="text-red-500">` for consistent red styling across platforms. The "EG" badge and flag emoji are removed entirely.

## File modified
- `src/pages/SettingsPage.tsx` -- lines 941-945 only
