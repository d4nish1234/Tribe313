import { useState } from 'react';
import { StyleSheet, Text as RNText, View } from 'react-native';
import { Text } from 'react-native-paper';
import { ExpandableCard } from '@/src/components/Cards';
import type { Workout } from '../engine/workouts';
import { PLAN_LABELS, type BenchmarkVersion } from '../types';
import { B } from '../theme';
import { ExplainText, useExplain } from './Explain';

/**
 * The member's three workouts for the week, each a card that opens to its
 * exercises. Shown on Home and on the Training tab. `bodyweight` fills in the
 * pounds for "% of bodyweight". Needs an ExplainProvider above it.
 */
export function WeekWorkouts({
  v,
  workouts,
  bodyweight,
}: {
  v: BenchmarkVersion;
  workouts: Workout[];
  bodyweight: number | null;
}) {
  const [openName, setOpenName] = useState<string | null>(null);

  return (
    <>
      {workouts.map((w) => {
        const open = openName === w.name;
        return (
          <ExpandableCard
            key={w.name}
            title={w.name}
            subtitle="About 50–60 min"
            open={open}
            onToggle={() => setOpenName(open ? null : w.name)}
          >
            <WorkoutExercises v={v} workout={w} bodyweight={bodyweight} />
          </ExpandableCard>
        );
      })}
    </>
  );
}

/**
 * One workout's exercises: the warm-up, then a block per test. Used inside the
 * workout cards and, already open, on the Calendar. Needs an ExplainProvider above it.
 */
export function WorkoutExercises({
  v,
  workout,
  bodyweight,
}: {
  v: BenchmarkVersion;
  workout: Workout;
  bodyweight: number | null;
}) {
  const explain = useExplain();
  // Exercise numbers carry on across blocks; 1 is the warm-up.
  const starts = workout.blocks.map(
    (_, i) => 2 + workout.blocks.slice(0, i).reduce((t, b) => t + b.exercises.length, 0),
  );
  return (
    <>
      <Text style={styles.exercise}>
        1.{' '}
        <RNText style={styles.link} onPress={() => explain(v.explainer('warmup'))}>
          10 min warm-up
        </RNText>
      </Text>
      {workout.blocks.map((b, bi) => (
        <View key={b.testKey} style={{ marginTop: 10 }}>
          <View style={styles.blockHeader}>
            <Text style={styles.blockTitle}>For {b.testName.toLowerCase()}</Text>
            <Text style={styles.muted}>{PLAN_LABELS[b.plan]}</Text>
          </View>
          {b.exercises.map((ex, ei) => (
            <View key={ex} style={styles.exerciseRow}>
              <Text style={styles.exerciseNum}>{starts[bi] + ei}.</Text>
              <ExplainText text={ex} glossary={v.glossary} bodyweight={bodyweight} style={{ flex: 1 }} />
            </View>
          ))}
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  muted: { color: B.muted, fontSize: 13 },
  link: { color: B.green, textDecorationLine: 'underline' },
  exercise: { fontSize: 16, color: B.text, lineHeight: 23 },
  exerciseRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  exerciseNum: { width: 22, color: B.muted, fontSize: 16, lineHeight: 23 },
  blockHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  blockTitle: { fontSize: 13, fontWeight: '700', color: B.green, textTransform: 'uppercase', letterSpacing: 0.3 },
});
