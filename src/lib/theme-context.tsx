import { useSQLiteContext } from 'expo-sqlite';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { Appearance } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { getSetting, setSetting } from '@/lib/db';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ThemeScheme = 'light' | 'dark';

const THEME_PREFERENCE_KEY = 'theme_preference';

type ThemeContextValue = {
  /** What the user picked: light, dark, or follow the system. */
  preference: ThemePreference;
  /** The scheme actually in effect after resolving 'system'. */
  scheme: ThemeScheme;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isPreference(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

/** Keeps plain react-native useColorScheme() callers in sync with the override. */
function applyToAppearance(preference: ThemePreference) {
  Appearance.setColorScheme?.(preference === 'system' ? null : preference);
}

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    let cancelled = false;
    getSetting(db, THEME_PREFERENCE_KEY).then((value) => {
      if (!cancelled && isPreference(value)) {
        setPreferenceState(value);
        applyToAppearance(value);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [db]);

  const setPreference = useCallback(
    (next: ThemePreference) => {
      setPreferenceState(next);
      applyToAppearance(next);
      setSetting(db, THEME_PREFERENCE_KEY, next);
    },
    [db],
  );

  const scheme: ThemeScheme =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  return (
    <ThemeContext.Provider value={{ preference, scheme, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemePreference(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemePreference must be used inside ThemePreferenceProvider');
  }
  return context;
}

/**
 * Resolved scheme for styling. Falls back to the system scheme for components
 * rendered outside ThemePreferenceProvider (e.g. the splash overlay).
 */
export function useResolvedScheme(): ThemeScheme {
  const context = useContext(ThemeContext);
  const systemScheme = useColorScheme();
  return context?.scheme ?? (systemScheme === 'dark' ? 'dark' : 'light');
}
