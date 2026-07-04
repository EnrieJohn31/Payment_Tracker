import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Drawer } from 'expo-router/drawer';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AppDrawerContent } from '@/components/drawer-content';
import { Colors } from '@/constants/theme';
import { migrateDb } from '@/lib/db';
import { PaymentsProvider } from '@/lib/payments-context';
import { ThemePreferenceProvider, useThemePreference } from '@/lib/theme-context';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { scheme } = useThemePreference();
  const colors = Colors[scheme];

  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Drawer
        initialRouteName="index"
        drawerContent={(props) => <AppDrawerContent {...props} />}
        screenOptions={{
          drawerPosition: 'left',
          drawerStyle: {
            backgroundColor: colors.background,
          },
          drawerActiveBackgroundColor: colors.backgroundElement,
          drawerActiveTintColor: colors.text,
          drawerInactiveTintColor: colors.textSecondary,
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          sceneStyle: {
            backgroundColor: colors.background,
          },
        }}>
        <Drawer.Screen
          name="index"
          options={{
            drawerLabel: 'Home',
            title: 'Payment Tracker',
          }}
        />
        <Drawer.Screen
          name="payments"
          options={{
            drawerLabel: 'Payments',
            title: 'Payments',
          }}
        />
        <Drawer.Screen
          name="receipts-and-payments"
          options={{
            drawerLabel: 'Receipts and Payments',
            title: 'Receipts and Payments',
          }}
        />
        <Drawer.Screen
          name="balance-limit-setting"
          options={{
            drawerLabel: 'Balance Limit Setting',
            title: 'Balance Limit Setting',
          }}
        />
        <Drawer.Screen
          name="add-purchase"
          options={{
            title: 'Add Purchase',
            drawerItemStyle: { display: 'none' },
          }}
        />
      </Drawer>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <>
      <AnimatedSplashOverlay />
      <SQLiteProvider databaseName="payment-tracker.db" onInit={migrateDb}>
        <PaymentsProvider>
          <ThemePreferenceProvider>
            <RootNavigator />
          </ThemePreferenceProvider>
        </PaymentsProvider>
      </SQLiteProvider>
    </>
  );
}
