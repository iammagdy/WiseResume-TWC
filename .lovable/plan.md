

# Fix: Remove Radix Tabs from Editor Page Entirely

## Root Cause (definitive)
The crash originates from `@radix-ui/react-compose-refs` (chunk-SBXSPTCP in the stack trace), which is used internally by Radix's `TabsContent` `Presence` component. During mount/unmount cycles, `Presence` calls `setState` inside a ref callback, which triggers React to re-commit, which detaches refs, which calls `setState` again -- infinite loop.

Previous fixes removed framer-motion from children, but the Radix `TabsContent` component **itself** is the source. The `Tabs` component is unnecessary here since:
- There is no visible `TabsList` (the custom `StepperNav` handles navigation)
- Tab switching is driven by `activeTab` state
- The `Tabs` wrapper adds overhead with zero benefit

## Solution
Replace `Tabs`/`TabsContent` with simple conditional rendering (`activeTab === 'contact'`). This completely removes Radix from the editor's rendering pipeline.

## Changes

### `src/pages/EditorPage.tsx`
- Remove `Tabs` and `TabsContent` imports
- Replace the `<Tabs>` wrapper with a plain `<div>`
- Replace each `<TabsContent value="X">` with `{activeTab === 'X' && (...)}`
- Keep everything else (StepperNav, SectionCard, AIAssistantBar, etc.) unchanged

**Before:**
```tsx
<Tabs value={activeTab} onValueChange={handleTabChange} className="...">
  <div className="flex-1 overflow-y-auto ..." ref={scrollContainerRef}>
    <TabsContent value="contact" className="mt-0">
      <div className="animate-in ...">
        <SectionCard ...><ContactSection /></SectionCard>
      </div>
    </TabsContent>
    ...
  </div>
</Tabs>
```

**After:**
```tsx
<div className="flex-1 flex flex-col min-h-0 overflow-hidden">
  <div className="flex-1 overflow-y-auto ..." ref={scrollContainerRef}>
    {activeTab === 'contact' && (
      <div className="animate-in ...">
        <SectionCard ...><ContactSection /></SectionCard>
      </div>
    )}
    ...
  </div>
</div>
```

### Also in `src/pages/EditorPage.tsx`
- Replace the remaining `motion.div` (Preview & Export button wrapper at bottom) with a plain `div` using CSS animation
- Remove the `framer-motion` import entirely from EditorPage

| File | Change |
|------|--------|
| `src/pages/EditorPage.tsx` | Remove Radix Tabs entirely; use conditional rendering; remove framer-motion import |

