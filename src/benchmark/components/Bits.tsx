import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { Image } from 'expo-image';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LEVEL_SHORT } from '../engine/format';
import { photoSource } from '../photos';
import { B } from '../theme';
import type { BenchmarkVersion, Level } from '../types';
import type { ExplainContent } from './Explain';
import { WallSitFigure } from './WallSitFigure';

/** How-to-test pop-up content for a logged or scored test. */
export function testExplainContent(v: BenchmarkVersion, key: string): ExplainContent {
  const t = v.tests[key];
  // ws1/ws2 have no standards of their own; show the combined wall sit standards.
  const standards = t.standards ?? (key === 'ws1' || key === 'ws2' ? v.tests.ws?.standards : null);
  return {
    title: t.name,
    steps: key === 'ws' ? [...(v.tests.ws2?.howToTest ?? []), ...(v.tests.ws1?.howToTest ?? [])] : t.howToTest,
    standards,
    photos: t.photos,
    figure: t.photos ? undefined : key === 'ws1' ? 'wallsit1' : 'wallsit',
  };
}

const THUMB = 56;

/** Looping start → finish crossfade (≈2.4s). Paused when Reduce Motion is on. */
export function CrossfadeThumb({
  photos,
  figure,
  onPress,
  label,
}: {
  photos: string[] | null;
  figure?: 'wallsit' | 'wallsit1';
  onPress: () => void;
  label: string;
}) {
  const reduce = useReducedMotion();
  const fade = useSharedValue(0);
  const a = photoSource(photos?.[0]);
  const b = photoSource(photos?.[1]);

  useEffect(() => {
    if (reduce || !a || !b) {
      fade.value = 0;
      return;
    }
    fade.value = withRepeat(
      withSequence(withDelay(800, withTiming(1, { duration: 400 })), withDelay(800, withTiming(0, { duration: 400 }))),
      -1,
    );
    return () => cancelAnimation(fade);
  }, [reduce, a, b, fade]);

  const topStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`How to do ${label}`}
      hitSlop={6}
      style={styles.thumb}
    >
      {a ? (
        <>
          <Image source={a} style={StyleSheet.absoluteFill} contentFit="cover" />
          {b ? (
            <Animated.View style={[StyleSheet.absoluteFill, topStyle]}>
              <Image source={b} style={StyleSheet.absoluteFill} contentFit="cover" />
            </Animated.View>
          ) : null}
        </>
      ) : (
        <WallSitFigure size={THUMB} oneLeg={figure === 'wallsit1'} />
      )}
      <View style={styles.badge}>
        <Text style={styles.badgeText}>i</Text>
      </View>
    </Pressable>
  );
}

/** Three small bars; gold at Level 3. */
export function LevelBars({ level }: { level: Level | null }) {
  const n = level ?? 0;
  return (
    <View
      style={styles.bars}
      accessible
      accessibilityLabel={level === null ? 'Not tested' : level === 0 ? 'Foundation' : `Level ${level}`}
    >
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          style={[
            styles.bar,
            { height: 6 + i * 4 },
            i <= n && { backgroundColor: n === 3 ? B.gold : B.green },
          ]}
        />
      ))}
    </View>
  );
}

/** F / L1 / L2 / L3 chip. */
export function LevelBadge({ level }: { level: Level | null }) {
  if (level === null) return <Text style={styles.dash}>—</Text>;
  const gold = level === 3;
  return (
    <View style={[styles.lvl, gold && { backgroundColor: B.gold }]}>
      <Text style={[styles.lvlText, gold && { color: '#fff' }]}>{LEVEL_SHORT[level]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: B.greenSoft,
  },
  badge: {
    position: 'absolute',
    right: 3,
    bottom: 3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: B.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700', fontStyle: 'italic', lineHeight: 14 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  bar: { width: 6, borderRadius: 2, backgroundColor: B.barEmpty },
  lvl: {
    minWidth: 28,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: B.greenSoft,
    alignItems: 'center',
  },
  lvlText: { color: B.green, fontWeight: '700', fontSize: 12 },
  dash: { color: B.muted, textAlign: 'center', minWidth: 28 },
});
