const FIXED_FOOTER_ROUTE_PREFIXES = [
  // Auth & public routes — no FAB needed (user is not logged in yet)
  "/auth",
  "/sign-in",
  "/privacy-policy",
  "/terms-of-service",
  // App routes with their own fixed footers
  "/cover-letter/new",
  "/cover-letter/edit",
  "/resignation-letter/new",
  "/resignation-letter/edit",
  "/qr-code",
  "/qr-batch",
  "/qr-scan",
];

export interface MobileShellLayout {
  reserveBottomSpace: boolean;
  showAskFab: boolean;
  askFabOffsetClass: null | string;
}

export function hasFixedFooterRoute(pathname: string): boolean {
  return FIXED_FOOTER_ROUTE_PREFIXES.some((route) => pathname.startsWith(route));
}

export function getMobileShellLayout(
  pathname: string,
  isAnySheetOpen: boolean,
): MobileShellLayout {
  const reserveBottomSpace = true;
  const blockedByRoute = hasFixedFooterRoute(pathname);
  const showAskFab = !blockedByRoute && !isAnySheetOpen;

  if (!showAskFab) {
    return {
      reserveBottomSpace,
      showAskFab: false,
      askFabOffsetClass: null,
    };
  }

  return {
    reserveBottomSpace,
    showAskFab: true,
    askFabOffsetClass: pathname === "/portfolio"
      ? "bottom-[calc(8rem+env(safe-area-inset-bottom))]"
      : "bottom-[calc(4.5rem+env(safe-area-inset-bottom))]",
  };
}
