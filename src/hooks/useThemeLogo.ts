import wiseAiLogoLight from '@/assets/wise-ai-logo.webp';
import wiseAiLogoDark from '@/assets/wise-ai-logo-dark.webp';
import { useIsDark } from '@/hooks/useIsDark';

/** Returns the correct logo webp import for the current theme. */
export function useThemeLogo() {
  const isDark = useIsDark();
  return isDark ? wiseAiLogoDark : wiseAiLogoLight;
}
