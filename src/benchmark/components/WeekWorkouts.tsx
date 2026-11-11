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
 * exercises. Shown on Home and on Your plan. Needs an ExplainProvider above it.
 */
export function WeekWorkouts({ v, workouts }: { v: BenchmarkVersion; workouts: Workout[] }) {
  const explain = useExplain();
  const [openName, setOpenName] = useState<string | null>(null);

  return (
    <>
      {workouts.map((w) => {
        const open = openName === w.name;
        // Exercise numbers carry on across blocks; 1 is the warm-up.
        const starts = w.blocks.map((_, i) => 2 + w.blocks.slice(0, i).reduce((t, b) => t + b.exercises.length, 0));
        return (
          <ExpandableCard
            key={w.name}
            title={w.name}
            subtitle="About 50–60 min"
            open={open}
            onToggle={() => setOpenName(open ? null : w.name)}
          >
            <Text style={styles.exercise}>
              1.{' '}
              <RNText style={styles.link} onPress={() => explain(v.explainer('warmup'))}>
                10 min warm-up
              </RNText>
            </Text>
            {w.blocks.map((b, bi) => (
              <View key={b.testKey} style={{ marginTop: 10 }}>
                <View style={styles.blockHeader}>
                  <Text style={styles.blockTitle}>For {b.testName.toLowerCase()}</Text>
                  <Text style={styles.muted}>{PLAN_LABELS[b.plan]}</Text>
                </View>
                {b.exercises.map((ex, ei) => {
                  return (
                    <View key={ex} style={styles.exerciseRow}>
                      <Text style={styles.exerciseNum}>{starts[bi] + ei}.</Text>
                      <ExplainText text={ex} glossary={v.glossary} style={{ flex: 1 }} />
                    </View>
                  );
                })}
              </View>
            ))}
          </ExpandableCard>
        );
      })}
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
