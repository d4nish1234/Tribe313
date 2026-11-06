import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, SegmentedButtons, Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/contexts/AuthContext';
import { getVersion, latestVersion } from '@/src/benchmark/registry';
import { useBenchmarkSessions } from '@/src/benchmark/hooks';
import { knownSessions, weakestFirst } from '@/src/benchmark/engine/score';
import { buildWorkouts, planForLevel, workoutFor } from '@/src/benchmark/engine/workouts';
import { ExplainProvider, ExplainText, InfoLink, useExplain } from '@/src/benchmark/components/Explain';
import { LevelBars, testExplainContent } from '@/src/benchmark/components/Bits';
import { displayResult } from '@/src/benchmark/components/display';
import { ProgressTable } from '@/src/benchmark/components/ProgressTable';
import { B, TAP } from '@/src/benchmark/theme';
import { PLAN_KEYS, PLAN_LABELS, type BenchmarkVersion, type PlanKey, type Session } from '@/src/benchmark/types';

export default function PlanScreen() {
  return (
    <ExplainProvider>
      <Plan />
    </ExplainProvider>
  );
}

function Plan() {
  const { firebaseUser } = useAuth();
  const { loading, sessions } = useBenchmarkSessions(firebaseUser?.uid);
  const explain = useExplain();
  const known = useMemo(() => knownSessions(sessions), [sessions]);
  const latest = known[0] ?? null;
  const first = known.length > 1 ? known[known.length - 1] : null;
  const v = latest ? getVersion(latest.version)! : latestVersion();
  const workouts = useMemo(() => buildWorkouts(v, latest), [v, latest]);
  const [openWorkout, setOpenWorkout] = useState<string | null>(null);
  const [openTest, setOpenTest] = useState<string | null>(null);
  const [progressOpen, setProgressOpen] = useState(false);

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
            Do your first benchmark to get a plan built for you. Until then, every test shows the “Reach L1” plan.
          </Text>
        </View>
      ) : null}

      {/* Workouts */}
      <View style={styles.rowBetween}>
        <Text style={styles.group}>Your 3 workouts this week</Text>
        <InfoLink label="How?" onPress={() => explain(v.explainer('week'))} />
      </View>
      {workouts.map((w) => {
        const open = openWorkout === w.name;
        return (
          <View key={w.name} style={styles.card}>
            <Pressable
              style={styles.cardHeader}
              onPress={() => setOpenWorkout(open ? null : w.name)}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{w.name}</Text>
                <Text style={styles.muted}>About 50–60 min</Text>
              </View>
              <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={B.muted} />
            </Pressable>
            {open ? (
              <View style={styles.cardBody}>
                <Text style={styles.exercise}>
                  1.{' '}
                  <Text style={styles.link} onPress={() => explain(v.explainer('warmup'))}>
                    10 min warm-up
                  </Text>
                </Text>
                {(() => {
                  let n = 1;
                  return w.blocks.map((b) => (
                    <View key={b.testKey} style={{ marginTop: 10 }}>
                      <View style={styles.blockHeader}>
                        <Text style={styles.blockTitle}>For {b.testName.toLowerCase()}</Text>
                        <Text style={styles.muted}>{PLAN_LABELS[b.plan]}</Text>
                      </View>
                      {b.exercises.map((ex) => {
                        n += 1;
                        return (
                          <View key={ex} style={styles.exerciseRow}>
                            <Text style={styles.exerciseNum}>{n}.</Text>
                            <ExplainText text={ex} glossary={v.glossary} style={{ flex: 1 }} />
                          </View>
                        );
                      })}
                    </View>
                  ));
                })()}
              </View>
            ) : null}
          </View>
        );
      })}

      {/* Progress */}
      {latest ? (
        <View style={styles.card}>
          <Pressable
            style={styles.cardHeader}
            onPress={() => setProgressOpen((o) => !o)}
            accessibilityRole="button"
            accessibilityState={{ expanded: progressOpen }}
          >
            <Text style={[styles.cardTitle, { flex: 1 }]}>Your progress</Text>
            <Ionicons name={progressOpen ? 'chevron-up' : 'chevron-down'} size={20} color={B.muted} />
          </Pressable>
          {progressOpen ? <View style={styles.cardBody}><ProgressTable v={v} latest={latest} first={first} /></View> : null}
        </View>
      ) : null}

      {/* Tests */}
      <View style={[styles.rowBetween, { marginTop: 4 }]}>
        <Text style={styles.group}>Your tests, weakest first</Text>
        <InfoLink label="Levels?" onPress={() => explain(v.explainer('levels'))} />
      </View>
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
  const faults = testKey === 'splat' && latest ? latest.wallSquatFaults ?? [] : [];
  const planIdx = PLAN_KEYS.indexOf(plan);
  const target = t.standards ? (planIdx === 3 ? t.standards[2] : t.standards[planIdx]) : null;
  const workout = workoutFor(v, testKey);

  return (
    <View style={styles.card}>
      <Pressable
        style={styles.cardHeader}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{t.name}</Text>
          <Text style={styles.muted}>{result ?? 'Not tested yet'}</Text>
        </View>
        <LevelBars level={level} />
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={B.muted} />
      </Pressable>
      {open ? (
        <View style={[styles.cardBody, { gap: 12 }]}>
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
            <SegmentedButtons
              value={plan}
              onValueChange={(val) => setPlan(val as PlanKey)}
              density="small"
              buttons={PLAN_KEYS.map((k) => ({
                value: k,
                label: PLAN_LABELS[k],
                labelStyle: { fontSize: 12 },
                style: { minHeight: TAP },
                checkedColor: k === 'Hold Level 3' ? B.gold : B.green,
              }))}
              style={{ marginTop: 6 }}
            />
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
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 10, width: '100%', maxWidth: 560, alignSelf: 'center', paddingBottom: 40 },
  notice: { backgroundColor: B.goldSoft, borderRadius: 12, padding: 12 },
  group: { fontSize: 13, fontWeight: '700', color: B.muted, textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  card: { backgroundColor: B.surface, borderRadius: 12, paddingHorizontal: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 60, paddingVertical: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: B.text },
  cardBody: { paddingBottom: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: B.border, paddingTop: 10 },
  body: { fontSize: 16, color: B.text, lineHeight: 22 },
  muted: { color: B.muted, fontSize: 13 },
  link: { color: B.green, textDecorationLine: 'underline' },
  exercise: { fontSize: 16, color: B.text, lineHeight: 23 },
  exerciseRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  exerciseNum: { width: 22, color: B.muted, fontSize: 16, lineHeight: 23 },
  blockHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  blockTitle: { fontSize: 13, fontWeight: '700', color: B.green, textTransform: 'uppercase', letterSpacing: 0.3 },
  goal: { backgroundColor: B.greenSoft, borderRadius: 10, padding: 10, gap: 2 },
  goalLabel: { fontWeight: '700', color: B.green, fontSize: 14 },
  fix: { backgroundColor: B.goldSoft, borderRadius: 10, padding: 10, gap: 2 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: B.border, paddingTop: 8 },
  tableRow: { flexDirection: 'row', alignItems: 'center', minHeight: 36, gap: 6 },
  tableHead: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: B.border },
  th: { fontSize: 12, fontWeight: '700', color: B.muted, textTransform: 'uppercase' },
  td: { fontSize: 14, color: B.text },
  num: { flex: 1.2, textAlign: 'right', fontVariant: ['tabular-nums'] },
});
