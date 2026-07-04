import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { formatPeso } from '@/lib/currency';
import { usePayments } from '@/lib/payments-context';
import { useTheme } from '@/hooks/use-theme';

/**
 * Warning banner shown when this month's spending is near (>= 80%)
 * or at/over the balance limit. Renders nothing otherwise.
 */
export function LimitBanner() {
  const theme = useTheme();
  const { limitStatus, balanceLimit, spentThisMonth, remaining } = usePayments();

  if (limitStatus !== 'near' && limitStatus !== 'maxed') return null;

  const maxed = limitStatus === 'maxed';
  const color = maxed ? theme.danger : theme.warning;
  const title = maxed ? 'Balance limit reached' : 'Balance is near the limit';
  const detail = maxed
    ? `You have spent ${formatPeso(spentThisMonth)} of your ${formatPeso(balanceLimit ?? 0)} limit this month.`
    : `Only ${formatPeso(remaining ?? 0)} left of your ${formatPeso(balanceLimit ?? 0)} monthly limit.`;

  return (
    <View style={[styles.banner, { borderColor: color, backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="smallBold" style={{ color }}>
        {maxed ? '⛔ ' : '⚠️ '}
        {title}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {detail}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.one,
  },
});
