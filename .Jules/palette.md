## 2026-02-09 - [Accessible File Upload Zones]
**Learning:** Custom drop zones (divs) are inaccessible to keyboard users by default.
**Action:** Always add `role="button"`, `tabIndex="0"`, `onKeyDown` (Enter/Space), and visible focus rings (`focus-visible:ring`) to interactive non-button elements.
