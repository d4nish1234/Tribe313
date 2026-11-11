import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import { DefaultTheme as NavDefaultTheme, type Theme as NavTheme } from '@react-navigation/native';

/**
 * 313 Tribe brand: forest green + gold, taken from the logo.
 * Every screen (Paper components, navigation headers/tabs, benchmark) reads
 * from here so the app stays one colour scheme.
 */
const brand = {
  primary: '#1F3D2B', // forest green
  primarySoft: '#E6EEE9',
  secondary: '#C9A961', // gold
  secondarySoft: '#F6EFDD',
  gold: '#D8C38A', // wordmark gold on green
  goldText: '#8A6F2E', // gold for text and links on light backgrounds (readable on white)
  background: '#F6F6F4',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  muted: '#6B6B6B',
  border: '#D9D9D9',
  divider: '#B9BEB6', // between list rows (people, locations); darker than `border` so rows read apart
  danger: '#D7263D',
  warn: '#F59E0B',
};

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: brand.primary,
    onPrimary: '#FFFFFF',
    primaryContainer: brand.primarySoft,
    onPrimaryContainer: brand.primary,
    secondary: brand.goldText, // darker gold so text/icons on white stay readable
    onSecondary: '#FFFFFF',
    secondaryContainer: '#E6CF8F', // chips + tonal buttons: a gold that stands out on white cards
    onSecondaryContainer: '#2E2408',
    tertiary: '#4E6B58',
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#D8E6DC',
    onTertiaryContainer: '#14281C',
    background: brand.background,
    onBackground: brand.text,
    surface: brand.surface,
    onSurface: brand.text,
    surfaceVariant: '#E4E8E3',
    onSurfaceVariant: '#44483F',
    outline: '#74796F',
    outlineVariant: '#C4C8BF',
    inversePrimary: '#A6CFB3',
    error: brand.danger,
    elevation: {
      level0: 'transparent',
      level1: '#F4F6F2',
      level2: '#EEF2EE',
      level3: '#E9EEE9',
      level4: '#E7EDE7',
      level5: '#E3EAE4',
    },
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#A6CFB3',
    secondary: brand.secondary,
    error: brand.danger,
  },
};

/** React Navigation theme: headers, back arrows, tab bar tint. */
export const navTheme: NavTheme = {
  ...NavDefaultTheme,
  colors: {
    ...NavDefaultTheme.colors,
    primary: brand.primary,
    background: brand.background,
    card: brand.surface,
    text: brand.text,
    border: brand.border,
    notification: brand.danger,
  },
};

export const palette = brand;
