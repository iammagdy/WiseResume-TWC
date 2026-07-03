> [!CAUTION]
> Historical / archived document. Do not treat as current project truth. Use Project Atlas/SOURCE_OF_TRUTH_MAP.md and living specs for current references.

# Legacy navigation components (removed 2026-06-16)

These files were orphaned after the global sidebar workspace shell shipped. Navigation is handled by `AppWorkspaceSidebar`, `AppWorkspaceTopBar`, and `AppWorkspaceLayout`.

Previously removed components:

- `BottomTabBar.tsx` — mobile bottom tab bar (unused)
- `MobileTopBar.tsx` — compact mobile top bar (unused)
- `DesktopNav.tsx` — desktop header nav (replaced by workspace top bar)

Do not re-import without a deliberate nav architecture decision.
