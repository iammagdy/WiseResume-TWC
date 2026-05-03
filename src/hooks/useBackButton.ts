/**
 * Web no-op back-button hook. Hardware back-button handling lives in
 * the standalone Expo app (`mobile/`) which uses Expo Router's native
 * gesture handling. The browser's own back button works without any
 * intervention here.
 */
export function useBackButton(_onBeforeBack?: () => boolean) {
  // intentionally empty — see jsdoc above
  void _onBeforeBack;
}
