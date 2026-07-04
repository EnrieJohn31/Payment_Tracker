import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { LimitBanner } from '@/components/limit-banner';
import { PaymentList } from '@/components/payment-list';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatPeso } from '@/lib/currency';
import { periodLabel, periodRange, shiftPeriod, type PeriodKind } from '@/lib/dates';
import { usePayments } from '@/lib/payments-context';

export default function PaymentsScreen() {
  const theme = useTheme();
  const { payments } = usePayments();
  const [kind, setKind] = useState<PeriodKind>('month');
  const [anchor, setAnchor] = useState(() => new Date());

  const range = useMemo(() => periodRange(kind, anchor), [kind, anchor]);

  const filtered = useMemo(
    () => payments.filter((p) => p.createdAt >= range.start && p.createdAt < range.end),
    [payments, range],
  );

  const periodTotal = useMemo(() => filtered.reduce((sum, p) => sum + p.total, 0), [filtered]);

  const isCurrentPeriod = useMemo(() => {
    const now = Date.now();
    return now >= range.start && now < range.end;
  }, [range]);

  const switchKind = (next: PeriodKind) => {
    setKind(next);
    setAnchor(new Date());
  };

  return (
    <ThemedView style={styles.container}>
      <PaymentList
        payments={filtered}
        emptyMessage={`No payments in this ${kind === 'week' ? 'week' : 'month'}.`}
        ListHeaderComponent={
          <View style={styles.header}>
            <LimitBanner />

            {/* Weekly / Monthly filter */}
            <View style={[styles.segment, { backgroundColor: theme.backgroundElement }]}>
              {(['week', 'month'] as const).map((k) => (
                <Pressable
                  key={k}
                  onPress={() => switchKind(k)}
                  style={[
                    styles.segmentButton,
                    kind === k && { backgroundColor: theme.backgroundSelected },
                  ]}>
                  <ThemedText
                    type="smallBold"
                    themeColor={kind === k ? 'text' : 'textSecondary'}>
                    {k === 'week' ? 'Weekly' : 'Monthly'}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            {/* Period navigator */}
            <View style={styles.navigator}>
              <Pressable
                onPress={() => setAnchor((a) => shiftPeriod(kind, a, -1))}
                hitSlop={12}
                style={[styles.navButton, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="smallBold">‹</ThemedText>
              </Pressable>
              <ThemedText type="smallBold" style={styles.navLabel}>
                {periodLabel(kind, anchor)}
              </ThemedText>
              <Pressable
                onPress={() => setAnchor((a) => shiftPeriod(kind, a, 1))}
                disabled={isCurrentPeriod}
                hitSlop={12}
                style={[
                  styles.navButton,
                  { backgroundColor: theme.backgroundElement, opacity: isCurrentPeriod ? 0.4 : 1 },
                ]}>
                <ThemedText type="smallBold">›</ThemedText>
              </Pressable>
            </View>

            {/* Period total */}
            <View style={[styles.totalCard, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="small" themeColor="textSecondary">
                Total spent · {filtered.length} payment{filtered.length === 1 ? '' : 's'}
              </ThemedText>
              <ThemedText type="subtitle">{formatPeso(periodTotal)}</ThemedText>
            </View>
          </View>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    gap: Spacing.three,
    marginBottom: Spacing.three,
  },
  segment: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: Spacing.one,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 9,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  navigator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    flex: 1,
    textAlign: 'center',
  },
  totalCard: {
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.one,
  },
});
