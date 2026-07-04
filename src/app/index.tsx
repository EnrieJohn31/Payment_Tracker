import { Link, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { LimitBanner } from '@/components/limit-banner';
import { ProgressBar } from '@/components/progress-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatPeso } from '@/lib/currency';
import { formatDayShort } from '@/lib/dates';
import { usePayments } from '@/lib/payments-context';

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { payments, balanceLimit, spentThisMonth, remaining, limitStatus } = usePayments();

  const recent = payments.slice(0, 3);
  const barColor =
    limitStatus === 'maxed'
      ? theme.danger
      : limitStatus === 'near'
        ? theme.warning
        : theme.success;

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <LimitBanner />

        {/* Month summary */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="small" themeColor="textSecondary">
            Spent this month
          </ThemedText>
          <ThemedText type="subtitle">{formatPeso(spentThisMonth)}</ThemedText>
          {balanceLimit !== null ? (
            <>
              <ProgressBar value={spentThisMonth / balanceLimit} color={barColor} />
              <ThemedText type="small" themeColor="textSecondary">
                {limitStatus === 'maxed'
                  ? `Limit of ${formatPeso(balanceLimit)} reached`
                  : `${formatPeso(remaining ?? 0)} left of ${formatPeso(balanceLimit)} limit`}
              </ThemedText>
            </>
          ) : (
            <Link href="/balance-limit-setting">
              <ThemedText type="linkPrimary">Set a balance limit →</ThemedText>
            </Link>
          )}
        </View>

        {/* Add purchase */}
        <Pressable
          onPress={() => router.push('/add-purchase')}
          style={[styles.addButton, { backgroundColor: theme.tint }]}>
          <ThemedText type="smallBold" style={styles.addLabel}>
            📷 Add purchase
          </ThemedText>
          <ThemedText type="small" style={styles.addHint}>
            Snap the receipt, list what you bought, mark the place
          </ThemedText>
        </Pressable>

        {/* Recent payments */}
        <View style={styles.recentHeader}>
          <ThemedText type="smallBold">Recent payments</ThemedText>
          <Link href="/receipts-and-payments">
            <ThemedText type="linkPrimary">See all</ThemedText>
          </Link>
        </View>
        {recent.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            Nothing here yet — your purchases will show up in this list.
          </ThemedText>
        ) : (
          recent.map((p) => (
            <View key={p.id} style={[styles.recentRow, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.recentText}>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {p.place}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {formatDayShort(p.createdAt)}
                </ThemedText>
              </View>
              <ThemedText type="smallBold">{formatPeso(p.total)}</ThemedText>
            </View>
          ))
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  card: {
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  addButton: {
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  addLabel: {
    color: '#ffffff',
    fontSize: 16,
  },
  addHint: {
    color: '#ffffffcc',
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: 12,
    padding: Spacing.three,
  },
  recentText: {
    flex: 1,
    gap: Spacing.half,
  },
});
