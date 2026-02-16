

## Replace Studio Tab Icon and Add "Studio" Label

### What will change
1. Replace the current Wise AI icon in the bottom tab bar with the uploaded AI chip icon
2. Add the "Studio" text label beneath the icon (currently hidden for custom icon tabs)
3. Rename the tab label from "Wise AI" to "Studio"

### Steps

1. **Copy uploaded image** to `src/assets/wise-ai-icon.png` (overwriting current)

2. **Update `src/components/layout/BottomTabBar.tsx`**:
   - Change the tab label from `'Wise AI'` to `'Studio'` (line 36)
   - Reduce the custom icon size from `w-10 h-10` to `w-6 h-6` to match other tab icons (line 139)
   - Remove the condition on line 154 that hides labels for custom icon tabs, so "Studio" text appears below the icon just like all other tabs

### Technical Details
- The custom icon image is imported via ES6 module from `src/assets/wise-ai-icon.png`
- The label visibility fix involves removing the `!tab.customIcon &&` guard on the label `<span>` (line 154)
- Icon sizing will match the other Lucide icons (24x24 / 20x20 on sm) for visual consistency
