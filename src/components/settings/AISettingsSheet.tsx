/**
 * Stub component — BYOK / per-provider key management has been removed.
 * Kept so existing imports (Settings page, WiseHire settings) compile.
 * Renders nothing.
 */

interface AISettingsSheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AISettingsSheet(_props: AISettingsSheetProps) {
  return null;
}

export default AISettingsSheet;
