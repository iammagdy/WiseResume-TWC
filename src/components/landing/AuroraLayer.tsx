import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSettingsStore } from "@/store/settingsStore";
import { getSafeMatchMedia } from "@/lib/envUtils";
import { AuroraBackground } from "@/components/landing/AuroraBackground";

/* Routes on which the aurora background should be visible. The match
   is path-equality (after trailing-slash normalization) plus a couple
   of allowed prefixes. Keep this list in sync with the public marketing
   routes that opt in to the aurora hero. */
const AURORA_PUBLIC_PATHS = ["/", "/enterprises", "/pricing", "/whats-new", "/sign-in"];

/* Renders the fixed-position aurora canvas behind the landing/public
   routes, and stamps `<html>.aurora-active` + a backstop `<body>`
   background color so there's never an LCP flash before the WebGL
   canvas mounts. Used by both `AppLanding` (the lightweight chunk that
   serves `/` and `/enterprises` first paint) and `AppInterior` (the
   full app shell, which serves the aurora on `/pricing`, `/sign-in`,
   etc.). Previously this lived only inside `AppInterior`, which meant
   the landing routes — served by `AppLanding` — never got an aurora
   at all. Task #7 follow-up restores it for the landing chunk. */
export function AuroraLayer() {
  const location = useLocation();
  const rawPath = location.pathname;
  const path = rawPath.length > 1 && rawPath.endsWith("/")
    ? rawPath.slice(0, -1)
    : rawPath;
  const isPublicPage =
    AURORA_PUBLIC_PATHS.includes(path) ||
    path.startsWith("/auth") ||
    path.startsWith("/p/");

  const theme = useSettingsStore((s) => s.theme);
  const lpProduct = useSettingsStore((s) => s.lpProduct);
  /* `/enterprises` is the canonical WiseHire landing URL — force the
     WiseHire tint there regardless of the persisted toggle so a
     deep-link to `/enterprises` always paints the blue aurora. `/`
     honors the toggle (Individuals ↔ Enterprises). All other public
     pages use the jobseeker (red) palette. */
  const isLandingPage = path === "/" || path === "/enterprises";
  const effectiveLpProduct = path === "/enterprises"
    ? "wisehire"
    : isLandingPage
      ? lpProduct
      : "jobseeker";

  useEffect(() => {
    if (!isPublicPage) return;
    const body = document.body;
    const prevBodyBg = body.style.backgroundColor;

    const isDark =
      theme === "dark"
        ? true
        : theme === "light"
        ? false
        : getSafeMatchMedia("(prefers-color-scheme: dark)").matches;

    const isWiseHire = effectiveLpProduct === "wisehire";
    body.style.backgroundColor = isWiseHire
      ? (isDark ? "#00061a" : "#f0f5ff")
      : (isDark ? "#0a0000" : "#fff5f5");
    document.documentElement.classList.add("aurora-active");

    /* Defensively remove the pre-React bg style element (set in
       index.html before React mounts to prevent the LCP flash). It is
       inline + opaque (e.g. `body{background:#111111!important}`) and
       would otherwise fight the aurora's transparency on the body.
       Index.tsx removes it on its own first paint, but mounting/un-
       mounting AuroraLayer (route changes, chunk hydration) is the
       correct lifecycle hook to guarantee removal. */
    const preReactBg = document.getElementById("pre-react-bg");
    if (preReactBg) preReactBg.remove();

    return () => {
      body.style.backgroundColor = prevBodyBg;
      document.documentElement.classList.remove("aurora-active");
    };
  }, [isPublicPage, theme, effectiveLpProduct]);

  if (!isPublicPage) return null;
  return <AuroraBackground product={effectiveLpProduct} />;
}
