import { Image } from 'expo-image';
import { useCallback, useState } from 'react';
import { FlatList, Linking, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatPeso } from '@/lib/currency';
import { formatDateTime } from '@/lib/dates';
import { type Payment, type PaymentItem } from '@/lib/db';
import { usePayments } from '@/lib/payments-context';

type Props = {
  payments: Payment[];
  emptyMessage?: string;
  ListHeaderComponent?: React.ComponentProps<typeof FlatList>['ListHeaderComponent'];
};

/**
 * List of payments. Tapping a row expands it to show the total cost,
 * the items bought, the receipt photo, and where it was bought.
 */
export function PaymentList({ payments, emptyMessage, ListHeaderComponent }: Props) {
  const theme = useTheme();
  const { loadItems } = usePayments();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [itemsById, setItemsById] = useState<Record<number, PaymentItem[]>>({});

  const toggle = useCallback(
    async (payment: Payment) => {
      const next = expandedId === payment.id ? null : payment.id;
      setExpandedId(next);
      if (next !== null && !itemsById[payment.id]) {
        const items = await loadItems(payment.id);
        setItemsById((prev) => ({ ...prev, [payment.id]: items }));
      }
    },
    [expandedId, itemsById, loadItems],
  );

  const openMap = useCallback((payment: Payment) => {
    if (payment.latitude === null || payment.longitude === null) return;
    Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${payment.latitude},${payment.longitude}`,
    );
  }, []);

  return (
    <FlatList
      data={payments}
      keyExtractor={(p) => String(p.id)}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={
        <View style={styles.empty}>
          <ThemedText type="default" themeColor="textSecondary" style={styles.emptyText}>
            {emptyMessage ?? 'No payments yet. Add a purchase to get started.'}
          </ThemedText>
        </View>
      }
      renderItem={({ item: payment }) => {
        const expanded = expandedId === payment.id;
        const items = itemsById[payment.id];

        return (
          <Pressable
            onPress={() => toggle(payment)}
            style={[
              styles.card,
              {
                backgroundColor: expanded ? theme.backgroundSelected : theme.backgroundElement,
              },
            ]}>
            <View style={styles.rowTop}>
              <View style={styles.rowText}>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {payment.place}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {formatDateTime(payment.createdAt)}
                </ThemedText>
              </View>
              <ThemedText type="smallBold">{formatPeso(payment.total)}</ThemedText>
            </View>

            {expanded && (
              <View style={styles.detail}>
                <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />
                <ThemedText type="small" themeColor="textSecondary">
                  Items bought
                </ThemedText>
                {items === undefined ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    Loading…
                  </ThemedText>
                ) : items.length === 0 ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    No items recorded.
                  </ThemedText>
                ) : (
                  items.map((it) => (
                    <View key={it.id} style={styles.itemRow}>
                      <ThemedText type="small" numberOfLines={1} style={styles.itemName}>
                        {it.quantity > 1 ? `${it.quantity}× ` : ''}
                        {it.name}
                      </ThemedText>
                      <ThemedText type="small">{formatPeso(it.price * it.quantity)}</ThemedText>
                    </View>
                  ))
                )}

                <View style={styles.itemRow}>
                  <ThemedText type="smallBold">Total cost</ThemedText>
                  <ThemedText type="smallBold">{formatPeso(payment.total)}</ThemedText>
                </View>

                {payment.paymentMethod && (
                  <View style={styles.itemRow}>
                    <ThemedText type="small" themeColor="textSecondary">
                      Paid with
                    </ThemedText>
                    <ThemedText type="small">{payment.paymentMethod}</ThemedText>
                  </View>
                )}

                {payment.receiptUri ? (
                  <Image
                    source={{ uri: payment.receiptUri }}
                    style={styles.receipt}
                    contentFit="cover"
                    accessibilityLabel={`Receipt from ${payment.place}`}
                  />
                ) : (
                  <ThemedText type="small" themeColor="textSecondary">
                    No receipt photo.
                  </ThemedText>
                )}

                {payment.latitude !== null && payment.longitude !== null && (
                  <Pressable onPress={() => openMap(payment)} hitSlop={8}>
                    <ThemedText type="linkPrimary">📍 View place on map</ThemedText>
                  </Pressable>
                )}
              </View>
            )}
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: Spacing.three,
    gap: Spacing.two,
    paddingBottom: Spacing.six,
  },
  card: {
    borderRadius: 12,
    padding: Spacing.three,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  rowText: {
    flex: 1,
    gap: Spacing.half,
  },
  detail: {
    marginTop: Spacing.three,
    gap: Spacing.two,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: Spacing.one,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  itemName: {
    flex: 1,
  },
  receipt: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 12,
    marginTop: Spacing.two,
  },
  empty: {
    paddingVertical: Spacing.six,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
});
