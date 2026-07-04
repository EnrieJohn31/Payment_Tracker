import { StyleSheet, View } from 'react-native';

import { PaymentList } from '@/components/payment-list';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { usePayments } from '@/lib/payments-context';

export default function ReceiptsAndPaymentsScreen() {
  const { payments } = usePayments();

  return (
    <ThemedView style={styles.container}>
      <PaymentList
        payments={payments}
        emptyMessage="No receipts yet. Add a purchase to see it here."
        ListHeaderComponent={
          <View style={styles.header}>
            <ThemedText type="small" themeColor="textSecondary">
              Tap a row to see the total cost, the items bought, and the receipt photo.
            </ThemedText>
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
    marginBottom: Spacing.two,
  },
});
