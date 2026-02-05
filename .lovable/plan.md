
# Personalized Template Recommendations Based on Career Level

## Overview
Add intelligent template recommendations to the TemplateSelector that surface the most suitable templates based on the user's career level. This creates a more personalized experience and helps users make better template choices.

## Career Level to Template Mapping

| Career Level | Recommended Templates | Reasoning |
|-------------|----------------------|-----------|
| **Entry** (0-2 years) | Modern, Minimal, Classic | Clean layouts that emphasize potential; ATS-friendly for entry-level job applications |
| **Mid** (3-5 years) | Modern, Professional, Developer | Balanced designs that showcase growing experience; versatile for career progression |
| **Senior** (6-10 years) | Executive, Professional, Classic | Sophisticated layouts that convey authority; emphasis on achievements |
| **Executive** (10+ years) | Executive, Professional | Elegant, executive-level presentations; serif typography conveys gravitas |

## User Experience

When a user opens the template selector:
1. If they have a career level set in their profile, show a "Recommended for you" section at the top
2. The recommended templates appear first with a highlighted badge
3. All other templates remain available below in their original order
4. If no career level is set, show all templates without recommendations (current behavior)

## Implementation Steps

### Step 1: Create Template Recommendation Logic
Add a new utility function that maps career levels to recommended template IDs:

```typescript
// In TemplateSelector.tsx or a new utility file
const CAREER_LEVEL_RECOMMENDATIONS: Record<CareerLevel, TemplateId[]> = {
  entry: ['modern', 'minimal', 'classic'],
  mid: ['modern', 'professional', 'developer'],
  senior: ['executive', 'professional', 'classic'],
  executive: ['executive', 'professional'],
};
```

### Step 2: Update TemplateSelector Component
Modify `src/components/editor/TemplateSelector.tsx` to:
1. Import `useProfile` hook and `useAuth` hook
2. Fetch the user's career level from their profile
3. Sort templates to show recommended ones first
4. Add a "Recommended for you" badge on matching templates

### Step 3: Visual Design
- Add a sparkle/star badge on recommended templates saying "Recommended"
- Use the primary color theme for the recommendation badge
- Optionally add a small info text explaining why these are recommended

## Technical Details

### Updated TemplateInfo Interface
The existing `TemplateInfo` interface already has the necessary fields. We'll add runtime recommendation logic without changing the type.

### Component Changes

```typescript
// Inside TemplateSelector component
const { user } = useAuth();
const { profile } = useProfile(user?.id);

// Get recommended template IDs based on career level
const recommendedIds = profile?.careerLevel 
  ? CAREER_LEVEL_RECOMMENDATIONS[profile.careerLevel] 
  : [];

// Sort templates: recommended first, then others
const sortedTemplates = [...templates].sort((a, b) => {
  const aRec = recommendedIds.includes(a.id);
  const bRec = recommendedIds.includes(b.id);
  if (aRec && !bRec) return -1;
  if (!aRec && bRec) return 1;
  return 0;
});
```

### Recommendation Badge
Add a "Recommended" badge to templates that match the user's career level:

```tsx
{recommendedIds.includes(template.id) && (
  <Badge className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground text-xs">
    <Star className="w-3 h-3 mr-1" />
    Recommended
  </Badge>
)}
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/editor/TemplateSelector.tsx` | Add profile hook, recommendation logic, badge UI |

## Edge Cases
- **No career level set**: Show all templates in default order (no recommendations)
- **Profile loading**: Show skeleton or default order while loading
- **All templates still accessible**: Recommendations are suggestions, not restrictions

## Benefits
1. **Personalized UX** - Templates surfaced based on experience level
2. **Better Choices** - Entry-level users guided to ATS-friendly templates
3. **Profile Value** - Encourages users to complete their career level
4. **Professional Guidance** - Executive users see sophisticated options first
