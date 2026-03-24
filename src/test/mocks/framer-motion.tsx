import { vi } from "vitest";
import React from "react";

const mockComponent = (tag: string) => React.forwardRef(({ children, ...props }: any, ref) => {
  // Filter out framer-motion specific props
  const { 
    whileInView, initial, animate, transition, variants, viewport,
    exit, layout, layoutId, whileHover, whileTap, onAnimationStart, onAnimationComplete,
    onUpdate, onPan, onPanStart, onPanEnd, onPanSessionStart,
    onTap, onTapStart, onTapCancel, onHoverStart, onHoverEnd,
    drag, dragControls, dragListener, dragMomentum, dragElastic,
    dragDirectionLock, dragPropagation, dragConstraints, dragTransition,
    onDragStart, onDragEnd, onDrag, onDirectionLock,
    ...cleanProps 
  } = props;
  return React.createElement(tag, { ...cleanProps, ref }, children);
});

export const motion = {
  div: mockComponent("div"),
  span: mockComponent("span"),
  section: mockComponent("section"),
  p: mockComponent("p"),
  h1: mockComponent("h1"),
  h2: mockComponent("h2"),
  h3: mockComponent("h3"),
  button: mockComponent("button"),
  a: mockComponent("a"),
  nav: mockComponent("nav"),
  img: mockComponent("img"),
  li: mockComponent("li"),
  ul: mockComponent("ul"),
  ol: mockComponent("ol"),
  svg: mockComponent("svg"),
  circle: mockComponent("circle"),
  line: mockComponent("line"),
  path: mockComponent("path"),
  g: mockComponent("g"),
  rect: mockComponent("rect"),
};

export const AnimatePresence = ({ children }: any) => children;
export const useScroll = () => ({ scrollYProgress: { onChange: vi.fn(), get: () => 0 } });
export const useTransform = () => ({ get: () => 0 });
export const useSpring = () => ({ get: () => 0 });
export const useReducedMotion = () => false;
export const useAnimation = () => ({
  start: vi.fn(),
  stop: vi.fn(),
  set: vi.fn(),
});
export const useInView = () => [vi.fn(), true];
export const LayoutGroup = ({ children }: any) => children;
export const LazyMotion = ({ children }: any) => children;
export const domAnimation = {};
export const domMax = {};
export const useMotionValue = vi.fn(() => ({ get: () => 0, set: vi.fn(), onChange: vi.fn() }));
export const useMotionTemplate = vi.fn(() => ({ get: () => "" }));
export const useAnimate = vi.fn(() => [vi.fn(), {}]);
export const stagger = vi.fn(() => 0);
export const m = {
  div: mockComponent("div"),
  span: mockComponent("span"),
  section: mockComponent("section"),
  p: mockComponent("p"),
  h1: mockComponent("h1"),
  h2: mockComponent("h2"),
  h3: mockComponent("h3"),
  button: mockComponent("button"),
  a: mockComponent("a"),
  nav: mockComponent("nav"),
  img: mockComponent("img"),
  li: mockComponent("li"),
  ul: mockComponent("ul"),
  ol: mockComponent("ol"),
  svg: mockComponent("svg"),
  circle: mockComponent("circle"),
  line: mockComponent("line"),
  path: mockComponent("path"),
  g: mockComponent("g"),
  rect: mockComponent("rect"),
};
