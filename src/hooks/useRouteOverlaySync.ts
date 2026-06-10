import { useCallback } from "react";
import { useNavigate, type NavigateFunction } from "react-router-dom";

export type RouteOverlaySyncOptions = {
  /** Current route segment that owns this overlay (e.g. `:tool` param). */
  activeRouteKey: string | undefined;
  /** Route segment for this overlay (e.g. `enhance`). */
  overlayRouteKey: string;
  /** Navigate here when the overlay closes while its route is active. */
  basePath: string;
  /** Optional side effect when clearing the overlay route (reset refs, etc.). */
  onRouteDismiss?: () => void;
};

/** Pure helper for binding multiple overlays on one page without extra hook calls. */
export function createRouteOverlayOpenChange(
  setOpen: (open: boolean) => void,
  navigate: NavigateFunction,
  {
    activeRouteKey,
    overlayRouteKey,
    basePath,
    onRouteDismiss,
  }: RouteOverlaySyncOptions,
) {
  return (open: boolean) => {
    setOpen(open);
    if (!open && activeRouteKey === overlayRouteKey) {
      onRouteDismiss?.();
      navigate(basePath, { replace: true });
    }
  };
}

/**
 * Returns an `onOpenChange` handler that keeps overlay state and the URL in sync.
 * When the user dismisses an overlay that was opened via a deep link, the URL
 * returns to `basePath` so the page stays interactive and shareable links work.
 */
export function useRouteOverlayOpenChange(
  setOpen: (open: boolean) => void,
  options: RouteOverlaySyncOptions,
) {
  const navigate = useNavigate();

  const { activeRouteKey, overlayRouteKey, basePath, onRouteDismiss } = options;

  return useCallback(
    (open: boolean) =>
      createRouteOverlayOpenChange(setOpen, navigate, {
        activeRouteKey,
        overlayRouteKey,
        basePath,
        onRouteDismiss,
      })(open),
    [activeRouteKey, basePath, navigate, onRouteDismiss, overlayRouteKey, setOpen],
  );
}
