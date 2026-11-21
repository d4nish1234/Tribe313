import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { planForLevel, workoutFor } from '../engine/workouts';
import { shortDate } from './Charts';
import { B, TAP } from '../theme';
import { PLAN_KEYS, type BenchmarkVersion, type PlanKey, type Session } from '../types';
import { testExplainContent } from './Bits';
import { ExplainText, InfoLink, useExplain } from './Explain';

/**
 * What a test shows on the Training tab, opened: the next goal, any wall
 * squat fixes, the plan picker with its target and exercises, and the test
 * rules. Shared by the Training tab's test cards and the Progress sheet so the
 * two can't drift apart. `latest` is the member's latest benchmark.
 * Needs an ExplainProvider above it.
 */
export function TestPlanBody({
  v,
  testKey,
  latest,
}: {
  v: BenchmarkVersion;
  testKey: string;
  latest: Session | null;
}) {
  const explain = useExplain();
  const t = v.tests[testKey];
  const level = latest ? v.levelFor(testKey, latest) : null;
  const [plan, setPlan] = useState<PlanKey>(planForLevel(level));
  const bodyweight = latest?.bodyweight ?? null;
  const goal = latest ? v.goal(testKey, latest) : 'Do this test to see your goal.';
  const faults = testKey === 'splat' && latest ? (latest.wallSquatFaults ?? []) : [];
  const planIdx = PLAN_KEYS.indexOf(plan);
  const standards = v.standardsFor(testKey, { bodyweight, heightIn: latest?.heightIn });
  const target = standards ? (planIdx === 3 ? standards[2] : standards[planIdx]) : null;
  const workout = workoutFor(v, testKey);

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.goal}>
        <Text style={styles.goalLabel}>Your next goal</Text>
        <Text style={styles.body}>{goal}</Text>
      </View>

      {faults.map((fk) => {
        const f = v.faults[fk];
        if (!f) return null;
        return (
          <View key={fk} style={styles.fix}>
            <Text style={styles.goalLabel}>Fix first: {f.area}</Text>
            <Text style={styles.muted}>{f.explanation}</Text>
            {f.drills.map((d) => (
              <View key={d} style={styles.exerciseRow}>
                <Text style={styles.exerciseNum}>•</Text>
                <ExplainText text={d} glossary={v.glossary} bodyweight={bodyweight} style={{ flex: 1 }} />
              </View>
            ))}
          </View>
        );
      })}

      <View>
        <View style={styles.rowBetween}>
          <Text style={styles.goalLabel}>Plan</Text>
          <InfoLink label="Which one?" onPress={() => explain(v.explainer('plans'))} />
        </View>
        <PlanPicker value={plan} onChange={setPlan} />
        {target ? <Text style={[styles.muted, { marginTop: 8 }]}>Target: {target}</Text> : null}
        {t.plans?.[plan].map((ex, i) => (
          <View key={ex} style={styles.exerciseRow}>
            <Text style={styles.exerciseNum}>{i + 1}.</Text>
            <ExplainText text={ex} glossary={v.glossary} bodyweight={bodyweight} style={{ flex: 1 }} />
          </View>
        ))}
      </View>

      <View style={[styles.rowBetween, styles.footer]}>
        <Text style={styles.muted}>{workout ? `Part of your ${workout} workout` : ''}</Text>
        <InfoLink
          label="Test rules"
          onPress={() => explain(testExplainContent(v, testKey, { bodyweight, heightIn: latest?.heightIn }))}
        />
      </View>
    </View>
  );
}

/**
 * "Weights use your 185 lb from Oct 2." Shown once under a list of plans so
 * members know where the pounds next to "% of bodyweight" come from. Renders
 * nothing without a bodyweight.
 */
export function WeightNote({ latest }: { latest: Session | null }) {
  if (!latest || typeof latest.bodyweight !== 'number') return null;
  return (
    <Text style={styles.weightNote}>
      Weights use your {latest.bodyweight} lb from {shortDate(latest.date)}.
    </Text>
  );
}

// Two short lines per option ("Reach" over "Level 1") instead of one
// abbreviated line: four options don't fit one line each on a phone, and
// Paper's SegmentedButtons truncates its labels to "Reach…".
const PLAN_PARTS: Record<PlanKey, [string, string]> = {
  'Foundation -> Level 1': ['Reach', 'Level 1'],
  'Level 1 -> Level 2': ['Reach', 'Level 2'],
  'Level 2 -> Level 3': ['Reach', 'Level 3'],
  'Hold Level 3': ['Keep', 'Level 3'],
};

function PlanPicker({ value, onChange }: { value: PlanKey; onChange: (k: PlanKey) => void }) {
  return (
    <View style={styles.planRow} accessibilityRole="radiogroup">
      {PLAN_KEYS.map((k, i) => {
        const on = k === value;
        const [verb, level] = PLAN_PARTS[k];
        return (
          <Pressable
            key={k}
            onPress={() => onChange(k)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${verb} ${level}`}
            style={[styles.planOption, i > 0 && styles.planDivider, on && styles.planOn]}
          >
            <Text style={[styles.planVerb, on && styles.planTextOn]} maxFontSizeMultiplier={1.4}>
              {verb}
            </Text>
            <Text style={[styles.planLevel, on && styles.planTextOn]} maxFontSizeMultiplier={1.4}>
              {level}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  planRow: {
    flexDirection: 'row',
    marginTop: 6,
    borderWidth: 1,
    borderColor: B.border,
    borderRadius: 10,
    overflow: 'hidden',
  },
  planOption: { flex: 1, minHeight: TAP, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
  planDivider: { borderLeftWidth: 1, borderLeftColor: B.border },
  planOn: { backgroundColor: B.green },
  planVerb: { fontSize: 12, color: B.muted, textAlign: 'center' },
  planLevel: { fontSize: 14, fontWeight: '700', color: B.text, textAlign: 'center' },
  planTextOn: { color: '#FFFFFF' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  body: { fontSize: 16, color: B.text, lineHeight: 22 },
  muted: { color: B.muted, fontSize: 13 },
  weightNote: { color: B.muted, fontSize: 13, marginTop: -4, marginHorizontal: 4 },
  exerciseRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  exerciseNum: { width: 22, color: B.muted, fontSize: 16, lineHeight: 23 },
  goal: { backgroundColor: B.greenSoft, borderRadius: 10, padding: 10, gap: 2 },
  goalLabel: { fontWeight: '700', color: B.green, fontSize: 14 },
  fix: { backgroundColor: B.goldSoft, borderRadius: 10, padding: 10, gap: 2 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: B.border, paddingTop: 8 },
});
