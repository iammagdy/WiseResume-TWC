import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePortfolioSEO } from "./usePortfolioSEO";

function TestSEO({ profile }: { profile: any }) {
  usePortfolioSEO(profile);
  return null;
}

describe("usePortfolioSEO", () => {
  afterEach(() => {
    document.head.innerHTML = "";
    document.title = "";
    vi.unstubAllGlobals();
  });

  it("uses the current origin for OG images when no API base is configured", () => {
    const originalLocation = window.location;
    vi.stubGlobal("location", {
      ...originalLocation,
      origin: "https://resume.thewise.cloud",
    });

    render(
      <TestSEO
        profile={{
          username: "johndoe",
          fullName: "John Doe",
          seoNoindex: false,
          portfolioStyle: "minimal",
        }}
      />,
    );

    const ogImage = document.querySelector('meta[property="og:image"]');
    const twitterImage = document.querySelector('meta[name="twitter:image"]');

    expect(ogImage?.getAttribute("content")).toBe("https://resume.thewise.cloud/og-image/johndoe");
    expect(twitterImage?.getAttribute("content")).toBe("https://resume.thewise.cloud/og-image/johndoe");
  });
});
