

## ✅ COMPLETED: AI Enhancements Schema Fix

### What was fixed

1. **Edge function prompt** (`enhance-section/index.ts`): Added explicit per-section JSON schemas telling the AI exactly which fields to return (matching TypeScript types) and to preserve all original `id` values.

2. **Merge strategy** (`AIEnhanceSheet.tsx`): `applyResult()` now merges AI-enhanced entries with originals by `id` or index, so fields the AI omits (like `isProject`, `credentialId`, `responsibilities`) are preserved from the original.

3. **Repair logic**: Skills are flattened to strings, experience entries get missing `achievements`/`responsibilities` arrays filled, education gets missing fields filled — all before saving to store.
