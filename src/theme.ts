import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

const brand = {
  primary: '#2E5BFF',
  secondary: '#F2A900',
  danger: '#D7263D',
  warn: '#F59E0B',
};

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: brand.primary,
    secondary: brand.secondary,
    error: brand.danger,
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: brand.primary,
    secondary: brand.secondary,
    error: brand.danger,
  },
};

export const palette = brand;
