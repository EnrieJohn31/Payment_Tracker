import { Camera, Map, Marker, type CameraRef, type MapRef } from '@maplibre/maplibre-react-native';
import { useCallback, useEffect, useRef } from 'react';
import { type NativeSyntheticEvent, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type LatLng = { latitude: number; longitude: number };

type Props = {
  coords: LatLng | null;
  /** Called when the user taps the map; `poiName` is set when a store/place label was tapped. */
  onSelect: (coords: LatLng, poiName?: string) => void;
};

/** Metro Manila, shown until GPS or a tap provides a real position. */
const DEFAULT_CENTER = { latitude: 14.5995, longitude: 120.9842 };
const DEFAULT_ZOOM = 15;
const MAP_STYLE_URL =
  process.env.EXPO_PUBLIC_MAP_STYLE_URL ?? 'https://tiles.openfreemap.org/styles/liberty';

type MapPressEvent = NativeSyntheticEvent<{
  lngLat: [number, number];
  point: [number, number];
}>;

function toLngLat(coords: LatLng): [number, number] {
  return [coords.longitude, coords.latitude];
}

export function LocationMap({ coords, onSelect }: Props) {
  const theme = useTheme();
  const cameraRef = useRef<CameraRef | null>(null);
  const mapRef = useRef<MapRef | null>(null);

  useEffect(() => {
    if (coords) {
      cameraRef.current?.easeTo({
        center: toLngLat(coords),
        zoom: DEFAULT_ZOOM,
        duration: 350,
      });
    }
  }, [coords]);

  const handlePress = useCallback(
    async (event: MapPressEvent) => {
      const [longitude, latitude] = event.nativeEvent.lngLat;
      const position = { latitude, longitude };

      try {
        const features = await mapRef.current?.queryRenderedFeatures(event.nativeEvent.point);
        const poiName = features
          ?.map((feature) => feature.properties?.name)
          .find((name): name is string => typeof name === 'string' && name.trim().length > 0);
        onSelect(position, poiName?.replace(/\n/g, ' '));
      } catch {
        onSelect(position);
      }
    },
    [onSelect],
  );

  return (
    <View style={styles.wrapper}>
      <Map
        ref={mapRef}
        mapStyle={MAP_STYLE_URL}
        style={styles.map}
        attribution
        compass
        logo={false}
        onPress={handlePress}
        tintColor={theme.tint}>
        <Camera
          ref={cameraRef}
          initialViewState={{
            center: toLngLat(coords ?? DEFAULT_CENTER),
            zoom: DEFAULT_ZOOM,
          }}
        />
        {coords && (
          <Marker id="purchase-location" lngLat={toLngLat(coords)} anchor="bottom">
            <View style={[styles.marker, { backgroundColor: theme.tint }]}>
              <View style={styles.markerDot} />
            </View>
          </Marker>
        )}
      </Map>
      <View style={[styles.credit, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="code" themeColor="textSecondary">
          Map: OpenFreeMap / OpenStreetMap
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: 220,
  },
  marker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  markerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  credit: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
});
