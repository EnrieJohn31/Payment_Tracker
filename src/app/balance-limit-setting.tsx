import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ProgressBar } from '@/components/progress-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatPeso, parseAmount } from '@/lib/currency';
import { NEAR_LIMIT_RATIO, usePayments } from '@/lib/payments-context';

export default function BalanceLimitSettingScreen() {
  const theme = useTheme();
  const { balanceLimit, setBalanceLimit, spentThisMonth, remaining, limitStatus } = usePayments();
  const [draft, setDraft] = useState('');

  useEffect(() => {
    setDraft(balanceLimit === null ? '' : String(balanceLimit));
  }, [balanceLimit]);

  const save = async () => {
    const value = parseAmount(draft);
    if (value === null || value <= 0) {
      Alert.alert('Invalid amount', 'Enter a limit greater than zero, e.g. 5000.');
      return;
    }
    await setBalanceLimit(value);
    Alert.alert('Limit saved', `Monthly balance limit set to ${formatPeso(value)}.`);
  };

  const clear = () => {
    Alert.alert('Remove limit?', 'You will no longer get near-limit warnings.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          setBalanceLimit(null);
          setDraft('');
        },
      },
    ]);
  };

  const progress = balanceLimit ? spentThisMonth / balanceLimit : 0;
  const barColor =
    limitStatus === 'maxed'
      ? theme.danger
      : limitStatus === 'near'
        ? theme.warning
        : theme.success;

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ThemedText type="small" themeColor="textSecondary">
          Set a monthly spending limit. You will be warned when your balance is near the limit
          (at {Math.round(NEAR_LIMIT_RATIO * 100)}%) and when it is maximized.
        </ThemedText>

        <View style={styles.inputRow}>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: theme.backgroundElement, color: theme.text },
            ]}
            placeholder="₱ Monthly limit, e.g. 5000"
            placeholderTextColor={theme.textSecondary}
            keyboardType="decimal-pad"
            value={draft}
            onChangeText={setDraft}
          />
          <Pressable onPress={save} style={[styles.saveButton, { backgroundColor: theme.tint }]}>
            <ThemedText type="smallBold" style={styles.saveLabel}>
              Save
            </ThemedText>
          </Pressable>
        </View>

        {balanceLimit !== null && (
          <View style={[styles.statusCard, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.statusRow}>
              <ThemedText type="small" themeColor="textSecondary">
                Spent this month
              </ThemedText>
              <ThemedText type="smallBold">{formatPeso(spentThisMonth)}</ThemedText>
            </View>
            <ProgressBar value={progress} color={barColor} />
            <View style={styles.statusRow}>
              <ThemedText type="small" themeColor="textSecondary">
                Limit: {formatPeso(balanceLimit)}
              </ThemedText>
              <ThemedText type="smallBold" style={{ color: barColor }}>
                {limitStatus === 'maxed'
                  ? 'Limit reached'
                  : `${formatPeso(remaining ?? 0)} remaining`}
              </ThemedText>
            </View>

            <Pressable onPress={clear} hitSlop={8} style={styles.clearButton}>
              <ThemedText type="small" style={{ color: theme.danger }}>
                Remove limit
              </ThemedText>
            </Pressable>
          </View>
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
  inputRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    borderRadius: 10,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  saveButton: {
    borderRadius: 10,
    paddingHorizontal: Spacing.four,
    justifyContent: 'center',
  },
  saveLabel: {
    color: '#ffffff',
  },
  statusCard: {
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearButton: {
    marginTop: Spacing.two,
    alignSelf: 'center',
  },
});
