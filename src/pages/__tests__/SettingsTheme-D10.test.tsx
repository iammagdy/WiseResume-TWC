/**
 * D10 — Settings & BYOK
 * T076: Theme cycle — Light → Dark → System; setTheme called with each value
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/renderWithProviders";
import { ThemeToggle } from "@/components/settings/ThemeToggle";

// Override settingsStore mock to include theme + setTheme
const { mockSetTheme } = vi.hoisted(() => ({
  mockSetTheme: vi.fn(),
}));
vi.mock("@/store/settingsStore", () => {
  const store = {
    theme: "light" as "light" | "dark" | "system",
    setTheme: mockSetTheme,
    showAutoSaveToasts: true,
    biometricLockEnabled: false,
    biometricLockTimeout: 0,
    aiTipFrequency: "on-demand" as const,
    selectedTemplate: "modern" as const,
    byokGeminiKey: null,
    byokOllamaUrl: null,
    aiProvider: "wiseresume" as const,
    setShowAutoSaveToasts: vi.fn(),
    setBiometricLockEnabled: vi.fn(),
    setAITipFrequency: vi.fn(),
    setSelectedTemplate: vi.fn(),
    setByokGeminiKey: vi.fn(),
    setByokOllamaUrl: vi.fn(),
    setAIProvider: vi.fn(),
  };

  const fn = vi.fn((selector?: (s: typeof store) => unknown) =>
    selector ? selector(store) : store
  );
  (fn as any).getState = () => store;
  (fn as any).setState = vi.fn();
  (fn as any).subscribe = vi.fn(() => () => {});

  return { useSettingsStore: fn };
});

describe("SettingsTheme (D10) — theme cycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Light and Dark theme buttons", () => {
    renderWithProviders(<ThemeToggle />);
    expect(screen.getByText("Light")).toBeInTheDocument();
    expect(screen.getByText("Dark")).toBeInTheDocument();
  });

  it("calls setTheme('dark') when Dark button is clicked", () => {
    renderWithProviders(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button", { name: /dark/i }));
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("calls setTheme('system') when Auto button is clicked", () => {
    renderWithProviders(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button", { name: /auto/i }));
    expect(mockSetTheme).toHaveBeenCalledWith("system");
  });

  it("does not call setTheme when clicking the already-active theme", () => {
    // theme is 'light' by default — clicking Light again should not call setTheme
    renderWithProviders(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button", { name: /light/i }));
    // The toggle guards against same-value changes
    expect(mockSetTheme).not.toHaveBeenCalledWith("light");
  });
});
