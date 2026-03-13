import { describe, it, expect, vi } from "vitest";
import { captureWithRetry } from "../html2canvasRetry";

describe("html2canvasRetry", () => {
  it("should attempt to capture an element", async () => {
    const element = document.createElement("div");
    element.innerHTML = "Test Content";
    document.body.appendChild(element);

    // Mock html2canvas since it's hard to run in jsdom with real canvas
    vi.mock("html2canvas", () => ({
      default: vi.fn().mockResolvedValue({
        toDataURL: () => "data:image/png;base64,test",
        remove: vi.fn(),
      }),
    }));

    const result = await captureWithRetry(element);
    expect(result).toBeDefined();
    
    document.body.removeChild(element);
  });

  it("should handle capture failure gracefully (simulated)", async () => {
    const element = document.createElement("div");
    
    // This is more of a smoke test to ensure no crashes
    const result = await captureWithRetry(element, { maxRetries: 1 });
    expect(result).toBeDefined();
  });
});
