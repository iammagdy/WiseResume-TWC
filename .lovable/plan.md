

# Remove Customize Button, Keep Only "View Live"

## Change

The floating pill bar at the bottom currently has two buttons: "Customize" and "View Live". Since the Customize button has no meaningful in-page logic (it just expands accordion sections), it will be removed entirely. Only the "View Live" button will remain.

## Technical Details

### File: `src/pages/PortfolioEditorPage.tsx`

1. **Simplify the `FloatingCustomizePill` component** (lines 1186-1213):
   - Remove the `onTap` prop and the Customize button element
   - Keep only the "View Live" button
   - Rename the component to `FloatingViewLivePill` for clarity
   - The component will only render when `hasLiveUrl` is true (no pill shown at all if there is no live URL)

2. **Update the usage** (lines 1158-1172):
   - Remove the `onTap` handler and the `setOpenSections` logic
   - Pass only the `onViewLive` and `hasLiveUrl` props

3. **Clean up unused import**: Remove `Palette` from the lucide-react import if no longer used elsewhere in the file.

### Result
- Only the "View Live" pill button remains at the bottom
- The floating bar disappears entirely when there is no live URL (cleaner UX)
- No functionality is lost since the theme/customization sections are already accessible by scrolling

