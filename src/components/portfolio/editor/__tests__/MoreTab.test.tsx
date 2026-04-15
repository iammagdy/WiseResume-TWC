import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MoreTab } from "../MoreTab";
import React from "react";

describe("MoreTab", () => {
  const defaultProps = {
    metaTitle: "Test Title",
    onMetaTitleChange: vi.fn(),
    metaDescription: "Test Desc",
    onMetaDescriptionChange: vi.fn(),
    onGenerateSEO: vi.fn(),
    generatingSEO: false,
    seoPlaceholderName: "John",
    seoPlaceholderTitle: "Dev",
    portfolioUsername: "john",
    userId: "123",
    portfolioEnabled: true,
    views: 10,
    onOpenCareerCard: vi.fn(),
    hasLivePortfolio: true,
    linkedinUrl: "https://linkedin.com",
    onLinkedinUrlChange: vi.fn(),
    githubUrl: "https://github.com",
    onGithubUrlChange: vi.fn(),
    contactEmail: "test@example.com",
    onContactEmailChange: vi.fn(),
    twitterUrl: "",
    onTwitterUrlChange: vi.fn(),
    websiteUrl: "",
    onWebsiteUrlChange: vi.fn(),
    openSections: new Set(["sociallinks", "seo"]),
    toggleSection: vi.fn(),
    onOpenHistory: vi.fn(),
  };

  it("renders LinkedIn URL input", () => {
    render(<MoreTab {...defaultProps} />);
    expect(screen.getByPlaceholderText(/linkedin\.com\/in/i)).toBeDefined();
  });

  it("calls onLinkedinUrlChange when input changes", () => {
    render(<MoreTab {...defaultProps} />);
    const input = screen.getByPlaceholderText(/linkedin\.com\/in/i);
    fireEvent.change(input, { target: { value: "https://linkedin.com/in/new" } });
    expect(defaultProps.onLinkedinUrlChange).toHaveBeenCalledWith("https://linkedin.com/in/new");
  });

  it("renders Meta Title field for SEO", () => {
    render(<MoreTab {...defaultProps} />);
    expect(screen.getByPlaceholderText(/John.*Dev/i)).toBeDefined();
  });
});
