/**
 * ContactLinks visual-alignment tests
 *
 * Guards against icon-misalignment regressions in the PDF export.
 * Contact icons (Mail, Phone, MapPin, …) sit next to text labels inside
 * flex rows. In the exported PDF each icon SVG is converted to an <img>
 * by `convertSvgsToImages`; for that conversion to work the live DOM must
 * already carry the right inline styles.
 *
 * These tests verify:
 *  - Each contact icon is wrapped in a flex row that uses `items-center`
 *    (Tailwind) so the icon aligns to the vertical middle of the row.
 *  - The icon element carries an inline style that explicitly sets a
 *    `verticalAlign` of "middle" so it aligns with adjacent text even when
 *    rendered inside a non-flex ancestor by html2canvas.
 *  - The icon carries `flexShrink: 0` so it does not collapse in tight rows.
 *  - `display: inline` is set on each icon so html2canvas renders it inline,
 *    matching the live preview appearance.
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ContactLinks } from "../ContactLinks";
import type { ContactInfo } from "@/types/resume";

const baseContact: ContactInfo = {
  fullName: "Jane Doe",
  email: "jane@example.com",
  phone: "555-0100",
  location: "San Francisco, CA",
  linkedin: "https://linkedin.com/in/janedoe",
  github: "https://github.com/janedoe",
  portfolio: "https://janedoe.dev",
};

describe("ContactLinks — icon vertical alignment for PDF export", () => {
  it("renders icons with verticalAlign: middle style", () => {
    const { container } = render(
      <ContactLinks contact={baseContact} showIcons />
    );

    // Each icon is an SVG rendered by lucide-react.
    const icons = container.querySelectorAll("svg");
    expect(icons.length).toBeGreaterThan(0);

    icons.forEach((icon) => {
      const style = (icon as HTMLElement).style;
      expect(style.verticalAlign).toBe("middle");
    });
  });

  it("renders icons with display: inline so html2canvas treats them as inline content", () => {
    const { container } = render(
      <ContactLinks contact={baseContact} showIcons />
    );

    const icons = container.querySelectorAll("svg");
    expect(icons.length).toBeGreaterThan(0);

    icons.forEach((icon) => {
      expect((icon as HTMLElement).style.display).toBe("inline");
    });
  });

  it("renders icons with flexShrink: 0 so they don't collapse in tight rows", () => {
    const { container } = render(
      <ContactLinks contact={baseContact} showIcons />
    );

    const icons = container.querySelectorAll("svg");
    icons.forEach((icon) => {
      expect((icon as HTMLElement).style.flexShrink).toBe("0");
    });
  });

  it("wraps each item in a flex items-center row for vertical centring", () => {
    const { container } = render(
      <ContactLinks contact={baseContact} showIcons />
    );

    // Each contact item is a <span> with class "flex items-center gap-1"
    const rows = container.querySelectorAll("span.flex.items-center");
    expect(rows.length).toBeGreaterThan(0);
  });

  it("renders a label next to each icon (icon + text, not icon-only)", () => {
    render(<ContactLinks contact={baseContact} showIcons />);

    // Spot-check a few expected labels
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    expect(screen.getByText("555-0100")).toBeInTheDocument();
    expect(screen.getByText("San Francisco, CA")).toBeInTheDocument();
  });

  it("renders nothing when contact has no fields set", () => {
    const empty: ContactInfo = { fullName: "" };
    const { container } = render(<ContactLinks contact={empty} showIcons />);
    expect(container.firstChild).toBeNull();
  });

  it("renders text only (no SVG icons) when showIcons is false", () => {
    const { container } = render(
      <ContactLinks contact={baseContact} showIcons={false} />
    );
    const icons = container.querySelectorAll("svg");
    expect(icons.length).toBe(0);
    // Labels are still present
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
  });

  it("icon dimensions match the iconSize prop (important for PDF pixel-accuracy)", () => {
    const iconSize = 4; // default prop value → 4 * 4 = 16px
    const { container } = render(
      <ContactLinks contact={{ fullName: "Jane", email: "j@example.com" }} showIcons iconSize={iconSize} />
    );

    const icon = container.querySelector("svg") as HTMLElement | null;
    expect(icon).not.toBeNull();
    // ContactLinks sets width/height as iconSize * 4 pixels
    const expectedPx = `${iconSize * 4}px`;
    expect(icon!.style.width).toBe(expectedPx);
    expect(icon!.style.height).toBe(expectedPx);
  });
});
