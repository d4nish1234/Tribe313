import { palette } from '../theme';

/** Benchmark colour tokens: the app's brand palette plus benchmark-only extras. */
export const B = {
  green: palette.primary,
  greenSoft: palette.primarySoft,
  greenText: '#FFFFFF',
  gold: palette.secondary,
  goldSoft: palette.secondarySoft,
  goldText: palette.goldText,
  text: palette.text,
  muted: palette.muted,
  border: palette.border,
  surface: palette.surface,
  background: palette.background,
  danger: palette.danger,
  barEmpty: '#D9DED9',
  backdrop: 'rgba(0,0,0,0.4)',
} as const;

/** Minimum tap target, per the spec. */
export const TAP = 44;
