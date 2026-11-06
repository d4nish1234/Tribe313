import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import { B } from '../theme';

export const ROW = 44;
const VISIBLE = 5;
const PAD = ROW * Math.floor(VISIBLE / 2);

/**
 * One snapping wheel, like the iPhone timer. Works with VoiceOver/TalkBack
 * as an "adjustable" control (swipe up/down to change).
 */
export function WheelColumn({
  values,
  value,
  label,
  onChange,
}: {
  values: number[];
  value: number;
  label: string;
  onChange: (v: number) => void;
}) {
  const ref = useRef<ScrollView>(null);
  const idx = Math.max(0, values.indexOf(value));
  const lastTick = useRef(idx);

  useEffect(() => {
    ref.current?.scrollTo({ y: idx * ROW, animated: false });
    // Only on mount / when the value list changes; scrolling drives updates after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values]);

  const indexFromEvent = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    Math.min(values.length - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.y / ROW)));

  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = indexFromEvent(e);
    if (values[i] !== value) onChange(values[i]);
  };

  const step = (delta: number) => {
    const i = Math.min(values.length - 1, Math.max(0, idx + delta));
    ref.current?.scrollTo({ y: i * ROW, animated: true });
    onChange(values[i]);
  };

  return (
    <View
      style={styles.column}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: `${value} ${label}` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
    >
      <ScrollView
        ref={ref}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        snapToInterval={ROW}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: PAD }}
        contentOffset={{ x: 0, y: idx * ROW }}
        scrollEventThrottle={16}
        onScroll={(e) => {
          const i = indexFromEvent(e);
          if (i !== lastTick.current) {
            lastTick.current = i;
            Haptics.selectionAsync().catch(() => {});
          }
        }}
        onMomentumScrollEnd={settle}
        onScrollEndDrag={(e) => {
          // If the finger lifts with no momentum, onMomentumScrollEnd never fires.
          if (Math.abs(e.nativeEvent.velocity?.y ?? 0) < 0.05) settle(e);
        }}
      >
        {values.map((v) => (
          <View key={v} style={styles.row}>
            <Text style={[styles.value, v === value && styles.valueSelected]}>{v}</Text>
          </View>
        ))}
      </ScrollView>
      <Text style={styles.unit} pointerEvents="none">
        {label}
      </Text>
    </View>
  );
}

export function WheelBand() {
  return <View pointerEvents="none" style={styles.band} />;
}

export const WHEEL_HEIGHT = ROW * VISIBLE;

const styles = StyleSheet.create({
  column: { flex: 1, height: WHEEL_HEIGHT, flexDirection: 'row', alignItems: 'center' },
  row: { height: ROW, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 8 },
  value: { fontSize: 22, color: B.muted, fontVariant: ['tabular-nums'] },
  valueSelected: { color: B.text, fontWeight: '600' },
  unit: { width: 44, fontSize: 16, color: B.text, fontWeight: '500' },
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: PAD,
    height: ROW,
    borderRadius: 10,
    backgroundColor: B.greenSoft,
  },
});
