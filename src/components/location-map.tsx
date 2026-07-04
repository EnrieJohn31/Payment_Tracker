import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, type MapPressEvent, type PoiClickEvent } from 'react-native-maps';

export type LatLng = { latitude: number; longitude: number };

type Props = {
  coords: LatLng | null;
  /** Called when the user taps the map; `poiName` is set when a store/place label was tapped. */
  onSelect: (coords: LatLng, poiName?: string) => void;
};

/** Metro Manila, shown until GPS or a tap provides a real position. */
const DEFAULT_CENTER = { latitude: 14.5995, longitude: 120.9842 };
const DELTA = 0.01;

export function LocationMap({ coords, onSelect }: Props) {
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    if (coords) {
      mapRef.current?.animateToRegion(
        { ...coords, latitudeDelta: DELTA, longitudeDelta: DELTA },
        350,
      );
    }
  }, [coords]);

  return (
    <View style={styles.wrapper}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          ...(coords ?? DEFAULT_CENTER),
          latitudeDelta: DELTA,
          longitudeDelta: DELTA,
        }}
        onPress={(event: MapPressEvent) => onSelect(event.nativeEvent.coordinate)}
        onPoiClick={(event: PoiClickEvent) =>
          onSelect(event.nativeEvent.coordinate, event.nativeEvent.name.replace(/\n/g, ' '))
        }>
        {coords && <Marker coordinate={coords} />}
      </MapView>
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
});
