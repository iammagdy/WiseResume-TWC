import { describe, it, expect } from "vitest";

describe("Sanity Check", () => {
  it("should verify that the test runner is correctly configured", () => {
    expect(1 + 1).toBe(2);
  });

  it("should verify that global mocks are available", () => {
    expect(window.matchMedia).toBeDefined();
    expect(window.IntersectionObserver).toBeDefined();
  });
});
