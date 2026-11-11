import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { router } from 'expo-router';
import { AppButton } from '@/src/components/AppButton';
import { useAuth } from '@/src/contexts/AuthContext';
import { latestVersion, getVersion } from '@/src/benchmark/registry';
import { useBenchmarkSessions } from '@/src/benchmark/hooks';
import { knownSessions, scoreSession } from '@/src/benchmark/engine/score';
import { LEVEL_LONG, formatDate, toIsoDate } from '@/src/benchmark/engine/format';
import { ExplainProvider, InfoLink, useExplain } from '@/src/benchmark/components/Explain';
import { B } from '@/src/benchmark/theme';

/**
 * Benchmark tab: the logging screen, kept to three things so logging is quick.
 * Where you stand, New benchmark, and Progress (charts, past benchmarks, PDF).
 * The training plan is on the Training tab.
 */
export default function BenchmarkTab() {
  return (
    <ExplainProvider>
      <BenchmarkHome />
    </ExplainProvider>
  );
}

function BenchmarkHome() {
  const { firebaseUser } = useAuth();
  const explain = useExplain();
  const { loading, sessions } = useBenchmarkSessions(firebaseUser?.uid);

  const latest = useMemo(() => knownSessions(sessions)[0] ?? null, [sessions]);
  const latestScore = latest ? scoreSession(latest) : null;
  const v = latest ? getVersion(latest.version)! : latestVersion();
  // "New benchmark" opens today's if there is one, so name it that way.
  const today = toIsoDate(new Date());
  const hasToday = sessions.some((s) => s.date === today);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: B.background }} contentContainerStyle={styles.content}>
      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryLabel}>Overall</Text>
            <Text style={styles.summaryValue}>
              {latestScore?.overall != null ? LEVEL_LONG[latestScore.overall] : latest ? 'In progress' : '—'}
            </Text>
            <InfoLink light label="What does this mean?" onPress={() => explain(v.explainer('overall'))} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryLabel}>Score</Text>
            <Text style={styles.summaryValue}>
              {latestScore ? `${latestScore.score}/${latestScore.maxScore}` : `0/${v.maxScore}`}
            </Text>
            <InfoLink light label="What does this mean?" onPress={() => explain(v.explainer('score'))} />
          </View>
        </View>
        <Text style={styles.summaryNote}>
          {latest
            ? `Last benchmark ${formatDate(latest.date)}${
                latestScore && latestScore.overall === null
                  ? ` · ${latestScore.tested} of ${latestScore.total} tests done`
                  : ''
              }`
            : 'No benchmarks yet.'}
        </Text>
      </View>

      <AppButton
        icon="plus"
        onPress={() => router.push({ pathname: '/benchmark/entry/[date]', params: { date: 'new' } })}
      >
        {hasToday ? 'Continue today’s benchmark' : 'New benchmark'}
      </AppButton>
      <AppButton variant="secondary" icon="chart-line" onPress={() => router.push('/benchmark/progress')}>
        Progress
      </AppButton>
      {latest && !hasToday ? (
        <Text style={styles.hint}>A new benchmark starts with your last results. Change the ones that moved.</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 12, width: '100%', maxWidth: 560, alignSelf: 'center' },
  summary: { backgroundColor: B.green, borderRadius: 16, padding: 16, gap: 10 },
  summaryRow: { flexDirection: 'row', gap: 12 },
  summaryLabel: { color: B.goldSoft, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { color: '#fff', fontSize: 26, fontWeight: '700', marginTop: 2 },
  summaryNote: { color: B.goldSoft },
  hint: { color: B.muted, fontSize: 13, textAlign: 'center' },
});
