import { describe, it, expect, vi } from "vitest";
import { createRouteOverlayOpenChange } from "@/hooks/useRouteOverlaySync";

describe("createRouteOverlayOpenChange", () => {
  it("clears the route when a route-bound overlay closes", () => {
    const setOpen = vi.fn();
    const navigate = vi.fn();
    const onRouteDismiss = vi.fn();

    const onOpenChange = createRouteOverlayOpenChange(setOpen, navigate, {
      activeRouteKey: "enhance",
      overlayRouteKey: "enhance",
      basePath: "/ai-studio",
      onRouteDismiss,
    });

    onOpenChange(false);

    expect(setOpen).toHaveBeenCalledWith(false);
    expect(onRouteDismiss).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("/ai-studio", { replace: true });
  });

  it("does not navigate when closing an overlay that was not opened from the route", () => {
    const setOpen = vi.fn();
    const navigate = vi.fn();

    const onOpenChange = createRouteOverlayOpenChange(setOpen, navigate, {
      activeRouteKey: undefined,
      overlayRouteKey: "enhance",
      basePath: "/ai-studio",
    });

    onOpenChange(false);

    expect(setOpen).toHaveBeenCalledWith(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("does not navigate when opening the overlay", () => {
    const setOpen = vi.fn();
    const navigate = vi.fn();

    const onOpenChange = createRouteOverlayOpenChange(setOpen, navigate, {
      activeRouteKey: "enhance",
      overlayRouteKey: "enhance",
      basePath: "/ai-studio",
    });

    onOpenChange(true);

    expect(setOpen).toHaveBeenCalledWith(true);
    expect(navigate).not.toHaveBeenCalled();
  });
});
