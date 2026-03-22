/**
 * T009 — Canary test: verifies AllProviders wrapper renders without crashing.
 * If this test fails, something in the shared test infrastructure is broken.
 */
import React from "react";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "./renderWithProviders";

describe("AllProviders canary", () => {
  it("renders children without error", () => {
    renderWithProviders(<div data-testid="canary">hello</div>);
    expect(screen.getByTestId("canary")).toBeInTheDocument();
  });
});
