import { Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { palette } from '../theme';

const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

/**
 * 313 TRIBE wordmark on a forest-green band.
 * Drawn with text until a transparent logo file is added to assets.
 * `large` is for the sign-in screens; the default fits the Home header.
 */
export function BrandLogo({ size = 'regular', style }: { size?: 'regular' | 'large'; style?: StyleProp<ViewStyle> }) {
  const k = size === 'large' ? 1.3 : 1;
  return (
    <View style={[styles.band, style]} accessible accessibilityRole="header" accessibilityLabel="313 Tribe">
      <Text style={[styles.number, { fontSize: 56 * k, lineHeight: 62 * k }]}>313</Text>
      <View style={[styles.rule, { width: 132 * k }]} />
      <View style={styles.tribeRow}>
        <View style={[styles.dash, { width: 22 * k }]} />
        <Text style={[styles.tribe, { fontSize: 16 * k }]}>TRIBE</Text>
        <View style={[styles.dash, { width: 22 * k }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  band: { backgroundColor: palette.primary, alignItems: 'center', paddingVertical: 20 },
  number: { fontFamily: SERIF, color: palette.gold, letterSpacing: 2 },
  rule: { height: 3, backgroundColor: palette.gold, marginTop: 6, marginBottom: 10 },
  tribeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dash: { height: 2, backgroundColor: palette.gold },
  tribe: { fontFamily: SERIF, color: palette.gold, letterSpacing: 8, marginRight: -8 },
});
