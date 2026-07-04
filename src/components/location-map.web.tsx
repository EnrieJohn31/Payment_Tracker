import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type LatLng = { latitude: number; longitude: number };

type Props = {
  coords: LatLng | null;
  onSelect: (coords: LatLng, poiName?: string) => void;
};

/** The native MapLibre map is mobile-only; show the picked spot as text on web. */
export function LocationMap({ coords }: Props) {
  const theme = useTheme();

  return (
    <View style={[styles.placeholder, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="small" themeColor="textSecondary">
        {coords
          ? `📍 ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`
          : 'The map is available in the mobile app.'}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    borderRadius: 12,
    padding: Spacing.three,
    alignItems: 'center',
  },
});
