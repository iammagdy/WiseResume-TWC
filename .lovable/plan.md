

# Fix Tab Switching Blank Screen Issue

## Problem Analysis

When switching between tabs in the Editor page, users experience a ~2 second blank screen before content loads, especially on mobile. This is caused by:

1. **Radix UI Tabs unmount behavior**: By default, `TabsContent` unmounts when the tab becomes inactive and remounts when active again
2. **Heavy component re-initialization**: Each tab section (Contact, Summary, Experience, etc.) uses hooks like `useAIEnhance` and `useResumeNudges` that re-initialize on every mount
3. **State reset on mount**: Each section component has local `useState` (like `touched` states) that resets, causing re-renders
4. **Animation overhead**: Framer Motion animations in sections like `ExperienceSection` add additional mounting cost

## Solution

Use the `forceMount` prop on `TabsContent` combined with `hidden` attribute to keep all tab content in the DOM but visually hide inactive tabs. This prevents the unmount/remount cycle that causes the delay.

## Technical Implementation

### Approach: Force Mount with Hidden Attribute

Instead of unmounting inactive tabs, keep them mounted but hidden:
- Add `forceMount` prop to each `TabsContent`
- Use the HTML `hidden` attribute for inactive tabs (removes from layout flow)
- Conditionally apply the `hidden` attribute based on `activeTab` state

### Changes Required

---

### File 1: `src/components/ui/tabs.tsx`

Update `TabsContent` to support `forceMount` and `hidden` props properly:

**Current:**
```tsx
const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className,
    )}
    {...props}
  />
));
```

The Radix UI `TabsContent` already accepts `forceMount` as a prop. The hidden attribute needs to be handled at the usage level, not in the component definition. The component is already correct.

---

### File 2: `src/pages/EditorPage.tsx`

Update the `TabsContent` usage to use `forceMount` and `hidden`:

**Current structure:**
```tsx
<TabsContent value="contact" className="mt-0">
  <ContactSection />
</TabsContent>
<TabsContent value="summary" className="mt-0">
  <SummarySection />
</TabsContent>
// ... etc
```

**New structure:**
```tsx
<TabsContent 
  value="contact" 
  className="mt-0" 
  forceMount 
  hidden={activeTab !== 'contact'}
>
  <ContactSection />
</TabsContent>
<TabsContent 
  value="summary" 
  className="mt-0" 
  forceMount 
  hidden={activeTab !== 'summary'}
>
  <SummarySection />
</TabsContent>
// ... etc for all 5 tabs
```

---

### File 3: `src/index.css` (optional enhancement)

Add CSS to ensure `hidden` attribute works correctly with the tabs:

```css
/* Ensure hidden tabs are properly hidden but still in DOM */
[hidden] {
  display: none !important;
}
```

This may already be default browser behavior, but explicitly defining it ensures consistency.

---

## Why This Works

| Aspect | Before | After |
|--------|--------|-------|
| Tab switch behavior | Unmount old, mount new | Show/hide (no remount) |
| Component state | Reset on each tab switch | Preserved |
| Hook initialization | Re-runs on mount | Runs once on page load |
| Animation cost | Paid on every tab switch | Paid once on initial load |
| DOM presence | Only active tab | All tabs always present |
| Initial load time | Fast (1 tab) | Slightly slower (all tabs) |
| Tab switch time | Slow (2 sec blank) | Instant |

## Trade-offs

**Pros:**
- Instant tab switching with no blank screen
- Form state is preserved when switching tabs
- No flicker or re-render delay

**Cons:**
- All 5 tab sections render on initial page load (slightly higher initial cost)
- More DOM nodes present at all times
- Hooks in all sections initialize on page load

The trade-off is acceptable because:
1. The sections are not extremely heavy (mostly forms)
2. User experience during editing is significantly improved
3. Initial load is a one-time cost vs. repeated tab switching

## Files to Modify

1. `src/pages/EditorPage.tsx` - Add `forceMount` and `hidden` to all `TabsContent` components

## Expected Result

- Tab switching becomes instant with no blank screen
- Form state (like validation touched states) persists when switching tabs
- User can freely navigate between sections without waiting

