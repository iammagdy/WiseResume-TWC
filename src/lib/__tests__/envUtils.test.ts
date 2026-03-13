import { describe, it, expect, vi } from "vitest";
import { isBrowser, getSafeMatchMedia } from "../envUtils";

describe("envUtils", () => {
  describe("isBrowser", () => {
    it("should return true in test environment (jsdom)", () => {
      expect(isBrowser).toBe(true);
    });
  });

  describe("getSafeMatchMedia", () => {
    it("should return a matchMedia object", () => {
      const mm = getSafeMatchMedia("(min-width: 768px)");
      expect(mm).toBeDefined();
      expect(typeof mm.addListener).toBe("function");
    });

    it("should work correctly with the mock", () => {
      const mm = getSafeMatchMedia("(max-width: 600px)");
      expect(mm.matches).toBe(false);
    });
  });
});
