import {
  DrawerContentScrollView,
  DrawerItemList,
  type DrawerContentComponentProps,
} from '@react-navigation/drawer';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemePreference, type ThemePreference } from '@/lib/theme-context';

const USER_NAME = 'Enrie John Edem';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

export function AppDrawerContent(props: DrawerContentComponentProps) {
  const theme = useTheme();
  const { preference, setPreference } = useThemePreference();

  return (
    <DrawerContentScrollView {...props}>
      <View style={[styles.profile, { borderBottomColor: theme.backgroundSelected }]}>
        <View style={[styles.avatar, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="smallBold">{USER_NAME.charAt(0)}</ThemedText>
        </View>
        <ThemedText type="default" style={styles.userName}>
          {USER_NAME}
        </ThemedText>
      </View>
      <DrawerItemList {...props} />
      <View style={[styles.themeSection, { borderTopColor: theme.backgroundSelected }]}>
        <ThemedText type="small" themeColor="textSecondary">
          Appearance
        </ThemedText>
        <View style={[styles.themeRow, { backgroundColor: theme.backgroundElement }]}>
          {THEME_OPTIONS.map(({ value, label }) => {
            const selected = preference === value;
            return (
              <Pressable
                key={value}
                onPress={() => setPreference(value)}
                style={[styles.themeOption, selected && { backgroundColor: theme.backgroundSelected }]}>
                <ThemedText
                  type={selected ? 'smallBold' : 'small'}
                  themeColor={selected ? 'text' : 'textSecondary'}>
                  {label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.four,
    marginBottom: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
  },
  themeSection: {
    marginTop: Spacing.four,
    paddingTop: Spacing.three,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  themeRow: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: Spacing.one,
    gap: Spacing.one,
  },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: 8,
  },
});
