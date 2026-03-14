import wiseAiLogoLight from '@/assets/wiseresume-logo-light.webp';
import wiseAiLogoDark from '@/assets/wiseresume-logo-dark.webp';
import { useIsDark } from '@/hooks/useIsDark';

/** Returns the correct logo webp import for the current theme. */
export function useThemeLogo() {
  const isDark = useIsDark();
  return isDark ? wiseAiLogoDark : wiseAiLogoLight;
}
