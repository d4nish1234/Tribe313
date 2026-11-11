import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useAuth } from '@/src/contexts/AuthContext';
import { getVersion, latestVersion } from '@/src/benchmark/registry';
import { useAssignments, useBenchmarkSessions } from '@/src/benchmark/hooks';
import { knownSessions, weakestFirst } from '@/src/benchmark/engine/score';
import { buildWorkouts, planForLevel, workoutFor } from '@/src/benchmark/engine/workouts';
import { ExplainProvider, ExplainText, InfoLink, useExplain } from '@/src/benchmark/components/Explain';
import { LevelBars, testExplainContent } from '@/src/benchmark/components/Bits';
import { displayResult } from '@/src/benchmark/components/display';
import { CoachExtras } from '@/src/benchmark/components/CoachExtras';
import { WeekWorkouts } from '@/src/benchmark/components/WeekWorkouts';
import { CardBox, CardRow, ExpandableCard, SectionHeader } from '@/src/components/Cards';
import { Ionicons } from '@expo/vector-icons';
import { B, TAP } from '@/src/benchmark/theme';
import {
  PLAN_KEYS,
  type BenchmarkVersion,
  type PlanKey,
  type Session,
} from '@/src/benchmark/types';

/**
 * Training tab: what to do between benchmarks. This week's workouts, extra
 * exercises from a coach, every test's plan (weakest first) and general tips.
 * Built from the latest benchmark; logging one is on the Benchmark tab.
 */
export default function TrainingTab() {
  return (
    <ExplainProvider>
      <Training />
    </ExplainProvider>
  );
}

function Training() {
  const { firebaseUser } = useAuth();
  const { loading, sessions } = useBenchmarkSessions(firebaseUser?.uid);
  const { assignments } = useAssignments(firebaseUser?.uid);
  const explain = useExplain();
  const known = useMemo(() => knownSessions(sessions), [sessions]);
  const latest = known[0] ?? null;
  const v = latest ? getVersion(latest.version)! : latestVersion();
  const workouts = useMemo(() => buildWorkouts(v, latest), [v, latest]);
  const [openTest, setOpenTest] = useState<string | null>(null);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const tested = latest ? weakestFirst(latest).filter((k) => v.levelFor(k, latest) !== null) : [];
  const untested = v.scoredKeys.filter((k) => !tested.includes(k));
  const testOrder = [...tested, ...untested];

  return (
    <ScrollView style={{ backgroundColor: B.background }} contentContainerStyle={styles.content}>
      {!latest ? (
        <View style={styles.notice}>
          <Text style={styles.body}>
            Do your first benchmark on the Benchmark tab to get a plan built for you. Until then, every test
            shows the “Reach L1” plan.
          </Text>
        </View>
      ) : null}

      {/* Workouts */}
      <SectionHeader
        title="Your 3 workouts this week"
        right={<InfoLink label="How?" onPress={() => explain(v.explainer('week'))} />}
      />
      <WeekWorkouts v={v} workouts={workouts} />

      <CoachExtras v={v} assignments={assignments} />

      {/* Tests */}
      <SectionHeader
        title="Your tests, weakest first"
        right={<InfoLink label="Levels?" onPress={() => explain(v.explainer('levels'))} />}
      />
      {testOrder.map((key) => (
        <TestCard
          key={`${key}:${latest?.date ?? 'none'}`}
          v={v}
          testKey={key}
          latest={latest}
          open={openTest === key}
          onToggle={() => setOpenTest(openTest === key ? null : key)}
        />
      ))}

      {/* Good to know */}
      <SectionHeader title="Good to know" />
      <CardBox>
        {v.goodToKnow.map((g, i) => (
          <CardRow
            key={g.explainer}
            first={i === 0}
            left={<Ionicons name="information-circle-outline" size={20} color={B.green} />}
            title={g.label}
            onPress={() => explain(v.explainer(g.explainer))}
          />
        ))}
      </CardBox>
    </ScrollView>
  );
}

function TestCard({
  v,
  testKey,
  latest,
  open,
  onToggle,
}: {
  v: BenchmarkVersion;
  testKey: string;
  latest: Session | null;
  open: boolean;
  onToggle: () => void;
}) {
  const explain = useExplain();
  const t = v.tests[testKey];
  const level = latest ? v.levelFor(testKey, latest) : null;
  const [plan, setPlan] = useState<PlanKey>(planForLevel(level));
  const result = latest ? displayResult(v, testKey, latest) : null;
  const goal = latest ? v.goal(testKey, latest) : 'Do this test to see your goal.';
  const faults = testKey === 'splat' && latest ? (latest.wallSquatFaults ?? []) : [];
  const planIdx = PLAN_KEYS.indexOf(plan);
  const target = t.standards ? (planIdx === 3 ? t.standards[2] : t.standards[planIdx]) : null;
  const workout = workoutFor(v, testKey);

  return (
    <ExpandableCard
      title={t.name}
      subtitle={result ?? 'Not tested yet'}
      right={<LevelBars level={level} />}
      open={open}
      onToggle={onToggle}
    >
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
                  <ExplainText text={d} glossary={v.glossary} style={{ flex: 1 }} />
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
              <ExplainText text={ex} glossary={v.glossary} style={{ flex: 1 }} />
            </View>
          ))}
        </View>

        <View style={[styles.rowBetween, styles.footer]}>
          <Text style={styles.muted}>{workout ? `Part of your ${workout} workout` : ''}</Text>
          <InfoLink label="Test rules" onPress={() => explain(testExplainContent(v, testKey))} />
        </View>
      </View>
    </ExpandableCard>
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

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 10, width: '100%', maxWidth: 560, alignSelf: 'center', paddingBottom: 40 },
  notice: { backgroundColor: B.goldSoft, borderRadius: 12, padding: 12 },
  group: {
    fontSize: 13,
    fontWeight: '700',
    color: B.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardBody: {
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: B.border,
    paddingTop: 10,
  },
  body: { fontSize: 16, color: B.text, lineHeight: 22 },
  muted: { color: B.muted, fontSize: 13 },
  exerciseRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  exerciseNum: { width: 22, color: B.muted, fontSize: 16, lineHeight: 23 },
  blockTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: B.green,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  goal: { backgroundColor: B.greenSoft, borderRadius: 10, padding: 10, gap: 2 },
  goalLabel: { fontWeight: '700', color: B.green, fontSize: 14 },
  fix: { backgroundColor: B.goldSoft, borderRadius: 10, padding: 10, gap: 2 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: B.border, paddingTop: 8 },
});
