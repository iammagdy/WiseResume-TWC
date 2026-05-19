import * as React from "react";

const MOBILE_BREAKPOINT = 900;
export const EDITOR_MOBILE_BREAKPOINT = 1024;

export function useIsMobile(breakpoint: number = MOBILE_BREAKPOINT) {
  // Initialise synchronously so the first paint uses the correct layout branch.
  // Previously `undefined` coerced to `false`, so sub-1024px viewports briefly
  // mounted the desktop split (then unmounted Live Preview) until the effect ran.
  const [isMobile, setIsMobile] = React.useState(() =>
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < breakpoint);
    return () => mql.removeEventListener("change", onChange);
  }, [breakpoint]);

  return isMobile;
}
