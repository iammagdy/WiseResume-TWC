import { describe, expect, it } from "vitest";

import {
  getMobileShellLayout,
} from "@/components/layout/appShellLayout";

describe("appShellLayout", () => {
  it("reserves bottom spacing and shows Ask FAB on standard mobile workspace routes", () => {
    expect(getMobileShellLayout("/dashboard", false)).toEqual({
      reserveBottomSpace: true,
      showAskFab: true,
      askFabOffsetClass: "bottom-[calc(5.5rem+env(safe-area-inset-bottom))]",
    });
  });

  it("hides Ask FAB on routes with their own sticky bottom action bars", () => {
    expect(getMobileShellLayout("/cover-letter/new", false)).toEqual({
      reserveBottomSpace: true,
      showAskFab: false,
      askFabOffsetClass: null,
    });
  });

  it("hides Ask FAB while another sheet is open", () => {
    expect(getMobileShellLayout("/upload", true)).toEqual({
      reserveBottomSpace: true,
      showAskFab: false,
      askFabOffsetClass: null,
    });
  });
});
