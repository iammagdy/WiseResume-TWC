

## Replace Studio Tab Logo with New Wise AI Logo

### What will change
Replace the current `wise-ai-icon.png` used in the bottom tab bar's "Wise AI" (Studio) tab with the uploaded high-quality Wise AI logo.

### Steps
1. Copy the uploaded image `user-uploads://Wise_Ai_2-2.png` to `src/assets/wise-ai-icon.png` (overwriting the current one)
2. No code changes needed -- the BottomTabBar already imports and renders `src/assets/wise-ai-icon.png` as the custom icon for the "Wise AI" tab

### Note
The build log shown is not an error -- it completed successfully. The warnings about `duration-[1.2s]` and `bluebird eval` are non-blocking.

