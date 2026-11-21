import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useAuth } from '@/src/contexts/AuthContext';
import { getVersion, latestVersion } from '@/src/benchmark/registry';
import { useAssignments, useBenchmarkSessions } from '@/src/benchmark/hooks';
import { knownSessions, weakestFirst } from '@/src/benchmark/engine/score';
import { buildWorkouts } from '@/src/benchmark/engine/workouts';
import { ExplainProvider, InfoLink, useExplain } from '@/src/benchmark/components/Explain';
import { LevelBars } from '@/src/benchmark/components/Bits';
import { displayResult } from '@/src/benchmark/components/display';
import { CoachExtras } from '@/src/benchmark/components/CoachExtras';
import { TestPlanBody, WeightNote } from '@/src/benchmark/components/TestPlan';
import { WeekWorkouts } from '@/src/benchmark/components/WeekWorkouts';
import { CardBox, CardRow, ExpandableCard, SectionHeader } from '@/src/components/Cards';
import { Ionicons } from '@expo/vector-icons';
import { B } from '@/src/benchmark/theme';
import type { BenchmarkVersion, Session } from '@/src/benchmark/types';

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
      <WeightNote latest={latest} />
      <WeekWorkouts v={v} workouts={workouts} bodyweight={latest?.bodyweight ?? null} />

      <CoachExtras v={v} assignments={assignments} bodyweight={latest?.bodyweight ?? null} />

      {/* Tests */}
      <SectionHeader
        title="Your tests, weakest first"
        right={<InfoLink label="Levels?" onPress={() => explain(v.explainer('levels'))} />}
      />
      <WeightNote latest={latest} />
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
  const t = v.tests[testKey];
  const level = latest ? v.levelFor(testKey, latest) : null;
  const result = latest ? displayResult(v, testKey, latest) : null;
  return (
    <ExpandableCard
      title={t.name}
      subtitle={result ?? 'Not tested yet'}
      right={<LevelBars level={level} />}
      open={open}
      onToggle={onToggle}
    >
      <TestPlanBody v={v} testKey={testKey} latest={latest} />
    </ExpandableCard>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 10, width: '100%', maxWidth: 560, alignSelf: 'center', paddingBottom: 40 },
  notice: { backgroundColor: B.goldSoft, borderRadius: 12, padding: 12 },
  body: { fontSize: 16, color: B.text, lineHeight: 22 },
});
