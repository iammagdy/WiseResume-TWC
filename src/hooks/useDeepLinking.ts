/**
 * Web no-op deep-linking hook. Native deep links are handled by the
 * Expo app (`mobile/`) via `expo-linking` + Universal Links / App
 * Links. The web build does not need to listen for OS-level URL
 * events because the SPA receives them as ordinary navigation.
 */
export function useDeepLinking() {
  // intentionally empty — see jsdoc above
}
