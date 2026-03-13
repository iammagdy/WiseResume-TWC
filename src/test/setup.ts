import * as React from "react";
import "@testing-library/jest-dom";
import "./mocks/browser";
import "./mocks/supabase";
import "./mocks/sonner";
import "./mocks/haptics";
import * as framerMotionMock from "./mocks/framer-motion";

vi.mock("framer-motion", () => framerMotionMock);

vi.mock("@/lib/lazyWithRetry", () => ({
  lazyWithRetry: (factory: () => Promise<{ default: any }>) => React.lazy(factory),
}));

// Global mocks for JSDOM missing features
if (typeof window !== "undefined") {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  window.matchMedia = vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

if (typeof global !== "undefined") {
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
}
