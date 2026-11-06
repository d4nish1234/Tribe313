import { Platform, StyleSheet, Text, View } from 'react-native';

const GREEN = '#1F3D2B';
const GOLD = '#D8C38A';
const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

/**
 * 313 TRIBE wordmark on a forest-green band.
 * Drawn with text until a transparent logo file is added to assets.
 */
export function BrandLogo() {
  return (
    <View style={styles.band} accessible accessibilityRole="header" accessibilityLabel="313 Tribe">
      <Text style={styles.number}>313</Text>
      <View style={styles.rule} />
      <View style={styles.tribeRow}>
        <View style={styles.dash} />
        <Text style={styles.tribe}>TRIBE</Text>
        <View style={styles.dash} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  band: { backgroundColor: GREEN, alignItems: 'center', paddingVertical: 20 },
  number: { fontFamily: SERIF, color: GOLD, fontSize: 56, lineHeight: 62, letterSpacing: 2 },
  rule: { width: 132, height: 3, backgroundColor: GOLD, marginTop: 6, marginBottom: 10 },
  tribeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dash: { width: 22, height: 2, backgroundColor: GOLD },
  tribe: { fontFamily: SERIF, color: GOLD, fontSize: 16, letterSpacing: 8, marginRight: -8 },
});
