import { useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { layoutPoints, type Point, type ScorePoint } from '../engine/progress';
import { B } from '../theme';

/**
 * Small charts for the Progress screen, in the brand green on white: a 2px
 * line, a faint area wash, dots ringed in the card colour. One series each,
 * so the heading names it and there's no legend. The numbers are always in
 * the text beside or below, so nothing is shown by the chart alone.
 */

const GRID = '#E6E6E3';

function linePath(pts: { x: number; y: number }[]) {
  return pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}

function useWidth(): [number, (e: LayoutChangeEvent) => void] {
  const [width, setWidth] = useState(0);
  return [width, (e) => setWidth(Math.round(e.nativeEvent.layout.width))];
}

/** "Nov 9" or "Nov 9, 2025" when the series spans years. */
export function shortDate(iso: string, withYear = false): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(withYear ? { year: 'numeric' } : {}),
  });
}

/**
 * Overall score over time, on a fixed 0–max axis so a small change looks
 * small. Tap a dot (or near it) to read that benchmark's date and score.
 * A benchmark with tests missing is a hollow dot: its score is low partly
 * because those tests count as nothing.
 */
export function ScoreChart({
  points,
  max,
  accessibilityLabel,
}: {
  points: ScorePoint[];
  max: number;
  accessibilityLabel: string;
}) {
  const [width, onLayout] = useWidth();
  const [picked, setPicked] = useState<number | null>(null);
  const height = 160;
  const box = { width, height, padX: 14, padY: 12 };
  const pts = width ? layoutPoints(points, box, [0, max]) : [];
  const ticks = [0, Math.round(max / 3), Math.round((2 * max) / 3), max];
  const tickY = (v: number) => box.padY + (height - box.padY * 2) * (1 - v / max);
  // The tapped benchmark, or the latest (also after the list changes under it).
  const sel = picked !== null && picked < points.length ? picked : points.length - 1;
  const spansYears = points.length > 1 && points[0].date.slice(0, 4) !== points[points.length - 1].date.slice(0, 4);

  const onPress = (x: number) => {
    if (!pts.length) return;
    let best = 0;
    pts.forEach((p, i) => {
      if (Math.abs(p.x - x) < Math.abs(pts[best].x - x)) best = i;
    });
    setPicked(best);
  };

  return (
    <View accessible accessibilityLabel={accessibilityLabel}>
      <Text style={styles.readout}>
        {points.length ? (
          <>
            <Text style={styles.readoutValue}>{points[sel].value}</Text>
            <Text style={styles.muted}>
              /{max} on {shortDate(points[sel].date, true)}
              {points[sel].tested < points[sel].total
                ? ` · ${points[sel].tested} of ${points[sel].total} tests`
                : ''}
            </Text>
          </>
        ) : null}
      </Text>
      <View style={styles.plotRow}>
        <Pressable
          style={{ flex: 1, height }}
          onLayout={onLayout}
          onPress={(e) => onPress(e.nativeEvent.locationX)}
          importantForAccessibility="no-hide-descendants"
        >
          {width ? (
            <Svg width={width} height={height}>
              {ticks.map((t) => (
                <Line key={t} x1={0} x2={width} y1={tickY(t)} y2={tickY(t)} stroke={GRID} strokeWidth={1} />
              ))}
              {pts.length > 1 ? (
                <>
                  <Path
                    d={`${linePath(pts)} L${pts[pts.length - 1].x},${tickY(0)} L${pts[0].x},${tickY(0)} Z`}
                    fill={B.green}
                    opacity={0.1}
                  />
                  <Path d={linePath(pts)} stroke={B.green} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
                </>
              ) : null}
              {pts.map((p, i) => {
                const color = i === sel ? B.gold : B.green;
                const partial = points[i].tested < points[i].total;
                return (
                  <Circle
                    key={points[i].date}
                    cx={p.x}
                    cy={p.y}
                    r={i === sel ? 6 : 4.5}
                    fill={partial ? B.surface : color}
                    stroke={partial ? color : B.surface}
                    strokeWidth={2}
                  />
                );
              })}
            </Svg>
          ) : null}
        </Pressable>
        <View style={[styles.axis, { height }]} importantForAccessibility="no-hide-descendants">
          {[...ticks].reverse().map((t) => (
            <Text key={t} style={[styles.tick, { top: tickY(t) - 8 }]}>
              {t}
            </Text>
          ))}
        </View>
      </View>
      {points.length > 1 ? (
        <View style={styles.dates} importantForAccessibility="no-hide-descendants">
          <Text style={styles.muted}>{shortDate(points[0].date, spansYears)}</Text>
          <Text style={styles.muted}>{shortDate(points[points.length - 1].date, spansYears)}</Text>
        </View>
      ) : null}
      {points.some((p) => p.tested < p.total) ? (
        <Text style={[styles.muted, { marginTop: 6 }]}>Hollow dots: not every test was done that day.</Text>
      ) : null}
    </View>
  );
}

/** A tiny trend line for one test: grey line, the latest result as a green dot. */
export function Sparkline({ points, width = 84, height = 32 }: { points: Point[]; width?: number; height?: number }) {
  // One result is the latest, so it sits at the right end like every other row's last dot.
  const pts = layoutPoints(points, { width, height, padX: 5, padY: 5 }).map((p) =>
    points.length === 1 ? { ...p, x: width - 5 } : p,
  );
  if (!pts.length) return <View style={{ width, height }} />;
  const last = pts[pts.length - 1];
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={height}>
        {pts.length > 1 ? (
          <Path
            d={linePath(pts)}
            stroke={B.muted}
            strokeWidth={2}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}
        <Circle cx={last.x} cy={last.y} r={4} fill={B.green} stroke={B.surface} strokeWidth={2} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  readout: { marginBottom: 6 },
  readoutValue: { fontSize: 22, fontWeight: '700', color: B.text },
  muted: { color: B.muted, fontSize: 13 },
  plotRow: { flexDirection: 'row', gap: 6 },
  axis: { width: 22 },
  tick: { position: 'absolute', right: 0, fontSize: 11, color: B.muted, fontVariant: ['tabular-nums'] },
  dates: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, marginRight: 28 },
});
