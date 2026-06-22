import { describe, it, expect } from "vitest";
import { isValidUrl, normalizeUrl, safeHref } from "../urlUtils";

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

  describe("safeHref", () => {
    it("allows http and https URLs without normalizing them", () => {
      expect(safeHref("https://example.com")).toBe("https://example.com");
      expect(safeHref("http://example.com/path?q=1")).toBe("http://example.com/path?q=1");
    });

    it("prepends https:// for bare domains", () => {
      expect(safeHref("example.com")).toBe("https://example.com");
    });

    it("allows mailto and tel schemes", () => {
      expect(safeHref("mailto:user@example.com")).toBe("mailto:user@example.com");
      expect(safeHref("tel:+15551234567")).toBe("tel:+15551234567");
    });

    it("rejects javascript: URLs", () => {
      expect(safeHref("javascript:alert(1)")).toBeUndefined();
      expect(safeHref("JavaScript:alert(1)")).toBeUndefined();
      expect(safeHref("javascript://%0aalert(document.cookie)")).toBeUndefined();
      expect(safeHref("  javascript:alert(1)  ")).toBeUndefined();
    });

    it("rejects data: and vbscript: URLs", () => {
      expect(safeHref("data:text/html,<script>alert(1)</script>")).toBeUndefined();
      expect(safeHref("vbscript:msgbox(1)")).toBeUndefined();
    });

    it("returns undefined for empty or nullish input", () => {
      expect(safeHref("")).toBeUndefined();
      expect(safeHref("   ")).toBeUndefined();
      expect(safeHref(null)).toBeUndefined();
      expect(safeHref(undefined)).toBeUndefined();
    });
  });
});
