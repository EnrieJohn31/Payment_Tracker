import { File, Paths } from 'expo-file-system';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { LocationMap, type LatLng } from '@/components/location-map';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatPeso, parseAmount } from '@/lib/currency';
import { NEAR_LIMIT_RATIO, usePayments } from '@/lib/payments-context';
import { scanReceipt } from '@/lib/receipt-ocr';

type ItemDraft = {
  key: number;
  name: string;
  price: string;
  quantity: string;
};

const PAYMENT_METHODS = [
  'Cash',
  'GCash',
  'Maya',
  'MariBank',
  'Metrobank Credit Card',
  'UnionBank Credit Card',
];

let nextKey = 1;

function newItem(): ItemDraft {
  return { key: nextKey++, name: '', price: '', quantity: '1' };
}

export default function AddPurchaseScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { addPayment, balanceLimit, spentThisMonth } = usePayments();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [items, setItems] = useState<ItemDraft[]>([newItem()]);
  const [place, setPlace] = useState('');
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);

  const total = useMemo(
    () =>
      items.reduce((sum, item) => {
        const price = parseAmount(item.price) ?? 0;
        const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
        return sum + price * qty;
      }, 0),
    [items],
  );

  const scanPhoto = useCallback(async (uri: string) => {
    setScanning(true);
    try {
      const { items: found, place: foundPlace } = await scanReceipt(uri);
      if (found.length === 0) {
        Alert.alert(
          'No items found',
          'Could not read any items from the photo. Try a sharper, well-lit shot, or enter the items manually.',
        );
        return;
      }
      // Prefill from the receipt but keep anything already typed by hand;
      // every field stays editable so mistakes can be corrected.
      setItems((prev) => {
        const typed = prev.filter((it) => it.name.trim() || it.price.trim());
        const scanned = found.map((it) => ({
          key: nextKey++,
          name: it.name,
          price: it.price.toFixed(2),
          quantity: String(it.quantity),
        }));
        return [...typed, ...scanned];
      });
      if (foundPlace) {
        setPlace((prev) => (prev.trim() ? prev : foundPlace));
      }
    } catch {
      Alert.alert(
        'Could not read the receipt',
        'Something went wrong while reading the photo. Check your internet connection and try again, or enter the items manually.',
      );
    } finally {
      setScanning(false);
    }
  }, []);

  const takePhoto = useCallback(
    async (fromCamera: boolean) => {
      if (fromCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Camera permission needed', 'Allow camera access to photograph receipts.');
          return;
        }
      }
      // allowsEditing opens a crop box after the shot: trim the photo down to
      // just the items so reading is faster and more accurate.
      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.7,
            allowsEditing: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.7,
            allowsEditing: true,
          });
      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
        scanPhoto(result.assets[0].uri);
      }
    },
    [scanPhoto],
  );

  const removePhoto = useCallback(() => {
    Alert.alert('Remove photo?', 'You can take a new one afterwards.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setPhotoUri(null) },
    ]);
  }, []);

  const lookUpAddress = useCallback(async (position: LatLng) => {
    try {
      const [geo] = await Location.reverseGeocodeAsync(position);
      const label = [geo?.name ?? geo?.street, geo?.city ?? geo?.subregion]
        .filter(Boolean)
        .join(', ');
      setAddress(label || null);
    } catch {
      setAddress(null); // coordinates alone are still useful
    }
  }, []);

  const captureLocation = useCallback(
    async (silent = false) => {
      setLocating(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (!silent) {
            Alert.alert('Location permission needed', 'Allow location access to mark where you bought.');
          }
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const position = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setCoords(position);
        await lookUpAddress(position);
      } catch {
        if (!silent) {
          Alert.alert('Location unavailable', 'Could not get your current location. Try again.');
        }
      } finally {
        setLocating(false);
      }
    },
    [lookUpAddress],
  );

  // Tapping the map (or a store label on it) moves the pin there.
  const pickOnMap = useCallback(
    (position: LatLng, poiName?: string) => {
      setCoords(position);
      if (poiName) {
        setAddress(poiName);
        setPlace((prev) => (prev.trim() ? prev : poiName));
      } else {
        lookUpAddress(position);
      }
    },
    [lookUpAddress],
  );

  // Fetch the location automatically when the screen opens; the button below
  // stays available to refresh it, and the place field can be typed manually.
  useEffect(() => {
    captureLocation(true);
  }, [captureLocation]);

  const updateItem = useCallback((key: number, patch: Partial<ItemDraft>) => {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }, []);

  const removeItem = useCallback((key: number) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.key !== key) : prev));
  }, []);

  const save = useCallback(async () => {
    const trimmedPlace = place.trim();
    if (!trimmedPlace) {
      Alert.alert('Missing place', 'Enter where you bought these items.');
      return;
    }
    const parsedItems = items
      .map((it) => ({
        name: it.name.trim(),
        price: parseAmount(it.price),
        quantity: Math.max(1, Math.floor(Number(it.quantity) || 1)),
      }))
      .filter((it) => it.name.length > 0);
    if (parsedItems.length === 0 || parsedItems.some((it) => it.price === null)) {
      Alert.alert('Check your items', 'Every item needs a name and a valid price.');
      return;
    }

    setSaving(true);
    try {
      let storedUri: string | null = null;
      if (photoUri) {
        try {
          const dest = new File(Paths.document, `receipt-${Date.now()}.jpg`);
          new File(photoUri).copy(dest);
          storedUri = dest.uri;
        } catch {
          storedUri = photoUri; // fall back to the original picker URI
        }
      }

      await addPayment({
        place: trimmedPlace,
        receiptUri: storedUri,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
        paymentMethod,
        createdAt: Date.now(),
        items: parsedItems.map((it) => ({
          name: it.name,
          price: it.price as number,
          quantity: it.quantity,
        })),
      });

      // Warn if this purchase pushed the month's spending near or over the limit.
      if (balanceLimit !== null) {
        const after = spentThisMonth + total;
        if (after >= balanceLimit && spentThisMonth < balanceLimit) {
          Alert.alert(
            'Balance limit reached',
            `You have now spent ${formatPeso(after)} of your ${formatPeso(balanceLimit)} monthly limit.`,
          );
        } else if (
          after >= balanceLimit * NEAR_LIMIT_RATIO &&
          spentThisMonth < balanceLimit * NEAR_LIMIT_RATIO
        ) {
          Alert.alert(
            'Balance is near the limit',
            `Only ${formatPeso(Math.max(0, balanceLimit - after))} left of your ${formatPeso(balanceLimit)} monthly limit.`,
          );
        }
      }

      router.back();
    } finally {
      setSaving(false);
    }
  }, [
    addPayment,
    balanceLimit,
    coords,
    items,
    paymentMethod,
    photoUri,
    place,
    router,
    spentThisMonth,
    total,
  ]);

  const inputStyle = [
    styles.input,
    { backgroundColor: theme.backgroundElement, color: theme.text },
  ];

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Receipt photo */}
          <ThemedText type="smallBold">Receipt photo</ThemedText>
          {photoUri && (
            <Image source={{ uri: photoUri }} style={styles.preview} contentFit="cover" />
          )}
          <View style={styles.rowButtons}>
            <Pressable
              onPress={() => takePhoto(true)}
              style={[styles.button, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="small">{photoUri ? '📷 Retake photo' : '📷 Take photo'}</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => takePhoto(false)}
              style={[styles.button, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="small">🖼️ From gallery</ThemedText>
            </Pressable>
          </View>
          {!photoUri && (
            <ThemedText type="small" themeColor="textSecondary">
              After the shot, a crop box appears — trim the photo down to just the list of items
              so they are read faster and more accurately.
            </ThemedText>
          )}
          {photoUri && !scanning && (
            <Pressable onPress={removePhoto} hitSlop={8} style={styles.removePhoto}>
              <ThemedText type="small" style={{ color: theme.danger }}>
                🗑️ Remove photo
              </ThemedText>
            </Pressable>
          )}
          {scanning && (
            <View style={styles.scanningRow}>
              <ActivityIndicator size="small" color={theme.tint} />
              <ThemedText type="small" themeColor="textSecondary">
                Reading items from the receipt…
              </ThemedText>
            </View>
          )}

          {/* Items */}
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            Things bought
          </ThemedText>
          {items.map((item) => (
            <View key={item.key} style={styles.itemRow}>
              <TextInput
                style={[...inputStyle, styles.itemName]}
                placeholder="Item"
                placeholderTextColor={theme.textSecondary}
                value={item.name}
                onChangeText={(t) => updateItem(item.key, { name: t })}
              />
              <TextInput
                style={[...inputStyle, styles.itemQty]}
                placeholder="Qty"
                placeholderTextColor={theme.textSecondary}
                keyboardType="number-pad"
                value={item.quantity}
                onChangeText={(t) => updateItem(item.key, { quantity: t })}
              />
              <TextInput
                style={[...inputStyle, styles.itemPrice]}
                placeholder="₱0.00"
                placeholderTextColor={theme.textSecondary}
                keyboardType="decimal-pad"
                value={item.price}
                onChangeText={(t) => updateItem(item.key, { price: t })}
              />
              <Pressable onPress={() => removeItem(item.key)} hitSlop={8}>
                <ThemedText type="small" style={{ color: theme.danger }}>
                  ✕
                </ThemedText>
              </Pressable>
            </View>
          ))}
          <Pressable onPress={() => setItems((prev) => [...prev, newItem()])} hitSlop={8}>
            <ThemedText type="linkPrimary">+ Add another item</ThemedText>
          </Pressable>

          <View style={styles.totalRow}>
            <ThemedText type="smallBold">Total</ThemedText>
            <ThemedText type="subtitle">{formatPeso(total)}</ThemedText>
          </View>

          {/* Payment method */}
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            Paid with
          </ThemedText>
          <View style={styles.methodWrap}>
            {PAYMENT_METHODS.map((method) => {
              const selected = paymentMethod === method;
              return (
                <Pressable
                  key={method}
                  onPress={() => setPaymentMethod(selected ? null : method)}
                  style={[
                    styles.methodChip,
                    { backgroundColor: selected ? theme.tint : theme.backgroundElement },
                  ]}>
                  <ThemedText
                    type={selected ? 'smallBold' : 'small'}
                    style={selected ? styles.methodChipSelected : undefined}>
                    {method}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          {/* Place */}
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            Where was it bought?
          </ThemedText>
          <TextInput
            style={inputStyle}
            placeholder="Store or place name"
            placeholderTextColor={theme.textSecondary}
            value={place}
            onChangeText={setPlace}
          />
          <LocationMap coords={coords} onSelect={pickOnMap} />
          <ThemedText type="small" themeColor="textSecondary">
            Tap the store on the map to move the pin — tapping a place label also fills in its
            name.
          </ThemedText>
          <Pressable onPress={() => captureLocation(false)} disabled={locating} hitSlop={8}>
            <ThemedText type="linkPrimary">
              {locating
                ? 'Getting location…'
                : coords
                  ? `📍 ${address ?? `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`} — tap to use my location`
                  : '📍 Use my current location'}
            </ThemedText>
          </Pressable>

          {/* Save */}
          <Pressable
            onPress={save}
            disabled={saving}
            style={[styles.saveButton, { backgroundColor: theme.tint, opacity: saving ? 0.6 : 1 }]}>
            <ThemedText type="smallBold" style={styles.saveLabel}>
              {saving ? 'Saving…' : 'Save purchase'}
            </ThemedText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.two,
    paddingBottom: Spacing.six,
  },
  sectionTitle: {
    marginTop: Spacing.three,
  },
  preview: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 12,
  },
  rowButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  removePhoto: {
    alignSelf: 'center',
    paddingVertical: Spacing.one,
  },
  scanningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  input: {
    borderRadius: 10,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  itemName: {
    flex: 1,
  },
  itemQty: {
    width: 56,
    textAlign: 'center',
  },
  itemPrice: {
    width: 96,
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  methodWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  methodChip: {
    borderRadius: 20,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  methodChipSelected: {
    color: '#ffffff',
  },
  saveButton: {
    marginTop: Spacing.four,
    borderRadius: 12,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  saveLabel: {
    color: '#ffffff',
  },
});
