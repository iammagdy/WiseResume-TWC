import * as React from "react";
import "@testing-library/jest-dom";
import "./mocks/browser";
import "./mocks/supabase";
import "./mocks/sonner";
import "./mocks/haptics";
import "./mocks/auth";
import "./mocks/router";
import "./mocks/aiAction";
import "./mocks/agenticChat";
import "./mocks/zustandStores";
import "./mocks/fetch";
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

  // DOMMatrix is required by pdfjs-dist but not available in jsdom
  if (!global.DOMMatrix) {
    (global as any).DOMMatrix = class DOMMatrix {
      a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
      m11 = 1; m12 = 0; m13 = 0; m14 = 0;
      m21 = 0; m22 = 1; m23 = 0; m24 = 0;
      m31 = 0; m32 = 0; m33 = 1; m34 = 0;
      m41 = 0; m42 = 0; m43 = 0; m44 = 1;
      is2D = true; isIdentity = true;
      constructor(_init?: string | number[]) {}
      static fromFloat32Array(a: Float32Array) { return new DOMMatrix(Array.from(a)); }
      static fromFloat64Array(a: Float64Array) { return new DOMMatrix(Array.from(a)); }
      static fromMatrix(m?: DOMMatrixInit) { return new DOMMatrix(); }
      multiply() { return new DOMMatrix(); }
      inverse() { return new DOMMatrix(); }
      translate() { return new DOMMatrix(); }
      scale() { return new DOMMatrix(); }
      rotate() { return new DOMMatrix(); }
      transformPoint(p?: DOMPointInit) { return { x: p?.x ?? 0, y: p?.y ?? 0, z: p?.z ?? 0, w: p?.w ?? 1 }; }
      toFloat32Array() { return new Float32Array(16); }
      toFloat64Array() { return new Float64Array(16); }
    };
  }

  // Speech API stubs for voice/interview tests
  vi.stubGlobal("SpeechRecognition", vi.fn());
  vi.stubGlobal("webkitSpeechRecognition", vi.fn());
}
