

# Add Visual Indicator for Active AI Provider

## Overview

This plan adds visual indicators throughout the editor to show which AI provider (WiseResume AI or user's Gemini key) is currently active. The indicators will appear in key AI interaction points so users always know which provider is powering their AI features.

## Design Approach

The indicators will follow the existing "Cosmic Glass UI" theme with subtle, non-intrusive badges that provide at-a-glance information about the active AI provider. The design includes:

- A small chip/badge showing provider name and tier
- Color-coded styling: purple/primary for WiseResume AI, blue for Gemini
- Optional tier indicator (Free/Paid) when using Gemini
- Consistent placement across all AI-related components

## Components to Add/Modify

### 1. Create AI Provider Indicator Component

**New File: `src/components/editor/ai/AIProviderBadge.tsx`**

A reusable badge component that displays the current AI provider:

```text
+---------------------------------------+
|  ✨ WiseResume AI                     |   (Default - purple)
+---------------------------------------+

+---------------------------------------+
|  🔷 Gemini Free                       |   (User key - blue)
+---------------------------------------+

+---------------------------------------+
|  🔷 Gemini Paid                       |   (User key - green border)
+---------------------------------------+
```

**Features:**
- Uses `getAIProviderInfo()` from `src/lib/aiProvider.ts`
- Compact size option for inline use (InlineAIButton)
- Full size for prominent display (AIAssistantBar)
- Tooltip with additional info on tap/hover

### 2. Add Indicator to AI Assistant Bar (Expanded)

**File: `src/components/editor/AIAssistantBar.tsx`**

Add the provider badge in the expanded AI Studio panel, visible when users access AI features:

- Position: Below the "AI Studio" header, above action buttons
- Style: Full-width info bar with provider name + link to AI settings
- Behavior: Tapping opens the AI Settings page

### 3. Add Indicator to AI Copilot Sheet Header

**File: `src/components/editor/AgenticChatSheet.tsx`**

Show the provider badge in the chat header so users know which AI is responding:

- Position: Next to "AI Copilot" title
- Style: Small badge showing provider name
- Updates reactively if user changes provider mid-session

### 4. Add Indicator to InlineAIButton Dropdown

**File: `src/components/editor/InlineAIButton.tsx`**

Show provider info in the dropdown menu footer when using per-section AI:

- Position: Bottom of dropdown menu, separated by divider
- Style: Muted text with provider info
- Action: Links to AI settings for easy switching

### 5. Add Indicator to AI Enhancement Dialog

**File: `src/components/editor/ai/AIEnhanceDialog.tsx`**

Show which AI processed the enhancement:

- Position: In the header, next to the Sparkles icon
- Style: Small "via WiseResume AI" or "via Gemini" text

### 6. Create Custom Hook for Reactive Provider Info

**New File: `src/hooks/useAIProviderInfo.ts`**

A hook that provides reactive access to provider info with proper Zustand subscription:

```typescript
export function useAIProviderInfo() {
  const aiProvider = useSettingsStore((s) => s.aiProvider);
  const geminiKeyTier = useSettingsStore((s) => s.geminiKeyTier);
  const geminiKeyValidated = useSettingsStore((s) => s.geminiKeyValidated);
  
  // Return computed provider info that updates on state changes
}
```

## Visual Design Specifications

### Provider Badge Variants

**Default Provider (WiseResume AI):**
- Background: `bg-primary/10`
- Border: `border-primary/20`
- Icon: Sparkles (primary color)
- Text: "WiseResume AI"

**Gemini Free Tier:**
- Background: `bg-blue-500/10`
- Border: `border-blue-500/20`
- Icon: Custom Gemini icon or diamond
- Text: "Gemini Free"

**Gemini Paid Tier:**
- Background: `bg-blue-500/10`
- Border: `border-green-500/30` (subtle green accent for paid)
- Icon: Custom Gemini icon
- Text: "Gemini Paid"

### Size Variants

| Variant | Use Case | Height | Font Size |
|---------|----------|--------|-----------|
| xs | InlineAIButton dropdown | 20px | 10px |
| sm | Sheet headers, tooltips | 24px | 11px |
| md | AIAssistantBar expanded | 28px | 12px |

## Implementation Details

### Phase 1: Create Base Components

1. Create `AIProviderBadge.tsx` with size variants
2. Create `useAIProviderInfo.ts` hook
3. Add Gemini icon asset (or use existing diamond/gem icon)

### Phase 2: Integrate into AI Components

4. Add badge to `AIAssistantBar.tsx` expanded view
5. Add badge to `AgenticChatSheet.tsx` header
6. Add provider info to `InlineAIButton.tsx` dropdown footer
7. Add "via" text to `AIEnhanceDialog.tsx` header

### Phase 3: Polish and Settings Link

8. Add navigation to AI settings on badge tap
9. Ensure smooth transitions when provider changes
10. Test on mobile for touch target sizes (min 44px tap area)

## File Summary

| File | Action | Description |
|------|--------|-------------|
| `src/components/editor/ai/AIProviderBadge.tsx` | Create | Reusable provider indicator badge |
| `src/hooks/useAIProviderInfo.ts` | Create | Reactive hook for provider state |
| `src/components/editor/AIAssistantBar.tsx` | Modify | Add provider badge to expanded view |
| `src/components/editor/AgenticChatSheet.tsx` | Modify | Add provider badge to header |
| `src/components/editor/InlineAIButton.tsx` | Modify | Add provider info to dropdown footer |
| `src/components/editor/ai/AIEnhanceDialog.tsx` | Modify | Add "via" provider text to header |

## Benefits

1. **Transparency**: Users always know which AI is processing their requests
2. **Trust**: Clear indication when using personal API key vs default
3. **Quick Access**: Tapping badge navigates to AI settings for easy switching
4. **Consistency**: Same visual language across all AI touchpoints
5. **Non-Intrusive**: Subtle badges that don't clutter the interface

