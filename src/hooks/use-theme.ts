/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useResolvedScheme } from '@/lib/theme-context';

export function useTheme() {
  const scheme = useResolvedScheme();

  return Colors[scheme];
}
