

## Add Visual Indicator to Template Button for First-Time Users

### What Changes

A subtle "new" dot badge and a one-time shimmer animation will draw attention to the Template button in the mobile editor header. After the user taps it once, the indicator disappears permanently (stored in localStorage).

### Design

- A small pulsing primary-colored dot (like the one on the Wise AI button) will appear on the Template button
- The button text will briefly use the primary color instead of muted to stand out
- Once the user taps "Template" for the first time, `localStorage.setItem('template_btn_seen', 'true')` is set, and the dot and highlight are removed
- This is lightweight -- no modals, no tooltips, just a subtle visual cue

### Technical Details

**File: `src/pages/EditorPage.tsx`**

1. Add a state variable: `const [templateBtnSeen, setTemplateBtnSeen] = useState(() => localStorage.getItem('template_btn_seen') === 'true')`
2. In the Template button's `onClick`, add `localStorage.setItem('template_btn_seen', 'true'); setTemplateBtnSeen(true);`
3. When `!templateBtnSeen`:
   - Add a pulsing dot badge (`<span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary animate-pulse" />`) -- same pattern as the Wise AI button
   - Change text and icon color from `text-muted-foreground` to `text-primary`
   - Wrap the button in `relative` positioning for the dot
4. When `templateBtnSeen`: render the current muted style with no dot

| File | Change |
|------|--------|
| `src/pages/EditorPage.tsx` | Add first-time pulsing dot indicator and primary color highlight to Template button, dismissed on first tap via localStorage |

