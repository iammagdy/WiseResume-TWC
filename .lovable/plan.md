

# Fix QR Code Not Rendering

## Root Cause
When `open` changes to `true`, the `useEffect` fires synchronously, but the Radix Dialog content hasn't mounted into the DOM yet. So `qrRef.current` is `null`, the early return triggers, and the QR code is never created or appended.

## Fix
In `src/components/portfolio/PortfolioQRDialog.tsx`, replace the first `useEffect` (lines 34-81) with one that uses a `requestAnimationFrame` to defer the append call until after the Dialog content is actually in the DOM.

```tsx
useEffect(() => {
  if (!open) return;

  // Defer to next frame so Radix Dialog content is mounted
  const frameId = requestAnimationFrame(() => {
    if (!qrRef.current) return;

    if (!qrCodeRef.current) {
      qrCodeRef.current = new QRCodeStyling({
        // ... same config as now ...
      });
    }

    qrRef.current.innerHTML = '';
    qrCodeRef.current.append(qrRef.current);
  });

  return () => cancelAnimationFrame(frameId);
}, [open, size, portfolioUrl]);
```

## Files Modified
- `src/components/portfolio/PortfolioQRDialog.tsx` -- wrap the QR init/append logic in `requestAnimationFrame` inside the existing `useEffect`

No other files or dependencies change.
