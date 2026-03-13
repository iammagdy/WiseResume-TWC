import { describe, it, expect } from "vitest";
import { isValidUrl, normalizeUrl } from "../urlUtils";

describe("urlUtils", () => {
  describe("isValidUrl", () => {
    it("should return true for valid URLs", () => {
      expect(isValidUrl("https://google.com")).toBe(true);
      expect(isValidUrl("http://localhost:3000")).toBe(true);
      expect(isValidUrl("https://sub.example.co.uk/path?q=1")).toBe(true);
    });

    it("should return false for invalid URLs", () => {
      expect(isValidUrl("not-a-url")).toBe(false);
      expect(isValidUrl("http//missing-colon")).toBe(false);
      expect(isValidUrl("")).toBe(false);
    });
  });

  describe("normalizeUrl", () => {
    it("should add https:// if protocol is missing", () => {
      expect(normalizeUrl("google.com")).toBe("https://google.com");
    });

    it("should not add protocol if already present", () => {
      expect(normalizeUrl("http://example.com")).toBe("http://example.com");
      expect(normalizeUrl("https://example.com")).toBe("https://example.com");
    });

    it("should return empty string for empty input", () => {
      expect(normalizeUrl("")).toBe("");
      expect(normalizeUrl("   ")).toBe("");
    });

    it("should handle already normalized URLs", () => {
      expect(normalizeUrl("https://github.com/user")).toBe("https://github.com/user");
    });
  });
});
