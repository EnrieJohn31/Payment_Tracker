import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type Props = {
  /** 0..1 */
  value: number;
  color?: string;
};

export function ProgressBar({ value, color }: Props) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, value));

  return (
    <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
      <View
        style={[
          styles.fill,
          { width: `${clamped * 100}%`, backgroundColor: color ?? theme.tint },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});
